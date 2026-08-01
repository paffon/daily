/** The only module in `src/` that touches persistence. Everything else logs
 *  through `putEntry` and reads config and libraries through `readJson`. */

import type { Entry, Module } from './entry'
import { entryPath } from './entry'
import { driveAdapter } from './sync'
import appSeed from '../seed/app.json'

/** Three methods, and P3 supplies a Drive-backed second implementation. */
export type Adapter = {
  get(path: string): string | null
  set(path: string, text: string): void
  list(prefix: string): string[]
}

const KEY = 'daily:'

export const localAdapter: Adapter = {
  get: (path) => localStorage.getItem(KEY + path),
  set: (path, text) => localStorage.setItem(KEY + path, text),
  list: (prefix) => {
    const paths: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(KEY + prefix)) paths.push(key.slice(KEY.length))
    }
    return paths.sort()
  },
}

/** P3 swaps this line for the Drive-backed adapter. Nothing above it moves. */
const adapter: Adapter = driveAdapter(localAdapter)

export function readText(path: string): string | null {
  return adapter.get(path)
}

export function writeText(path: string, text: string): void {
  adapter.set(path, text)
}

export function readJson<T>(path: string, fallback: T): T {
  const text = readText(path)
  if (text === null) return fallback
  try {
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

export function writeJson(path: string, value: unknown): void {
  writeText(path, JSON.stringify(value, null, 2))
}

/** JSONL: one object per line. Never parse the file as a whole. */
function readLines(path: string): Entry[] {
  const text = readText(path)
  if (text === null) return []
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as Entry)
}

/** Compared as instants, not as text — the offset in a timestamp shifts with
 *  daylight saving, so the strings do not sort in the order the clocks ran. */
const byNewest = (a: Entry, b: Entry) => Date.parse(b.ts) - Date.parse(a.ts)

/** Newest first, tombstones dropped. `months` narrows to specific month keys;
 *  without it every month file the module has is read. */
export function readEntries(module: Module, months?: string[]): Entry[] {
  const paths =
    months === undefined
      ? adapter.list(`entries/${module}-`)
      : months.map((month) => `entries/${module}-${month}.jsonl`)
  return paths
    .flatMap(readLines)
    .filter((entry) => !entry.deleted)
    .sort(byNewest)
}

/** Read-modify-write of the whole month file — one user, tiny files, and no
 *  append API to reach for. */
export function putEntry(entry: Entry): void {
  const path = entryPath(entry.module, entry.ts)
  const lines = readLines(path)
  const at = lines.findIndex((line) => line.id === entry.id)
  if (at === -1) lines.push(entry)
  else lines[at] = entry
  writeText(path, lines.map((line) => JSON.stringify(line)).join('\n') + '\n')
}

/** The newest `n` entries across every module. */
export function recentEntries(n: number): Entry[] {
  return adapter
    .list('entries/')
    .flatMap(readLines)
    .filter((entry) => !entry.deleted)
    .sort(byNewest)
    .slice(0, n)
}

/** The newest entry's `ts` for a module, or `null` if it has never been used. */
export function lastTouched(module: Module): string | null {
  return readEntries(module)[0]?.ts ?? null
}

/** Seeds are defaults, not truth: written once if absent, never over an
 *  edited copy. P3–P8 add rows here and change nothing else in this file. */
const SEEDS: [string, unknown][] = [['config/app.json', appSeed]]

export function ensureSeeded(): void {
  for (const [path, value] of SEEDS) {
    if (readText(path) === null) writeJson(path, value)
  }
}

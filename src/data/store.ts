/** The only module in `src/` that touches persistence. Everything else logs
 *  through `putEntry` and reads config and libraries through `readJson`. */

import type { Entry, Module } from './entry'
import { entryPath, revise } from './entry'
import { scope } from './profile'
import { driveAdapter } from './sync'
import appSeed from '../seed/app.json'
import exercisesSeed from '../seed/exercises.json'
import foodsSeed from '../seed/foods.json'
import levelsSeed from '../seed/levels.json'
import profilesSeed from '../seed/profiles.json'
import segmentsSeed from '../seed/segments.json'

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

function writeText(path: string, text: string): void {
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

function writeLines(path: string, lines: Entry[]): void {
  writeText(path, lines.map((line) => JSON.stringify(line)).join('\n') + '\n')
}

/** The active profile's copy of an entries path — `entries/<id>~…` for a
 *  created profile, the bare legacy name for the original one. Entries are the
 *  per-profile half of the data; the catalog paths pass through untouched. */
const own = (path: string): string => `entries/${scope()}${path.slice('entries/'.length)}`

/** The original profile's scope is the empty string, so its listings see every
 *  profile's files — the `~` in a created profile's names is what it skips. */
const mine = (path: string): boolean => scope() !== '' || !path.includes('~')

/** Every line the active profile holds, tombstones included. */
const allLines = (): Entry[] => adapter.list(`entries/${scope()}`).filter(mine).flatMap(readLines)

/** Compared as instants, not as text — the offset in a timestamp shifts with
 *  daylight saving, so the strings do not sort in the order the clocks ran. */
const byNewest = (a: Entry, b: Entry) => Date.parse(b.ts) - Date.parse(a.ts)

/** Newest first, tombstones dropped. */
export function readEntries(module: Module): Entry[] {
  return adapter
    .list(`entries/${scope()}${module}-`)
    .flatMap(readLines)
    .filter((entry) => !entry.deleted)
    .sort(byNewest)
}

/** Read-modify-write of the whole month file — one user, tiny files, and no
 *  append API to reach for. */
export function putEntry(entry: Entry): void {
  const path = own(entryPath(entry.module, entry.ts))
  const lines = readLines(path)
  const at = lines.findIndex((line) => line.id === entry.id)
  if (at === -1) lines.push(entry)
  else lines[at] = entry
  writeLines(path, lines)
}

/** Any entry by id, across every module's month files and including the
 *  tombstoned — the edit screen is reachable by id alone. */
export function getEntry(id: string): Entry | null {
  return allLines().find((entry) => entry.id === id) ?? null
}

/** A revision of an entry already stored. An edited `ts` can name a different
 *  month than the one holding the line, and then the entry has to move. The
 *  destination is written first: locally both writes land together, and if the
 *  process dies between them a duplicate is recoverable where a vanished entry
 *  is not. Which of the two dirty paths reaches Drive first is the sync pass's
 *  business, not settled here. */
export function updateEntry(entry: Entry): void {
  const stored = getEntry(entry.id)
  const next = revise(entry)
  putEntry(next)

  if (stored === null) return
  const was = own(entryPath(stored.module, stored.ts))
  if (was === own(entryPath(next.module, next.ts))) return
  /* A tombstone is the one line that never leaves a file — taking it out would
     let a device still holding the live line resurrect the entry. It costs a
     second tombstone in the old month, which every read already drops. */
  if (stored.deleted) return
  writeLines(
    was,
    readLines(was).filter((line) => line.id !== next.id),
  )
}

/** A tombstone, never a removed line: a line taken out of a file looks exactly
 *  like a mirror that has not caught up, so the delete would not propagate. */
export function deleteEntry(id: string): void {
  const stored = getEntry(id)
  if (stored !== null) putEntry(revise(stored, { deleted: true }))
}

/** The newest `n` entries across every module. */
export function recentEntries(n: number): Entry[] {
  return allLines()
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
const SEEDS: [string, unknown][] = [
  ['config/app.json', appSeed],
  ['library/exercises.json', exercisesSeed],
  ['library/foods.json', foodsSeed],
  ['library/segments.json', segmentsSeed],
  ['config/levels.json', levelsSeed],
  /* The original profile, under the registry's own name for it. A created
     profile's files need no seeding — every read falls back in memory. */
  ['config/profiles.json', profilesSeed],
]

export function ensureSeeded(): void {
  for (const [path, value] of SEEDS) {
    if (readText(path) === null) writeJson(path, value)
  }
}

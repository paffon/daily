/** The one primitive the whole app is built on. Every module records the same
 *  shape; only `payload` differs, and each module narrows that itself. */

export const MODULES = ['workout', 'nutrition', 'movement', 'dance', 'body'] as const

export type Module = (typeof MODULES)[number]

export type Entry = {
  id: string
  module: Module
  /** ISO 8601 with offset. The entry's own editable timestamp — it decides
   *  which month file holds the entry. */
  ts: string
  /** Increments on every edit. Merges are last-write-wins on the higher rev. */
  rev: number
  /** ISO 8601 with offset. When the line was written, never edited. */
  recorded_at: string
  /** A tombstone, never a removed line, so a delete propagates. */
  deleted: boolean
  payload: Record<string, unknown>
}

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO 8601 carrying the local offset. `toISOString()` is UTC and would move
 *  a late-evening entry into the next day. */
export function toIso(at: Date): string {
  const offset = -at.getTimezoneOffset()
  const sign = offset < 0 ? '-' : '+'
  const abs = Math.abs(offset)
  const local = new Date(at.getTime() + offset * 60_000).toISOString().slice(0, 19)
  return `${local}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

export function newEntry(module: Module, payload: Record<string, unknown>, ts?: string): Entry {
  const now = toIso(new Date())
  return {
    id: crypto.randomUUID(),
    module,
    ts: ts ?? now,
    rev: 1,
    recorded_at: now,
    deleted: false,
    payload,
  }
}

/** Every edit is a new revision, tombstoning included — a merge is
 *  last-write-wins on the higher `rev`, so a change that leaves `rev` alone is
 *  a change the other device can quietly win. `recorded_at` never moves. */
export function revise(entry: Entry, changes: Partial<Entry> = {}): Entry {
  return { ...entry, ...changes, rev: entry.rev + 1 }
}

/** `2026-08`, read straight off the timestamp. `ts` carries its own offset, so
 *  its date part already is the local date — 23:30 on 31 August in Israel
 *  stays in August's file wherever the app is later opened from. */
export function monthKey(ts: string): string {
  return ts.slice(0, 7)
}

export function entryPath(module: Module, ts: string): string {
  return `entries/${module}-${monthKey(ts)}.jsonl`
}

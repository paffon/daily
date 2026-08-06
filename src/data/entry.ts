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

/** Sunday to Saturday. Local throughout — the week is the user's, so its edges
 *  are midnights on their clock rather than an offset from an instant, which is
 *  also what keeps it right across a DST change. */
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const midnight = (at: Date): number => new Date(at).setHours(0, 0, 0, 0)

/** `[start, end)` — `end` is the next week's first midnight, so a Saturday
 *  23:59 is inside and the Sunday 00:00 after it is not.
 *
 *  Lifted here out of `objectives.ts` when objectives were cut (ADR 0006):
 *  *the week runs Sunday morning to Saturday evening* is a hard rule that
 *  outlives the first thing to need it, and this is the module that owns a
 *  timestamp's arithmetic.
 *
 *  Which day it opens on is the caller's to read out of `config/app.json`.
 *  This file is the primitive `store.ts` is built on, so reading a config here
 *  would point the dependency back at itself — and handing the day in is also
 *  what lets the boundary be tested with no store at all. */
export function weekBounds(date: Date, starts: string): { start: Date; end: Date } {
  /* An unrecognised day name falls back to the boundary `RULES.md` states
     rather than to index -1, which would shift the week by a day in silence. */
  const first = Math.max(0, DAYS.indexOf(starts))

  const start = new Date(midnight(date))
  start.setDate(start.getDate() - ((start.getDay() - first + DAYS.length) % DAYS.length))
  const end = new Date(start)
  end.setDate(end.getDate() + DAYS.length)
  return { start, end }
}

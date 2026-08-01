import { entryPath, monthKey, newEntry, toIso } from './entry'
import type { Entry } from './entry'
import {
  ensureSeeded,
  lastTouched,
  putEntry,
  readEntries,
  readJson,
  recentEntries,
  writeJson,
} from './store'
import appSeed from '../seed/app.json'

const at = (ts: string, weight: number): Entry => ({
  ...newEntry('body', { weight }, ts),
})

beforeEach(() => localStorage.clear())

describe('the entry primitive', () => {
  it('keeps a late-evening Israeli entry in its own month', () => {
    expect(monthKey('2026-08-31T23:30:00+03:00')).toBe('2026-08')
    expect(monthKey('2026-09-01T00:30:00+03:00')).toBe('2026-09')
  })

  it('starts an entry at rev 1 with a parseable id and timestamps', () => {
    const entry = newEntry('body', { weight: 72.4 })
    expect(entry.rev).toBe(1)
    expect(entry.deleted).toBe(false)
    expect(entry.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(Number.isNaN(Date.parse(entry.ts))).toBe(false)
    expect(Number.isNaN(Date.parse(entry.recorded_at))).toBe(false)
    expect(entry.ts).toBe(entry.recorded_at)
  })

  it('takes a given ts over now, and leaves recorded_at alone', () => {
    const entry = newEntry('body', {}, '2026-07-12T07:40:00+03:00')
    expect(entry.ts).toBe('2026-07-12T07:40:00+03:00')
    expect(entry.recorded_at).not.toBe(entry.ts)
  })

  it('writes a timestamp with an offset rather than a Z', () => {
    expect(toIso(new Date())).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
  })

  it('composes the month file path', () => {
    expect(entryPath('body', '2026-08-31T23:30:00+03:00')).toBe('entries/body-2026-08.jsonl')
    expect(entryPath('workout', '2026-01-02T09:00:00+02:00')).toBe('entries/workout-2026-01.jsonl')
  })
})

describe('the store', () => {
  it('reads back entries written to different month files', () => {
    putEntry(at('2026-07-12T07:40:00+03:00', 73.1))
    putEntry(at('2026-08-01T07:35:00+03:00', 72.4))
    const entries = readEntries('body')
    expect(entries).toHaveLength(2)
    expect(entries.map((e) => e.payload['weight'])).toEqual([72.4, 73.1])
  })

  it('replaces the line with the same id rather than appending a second', () => {
    const first = at('2026-08-01T07:35:00+03:00', 72.4)
    putEntry(first)
    putEntry({ ...first, rev: 2, payload: { weight: 72.9 } })
    const entries = readEntries('body')
    expect(entries).toHaveLength(1)
    expect(entries[0]?.rev).toBe(2)
    expect(entries[0]?.payload['weight']).toBe(72.9)
  })

  it('stores a tombstone but never returns it', () => {
    const entry = at('2026-08-01T07:35:00+03:00', 72.4)
    putEntry(entry)
    putEntry({ ...entry, rev: 2, deleted: true })
    expect(readEntries('body')).toHaveLength(0)
    expect(recentEntries(6)).toHaveLength(0)
    expect(localStorage.getItem('daily:entries/body-2026-08.jsonl')).toContain('"deleted":true')
  })

  it('gives the newest entries across every module, newest first', () => {
    putEntry(at('2026-07-12T07:40:00+03:00', 73.1))
    putEntry(newEntry('workout', {}, '2026-08-01T19:40:00+03:00'))
    putEntry(at('2026-08-01T07:35:00+03:00', 72.4))
    expect(recentEntries(6).map((e) => e.module)).toEqual(['workout', 'body', 'body'])
    expect(recentEntries(2)).toHaveLength(2)
  })

  it('reports the last time a module was touched, and null before that', () => {
    expect(lastTouched('body')).toBeNull()
    putEntry(at('2026-07-12T07:40:00+03:00', 73.1))
    putEntry(at('2026-08-01T07:35:00+03:00', 72.4))
    expect(lastTouched('body')).toBe('2026-08-01T07:35:00+03:00')
    expect(lastTouched('dance')).toBeNull()
  })

  it('seeds config once and never over an edited copy', () => {
    ensureSeeded()
    expect(readJson('config/app.json', appSeed).body.weight_unit).toBe('kg')

    writeJson('config/app.json', { ...appSeed, body: { weight_unit: 'lb' } })
    ensureSeeded()
    expect(readJson('config/app.json', appSeed).body.weight_unit).toBe('lb')
  })
})

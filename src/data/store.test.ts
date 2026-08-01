import { entryPath, monthKey, newEntry, toIso } from './entry'

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

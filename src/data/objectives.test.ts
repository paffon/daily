/** Every fixture date is built with the local `Date` constructor rather than
 *  written as an ISO string with an offset. The week is the user's week, so
 *  its edges are midnights on their clock — a fixture carrying `+03:00` would
 *  land on a different weekday on a machine set to anything else. */

import { factFor, weekBounds } from './objectives'
import type { Target } from './objectives'
import type { Entry } from './entry'
import { toIso } from './entry'
import { ensureSeeded, writeJson } from '../data/store'
import appSeed from '../seed/app.json'

/* 1 August 2026 is a Saturday — frame 4f is dated from it. So the week around
   it opens on Sunday 2 August and 5 August is the Wednesday inside it. */
const SATURDAY_NIGHT = new Date(2026, 7, 1, 23, 0)
const SUNDAY_MORNING = new Date(2026, 7, 2, 0, 30)
const WEDNESDAY = new Date(2026, 7, 5, 9, 0)
const FRIDAY = new Date(2026, 7, 7, 18, 0)

const entryAt = (when: Date, module: Entry['module'], payload: Entry['payload'] = {}): Entry => ({
  id: String(when.getTime()) + module,
  module,
  ts: toIso(when),
  rev: 1,
  recorded_at: toIso(when),
  deleted: false,
  payload,
})

const workout = (when: Date, parts?: string[]) =>
  entryAt(when, 'workout', parts === undefined ? {} : { body_parts: parts })

const THREE_A_WEEK: Target = {
  kind: 'count',
  label: '3 workouts a week',
  module: 'workout',
  per: 'week',
  target: 3,
}

const FOR_THE_BACK: Target = { ...THREE_A_WEEK, label: 'something for the back weekly', target: 1, body_part: 'back' }

const PROTEIN_UP: Target = { kind: 'direction', label: 'protein up', direction: 'up' }

beforeEach(() => {
  localStorage.clear()
  ensureSeeded()
})

describe('weekBounds', () => {
  it('cuts the week between Saturday night and the Sunday morning after it', () => {
    expect(weekBounds(SATURDAY_NIGHT).start).not.toEqual(weekBounds(SUNDAY_MORNING).start)
    /* the same instant seen from both sides: one week's end is the next's start */
    expect(weekBounds(SATURDAY_NIGHT).end).toEqual(weekBounds(SUNDAY_MORNING).start)
  })

  it('holds Sunday morning and the Friday after it in one week', () => {
    expect(weekBounds(FRIDAY).start).toEqual(weekBounds(SUNDAY_MORNING).start)
    expect(weekBounds(FRIDAY).end).toEqual(weekBounds(SUNDAY_MORNING).end)
  })

  it('opens at midnight rather than at the moment it was asked about', () => {
    expect(weekBounds(WEDNESDAY).start).toEqual(new Date(2026, 7, 2))
    expect(weekBounds(WEDNESDAY).end).toEqual(new Date(2026, 7, 9))
  })

  it('takes the boundary from config rather than from source', () => {
    writeJson('config/app.json', { ...appSeed, week: { starts: 'wednesday' } })
    expect(weekBounds(FRIDAY).start).toEqual(new Date(2026, 7, 5))
  })

  it('falls back to the stated boundary when the config names no day it knows', () => {
    writeJson('config/app.json', { ...appSeed, week: { starts: 'caturday' } })
    expect(weekBounds(FRIDAY).start).toEqual(new Date(2026, 7, 2))
  })
})

describe('factFor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(WEDNESDAY)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts what has happened this week, not what is left of the target', () => {
    const fact = factFor(THREE_A_WEEK, [
      workout(new Date(2026, 7, 2, 7, 0)),
      workout(new Date(2026, 7, 4, 7, 0)),
    ])
    expect(fact).toBe('2 this week')
    expect(fact).not.toContain('/')
    expect(fact).not.toContain('%')
  })

  it('says how long it has been once nothing falls in this week', () => {
    /* 27 July is nine days before the Wednesday the clock is set to */
    expect(factFor(THREE_A_WEEK, [workout(new Date(2026, 6, 27, 7, 0))])).toBe('9 days')
    expect(factFor(THREE_A_WEEK, [workout(new Date(2026, 7, 1, 7, 0))])).toBe('4 days')
  })

  it('leaves last week’s entries out of this week’s count', () => {
    expect(factFor(THREE_A_WEEK, [workout(SATURDAY_NIGHT)])).toBe('4 days')
    expect(factFor(THREE_A_WEEK, [workout(SUNDAY_MORNING)])).toBe('1 this week')
  })

  it('says nothing yet rather than zero, where nothing has happened', () => {
    expect(factFor(THREE_A_WEEK, [])).toBe('nothing yet')
  })

  it('gives a direction target no number, because it has none', () => {
    expect(factFor(PROTEIN_UP, [workout(WEDNESDAY)])).toBe('direction')
  })

  it('counts only workouts carrying the body part it is scoped to', () => {
    const fact = factFor(FOR_THE_BACK, [
      workout(new Date(2026, 7, 3, 7, 0), ['chest', 'shoulders']),
      workout(new Date(2026, 7, 4, 7, 0), ['back', 'biceps']),
    ])
    expect(fact).toBe('1 this week')
  })

  it('counts only its own module, and never a deleted entry', () => {
    const gone = { ...workout(new Date(2026, 7, 4, 7, 0)), deleted: true }
    const fact = factFor(THREE_A_WEEK, [
      entryAt(new Date(2026, 7, 3, 7, 0), 'dance'),
      gone,
      workout(new Date(2026, 7, 4, 8, 0)),
    ])
    expect(fact).toBe('1 this week')
  })
})

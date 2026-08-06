/** Every fixture date is built with the local `Date` constructor rather than
 *  written as an ISO string with an offset. The week is the user's week, so
 *  its edges are midnights on their clock — a fixture carrying `+03:00` would
 *  land on a different weekday on a machine set to anything else. */

import { weekBounds } from './entry'
import appSeed from '../seed/app.json'

/* 1 August 2026 is a Saturday — frame 4f is dated from it. So the week around
   it opens on Sunday 2 August and 5 August is the Wednesday inside it. */
const SATURDAY_NIGHT = new Date(2026, 7, 1, 23, 0)
const SUNDAY_MORNING = new Date(2026, 7, 2, 0, 30)
const WEDNESDAY = new Date(2026, 7, 5, 9, 0)
const FRIDAY = new Date(2026, 7, 7, 18, 0)

/* The day the app ships with, read from the seed rather than written here —
   a literal in a test is the same defect as a literal in `src/`. */
const SUNDAY = appSeed.week.starts

describe('weekBounds', () => {
  it('cuts the week between Saturday night and the Sunday morning after it', () => {
    expect(weekBounds(SATURDAY_NIGHT, SUNDAY).start).not.toEqual(
      weekBounds(SUNDAY_MORNING, SUNDAY).start,
    )
    /* the same instant seen from both sides: one week's end is the next's start */
    expect(weekBounds(SATURDAY_NIGHT, SUNDAY).end).toEqual(
      weekBounds(SUNDAY_MORNING, SUNDAY).start,
    )
  })

  it('holds Sunday morning and the Friday after it in one week', () => {
    expect(weekBounds(FRIDAY, SUNDAY).start).toEqual(weekBounds(SUNDAY_MORNING, SUNDAY).start)
    expect(weekBounds(FRIDAY, SUNDAY).end).toEqual(weekBounds(SUNDAY_MORNING, SUNDAY).end)
  })

  it('opens at midnight rather than at the moment it was asked about', () => {
    expect(weekBounds(WEDNESDAY, SUNDAY).start).toEqual(new Date(2026, 7, 2))
    expect(weekBounds(WEDNESDAY, SUNDAY).end).toEqual(new Date(2026, 7, 9))
  })

  it('takes the day it opens on from its caller rather than from source', () => {
    expect(weekBounds(FRIDAY, 'wednesday').start).toEqual(new Date(2026, 7, 5))
  })

  it('falls back to the stated boundary when handed a day it does not know', () => {
    expect(weekBounds(FRIDAY, 'caturday').start).toEqual(new Date(2026, 7, 2))
  })

  it('ships opening on the day `RULES.md` states', () => {
    expect(SUNDAY).toBe('sunday')
  })
})

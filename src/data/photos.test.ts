/** `resize` itself is a canvas draw, and jsdom has no canvas — so what is
 *  exercised here is the arithmetic it draws with, which is the part that can
 *  be wrong. The cap comes from the seed rather than a number written twice:
 *  a literal here would be the same defect as a literal in `src/`. */

import { fit, photoMonths, photoOf } from './photos'
import type { Entry } from './entry'
import appSeed from '../seed/app.json'

const MAX = appSeed.body.photo_max_edge

const entry = (ts: string, payload: Entry['payload']): Entry => ({
  id: ts,
  module: 'body',
  ts,
  rev: 1,
  recorded_at: ts,
  deleted: false,
  payload,
})

const photo = (ts: string) => entry(ts, { photo: `photos/${ts.slice(0, 10)}.jpg` })

describe('fit', () => {
  it('caps the longest edge, landscape or portrait', () => {
    expect(fit(4000, 3000, MAX)).toEqual({ width: MAX, height: Math.round((MAX * 3) / 4) })
    expect(fit(3000, 4000, MAX)).toEqual({ width: Math.round((MAX * 3) / 4), height: MAX })
  })

  it('leaves a photo already under the cap alone rather than blowing it up', () => {
    expect(fit(800, 600, MAX)).toEqual({ width: 800, height: 600 })
  })

  it('holds the aspect ratio to within a rounded pixel', () => {
    const { width, height } = fit(4032, 3024, MAX)
    expect(Math.max(width, height)).toBe(MAX)
    expect(width / height).toBeCloseTo(4032 / 3024, 2)
  })
})

describe('photoOf', () => {
  it('tells the module’s two entry types apart', () => {
    expect(photoOf({ photo: 'photos/2026-08-01.jpg' })).toBe('photos/2026-08-01.jpg')
    expect(photoOf({ weight: 72.4 })).toBeNull()
    expect(photoOf({})).toBeNull()
  })
})

describe('photoMonths', () => {
  /* newest first, the order `readEntries` hands back */
  const entries = [
    photo('2026-07-04T08:00:00+03:00'),
    photo('2026-05-18T08:00:00+03:00'),
    photo('2026-05-02T08:00:00+03:00'),
    photo('2026-04-06T08:00:00+03:00'),
  ]

  it('names each month once, oldest first', () => {
    expect(photoMonths(entries, appSeed.locale)).toEqual(['april', 'may', 'july'])
  })

  it('keeps the same month in two years apart, rather than naming it once', () => {
    const across = [photo('2027-04-11T08:00:00+03:00'), photo('2026-04-06T08:00:00+03:00')]
    expect(photoMonths(across, appSeed.locale)).toEqual(['april', 'april'])
  })

  it('ignores weights, and leaves the caller’s array in the order it came', () => {
    const mixed = [entries[0]!, entry('2026-06-01T08:00:00+03:00', { weight: 73.1 }), entries[3]!]
    expect(photoMonths(mixed, appSeed.locale)).toEqual(['april', 'july'])
    expect(mixed[0]).toBe(entries[0])
  })
})

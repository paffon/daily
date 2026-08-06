/** The encode itself is a canvas draw, and jsdom has no canvas — so what is
 *  exercised here is the arithmetic it draws with, which is the part that can
 *  be wrong. The cap comes from the seed rather than a number written twice:
 *  a literal here would be the same defect as a literal in `src/`. */

import { drawAt, fit, photoMonths, photoOf } from './photos'
import type { Entry } from './entry'
import appSeed from '../seed/app.json'

const MAX = appSeed.images.item_max_edge

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
    expect(fit(320, 240, MAX)).toEqual({ width: 320, height: 240 })
  })

  it('holds the aspect ratio to within a rounded pixel', () => {
    const { width, height } = fit(4032, 3024, MAX)
    expect(Math.max(width, height)).toBe(MAX)
    expect(width / height).toBeCloseTo(4032 / 3024, 2)
  })
})

/* §10.2's split, which is one branch: an item picture is capped and a body
   photograph is drawn at the size it was shot. */
describe('drawAt', () => {
  it('keeps a body photograph at the resolution it was shot at', () => {
    expect(drawAt({ width: 4032, height: 3024 })).toEqual({ width: 4032, height: 3024 })
  })

  it('caps an item picture at the edge the seed names', () => {
    expect(drawAt({ width: 4032, height: 3024 }, MAX)).toEqual(fit(4032, 3024, MAX))
    expect(Math.max(...Object.values(drawAt({ width: 4032, height: 3024 }, MAX)))).toBe(MAX)
  })

  it('leaves a source already under the cap alone, under either policy', () => {
    expect(drawAt({ width: 300, height: 200 }, MAX)).toEqual({ width: 300, height: 200 })
    expect(drawAt({ width: 300, height: 200 })).toEqual({ width: 300, height: 200 })
  })

  it('compresses an item harder than the body — the whole point of the split', () => {
    expect(appSeed.images.item_quality).toBeLessThan(appSeed.images.body_quality)
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

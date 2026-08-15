/** The export is a document, so what is asserted is what a reader would see:
 *  the sentences, the numbers with their marks and comments, and the honesty
 *  about pictures the build could not reach. Drive is faked — §10.3's offline
 *  case is a fetch that throws, and a test is the one place that can make it
 *  throw on purpose. */

vi.mock('./drive', () => ({
  token: vi.fn(() => ''),
  getFile: vi.fn(),
  putFile: vi.fn(),
  listFiles: vi.fn(),
  getBlob: vi.fn(),
}))

import { getBlob } from './drive'
import { newEntry } from './entry'
import { putEntry, writeJson } from './store'
import {
  buildExerciseSheet,
  buildFoodSheet,
  buildReport,
  reportFileName,
  sheetFileName,
} from './report'

const drive = vi.mocked(getBlob)

const JPEG = new Blob(['bytes'], { type: 'image/jpeg' })

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  /* Drive holds nothing unless a test says otherwise — an item without a
     picture is the ordinary case, not a failure. */
  drive.mockResolvedValue(null)
})

const logWorkout = (ts: string, sets: Record<string, unknown>[], comment = '') =>
  putEntry(
    newEntry(
      'workout',
      {
        started: ts,
        exercises: [{ exercise_id: 'chest-press', sets, comment }],
        body_parts: ['chest'],
      },
      ts,
    ),
  )

describe('buildReport', () => {
  it('is one self-contained document that says whose it is', async () => {
    const html = await buildReport()
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain('daily — main')
    /* nothing fetched when it is opened — no script, no webfont, no CDN */
    expect(html).not.toContain('<script')
    expect(html).not.toMatch(/(src|href)="http/)
  })

  it('says a module that was never used recorded nothing, rather than dropping it', async () => {
    const html = await buildReport()
    for (const label of ['workout', 'nutrition', 'movement', 'dance', 'body']) {
      expect(html).toContain(`<h2>${label}</h2>`)
    }
    expect(html).toContain('nothing recorded yet')
    expect(html).toContain('nothing recorded')
  })

  it('keeps a workout set by set, with the marks and the comment', async () => {
    logWorkout(
      '2026-07-12T07:40:00+03:00',
      [
        { mark: 'more', weight: 47.5, reps: 10 },
        { mark: 'same', weight: 47.5, reps: 8 },
      ],
      'seat one lower',
    )
    const html = await buildReport()
    expect(html).toContain('chest press')
    expect(html).toContain('47.5 kg × 10')
    expect(html).toContain('<td class="mark">more</td>')
    expect(html).toContain('<td class="mark">same</td>')
    expect(html).toContain('seat one lower')
    expect(html).toContain('12 july 2026 07:40')
  })

  it('says a workout with nothing in it did nothing, in the module’s own words', async () => {
    putEntry(
      newEntry(
        'workout',
        { started: '2026-07-12T07:40:00+03:00', exercises: [], body_parts: [] },
        '2026-07-12T07:40:00+03:00',
      ),
    )
    expect(await buildReport()).toContain('nothing done')
  })

  it('keeps a meal food by food — amount, level and the comment', async () => {
    putEntry(
      newEntry(
        'nutrition',
        {
          foods: [
            { food_id: 'pizza', amount: 2, level: 'loaded', comment: 'the good bakery' },
            { food_id: 'coffee', amount: 1, level: 'normal' },
          ],
        },
        '2026-07-12T13:10:00+03:00',
      ),
    )
    const html = await buildReport()
    expect(html).toContain('pizza')
    expect(html).toContain('2 slices')
    expect(html).toContain('loaded')
    expect(html).toContain('the good bakery')
    expect(html).toContain('1 cup')
    /* no numbers column: a food carries none since 2026-08-08, and what a
       portion was is the level plus the food's own note */
    expect(html).not.toContain('kcal')
  })

  it('reads the flat single-food shape every entry before meals was written with', async () => {
    putEntry(
      newEntry(
        'nutrition',
        { food_id: 'coffee', amount: 1, level: 'normal' },
        '2026-06-01T08:00:00+03:00',
      ),
    )
    const html = await buildReport()
    expect(html).toContain('coffee')
    expect(html).toContain('1 cup')
  })

  it('keeps what an entry says when the library no longer has its item', async () => {
    putEntry(
      newEntry(
        'nutrition',
        { foods: [{ food_id: 'gone-food', amount: 1, level: 'normal' }] },
        '2026-06-01T08:00:00+03:00',
      ),
    )
    expect(await buildReport()).toContain('gone-food')
  })

  it('writes movement as its two kinds — a walk is an event, a block a proportion', async () => {
    putEntry(
      newEntry(
        'movement',
        { type: 'segment', segment_id: 'to-work', duration_min: 18, level: 'steady' },
        '2026-07-12T08:20:00+03:00',
      ),
    )
    putEntry(
      newEntry(
        'movement',
        { type: 'posture', span_hours: 8, sitting_hours: 6 },
        '2026-07-12T18:00:00+03:00',
      ),
    )
    const html = await buildReport()
    expect(html).toContain('to work')
    expect(html).toContain('18 min')
    expect(html).toContain('steady')
    expect(html).toContain('8 h · 6 sitting')
  })

  it('writes a dance session as its two fields', async () => {
    putEntry(
      newEntry('dance', { duration_min: 90, level: 'social' }, '2026-07-11T21:00:00+03:00'),
    )
    const html = await buildReport()
    expect(html).toContain('90 min')
    expect(html).toContain('social')
  })

  it('writes weights in the configured unit and decimals', async () => {
    putEntry(newEntry('body', { weight: 74.2 }, '2026-07-12T07:00:00+03:00'))
    expect(await buildReport()).toContain('74.2 kg')
  })

  it('embeds a body photograph and stands its day’s weight beside it', async () => {
    drive.mockResolvedValue(JPEG)
    putEntry(newEntry('body', { weight: 74.2 }, '2026-07-12T07:00:00+03:00'))
    putEntry(
      newEntry('body', { photo: 'photos/2026-07-12.jpg' }, '2026-07-12T07:01:00+03:00'),
    )
    const html = await buildReport()
    expect(html).toContain('data:image/jpeg;base64,')
    expect(html).toMatch(/<figcaption[^>]*>12 july 2026 07:01 · 74\.2 kg<\/figcaption>/)
  })

  it('still builds offline, and names the pictures it could not reach', async () => {
    drive.mockRejectedValue(new Error('drive 0 on nothing'))
    logWorkout('2026-07-12T07:40:00+03:00', [{ mark: '', weight: 40, reps: 10 }])
    putEntry(
      newEntry(
        'nutrition',
        { foods: [{ food_id: 'pizza', amount: 2, level: 'normal' }] },
        '2026-07-12T13:10:00+03:00',
      ),
    )
    putEntry(
      newEntry('body', { photo: 'photos/2026-07-12.jpg' }, '2026-07-12T07:01:00+03:00'),
    )
    const html = await buildReport()
    expect(html).toContain('not reached when this report was written')
    expect(html).toContain('the picture of chest press')
    expect(html).toContain('the picture of pizza')
    expect(html).toContain('the body photograph of 12 july 2026')
    /* the entries themselves never depend on a signal */
    expect(html).toContain('40 kg × 10')
  })

  it('a picture Drive never held is silence, not a missing picture', async () => {
    logWorkout('2026-07-12T07:40:00+03:00', [{ mark: '', weight: 40, reps: 10 }])
    const html = await buildReport()
    expect(html).not.toContain('not reached')
  })

  it('embeds an item’s picture in its library entry when Drive holds one', async () => {
    drive.mockResolvedValue(JPEG)
    logWorkout('2026-07-12T07:40:00+03:00', [{ mark: '', weight: 40, reps: 10 }])
    const html = await buildReport()
    expect(html).toContain('<img class="item" src="data:image/jpeg;base64,')
    expect(html).toContain('alt="chest press"')
  })

  it('asks for an item’s picture once, however often the item recurs', async () => {
    logWorkout('2026-07-10T07:40:00+03:00', [{ mark: '', weight: 40, reps: 10 }])
    logWorkout('2026-07-12T07:40:00+03:00', [{ mark: '', weight: 42.5, reps: 10 }])
    await buildReport()
    const asked = drive.mock.calls.filter(([path]) => path === 'photos/exercise-chest-press.jpg')
    expect(asked).toHaveLength(1)
  })

  it('lists only the library items the log names, with their fixed notes', async () => {
    logWorkout('2026-07-12T07:40:00+03:00', [{ mark: '', weight: 40, reps: 10 }])
    const html = await buildReport()
    /* the seed's chest press carries a rep scheme and setup notes */
    expect(html).toContain('rep scheme 12-11-10-9')
    expect(html).toContain('seat 4, handles at nipple height')
    /* an exercise never performed is catalog, and a catalog is the sheet's */
    expect(html).not.toContain('pec deck')
  })

  /* the kind is a preset and a field list overrides it (§8.1), so the glossary
     says what the sets above it are actually columns of */
  it('says what an exercise records, rather than the kind that presets it', async () => {
    logWorkout('2026-07-12T07:40:00+03:00', [{ mark: '', weight: 40, reps: 10 }])
    const html = await buildReport()
    expect(html).toContain('chest · weight kg × reps · rep scheme 12-11-10-9')
  })

  it('gives a food its unit, the level it opens at, and its note', async () => {
    putEntry(
      newEntry(
        'nutrition',
        { foods: [{ food_id: 'pizza', amount: 1, level: 'lean' }] },
        '2026-07-12T13:10:00+03:00',
      ),
    )
    const html = await buildReport()
    /* the library half states the food itself; the meal above it is where the
       amount and the level were recorded */
    expect(html).toContain('per slice · opens at normal')
    /* the note is the whole of what says how big a lean slice was, which is
       why it is the one thing here written as prose */
    expect(html).toContain('lean is thin crust with vegetables')
  })

  it('reads oldest first — a report is a history, not a rail', async () => {
    logWorkout('2026-07-12T07:40:00+03:00', [{ mark: '', weight: 42.5, reps: 10 }])
    logWorkout('2026-05-02T07:40:00+03:00', [{ mark: '', weight: 40, reps: 10 }])
    const html = await buildReport()
    expect(html.indexOf('2 may 2026')).toBeLessThan(html.indexOf('12 july 2026'))
    expect(html).toContain('2 may 2026 to')
  })

  /* the offset is written into every ts so a late entry keeps its own day
     (`toIso`); a report built elsewhere — a machine on UTC, a week abroad —
     has to read the hours the way they were logged, not re-zone them. Both
     offsets here are foreign to whatever clock is running this test. */
  it('tells the hour the entry was logged at, wherever the report is built', async () => {
    logWorkout('2026-07-12T21:15:00+09:00', [{ mark: '', weight: 40, reps: 10 }])
    putEntry(newEntry('body', { weight: 74.2 }, '2026-07-12T23:30:00-05:00'))
    const html = await buildReport()
    expect(html).toContain('12 july 2026 21:15')
    expect(html).toContain('12 july 2026 23:30')
  })

  it('writes what the user typed as text, never as markup', async () => {
    logWorkout('2026-07-12T07:40:00+03:00', [{ mark: '', weight: 40, reps: 10 }], '<b>30°</b>')
    const html = await buildReport()
    expect(html).toContain('&lt;b&gt;30°&lt;/b&gt;')
    expect(html).not.toContain('<b>30°</b>')
  })

  it('states and never judges — no totals, no scores', async () => {
    putEntry(
      newEntry(
        'nutrition',
        { foods: [{ food_id: 'pizza', amount: 2, level: 'loaded' }] },
        '2026-07-12T13:10:00+03:00',
      ),
    )
    expect(await buildReport()).not.toMatch(/total|score|well done|keep it up/i)
  })
})

/** The other document: one library printed whole. What the report refuses —
 *  the items nothing has ever been logged against — is the whole point here,
 *  so most of what is asserted is the presence of something never used. */
describe('the library sheets', () => {
  it('holds every exercise the library has, not only the ones ever done', async () => {
    logWorkout('2026-07-12T07:40:00+03:00', [{ mark: '', weight: 40, reps: 10 }])
    const html = await buildExerciseSheet()
    expect(html).toContain('chest press')
    /* the same exercise the report leaves out on purpose, two tests above */
    expect(html).toContain('pec deck')
  })

  it('groups the exercises under their body parts, in the library’s own order', async () => {
    const html = await buildExerciseSheet()
    expect(html).toContain('<h2>chest</h2>')
    expect(html).toContain('<h2>legs</h2>')
    /* the seed declares chest before back, and a sheet is browsed rather than
       looked things up in, so it is not alphabetised */
    expect(html.indexOf('<h2>chest</h2>')).toBeLessThan(html.indexOf('<h2>back</h2>'))
  })

  it('sends an exercise with no body part to the end, under a heading saying so', async () => {
    writeJson('library/exercises.json', {
      kinds: { loaded: [{ name: 'weight', unit: 'kg' }] },
      marks: [],
      exercises: [
        { id: 'nowhere', name: 'nowhere', body_part: '', kind: 'loaded' },
        { id: 'curl', name: 'curl', body_part: 'hands', kind: 'loaded' },
      ],
    })
    const html = await buildExerciseSheet()
    expect(html.indexOf('<h2>hands</h2>')).toBeLessThan(html.indexOf('<h2>no body part</h2>'))
  })

  it('says what a set of it records, and never the kind that presets one', async () => {
    const html = await buildExerciseSheet()
    expect(html).toContain('weight kg × reps')
    /* the seed's farmer carry is a `hold` with a field list of its own, so its
       kind has stopped describing it (§8.1) and the list is what is true */
    expect(html).toContain('weight kg / duration s')
    expect(html).not.toContain('loaded')
  })

  it('holds every food, with its unit, the level it opens at and its note', async () => {
    const html = await buildFoodSheet()
    expect(html).toContain('per slice · opens at normal')
    expect(html).toContain('lean is thin crust with vegetables')
    /* nothing has ever been eaten in this test and the sheet is unchanged */
    expect(html).toContain('espresso')
  })

  it('is nobody’s: no profile in its head, and nothing a profile recorded in it', async () => {
    logWorkout('2026-07-12T07:40:00+03:00', [{ mark: '', weight: 40, reps: 10 }])
    const html = await buildExerciseSheet()
    expect(html).toContain('daily — exercises')
    expect(html).not.toContain('daily — main')
    /* what is available, never what was done with it */
    expect(html).not.toContain('12 july 2026')
    expect(html).not.toContain('40 kg × 10')
  })

  it('is one self-contained document, the way the report is', async () => {
    const html = await buildFoodSheet()
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).not.toContain('<script')
    expect(html).not.toMatch(/(src|href)="http/)
  })

  it('embeds an item’s picture, and asks Drive for each one once', async () => {
    drive.mockResolvedValue(JPEG)
    const html = await buildExerciseSheet()
    expect(html).toContain('<img class="item" src="data:image/jpeg;base64,')
    expect(html).toContain('alt="pec deck"')
    const asked = drive.mock.calls.filter(([path]) => path === 'photos/exercise-pec-deck.jpg')
    expect(asked).toHaveLength(1)
  })

  it('still builds offline, and calls itself a sheet when it names what it missed', async () => {
    drive.mockRejectedValue(new Error('drive 0 on nothing'))
    const html = await buildFoodSheet()
    expect(html).toContain('not reached when this sheet was written')
    expect(html).toContain('the picture of pizza')
    /* the library itself never depended on a signal */
    expect(html).toContain('per slice · opens at normal')
  })

  it('says an empty library is empty rather than drawing nothing at all', async () => {
    writeJson('library/foods.json', { units: {}, foods: [] })
    expect(await buildFoodSheet()).toContain('nothing in the library')
  })

  it('writes a name and a body part as text, never as markup', async () => {
    writeJson('library/exercises.json', {
      kinds: {},
      marks: [],
      exercises: [{ id: 'x', name: '<b>dips</b>', body_part: '<i>chest</i>', kind: '' }],
    })
    const html = await buildExerciseSheet()
    expect(html).toContain('<h2>&lt;i&gt;chest&lt;/i&gt;</h2>')
    expect(html).toContain('&lt;b&gt;dips&lt;/b&gt;')
    expect(html).not.toContain('<b>dips</b>')
  })

  it('states and never judges — no counts, no scores', async () => {
    const html = await buildExerciseSheet()
    expect(html).not.toMatch(/total|score|\b\d+ exercises\b/i)
  })
})

describe('reportFileName', () => {
  it('carries the profile and the day, so two profiles never fight over one name', () => {
    expect(reportFileName('main', '2026-08-07T10:00:00+03:00')).toBe(
      'daily-report-main-2026-08-07.html',
    )
  })

  it('slugs a name a filename cannot carry, and survives one that slugs to nothing', () => {
    expect(reportFileName('Omri N.', '2026-08-07T10:00:00+03:00')).toBe(
      'daily-report-omri-n-2026-08-07.html',
    )
    expect(reportFileName('  ', '2026-08-07T10:00:00+03:00')).toBe(
      'daily-report-profile-2026-08-07.html',
    )
  })

  it('keeps a name written in another alphabet — letters are letters', () => {
    expect(reportFileName('עמרי', '2026-08-07T10:00:00+03:00')).toBe(
      'daily-report-עמרי-2026-08-07.html',
    )
  })
})

describe('sheetFileName', () => {
  /* no profile in it, unlike a report's: the catalog is shared (ADR 0004), so
     two profiles exporting the same library on one day export the same file */
  it('names the library and the day, and nobody', () => {
    expect(sheetFileName('exercises', '2026-08-15T10:00:00+03:00')).toBe(
      'daily-exercises-2026-08-15.html',
    )
    expect(sheetFileName('foods', '2026-08-15T10:00:00+03:00')).toBe(
      'daily-foods-2026-08-15.html',
    )
  })
})

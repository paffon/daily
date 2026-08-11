/** The order the picker offers, the reference check that guards a delete, and
 *  the palette a field list is picked from. All pure — a hand-built library
 *  and a hand-built list of entries, no store and no DOM — so what is
 *  exercised here is the arithmetic rather than the screen that happens to
 *  call it. */

import type { Entry } from './entry'
import type { Exercise, Field, Performed } from './exercise'
import { byStaleness, fieldPalette, kindOf, lastUsedAt, usedBy } from './exercise'

const at = (name: string, body_part: string): Exercise => ({
  id: name,
  name,
  body_part,
  kind: 'loaded',
})

/* the library's own order, which is what a tie falls back to */
const LIBRARY = [
  at('press', 'chest'),
  at('fly', 'chest'),
  at('row', 'back'),
  at('pulldown', 'back'),
  at('squat', 'legs'),
  at('warmup', ''),
]

const workout = (day: number, ...ids: string[]): Entry => ({
  id: `w${day}-${ids.join('-')}`,
  module: 'workout',
  ts: `2026-08-${String(day).padStart(2, '0')}T10:00:00+03:00`,
  rev: 1,
  recorded_at: `2026-08-${String(day).padStart(2, '0')}T10:00:00+03:00`,
  deleted: false,
  payload: {
    exercises: ids.map((exercise_id): Performed => ({ exercise_id, sets: [], comment: '' })),
  },
})

const names = (items: Exercise[]) => items.map((item) => item.name)

describe('lastUsedAt', () => {
  it('takes the newest instant each exercise was done at', () => {
    const seen = lastUsedAt([workout(3, 'press'), workout(7, 'press', 'row')])
    expect(seen.get('press')).toBe(Date.parse('2026-08-07T10:00:00+03:00'))
    expect(seen.get('row')).toBe(Date.parse('2026-08-07T10:00:00+03:00'))
  })

  it('does not trust the order it was handed, because a timestamp is editable', () => {
    /* the newest line first, holding the older instant — which is what an
       edited timestamp looks like coming out of `readEntries` */
    const seen = lastUsedAt([workout(3, 'press'), workout(9, 'press')])
    expect(seen.get('press')).toBe(Date.parse('2026-08-09T10:00:00+03:00'))
  })

  it('leaves out an exercise nothing has ever logged', () => {
    expect(lastUsedAt([workout(3, 'press')]).has('squat')).toBe(false)
  })

  it('skips a line whose timestamp cannot be read', () => {
    const broken = { ...workout(3, 'press'), ts: 'not a date' }
    expect(lastUsedAt([broken]).size).toBe(0)
  })
})

describe('byStaleness', () => {
  it('offers what has not been done in the longest time first', () => {
    const order = byStaleness(
      [at('press', 'chest'), at('row', 'back')],
      lastUsedAt([workout(3, 'row'), workout(9, 'press')]),
    )
    expect(names(order)).toEqual(['row', 'press'])
  })

  it('sorts never performed above everything performed', () => {
    /* one body part, so promotion lifts only the head and what is left is the
       gradient on its own — the mixed case is the test below */
    const chest = [at('a', 'chest'), at('b', 'chest'), at('c', 'chest'), at('d', 'chest')]
    const order = byStaleness(chest, lastUsedAt([workout(3, 'c'), workout(5, 'd')]))
    expect(names(order)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('lets a promotion lift a performed exercise over a never-performed one', () => {
    /* the point of promotion, and the one place the gradient does not hold:
       `squat` is the only legs there is, so it is offered before a `warmup`
       that carries no part and has never been done at all */
    const order = byStaleness(LIBRARY, lastUsedAt([workout(3, 'press', 'row', 'squat')]))
    expect(names(order).indexOf('squat')).toBeLessThan(names(order).indexOf('warmup'))
    expect(names(order).slice(0, 3)).toEqual(['fly', 'pulldown', 'squat'])
  })

  it('falls back to the library’s own order when the gap is the same', () => {
    /* nothing performed at all: every gap is the longest there is */
    expect(names(byStaleness(LIBRARY, new Map()))).toEqual([
      /* promoted: the first of each part, in library order because they tie */
      'press',
      'row',
      'squat',
      /* then the rest, still in library order */
      'fly',
      'pulldown',
      'warmup',
    ])
  })

  it('promotes one exercise per body part, each part exactly once', () => {
    const order = byStaleness(
      LIBRARY,
      lastUsedAt([
        workout(1, 'row'),
        workout(2, 'pulldown'),
        workout(3, 'press'),
        workout(4, 'fly'),
        workout(5, 'warmup'),
      ]),
    )
    /* squat is never performed, so it heads the gradient and its part with it;
       then back (row, 1st) and chest (press, 3rd) */
    expect(names(order).slice(0, 3)).toEqual(['squat', 'row', 'press'])
    const heads = order.slice(0, 3).map((item) => item.body_part)
    expect(new Set(heads).size).toBe(heads.length)
  })

  it('never promotes a blank body part, but still sorts it on its own gap', () => {
    const order = byStaleness(
      LIBRARY,
      lastUsedAt([workout(1, 'warmup'), workout(9, 'press', 'row', 'squat', 'fly', 'pulldown')]),
    )
    /* `warmup` is the stalest thing in the library and still is not lifted */
    expect(names(order).slice(0, 3)).not.toContain('warmup')
    /* but it heads the tail, because the gradient is where it does sort */
    expect(names(order)[3]).toBe('warmup')
  })

  it('returns every exercise it was given, exactly once', () => {
    const order = byStaleness(LIBRARY, lastUsedAt([workout(3, 'press', 'squat')]))
    expect(order).toHaveLength(LIBRARY.length)
    expect(new Set(names(order))).toEqual(new Set(names(LIBRARY)))
  })

  it('leaves the library it was handed alone', () => {
    const held = [...LIBRARY]
    byStaleness(LIBRARY, lastUsedAt([workout(3, 'squat')]))
    expect(LIBRARY).toEqual(held)
  })
})

/* a hand-built kinds map, so the palette and the match are read off known
   declarations rather than off whatever the seed happens to hold today */
const KINDS: Record<string, Field[]> = {
  loaded: [
    { name: 'weight', unit: 'kg' },
    { name: 'reps', unit: '', sep: '×' },
  ],
  bodyweight: [
    { name: 'reps', unit: '' },
    { name: 'weight', unit: 'kg', optional: true },
  ],
  hold: [
    { name: 'duration', unit: 's' },
    { name: 'weight', unit: 'kg', optional: true },
  ],
  machine: [
    { name: 'duration', unit: 'min' },
    { name: 'level', unit: '', sep: '@' },
  ],
}

describe('fieldPalette', () => {
  it('offers each name once, in the order the kinds declare them', () => {
    expect(fieldPalette(KINDS).map((field) => `${field.name} ${field.unit}`.trim())).toEqual([
      'weight kg',
      'reps',
      'duration s',
      'level',
    ])
  })

  it('keeps the first declaration, decoration and all', () => {
    /* loaded's weight, not bodyweight's optional one */
    expect(fieldPalette(KINDS).find((field) => field.name === 'weight')).toEqual({
      name: 'weight',
      unit: 'kg',
    })
  })

  it('collapses one name into a single offer regardless of how many units it appears in', () => {
    /* 2026-08-11: duration in seconds and duration in minutes used to be two
       offers, and a set row can only ever hold one duration column anyway —
       the unit is picked separately now, never what tells two offers apart */
    expect(fieldPalette(KINDS).filter((field) => field.name === 'duration')).toHaveLength(1)
    expect(fieldPalette(KINDS).find((field) => field.name === 'duration')).toEqual({
      name: 'duration',
      unit: 's',
    })
  })
})

describe('kindOf', () => {
  it('names the kind whose list this is, by name and unit in order', () => {
    expect(
      kindOf(KINDS, [
        { name: 'weight', unit: 'kg' },
        { name: 'reps', unit: '' },
      ]),
    ).toBe('loaded')
  })

  it('reads order as meaning — reps then weight is bodyweight, not loaded', () => {
    expect(
      kindOf(KINDS, [
        { name: 'reps', unit: '' },
        { name: 'weight', unit: 'kg' },
      ]),
    ).toBe('bodyweight')
  })

  it('never lets optional or a separator block a match — they are the kind’s own', () => {
    expect(
      kindOf(KINDS, [
        { name: 'duration', unit: 's', sep: '/' },
        { name: 'weight', unit: 'kg' },
      ]),
    ).toBe('hold')
  })

  it('answers null for a list no kind declares, units included', () => {
    expect(
      kindOf(KINDS, [
        { name: 'duration', unit: 'min' },
        { name: 'weight', unit: 'kg' },
      ]),
    ).toBeNull()
    expect(kindOf(KINDS, [])).toBeNull()
  })
})

describe('usedBy', () => {
  it('names every workout that logged the exercise, and no other', () => {
    const workouts = [workout(9, 'press', 'row'), workout(5, 'squat'), workout(3, 'press')]
    expect(usedBy('press', workouts).map((entry) => entry.id)).toEqual([
      'w9-press-row',
      'w3-press',
    ])
  })

  it('is empty for an exercise nothing has logged', () => {
    expect(usedBy('fly', [workout(3, 'press')])).toEqual([])
  })

  it('is empty when there is no history at all', () => {
    expect(usedBy('press', [])).toEqual([])
  })
})

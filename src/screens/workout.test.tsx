import { fireEvent, render } from '@testing-library/preact'
import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import { bodyPartsOf, fieldsFor, loadExercises, parseMark, setLine } from '../data/exercise'
import type { Exercise, Performed, SetRow } from '../data/exercise'
import { factFor } from '../data/objectives'
import type { CountTarget } from '../data/objectives'
import { SetTable } from '../components/set_table'
import { ensureSeeded, getEntry, readEntries, writeJson } from '../data/store'
import { EditEntry } from './edit_entry'
import { Workout } from './workout'

const named = (name: string): Exercise => {
  const exercise = loadExercises().exercises.find((item) => item.name === name)
  if (exercise === undefined) throw new Error(`no seeded exercise named ${name}`)
  return exercise
}

/** The table is controlled, so a test needs something to hold its rows. */
function Table({ exercise }: { exercise: Exercise }): VNode {
  const [sets, setSets] = useState<SetRow[]>([])
  return <SetTable exercise={exercise} sets={sets} onChange={setSets} />
}

const box = (container: Element, label: string) =>
  container.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)

const type = (container: Element, label: string, value: string) =>
  fireEvent.input(box(container, label)!, { target: { value } })

const addSet = (container: Element) =>
  fireEvent.click(container.querySelector<HTMLButtonElement>('.set-add-press')!)

const drop = (container: Element, set: number) =>
  fireEvent.click(container.querySelector<HTMLButtonElement>(`[aria-label="remove set ${set}"]`)!)

const markOf = (container: Element, row: number) =>
  container
    .querySelectorAll('.set-row')
    [row]?.querySelector('[aria-pressed="true"] .segmented-word')?.textContent

const press = (container: Element, selector: string) =>
  fireEvent.click(container.querySelector<HTMLButtonElement>(selector)!)

const pick = (container: Element, name: string) =>
  fireEvent.click(
    [...container.querySelectorAll<HTMLButtonElement>('.picker-item')].find((item) =>
      item.textContent?.startsWith(name),
    )!,
  )

/** The demo, as a function: three sets at one weight, the third marked by
 *  typing the sign, and a form cue on the exercise. */
const logChestPress = (container: Element) => {
  pick(container, 'chest press')
  type(container, 'set 1 weight', '47.5')
  type(container, 'set 1 reps', '10')
  addSet(container)
  addSet(container)
  type(container, 'set 3 weight', '47.5+')
  type(container, 'comment', '30°')
  press(container, '.workout-end')
}

const loggedExercises = (): Performed[] =>
  (readEntries('workout')[0]?.payload['exercises'] as Performed[]) ?? []

beforeEach(() => {
  localStorage.clear()
  ensureSeeded()
})

describe('the next-time mark', () => {
  it('reads a trailing sign off the number, however many times it was typed', () => {
    expect(parseMark('47.5+')).toEqual({ value: 47.5, mark: 'more' })
    expect(parseMark('30--')).toEqual({ value: 30, mark: 'less' })
    expect(parseMark('30')).toEqual({ value: 30, mark: 'same' })
    expect(parseMark('')).toEqual({ value: null, mark: 'same' })
  })

  it('keeps a negative number, which is what an assisted set is written as', () => {
    expect(parseMark('-20')).toEqual({ value: -20, mark: 'same' })
  })

  it('records an unreadable box as blank rather than refusing it', () => {
    expect(parseMark('4 2')).toEqual({ value: null, mark: 'same' })
  })
})

describe('the exercise library', () => {
  it('takes its field list from the kind, and never from source', () => {
    expect(fieldsFor(named('chest press')).map((field) => field.name)).toEqual(['weight', 'reps'])
    expect(fieldsFor(named('run · river path')).map((field) => field.name)).toEqual([
      'distance',
      'duration',
      'incline',
    ])
  })

  it('lets one exercise override its kind, for the one that needs both', () => {
    const rowing = named('rowing machine')
    expect(rowing.kind).toBe('machine')
    expect(fieldsFor(rowing).map((field) => field.unit)).toContain('m')
  })

  it('counts what is counted and clocks what is held, and never both', () => {
    /* a skip is a count. Neither the clock nor a weight box belongs on it */
    expect(fieldsFor(named('jump rope')).map((field) => field.name)).toEqual(['count'])
    /* and the load is the whole of a carry, so it is not the optional one */
    expect(fieldsFor(named('farmer carry'))).toEqual([
      { name: 'weight', unit: 'kg' },
      { name: 'duration', unit: 's', sep: '/' },
    ])
  })

  it('covers every body part and every kind it ships', () => {
    const { exercises, kinds } = loadExercises()
    expect(new Set(exercises.map((item) => item.body_part))).toEqual(
      new Set(['abdomen', 'back', 'chest', 'hands', 'heartrate', 'legs', 'shoulders']),
    )
    expect(new Set(exercises.map((item) => item.kind))).toEqual(new Set(Object.keys(kinds)))
  })

  it('writes a set out with the separators the seed carries, skipping blanks', () => {
    const run = named('run · river path')
    expect(setLine({ distance: 5, duration: 28, incline: 2, mark: 'same' }, fieldsFor(run))).toBe(
      '5 km / 28 min @ 2 %',
    )
    expect(setLine({ distance: 4, duration: 26, incline: null, mark: 'more' }, fieldsFor(run))).toBe(
      '4 km / 26 min',
    )
    expect(setLine({ weight: 47.5, reps: 10, mark: 'more' }, fieldsFor(named('chest press')))).toBe(
      '47.5 kg × 10',
    )
  })
})

describe('the set table', () => {
  it('copies the row above, values included, so three sets cost three taps', () => {
    const { container } = render(<Table exercise={named('chest press')} />)
    type(container, 'set 1 weight', '47.5')
    type(container, 'set 1 reps', '10')

    addSet(container)
    addSet(container)

    expect(container.querySelectorAll('.set-row')).toHaveLength(3)
    expect(box(container, 'set 3 weight')?.value).toBe('47.5')
    expect(box(container, 'set 3 reps')?.value).toBe('10')
    expect(container.querySelector('.set-add-note')?.textContent).toBe('copies the row above')
  })

  it('draws the fields the kind declares, and only those', () => {
    const loaded = render(<Table exercise={named('chest press')} />)
    expect(box(loaded.container, 'set 1 weight')).not.toBeNull()
    expect(box(loaded.container, 'set 1 distance')).toBeNull()

    const distance = render(<Table exercise={named('run · river path')} />)
    expect(box(distance.container, 'set 1 distance')).not.toBeNull()
    expect(box(distance.container, 'set 1 duration')).not.toBeNull()
    expect(box(distance.container, 'set 1 weight')).toBeNull()
  })

  it('stands an optional field open rather than behind a reveal', () => {
    const { container } = render(<Table exercise={named('plank')} />)

    expect(box(container, 'set 1 weight')).not.toBeNull()
    expect(box(container, 'set 1 weight')?.className).toContain('set-input-optional')
    expect(box(container, 'set 1 duration')?.className).not.toContain('set-input-optional')
  })

  it('takes the mark off the number as it is typed', () => {
    const { container } = render(<Table exercise={named('chest press')} />)

    type(container, 'set 1 weight', '47.5+')
    expect(markOf(container, 0)).toBe('more')

    type(container, 'set 1 weight', '30--')
    expect(markOf(container, 0)).toBe('less')
  })

  it('leaves a chosen mark alone when the number beside it is corrected', () => {
    const { container } = render(<Table exercise={named('chest press')} />)

    fireEvent.click(container.querySelectorAll('.set-row [aria-pressed]')[2]!)
    expect(markOf(container, 0)).toBe('more')

    type(container, 'set 1 weight', '45')
    expect(markOf(container, 0)).toBe('more')
  })

  it('does not read the minus of a negative number as a mark', () => {
    // the weight is this kind's first box, which is the one the fast input
    // listens to — a counterweight is typed one character at a time, and `-`
    // on its own is on the way to -20 rather than an instruction about next time
    const { container } = render(<Table exercise={named('dips yellow machine')} />)

    type(container, 'set 1 weight', '-')
    expect(markOf(container, 0)).toBe('same')

    type(container, 'set 1 weight', '-20')
    expect(markOf(container, 0)).toBe('same')
    expect(box(container, 'set 1 weight')?.value).toBe('-20')
  })

  it('opens with one row at same, so the first number has somewhere to go', () => {
    const { container } = render(<Table exercise={named('chest press')} />)
    expect(container.querySelectorAll('.set-row')).toHaveLength(1)
    expect(markOf(container, 0)).toBe('same')
  })

  it('removes a set from the middle and shifts what was below it up', () => {
    // the boxes are uncontrolled: what set 3 was typed with has to land in the
    // box that is now set 2, rather than the DOM keeping row 2's old text
    const { container } = render(<Table exercise={named('chest press')} />)

    type(container, 'set 1 weight', '40')
    addSet(container)
    type(container, 'set 2 weight', '45')
    addSet(container)
    type(container, 'set 3 weight', '50')

    drop(container, 2)

    expect(container.querySelectorAll('.set-row')).toHaveLength(2)
    expect(box(container, 'set 1 weight')?.value).toBe('40')
    expect(box(container, 'set 2 weight')?.value).toBe('50')
  })

  it('clears the only row rather than leaving it there', () => {
    const { container } = render(<Table exercise={named('chest press')} />)

    type(container, 'set 1 weight', '47.5')
    drop(container, 1)

    expect(container.querySelectorAll('.set-row')).toHaveLength(1)
    expect(box(container, 'set 1 weight')?.value).toBe('')
  })
})

describe('the workout screen', () => {
  it('logs three sets, two of them one tap, with the mark typed into the weight', () => {
    const { container } = render(<Workout />)
    logChestPress(container)

    expect(readEntries('workout')).toHaveLength(1)
    const [performed] = loggedExercises()
    expect(performed?.sets).toHaveLength(3)
    expect(performed?.sets[2]).toMatchObject({ weight: 47.5, reps: 10, mark: 'more' })
    expect(performed?.sets[0]).toMatchObject({ weight: 47.5, reps: 10, mark: 'same' })
    expect(performed?.comment).toBe('30°')
  })

  it('hands the last time this exercise was done back to the next one', () => {
    const first = render(<Workout />)
    logChestPress(first.container)
    first.unmount()

    const { container } = render(<Workout />)
    pick(container, 'chest press')
    const previous = container.querySelector('.field-previous')?.textContent ?? ''
    expect(previous).toContain('47.5 kg × 10')
    expect(previous).toContain('more')
    expect(previous).toContain('30°')
  })

  it('scopes Previous to the exercise rather than to the workout', () => {
    const first = render(<Workout />)
    logChestPress(first.container)
    first.unmount()

    const { container } = render(<Workout />)
    pick(container, 'incline press')
    expect(container.querySelector('.field-previous')?.textContent).toContain('nothing recorded yet')
  })

  it('keeps one exercise’s numbers out of the next one’s boxes', () => {
    const { container } = render(<Workout />)
    pick(container, 'chest press')
    type(container, 'set 1 weight', '47.5')

    press(container, '.workout-rail-add')
    pick(container, 'incline press')
    expect(box(container, 'set 1 weight')?.value).toBe('')
    type(container, 'set 1 weight', '20')

    // back to the first one through the rail, which swaps the table's rows
    // without unmounting it
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.workout-rail-row')[0]!)
    expect(box(container, 'set 1 weight')?.value).toBe('47.5')
  })

  it('makes a library item out of what was typed to find it', () => {
    const { container } = render(<Workout />)
    fireEvent.input(container.querySelector<HTMLInputElement>('.picker-filter')!, {
      target: { value: 'dips blue machine' },
    })
    press(container, '.picker-new')

    expect(container.querySelector('.workout-title')?.textContent).toBe('dips blue machine')
    expect(loadExercises().exercises.some((item) => item.name === 'dips blue machine')).toBe(true)
  })

  it('answers a press with nothing typed by putting the cursor where the name goes', () => {
    // the button used to disable itself, which reads as broken: its label is
    // the only thing tying the press to the box, and greying it out says less
    // than nothing about what to type where
    const { container } = render(<Workout />)
    const button = container.querySelector<HTMLButtonElement>('.picker-new')!

    expect(button.disabled).toBe(false)
    fireEvent.click(button)

    expect(document.activeElement).toBe(container.querySelector('.picker-filter'))
    // and no nameless exercise was made on the way there
    expect(loadExercises().exercises.some((item) => item.name === '')).toBe(false)
    expect(container.querySelector('.workout-title')?.textContent).toBe('exercise')
  })

  it('says in the box that typing there names a new one, not only that it filters', () => {
    const { container } = render(<Workout />)
    expect(container.querySelector('.picker-filter')?.getAttribute('placeholder')).toBe(
      'find one, or name a new one',
    )
  })

  it('draws no graph, and says plainly what there is instead', () => {
    const { container } = render(<Workout />)
    expect(container.querySelector('svg, canvas')).toBeNull()
    expect(container.querySelector('.workout-rail-progress')?.textContent).toBe(
      'progress · 0 workouts, not enough to draw',
    )
  })
})

/** An exercise made inline used to keep a blank body part and the library's
 *  first kind permanently — nothing in `src/` could change either. So a route
 *  added as `run · park loop` drew a weight box, against `RULES.md`'s "never
 *  show a field the thing does not have", and the body part objectives count
 *  against was empty for every exercise the user ever added. */
describe('the kind and body part of an exercise made inline', () => {
  const make = (name: string) => {
    const screen = render(<Workout />)
    fireEvent.input(screen.container.querySelector<HTMLInputElement>('.picker-filter')!, {
      target: { value: name },
    })
    press(screen.container, '.picker-new')
    return screen
  }

  const set = (container: Element, label: string, value: string) =>
    fireEvent.change(container.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!, {
      target: { value },
    })

  const made = (name: string) => loadExercises().exercises.find((item) => item.name === name)

  it('offers every kind the library carries, and nothing written in source', () => {
    const { container } = make('run · park loop')
    const kinds = [...container.querySelectorAll('[aria-label="kind"] option')].map(
      (option) => option.textContent,
    )
    expect(kinds).toEqual(Object.keys(loadExercises().kinds))
  })

  it('swaps the set row to the fields the chosen kind records', () => {
    const { container } = make('run · park loop')
    expect(box(container, 'set 1 weight')).not.toBeNull()

    set(container, 'kind', 'distance')

    expect(box(container, 'set 1 weight')).toBeNull()
    expect(box(container, 'set 1 distance')).not.toBeNull()
    expect(box(container, 'set 1 duration')).not.toBeNull()
    expect(made('run · park loop')?.kind).toBe('distance')
  })

  it('drops rows typed under the old kind rather than carrying half of them', () => {
    // the boxes are uncontrolled and the columns are now different ones, so a
    // row kept would put a weight under `distance` or the word undefined in a box
    const { container } = make('run · park loop')
    type(container, 'set 1 weight', '47.5')

    set(container, 'kind', 'distance')

    expect(container.querySelectorAll('.set-row')).toHaveLength(1)
    expect(box(container, 'set 1 distance')?.value).toBe('')

    type(container, 'set 1 distance', '5')
    type(container, 'set 1 duration', '28')
    press(container, '.workout-end')

    // the new kind's fields and only those — no `weight` left over from the old one
    expect(loggedExercises()[0]?.sets).toEqual([
      { distance: 5, duration: 28, incline: null, mark: 'same' },
    ])
  })

  it('writes the body part onto the library, where an objective can count it', () => {
    const { container } = make('run · park loop')
    expect(made('run · park loop')?.body_part).toBe('')

    set(container, 'body part', 'legs')
    press(container, '.workout-end')

    expect(made('run · park loop')?.body_part).toBe('legs')
    expect(readEntries('workout')[0]!.payload['body_parts']).toEqual(['legs'])
  })

  it('offers the parts already in the library without closing the list to them', () => {
    const { container } = make('hip airplane')
    const offered = [...container.querySelectorAll('#workout-body-parts option')].map((option) =>
      option.getAttribute('value'),
    )
    expect(offered).toContain('back')
    expect(offered).toContain('legs')

    // a datalist suggests; it does not constrain, and the taxonomy is the user's
    set(container, 'body part', 'hips')
    expect(made('hip airplane')?.body_part).toBe('hips')
  })

  it('retags a seeded exercise too — a seeded item is no more protected', () => {
    const { container } = render(<Workout />)
    pick(container, 'pull ups')
    set(container, 'body part', 'shoulders')

    expect(loadExercises().exercises.find((item) => item.name === 'pull ups')?.body_part).toBe(
      'shoulders',
    )
  })
})

describe('removing an exercise from the library', () => {
  const del = (container: Element, name: string) =>
    container.querySelector<HTMLButtonElement>(`[aria-label="delete ${name}"]`)!

  it('arms on the first press and deletes on the second', () => {
    const { container } = render(<Workout />)

    fireEvent.click(del(container, 'pec deck'))
    expect(del(container, 'pec deck').textContent).toBe('sure?')
    expect(loadExercises().exercises.some((item) => item.name === 'pec deck')).toBe(true)

    fireEvent.click(del(container, 'pec deck'))
    expect(loadExercises().exercises.some((item) => item.name === 'pec deck')).toBe(false)
    expect(
      [...container.querySelectorAll('.picker-item')].some((item) =>
        item.textContent?.startsWith('pec deck'),
      ),
    ).toBe(false)
  })

  it('keeps a logged workout readable after its exercise is gone', () => {
    const first = render(<Workout />)
    logChestPress(first.container)
    first.unmount()

    const { container } = render(<Workout />)
    fireEvent.click(del(container, 'chest press'))
    fireEvent.click(del(container, 'chest press'))

    // the rail still counts the workout, and the stored sets are untouched —
    // only the library lost the name
    expect(readEntries('workout')).toHaveLength(1)
    expect(loggedExercises()[0]?.sets).toHaveLength(3)
  })
})

describe('editing a past workout', () => {
  const logged = () => {
    const first = render(<Workout />)
    logChestPress(first.container)
    first.unmount()
    return readEntries('workout')[0]!.id
  }

  it('opens it with the fields it was logged with, marks included', () => {
    const { container } = render(<EditEntry id={logged()} />)

    expect(container.querySelector('.workout-edit-name')?.textContent).toBe('chest press')
    expect(container.querySelectorAll('.set-row')).toHaveLength(3)
    expect(box(container, 'set 3 weight')?.value).toBe('47.5')
    expect(box(container, 'set 1 distance')).toBeNull()
    expect(markOf(container, 2)).toBe('more')
    expect(markOf(container, 0)).toBe('same')
    expect(box(container, 'comment')?.value).toBe('30°')
  })

  it('writes a corrected set back through the store', () => {
    const id = logged()
    const { container } = render(<EditEntry id={id} />)

    type(container, 'set 1 reps', '8')
    press(container, '.edit-save')

    const sets = (getEntry(id)?.payload['exercises'] as Performed[])[0]?.sets
    expect(sets?.[0]).toMatchObject({ weight: 47.5, reps: 8 })
    expect(sets?.[2]).toMatchObject({ mark: 'more' })
    expect(getEntry(id)?.rev).toBe(2)
  })
})

describe('what a saved workout holds', () => {
  it('leaves the end time out rather than guessing it from when save was pressed', () => {
    const { container } = render(<Workout />)
    logChestPress(container)

    const payload = readEntries('workout')[0]!.payload
    expect(payload['started']).toBe(readEntries('workout')[0]!.ts)
    expect(payload).not.toHaveProperty('ended')
  })

  it('hands back the last block of an exercise done twice in one workout', () => {
    const first = render(<Workout />)
    pick(first.container, 'chest press')
    type(first.container, 'set 1 weight', '47.5')
    press(first.container, '.workout-rail-add')
    pick(first.container, 'chest press')
    type(first.container, 'set 1 weight', '30')
    press(first.container, '.workout-end')
    first.unmount()

    const { container } = render(<Workout />)
    pick(container, 'chest press')
    expect(container.querySelector('.field-previous')?.textContent).toContain('30 kg')
  })
})

/** The one contract between this module and the objectives surface. Objectives
 *  reads `payload.body_parts` and nothing else of a workout, so a target like
 *  *something for the back weekly* is answered by what the entry recorded at
 *  log time — never by a library lookup that a later rename would change. */
describe('the body parts an objective counts', () => {
  const backTarget: CountTarget = {
    kind: 'count',
    label: 'something for the back weekly',
    module: 'workout',
    per: 'week',
    target: 1,
    body_part: 'back',
  }

  it('keeps each part once, however many exercises reached it', () => {
    const { container } = render(<Workout />)
    pick(container, 'chest press')
    press(container, '.workout-rail-add')
    pick(container, 'pec deck')
    press(container, '.workout-rail-add')
    pick(container, 'pull ups')
    press(container, '.workout-end')

    expect(readEntries('workout')[0]!.payload['body_parts']).toEqual(['chest', 'back'])
  })

  it('answers a body-part target with the workout just logged', () => {
    expect(factFor(backTarget, readEntries('workout'))).toBe('0 this week')

    const { container } = render(<Workout />)
    pick(container, 'pull ups')
    press(container, '.workout-end')

    expect(factFor(backTarget, readEntries('workout'))).toBe('1 this week')
  })

  it('does not answer for a part the workout never reached', () => {
    const { container } = render(<Workout />)
    pick(container, 'pull ups')
    press(container, '.workout-end')

    expect(factFor({ ...backTarget, body_part: 'legs' }, readEntries('workout'))).toBe('0 this week')
  })

  it('records the part an exercise carried even after the library is re-tagged', () => {
    const { container } = render(<Workout />)
    pick(container, 'pull ups')
    press(container, '.workout-end')

    const library = loadExercises()
    writeJson('library/exercises.json', {
      ...library,
      exercises: library.exercises.map((item) =>
        item.name === 'pull ups' ? { ...item, body_part: 'shoulders' } : item,
      ),
    })

    expect(factFor(backTarget, readEntries('workout'))).toBe('1 this week')
  })

  it('contributes nothing for an exercise carrying no body part', () => {
    expect(bodyPartsOf([{ exercise_id: 'nothing-known', sets: [], comment: '' }], [])).toEqual([])
  })
})

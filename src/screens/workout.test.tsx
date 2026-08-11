import { fireEvent, render } from '@testing-library/preact'
import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import { bodyPartsOf, fieldPalette, fieldsFor, loadExercises, parseMark, setLine } from '../data/exercise'
import type { Exercise, Performed, SetRow } from '../data/exercise'
import { SetTable } from '../components/set_table'
import { ensureSeeded, getEntry, readEntries, writeJson } from '../data/store'
import { EditEntry } from './edit_entry'
import { Workout, workoutLine } from './workout'

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

/** The module lands on the list; the builder is behind `+ new workout`. */
const openNew = (container: Element) => press(container, '.workout-new')

/** The demo, as a function: three sets at one weight, the third marked by
 *  typing the sign, and a form cue on the exercise. */
const logChestPress = (container: Element) => {
  openNew(container)
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

  it('gives the first value written no separator, since it follows nothing', () => {
    const run = named('run · river path')
    /* a run with no distance reads `28 min`, never `/ 28 min` — and a picked
       list that leads with `reps` never opens with `×` */
    expect(setLine({ distance: null, duration: 28, incline: null, mark: 'same' }, fieldsFor(run))).toBe(
      '28 min',
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
    openNew(container)
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
    openNew(container)
    pick(container, 'incline press')
    expect(container.querySelector('.field-previous')?.textContent).toContain('nothing recorded yet')
  })

  it('keeps one exercise’s numbers out of the next one’s boxes', () => {
    const { container } = render(<Workout />)
    openNew(container)
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
    openNew(container)
    fireEvent.input(container.querySelector<HTMLInputElement>('.picker-filter')!, {
      target: { value: 'dips blue machine' },
    })
    press(container, '.picker-new')

    // the title is the name box now, so what it holds is a value not text
    expect(box(container, 'name')?.value).toBe('dips blue machine')
    expect(loadExercises().exercises.some((item) => item.name === 'dips blue machine')).toBe(true)
  })

  it('answers a press with nothing typed by putting the cursor where the name goes', () => {
    // the button used to disable itself, which reads as broken: its label is
    // the only thing tying the press to the box, and greying it out says less
    // than nothing about what to type where
    const { container } = render(<Workout />)
    openNew(container)
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
    openNew(container)
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
 *  show a field the thing does not have", and the body part the list is
 *  ordered by was empty for every exercise the user ever added. */
describe('the kind and body part of an exercise made inline', () => {
  const make = (name: string) => {
    const screen = render(<Workout />)
    openNew(screen.container)
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

  it('writes the body part onto the library, and stamps it onto the workout', () => {
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
    openNew(container)
    pick(container, 'pull ups')
    set(container, 'body part', 'shoulders')

    expect(loadExercises().exercises.find((item) => item.name === 'pull ups')?.body_part).toBe(
      'shoulders',
    )
  })
})

/** §8.1: kinds are a starting point, and the field list of any individual
 *  exercise is editable. The moment an exercise is made inline is the one time
 *  its list is more urgent than its first set, so the builder says it is new
 *  and offers the fields directly — with the set table live underneath, since
 *  define-then-log as a mode would be a second screen for the same thing. */
describe('defining an exercise where it is made', () => {
  const make = (name: string) => {
    const screen = render(<Workout />)
    openNew(screen.container)
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

  const toggle = (container: Element, label: string) =>
    fireEvent.click(
      container.querySelector<HTMLButtonElement>(`.set-fields-choice[aria-label="${label}"]`)!,
    )

  const made = (name: string) => loadExercises().exercises.find((item) => item.name === name)

  it('says the exercise is new, and says it only for the one just made', () => {
    const { container } = make('hip airplane')
    expect(container.querySelector('.workout-define-title')?.textContent).toBe(
      'this exercise is new — what does a set of it record?',
    )

    press(container, '.workout-rail-add')
    pick(container, 'chest press')
    expect(container.querySelector('.workout-define')).toBeNull()
  })

  it('opens with the default kind’s fields pressed, so the common case is no taps', () => {
    const { container } = make('hip airplane')
    const pressed = [...container.querySelectorAll('.set-fields-choice[aria-pressed="true"]')].map(
      (chip) => chip.getAttribute('aria-label'),
    )
    const first = Object.values(loadExercises().kinds)[0]!
    expect(pressed).toEqual(first.map((field) => `${field.name} ${field.unit}`.trim()))
  })

  it('offers every field the kinds declare, and nothing written in source', () => {
    const { container } = make('hip airplane')
    const offered = [...container.querySelectorAll('.set-fields-choice')].map((chip) =>
      chip.getAttribute('aria-label'),
    )
    expect(offered).toEqual(
      fieldPalette(loadExercises().kinds).map((field) => `${field.name} ${field.unit}`.trim()),
    )
  })

  it('swaps the set row as a field is toggled, and writes the list to the library', () => {
    const { container } = make('hip airplane')
    expect(box(container, 'set 1 duration')).toBeNull()

    toggle(container, 'duration s')

    expect(box(container, 'set 1 duration')).not.toBeNull()
    expect(made('hip airplane')?.fields?.map((field) => field.name)).toEqual([
      'weight',
      'reps',
      'duration',
    ])
    /* and the kind control says so, rather than naming a kind the table is
       not drawing */
    const kind = container.querySelector<HTMLSelectElement>('[aria-label="kind"]')!
    expect(kind.value).toBe('')
    expect(kind.querySelector('option[value=""]')?.textContent).toBe('its own fields')
  })

  it('records a list that lands on a kind as that kind, never as a copy', () => {
    const { container } = make('hip airplane')
    toggle(container, 'weight kg')
    toggle(container, 'weight kg')

    /* reps then weight is bodyweight's own order, so it is bodyweight */
    expect(made('hip airplane')?.kind).toBe('bodyweight')
    expect(made('hip airplane')?.fields).toBeUndefined()
    /* and the optional weight drawn open is the kind's, proof the list
       followed the kind rather than a copy of it */
    expect(box(container, 'set 1 weight')?.className).toContain('set-input-optional')
  })

  it('leaves once a set row is typed — a toggle clears rows, and now there are some', () => {
    const { container } = make('hip airplane')
    expect(container.querySelector('.workout-define')).not.toBeNull()

    type(container, 'set 1 weight', '40')
    expect(container.querySelector('.workout-define')).toBeNull()

    /* taking the only row back out is returning to the definition moment */
    drop(container, 1)
    expect(container.querySelector('.workout-define')).not.toBeNull()
  })

  it('adopts a kind whole from the select, dropping the exercise’s own list', () => {
    const { container } = make('hip airplane')
    toggle(container, 'duration s')

    set(container, 'kind', 'distance')

    expect(made('hip airplane')?.kind).toBe('distance')
    expect(made('hip airplane')?.fields).toBeUndefined()
    expect(box(container, 'set 1 distance')).not.toBeNull()
  })

  it('says what a field is for, which is not what a comment is for', () => {
    const { container } = make('hip airplane')
    expect(container.querySelector('.set-fields-note')?.textContent).toContain('comment')
  })
})

/** A delete is unconditional only while nothing references the item — §7. Once
 *  an exercise appears in a logged workout the delete names the workouts that
 *  use it and offers to rename it instead, because that is the case that
 *  usually wanted deleting. The way out is through the entries. */
describe('removing an exercise from the library', () => {
  const del = (container: Element, name: string) =>
    container.querySelector<HTMLButtonElement>(`[aria-label="delete ${name}"]`)!

  const has = (name: string) => loadExercises().exercises.some((item) => item.name === name)

  it('arms on the first press and deletes on the second, while nothing uses it', () => {
    const { container } = render(<Workout />)
    openNew(container)

    fireEvent.click(del(container, 'pec deck'))
    expect(del(container, 'pec deck').textContent).toBe('press again')
    expect(has('pec deck')).toBe(true)

    fireEvent.click(del(container, 'pec deck'))
    expect(has('pec deck')).toBe(false)
    expect(
      [...container.querySelectorAll('.picker-item')].some((item) =>
        item.textContent?.startsWith('pec deck'),
      ),
    ).toBe(false)
  })

  it('refuses without arming once a logged workout names it', () => {
    const first = render(<Workout />)
    logChestPress(first.container)
    first.unmount()

    const { container } = render(<Workout />)
    openNew(container)
    fireEvent.click(del(container, 'chest press'))

    // it did not arm, so a second press cannot get through by accident
    expect(del(container, 'chest press').textContent).toBe('×')
    expect(container.querySelector('.refused')).not.toBeNull()

    fireEvent.click(del(container, 'chest press'))
    expect(has('chest press')).toBe(true)
  })

  it('names the workouts that use it, as links to them', () => {
    const first = render(<Workout />)
    logChestPress(first.container)
    first.unmount()
    const id = readEntries('workout')[0]!.id

    const { container } = render(<Workout />)
    openNew(container)
    fireEvent.click(del(container, 'chest press'))

    expect(container.querySelector('.refused-line')?.textContent).toBe('in a workout, still')
    const links = [...container.querySelectorAll<HTMLAnchorElement>('.refused-link')]
    expect(links).toHaveLength(1)
    expect(links[0]!.getAttribute('href')).toBe(`#/entry/${id}`)
  })

  it('renames from the refusal, and the past workout reads back under the new name', () => {
    const first = render(<Workout />)
    logChestPress(first.container)
    first.unmount()

    const { container } = render(<Workout />)
    openNew(container)
    fireEvent.click(del(container, 'chest press'))
    fireEvent.change(container.querySelector<HTMLInputElement>('[aria-label="rename chest press"]')!, {
      target: { value: 'chest press · blue' },
    })

    expect(has('chest press · blue')).toBe(true)
    expect(has('chest press')).toBe(false)
    // the entry stores the id, so the rename reached it without touching a set
    expect(workoutLine(readEntries('workout')[0]!)).toBe('chest press · blue')
    expect(loggedExercises()[0]?.sets).toHaveLength(3)
  })

  it('is blocked by the workout being corrected, which references it like any other', () => {
    const first = render(<Workout />)
    logChestPress(first.container)
    first.unmount()

    const { container } = render(<Workout />)
    fireEvent.click(container.querySelector<HTMLButtonElement>('.workout-rail-row')!)
    press(container, '.workout-rail-add')
    fireEvent.click(del(container, 'chest press'))

    expect(container.querySelector('.refused')).not.toBeNull()
    expect(has('chest press')).toBe(true)
  })

  it('lets it go once the workout holding it is deleted', () => {
    const first = render(<Workout />)
    logChestPress(first.container)
    // the builder's own `delete this entry`, which tombstones the workout
    fireEvent.click(first.container.querySelector<HTMLButtonElement>('.workout-rail-row')!)
    press(first.container, '.field-danger')
    press(first.container, '.field-danger')
    first.unmount()

    const { container } = render(<Workout />)
    openNew(container)
    fireEvent.click(del(container, 'chest press'))
    fireEvent.click(del(container, 'chest press'))

    expect(has('chest press')).toBe(false)
  })

  it('keeps a logged workout readable after its exercise is gone', () => {
    // reachable the other way round: the exercise is deleted while unused, and
    // a workout naming it is logged from a browser that still had it
    const first = render(<Workout />)
    logChestPress(first.container)
    first.unmount()

    const library = loadExercises()
    writeJson('library/exercises.json', {
      ...library,
      exercises: library.exercises.filter((item) => item.name !== 'chest press'),
    })

    expect(readEntries('workout')).toHaveLength(1)
    expect(loggedExercises()[0]?.sets).toHaveLength(3)
    const { container } = render(<EditEntry id={readEntries('workout')[0]!.id} />)
    expect(container.querySelectorAll('.set-row')).toHaveLength(3)
  })
})

describe('correcting a past workout from the module list', () => {
  it('opens a listed workout in the builder adding uses, and writes the correction back', () => {
    const first = render(<Workout />)
    logChestPress(first.container)
    first.unmount()

    const { container } = render(<Workout />)
    fireEvent.click(container.querySelector<HTMLButtonElement>('.workout-rail-row')!)

    // the same screen adding uses: the exercise rail, the set table, the
    // picker one press away
    expect(container.querySelector('.workout-rail-label')?.textContent).toBe('this workout')
    expect(box(container, 'set 1 weight')?.value).toBe('47.5')

    type(container, 'set 1 weight', '50')
    press(container, '.workout-end')

    const entry = readEntries('workout')[0]!
    expect((entry.payload['exercises'] as Performed[])[0]?.sets[0]).toMatchObject({ weight: 50 })
    expect(entry.rev).toBe(2)
    // and saving lands back on the list, where the row still is
    expect(container.querySelector('.workout-new')).not.toBeNull()
    expect(container.querySelectorAll('.workout-rail-row')).toHaveLength(1)
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
    openNew(first.container)
    pick(first.container, 'chest press')
    type(first.container, 'set 1 weight', '47.5')
    press(first.container, '.workout-rail-add')
    pick(first.container, 'chest press')
    type(first.container, 'set 1 weight', '30')
    press(first.container, '.workout-end')
    first.unmount()

    const { container } = render(<Workout />)
    openNew(container)
    pick(container, 'chest press')
    expect(container.querySelector('.field-previous')?.textContent).toContain('30 kg')
  })
})

/** Nothing reads `payload.body_parts` — ADR 0006 is the file that says why it
 *  is stamped anyway. The short of it is that it cannot be reconstructed: it is
 *  written at save time precisely because a later re-tag must not rewrite what
 *  June trained, so it is recorded going forward or it is lost. */
describe('the body parts a workout stamps', () => {
  it('keeps each part once, however many exercises reached it', () => {
    const { container } = render(<Workout />)
    openNew(container)
    pick(container, 'chest press')
    press(container, '.workout-rail-add')
    pick(container, 'pec deck')
    press(container, '.workout-rail-add')
    pick(container, 'pull ups')
    press(container, '.workout-end')

    expect(readEntries('workout')[0]!.payload['body_parts']).toEqual(['chest', 'back'])
  })

  it('records the part an exercise carried even after the library is re-tagged', () => {
    const { container } = render(<Workout />)
    openNew(container)
    pick(container, 'pull ups')
    press(container, '.workout-end')

    const library = loadExercises()
    writeJson('library/exercises.json', {
      ...library,
      exercises: library.exercises.map((item) =>
        item.name === 'pull ups' ? { ...item, body_part: 'shoulders' } : item,
      ),
    })

    // the snapshot is what the entry said at the time, not what the library
    // says now — this is the whole of ADR 0006's argument for keeping it
    expect(readEntries('workout')[0]!.payload['body_parts']).toEqual(['back'])
  })

  it('contributes nothing for an exercise carrying no body part', () => {
    expect(bodyPartsOf([{ exercise_id: 'nothing-known', sets: [], comment: '' }], [])).toEqual([])
  })
})

/** §8.1: an exercise can be taken out, and a workout left with none is still a
 *  workout. Nothing in the builder is committed until it is saved, so this is
 *  session state — it never arms, and leaving the screen undoes it. */
describe('taking an exercise out of a workout', () => {
  const railNames = (container: Element) =>
    [...container.querySelectorAll('.workout-rail-name')].map((span) => span.textContent)

  const three = () => {
    const screen = render(<Workout />)
    openNew(screen.container)
    pick(screen.container, 'chest press')
    press(screen.container, '.workout-rail-add')
    pick(screen.container, 'pec deck')
    press(screen.container, '.workout-rail-add')
    pick(screen.container, 'pull ups')
    return screen
  }

  const remove = (container: Element, name: string) =>
    fireEvent.click(container.querySelector<HTMLButtonElement>(`[aria-label="remove ${name}"]`)!)

  it('takes out the one asked for and leaves the others', () => {
    const { container } = three()
    remove(container, 'pec deck')
    expect(railNames(container)).toEqual(['chest press', 'pull ups'])
  })

  it('keeps the live exercise live when something above it goes', () => {
    const { container } = three()
    // `pull ups` is live, being the last picked
    remove(container, 'chest press')
    expect(box(container, 'name')?.value).toBe('pull ups')
  })

  it('makes the next one live when the live one goes', () => {
    const { container } = three()
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.workout-rail-row')[1]!)
    remove(container, 'pec deck')
    expect(box(container, 'name')?.value).toBe('pull ups')
  })

  it('opens the picker when the last one goes', () => {
    const { container } = three()
    remove(container, 'chest press')
    remove(container, 'pec deck')
    remove(container, 'pull ups')

    expect(railNames(container)).toEqual([])
    expect(container.querySelector('.picker-filter')).not.toBeNull()
  })

  it('saves a workout with none, and home says nothing was done', () => {
    const { container } = three()
    remove(container, 'chest press')
    remove(container, 'pec deck')
    remove(container, 'pull ups')

    const end = container.querySelector<HTMLButtonElement>('.workout-end')!
    expect(end.disabled).toBe(false)
    fireEvent.click(end)

    const entry = readEntries('workout')[0]!
    expect(entry.payload['exercises']).toEqual([])
    expect(entry.payload['body_parts']).toEqual([])
    expect(workoutLine(entry)).toBe('nothing done')
  })

  it('is undone by leaving the screen, because nothing was committed', () => {
    const first = render(<Workout />)
    logChestPress(first.container)
    first.unmount()

    const { container } = render(<Workout />)
    fireEvent.click(container.querySelector<HTMLButtonElement>('.workout-rail-row')!)
    remove(container, 'chest press')
    press(container, '.workout-back')

    expect(loggedExercises()).toHaveLength(1)
  })
})

/** §8.1: the name is editable where the exercise is being logged. A rename
 *  reaches every workout that ever used it, because an entry stores the id and
 *  the name is resolved at read time. */
describe('renaming an exercise where it is logged', () => {
  const rename = (container: Element, value: string) =>
    fireEvent.change(container.querySelector<HTMLInputElement>('[aria-label="name"]')!, {
      target: { value },
    })

  it('writes the new name to the library', () => {
    const { container } = render(<Workout />)
    openNew(container)
    pick(container, 'chest press')
    rename(container, 'chest press · blue')

    expect(loadExercises().exercises.some((item) => item.name === 'chest press · blue')).toBe(true)
  })

  it('reaches a workout logged before it', () => {
    const first = render(<Workout />)
    logChestPress(first.container)
    first.unmount()
    const before = readEntries('workout')[0]!

    const { container } = render(<Workout />)
    openNew(container)
    pick(container, 'chest press')
    rename(container, 'chest press · blue')

    const after = readEntries('workout')[0]!
    expect(workoutLine(after)).toBe('chest press · blue')
    // the entry itself did not move: same id stored, same rev, same sets
    expect((after.payload['exercises'] as Performed[])[0]?.exercise_id).toBe(
      (before.payload['exercises'] as Performed[])[0]?.exercise_id,
    )
    expect(after.rev).toBe(before.rev)
  })

  it('refuses a blank quietly, and the old name stands', () => {
    const { container } = render(<Workout />)
    openNew(container)
    pick(container, 'chest press')
    rename(container, '   ')

    expect(box(container, 'name')?.value).toBe('chest press')
    expect(loadExercises().exercises.some((item) => item.name === 'chest press')).toBe(true)
  })

  it('leaves the rows already typed alone — only a kind clears them', () => {
    const { container } = render(<Workout />)
    openNew(container)
    pick(container, 'chest press')
    type(container, 'set 1 weight', '47.5')

    rename(container, 'chest press · blue')

    expect(box(container, 'set 1 weight')?.value).toBe('47.5')
  })

  it('holds the kind and the body part in one pair, both the same tap target', () => {
    // jsdom computes no layout, so what is asserted is the structure that
    // produces one size — the widths themselves are checked in the browser
    const { container } = render(<Workout />)
    openNew(container)
    pick(container, 'chest press')

    const pair = container.querySelector('.workout-pair')!
    expect(pair.querySelector('.workout-kind')).not.toBeNull()
    expect(pair.querySelector('.workout-part')).not.toBeNull()
    expect(container.querySelector('.workout-kind')?.classList.contains('hit')).toBe(true)
    expect(container.querySelector('.workout-part')?.classList.contains('hit')).toBe(true)
  })
})

/** §8.1: longest-ago first, one exercise per body part promoted above that
 *  gradient. The ordering itself is unit-tested in `exercise.test.ts`; what is
 *  checked here is that the picker is actually wired to it. */
describe('the order the picker offers', () => {
  const offered = (container: Element) =>
    [...container.querySelectorAll('.picker-name')].map((span) => span.textContent)

  it('sinks what was just done and heads the list with different body parts', () => {
    const first = render(<Workout />)
    logChestPress(first.container)
    first.unmount()

    const { container } = render(<Workout />)
    openNew(container)
    const names = offered(container)

    expect(names[0]).not.toBe('chest press')
    expect(names.at(-1)).toBe('chest press')

    // the promoted head names each part once
    const library = loadExercises().exercises
    const partOf = (name: string) => library.find((item) => item.name === name)?.body_part
    const head = names.slice(0, 3).map((name) => partOf(name!))
    expect(new Set(head).size).toBe(head.length)
  })

  it('narrows on the filter without reordering what is left', () => {
    const { container } = render(<Workout />)
    openNew(container)
    const before = offered(container)

    fireEvent.input(container.querySelector<HTMLInputElement>('.picker-filter')!, {
      target: { value: 'press' },
    })
    const after = offered(container)

    expect(after.length).toBeGreaterThan(0)
    expect(after.length).toBeLessThan(before.length)
    expect(after).toEqual(before.filter((name) => after.includes(name)))
  })
})

describe('the way to the exercise library', () => {
  it('opens from the module list and not from the builder', () => {
    const { container } = render(<Workout />)
    expect(container.querySelector('a[href="#/exercises"]')).not.toBeNull()

    openNew(container)
    expect(container.querySelector('a[href="#/exercises"]')).toBeNull()
  })
})

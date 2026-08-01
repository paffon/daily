import { fireEvent, render } from '@testing-library/preact'
import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import { fieldsFor, loadExercises, parseMark, setLine } from '../data/exercise'
import type { Exercise, Performed, SetRow } from '../data/exercise'
import { SetTable } from '../components/set_table'
import { ensureSeeded, readEntries } from '../data/store'
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

  it('opens with one row at same, so the first number has somewhere to go', () => {
    const { container } = render(<Table exercise={named('chest press')} />)
    expect(container.querySelectorAll('.set-row')).toHaveLength(1)
    expect(markOf(container, 0)).toBe('same')
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

  it('draws no graph, and says plainly what there is instead', () => {
    const { container } = render(<Workout />)
    expect(container.querySelector('svg, canvas')).toBeNull()
    expect(container.querySelector('.workout-rail-progress')?.textContent).toBe(
      'progress · 0 workouts, not enough to draw',
    )
  })
})

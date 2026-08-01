import { fireEvent, render } from '@testing-library/preact'
import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import { fieldsFor, loadExercises, parseMark, setLine } from '../data/exercise'
import type { Exercise, SetRow } from '../data/exercise'
import { SetTable } from '../components/set_table'
import { ensureSeeded } from '../data/store'

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
    addSet(container)
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
    addSet(loaded.container)
    expect(box(loaded.container, 'set 1 weight')).not.toBeNull()
    expect(box(loaded.container, 'set 1 distance')).toBeNull()

    const distance = render(<Table exercise={named('run · river path')} />)
    addSet(distance.container)
    expect(box(distance.container, 'set 1 distance')).not.toBeNull()
    expect(box(distance.container, 'set 1 duration')).not.toBeNull()
    expect(box(distance.container, 'set 1 weight')).toBeNull()
  })

  it('stands an optional field open rather than behind a reveal', () => {
    const { container } = render(<Table exercise={named('plank')} />)
    addSet(container)

    expect(box(container, 'set 1 weight')).not.toBeNull()
    expect(box(container, 'set 1 weight')?.className).toContain('set-input-optional')
    expect(box(container, 'set 1 duration')?.className).not.toContain('set-input-optional')
  })

  it('takes the mark off the number as it is typed', () => {
    const { container } = render(<Table exercise={named('chest press')} />)
    addSet(container)

    type(container, 'set 1 weight', '47.5+')
    expect(markOf(container, 0)).toBe('more')

    type(container, 'set 1 weight', '30--')
    expect(markOf(container, 0)).toBe('less')
  })

  it('leaves a chosen mark alone when the number beside it is corrected', () => {
    const { container } = render(<Table exercise={named('chest press')} />)
    addSet(container)

    fireEvent.click(container.querySelectorAll('.set-row [aria-pressed]')[2]!)
    expect(markOf(container, 0)).toBe('more')

    type(container, 'set 1 weight', '45')
    expect(markOf(container, 0)).toBe('more')
  })

  it('starts every row at same, which is what a blank mark means', () => {
    const { container } = render(<Table exercise={named('chest press')} />)
    addSet(container)
    expect(markOf(container, 0)).toBe('same')
  })
})

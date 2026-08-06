import { fireEvent, render } from '@testing-library/preact'
import { byStaleness, lastUsedAt, loadExercises } from '../data/exercise'
import { ensureSeeded, readEntries } from '../data/store'
import { Exercises } from './exercises'
import { Workout, workoutLine } from './workout'

beforeEach(() => {
  localStorage.clear()
  ensureSeeded()
})

const press = (container: Element, selector: string) =>
  fireEvent.click(container.querySelector<HTMLButtonElement>(selector)!)

const rowFor = (container: Element, name: string) =>
  [...container.querySelectorAll<HTMLButtonElement>('.exercises-row')].find(
    (row) => row.querySelector('.exercises-name')?.textContent === name,
  )!

const open = (container: Element, name: string) => fireEvent.click(rowFor(container, name))

const set = (container: Element, label: string, value: string) =>
  fireEvent.change(container.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!, {
    target: { value },
  })

const names = (container: Element) =>
  [...container.querySelectorAll('.exercises-name')].map((span) => span.textContent)

/** The demo workout, logged through the module so the entry is real. */
const logChestPress = () => {
  const screen = render(<Workout />)
  press(screen.container, '.workout-new')
  fireEvent.click(
    [...screen.container.querySelectorAll<HTMLButtonElement>('.picker-item')].find((item) =>
      item.textContent?.startsWith('chest press'),
    )!,
  )
  fireEvent.input(screen.container.querySelector<HTMLInputElement>('[aria-label="set 1 weight"]')!, {
    target: { value: '47.5' },
  })
  press(screen.container, '.workout-end')
  screen.unmount()
}

describe('the exercise library screen', () => {
  it('lists every exercise the library holds, in the order the picker offers', () => {
    const { container } = render(<Exercises />)
    const library = loadExercises().exercises

    expect(names(container)).toHaveLength(library.length)
    expect(names(container)).toEqual(byStaleness(library, new Map()).map((item) => item.name))
  })

  it('opens one row at a time, and closes the one that was open', () => {
    const { container } = render(<Exercises />)

    open(container, 'chest press')
    expect(container.querySelectorAll('.exercises-fields')).toHaveLength(1)

    open(container, 'pec deck')
    expect(container.querySelectorAll('.exercises-fields')).toHaveLength(1)
    expect(container.querySelector('[aria-label="name of pec deck"]')).not.toBeNull()

    open(container, 'pec deck')
    expect(container.querySelector('.exercises-fields')).toBeNull()
  })

  it('renames an exercise, and the rename reaches a workout logged before it', () => {
    logChestPress()

    const { container } = render(<Exercises />)
    open(container, 'chest press')
    set(container, 'name of chest press', 'chest press · blue')

    expect(loadExercises().exercises.some((item) => item.name === 'chest press · blue')).toBe(true)
    expect(workoutLine(readEntries('workout')[0]!)).toBe('chest press · blue')
  })

  it('refuses a blank name, and puts the old one back in the box', () => {
    const { container } = render(<Exercises />)
    open(container, 'chest press')
    set(container, 'name of chest press', '  ')

    expect(loadExercises().exercises.some((item) => item.name === 'chest press')).toBe(true)
    // refusing writes nothing, so nothing re-renders — the box has to be put
    // back by hand or it sits blank over a library that still holds the name
    expect(
      container.querySelector<HTMLInputElement>('[aria-label="name of chest press"]')?.value,
    ).toBe('chest press')
  })

  it('edits the kind and the body part', () => {
    const { container } = render(<Exercises />)
    open(container, 'chest press')

    set(container, 'kind of chest press', 'bodyweight')
    set(container, 'body part of chest press', 'upper chest')

    const held = loadExercises().exercises.find((item) => item.name === 'chest press')
    expect(held?.kind).toBe('bodyweight')
    expect(held?.body_part).toBe('upper chest')
  })

  it('offers every kind the library carries, and nothing written in source', () => {
    const { container } = render(<Exercises />)
    open(container, 'chest press')

    const kinds = [...container.querySelectorAll('[aria-label="kind of chest press"] option')].map(
      (option) => option.textContent,
    )
    expect(kinds).toEqual(Object.keys(loadExercises().kinds))
  })

  it('narrows on the filter without reordering what is left', () => {
    const { container } = render(<Exercises />)
    const before = names(container)

    fireEvent.input(container.querySelector<HTMLInputElement>('.exercises-filter')!, {
      target: { value: 'press' },
    })
    const after = names(container)

    expect(after.length).toBeGreaterThan(0)
    expect(after.length).toBeLessThan(before.length)
    expect(after).toEqual(before.filter((name) => after.includes(name)))
  })

  it('removes an unused exercise in two presses', () => {
    const { container } = render(<Exercises />)
    open(container, 'pec deck')

    press(container, '.exercises-remove')
    expect(container.querySelector('.exercises-remove')?.textContent).toBe('press again')
    expect(loadExercises().exercises.some((item) => item.name === 'pec deck')).toBe(true)

    press(container, '.exercises-remove')
    expect(loadExercises().exercises.some((item) => item.name === 'pec deck')).toBe(false)
    expect(names(container)).not.toContain('pec deck')
  })

  it('refuses a used exercise, naming the workout as a link', () => {
    logChestPress()
    const id = readEntries('workout')[0]!.id

    const { container } = render(<Exercises />)
    open(container, 'chest press')
    press(container, '.exercises-remove')

    expect(container.querySelector('.refused')).not.toBeNull()
    expect(container.querySelector('.refused-link')?.getAttribute('href')).toBe(`#/entry/${id}`)
    // it did not arm, so a second press cannot get through by accident
    expect(container.querySelector('.exercises-remove')?.textContent).toBe(
      'remove from the library',
    )
    expect(loadExercises().exercises.some((item) => item.name === 'chest press')).toBe(true)
  })

  it('renames from the refusal instead, which is what §7 offers', () => {
    logChestPress()

    const { container } = render(<Exercises />)
    open(container, 'chest press')
    press(container, '.exercises-remove')
    set(container, 'rename chest press', 'chest press · blue')

    expect(workoutLine(readEntries('workout')[0]!)).toBe('chest press · blue')
  })

  it('offers no way to make a new one, and says where one is made', () => {
    const { container } = render(<Exercises />)
    expect(container.querySelector('.picker-new')).toBeNull()
    expect(container.textContent ?? '').not.toContain('+ new')
    expect(container.querySelector('.exercises-note')?.textContent).toContain(
      'made where it is logged',
    )
  })

  it('goes back to the workout module rather than to home', () => {
    const { container } = render(<Exercises />)
    expect(container.querySelector('.exercises-back')?.getAttribute('href')).toBe('#/workout')
  })

  it('orders by staleness, so what was just done sinks', () => {
    logChestPress()

    const { container } = render(<Exercises />)
    expect(names(container).at(-1)).toBe('chest press')
    expect(lastUsedAt(readEntries('workout')).size).toBe(1)
  })
})

import { fireEvent, render } from '@testing-library/preact'
import {
  byStaleness,
  fieldsFor,
  lastUsedAt,
  loadExercises,
  performedIn,
  setLine,
} from '../data/exercise'
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

/** A 45-second plank, logged through the module so the entry is real — the
 *  history a unit change has to answer to. */
const logPlank = () => {
  const screen = render(<Workout />)
  press(screen.container, '.workout-new')
  fireEvent.click(
    [...screen.container.querySelectorAll<HTMLButtonElement>('.picker-item')].find(
      (item) => item.textContent?.startsWith('plank'),
    )!,
  )
  fireEvent.input(
    screen.container.querySelector<HTMLInputElement>('[aria-label="set 1 duration"]')!,
    { target: { value: '45' } },
  )
  press(screen.container, '.workout-end')
  screen.unmount()
}

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

/** §8.1's editable field list, on the slow path: the chips say what a set of
 *  this exercise records, the kind select is the preset beside them, and a
 *  list that lands on a kind's is recorded as the kind. */
describe('an exercise’s field list on the library screen', () => {
  const toggle = (container: Element, label: string) =>
    fireEvent.click(
      container.querySelector<HTMLButtonElement>(`.set-fields-choice[aria-label="${label}"]`)!,
    )

  /** The free-typed row: a name, a unit, and `+ field` — how a unit already on
   *  the exercise is changed, and how a field no kind declares is added at all
   *  (2026-08-11). */
  const addField = (container: Element, name: string, unit: string) => {
    fireEvent.input(container.querySelector<HTMLInputElement>('[aria-label="new field name"]')!, {
      target: { value: name },
    })
    fireEvent.input(container.querySelector<HTMLInputElement>('[aria-label="new field unit"]')!, {
      target: { value: unit },
    })
    fireEvent.click(container.querySelector<HTMLButtonElement>('.set-fields-add-press')!)
  }

  const held = (name: string) => loadExercises().exercises.find((item) => item.name === name)

  const pressed = (container: Element) =>
    [...container.querySelectorAll('.set-fields-choice[aria-pressed="true"]')].map((chip) =>
      chip.getAttribute('aria-label'),
    )

  it('shows the kind’s list pressed, for an exercise that follows its kind', () => {
    const { container } = render(<Exercises />)
    open(container, 'chest press')

    expect(pressed(container)).toEqual(['weight kg', 'reps'])
  })

  it('writes a toggled list to the library as the exercise’s own', () => {
    const { container } = render(<Exercises />)
    open(container, 'chest press')

    toggle(container, 'duration s')

    expect(held('chest press')?.fields?.map((field) => `${field.name} ${field.unit}`.trim())).toEqual(
      ['weight kg', 'reps', 'duration s'],
    )
  })

  it('offers one chip per name, never two for the same field in different units', () => {
    const { container } = render(<Exercises />)
    /* plank follows `hold` — duration in seconds, weight optional beside it */
    open(container, 'plank')

    expect(pressed(container).filter((label) => label?.startsWith('duration'))).toEqual([
      'duration s',
    ])
    expect(container.querySelector('[aria-label="duration min"]')).toBeNull()
  })

  it('changes a chosen field’s unit through the typed row, in place rather than at the end', () => {
    const { container } = render(<Exercises />)
    open(container, 'plank')

    addField(container, 'duration', 'min')

    // it takes the seconds column's place, rather than joining at the end: a
    // set row keys its values by name, so two durations would be one box
    expect(held('plank')?.fields?.map((field) => `${field.name} ${field.unit}`.trim())).toEqual([
      'duration min',
      'weight kg',
    ])
    /* the chip row is offered in the palette's own order — weight before
       duration — which is unrelated to the order the exercise's own list
       stores them in, checked above */
    expect(pressed(container)).toEqual(['weight kg', 'duration min'])
  })

  it('adds a field no kind declares, for a one-off parameter worth comparing over time', () => {
    const { container } = render(<Exercises />)
    /* the exact case DESIGN.md §8.1 used to name as a comment's, never a
       field's — how far the feet are raised on a push-up */
    open(container, 'push ups')

    addField(container, 'raise', 'cm')

    expect(held('push ups')?.fields?.map((field) => `${field.name} ${field.unit}`.trim())).toEqual([
      'reps',
      'weight kg',
      'raise cm',
    ])
    expect(pressed(container)).toContain('raise cm')
  })

  it('normalises a typed name, so one field never becomes two that read alike', () => {
    const { container } = render(<Exercises />)
    open(container, 'push ups')

    addField(container, 'raise', 'cm')
    /* the same field in three spellings — a set row keys its values by the
       name, so `reps` beside `REPS` would be two boxes for one number */
    addField(container, 'Raise', 'cm')
    addField(container, 'REPS', '')

    expect(held('push ups')?.fields?.map((field) => `${field.name} ${field.unit}`.trim())).toEqual([
      'reps',
      'weight kg',
      'raise cm',
    ])
  })

  it('offers no press until a name is typed, so a nameless field cannot be made', () => {
    const { container } = render(<Exercises />)
    open(container, 'push ups')

    fireEvent.input(container.querySelector<HTMLInputElement>('[aria-label="new field unit"]')!, {
      target: { value: 'cm' },
    })
    const addPress = container.querySelector<HTMLButtonElement>('.set-fields-add-press')!
    expect(addPress.disabled).toBe(true)

    /* and whitespace is not a name either */
    fireEvent.input(container.querySelector<HTMLInputElement>('[aria-label="new field name"]')!, {
      target: { value: '   ' },
    })
    expect(addPress.disabled).toBe(true)
    expect(held('push ups')?.fields).toBeUndefined()
  })

  it('gives a custom unit back when a chip is switched off and on again', () => {
    const { container } = render(<Exercises />)
    /* the rowing machine counts metres and every kind counts kilometres, so a
       round trip through the chip used to hand back km and make its history
       1000× what it said */
    open(container, 'rowing machine')

    toggle(container, 'distance m')
    expect(pressed(container)).toEqual(['duration min', 'level'])

    toggle(container, 'distance km')

    expect(pressed(container)).toContain('distance m')
    expect(held('rowing machine')?.fields?.map((field) => `${field.name} ${field.unit}`.trim()))
      .toContain('distance m')
  })

  it('offers a field the exercise records that no kind declares, already pressed', () => {
    const { container } = render(<Exercises />)
    /* the seeded rowing machine counts metres, and every kind measures distance
       in km — a row built from the kinds alone would press no chip for a column
       the set table draws, and picking distance off the palette would silently
       rewrite the unit back to km */
    open(container, 'rowing machine')

    expect(pressed(container)).toEqual(['duration min', 'distance m', 'level'])
    /* one chip for the name, not a second one for the km a row lands on
       elsewhere — the unit is never what tells two offers apart */
    expect(container.querySelector('[aria-label="distance km"]')).toBeNull()
  })

  it('says an overridden kind is its own fields, and a kind picked there adopts the kind', () => {
    const { container } = render(<Exercises />)
    /* farmer carry ships with a list of its own — §8.1's "the one that needs
       both", in the seed */
    open(container, 'farmer carry')

    const select = container.querySelector<HTMLSelectElement>('[aria-label="kind of farmer carry"]')!
    expect(select.value).toBe('')
    expect(select.querySelector('option[value=""]')?.textContent).toBe('its own fields')

    set(container, 'kind of farmer carry', 'hold')

    expect(held('farmer carry')?.kind).toBe('hold')
    expect(held('farmer carry')?.fields).toBeUndefined()
  })
})

/** A unit is resolved at read time, so changing one changes what every set
 *  already logged says — the number keeps its value and stops meaning what it
 *  meant. The change is allowed; it names what it restates first, the way a
 *  refused delete names what depends on it (§7). */
describe('changing a unit an exercise’s history already depends on', () => {
  const addField = (container: Element, name: string, unit: string) => {
    fireEvent.input(container.querySelector<HTMLInputElement>('[aria-label="new field name"]')!, {
      target: { value: name },
    })
    fireEvent.input(container.querySelector<HTMLInputElement>('[aria-label="new field unit"]')!, {
      target: { value: unit },
    })
    fireEvent.click(container.querySelector<HTMLButtonElement>('.set-fields-add-press')!)
  }

  const held = () => loadExercises().exercises.find((item) => item.name === 'plank')!

  /** What the workout already logged now reads as, resolved the way every
   *  screen and the report resolve it. */
  const logged = () => {
    const done = performedIn(readEntries('workout')[0]!).find((p) => p.exercise_id === 'plank')!
    return setLine(done.sets[0]!, fieldsFor(held()))
  }

  it('changes nothing on the press that asks, and names the workout it would restate', () => {
    logPlank()
    const { container } = render(<Exercises />)
    open(container, 'plank')
    expect(logged()).toBe('45 s')

    addField(container, 'duration', 'min')

    expect(container.querySelector('.set-fields-restate')).not.toBeNull()
    expect(container.querySelector('.set-fields-restate-line')?.textContent).toContain(
      'starts reading min rather than s',
    )
    /* the workout is named, and as a link — the way out is through it */
    expect(container.querySelectorAll('.set-fields-restate-link')).toHaveLength(1)
    /* and nothing is written yet */
    expect(held().fields).toBeUndefined()
    expect(logged()).toBe('45 s')
  })

  it('leaves it alone, and puts the panel away', () => {
    logPlank()
    const { container } = render(<Exercises />)
    open(container, 'plank')

    addField(container, 'duration', 'min')
    fireEvent.click(container.querySelector<HTMLButtonElement>('.set-fields-restate-stop')!)

    expect(container.querySelector('.set-fields-restate')).toBeNull()
    expect(held().fields).toBeUndefined()
    expect(logged()).toBe('45 s')
  })

  it('goes through on the second press, and the set logged before it reads the new unit', () => {
    logPlank()
    const { container } = render(<Exercises />)
    open(container, 'plank')

    addField(container, 'duration', 'min')
    fireEvent.click(container.querySelector<HTMLButtonElement>('.set-fields-restate-go')!)

    expect(held().fields?.map((field) => `${field.name} ${field.unit}`.trim())).toEqual([
      'duration min',
      'weight kg',
    ])
    /* the guard's whole reason, pinned: the number is untouched and the
       sentence around it is not */
    expect(logged()).toBe('45 min')
  })

  it('asks nothing when no workout has logged the exercise yet', () => {
    const { container } = render(<Exercises />)
    open(container, 'plank')

    addField(container, 'duration', 'min')

    expect(container.querySelector('.set-fields-restate')).toBeNull()
    expect(held().fields?.map((field) => `${field.name} ${field.unit}`.trim())).toEqual([
      'duration min',
      'weight kg',
    ])
  })

  it('asks nothing when the field is new rather than re-united', () => {
    logPlank()
    const { container } = render(<Exercises />)
    open(container, 'plank')

    /* nothing was ever logged under `raise`, so there is nothing to restate */
    addField(container, 'raise', 'cm')

    expect(container.querySelector('.set-fields-restate')).toBeNull()
    expect(held().fields?.map((field) => `${field.name} ${field.unit}`.trim())).toEqual([
      'duration s',
      'weight kg',
      'raise cm',
    ])
    expect(logged()).toBe('45 s')
  })
})

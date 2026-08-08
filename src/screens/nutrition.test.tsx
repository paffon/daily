import { fireEvent, render } from '@testing-library/preact'
import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import { AmountStepper } from '../components/amount_stepper'
import { LevelControl } from '../components/level_control'
import { loadFoods, loadLevels } from '../data/food'
import type { Food } from '../data/food'
import { newEntry } from '../data/entry'
import { ensureSeeded, getEntry, putEntry, readEntries } from '../data/store'
import { EditEntry } from './edit_entry'
import { Nutrition, nutritionLineFor } from './nutrition'

const named = (name: string): Food => {
  const food = loadFoods().foods.find((item) => item.name === name)
  if (food === undefined) throw new Error(`no seeded food named ${name}`)
  return food
}

beforeEach(() => {
  localStorage.clear()
  ensureSeeded()
})

describe('the amount stepper', () => {
  function Stepper({ unit = 'slice', step = 1 }: { unit?: string; step?: number }): VNode {
    const [amount, setAmount] = useState(1)
    return (
      <>
        <AmountStepper value={amount} unit={unit} step={step} onChange={setAmount} label="amount" />
        <output>{amount}</output>
      </>
    )
  }

  const box = (container: Element) =>
    container.querySelector<HTMLInputElement>('[aria-label="amount"]')!

  const press = (container: Element, label: string) =>
    fireEvent.click(container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!)

  it('carries the food’s own unit beside the number', () => {
    const { container } = render(<Stepper unit="cup" />)
    expect(container.querySelector('.stepper-unit')?.textContent).toBe('cup')
  })

  it('takes a fractional amount typed straight into it, dot and all', () => {
    const { container } = render(<Stepper />)

    fireEvent.input(box(container), { target: { value: '3.' } })
    expect(box(container).value).toBe('3.')

    fireEvent.input(box(container), { target: { value: '3.5' } })
    expect(container.querySelector('output')?.textContent).toBe('3.5')
  })

  it('steps by what it was given rather than by a number of its own', () => {
    const { container } = render(<Stepper step={50} />)
    press(container, 'amount up')
    expect(container.querySelector('output')?.textContent).toBe('51')
    expect(box(container).value).toBe('51')
  })

  it('stops at nothing rather than stepping into a negative amount', () => {
    const { container } = render(<Stepper />)
    press(container, 'amount down')
    press(container, 'amount down')
    expect(container.querySelector('output')?.textContent).toBe('0')
  })

  it('leaves the amount alone while the box is unreadable', () => {
    const { container } = render(<Stepper />)
    fireEvent.input(box(container), { target: { value: '' } })
    expect(container.querySelector('output')?.textContent).toBe('1')
  })

  it('reads a typed negative as unreadable, the way the presses refuse one', () => {
    const { container } = render(<Stepper />)
    fireEvent.input(box(container), { target: { value: '-5' } })
    expect(container.querySelector('output')?.textContent).toBe('1')
  })
})

describe('the level control', () => {
  const scale = ['lean', 'normal', 'loaded']

  const drawn = () =>
    render(<LevelControl scale={scale} value="normal" onChange={() => {}} label="level" />).container

  it('draws one button per level and nothing else', () => {
    // the per-level prose it used to carry is one note on the food since
    // 2026-08-08, so every module wears the identical control
    expect(drawn().querySelectorAll('.segmented button')).toHaveLength(3)
    expect(drawn().querySelector('.level-examples')).toBeNull()
  })

  it('wears ink-select, because a level is not the live one', () => {
    const control = drawn().querySelector('.segmented')!
    expect(control.className).toContain('segmented-ink-select')
    expect(control.className).not.toContain('segmented-steel')
  })

  it('reports the level pressed', () => {
    const picked: string[] = []
    const { container } = render(
      <LevelControl scale={scale} value="normal" onChange={(l) => picked.push(l)} label="level" />,
    )
    fireEvent.click(container.querySelectorAll('.segmented button')[2]!)
    expect(picked).toEqual(['loaded'])
  })
})

describe('the nutrition screen', () => {
  const pick = (container: Element, name: string) =>
    fireEvent.click(
      [...container.querySelectorAll<HTMLButtonElement>('.picker-item')].find(
        (item) => item.textContent?.startsWith(name),
      )!,
    )

  const chooseLevel = (container: Element, level: string) =>
    fireEvent.click(
      [...container.querySelectorAll<HTMLButtonElement>('.level .segmented button')].find((button) =>
        button.textContent?.includes(level),
      )!,
    )

  const typeAmount = (container: Element, value: string) =>
    fireEvent.input(container.querySelector<HTMLInputElement>('[aria-label="amount"]')!, {
      target: { value },
    })

  const typeComment = (container: Element, value: string) =>
    fireEvent.input(container.querySelector<HTMLInputElement>('[aria-label="comment"]')!, {
      target: { value },
    })

  /** The food's own note, which is the library's — the box beside it labelled
   *  `comment` is this food in this meal, and the two are deliberately not the
   *  same field. */
  const note = (container: Element) =>
    container.querySelector<HTMLInputElement>('[aria-label="about this food"]')!

  const typeNote = (container: Element, value: string) =>
    fireEvent.change(note(container), { target: { value } })

  const endMeal = (container: Element) =>
    fireEvent.click(container.querySelector<HTMLButtonElement>('.nutrition-log')!)

  const addFood = (container: Element) =>
    fireEvent.click(container.querySelector<HTMLButtonElement>('.nutrition-rail-add')!)

  const railLines = (container: Element) =>
    [...container.querySelectorAll('.nutrition-rail-what')].map((row) => row.textContent)

  /** The entry's own timestamp, moved the way the strip moves it — logging the
   *  apple from an hour ago is the normal case here. */
  const setTime = (container: Element, time: string) => {
    // the two boxes stay open once opened, so this only presses when collapsed
    const collapsed = container.querySelector<HTMLButtonElement>('.field-stamp-box')
    if (collapsed !== null) fireEvent.click(collapsed)
    fireEvent.input(container.querySelector<HTMLInputElement>('.field-stamp-edit input[type="time"]')!, {
      target: { value: time },
    })
  }

  /** The module lands on the list; the builder is behind `+ new meal`. */
  const openNew = (container: Element) =>
    fireEvent.click(container.querySelector<HTMLButtonElement>('.nutrition-new')!)

  const logPizza = (container: Element) => {
    openNew(container)
    pick(container, 'pizza')
    typeAmount(container, '2')
    chooseLevel(container, 'loaded')
    endMeal(container)
  }

  it('writes a meal of one holding the food, the amount and the level', () => {
    const { container } = render(<Nutrition />)
    logPizza(container)

    const [entry] = readEntries('nutrition')
    expect(entry?.payload).toEqual({ foods: [{ food_id: 'pizza', amount: 2, level: 'loaded' }] })
  })

  it('holds several foods in one entry, ended the way a workout is', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    pick(container, 'coffee')
    addFood(container)
    pick(container, 'apple')
    endMeal(container)

    expect(readEntries('nutrition')).toHaveLength(1)
    expect(readEntries('nutrition')[0]?.payload['foods']).toEqual([
      { food_id: 'coffee', amount: 1, level: 'normal' },
      { food_id: 'apple', amount: 1, level: 'normal' },
    ])
    // the rail names the foods; the amounts are the one tap the row already is
    expect(railLines(container)).toEqual(['coffee, apple'])
  })

  it('edits any food of the meal being built, picked back off the rail', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    pick(container, 'pizza')
    typeAmount(container, '2')
    addFood(container)
    pick(container, 'coffee')

    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.nutrition-meal-food')[0]!)
    typeAmount(container, '3')
    endMeal(container)

    expect(readEntries('nutrition')[0]?.payload['foods']).toEqual([
      { food_id: 'pizza', amount: 3, level: 'normal' },
      { food_id: 'coffee', amount: 1, level: 'normal' },
    ])
  })

  it('drops a mis-picked food before the meal is written', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    pick(container, 'pizza')
    addFood(container)
    pick(container, 'coffee')

    fireEvent.click(container.querySelector<HTMLButtonElement>('[aria-label="remove pizza"]')!)
    endMeal(container)

    expect(readEntries('nutrition')[0]?.payload['foods']).toEqual([
      { food_id: 'coffee', amount: 1, level: 'normal' },
    ])
  })

  it('shows the food’s own note, and no numbers anywhere', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    pick(container, 'pizza')

    expect(note(container).value).toBe(
      'lean is thin crust with vegetables; loaded is thick crust, meat and extra cheese',
    )
    // the numbers went with the matrix on 2026-08-08 — the level and this
    // sentence are the whole of what says how big the plate was
    expect(container.querySelector('.nutrition-numbers')).toBeNull()
    expect(container.querySelector('.nutrition-facts-open')).toBeNull()
  })

  it('offers the box empty for a food nobody has described', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    pick(container, 'water')

    expect(note(container).value).toBe('')
  })

  it('writes a just-made food’s note without leaving the meal', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    fireEvent.input(container.querySelector<HTMLInputElement>('.picker-filter')!, {
      target: { value: 'malabi' },
    })
    fireEvent.click(container.querySelector<HTMLButtonElement>('.picker-new')!)

    // the food is invented here, so this is where anybody knows what it is
    typeNote(container, 'semolina pudding; loaded is the big one with all the syrup')

    expect(loadFoods().foods.find((food) => food.name === 'malabi')?.notes).toBe(
      'semolina pudding; loaded is the big one with all the syrup',
    )
    // the meal was never left, and it still saves
    endMeal(container)
    expect(railLines(container)).toEqual(['malabi · 1 · normal'])
  })

  it('writes the note onto the library, so every meal that holds the food reads it', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    pick(container, 'pizza')

    typeNote(container, 'the good bakery does a thinner one')
    expect(loadFoods().foods.find((food) => food.id === 'pizza')?.notes).toBe(
      'the good bakery does a thinner one',
    )
    // nothing of it lands on the entry — the note belongs to the food
    endMeal(container)
    expect(readEntries('nutrition')[0]?.payload['foods']).toEqual([
      { food_id: 'pizza', amount: 1, level: 'normal' },
    ])
  })

  it('drops the note outright once the box is emptied', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    pick(container, 'pizza')

    typeNote(container, '   ')
    // the key goes rather than a blank string staying behind: a food nobody
    // has described and one whose note was cleared are the same food
    expect('notes' in loadFoods().foods.find((food) => food.id === 'pizza')!).toBe(false)
  })

  it('carries the food’s own unit into a meal of one’s line, pluralised past one', () => {
    const { container } = render(<Nutrition />)
    logPizza(container)
    openNew(container)
    pick(container, 'coffee')
    endMeal(container)
    openNew(container)
    pick(container, 'apple')
    endMeal(container)

    // an apple counts as itself, so its line carries no unit at all
    expect(railLines(container)).toEqual(
      expect.arrayContaining(['pizza · 2 slices · loaded', 'coffee · 1 cup · normal', 'apple · 1 · normal']),
    )
  })

  it('opens a food at its own default level', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    pick(container, 'apple')
    expect(container.querySelector('.level [aria-pressed="true"]')?.textContent).toContain('normal')
  })

  it('scopes Previous to the food rather than to the meal or the day', () => {
    const first = render(<Nutrition />)
    logPizza(first.container)
    first.unmount()

    const { container } = render(<Nutrition />)
    openNew(container)
    pick(container, 'pizza')
    expect(container.querySelector('.field-previous')?.textContent).toContain('2 slices · loaded')

    addFood(container)
    pick(container, 'coffee')
    expect(container.querySelector('.field-previous')?.textContent).toContain('nothing recorded yet')
  })

  it('writes a comment on the food it was typed against', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    pick(container, 'pizza')
    typeComment(container, 'the good bakery, half of it left')
    addFood(container)
    pick(container, 'coffee')
    endMeal(container)

    expect(readEntries('nutrition')[0]?.payload['foods']).toEqual([
      { food_id: 'pizza', amount: 1, level: 'normal', comment: 'the good bakery, half of it left' },
      // nothing was said about the coffee, so it carries no key at all
      { food_id: 'coffee', amount: 1, level: 'normal' },
    ])
  })

  it('hands the comment back with Previous, beside the numbers', () => {
    const first = render(<Nutrition />)
    openNew(first.container)
    pick(first.container, 'pizza')
    typeComment(first.container, 'the good bakery')
    endMeal(first.container)
    first.unmount()

    const { container } = render(<Nutrition />)
    openNew(container)
    pick(container, 'pizza')
    expect(container.querySelector('.field-previous-comment')?.textContent).toBe('the good bakery')
    // and the box for this meal opens empty rather than repeating last time's
    expect(container.querySelector<HTMLInputElement>('[aria-label="comment"]')?.value).toBe('')
  })

  it('keeps each food’s comment to itself within one meal', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    pick(container, 'pizza')
    typeComment(container, 'the good bakery')
    addFood(container)
    pick(container, 'coffee')

    expect(container.querySelector<HTMLInputElement>('[aria-label="comment"]')?.value).toBe('')

    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('.nutrition-meal-food')[0]!)
    expect(container.querySelector<HTMLInputElement>('[aria-label="comment"]')?.value).toBe(
      'the good bakery',
    )
  })

  it('makes a library food out of what was typed to find it', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    fireEvent.input(container.querySelector<HTMLInputElement>('.picker-filter')!, {
      target: { value: 'malabi' },
    })
    fireEvent.click(container.querySelector<HTMLButtonElement>('.picker-new')!)

    // the heading is the name box, so what it holds is a value and not text
    expect(container.querySelector<HTMLInputElement>('.nutrition-name')?.value).toBe('malabi')
    expect(loadFoods().foods.some((food) => food.name === 'malabi')).toBe(true)
    // and it opens at the level config gives a new food, rather than at the
    // blank a stale library copy used to hand back
    expect(container.querySelector('.level [aria-pressed="true"]')?.textContent).toContain('normal')
  })

  it('lands back on the list once the meal is ended, with the meal in it', () => {
    const { container } = render(<Nutrition />)
    logPizza(container)
    expect(container.querySelector('.picker')).toBeNull()
    expect(container.querySelector('.nutrition-new')?.textContent).toBe('+ new meal')
    expect(railLines(container)).toEqual(['pizza · 2 slices · loaded'])
  })

  it('keeps three meals in one day as a flat list with no totals', () => {
    const { container } = render(<Nutrition />)

    openNew(container)
    setTime(container, '09:20')
    pick(container, 'coffee')
    endMeal(container)

    openNew(container)
    setTime(container, '16:10')
    pick(container, 'apple')
    endMeal(container)

    openNew(container)
    setTime(container, '13:30')
    pick(container, 'pizza')
    typeAmount(container, '2')
    chooseLevel(container, 'loaded')
    endMeal(container)

    // newest first, and nothing that adds the three together
    expect(railLines(container)).toEqual([
      'apple · 1 · normal',
      'pizza · 2 slices · loaded',
      'coffee · 1 cup · normal',
    ])
    expect([...container.querySelectorAll('.nutrition-rail-label')].map((h) => h.textContent)).toEqual(
      ['today'],
    )
    expect(container.textContent).not.toMatch(/total/i)
    expect(container.querySelector('.nutrition-new')?.textContent).toBe('+ new meal')
  })

  it('shows a meal logged for another day rather than swallowing it', () => {
    const { container } = render(<Nutrition />)

    // logging yesterday's dinner today is one press on the strip. If the list
    // only ever shows the wall-clock day the meal is saved and shows nowhere,
    // which reads as a failed save, and the obvious next press logs it twice
    openNew(container)
    const collapsed = container.querySelector<HTMLButtonElement>('.field-stamp-box')
    if (collapsed !== null) fireEvent.click(collapsed)
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    fireEvent.input(container.querySelector<HTMLInputElement>('.field-stamp-edit input[type="date"]')!, {
      target: { value: yesterday },
    })

    pick(container, 'pizza')
    typeAmount(container, '2')
    chooseLevel(container, 'loaded')
    endMeal(container)

    expect(readEntries('nutrition')).toHaveLength(1)
    expect(railLines(container)).toEqual(['pizza · 2 slices · loaded'])
    expect([...container.querySelectorAll('.nutrition-rail-label')].map((h) => h.textContent)).toEqual(
      ['earlier'],
    )
    // and the row says which day, since that is the whole question about it
    expect(container.querySelector('.nutrition-rail-when')?.textContent).toMatch(/\d/)
  })

  it('keeps the meal untyped — nothing here knows what breakfast is', () => {
    const { container } = render(<Nutrition />)
    logPizza(container)
    expect(container.textContent).toMatch(/meal/)
    expect(container.textContent).not.toMatch(/breakfast|lunch|dinner/i)
  })

  it('draws no graph, and says plainly what there is instead', () => {
    const { container } = render(<Nutrition />)
    expect(container.querySelector('svg, canvas')).toBeNull()
    expect(container.querySelector('.nutrition-rail-progress')?.textContent).toBe(
      'progress · 0 meals, not enough to draw',
    )
  })

  it('names the unit of a food made mid-meal, and the meal reads in it', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    fireEvent.input(container.querySelector<HTMLInputElement>('.picker-filter')!, {
      target: { value: 'malabi' },
    })
    fireEvent.click(container.querySelector<HTMLButtonElement>('.picker-new')!)

    // a food made here opens with the blank unit config gives it, and this is
    // where that is answered — otherwise it keeps the blank forever
    expect(container.querySelector<HTMLInputElement>('[aria-label="unit"]')?.value).toBe('')
    fireEvent.change(container.querySelector<HTMLInputElement>('[aria-label="unit"]')!, {
      target: { value: 'cup' },
    })
    endMeal(container)

    expect(loadFoods().foods.find((food) => food.name === 'malabi')?.unit).toBe('cup')
    expect(railLines(container)).toEqual(['malabi · 1 cup · normal'])
  })

  it('renames a food from the meal it is in, and reaches every meal before it', () => {
    const first = render(<Nutrition />)
    logPizza(first.container)
    first.unmount()

    const { container } = render(<Nutrition />)
    openNew(container)
    pick(container, 'pizza')
    fireEvent.change(container.querySelector<HTMLInputElement>('[aria-label="name"]')!, {
      target: { value: 'pizza · the good bakery' },
    })
    endMeal(container)

    // an entry stores the id and resolves the name at read time, so the meal
    // logged before the rename says the new name too
    expect(railLines(container)).toEqual(
      expect.arrayContaining([
        'pizza · the good bakery · 1 slice · normal',
        'pizza · the good bakery · 2 slices · loaded',
      ]),
    )
  })

  it('refuses a blank name here too, and puts the old one back', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    pick(container, 'pizza')
    fireEvent.change(container.querySelector<HTMLInputElement>('[aria-label="name"]')!, {
      target: { value: '  ' },
    })

    expect(loadFoods().foods.some((food) => food.name === 'pizza')).toBe(true)
    expect(container.querySelector<HTMLInputElement>('[aria-label="name"]')?.value).toBe('pizza')
  })

  it('arms a library delete on the first press and deletes on the second', () => {
    const { container } = render(<Nutrition />)
    openNew(container)
    const del = () => container.querySelector<HTMLButtonElement>('[aria-label="delete pizza"]')!

    fireEvent.click(del())
    expect(del().textContent).toBe('press again')
    expect(loadFoods().foods.some((food) => food.id === 'pizza')).toBe(true)

    fireEvent.click(del())
    expect(loadFoods().foods.some((food) => food.id === 'pizza')).toBe(false)
    expect(
      [...container.querySelectorAll('.picker-item')].some((item) =>
        item.textContent?.startsWith('pizza'),
      ),
    ).toBe(false)
  })

  it('refuses that delete while a meal still holds the food (§7)', () => {
    const first = render(<Nutrition />)
    logPizza(first.container)
    first.unmount()
    const id = readEntries('nutrition')[0]!.id

    const { container } = render(<Nutrition />)
    openNew(container)
    fireEvent.click(container.querySelector<HTMLButtonElement>('[aria-label="delete pizza"]')!)

    expect(container.querySelector('.refused-line')?.textContent).toBe('in a meal, still')
    expect(container.querySelector('.refused-link')?.getAttribute('href')).toBe(`#/entry/${id}`)
    // it never armed, so a second press cannot get through by accident
    expect(container.querySelector('[aria-label="delete pizza"]')?.textContent).toBe('×')
    expect(loadFoods().foods.some((food) => food.id === 'pizza')).toBe(true)

    // and the rename it offers instead reaches the meal holding it
    fireEvent.change(container.querySelector<HTMLInputElement>('[aria-label="rename pizza"]')!, {
      target: { value: 'pizza · frozen' },
    })
    expect(nutritionLineFor(readEntries('nutrition')[0]!)).toContain('pizza · frozen')
  })

  it('opens the food library from the list rather than from home', () => {
    const { container } = render(<Nutrition />)
    expect(container.querySelector('.nutrition-library')?.getAttribute('href')).toBe('#/foods')
  })
})

describe('editing a past meal', () => {
  const logged = () => {
    const first = render(<Nutrition />)
    fireEvent.click(first.container.querySelector<HTMLButtonElement>('.nutrition-new')!)
    fireEvent.click(
      [...first.container.querySelectorAll<HTMLButtonElement>('.picker-item')].find((item) =>
        item.textContent?.startsWith('pizza'),
      )!,
    )
    fireEvent.input(first.container.querySelector<HTMLInputElement>('[aria-label="amount"]')!, {
      target: { value: '2' },
    })
    fireEvent.click(
      [...first.container.querySelectorAll<HTMLButtonElement>('.level .segmented button')].find(
        (button) => button.textContent?.includes('loaded'),
      )!,
    )
    fireEvent.click(first.container.querySelector<HTMLButtonElement>('.nutrition-log')!)
    first.unmount()
    return readEntries('nutrition')[0]!.id
  }

  it('opens it with the fields it was logged with', () => {
    const { container } = render(<EditEntry id={logged()} />)

    expect(container.querySelector('.nutrition-edit-name')?.textContent).toBe('pizza')
    expect(container.querySelector<HTMLInputElement>('[aria-label="amount"]')?.value).toBe('2')
    expect(container.querySelector('.stepper-unit')?.textContent).toBe('slices')
    expect(container.querySelector('.level [aria-pressed="true"]')?.textContent).toContain('loaded')
  })

  it('corrects a comment on a past meal, the way it corrects a number', () => {
    const id = logged()
    const { container } = render(<EditEntry id={id} />)

    fireEvent.input(container.querySelector<HTMLInputElement>('[aria-label="comment"]')!, {
      target: { value: 'reheated' },
    })
    fireEvent.click(container.querySelector<HTMLButtonElement>('.edit-save')!)

    expect(getEntry(id)?.payload).toEqual({
      foods: [{ food_id: 'pizza', amount: 2, level: 'loaded', comment: 'reheated' }],
    })
  })

  it('writes a corrected amount and level back through the store', () => {
    const id = logged()
    const { container } = render(<EditEntry id={id} />)

    fireEvent.input(container.querySelector<HTMLInputElement>('[aria-label="amount"]')!, {
      target: { value: '1.5' },
    })
    fireEvent.click(
      [...container.querySelectorAll<HTMLButtonElement>('.level .segmented button')].find((button) =>
        button.textContent?.includes('lean'),
      )!,
    )
    fireEvent.click(container.querySelector<HTMLButtonElement>('.edit-save')!)

    expect(getEntry(id)?.payload).toEqual({ foods: [{ food_id: 'pizza', amount: 1.5, level: 'lean' }] })
    expect(getEntry(id)?.rev).toBe(2)
  })

  it('keeps an entry from before meals flat rather than migrating it', () => {
    // every entry written before 2026-08-06 holds the single-food shape, and
    // the log is never migrated — it has to open and correct the way it was
    // written
    const flat = newEntry('nutrition', { food_id: 'pizza', amount: 2, level: 'loaded' })
    putEntry(flat)
    const { container } = render(<EditEntry id={flat.id} />)

    expect(container.querySelector('.nutrition-edit-name')?.textContent).toBe('pizza')
    fireEvent.input(container.querySelector<HTMLInputElement>('[aria-label="amount"]')!, {
      target: { value: '1.5' },
    })
    fireEvent.click(container.querySelector<HTMLButtonElement>('.edit-save')!)

    expect(getEntry(flat.id)?.payload).toEqual({ food_id: 'pizza', amount: 1.5, level: 'loaded' })
  })
})

describe('correcting a past meal from the module list', () => {
  it('opens a listed meal in the builder adding uses, and writes the correction back', () => {
    const first = render(<Nutrition />)
    fireEvent.click(first.container.querySelector<HTMLButtonElement>('.nutrition-new')!)
    fireEvent.click(
      [...first.container.querySelectorAll<HTMLButtonElement>('.picker-item')].find((item) =>
        item.textContent?.startsWith('pizza'),
      )!,
    )
    fireEvent.click(first.container.querySelector<HTMLButtonElement>('.nutrition-log')!)
    first.unmount()

    const { container } = render(<Nutrition />)
    fireEvent.click(container.querySelector<HTMLButtonElement>('.nutrition-rail-row')!)

    // the same screen adding uses: the meal rail, the amount, `+ food` a
    // press away
    expect(container.querySelector('.nutrition-rail-label')?.textContent).toBe('this meal')
    expect(container.querySelector('.nutrition-meal-name')?.textContent).toBe('pizza')

    fireEvent.input(container.querySelector<HTMLInputElement>('[aria-label="amount"]')!, {
      target: { value: '3' },
    })
    fireEvent.click(container.querySelector<HTMLButtonElement>('.nutrition-log')!)

    const entry = readEntries('nutrition')[0]!
    expect(entry.payload).toEqual({ foods: [{ food_id: 'pizza', amount: 3, level: 'normal' }] })
    expect(entry.rev).toBe(2)
    // and saving lands back on the list, where the meal still is
    expect(container.querySelector('.nutrition-new')).not.toBeNull()
  })
})

describe('the food library', () => {
  it('carries the scales every module reads, not only this one’s', () => {
    const levels = loadLevels()
    expect(levels['nutrition']?.scale).toEqual(['lean', 'normal', 'loaded'])
    expect(levels['movement']?.scale).toEqual(['stroll', 'steady', 'brisk'])
    expect(levels['dance']?.scale).toEqual(['marking', 'social', 'full-out'])
  })

  it('counts drinks as foods, because an office day is mostly those', () => {
    const names = loadFoods().foods.map((food) => food.name)
    for (const drink of ['coffee', 'beer', 'orange juice']) expect(names).toContain(drink)
  })

  it('gives a food four things and no fifth', () => {
    // the whole of what a food is since 2026-08-08: a name, a unit, the level
    // it opens at, and a sentence. No cell of it is a number
    for (const food of loadFoods().foods) {
      expect(Object.keys(food).sort()).toEqual(
        expect.arrayContaining(['default_level', 'id', 'name', 'unit']),
      )
      for (const key of Object.keys(food)) {
        expect(['id', 'name', 'unit', 'default_level', 'notes']).toContain(key)
      }
    }
  })

  it('describes the few foods where the levels are genuinely confusing, and no more', () => {
    const { foods } = loadFoods()
    // the seed is a demonstration, not a project: a note is written where a
    // level needs saying and left blank everywhere else
    const described = foods.filter((food) => food.notes !== undefined)
    expect(described.length).toBeLessThan(6)
    expect(described.length).toBeGreaterThan(0)
    // what makes a loaded salad loaded is the tahini, and that is the kind of
    // thing no number ever said
    expect(named('salad').notes).toContain('tahini')
    expect(named('water').notes).toBeUndefined()
  })

  it('gives every food a unit of its own and a level to open at', () => {
    for (const food of loadFoods().foods) {
      expect(typeof food.unit).toBe('string')
      expect(loadLevels()['nutrition']?.scale).toContain(food.default_level)
    }
  })
})

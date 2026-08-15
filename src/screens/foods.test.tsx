import { fireEvent, render } from '@testing-library/preact'
import { loadFoods } from '../data/food'
import { ensureSeeded, readEntries } from '../data/store'
import { Foods } from './foods'
import { Nutrition, nutritionLineFor } from './nutrition'

beforeEach(() => {
  localStorage.clear()
  ensureSeeded()
})

const press = (container: Element, selector: string) =>
  fireEvent.click(container.querySelector<HTMLButtonElement>(selector)!)

const rowFor = (container: Element, name: string) =>
  [...container.querySelectorAll<HTMLButtonElement>('.foods-row')].find(
    (row) => row.querySelector('.foods-name')?.textContent === name,
  )!

const open = (container: Element, name: string) => fireEvent.click(rowFor(container, name))

const set = (container: Element, label: string, value: string) =>
  fireEvent.change(container.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!, {
    target: { value },
  })

const names = (container: Element) =>
  [...container.querySelectorAll('.foods-name')].map((span) => span.textContent)

const held = (name: string) => loadFoods().foods.find((food) => food.name === name)

/** A meal of one, logged through the module so the entry is real. */
const logMeal = (food: string) => {
  const screen = render(<Nutrition />)
  press(screen.container, '.nutrition-new')
  fireEvent.click(
    [...screen.container.querySelectorAll<HTMLButtonElement>('.picker-item')].find((item) =>
      item.textContent?.startsWith(food),
    )!,
  )
  press(screen.container, '.nutrition-log')
  screen.unmount()
}

/** What the module shows about a food at the point of logging it. The note it
 *  prints comes from the library this screen writes, which is the whole point
 *  of the pair of surfaces. */
const logging = (food: string) => {
  const screen = render(<Nutrition />)
  press(screen.container, '.nutrition-new')
  fireEvent.click(
    [...screen.container.querySelectorAll<HTMLButtonElement>('.picker-item')].find((item) =>
      item.textContent?.startsWith(food),
    )!,
  )
  return screen
}

describe('the food library screen', () => {
  it('lists every food the library holds, in the order the picker offers', () => {
    const { container } = render(<Foods />)
    const library = loadFoods().foods

    expect(names(container)).toHaveLength(library.length)
    expect(names(container)).toEqual(library.map((item) => item.name))
  })

  it('opens one row at a time, and closes the one that was open', () => {
    const { container } = render(<Foods />)

    open(container, 'pizza')
    expect(container.querySelectorAll('.foods-fields')).toHaveLength(1)

    open(container, 'tuna')
    expect(container.querySelectorAll('.foods-fields')).toHaveLength(1)
    expect(container.querySelector('[aria-label="name of tuna"]')).not.toBeNull()

    open(container, 'tuna')
    expect(container.querySelector('.foods-fields')).toBeNull()
  })

  it('renames a food, and the rename reaches a meal logged before it', () => {
    logMeal('pizza')

    const { container } = render(<Foods />)
    open(container, 'pizza')
    set(container, 'name of pizza', 'pizza · the good bakery')

    expect(held('pizza · the good bakery')).not.toBeUndefined()
    expect(nutritionLineFor(readEntries('nutrition')[0]!)).toContain('pizza · the good bakery')
  })

  it('refuses a blank name, and puts the old one back in the box', () => {
    const { container } = render(<Foods />)
    open(container, 'pizza')
    set(container, 'name of pizza', '  ')

    expect(held('pizza')).not.toBeUndefined()
    // refusing writes nothing, so nothing re-renders — the box has to be put
    // back by hand or it sits blank over a library that still holds the name
    expect(container.querySelector<HTMLInputElement>('[aria-label="name of pizza"]')?.value).toBe(
      'pizza',
    )
  })

  it('gives a food its unit, and a meal already logged reads in it', () => {
    logMeal('leftovers')
    expect(nutritionLineFor(readEntries('nutrition')[0]!)).toBe('leftovers · 1 plate · normal')

    const { container } = render(<Foods />)
    open(container, 'leftovers')
    set(container, 'unit of leftovers', 'bowl')

    expect(held('leftovers')?.unit).toBe('bowl')
    // the unit belongs to the food and is never stored on the entry, so
    // correcting it reaches every meal that ever held it
    expect(nutritionLineFor(readEntries('nutrition')[0]!)).toBe('leftovers · 1 bowl · normal')
  })

  it('takes a blank unit, which is what a food that counts as itself wants', () => {
    const { container } = render(<Foods />)
    open(container, 'leftovers')
    set(container, 'unit of leftovers', '  ')

    expect(held('leftovers')?.unit).toBe('')
  })

  it('writes the food’s note, and it shows where the food is logged', () => {
    const { container } = render(<Foods />)
    open(container, 'leftovers')

    set(container, 'about leftovers', 'friday’s pot, whatever is left of it')
    expect(held('leftovers')?.notes).toBe('friday’s pot, whatever is left of it')

    // the note belongs to the food, so the meal builder reads the same sentence
    const screen = logging('leftovers')
    expect(
      screen.container.querySelector<HTMLInputElement>('[aria-label="about this food"]')?.value,
    ).toBe('friday’s pot, whatever is left of it')
  })

  it('opens the note it already has, on a food that ships with one', () => {
    const { container } = render(<Foods />)
    open(container, 'coffee')

    expect(container.querySelector<HTMLInputElement>('[aria-label="about coffee"]')?.value).toBe(
      'lean is black and unsweetened; loaded is a large one with milk and sugar',
    )
  })

  it('drops the note entirely once the box is cleared', () => {
    const { container } = render(<Foods />)
    open(container, 'coffee')

    set(container, 'about coffee', '   ')
    // no key at all rather than a stored blank: a food nobody has described and
    // one whose note was cleared are the same food
    expect('notes' in held('coffee')!).toBe(false)
  })

  it('offers no number box at all, on either surface', () => {
    const { container } = render(<Foods />)
    open(container, 'pizza')

    // the matrix and the level prose went on 2026-08-08 — a food is a name, a
    // unit, the level it opens at and a sentence
    expect(container.querySelector('.facts')).toBeNull()
    expect(container.querySelectorAll('input[type="number"]')).toHaveLength(0)
    expect(logging('pizza').container.querySelector('.nutrition-numbers')).toBeNull()
  })

  it('changes the level a food opens at', () => {
    const { container } = render(<Foods />)
    open(container, 'coffee')

    fireEvent.click(
      [
        ...container.querySelectorAll<HTMLButtonElement>(
          '[aria-label="default level of coffee"] button',
        ),
      ].find((button) => button.textContent?.includes('lean'))!,
    )

    expect(held('coffee')?.default_level).toBe('lean')
    expect(logging('coffee').container.querySelector('.level [aria-pressed="true"]')?.textContent).toContain(
      'lean',
    )
  })

  it('narrows on the filter without reordering what is left', () => {
    const { container } = render(<Foods />)
    const before = names(container)

    fireEvent.input(container.querySelector<HTMLInputElement>('.foods-filter')!, {
      target: { value: 'cup' },
    })
    const after = names(container)

    // the unit widens the match, so `cup` finds coffee without its name saying so
    expect(after).toContain('coffee')
    expect(after.length).toBeLessThan(before.length)
    expect(after).toEqual(before.filter((name) => after.includes(name)))
  })

  it('removes an unused food in two presses', () => {
    const { container } = render(<Foods />)
    open(container, 'pizza')

    press(container, '.foods-remove')
    expect(container.querySelector('.foods-remove')?.textContent).toBe('press again')
    expect(held('pizza')).not.toBeUndefined()

    press(container, '.foods-remove')
    expect(held('pizza')).toBeUndefined()
    expect(names(container)).not.toContain('pizza')
  })

  it('refuses a used food, naming the meal as a link', () => {
    logMeal('pizza')
    const id = readEntries('nutrition')[0]!.id

    const { container } = render(<Foods />)
    open(container, 'pizza')
    press(container, '.foods-remove')

    expect(container.querySelector('.refused')).not.toBeNull()
    expect(container.querySelector('.refused-line')?.textContent).toBe('in a meal, still')
    expect(container.querySelector('.refused-link')?.getAttribute('href')).toBe(`#/entry/${id}`)
    // it did not arm, so a second press cannot get through by accident
    expect(container.querySelector('.foods-remove')?.textContent).toBe('remove from the library')
    expect(held('pizza')).not.toBeUndefined()
  })

  it('renames from the refusal instead, which is what §7 offers', () => {
    logMeal('pizza')

    const { container } = render(<Foods />)
    open(container, 'pizza')
    press(container, '.foods-remove')
    set(container, 'rename pizza', 'pizza · frozen')

    expect(nutritionLineFor(readEntries('nutrition')[0]!)).toContain('pizza · frozen')
  })

  it('offers no way to make a new one, and says where one is made', () => {
    const { container } = render(<Foods />)
    expect(container.querySelector('.picker-new')).toBeNull()
    expect(container.textContent ?? '').not.toContain('+ new')
    expect(container.querySelector('.foods-note')?.textContent).toContain('made where it is logged')
  })

  /* §10.3: the library sheet leaves from the screen the library is edited on,
     not from home's footer, because the catalog is shared and the report is
     one profile's. A control, not a door — the file leaves, the screen stays. */
  it('offers the library as a document, as a control rather than a route', () => {
    const { getByText, container } = render(<Foods />)
    const control = getByText('download the library')
    expect(control.closest('a')).toBeNull()
    expect(container.querySelectorAll('.foods-sheet')).toHaveLength(1)
  })

  it('goes back to the nutrition module rather than to home', () => {
    const { container } = render(<Foods />)
    expect(container.querySelector('.foods-back')?.getAttribute('href')).toBe('#/nutrition')
  })
})

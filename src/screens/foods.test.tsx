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

/** What the module shows about a food at the point of logging it — the numbers
 *  line and the level prose both come from the library this screen writes. */
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

  it('writes the three numbers of the base row at one unit', () => {
    const { container } = render(<Foods />)
    open(container, 'leftovers')

    set(container, 'normal kcal of leftovers', '480')
    set(container, 'normal protein of leftovers', '26')
    set(container, 'normal fat of leftovers', '18')

    expect(held('leftovers')).toMatchObject({ kcal: 480, protein: 26, fat: 18 })

    // and the food says so where it is logged, with the level's multiplier on
    const screen = logging('leftovers')
    expect(screen.container.querySelector('.nutrition-numbers')?.textContent).toBe(
      '480 kcal · 26 g protein · 18 g fat',
    )
  })

  it('draws a box for every level by every number, three by three', () => {
    const { container } = render(<Foods />)
    open(container, 'pizza')

    expect(container.querySelectorAll('.facts-matrix input')).toHaveLength(9)
    // one row per level of the scale, in the scale's own order
    expect([...container.querySelectorAll('.facts-matrix-level')].map((s) => s.textContent)).toEqual(
      ['lean', 'normal', 'loaded'],
    )
    // and none of them is required: the untyped cells stand empty, showing what
    // the multiplier makes of the row that was typed
    const cell = (label: string) =>
      container.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!
    expect(cell('normal kcal of pizza').value).toBe('285')
    expect(cell('lean kcal of pizza').value).toBe('')
    expect(cell('lean kcal of pizza').placeholder).toBe('199.5')
    expect(cell('loaded kcal of pizza').placeholder).toBe('399')
    // the base row has nothing behind it, and neither has a number the food
    // does not carry — an unknown does not become a derived one
    expect(cell('normal kcal of pizza').placeholder).toBe('—')
    open(container, 'apple')
    expect(cell('lean kcal of apple').placeholder).toBe('66.5')
    expect(cell('lean protein of apple').placeholder).toBe('—')
  })

  it('writes one level’s own numbers, and drops the row once it is emptied', () => {
    const { container } = render(<Foods />)
    open(container, 'pizza')

    set(container, 'loaded kcal of pizza', '520')
    set(container, 'loaded fat of pizza', '26')
    expect(held('pizza')?.levels).toEqual({ loaded: { kcal: 520, fat: 26 } })

    // the level that was typed is the level that is used, and the one that was
    // not is still the multiplier
    const screen = logging('pizza')
    fireEvent.click(
      [...screen.container.querySelectorAll<HTMLButtonElement>('.level .segmented button')].find(
        (button) => button.textContent?.includes('loaded'),
      )!,
    )
    expect(screen.container.querySelector('.nutrition-numbers')?.textContent).toBe(
      '520 kcal · 17 g protein · 26 g fat',
    )
    screen.unmount()

    set(container, 'loaded kcal of pizza', '')
    expect(held('pizza')?.levels).toEqual({ loaded: { fat: 26 } })
    set(container, 'loaded fat of pizza', '')
    // no empty row and no empty key: a food that overrode nothing reads exactly
    // as it did before the matrix existed
    expect('levels' in held('pizza')!).toBe(false)
  })

  it('says which unit the numbers are for, in the food’s own word', () => {
    const { container } = render(<Foods />)

    open(container, 'pizza')
    expect(container.querySelector('.facts-label')?.textContent).toBe('per slice')

    open(container, 'apple')
    expect(container.querySelector('.facts-label')?.textContent).toBe('per one')
  })

  it('empties a number back to unknown rather than to zero', () => {
    const { container } = render(<Foods />)
    open(container, 'pizza')
    set(container, 'normal protein of pizza', '')

    // the key goes outright: an unknown is not a zero, and `12 g protein` must
    // not come back as `0 g protein`
    expect('protein' in held('pizza')!).toBe(false)
    const screen = logging('pizza')
    expect(screen.container.querySelector('.nutrition-numbers')?.textContent).toBe(
      '285 kcal · 10 g fat',
    )
  })

  it('keeps a zero that was typed on purpose, because no fat in it is a fact', () => {
    const { container } = render(<Foods />)
    open(container, 'pizza')
    set(container, 'normal fat of pizza', '0')

    expect(held('pizza')?.fat).toBe(0)
  })

  it('writes what each level means, and the prose shows where the food is logged', () => {
    const { container } = render(<Foods />)
    open(container, 'tuna')

    set(container, 'what lean means for tuna', 'in water, drained')
    set(container, 'what normal means for tuna', 'in water, half the oil left')
    set(container, 'what loaded means for tuna', 'in oil, with mayonnaise')

    expect(held('tuna')?.examples).toEqual({
      lean: 'in water, drained',
      normal: 'in water, half the oil left',
      loaded: 'in oil, with mayonnaise',
    })

    const screen = logging('tuna')
    expect([...screen.container.querySelectorAll('.level-example')].map((p) => p.textContent)).toEqual(
      ['in water, drained', 'in water, half the oil left', 'in oil, with mayonnaise'],
    )
  })

  it('opens the prose it already has, and the coffee it ships with', () => {
    const { container } = render(<Foods />)
    open(container, 'coffee')

    expect(
      container.querySelector<HTMLInputElement>('[aria-label="what lean means for coffee"]')?.value,
    ).toBe('black, no sugar')
    expect(
      container.querySelector<HTMLInputElement>('[aria-label="what loaded means for coffee"]')?.value,
    ).toBe('large, with milk and sugar')
  })

  it('drops the examples entirely once the last line is cleared', () => {
    const { container } = render(<Foods />)
    open(container, 'coffee')

    set(container, 'what lean means for coffee', '')
    set(container, 'what normal means for coffee', '')
    expect(held('coffee')?.examples).toEqual({ loaded: 'large, with milk and sugar' })

    set(container, 'what loaded means for coffee', '')
    // no key at all, rather than three blanks — which is what makes the control
    // draw no prose block instead of three empty lines
    expect('examples' in held('coffee')!).toBe(false)
    expect(logging('coffee').container.querySelector('.level-examples')).toBeNull()
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

  it('goes back to the nutrition module rather than to home', () => {
    const { container } = render(<Foods />)
    expect(container.querySelector('.foods-back')?.getAttribute('href')).toBe('#/nutrition')
  })
})

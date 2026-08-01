import { fireEvent, render } from '@testing-library/preact'
import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import { AmountStepper } from '../components/amount_stepper'
import { LevelControl } from '../components/level_control'
import { loadFoods, loadLevels, nutritionFor } from '../data/food'
import type { Food } from '../data/food'
import { ensureSeeded, writeJson } from '../data/store'

const named = (name: string): Food => {
  const food = loadFoods().foods.find((item) => item.name === name)
  if (food === undefined) throw new Error(`no seeded food named ${name}`)
  return food
}

beforeEach(() => {
  localStorage.clear()
  ensureSeeded()
})

describe('a level is a multiplier', () => {
  const plain: Food = { id: 'plain', name: 'plain', unit: 'slice', default_level: 'normal', kcal: 200 }

  it('applies the scale to the food’s normal-case numbers', () => {
    expect(nutritionFor(plain, 2, 'loaded').kcal).toBe(560)
    expect(nutritionFor(plain, 2, 'normal').kcal).toBe(400)
    expect(nutritionFor(plain, 2, 'lean').kcal).toBe(280)
  })

  it('leaves a food with no number null rather than calling it 0', () => {
    expect(nutritionFor(named('water'), 3, 'loaded')).toEqual({ kcal: null, protein: null })
    expect(nutritionFor(named('apple'), 1, 'normal').protein).toBeNull()
  })

  it('multiplies a fractional amount, because half a slice is an entry', () => {
    expect(nutritionFor(plain, 0.5, 'normal').kcal).toBe(100)
  })

  it('takes the multipliers from the file and never from source', () => {
    const levels = loadLevels()
    writeJson('config/levels.json', {
      ...levels,
      nutrition: { ...levels['nutrition'], multipliers: { lean: 0.5, normal: 1, loaded: 2 } },
    })

    expect(nutritionFor(plain, 2, 'loaded').kcal).toBe(800)
    expect(nutritionFor(plain, 2, 'lean').kcal).toBe(200)
  })

  it('leaves the numbers alone for a level the scale gives no multiplier', () => {
    expect(nutritionFor(plain, 1, 'invented').kcal).toBe(200)
  })
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
})

describe('the level control', () => {
  const scale = ['lean', 'normal', 'loaded']
  const examples = { lean: 'thin crust', normal: 'standard slice', loaded: 'thick crust' }

  const drawn = (props: { examples?: Record<string, string> }) =>
    render(
      <LevelControl scale={scale} value="normal" onChange={() => {}} label="level" {...props} />,
    ).container

  it('shows all three examples at once, because comparing is the point', () => {
    const container = drawn({ examples })
    const prose = [...container.querySelectorAll('.level-example')].map((p) => p.textContent)
    expect(prose).toEqual(['thin crust', 'standard slice', 'thick crust'])
  })

  it('renders no prose at all for a food that has none', () => {
    expect(drawn({}).querySelector('.level-examples')).toBeNull()
    expect(drawn({}).querySelectorAll('.level-example')).toHaveLength(0)
  })

  it('draws identical buttons whether or not there are examples', () => {
    const withProse = drawn({ examples }).querySelector('.segmented')!.outerHTML
    const without = drawn({}).querySelector('.segmented')!.outerHTML
    expect(withProse).toBe(without)
  })

  it('wears ink-select, because a level is not the live one', () => {
    const control = drawn({}).querySelector('.segmented')!
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

  it('ships most foods with no numbers at all, which is the common case', () => {
    const { foods } = loadFoods()
    expect(foods.filter((food) => food.kcal === undefined).length).toBeGreaterThan(3)
  })

  it('writes examples for a few foods and leaves the rest blank', () => {
    const { foods } = loadFoods()
    const described = foods.filter((food) => food.examples !== undefined)
    expect(described.length).toBeLessThan(6)
    expect(named('pizza').examples).toEqual({
      lean: 'thin crust, light cheese, vegetable toppings',
      normal: 'plain cheese and tomato, standard slice',
      loaded: 'thick crust, meat, extra cheese',
    })
  })

  it('gives every food a unit of its own and a level to open at', () => {
    for (const food of loadFoods().foods) {
      expect(typeof food.unit).toBe('string')
      expect(loadLevels()['nutrition']?.scale).toContain(food.default_level)
    }
  })
})

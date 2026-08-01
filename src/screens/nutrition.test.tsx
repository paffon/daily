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

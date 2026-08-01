/** The food library, and what a level does to its numbers.
 *
 *  Levels are multipliers and examples are prose. The multipliers are global
 *  and live in `config/levels.json` beside every other module's scale; only the
 *  examples are per food, and they are optional. Authoring three sets of
 *  numbers for every food would turn the library into a data-entry project, and
 *  a food library that is a project does not get maintained. */

import { readJson } from './store'
import appSeed from '../seed/app.json'
import foodsSeed from '../seed/foods.json'
import levelsSeed from '../seed/levels.json'

export type Food = {
  id: string
  /** pizza, coffee, cottage cheese. */
  name: string
  /** The natural unit for *this* food — slice, cup, g, plate. It belongs to the
   *  food and is never chosen per entry. Blank where the food counts as itself:
   *  an apple is `1`, not `1 piece`. */
  unit: string
  /** So the common entry is one tap and lean or loaded is the exception. */
  default_level: string
  /** The **normal** case at one unit, both optional. A name and a time is a
   *  complete entry. */
  kcal?: number
  protein?: number
  /** What each level looks like for this food. Written once for the foods where
   *  the distinction is genuinely confusing, absent everywhere else. */
  examples?: Record<string, string>
}

/** `units` maps a unit to how it reads past one. A shared vocabulary rather
 *  than a field on every food, and a unit that is absent reads the same at
 *  either count — which is what `g` needs and what a plural rule in source
 *  would have got wrong. */
export type FoodLibrary = { units: Record<string, string>; foods: Food[] }

/** One module's level scale. `multipliers` is nutrition's alone — a walking
 *  speed is what the thing was and multiplies nothing. */
export type Scale = { scale: string[]; multipliers?: Record<string, number> }

export const loadFoods = (): FoodLibrary => readJson('library/foods.json', foodsSeed)

export const loadLevels = (): Record<string, Scale> => readJson('config/levels.json', levelsSeed)

/** `ensureSeeded` writes a seed only when the whole file is absent, so a browser
 *  holding an `app.json` from before this phase has no `nutrition` section at
 *  all — and `undefined` reaching the arithmetic would round to `NaN`. The seed
 *  underneath is the same defence P8 had to write twice; the duplication is the
 *  symptom of a store that does not backfill. */
export const nutritionConfig = (): typeof appSeed.nutrition => ({
  ...appSeed.nutrition,
  ...readJson('config/app.json', appSeed).nutrition,
})

export type Nutrition = { kcal: number | null; protein: number | null }

/** The food's normal-case numbers, times the amount, times the level's
 *  multiplier. A food with no number stays `null` rather than becoming 0: an
 *  unknown is not a zero. Per entry only — nothing sums these. */
export function nutritionFor(food: Food, amount: number, level: string): Nutrition {
  /* an unmultiplied level is identity, not a tunable default: a scale that
     names no multiplier for one of its levels leaves the numbers alone */
  const factor = loadLevels()['nutrition']?.multipliers?.[level] ?? 1
  const { decimals } = nutritionConfig()
  const scaled = (value: number | undefined): number | null =>
    value === undefined ? null : Number((value * amount * factor).toFixed(decimals))

  return { kcal: scaled(food.kcal), protein: scaled(food.protein) }
}

/** `slices` past one, `cup` at one, `g` at either. */
export function unitOf(library: FoodLibrary, food: Food, amount: number): string {
  return amount === 1 ? food.unit : (library.units[food.unit] ?? food.unit)
}

/** `2 slices · loaded`. The rail row, `Previous` and the entry being logged are
 *  the same sentence at three sizes, so they are one function. */
export function foodLine(library: FoodLibrary, food: Food, amount: number, level: string): string {
  const measure = [String(amount), unitOf(library, food, amount)].filter((part) => part !== '').join(' ')
  return `${measure} · ${level}`
}

/** `570 kcal · 24 g protein`, and nothing where the food carries no numbers. */
export function nutritionLine({ kcal, protein }: Nutrition): string {
  return [kcal === null ? '' : `${kcal} kcal`, protein === null ? '' : `${protein} g protein`]
    .filter((part) => part !== '')
    .join(' · ')
}

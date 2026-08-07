/** The food library, and what a level does to its numbers.
 *
 *  Levels are multipliers and examples are prose. The multipliers are global
 *  and live in `config/levels.json` beside every other module's scale; only the
 *  examples are per food, and they are optional. Authoring three sets of
 *  numbers for every food would turn the library into a data-entry project, and
 *  a food library that is a project does not get maintained. */

import type { Entry } from './entry'
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
type Scale = { scale: string[]; multipliers?: Record<string, number> }

/** One food inside a meal. `comment` is free text on this food in this meal —
 *  *the good bakery*, *left half of it*, *reheated*. Optional and absent until
 *  something is typed: a meal of six should not carry six empty strings, and
 *  every entry logged before comments stays exactly as it was written. */
export type Logged = { food_id: string; amount: number; level: string; comment?: string }

/** Both shapes a payload can hold: `{ foods: [...] }` since meals landed, and
 *  the flat single-food payload every entry before them was written with. The
 *  log is never migrated — an old entry keeps saying what it said. The payload
 *  key lives with the type it names rather than in the screen that happens to
 *  render it, the way `performedIn` does for a workout's. */
export const foodsOf = (payload: Entry['payload']): Logged[] => {
  const foods = payload['foods']
  return Array.isArray(foods) ? (foods as Logged[]) : [payload as Logged]
}

export const foodsIn = (entry: Entry): Logged[] => foodsOf(entry.payload)

/** A food logged before comments carries no key, and an emptied box leaves a
 *  blank one behind. Both mean nothing was said. */
export const commentOf = (logged: Logged): string => logged.comment ?? ''

/** A food the library no longer has — renamed on another device, or deleted,
 *  since nothing in a seed is protected. The entry keeps saying what it said;
 *  only the name falls back to the id it was stored under. */
export const asFood = (id: string, library: FoodLibrary): Food =>
  library.foods.find((item) => item.id === id) ?? { id, name: id, unit: '', default_level: '' }

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

type Nutrition = { kcal: number | null; protein: number | null }

/** The food's normal-case numbers, times the amount, times the level's
 *  multiplier. A food with no number stays `null` rather than becoming 0: an
 *  unknown is not a zero. Per entry only — nothing sums these. */
export function nutritionFor(food: Food, amount: number, level: string): Nutrition {
  /* an unmultiplied level is identity, not a tunable default: a scale that
     names no multiplier for one of its levels leaves the numbers alone */
  const factor = loadLevels()['nutrition']?.multipliers?.[level] ?? 1
  const { decimals } = nutritionConfig()
  /* `== null` catches the written-out `"kcal": null` as well as the absent
     key: the library is a file the user edits, and both spellings mean the
     same unknown — where `null * amount` would quietly mean 0 */
  const scaled = (value: number | undefined | null): number | null =>
    value == null ? null : Number((value * amount * factor).toFixed(decimals))

  return { kcal: scaled(food.kcal), protein: scaled(food.protein) }
}

/** `slices` past one, `cup` at one, `g` at either. */
export function unitOf(library: FoodLibrary, food: Food, amount: number): string {
  return amount === 1 ? food.unit : (library.units[food.unit] ?? food.unit)
}

/** `570 kcal · 24 g protein`, and nothing where the food carries no numbers. */
export function nutritionLine({ kcal, protein }: Nutrition): string {
  return [kcal === null ? '' : `${kcal} kcal`, protein === null ? '' : `${protein} g protein`]
    .filter((part) => part !== '')
    .join(' · ')
}

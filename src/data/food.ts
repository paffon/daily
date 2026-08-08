/** The food library, and what a level does to its numbers.
 *
 *  Levels are multipliers and examples are prose. The multipliers are global
 *  and live in `config/levels.json` beside every other module's scale; only the
 *  examples are per food, and they are optional. Authoring three sets of
 *  numbers for every food would turn the library into a data-entry project, and
 *  a food library that is a project does not get maintained. */

import type { Entry } from './entry'
import { readJson, writeJson } from './store'
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
  /** The **normal** case at one unit, all three optional. A name and a time is
   *  a complete entry.
   *
   *  `fat` arrived on 2026-08-08, reversing §8.2's *calories and protein, and
   *  nothing else*. It is one more optional number on a food that already
   *  carries two, not a field every food has to answer, and the argument that
   *  cut it — a field costs a decision per food — is answered by leaving it
   *  blank, which most of the library does. Carbohydrate and fibre stay cut. */
  kcal?: number
  protein?: number
  fat?: number
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

/** Read-modify-write of the stored file, never of a copy the caller is holding.
 *  Two library edits can land before a re-render — a name typed and then a
 *  unit, on the same panel — and spreading a copy read at render time writes
 *  the first one back out. Both surfaces that edit this library go through
 *  here, the way `writeExercises` holds the other one, so the race cannot come
 *  back on one side only. The read is the mirror, so it costs nothing.
 *
 *  A patch may carry `undefined` for a number that has become unknown again:
 *  `JSON.stringify` drops the key outright, which is the same absence a food
 *  that never had the number wears. */
export function writeFoods(change: (held: FoodLibrary) => Food[]): void {
  const held = loadFoods()
  writeJson('library/foods.json', { ...held, foods: change(held) })
}

/** One food, changed against the stored copy rather than against the caller's.
 *  Every field edited on either surface goes through this, so a merge — the
 *  three level lines are one object — happens inside the write and not against
 *  a render that is one keystroke old. */
export function editFood(id: string, change: (held: Food) => Food): void {
  writeFoods((held) => held.foods.map((item) => (item.id === id ? change(item) : item)))
}

/** The stored meals that logged this food, in the order they were handed over.
 *  A delete names them rather than refusing in the abstract (§7), the same way
 *  `usedBy` does for an exercise.
 *
 *  `readEntries` has already dropped the tombstones, so a deleted meal does not
 *  hold a food hostage. */
export const usedBy = (food_id: string, meals: Entry[]): Entry[] =>
  meals.filter((entry) => foodsIn(entry).some((logged) => logged.food_id === food_id))

/** The units the library already knows — the plural map's names and whatever
 *  the foods are counted in. Offered rather than enforced: a unit nothing has
 *  heard of is still typeable, and one the map has no plural for simply reads
 *  the same past one, which is what `g` needs. */
export const unitsIn = (library: FoodLibrary): string[] =>
  [...new Set([...Object.keys(library.units), ...library.foods.map((food) => food.unit)])]
    .filter((unit) => unit !== '')
    .sort()

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

export type Nutrition = { kcal: number | null; protein: number | null; fat: number | null }

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

  return { kcal: scaled(food.kcal), protein: scaled(food.protein), fat: scaled(food.fat) }
}

/** `slices` past one, `cup` at one, `g` at either. */
export function unitOf(library: FoodLibrary, food: Food, amount: number): string {
  return amount === 1 ? food.unit : (library.units[food.unit] ?? food.unit)
}

/** `570 kcal · 24 g protein · 20 g fat`, and nothing where the food carries no
 *  numbers. Each part is dropped on its own, so a food that knows its calories
 *  and nothing else says only that. */
export function nutritionLine({ kcal, protein, fat }: Nutrition): string {
  return [
    kcal === null ? '' : `${kcal} kcal`,
    protein === null ? '' : `${protein} g protein`,
    fat === null ? '' : `${fat} g fat`,
  ]
    .filter((part) => part !== '')
    .join(' · ')
}

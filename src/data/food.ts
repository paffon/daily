/** The food library, and what a level does to its numbers.
 *
 *  A food's numbers are a matrix — three levels by three macros — and every
 *  cell of it is optional (`DESIGN.md` §8.2, 2026-08-08). What was typed for a
 *  level is what that level is. What was not is the base row times the global
 *  multiplier in `config/levels.json`, which is what keeps the library from
 *  becoming a data-entry project: nine numbers are available and three are
 *  usually enough. A food with nothing typed anywhere has no numbers at all,
 *  and that is a complete food. */

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
  /** The base row of the matrix, at one unit — the level the scale multiplies
   *  by 1, which is `normal` in the seeded scale. All three optional. A name
   *  and a time is a complete entry.
   *
   *  `fat` arrived on 2026-08-08, reversing §8.2's *calories and protein, and
   *  nothing else*. It is one more optional number on a food that already
   *  carries two, not a field every food has to answer, and the argument that
   *  cut it — a field costs a decision per food — is answered by leaving it
   *  blank, which most of the library does. Carbohydrate and fibre stay cut. */
  kcal?: number
  protein?: number
  fat?: number
  /** The rest of the matrix: what a level is in numbers, for the foods where
   *  the multiplier is wrong about it — a loaded salad is not a lean one times
   *  a constant, because what makes it loaded is the tahini. Keyed by the
   *  level's own word, cell by cell, and absent on nearly every food. A level
   *  with nothing typed reads as the base times the multiplier, so leaving
   *  this alone is the same library as before it existed. */
  levels?: Record<string, LevelNumbers>
  /** What each level looks like for this food. Written once for the foods where
   *  the distinction is genuinely confusing, absent everywhere else. */
  examples?: Record<string, string>
}

/** One row of the matrix. The same three optional numbers the food itself
 *  carries, which is what makes the grid one shape rather than two. */
export type LevelNumbers = { kcal?: number; protein?: number; fat?: number }

/** The three the matrix has columns for, in the order it draws them. Data
 *  rather than three boxes written out three times — and read by the grid and
 *  by the arithmetic alike, so a fourth macro would be one line here. */
export const MACROS = ['kcal', 'protein', 'fat'] as const

export type Macro = (typeof MACROS)[number]

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

/** The level the food's own three numbers are for — the one the scale
 *  multiplies by 1, since the multipliers are relative to something and that
 *  something is whatever they leave alone. `normal`, in the seeded scale, and
 *  the word is nowhere in source: rename the scale and the base row moves with
 *  it. A scale that multiplies nothing makes its first level the base. */
export const baseLevel = (levels: Record<string, Scale> = loadLevels()): string => {
  const nutrition = levels['nutrition']
  return nutrition?.scale.find((level) => (nutrition.multipliers?.[level] ?? 1) === 1) ?? ''
}

/** 0.7 × 1.03 is 0.7209999999999999 in binary floating point, and a placeholder
 *  saying so would read as a number somebody typed. This trims the noise and
 *  nothing else — it is not a rounding policy, which is `decimals` and belongs
 *  to the entry rather than to the library. */
const exact = (value: number): number => Number(value.toPrecision(12))

/** One unit of this food at one level: the cell that was typed for that level,
 *  or the base row times the level's multiplier where none was. `null` rather
 *  than 0 for a number the food does not carry — an unknown is not a zero.
 *
 *  This is the whole of what a level does to a food's numbers, and both the
 *  arithmetic below and the grid that edits the matrix read it, so what the
 *  builder prints and what the empty cell offers can never disagree. */
export function perUnit(food: Food, level: string, levels = loadLevels()): Nutrition {
  /* an unmultiplied level is identity, not a tunable default: a scale that
     names no multiplier for one of its levels leaves the numbers alone */
  const factor = levels['nutrition']?.multipliers?.[level] ?? 1
  const typed = food.levels?.[level]

  /* `== null` catches the written-out `"kcal": null` as well as the absent
     key: the library is a file the user edits, and both spellings mean the
     same unknown — where `null * amount` would quietly mean 0 */
  const at = (macro: Macro): number | null => {
    const said = typed?.[macro]
    if (said != null) return said
    const base = food[macro]
    return base == null ? null : exact(base * factor)
  }

  return { kcal: at('kcal'), protein: at('protein'), fat: at('fat') }
}

/** What one entry of this food is: its numbers at the level it was logged at,
 *  times the amount. Per entry only — nothing sums these. */
export function nutritionFor(food: Food, amount: number, level: string): Nutrition {
  const { decimals } = nutritionConfig()
  const one = perUnit(food, level)
  const scaled = (value: number | null): number | null =>
    value === null ? null : Number((value * amount).toFixed(decimals))

  return { kcal: scaled(one.kcal), protein: scaled(one.protein), fat: scaled(one.fat) }
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

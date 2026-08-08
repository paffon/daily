/** The food library. A food is four things — a name, the unit it is counted
 *  in, the level it opens at, and a note saying what it is (`DESIGN.md` §8.2,
 *  2026-08-08). It carries no numbers: calories, protein and fat were cut on
 *  the same day the matrix that held them was, because what a portion was is
 *  read off the food, its level and its note, and a number nobody maintains is
 *  worse than a sentence somebody wrote. */

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
  /** Free text about the food itself — what it is, and what its levels mean
   *  for it: *lean is black; loaded is large with milk and sugar*. The food's
   *  own, so every meal that ever holds it reads the same sentence, which is
   *  what tells it apart from the comment on a food in one meal.
   *
   *  Optional and absent until something is typed. It is what the numbers used
   *  to be for: a reader — the export's, or the user's — works out roughly what
   *  a portion was from the food, the level and this. */
  notes?: string
}

/** `units` maps a unit to how it reads past one. A shared vocabulary rather
 *  than a field on every food, and a unit that is absent reads the same at
 *  either count — which is what `g` needs and what a plural rule in source
 *  would have got wrong. */
export type FoodLibrary = { units: Record<string, string>; foods: Food[] }

/** One module's level scale. Names and order only: a level says what the thing
 *  was, and since the food matrix went there is nothing for it to multiply. */
export type Scale = { scale: string[] }

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

/** The same absence, on the library side: a food nobody has described, and one
 *  whose note was emptied, say nothing in the same way. */
export const notesOf = (food: Food): string => food.notes ?? ''

/** What a box that has been emptied is worth to the library — nothing, rather
 *  than a stored blank. `JSON.stringify` drops an `undefined`, so the food
 *  wears the same absence as one that was never described. */
export const said = (typed: string): string | undefined => typed.trim() || undefined

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
 *  A patch may carry `undefined` for a field that has become blank again:
 *  `JSON.stringify` drops the key outright, which is the same absence a food
 *  that never had it wears. */
export function writeFoods(change: (held: FoodLibrary) => Food[]): void {
  const held = loadFoods()
  writeJson('library/foods.json', { ...held, foods: change(held) })
}

/** One food, changed against the stored copy rather than against the caller's.
 *  Every field edited on either surface goes through this, so a write happens
 *  inside the read rather than against a render that is one keystroke old. */
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
 *  all. The seed underneath is the same defence P8 had to write twice; the
 *  duplication is the symptom of a store that does not backfill. */
export const nutritionConfig = (): typeof appSeed.nutrition => ({
  ...appSeed.nutrition,
  ...readJson('config/app.json', appSeed).nutrition,
})

/** `slices` past one, `cup` at one, `g` at either. */
export function unitOf(library: FoodLibrary, food: Food, amount: number): string {
  return amount === 1 ? food.unit : (library.units[food.unit] ?? food.unit)
}

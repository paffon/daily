import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { newEntry, toIso } from '../data/entry'
import { deleteEntry, putEntry, readEntries, readJson, updateEntry, writeJson } from '../data/store'
import type { Food, FoodLibrary } from '../data/food'
import {
  loadFoods,
  loadLevels,
  nutritionConfig,
  nutritionFor,
  nutritionLine,
  unitOf,
} from '../data/food'
import { Danger, Previous, Timestamp, clockOf, dayTimeOf } from '../components/fields'
import { ItemPhoto } from '../components/item_photo'
import { LibraryPicker } from '../components/library_picker'
import { AmountStepper } from '../components/amount_stepper'
import { LevelControl } from '../components/level_control'
import { registerEditor } from './edit_entry'
import appSeed from '../seed/app.json'
import './nutrition.css'

/** Reshaped 2026-08-06: the module opens on the list of past meals, with
 *  `+ new meal` above them. A meal is started and ended the way a workout is —
 *  foods added one at a time, one entry holding the lot — and it is untyped:
 *  no breakfast, no lunch, no dinner. A snack is a meal of one. */

type Logged = { food_id: string; amount: number; level: string }

/** Both shapes a payload can hold: `{ foods: [...] }` since meals landed, and
 *  the flat single-food payload every entry before them was written with. The
 *  log is never migrated — an old entry keeps saying what it said. */
const foodsOf = (payload: Entry['payload']): Logged[] => {
  const foods = payload['foods']
  return Array.isArray(foods) ? (foods as Logged[]) : [payload as Logged]
}

const foodsIn = (entry: Entry): Logged[] => foodsOf(entry.payload)

/** A food the library no longer has — renamed on another device, or deleted,
 *  since nothing in a seed is protected. The entry keeps saying what it said;
 *  only the name falls back to the id it was stored under. */
const asFood = (id: string, library: FoodLibrary): Food =>
  library.foods.find((item) => item.id === id) ?? { id, name: id, unit: '', default_level: '' }

/** `2 slices · loaded`, which is the same sentence the rail and `Previous` both
 *  say. The unit is blank where the food counts as itself, and then an apple
 *  reads `1 · normal`. */
const lineOf = ({ food_id, amount, level }: Logged, library: FoodLibrary): string => {
  const measure = [String(amount), unitOf(library, asFood(food_id, library), amount)]
  return `${measure.filter((part) => part !== '').join(' ')} · ${level}`
}

/** What a meal's row in the list says. A meal of one keeps the full sentence;
 *  a longer one gives its names, and the amounts are the one tap the row
 *  already is. */
const mealLine = (foods: Logged[], library: FoodLibrary): string => {
  const first = foods[0]
  if (foods.length === 1 && first !== undefined) {
    return `${asFood(first.food_id, library).name} · ${lineOf(first, library)}`
  }
  return foods.map((food) => asFood(food.food_id, library).name).join(', ')
}

/** What home's recent row says about a meal — the same sentence this module's
 *  own list uses, so the two never drift apart. */
export const nutritionLineFor = (entry: Entry): string => mealLine(foodsIn(entry), loadFoods())

const scaleOf = (): string[] => loadLevels()['nutrition']?.scale ?? []

/** Frame 4h's half, kept for the generic edit screen home links to: every food
 *  the meal holds, with the fields it was logged with. The module's own list
 *  opens the full builder instead. */
registerEditor('nutrition', (payload, onChange) => {
  const library = loadFoods()
  const foods = foodsOf(payload)
  const { amount_step } = nutritionConfig()

  /** Written back in the shape it arrived: a meal stays a meal, and an entry
   *  from before meals stays flat rather than being migrated under an edit. */
  const write = (at: number, next: Logged) => {
    const changed = foods.map((food, i) => (i === at ? next : food))
    onChange(Array.isArray(payload['foods']) ? { ...payload, foods: changed } : { ...changed[0] })
  }

  return (
    <div class="nutrition-edit">
      {foods.map((logged, at) => {
        const food = asFood(logged.food_id, library)
        return (
          <div class="nutrition-edit-item" key={at}>
            <h2 class="nutrition-edit-name">{food.name}</h2>

            <label class="nutrition-field">
              <span class="nutrition-label">amount</span>
              <AmountStepper
                value={logged.amount}
                unit={unitOf(library, food, logged.amount)}
                step={amount_step}
                onChange={(amount) => write(at, { ...logged, amount })}
                label="amount"
              />
            </label>

            <div class="nutrition-field">
              <span class="nutrition-label">level</span>
              <LevelControl
                scale={scaleOf()}
                value={logged.level}
                onChange={(level) => write(at, { ...logged, level })}
                examples={food.examples}
                label="level"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
})

/** One meal being built or corrected. `entry` is null for a new one; both wear
 *  the same screen, which is what makes editing look like adding. A corrected
 *  meal is written back in the meal shape — adding a food to an entry from
 *  before meals has nowhere else to put it. */
function Builder({ entry, locale, onClose }: {
  entry: Entry | null
  locale: string
  onClose: () => void
}): VNode {
  const config = nutritionConfig()
  const library = loadFoods()
  const scale = scaleOf()

  const [ts, setTs] = useState(() => entry?.ts ?? toIso(new Date()))
  const [meal, setMeal] = useState<Logged[]>(() => (entry === null ? [] : foodsIn(entry)))
  const [at, setAt] = useState(0)
  const [picking, setPicking] = useState(() => entry === null || foodsIn(entry).length === 0)
  /** The last time each food was eaten, with the meal being corrected left
   *  out — it cannot be its own previous. */
  const [past] = useState(() =>
    readEntries('nutrition').filter((line) => line.id !== entry?.id),
  )
  /** Bumped when the library is written, since `library` above is read on
   *  render and nothing else here would ask for a fresher one. */
  const [, changed] = useState(0)

  const write = (next: Logged) => setMeal(meal.map((food, i) => (i === at ? next : food)))

  const start = (food_id: string) => {
    const food = asFood(food_id, library)
    setMeal([...meal, { food_id, amount: config.amount_start, level: food.default_level }])
    setAt(meal.length)
    setPicking(false)
  }

  /** What was typed to filter is the new food's name. Its unit and its opening
   *  level come from config rather than from a choice made here — a food added
   *  mid-meal is one press, and both are editable afterwards. */
  const create = (name: string) => {
    const food: Food = { id: crypto.randomUUID(), name, ...config.new_food }
    writeJson('library/foods.json', { ...library, foods: [...library.foods, food] })
    start(food.id)
  }

  /** Nothing in a seed list is protected — `DESIGN.md` §7. The library loses
   *  the name and the log keeps its numbers: an entry naming a removed food
   *  still renders through `asFood`'s fallback. */
  const remove = (id: string) => {
    writeJson('library/foods.json', {
      ...library,
      foods: library.foods.filter((item) => item.id !== id),
    })
    changed((n) => n + 1)
  }

  /** A food picked into the meal by mistake. Session state only — nothing has
   *  been written yet, so this is not a delete and never arms. */
  const drop = (index: number) => {
    const left = meal.filter((_, i) => i !== index)
    setMeal(left)
    setAt(Math.max(0, index < at ? at - 1 : Math.min(at, left.length - 1)))
    if (left.length === 0) setPicking(true)
  }

  /** One entry holds the whole meal, the way one entry holds a workout. */
  const save = () => {
    if (entry === null) putEntry(newEntry('nutrition', { foods: meal }, ts))
    else updateEntry({ ...entry, ts, payload: { foods: meal } })
    onClose()
  }

  /** Scoped to the food, not to the meal or the day: the last time *this* was
   *  eaten, however long ago. */
  const previousOf = (food_id: string): Entry | null =>
    past.find((line) => foodsIn(line).some((food) => food.food_id === food_id)) ?? null

  /* the two move together — `asFood` always answers, so `food` is null exactly
     when nothing is being edited, and the second test below is the type
     checker's rather than a state the screen can be in */
  const current = meal[at]
  const food = current === undefined ? null : asFood(current.food_id, library)
  const nutrition =
    current === undefined || food === null ? null : nutritionFor(food, current.amount, current.level)

  return (
    <main class="nutrition">
      <header class="nutrition-strip">
        <button type="button" class="nutrition-back hit" onClick={onClose}>
          ← &nbsp;nutrition
        </button>
        <Timestamp value={ts} onChange={setTs} locale={locale} />
      </header>

      <div class="nutrition-split">
        <section class="nutrition-rail">
          <h2 class="nutrition-rail-label">this meal</h2>
          {meal.map((logged, index) => (
            <div class="nutrition-meal-row" key={index}>
              <button
                type="button"
                class={
                  index === at && !picking
                    ? 'nutrition-meal-food live hit'
                    : 'nutrition-meal-food hit'
                }
                onClick={() => {
                  setAt(index)
                  setPicking(false)
                }}
              >
                <span class="nutrition-meal-name">{asFood(logged.food_id, library).name}</span>
                <span class="nutrition-meal-line">{lineOf(logged, library)}</span>
              </button>
              <button
                type="button"
                class="nutrition-meal-drop hit"
                aria-label={`remove ${asFood(logged.food_id, library).name}`}
                onClick={() => drop(index)}
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" class="nutrition-rail-add hit" onClick={() => setPicking(true)}>
            + food
          </button>
        </section>

        <section class="nutrition-fields">
          {picking || current === undefined || food === null ? (
            <>
              <h1 class="nutrition-title">food</h1>
              {/* drinks are foods: coffee and beer are in the same library, and
                  the screen's language is about entries rather than eating */}
              <LibraryPicker
                items={library.foods.map((item) => ({ id: item.id, name: item.name, hint: item.unit }))}
                onPick={start}
                onNew={create}
                onDelete={remove}
                newLabel="+ new food"
              />
            </>
          ) : (
            <>
              <div class="nutrition-head">
                <h1 class="nutrition-title">{food.name}</h1>
              </div>

              <ItemPhoto kind="food" id={food.id} name={food.name} />

              <Previous
                entry={previousOf(current.food_id)}
                locale={locale}
                render={(line) => {
                  /* the last of it in that meal, not the first — a second
                     helping is the newer answer */
                  const last = [...foodsIn(line)]
                    .reverse()
                    .find((food) => food.food_id === current.food_id)
                  return last === undefined ? null : lineOf(last, library)
                }}
              />

              <div class="nutrition-row">
                <label class="nutrition-field">
                  <span class="nutrition-label">amount</span>
                  {/* keyed on the position as well as the food: the box holds
                      what was typed, and the same food twice in one meal is
                      two different numbers */}
                  <AmountStepper
                    key={`${at}:${current.food_id}`}
                    value={current.amount}
                    unit={unitOf(library, food, current.amount)}
                    step={config.amount_step}
                    onChange={(amount) => write({ ...current, amount })}
                    label="amount"
                  />
                </label>

                {nutrition !== null && nutritionLine(nutrition) !== '' && (
                  <div class="nutrition-field">
                    <span class="nutrition-label">this food</span>
                    {/* per food, and never summed across the meal or the day */}
                    <span class="nutrition-numbers">{nutritionLine(nutrition)}</span>
                  </div>
                )}
              </div>

              <div class="nutrition-field">
                <span class="nutrition-label">level</span>
                <LevelControl
                  scale={scale}
                  value={current.level}
                  onChange={(level) => write({ ...current, level })}
                  examples={food.examples}
                  label="level"
                />
              </div>
            </>
          )}

          <div class="nutrition-actions">
            <button
              type="button"
              class="nutrition-log hit"
              disabled={meal.length === 0}
              onClick={save}
            >
              {entry === null ? 'end meal' : 'save meal'}
            </button>
            {entry !== null && (
              <Danger
                onClick={() => {
                  deleteEntry(entry.id)
                  onClose()
                }}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export function Nutrition(): VNode {
  const { locale } = readJson('config/app.json', appSeed)
  const library = loadFoods()

  /** `null` is the list; `'new'` and an entry are the same builder. */
  const [open, setOpen] = useState<Entry | 'new' | null>(null)
  const [past, setPast] = useState(() => readEntries('nutrition'))

  const today = new Date().toDateString()
  const isToday = (entry: Entry) => new Date(entry.ts).toDateString() === today

  if (open !== null) {
    return (
      <Builder
        key={open === 'new' ? 'new' : open.id}
        entry={open === 'new' ? null : open}
        locale={locale}
        onClose={() => {
          setPast(readEntries('nutrition'))
          setOpen(null)
        }}
      />
    )
  }

  /** One row per meal. Today's carries the clock and an older one its date,
   *  because "which day" is the whole question about an entry that is not
   *  today's. */
  const rows = (entries: Entry[]) =>
    entries.map((entry) => (
      <button type="button" class="nutrition-rail-row hit" key={entry.id} onClick={() => setOpen(entry)}>
        <span class="nutrition-rail-when">
          {isToday(entry) ? clockOf(entry.ts, locale) : dayTimeOf(entry.ts, locale)}
        </span>
        <span class="nutrition-rail-what">{mealLine(foodsIn(entry), library)}</span>
      </button>
    ))

  const earlier = past.filter((entry) => !isToday(entry))

  return (
    <main class="nutrition">
      <header class="nutrition-strip">
        <a class="nutrition-back hit" href="#/">
          ← &nbsp;nutrition
        </a>
      </header>

      <section class="nutrition-rail nutrition-rail-page">
        <button type="button" class="nutrition-new hit" onClick={() => setOpen('new')}>
          + new meal
        </button>

        {past.some(isToday) && (
          <>
            <h2 class="nutrition-rail-label">today</h2>
            {rows(past.filter(isToday))}
          </>
        )}

        {earlier.length > 0 && (
          <>
            <h2 class="nutrition-rail-label">earlier</h2>
            {rows(earlier)}
          </>
        )}

        <p class="nutrition-rail-progress">
          {`progress · ${past.length} ${past.length === 1 ? 'meal' : 'meals'}, not enough to draw`}
        </p>
      </section>
    </main>
  )
}

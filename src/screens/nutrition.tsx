import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { newEntry, toIso } from '../data/entry'
import { putEntry, readEntries, readJson, writeJson } from '../data/store'
import type { Food, FoodLibrary } from '../data/food'
import {
  foodLine,
  loadFoods,
  loadLevels,
  nutritionConfig,
  nutritionFor,
  nutritionLine,
  unitOf,
} from '../data/food'
import { Previous, Timestamp, clockOf } from '../components/fields'
import { LibraryPicker } from '../components/library_picker'
import { AmountStepper } from '../components/amount_stepper'
import { LevelControl } from '../components/level_control'
import { registerEditor } from './edit_entry'
import appSeed from '../seed/app.json'
import './nutrition.css'

/** Frame 4c. What was eaten and when, and nothing else: six entries across a
 *  day and one entry across a day are the same shape, so there is no container
 *  around them, no `done`, and no total anywhere on the screen. */

type Logged = { food_id: string; amount: number; level: string }

const loggedIn = (entry: Entry): Logged => entry.payload as Logged

/** A food the library no longer has — renamed on another device, or deleted,
 *  since nothing in a seed is protected. The entry keeps saying what it said;
 *  only the name falls back to the id it was stored under. */
const asFood = (id: string, library: FoodLibrary): Food =>
  library.foods.find((item) => item.id === id) ?? { id, name: id, unit: '', default_level: '' }

/** `2 slices · loaded`, which is the same sentence the rail, `Previous` and the
 *  entry being logged all say. */
const lineOf = (logged: Logged, library: FoodLibrary): string =>
  foodLine(library, asFood(logged.food_id, library), logged.amount, logged.level)

const scaleOf = (): string[] => loadLevels()['nutrition']?.scale ?? []

/** Nutrition's half of frame 4h: the fields it was logged with, so a past entry
 *  is corrected the way it was entered. */
registerEditor('nutrition', (payload, onChange) => {
  const library = loadFoods()
  const logged = payload as Logged
  const food = asFood(logged.food_id, library)
  const { amount_step } = nutritionConfig()

  return (
    <div class="nutrition-edit">
      <h2 class="nutrition-edit-name">{food.name}</h2>

      <label class="nutrition-field">
        <span class="nutrition-label">amount</span>
        <AmountStepper
          value={logged.amount}
          unit={unitOf(library, food, logged.amount)}
          step={amount_step}
          onChange={(amount) => onChange({ ...payload, amount })}
          label="amount"
        />
      </label>

      <div class="nutrition-field">
        <span class="nutrition-label">level</span>
        <LevelControl
          scale={scaleOf()}
          value={logged.level}
          onChange={(level) => onChange({ ...payload, level })}
          examples={food.examples}
          label="level"
        />
      </div>
    </div>
  )
})

export function Nutrition(): VNode {
  const { locale } = readJson('config/app.json', appSeed)
  const config = nutritionConfig()
  const library = loadFoods()
  const scale = scaleOf()

  const [ts, setTs] = useState(() => toIso(new Date()))
  const [picked, setPicked] = useState<Logged | null>(null)
  const [past, setPast] = useState(() => readEntries('nutrition'))

  const today = new Date().toDateString()
  const isToday = (entry: Entry) => new Date(entry.ts).toDateString() === today

  const start = (food_id: string) => {
    const food = asFood(food_id, library)
    setPicked({ food_id, amount: config.amount_start, level: food.default_level })
  }

  /** What was typed to filter is the new food's name. Its unit and its opening
   *  level come from config rather than from a choice made here — a food added
   *  mid-log is one press, and both are editable afterwards. */
  const create = (name: string) => {
    const food: Food = { id: crypto.randomUUID(), name, ...config.new_food }
    writeJson('library/foods.json', { ...library, foods: [...library.foods, food] })
    start(food.id)
  }

  /** One action, because nothing contains an entry: logging always lands back
   *  at the picker, which is what frame 4c's second press would have done. */
  const log = () => {
    if (picked === null) return
    putEntry(newEntry('nutrition', { ...picked }, ts))
    setPast(readEntries('nutrition'))
    setPicked(null)
    setTs(toIso(new Date()))
  }

  /** Scoped to the food, not to the day: the last time *this* was logged,
   *  however long ago. */
  const previousOf = (food_id: string): Entry | null =>
    past.find((entry) => loggedIn(entry).food_id === food_id) ?? null

  const food = picked === null ? null : asFood(picked.food_id, library)
  const nutrition = picked === null || food === null ? null : nutritionFor(food, picked.amount, picked.level)

  return (
    <main class="nutrition">
      <header class="nutrition-strip">
        <a class="nutrition-back hit" href="#/">
          ← &nbsp;nutrition
        </a>
        <Timestamp value={ts} onChange={setTs} locale={locale} />
      </header>

      <div class="nutrition-split">
        <section class="nutrition-rail">
          <h2 class="nutrition-rail-label">today</h2>
          {/* a flat timeline, newest first — no grouping, no header per part of
              the day, and it simply gets longer */}
          {/* `readEntries` already hands these back newest first */}
          {past
            .filter(isToday)
            .map((entry) => (
              <a class="nutrition-rail-row hit" key={entry.id} href={`#/entry/${entry.id}`}>
                <span class="nutrition-rail-when">{clockOf(entry.ts, locale)}</span>
                <span class="nutrition-rail-what">
                  {`${asFood(loggedIn(entry).food_id, library).name} · ${lineOf(loggedIn(entry), library)}`}
                </span>
              </a>
            ))}

          <p class="nutrition-rail-progress">
            {`progress · ${past.length} ${past.length === 1 ? 'entry' : 'entries'}, not enough to draw`}
          </p>
        </section>

        <section class="nutrition-fields">
          {picked === null || food === null ? (
            <>
              <h1 class="nutrition-title">food</h1>
              {/* drinks are foods: coffee and beer are in the same library, and
                  the screen's language is about entries rather than eating */}
              <LibraryPicker
                items={library.foods.map((item) => ({ id: item.id, name: item.name, hint: item.unit }))}
                onPick={start}
                onNew={create}
                newLabel="+ new food"
              />
            </>
          ) : (
            <>
              <div class="nutrition-head">
                <h1 class="nutrition-title">{food.name}</h1>
                {/* the wrong food is picked by the same one press that picks
                    the right one, so getting back is one too */}
                <button type="button" class="nutrition-change hit" onClick={() => setPicked(null)}>
                  change
                </button>
              </div>

              <Previous
                entry={previousOf(picked.food_id)}
                locale={locale}
                render={(entry) => lineOf(loggedIn(entry), library)}
              />

              <div class="nutrition-row">
                <label class="nutrition-field">
                  <span class="nutrition-label">amount</span>
                  {/* keyed on the food: the box holds what was typed, and
                      picking a different food is a different number */}
                  <AmountStepper
                    key={picked.food_id}
                    value={picked.amount}
                    unit={unitOf(library, food, picked.amount)}
                    step={config.amount_step}
                    onChange={(amount) => setPicked({ ...picked, amount })}
                    label="amount"
                  />
                </label>

                {nutrition !== null && nutritionLine(nutrition) !== '' && (
                  <div class="nutrition-field">
                    <span class="nutrition-label">this entry</span>
                    {/* per entry, and never summed across a day or a week */}
                    <span class="nutrition-numbers">{nutritionLine(nutrition)}</span>
                  </div>
                )}
              </div>

              <div class="nutrition-field">
                <span class="nutrition-label">level</span>
                <LevelControl
                  scale={scale}
                  value={picked.level}
                  onChange={(level) => setPicked({ ...picked, level })}
                  examples={food.examples}
                  label="level"
                />
              </div>
            </>
          )}

          <div class="nutrition-actions">
            <button type="button" class="nutrition-log hit" disabled={picked === null} onClick={log}>
              log it
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

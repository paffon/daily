import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { newEntry, toIso } from '../data/entry'
import { deleteEntry, putEntry, readEntries, readJson, updateEntry } from '../data/store'
import type { Food, FoodLibrary, Logged } from '../data/food'
import {
  asFood,
  commentOf,
  editFood,
  foodsIn,
  foodsOf,
  loadFoods,
  loadLevels,
  nutritionConfig,
  nutritionFor,
  nutritionLine,
  unitOf,
  unitsIn,
  usedBy,
  writeFoods,
} from '../data/food'
import { Comment, Danger, Previous, Timestamp, clockOf, dayTimeOf } from '../components/fields'
import { DeleteRefused } from '../components/delete_refused'
import { FoodFacts } from '../components/food_facts'
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

/* `Logged`, `foodsOf` and their family live in `src/data/food.ts` since the
   export needed them too — the payload key lives with the type it names. */

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

            <Comment
              value={commentOf(logged)}
              onChange={(comment) => write(at, { ...logged, comment })}
            />
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
  /** Every stored meal, frozen at mount — what a library delete is refused
   *  against, and what the refusal names as links. */
  const [history] = useState(() => readEntries('nutrition'))
  /** The meal being corrected cannot be its own previous. It is still in
   *  `history`, because its reference to a food is as real as any other
   *  meal's. */
  const past = history.filter((line) => line.id !== entry?.id)
  /** Bumped when the library is written, since `library` above is read on
   *  render and nothing else here would ask for a fresher one. */
  const [, changed] = useState(0)
  /** Whether the food's own numbers and level prose are open. Shut on arrival,
   *  because the fast path is a name, an amount and a press — and it stays as
   *  it was left while the meal is built, since a meal of six new foods is one
   *  decision about typing numbers, not six. */
  const [facts, setFacts] = useState(false)

  const write = (next: Logged) => setMeal(meal.map((food, i) => (i === at ? next : food)))

  /** Against a fresh read, never against `library` above: a food made by the
   *  press before this one is not in the copy this render was built from, and
   *  `asFood`'s fallback would hand back a blank `default_level` — which is
   *  what the new food was then logged with, permanently and invisibly. */
  const start = (food_id: string) => {
    const food = asFood(food_id, loadFoods())
    setMeal([...meal, { food_id, amount: config.amount_start, level: food.default_level }])
    setAt(meal.length)
    setPicking(false)
  }

  /** What was typed to filter is the new food's name. Its unit and its opening
   *  level come from config rather than from a choice made here — a food added
   *  mid-meal is one press — and the head above the amount is where the unit is
   *  answered, since a blank one is the field a food made this way otherwise
   *  keeps forever. The numbers and the level prose are the library screen's,
   *  and nothing about them belongs in the middle of a meal. */
  const create = (name: string) => {
    const food: Food = { id: crypto.randomUUID(), name, ...config.new_food }
    writeFoods((held) => [...held.foods, food])
    changed((n) => n + 1)
    start(food.id)
  }

  /** Nothing in a seed list is protected while nothing references it —
   *  `DESIGN.md` §7. The picker asks `blocked` before it ever gets here, so
   *  what reaches this is a food no stored meal names. The library loses the
   *  name and the log keeps its numbers: an entry naming a removed food still
   *  renders through `asFood`'s fallback. */
  const remove = (id: string) => {
    writeFoods((held) => held.foods.filter((item) => item.id !== id))
    changed((n) => n + 1)
  }

  /** The library edited from the screen that logs it, the way a workout's
   *  header edits an exercise. A rename reaches every meal that ever held the
   *  food for free — an entry stores the id and `asFood` resolves the name at
   *  read time — and the unit reaches them too, since it belongs to the food
   *  and is never chosen per entry. Correcting `2 · normal` to `2 slices ·
   *  normal` months later is that one box. */
  const edit = (id: string, patch: Partial<Food>) => {
    writeFoods((held) => held.foods.map((item) => (item.id === id ? { ...item, ...patch } : item)))
    changed((n) => n + 1)
  }

  /** What stands in the way of removing this food, or nothing. Fed from
   *  `history` rather than `past`: the meal being corrected holds a reference
   *  as real as any other's, and letting it through would delete a food the
   *  screen is showing the amount of. */
  const blocked = (id: string) => {
    const used = usedBy(id, history)
    if (used.length === 0) return null
    return (
      <DeleteRefused
        used={used}
        one="a meal"
        many="meals"
        name={asFood(id, library).name}
        locale={locale}
        onRename={(name) => edit(id, { name })}
      />
    )
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
                blocked={blocked}
                newLabel="+ new food"
              />
            </>
          ) : (
            <>
              <div class="nutrition-head">
                {/* the heading is the name box: what is shown and what is
                    edited are one thing, so the screen cannot hold two names
                    that disagree between a keystroke and a blur. Committed on
                    change rather than on input, so no render happens while it
                    is being typed into.

                    A blank puts the old name back by hand rather than leaving
                    it to the controlled value: refusing writes nothing, so
                    nothing re-renders, and the box would otherwise sit there
                    empty while the library still holds the name. */}
                <input
                  class="nutrition-title nutrition-name"
                  type="text"
                  aria-label="name"
                  value={food.name}
                  onChange={(e) => {
                    const next = e.currentTarget.value.trim()
                    if (next === '') e.currentTarget.value = food.name
                    else edit(food.id, { name: next })
                  }}
                />
                {/* the unit belongs to the food and is never chosen per entry,
                    so a food made mid-meal keeps the blank one config gave it
                    until it is answered — and blank is a real answer, the one
                    an apple wants. The units already in use are offered; a new
                    one is still typeable. */}
                <input
                  class="nutrition-unit hit"
                  type="text"
                  aria-label="unit"
                  placeholder="unit"
                  list="nutrition-units"
                  value={food.unit}
                  onChange={(e) => edit(food.id, { unit: e.currentTarget.value.trim() })}
                />
                <datalist id="nutrition-units">
                  {unitsIn(library).map((unit) => (
                    <option value={unit} key={unit} />
                  ))}
                </datalist>
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
                  if (last === undefined) return null
                  return (
                    <>
                      {lineOf(last, library)}
                      {/* what was written about it last time, in the words it
                          was written in — `RULES.md` asks `Previous` for the
                          numbers *and* the comment */}
                      {commentOf(last) !== '' && (
                        <q class="field-previous-comment">{commentOf(last)}</q>
                      )}
                    </>
                  )
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

                {/* the line that shows the numbers is the way to write them:
                    the moment a food is invented is the moment its numbers are
                    known, and sending that press to another screen would lose
                    the meal being built. A food with none offers the way in
                    rather than saying nothing at all, which is what left a
                    just-made food with nowhere to type. */}
                <div class="nutrition-field">
                  <span class="nutrition-label">this food</span>
                  {nutrition !== null && nutritionLine(nutrition) !== '' ? (
                    /* per food, and never summed across the meal or the day */
                    <button
                      type="button"
                      class="nutrition-numbers hit"
                      aria-expanded={facts}
                      onClick={() => setFacts(!facts)}
                    >
                      {nutritionLine(nutrition)}
                    </button>
                  ) : (
                    <button
                      type="button"
                      class="nutrition-facts-open hit"
                      aria-expanded={facts}
                      onClick={() => setFacts(!facts)}
                    >
                      + numbers
                    </button>
                  )}
                </div>
              </div>

              {facts && (
                <FoodFacts
                  food={food}
                  scale={scale}
                  onEdit={(change) => {
                    editFood(food.id, change)
                    changed((n) => n + 1)
                  }}
                />
              )}

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

              <Comment
                value={commentOf(current)}
                onChange={(comment) => write({ ...current, comment })}
              />
            </>
          )}
        </section>

        {/* last in the column, under the meal it ends — reading the meal and
            then ending it is the order the press happens in. It stays stuck to
            the bottom edge while the list above it scrolls, so a long meal
            never puts its own end out of reach. */}
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

        {/* the library's own door, opened from here rather than from home, the
            way workout opens the exercises one: filling in a food's numbers
            used to mean starting a meal you did not intend to log (§7) */}
        <a class="nutrition-library" href="#/foods">
          foods &nbsp;→
        </a>
      </section>
    </main>
  )
}

import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Food } from '../data/food'
import { editFood, loadFoods, loadLevels, notesOf, said, unitsIn, usedBy, writeFoods } from '../data/food'
import { readEntries, readJson } from '../data/store'
import { DeleteRefused } from '../components/delete_refused'
import { ItemPhoto } from '../components/item_photo'
import { Segmented } from '../components/segmented'
import appSeed from '../seed/app.json'
import './foods.css'

/** The food library's own screen — `DESIGN.md` §7, which said foods would take
 *  this shape when they were asked for. They were, on 2026-08-08. Inline at the
 *  point of logging stays and is still the fast path; this is the slow one, for
 *  filling in a food you are not currently eating.
 *
 *  It draws every field a food has, which since the numbers went is four of
 *  them: the name, the unit, the level it opens at, and the note. The meal
 *  builder draws three of the four — a food is small enough now that it can
 *  hold nearly the whole of one — and leaves the opening level here, because
 *  the meal is choosing a level of its own a line below it.
 *
 *  It is opened from the nutrition module's list rather than from home, the way
 *  the exercise library is opened from workout's. Segments still have no door.
 *
 *  There is no `+ new food`. §7 keeps making one where it is logged, which is
 *  the only place a new food immediately matters, and the note at the foot says
 *  so. */
export function Foods(): VNode {
  const locale = readJson('config/app.json', appSeed).locale
  const library = loadFoods()
  const scale = loadLevels()['nutrition']?.scale ?? []
  /** Every stored meal, frozen at mount — what a delete is refused against, and
   *  what the refusal names as links. */
  const [history] = useState(() => readEntries('nutrition'))
  /** One row open at a time — the fields are tall, and two open panels put the
   *  second one's name off the screen it is being compared with. */
  const [open, setOpen] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  /** The one row whose delete has been pressed once. Two presses instead of a
   *  modal, the same shape as `Danger` — and never `--danger` itself, which
   *  stays with `delete this entry` alone. */
  const [armed, setArmed] = useState('')
  const [, wrote] = useState(0)

  const edit = (id: string, patch: Partial<Food>) => {
    editFood(id, (item) => ({ ...item, ...patch }))
    wrote((n) => n + 1)
  }

  const remove = (id: string) => {
    writeFoods((held) => held.foods.filter((item) => item.id !== id))
    setArmed('')
    setOpen(null)
    wrote((n) => n + 1)
  }

  /* the same substring the picker filters on, over the name and the unit,
     narrowing the list without reordering it — a catalog is read in the order
     it is offered in */
  const needle = typed.trim().toLowerCase()
  const shown = library.foods.filter((item) =>
    `${item.name} ${item.unit}`.toLowerCase().includes(needle),
  )

  const units = unitsIn(library)

  return (
    <main class="foods">
      <header class="foods-strip">
        <a class="foods-back hit" href="#/nutrition">
          ← &nbsp;foods
        </a>
      </header>

      <div class="foods-body">
        <input
          class="foods-filter"
          type="search"
          aria-label="filter"
          placeholder="find one"
          value={typed}
          onInput={(e) => {
            setTyped(e.currentTarget.value)
            setArmed('')
          }}
        />

        <section class="foods-list">
          {shown.map((item) => {
            const used = usedBy(item.id, history)
            return (
              <div class="foods-item" key={item.id}>
                <button
                  type="button"
                  class="foods-row hit"
                  onClick={() => {
                    setArmed('')
                    setOpen(open === item.id ? null : item.id)
                  }}
                >
                  <span class="foods-name">{item.name}</span>
                  <span class="foods-unit">{item.unit}</span>
                </button>

                {open === item.id && (
                  <div class="foods-fields">
                    <label class="foods-field">
                      <span class="foods-field-label">name</span>
                      {/* uncontrolled: the panel re-renders as soon as the
                          library is written, and a controlled box would take
                          what was half-typed with it */}
                      <input
                        type="text"
                        aria-label={`name of ${item.name}`}
                        defaultValue={item.name}
                        onChange={(e) => {
                          const next = e.currentTarget.value.trim()
                          /* refusing writes nothing, so nothing re-renders and
                             the box would sit blank over a library that still
                             holds the name — it is put back by hand */
                          if (next === '') e.currentTarget.value = item.name
                          else edit(item.id, { name: next })
                        }}
                      />
                    </label>

                    <label class="foods-field">
                      <span class="foods-field-label">unit</span>
                      {/* the units already in use are offered and a new one is
                          still typeable; blank is a real answer, and it is what
                          an apple wants — `1`, not `1 piece` */}
                      <input
                        type="text"
                        aria-label={`unit of ${item.name}`}
                        placeholder="blank — it counts as itself"
                        list="foods-units"
                        value={item.unit}
                        onChange={(e) => edit(item.id, { unit: e.currentTarget.value.trim() })}
                      />
                    </label>

                    <div class="foods-field">
                      <span class="foods-field-label">opens at</span>
                      <Segmented
                        options={scale.map((level) => ({ value: level }))}
                        value={item.default_level}
                        onChange={(level) => edit(item.id, { default_level: level })}
                        tone="ink-select"
                        label={`default level of ${item.name}`}
                      />
                    </div>

                    <label class="foods-field foods-prose">
                      <span class="foods-field-label">about this food</span>
                      {/* what the numbers used to be for. One sentence about
                          the food itself — what it is, and what its levels
                          mean for it — written once here or where it is
                          logged, and read by every meal that holds it */}
                      <input
                        type="text"
                        aria-label={`about ${item.name}`}
                        placeholder="what it is, and what its levels mean for it"
                        value={notesOf(item)}
                        onChange={(e) => edit(item.id, { notes: said(e.currentTarget.value) })}
                      />
                    </label>

                    <ItemPhoto kind="food" id={item.id} name={item.name} />

                    <button
                      type="button"
                      class={armed === item.id ? 'foods-remove armed hit' : 'foods-remove hit'}
                      onClick={() => {
                        if (used.length > 0) {
                          setArmed(`refused:${item.id}`)
                          return
                        }
                        if (armed !== item.id) {
                          setArmed(item.id)
                          return
                        }
                        remove(item.id)
                      }}
                    >
                      {armed === item.id ? 'press again' : 'remove from the library'}
                    </button>

                    {armed === `refused:${item.id}` && (
                      <DeleteRefused
                        used={used}
                        one="a meal"
                        many="meals"
                        name={item.name}
                        locale={locale}
                        onRename={(name) => edit(item.id, { name })}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </section>

        <datalist id="foods-units">
          {units.map((unit) => (
            <option value={unit} key={unit} />
          ))}
        </datalist>

        <p class="foods-note">
          A new food is made where it is logged — the picker inside a meal names it as you type. This
          screen is for filling one in afterwards, and a rename here reaches every meal that ever
          used it.
        </p>
      </div>
    </main>
  )
}

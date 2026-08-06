import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Exercise } from '../data/exercise'
import {
  byStaleness,
  lastUsedAt,
  loadExercises,
  usedBy,
  writeExercises,
} from '../data/exercise'
import { readEntries, readJson } from '../data/store'
import { DeleteRefused } from '../components/delete_refused'
import { ItemPhoto } from '../components/item_photo'
import appSeed from '../seed/app.json'
import './exercises.css'

/** The exercise library's own screen — `DESIGN.md` §7. Inline at the point of
 *  logging stays and is still the fast path, but it was the *only* way to reach
 *  an item, so correcting a name meant starting a workout you did not intend to
 *  log. This is the slow path: a list you fix things in.
 *
 *  It is opened from the workout module's list rather than from home. Foods and
 *  segments have the same problem and will take the same shape when they are
 *  asked for; nothing here is built for them yet.
 *
 *  There is no `+ new exercise`. §7 keeps making one where it is logged, which
 *  is the only place a new exercise immediately matters, and the note at the
 *  foot says so. */
export function Exercises(): VNode {
  const locale = readJson('config/app.json', appSeed).locale
  const library = loadExercises()
  /** Frozen at mount, the same as the picker's: an order that reshuffles while
   *  a name is being corrected would move the row out from under the hand. */
  const [history] = useState(() => readEntries('workout'))
  const [lastUsed] = useState(() => lastUsedAt(history))
  /** One row open at a time — the fields are tall, and two open panels put the
   *  second one's name off the screen it is being compared with. */
  const [open, setOpen] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  /** The one row whose delete has been pressed once. Two presses instead of a
   *  modal, the same shape as `Danger` — and never `--danger` itself, which
   *  stays with `delete this entry` alone. */
  const [armed, setArmed] = useState('')
  const [, wrote] = useState(0)

  const edit = (id: string, patch: Partial<Exercise>) => {
    writeExercises((held) =>
      held.exercises.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
    wrote((n) => n + 1)
  }

  const remove = (id: string) => {
    writeExercises((held) => held.exercises.filter((item) => item.id !== id))
    setArmed('')
    setOpen(null)
    wrote((n) => n + 1)
  }

  /* the same substring the picker filters on, over the name and the body part,
     narrowing the list without reordering it (§8.1) */
  const needle = typed.trim().toLowerCase()
  const shown = byStaleness(library.exercises, lastUsed).filter((item) =>
    `${item.name} ${item.body_part}`.toLowerCase().includes(needle),
  )

  /** What the library already calls a body part, offered rather than enforced. */
  const bodyParts = [
    ...new Set(library.exercises.map((item) => item.body_part).filter((part) => part !== '')),
  ].sort()

  return (
    <main class="exercises">
      <header class="exercises-strip">
        <a class="exercises-back hit" href="#/workout">
          ← &nbsp;exercises
        </a>
      </header>

      <div class="exercises-body">
        <input
          class="exercises-filter"
          type="search"
          aria-label="filter"
          placeholder="find one"
          value={typed}
          onInput={(e) => {
            setTyped(e.currentTarget.value)
            setArmed('')
          }}
        />

        <section class="exercises-list">
          {shown.map((item) => {
            const used = usedBy(item.id, history)
            return (
              <div class="exercises-item" key={item.id}>
                <button
                  type="button"
                  class="exercises-row hit"
                  onClick={() => {
                    setArmed('')
                    setOpen(open === item.id ? null : item.id)
                  }}
                >
                  <span class="exercises-name">{item.name}</span>
                  <span class="exercises-part">{item.body_part}</span>
                </button>

                {open === item.id && (
                  <div class="exercises-fields">
                    <label class="exercises-field">
                      <span class="exercises-field-label">name</span>
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

                    <label class="exercises-field">
                      <span class="exercises-field-label">kind</span>
                      <select
                        aria-label={`kind of ${item.name}`}
                        value={item.kind}
                        onChange={(e) => edit(item.id, { kind: e.currentTarget.value })}
                      >
                        {Object.keys(library.kinds).map((kind) => (
                          <option value={kind} key={kind}>
                            {kind}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label class="exercises-field">
                      <span class="exercises-field-label">body part</span>
                      <input
                        type="text"
                        aria-label={`body part of ${item.name}`}
                        list="exercises-body-parts"
                        value={item.body_part}
                        onChange={(e) =>
                          edit(item.id, { body_part: e.currentTarget.value.trim() })
                        }
                      />
                    </label>

                    <ItemPhoto kind="exercise" id={item.id} name={item.name} />

                    <button
                      type="button"
                      class={
                        armed === item.id ? 'exercises-remove armed hit' : 'exercises-remove hit'
                      }
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

        <datalist id="exercises-body-parts">
          {bodyParts.map((part) => (
            <option value={part} key={part} />
          ))}
        </datalist>

        <p class="exercises-note">
          A new exercise is made where it is logged — the picker inside a workout names it as you
          type. This screen is for correcting one afterwards, and a rename here reaches every
          workout that ever used it.
        </p>
      </div>
    </main>
  )
}

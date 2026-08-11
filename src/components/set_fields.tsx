import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import type { Exercise, Field } from '../data/exercise'
import {
  fieldNamesIn,
  fieldPalette,
  fieldsFor,
  kindOf,
  loadExercises,
  unitsFor,
} from '../data/exercise'
import { dayTimeOf } from './fields'
import './set_fields.css'

/** A unit nobody typed, said in words — the blank one `reps` and `count` want,
 *  which reads as nothing at all in a sentence about what a set will say. */
const said = (unit: string) => (unit === '' ? 'no unit' : unit)

/** The field list, picked directly — `DESIGN.md` §8.1: kinds are a starting
 *  point, and the field list of any individual exercise is editable. The row is
 *  read off the kinds map and off what this exercise already records, so it
 *  grows with the library and is never a list written in source (§11).
 *
 *  A list that lands exactly on a kind's is recorded as the kind, not as a
 *  copy — a copy would stop following the kind when the kind is edited.
 *  Anything else is the exercise's own `fields`. The patch is handed back
 *  rather than written, because both screens that show this write the library
 *  through wrappers of their own.
 *
 *  A field's unit is typed, not only chosen (2026-08-11) — the row below the
 *  chips sets or changes one, which is also how a wholly new field is added:
 *  a parameter that used to have nowhere to go but a comment, like how far the
 *  feet are raised on a push-up, is now a field the moment it is worth
 *  comparing over time. */
export function SetFields({
  exercise,
  used,
  locale,
  onChange,
}: {
  exercise: Exercise
  /** The workouts that already logged this exercise. A unit is resolved at
   *  read time — every screen calls `fieldsFor`, the report included — so
   *  changing one restates every set in them, and this is what lets the
   *  change name them before it goes through. Passed rather than defaulted,
   *  including the empty list an exercise being made inline hands over: a
   *  default here would be this file guessing at another screen's history. */
  used: Entry[]
  locale: string
  onChange: (patch: Partial<Exercise>) => void
}): VNode {
  /* one read per render, which is the mirror rather than the network, and the
     same shape every other screen in the app uses (§7) */
  const library = loadExercises()
  const kinds = library.kinds
  const chosen = fieldsFor(exercise)
  const [typedName, setTypedName] = useState('')
  const [typedUnit, setTypedUnit] = useState('')

  /** What a field's unit was when it was last switched off, so switching it
   *  back on restores it rather than handing back the palette's default: the
   *  seeded rowing machine counts metres and every kind counts kilometres, and
   *  a round trip through the chip used to silently make its history 1000×
   *  what it says. */
  const [recent, setRecent] = useState<Record<string, Field>>({})

  /** A unit change over an exercise history already depends on, held until it
   *  is confirmed. Null the rest of the time, which is almost always. */
  const [pending, setPending] = useState<{
    next: Field[]
    name: string
    from: string
    to: string
  } | null>(null)

  /** Case-insensitive, because the name is a key on every set row and `reps`
   *  beside `REPS` is two columns that read as one. */
  const heldField = (name: string) =>
    chosen.find((field) => field.name.toLowerCase() === name.toLowerCase())

  /** What this exercise already records comes first, whether or not any kind
   *  declares it — a field typed fresh for one exercise, with no kind behind
   *  it at all, still has to be offered back once it is chosen. */
  const palette = fieldPalette(kinds)
  const offers = [
    ...palette,
    ...chosen.filter((field) => !palette.some((offer) => offer.name === field.name)),
  ]

  const commit = (next: Field[]) => {
    const kind = kindOf(kinds, next)
    onChange(kind === null ? { fields: next } : { kind, fields: undefined })
  }

  const apply = (next: Field[]) => {
    commit(next)
    setPending(null)
    setTypedName('')
    setTypedUnit('')
  }

  /** Off is out, and remembers the unit it went out with; on is that unit
   *  again, or the palette's default the first time. Changing a unit outright
   *  is the row below, never this — a chip is a name, and the same name never
   *  draws two columns since a set row keys its values by it alone. */
  const toggle = (offer: Field) => {
    const held = heldField(offer.name)
    if (held !== undefined) {
      setRecent({ ...recent, [offer.name]: held })
      commit(chosen.filter((field) => field.name !== held.name))
      return
    }
    commit([...chosen, recent[offer.name] ?? offer])
  }

  const addOrUpdate = () => {
    /* lower case on the way in: every name in the seeded kinds map is lower
       case, and the box is free text */
    const name = typedName.trim().toLowerCase()
    if (name === '') return
    const unit = typedUnit.trim()
    const held = heldField(name)
    const next =
      held === undefined
        ? [...chosen, { name, unit }]
        : chosen.map((field) => (field === held ? { ...field, unit } : field))

    /* a set stores its number under the field's name and nothing else, so a
       unit changed here changes what every set already logged says — 45 s
       starts reading 45 min. The workouts holding them are named first, the
       way a refused delete names them (§7), rather than the change going
       through quietly and the log asserting something it never observed. */
    if (held !== undefined && held.unit !== unit && used.length > 0) {
      setPending({ next, name, from: held.unit, to: unit })
      return
    }
    apply(next)
  }

  return (
    <div class="set-fields">
      <div class="set-fields-row" role="group" aria-label="a set records">
        {offers.map((offer) => {
          const held = heldField(offer.name)
          const shown = held ?? offer
          return (
            <button
              type="button"
              class="set-fields-choice hit"
              key={offer.name}
              aria-label={`${shown.name} ${shown.unit}`.trim()}
              aria-pressed={held !== undefined}
              onClick={() => toggle(offer)}
            >
              {shown.name}
              {shown.unit !== '' && <span class="set-fields-unit">{shown.unit}</span>}
            </button>
          )
        })}
      </div>

      {/* set or change a unit, or add a field no kind declares yet — the same
          free-typed-with-suggestions shape a food's own unit already uses
          (§8.2), so nothing about a field's name or unit is a fixed set */}
      <div class="set-fields-add">
        <input
          type="text"
          class="set-fields-add-name hit"
          aria-label="new field name"
          placeholder="field"
          list="set-fields-names"
          value={typedName}
          onInput={(e) => setTypedName(e.currentTarget.value)}
        />
        <input
          type="text"
          class="set-fields-add-unit hit"
          aria-label="new field unit"
          placeholder="unit"
          list="set-fields-units"
          value={typedUnit}
          onInput={(e) => setTypedUnit(e.currentTarget.value)}
        />
        <button
          type="button"
          class="set-fields-add-press hit"
          disabled={typedName.trim() === ''}
          onClick={addOrUpdate}
        >
          + field
        </button>
        {/* the chips above already offer every name the kinds declare, so this
            list earns its place on one case only, and it is the case the typed
            row exists for: a field invented on another exercise — `raise` on a
            raised push-up — reused here without being retyped from nothing */}
        <datalist id="set-fields-names">
          {fieldNamesIn(library).map((name) => (
            <option value={name} key={name} />
          ))}
        </datalist>
        <datalist id="set-fields-units">
          {unitsFor(library, typedName.trim().toLowerCase()).map((unit) => (
            <option value={unit} key={unit} />
          ))}
        </datalist>
      </div>

      {/* not a refusal — the change is allowed, and §7's shape is borrowed
          because the point is the same: name what depends on this before
          touching it, and let the numbers be looked at first */}
      {pending !== null && (
        <div class="set-fields-restate">
          <p class="set-fields-restate-line">
            {`${pending.name} is in ${
              used.length === 1 ? 'one workout' : `${used.length} workouts`
            } already — every set there keeps its number and starts reading ${said(
              pending.to,
            )} rather than ${said(pending.from)}`}
          </p>

          <div class="set-fields-restate-links">
            {used.map((entry) => (
              <a class="set-fields-restate-link hit" key={entry.id} href={`#/entry/${entry.id}`}>
                {dayTimeOf(entry.ts, locale)}
              </a>
            ))}
          </div>

          <div class="set-fields-restate-press">
            <button
              type="button"
              class="set-fields-restate-go hit"
              onClick={() => apply(pending.next)}
            >
              change it anyway
            </button>
            <button
              type="button"
              class="set-fields-restate-stop hit"
              onClick={() => setPending(null)}
            >
              leave it
            </button>
          </div>
        </div>
      )}

      {/* the grammar of the choice, not discoverable from the chips alone — a
          field is for comparison, a comment is for memory (§8.1) */}
      <p class="set-fields-note">
        a field is a box on every set row, for what is worth comparing over time. add one above, or
        type a name and a unit below for something no kind declares yet — how far the feet are
        raised, on a raised push-up. anything left one-off still belongs in the comment.
      </p>
    </div>
  )
}

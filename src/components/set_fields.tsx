import type { VNode } from 'preact'
import type { Exercise, Field } from '../data/exercise'
import { fieldPalette, fieldsFor, kindOf, loadExercises } from '../data/exercise'
import './set_fields.css'

/** The field list, picked directly — `DESIGN.md` §8.1: kinds are a starting
 *  point, and the field list of any individual exercise is editable. The row is
 *  read off the kinds map and off what this exercise already records, so it
 *  grows with the library and is never a list written in source (§11).
 *
 *  A list that lands exactly on a kind's is recorded as the kind, not as a
 *  copy — a copy would stop following the kind when the kind is edited.
 *  Anything else is the exercise's own `fields`. The patch is handed back
 *  rather than written, because both screens that show this write the library
 *  through wrappers of their own. */
export function SetFields({
  exercise,
  onChange,
}: {
  exercise: Exercise
  onChange: (patch: Partial<Exercise>) => void
}): VNode {
  const kinds = loadExercises().kinds
  const chosen = fieldsFor(exercise)

  const held = (offer: Field) =>
    chosen.some((field) => field.name === offer.name && field.unit === offer.unit)

  /** What this exercise already records comes first, whether or not any kind
   *  declares it — the seeded `rowing machine` records `distance m` and every
   *  kind measures distance in km. Off the palette it would draw a column no
   *  chip was pressed for, and pressing the km chip would take the same-name
   *  branch below and quietly rewrite the unit with no way back. */
  const palette = fieldPalette(kinds)
  const offers = [
    ...palette,
    ...chosen.filter(
      (field) => !palette.some((offer) => offer.name === field.name && offer.unit === field.unit),
    ),
  ]

  /** Off is out; on replaces a field of the same name — two columns cannot
   *  share one, since a set row keys its values by it, so seconds shoulder
   *  minutes aside — and otherwise joins at the end: the order of the row is
   *  the order it was picked in. */
  const toggle = (offer: Field) => {
    const next = held(offer)
      ? chosen.filter((field) => !(field.name === offer.name && field.unit === offer.unit))
      : chosen.some((field) => field.name === offer.name)
        ? chosen.map((field) => (field.name === offer.name ? offer : field))
        : [...chosen, offer]
    const kind = kindOf(kinds, next)
    onChange(kind === null ? { fields: next } : { kind, fields: undefined })
  }

  return (
    <div class="set-fields">
      <div class="set-fields-row" role="group" aria-label="a set records">
        {offers.map((offer) => (
          <button
            type="button"
            class="set-fields-choice hit"
            key={`${offer.name} ${offer.unit}`}
            aria-label={`${offer.name} ${offer.unit}`.trim()}
            aria-pressed={held(offer)}
            onClick={() => toggle(offer)}
          >
            {offer.name}
            {offer.unit !== '' && <span class="set-fields-unit">{offer.unit}</span>}
          </button>
        ))}
      </div>
      {/* the grammar of the choice, not discoverable from the chips alone — a
          field is for comparison, a comment is for memory (§8.1) */}
      <p class="set-fields-note">
        a field is a box on every set row, for what is worth comparing over time — a one-off detail
        goes in the comment instead.
      </p>
    </div>
  )
}

import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Exercise, SetRow } from '../data/exercise'
import { fieldsFor, loadExercises, parseMark } from '../data/exercise'
import { Segmented } from './segmented'
import './set_table.css'

/** Frame 4b's set table. Which columns it draws comes from the exercise's
 *  field list and from nowhere else — a weight box never appears for running
 *  because `distance` declares no weight, not because this file knows what
 *  running is.
 *
 *  The number of sets is not a field: `+ set` appends a copy of the row above,
 *  so three sets at one weight cost three taps rather than nine numbers. */
export function SetTable({
  exercise,
  sets,
  onChange,
}: {
  exercise: Exercise
  sets: SetRow[]
  onChange: (sets: SetRow[]) => void
}): VNode {
  const fields = fieldsFor(exercise)
  const marks = loadExercises().marks
  /** What a number with no sign after it means, and what a row starts at. */
  const same = parseMark('').mark

  /** A row is flat, so a spread copies it whole. */
  const blank = (): SetRow => ({
    ...Object.fromEntries(fields.map((field) => [field.name, null])),
    mark: same,
  })

  /** An exercise just picked has no rows yet, and the first number needs
   *  somewhere to go — so one blank row is always drawn, and typing into it is
   *  what makes it real. */
  const rows = sets.length === 0 ? [blank()] : sets

  const write = (at: number, row: SetRow) => onChange(rows.map((s, i) => (i === at ? row : s)))

  /** Bumped on every removal, and part of each row's key. The boxes are
   *  uncontrolled, so dropping set 2 of 3 would otherwise leave set 3's typed
   *  text sitting in the box that is now set 2 — the rows below it shift up in
   *  the state but not in the DOM. A new generation rebuilds them all from what
   *  the state now says. */
  const [gen, setGen] = useState(0)

  /** Removing the only row clears it: `+ set` put it there, so taking it back
   *  out is the same gesture, and a row typed into by mistake needs undoing
   *  whether or not it is the first. */
  const drop = (at: number) => {
    setGen(gen + 1)
    onChange(rows.filter((_, i) => i !== at))
  }

  return (
    <div class="sets">
      <div class="set-head">
        <span class="set-index">set</span>
        {fields.map((field) => (
          <span class="set-cell" key={field.name}>
            {field.name}
          </span>
        ))}
        <span class="set-next">next time</span>
      </div>

      {rows.map((row, at) => (
        <div class="set-row" key={`${gen}:${at}`}>
          <span class="set-index">{at + 1}</span>

          {fields.map((field, column) => (
            <label class="set-cell" key={field.name}>
              {/* uncontrolled: the row holds the parsed number, and writing it
                  back mid-keystroke would eat the dot as `47.` parses to 47 */}
              {/* text, not a decimal keypad: the phone must still offer the
                  signs the fast input is typed with */}
              <input
                class={field.optional ? 'set-input set-input-optional' : 'set-input'}
                type="text"
                aria-label={`set ${at + 1} ${field.name}`}
                defaultValue={row[field.name] === null ? '' : String(row[field.name])}
                onInput={(e) => {
                  const { value, mark } = parseMark(e.currentTarget.value)
                  /* the first box is the fast input, but only a number with a
                     sign after it moves the mark: a bare number leaves a chosen
                     mark alone, and the lone `-` on the way to typing -20 is
                     not yet a mark of anything */
                  const marked = column === 0 && value !== null && mark !== same
                  write(at, { ...row, [field.name]: value, ...(marked && { mark }) })
                }}
              />
              <span class="set-unit">{field.unit}</span>
            </label>
          ))}

          <div class="set-next">
            <Segmented
              options={marks}
              value={row.mark}
              onChange={(mark) => write(at, { ...row, mark })}
              tone="steel"
              label={`set ${at + 1} next time`}
            />
          </div>

          <button
            type="button"
            class="set-drop hit"
            aria-label={`remove set ${at + 1}`}
            onClick={() => drop(at)}
          >
            ×
          </button>
        </div>
      ))}

      <div class="set-add">
        <button
          type="button"
          class="set-add-press hit"
          onClick={() => onChange([...rows, { ...rows[rows.length - 1]! }])}
        >
          + set
        </button>
        {/* the whole ergonomic argument, and not discoverable otherwise */}
        <span class="set-add-note">copies the row above</span>
      </div>
    </div>
  )
}

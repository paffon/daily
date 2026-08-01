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

  /** A row is flat, so a spread copies it whole. */
  const blank = (): SetRow => ({
    ...Object.fromEntries(fields.map((field) => [field.name, null])),
    mark: parseMark('').mark,
  })

  const write = (at: number, row: SetRow) => onChange(sets.map((s, i) => (i === at ? row : s)))

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

      {sets.map((row, at) => (
        <div class="set-row" key={at}>
          <span class="set-index">{at + 1}</span>

          {fields.map((field, column) => (
            <label class="set-cell" key={field.name}>
              {/* uncontrolled: the row holds the parsed number, and writing it
                  back mid-keystroke would eat the dot as `47.` parses to 47 */}
              <input
                class={field.optional ? 'set-input set-input-optional' : 'set-input'}
                type="text"
                inputMode="text"
                aria-label={`set ${at + 1} ${field.name}`}
                defaultValue={row[field.name] === null ? '' : String(row[field.name])}
                onInput={(e) => {
                  const typed = e.currentTarget.value
                  const { value, mark } = parseMark(typed)
                  /* the first box is the fast input: a trailing run of + or -
                     sets the mark too. Without a run the mark is left alone,
                     so correcting a number does not undo a chosen mark */
                  const marked = column === 0 && /[+-]$/.test(typed.trim())
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
        </div>
      ))}

      <div class="set-add">
        <button
          type="button"
          class="set-add-press hit"
          onClick={() => onChange([...sets, { ...(sets[sets.length - 1] ?? blank()) }])}
        >
          + set
        </button>
        {/* the whole ergonomic argument, and not discoverable otherwise */}
        <span class="set-add-note">copies the row above</span>
      </div>
    </div>
  )
}

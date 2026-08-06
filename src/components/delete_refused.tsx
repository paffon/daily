import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { dayTimeOf } from './fields'
import './delete_refused.css'

/** What a delete says instead of going through, once a logged entry references
 *  the item — `DESIGN.md` §7. It names the workouts rather than refusing in the
 *  abstract, and it names them as links, because the way out is through them:
 *  take the exercise out of each one, with the numbers in front of you, and the
 *  delete goes through afterwards. There is no bulk edit behind this panel.
 *
 *  It offers the rename in the same breath, because that is the case that
 *  usually wanted deleting. An entry stores the item's id and resolves the name
 *  at read time, so a rename reaches every workout in the list above it without
 *  touching a single set — and it is done here rather than behind a link,
 *  so it works the same mid-workout as it does on the library screen.
 *
 *  Mono and ink, never `--danger`: this is a refusal, not a destruction. */
export function DeleteRefused({
  used,
  name,
  locale,
  onRename,
}: {
  used: Entry[]
  name: string
  locale: string
  onRename: (name: string) => void
}): VNode {
  return (
    <div class="refused">
      <p class="refused-line">
        {`in ${used.length === 1 ? 'a workout' : `${used.length} workouts`}, still`}
      </p>

      <div class="refused-links">
        {used.map((entry) => (
          <a class="refused-link hit" key={entry.id} href={`#/entry/${entry.id}`}>
            {dayTimeOf(entry.ts, locale)}
          </a>
        ))}
      </div>

      {/* uncontrolled and committed on blur: the panel re-renders under a
          controlled box as soon as the library is written, and what was
          half-typed would go with it */}
      <label class="refused-rename">
        <span class="refused-rename-label">rename it instead</span>
        <input
          type="text"
          aria-label={`rename ${name}`}
          defaultValue={name}
          onChange={(e) => {
            const next = e.currentTarget.value.trim()
            if (next !== '' && next !== name) onRename(next)
          }}
        />
      </label>
    </div>
  )
}

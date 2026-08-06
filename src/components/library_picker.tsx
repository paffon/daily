import { useRef, useState } from 'preact/hooks'
import type { ComponentChildren, VNode } from 'preact'
import './library_picker.css'

/** Pick a library item, or make one. Presentational — the list is passed in,
 *  and nothing here knows which of the items arrived in a seed, because a
 *  seeded item is no more protected than one added last week.
 *
 *  What is typed to filter is what names the new item: the list narrows to
 *  nothing as the name is finished, and the same word is already there to
 *  press. `hint` widens the match, so a body part finds an exercise whose name
 *  never mentions it. */
export function LibraryPicker({
  items,
  onPick,
  onNew,
  newLabel,
  onDelete,
  blocked,
}: {
  items: { id: string; name: string; hint?: string }[]
  onPick: (id: string) => void
  onNew: (name: string) => void
  newLabel: string
  /** Removes the item from its library for good — nothing in a seed list is
   *  protected. Absent, the rows carry no delete at all. */
  onDelete?: (id: string) => void
  /** What stands in the way of removing this item, or `null` when nothing does
   *  — asked before a row's delete arms, so a refusal never follows a
   *  `press again` that was never going to work.
   *
   *  Where the answer sits and when it clears is this component's; what it says
   *  is the caller's, because only the caller knows what a reference to its own
   *  library looks like. Absent, every row arms — which is still what foods and
   *  segments do (`DESIGN.md` §7: they take the same shape when asked for). */
  blocked?: (id: string) => ComponentChildren | null
}): VNode {
  const [typed, setTyped] = useState('')
  /** The one row whose delete has been pressed once. Two presses instead of a
   *  modal, the same shape as `Danger` in `fields.css` — the library loses the
   *  item for good, but a dialog is ceremony for one user editing their own
   *  list. Pressing anything else disarms it. */
  const [armed, setArmed] = useState('')
  /** The one row whose delete was refused. The id is held rather than the panel
   *  it produced, so the panel is asked for again on every render — a rename
   *  made inside it has to reach what the refusal says about it. */
  const [refused, setRefused] = useState('')
  const filter = useRef<HTMLInputElement>(null)
  const needle = typed.trim().toLowerCase()
  const shown = items.filter((item) =>
    `${item.name} ${item.hint ?? ''}`.toLowerCase().includes(needle),
  )

  return (
    <div class="picker">
      {/* the box names the new item as well as narrowing the list, and a bare
          search box says only the second half of that */}
      <input
        class="picker-filter"
        type="search"
        aria-label="filter"
        placeholder="find one, or name a new one"
        ref={filter}
        value={typed}
        onInput={(e) => {
          setTyped(e.currentTarget.value)
          setArmed('')
          setRefused('')
        }}
      />

      <div class="picker-list">
        {shown.map((item) => (
          <div class="picker-row" key={item.id}>
            <div class="picker-line">
              <button
                type="button"
                class="picker-item hit"
                onClick={() => {
                  setArmed('')
                  setRefused('')
                  onPick(item.id)
                }}
              >
                <span class="picker-name">{item.name}</span>
                <span class="picker-hint">{item.hint}</span>
              </button>
              {onDelete !== undefined && (
                <button
                  type="button"
                  class={armed === item.id ? 'picker-delete armed hit' : 'picker-delete hit'}
                  aria-label={`delete ${item.name}`}
                  onClick={() => {
                    /* asked first, so a refusal never follows a `press again`
                       that was never going to go through */
                    if (blocked?.(item.id) != null) {
                      setArmed('')
                      setRefused(item.id)
                      return
                    }
                    setRefused('')
                    if (armed !== item.id) {
                      setArmed(item.id)
                      return
                    }
                    setArmed('')
                    onDelete(item.id)
                  }}
                >
                  {armed === item.id ? 'press again' : '×'}
                </button>
              )}
            </div>
            {refused === item.id && blocked?.(item.id)}
          </div>
        ))}
      </div>

      {/* What is typed names the new item, so with nothing typed there is
          nothing to make. It used to disable itself for that, which reads as a
          broken button: the label is the only thing on screen tying the press
          to the box, and greying it out takes that away rather than saying it.
          The press instead puts the cursor where the name goes — one tap, the
          keyboard is up, and the second press makes the item. */}
      <button
        type="button"
        class="picker-new hit"
        onClick={() => {
          if (needle === '') {
            filter.current?.focus()
            return
          }
          onNew(typed.trim())
          setTyped('')
        }}
      >
        {newLabel}
      </button>
    </div>
  )
}

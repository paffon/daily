import { useRef, useState } from 'preact/hooks'
import type { VNode } from 'preact'
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
}: {
  items: { id: string; name: string; hint?: string }[]
  onPick: (id: string) => void
  onNew: (name: string) => void
  newLabel: string
}): VNode {
  const [typed, setTyped] = useState('')
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
        onInput={(e) => setTyped(e.currentTarget.value)}
      />

      <div class="picker-list">
        {shown.map((item) => (
          <button
            type="button"
            key={item.id}
            class="picker-item hit"
            onClick={() => onPick(item.id)}
          >
            <span class="picker-name">{item.name}</span>
            <span class="picker-hint">{item.hint}</span>
          </button>
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

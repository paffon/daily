import type { VNode } from 'preact'
import './segmented.css'

/** Contiguous buttons, one of them chosen. Presentational — the scale is
 *  passed in, never read from config here, because the next-time mark's scale
 *  and every module's level scale live in different seeds.
 *
 *  `tone` is not decoration. `steel` means "this is the live one" and belongs
 *  to the next-time mark; a level is a recorded property of the thing rather
 *  than a target, and wears `ink-select`. The two must not be unified. */
export function Segmented({
  options,
  value,
  onChange,
  tone,
  label,
}: {
  options: { value: string; short?: string }[]
  value: string
  onChange: (value: string) => void
  tone: 'steel' | 'ink-select'
  label: string
}): VNode {
  return (
    <div class={`segmented segmented-${tone}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          class="hit"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {/* the phone shows the glyph and the laptop the word; a scale with no
              glyph of its own reads as the word at either width */}
          <span class="segmented-word">{option.value}</span>
          <span class="segmented-short">{option.short ?? option.value}</span>
        </button>
      ))}
    </div>
  )
}

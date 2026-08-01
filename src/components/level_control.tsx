import type { VNode } from 'preact'
import { Segmented } from './segmented'
import './level_control.css'

/** One control in two conditions, never two controls. With examples the prose
 *  sits under the buttons; with none it simply does not exist, and the buttons
 *  are identical either way.
 *
 *  All three examples show at once rather than only the chosen one, because
 *  comparing them is what makes them useful.
 *
 *  `ink-select`, never `steel`: a level is a recorded property of the thing,
 *  and `steel` means *this is the live one* — which belongs to the next-time
 *  mark. The design deliberately does not unify them. */
export function LevelControl({
  scale,
  value,
  onChange,
  examples,
  label,
}: {
  scale: string[]
  value: string
  onChange: (level: string) => void
  /** Per food, and optional — blank is the common case. */
  examples?: Record<string, string>
  label: string
}): VNode {
  return (
    <div class="level">
      <Segmented
        options={scale.map((level) => ({ value: level }))}
        value={value}
        onChange={onChange}
        tone="ink-select"
        label={label}
      />

      {examples !== undefined && (
        <div class="level-examples">
          {scale.map((level) => (
            <p class={level === value ? 'level-example chosen' : 'level-example'} key={level}>
              {examples[level]}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

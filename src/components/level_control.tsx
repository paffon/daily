import type { VNode } from 'preact'
import { Segmented } from './segmented'
import './level_control.css'

/** The scale a module records its level on, given the row to itself.
 *
 *  It carried per-level prose until 2026-08-08 — three lines under the buttons
 *  saying what lean, normal and loaded meant for one food. That prose is now
 *  one note on the food itself (`DESIGN.md` §8.2), written where the food is
 *  rather than repeated per level, so the control is the buttons and nothing
 *  else and every module wears the same one.
 *
 *  `ink-select`, never `steel`: a level is a recorded property of the thing,
 *  and `steel` means *this is the live one* — which belongs to the next-time
 *  mark. The design deliberately does not unify them. */
export function LevelControl({
  scale,
  value,
  onChange,
  label,
}: {
  scale: string[]
  value: string
  onChange: (level: string) => void
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
    </div>
  )
}

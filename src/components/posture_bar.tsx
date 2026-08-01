import type { VNode } from 'preact'
import './posture_bar.css'

/** The whole reading of a posture block, in 12 pixels: sitting, standing, and
 *  whatever the two do not account for, sized against the span.
 *
 *  **It writes nothing.** No `75%`, no `6 of 8`, no labels under the parts —
 *  the bar *is* the number, and a percentage beside it would be the same fact
 *  said twice in the register the app avoids. The proportions are `flex-grow`
 *  rather than computed widths, so nothing here divides and nothing here
 *  rounds. */
export function PostureBar({ span, sitting }: { span: number; sitting: number }): VNode {
  /* a day cannot hold more sitting than it has hours — a typo of 10 in an 8
     hour span reads as a full bar rather than as a bar drawn past its end */
  const sat = Math.min(Math.max(sitting, 0), Math.max(span, 0))

  return (
    <div class="posture-bar" role="presentation">
      <span class="posture-bar-sitting" style={{ flexGrow: sat }} />
      <span class="posture-bar-standing" style={{ flexGrow: Math.max(span, 0) - sat }} />
      <span class="posture-bar-rest" />
    </div>
  )
}

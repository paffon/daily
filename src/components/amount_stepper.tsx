import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import './amount_stepper.css'

/** Frame 4c's amount box: a large mono number carrying the food's own unit,
 *  with a press either side of it. Amounts are fractional, so the box is typed
 *  into as well as stepped — `3.5 slices` is a valid entry.
 *
 *  Presentational: the step arrives as a prop rather than being read from
 *  config here, the way P5's two controls take their scales. */
export function AmountStepper({
  value,
  unit,
  step,
  onChange,
  label,
}: {
  value: number
  unit: string
  step: number
  onChange: (value: number) => void
  label: string
}): VNode {
  /* the box holds what was typed, not the parsed number: writing the number
     back mid-keystroke would eat the dot as `3.` parses to 3 */
  const [typed, setTyped] = useState(String(value))

  const stepTo = (next: number) => {
    /* an amount below nothing is not an entry, it is a typo with a press
       behind it */
    const floored = Math.max(0, next)
    setTyped(String(floored))
    onChange(floored)
  }

  return (
    <div class="stepper">
      <button type="button" class="stepper-press hit" aria-label={`${label} down`} onClick={() => stepTo(value - step)}>
        −
      </button>

      <label class="stepper-box">
        {/* text, not number: a spinner is a second stepper beside this one, and
            the phone's decimal keypad arrives with inputMode */}
        <input
          type="text"
          inputMode="decimal"
          aria-label={label}
          value={typed}
          onInput={(e) => {
            const next = e.currentTarget.value
            setTyped(next)
            /* an unreadable box reports nothing rather than a guess — what is
               there stands until the number finishes being typed */
            const parsed = Number(next)
            if (next.trim() !== '' && !Number.isNaN(parsed)) onChange(parsed)
          }}
        />
        <span class="stepper-unit">{unit}</span>
      </label>

      <button type="button" class="stepper-press hit" aria-label={`${label} up`} onClick={() => stepTo(value + step)}>
        +
      </button>
    </div>
  )
}

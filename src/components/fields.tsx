import { useState } from 'preact/hooks'
import type { ComponentChildren, VNode } from 'preact'
import type { Entry } from '../data/entry'
import { toIso } from '../data/entry'
import './fields.css'

/** Controls shared by every module. Presentational only — they take values and
 *  callbacks and never reach for the store themselves. */

const format = (at: Date, locale: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, opts).format(at).toLowerCase()

const timeOf = (at: Date, locale: string) => format(at, locale, { hour: '2-digit', minute: '2-digit' })

const dayOf = (at: Date, locale: string) => format(at, locale, { day: 'numeric', month: 'long' })

const weekdayOf = (at: Date, locale: string) => format(at, locale, { weekday: 'short' })

/** `may` — the honest-empty prose on a module screen. */
export const monthOf = (ts: string, locale: string) =>
  format(new Date(ts), locale, { month: 'long' })

/** `19:44` — the provenance line on the edit screen. */
export const clockOf = (ts: string, locale: string) => timeOf(new Date(ts), locale)

/** `12 july 07:40` — the module rail and `Previous`. */
export function dayTimeOf(ts: string, locale: string): string {
  const at = new Date(ts)
  return `${dayOf(at, locale)} ${timeOf(at, locale)}`
}

const DAY = 86_400_000

/** `today 18:10`, `wed 19:40`, `12 july` — home's last-touched line. How long
 *  a weekday stays useful is a preference, so it arrives from config. */
export function whenOf(ts: string, locale: string, weekdayWithinDays: number): string {
  const at = new Date(ts)
  const now = new Date()
  if (at.toDateString() === now.toDateString()) return `today ${timeOf(at, locale)}`
  if (now.getTime() - at.getTime() < weekdayWithinDays * DAY) {
    return `${weekdayOf(at, locale)} ${timeOf(at, locale)}`
  }
  return dayOf(at, locale)
}

/** The entry's own timestamp, editable. Logging the apple from an hour ago is
 *  the normal case, so a value away from now reads as information rather than
 *  a warning: the box says what it says and `· now 20:41` sits beside it.
 *
 *  `expanded` is the edit screen: the two fields stand open from the start
 *  because moving an entry to when it happened is why that screen was opened,
 *  and the distance from now is the point there rather than a remark on it.
 *
 *  Nothing collapses it again, and a close-on-blur is the one thing that must
 *  not go back in: pressing the box focuses it, and the panel replaces it in
 *  the same tick, so the browser fires `focusout` with a null `relatedTarget`
 *  before the two fields are ever on screen. Read as leaving, that shut the
 *  panel on every press — which left the timestamp editable only after the
 *  fact, from the edit screen. Staying open is the truthful state anyway: it
 *  was opened to move an entry off now, and leaving the screen remounts it. */
export function Timestamp({
  value,
  onChange,
  locale,
  variant = 'collapsed',
}: {
  value: string
  onChange: (ts: string) => void
  locale: string
  variant?: 'collapsed' | 'expanded'
}): VNode {
  const [open, setOpen] = useState(false)
  const expanded = variant === 'expanded'
  const now = new Date()
  const at = new Date(value)
  const adrift = Math.abs(at.getTime() - now.getTime()) > 60_000

  // ts carries its own offset, so its date and time parts read off directly
  const day = value.slice(0, 10)
  const time = value.slice(11, 16)

  /** A native date or time input reports an empty value while a segment is
   *  being retyped. Half a timestamp is not a timestamp — wait for the rest. */
  const edit = (nextDay: string, nextTime: string) => {
    if (nextDay === '' || nextTime === '') return
    const [y, m, d] = nextDay.split('-').map(Number)
    const [h, min] = nextTime.split(':').map(Number)
    onChange(toIso(new Date(y!, m! - 1, d!, h!, min!)))
  }

  return (
    <div class="field-stamp">
      {open || expanded ? (
        <div class="field-stamp-edit">
          <input type="date" value={day} onInput={(e) => edit(e.currentTarget.value, time)} />
          <input type="time" value={time} onInput={(e) => edit(day, e.currentTarget.value)} />
        </div>
      ) : (
        <button type="button" class="field-stamp-box hit" onClick={() => setOpen(true)}>
          {`${weekdayOf(at, locale)} ${dayOf(at, locale)} · ${timeOf(at, locale)}`}
        </button>
      )}
      {adrift && !expanded && <span class="field-stamp-now">{`· now ${timeOf(now, locale)}`}</span>}
    </div>
  )
}

/** `delete this entry`, and nothing else in the app wears danger. Two presses
 *  instead of a modal: the tombstone is invisible and there is no restore, so
 *  a mis-tap reads as loss — but a dialog to dismiss is ceremony for one user
 *  editing their own log. */
export function Danger({ onClick }: { onClick: () => void }): VNode {
  const [armed, setArmed] = useState(false)
  return (
    <button
      type="button"
      class="field-danger hit"
      onClick={() => (armed ? onClick() : setArmed(true))}
    >
      {armed ? 'press again' : 'delete this entry'}
    </button>
  )
}

/** A single-line comment on the thing being logged, and the reason the log
 *  remembers *how* rather than only how much — a form cue on an exercise, what
 *  was actually on the plate. It comes back with `Previous` next time, quoted
 *  under the numbers. Shared, because a second module wanted it (2026-08-06)
 *  and a third would otherwise have copied it a third time. */
export function Comment({
  value,
  onChange,
}: {
  value: string
  onChange: (comment: string) => void
}): VNode {
  return (
    <label class="field-comment">
      <span class="field-comment-label">comment</span>
      <input
        type="text"
        aria-label="comment"
        value={value}
        onInput={(e) => onChange(e.currentTarget.value)}
      />
    </label>
  )
}

/** What happened last time, at the point of logging. Unconditional, in every
 *  module, and not the coach speaking. */
export function Previous({
  entry,
  render,
  locale,
}: {
  entry: Entry | null
  render: (entry: Entry) => ComponentChildren
  locale: string
}): VNode {
  return (
    <div class="field-previous">
      <span class="field-previous-label">previous</span>
      {entry === null ? (
        <span class="field-previous-empty">nothing recorded yet</span>
      ) : (
        <>
          <span class="field-previous-when">{dayTimeOf(entry.ts, locale)}</span>
          <span class="field-previous-what">{render(entry)}</span>
        </>
      )}
    </div>
  )
}

import { useState } from 'preact/hooks'
import type { ComponentChildren, VNode } from 'preact'
import type { Entry } from '../data/entry'
import './fields.css'

/** Controls shared by every module. Presentational only — they take values and
 *  callbacks and never reach for the store themselves. */

const format = (at: Date, locale: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale, opts).format(at).toLowerCase()

const timeOf = (at: Date, locale: string) =>
  format(at, locale, { hour: '2-digit', minute: '2-digit', hour12: false })

const dayOf = (at: Date, locale: string) => format(at, locale, { day: 'numeric', month: 'long' })

const weekdayOf = (at: Date, locale: string) => format(at, locale, { weekday: 'short' })

/** `may` — the honest-empty prose on a module screen. */
export const monthOf = (ts: string, locale: string) =>
  format(new Date(ts), locale, { month: 'long' })

/** `12 july 07:40` — the module rail and `Previous`. */
export function dayTimeOf(ts: string, locale: string): string {
  const at = new Date(ts)
  return `${dayOf(at, locale)} ${timeOf(at, locale)}`
}

const WEEK = 7 * 86_400_000

/** `today 18:10`, `wed 19:40`, `12 july` — home's last-touched line. Seven days
 *  is a calendar fact rather than a target, so it stays in source. */
export function whenOf(ts: string, locale: string, now: Date = new Date()): string {
  const at = new Date(ts)
  if (at.toDateString() === now.toDateString()) return `today ${timeOf(at, locale)}`
  if (now.getTime() - at.getTime() < WEEK) return `${weekdayOf(at, locale)} ${timeOf(at, locale)}`
  return dayOf(at, locale)
}

/** The entry's own timestamp, editable. Logging the apple from an hour ago is
 *  the normal case, so a value away from now reads as information rather than
 *  a warning: the box says what it says and `· now 20:41` sits beside it. */
export function Timestamp({
  value,
  onChange,
  locale,
}: {
  value: string
  onChange: (ts: string) => void
  locale: string
}): VNode {
  const [open, setOpen] = useState(false)
  const now = new Date()
  const at = new Date(value)
  const adrift = Math.abs(at.getTime() - now.getTime()) > 60_000

  // ts carries its own offset, so date and time can be swapped in by slice
  const day = value.slice(0, 10)
  const time = value.slice(11, 16)
  const edit = (nextDay: string, nextTime: string) =>
    onChange(`${nextDay}T${nextTime}:00${value.slice(19)}`)

  return (
    <div class="field-stamp">
      {open ? (
        <div class="field-stamp-edit">
          <input type="date" value={day} onInput={(e) => edit(e.currentTarget.value, time)} />
          <input type="time" value={time} onInput={(e) => edit(day, e.currentTarget.value)} />
        </div>
      ) : (
        <button type="button" class="field-stamp-box hit" onClick={() => setOpen(true)}>
          {`${weekdayOf(at, locale)} ${dayOf(at, locale)} · ${timeOf(at, locale)}`}
        </button>
      )}
      {adrift && <span class="field-stamp-now">{`· now ${timeOf(now, locale)}`}</span>}
    </div>
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

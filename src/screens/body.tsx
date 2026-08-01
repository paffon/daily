import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { newEntry, toIso } from '../data/entry'
import { putEntry, readEntries, readJson } from '../data/store'
import { Previous, Timestamp, dayTimeOf, monthOf } from '../components/fields'
import { registerEditor } from './edit_entry'
import appSeed from '../seed/app.json'
import './body.css'

/** A weight and a time. That is the whole of this half of the module —
 *  photos are P8. */

type BodyConfig = typeof appSeed.body

/** Blanks are valid entries, so an empty or unreadable box records `null`
 *  rather than refusing the entry. */
const weightOf = (typed: string): number | null => {
  const value = Number(typed)
  return typed.trim() === '' || Number.isNaN(value) ? null : value
}

const weightText = (weight: unknown): string => (typeof weight === 'number' ? String(weight) : '')

/** `72.4 kg`. Both the unit and how finely it is written are config, never
 *  literals, and home reuses this so payload knowledge stays in the module
 *  that owns the payload. */
export function weightLine(entry: Entry, body: BodyConfig): string {
  const weight = entry.payload['weight']
  const written = typeof weight === 'number' ? weight.toFixed(body.weight_decimals) : '—'
  return `${written} ${body.weight_unit}`
}

/** Body's half of frame 4h. The box is uncontrolled on purpose: the payload
 *  holds the parsed number, and writing that number back mid-keystroke would
 *  swallow the dot the moment `72.` parses to 72. */
registerEditor('body', (payload, onChange) => {
  const { body } = readJson('config/app.json', appSeed)
  return (
    <div class="body-weight">
      <input
        class="body-weight-value"
        type="text"
        inputMode="decimal"
        aria-label="weight"
        defaultValue={weightText(payload['weight'])}
        onInput={(e) => onChange({ ...payload, weight: weightOf(e.currentTarget.value) })}
      />
      <span class="body-weight-unit">{body.weight_unit}</span>
    </div>
  )
})

export function Body(): VNode {
  const config = readJson('config/app.json', appSeed)
  const locale = config.locale

  const [entries, setEntries] = useState(() => readEntries('body'))
  const [weight, setWeight] = useState('')
  const [ts, setTs] = useState(() => toIso(new Date()))

  const log = () => {
    putEntry(newEntry('body', { weight: weightOf(weight) }, ts))
    setEntries(readEntries('body'))
    setWeight('')
    setTs(toIso(new Date()))
  }

  const oldest = entries[entries.length - 1]
  const summary =
    oldest === undefined
      ? 'Nothing recorded yet.'
      : `${entries.length} ${entries.length === 1 ? 'weight' : 'weights'} since ` +
        `${monthOf(oldest.ts, locale)}. Not enough to draw a line yet.`

  return (
    <main class="body">
      <header class="body-strip">
        <a class="body-back hit" href="#/">
          ← &nbsp;body
        </a>
        <span>{dayTimeOf(ts, locale)}</span>
      </header>

      <div class="body-split">
        <section class="body-rail">
          <h2 class="body-rail-label">recorded</h2>
          {entries.map((entry) => (
            <div class="body-rail-row" key={entry.id}>
              <span class="body-rail-when">{dayTimeOf(entry.ts, locale)}</span>
              <span class="body-rail-what">{weightLine(entry, config.body)}</span>
            </div>
          ))}
          <p class="body-rail-progress">
            {`progress · ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}, not enough to draw`}
          </p>
        </section>

        <section class="body-fields">
          <h1 class="body-title">weight</h1>

          <Previous
            entry={entries[0] ?? null}
            locale={locale}
            render={(entry) => weightLine(entry, config.body)}
          />

          <div class="body-inputs">
            <div class="body-weight">
              <input
                class="body-weight-value"
                type="text"
                inputMode="decimal"
                aria-label="weight"
                value={weight}
                onInput={(e) => setWeight(e.currentTarget.value)}
              />
              <span class="body-weight-unit">{config.body.weight_unit}</span>
            </div>

            <div class="body-when">
              <span class="body-when-label">when</span>
              <Timestamp value={ts} onChange={setTs} locale={locale} />
            </div>
          </div>

          <div class="body-actions">
            <button type="button" class="body-log hit" onClick={log}>
              log it
            </button>
          </div>

          <p class="body-summary">{summary}</p>
        </section>
      </div>
    </main>
  )
}

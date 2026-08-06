import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { newEntry, toIso } from '../data/entry'
import { deleteEntry, putEntry, readEntries, readJson, updateEntry } from '../data/store'
import { loadLevels } from '../data/food'
import { Danger, Previous, Timestamp, dayTimeOf } from '../components/fields'
import { AmountStepper } from '../components/amount_stepper'
import { LevelControl } from '../components/level_control'
import { registerEditor } from './edit_entry'
import appSeed from '../seed/app.json'
import './dance.css'

/** Frame 4e, list-first since 2026-08-06 like every other module: the sessions
 *  already danced, with `+ new session` above them, and one builder for a new
 *  one and an old one. Duration × intensity is the whole of it — no library,
 *  no steps, no personal best, and no mark. The app is not trying to improve
 *  the user's dancing. */

type Session = { duration_min: number; level: string }

/** `a duration · a level` — the list, `Previous`, home's recent row and the
 *  edit screen all say the same sentence about a session. */
export const sessionLine = ({ duration_min, level }: Session): string =>
  [`${duration_min} min`, level].filter((part) => part !== '').join(' · ')

/** What home's recent row says about a dance entry. */
export const danceLine = (entry: Entry): string => sessionLine(entry.payload as Session)

const scaleOf = (): string[] => loadLevels()['dance']?.scale ?? []

/** The seed under the stored section, because `ensureSeeded` writes a file
 *  only when the whole thing is absent and never backfills a key added later.
 *  The same defence P6 and P8 wrote, in the fourth phase to need it. */
const danceConfig = (): typeof appSeed.dance => ({
  ...appSeed.dance,
  ...readJson('config/app.json', appSeed).dance,
})

/** Dance's half of frame 4h: the two fields it was logged with, and no third
 *  one that only the edit screen would know about. */
registerEditor('dance', (payload, onChange) => {
  const logged = payload as Session

  return (
    <div class="dance-edit">
      <label class="dance-field">
        <span class="dance-label">duration</span>
        <AmountStepper
          value={logged.duration_min}
          unit="min"
          step={danceConfig().duration_step}
          onChange={(duration_min) => onChange({ ...payload, duration_min })}
          label="duration"
        />
      </label>

      <div class="dance-field">
        <span class="dance-label">intensity</span>
        <LevelControl
          scale={scaleOf()}
          value={logged.level}
          onChange={(level) => onChange({ ...payload, level })}
          label="intensity"
        />
      </div>
    </div>
  )
})

/** One session being logged or corrected. `entry` is null for a new one; both
 *  wear the same screen, which is what makes editing look like adding. */
function Builder({ entry, locale, onClose }: {
  entry: Entry | null
  locale: string
  onClose: () => void
}): VNode {
  const config = danceConfig()

  const [ts, setTs] = useState(() => entry?.ts ?? toIso(new Date()))
  const [session, setSession] = useState<Session>(() =>
    entry === null
      ? { duration_min: config.duration_start, level: config.default_level }
      : { ...(entry.payload as Session) },
  )
  /* the stepper holds what was typed, so a duration set from outside the box
     has to remount it — or the box goes on reading the opening number while
     the payload already carries the tapped one. Only from *outside*: bumping
     this on the box's own input would replace the input mid-keystroke, and a
     typed duration would lose every character after the first. */
  const [filled, setFilled] = useState(0)
  /** The session being corrected cannot be its own previous. */
  const [past] = useState(() => readEntries('dance').filter((line) => line.id !== entry?.id))

  const tap = (duration_min: number) => {
    setFilled((n) => n + 1)
    setSession({ ...session, duration_min })
  }

  const save = () => {
    if (entry === null) putEntry(newEntry('dance', { ...session }, ts))
    else updateEntry({ ...entry, ts, payload: { ...session } })
    onClose()
  }

  return (
    <main class="dance">
      <header class="dance-strip">
        <button type="button" class="dance-back hit" onClick={onClose}>
          ← &nbsp;dance
        </button>
        <Timestamp value={ts} onChange={setTs} locale={locale} />
      </header>

      <div class="dance-split">
        <section class="dance-fields">
          <h1 class="dance-title">dance</h1>

          {/* the last session outright — there is no library to scope it to */}
          <Previous
            entry={past[0] ?? null}
            locale={locale}
            render={(line) => sessionLine(line.payload as Session)}
          />

          <div class="dance-field">
            <span class="dance-label">duration</span>
            <div class="dance-duration">
              <AmountStepper
                key={filled}
                value={session.duration_min}
                unit="min"
                step={config.duration_step}
                onChange={(duration_min) => setSession({ ...session, duration_min })}
                label="duration"
              />

              {/* the nights that repeat, as plain numbers rather than a second
                  control — and seeded, so they are the user's own three */}
              <div class="dance-common">
                {config.common_durations.map((minutes) => (
                  <button
                    type="button"
                    key={minutes}
                    class="dance-shortcut hit"
                    onClick={() => tap(minutes)}
                  >
                    {minutes}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div class="dance-field">
            {/* a level, in dance's own words — never light/medium/hard, and
                never a mark: nothing here is being progressively loaded */}
            <span class="dance-label">intensity</span>
            <LevelControl
              scale={scaleOf()}
              value={session.level}
              onChange={(level) => setSession({ ...session, level })}
              label="intensity"
            />
          </div>

          <div class="dance-actions">
            <button type="button" class="dance-log hit" onClick={save}>
              {entry === null ? 'log it' : 'save session'}
            </button>
            {entry !== null && (
              <Danger
                onClick={() => {
                  deleteEntry(entry.id)
                  onClose()
                }}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export function Dance(): VNode {
  const { locale } = readJson('config/app.json', appSeed)

  /** `null` is the list; `'new'` and an entry are the same builder. */
  const [open, setOpen] = useState<Entry | 'new' | null>(null)
  const [past, setPast] = useState(() => readEntries('dance'))

  if (open !== null) {
    return (
      <Builder
        key={open === 'new' ? 'new' : open.id}
        entry={open === 'new' ? null : open}
        locale={locale}
        onClose={() => {
          setPast(readEntries('dance'))
          setOpen(null)
        }}
      />
    )
  }

  return (
    <main class="dance">
      <header class="dance-strip">
        <a class="dance-back hit" href="#/">
          ← &nbsp;dance
        </a>
      </header>

      <section class="dance-rail dance-rail-page">
        <button type="button" class="dance-new hit" onClick={() => setOpen('new')}>
          + new session
        </button>

        <h2 class="dance-rail-label">danced</h2>
        {past.map((entry) => (
          <button
            type="button"
            class="dance-rail-row hit"
            key={entry.id}
            onClick={() => setOpen(entry)}
          >
            <span class="dance-rail-when">{dayTimeOf(entry.ts, locale)}</span>
            <span class="dance-rail-what">{sessionLine(entry.payload as Session)}</span>
          </button>
        ))}

        <p class="dance-rail-progress">
          {`progress · ${past.length} ${past.length === 1 ? 'session' : 'sessions'}, not enough to draw`}
        </p>
      </section>
    </main>
  )
}

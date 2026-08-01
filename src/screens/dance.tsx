import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { newEntry, toIso } from '../data/entry'
import { putEntry, readEntries, readJson } from '../data/store'
import { loadLevels } from '../data/food'
import { Previous, Timestamp, dayTimeOf } from '../components/fields'
import { AmountStepper } from '../components/amount_stepper'
import { LevelControl } from '../components/level_control'
import appSeed from '../seed/app.json'
import './dance.css'

/** Frame 4e. Duration × intensity, and that is the whole module: no library,
 *  no steps, no personal best, and no mark. The app is not trying to improve
 *  the user's dancing — dance occupies the day and counts as load, which is
 *  all the log needs from it. */

type Session = { duration_min: number; level: string }

/** `a duration · a level` — the rail, `Previous` and the edit screen all say
 *  the same sentence about a session. */
const sessionLine = ({ duration_min, level }: Session): string =>
  [`${duration_min} min`, level].filter((part) => part !== '').join(' · ')

const scaleOf = (): string[] => loadLevels()['dance']?.scale ?? []

/** The seed under the stored section, because `ensureSeeded` writes a file
 *  only when the whole thing is absent and never backfills a key added later.
 *  The same defence P6 and P8 wrote, in the fourth phase to need it. */
const danceConfig = (): typeof appSeed.dance => ({
  ...appSeed.dance,
  ...readJson('config/app.json', appSeed).dance,
})

export function Dance(): VNode {
  const { locale } = readJson('config/app.json', appSeed)
  const config = danceConfig()

  const [ts, setTs] = useState(() => toIso(new Date()))
  const [past, setPast] = useState(() => readEntries('dance'))
  const [session, setSession] = useState<Session>(() => ({
    duration_min: config.duration_start,
    level: config.default_level,
  }))
  /* the stepper holds what was typed, so tapping a shortcut has to remount it
     — or the box goes on reading the opening duration while the payload
     already carries the one that was tapped */
  const [filled, setFilled] = useState(0)

  const setDuration = (duration_min: number) => {
    setFilled((n) => n + 1)
    setSession({ ...session, duration_min })
  }

  const log = () => {
    putEntry(newEntry('dance', { ...session }, ts))
    setPast(readEntries('dance'))
    setFilled((n) => n + 1)
    setSession({ duration_min: config.duration_start, level: config.default_level })
    setTs(toIso(new Date()))
  }

  return (
    <main class="dance">
      <header class="dance-strip">
        <a class="dance-back hit" href="#/">
          ← &nbsp;dance
        </a>
        <Timestamp value={ts} onChange={setTs} locale={locale} />
      </header>

      <div class="dance-split">
        <section class="dance-rail">
          {/* enough to answer "was that a long one" without opening progress,
              which is all the rail is for */}
          <h2 class="dance-rail-label">last four</h2>
          {past.slice(0, config.recent_count).map((entry) => (
            <a class="dance-rail-row hit" key={entry.id} href={`#/entry/${entry.id}`}>
              <span class="dance-rail-when">{dayTimeOf(entry.ts, locale)}</span>
              <span class="dance-rail-what">{sessionLine(entry.payload as Session)}</span>
            </a>
          ))}

          <p class="dance-rail-progress">
            {`progress · ${past.length} ${past.length === 1 ? 'session' : 'sessions'}, not enough to draw`}
          </p>
        </section>

        <section class="dance-fields">
          <h1 class="dance-title">dance</h1>

          {/* the last session outright — there is no library to scope it to */}
          <Previous
            entry={past[0] ?? null}
            locale={locale}
            render={(entry) => sessionLine(entry.payload as Session)}
          />

          <div class="dance-field">
            <span class="dance-label">duration</span>
            <div class="dance-duration">
              <AmountStepper
                key={filled}
                value={session.duration_min}
                unit="min"
                step={config.duration_step}
                onChange={setDuration}
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
                    onClick={() => setDuration(minutes)}
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
            <button type="button" class="dance-log hit" onClick={log}>
              log it
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

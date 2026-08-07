import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { MODULES, toIso } from '../data/entry'
import { lastTouched, readJson, recentEntries } from '../data/store'
import { activeProfile } from '../data/profile'
import { buildReport, reportFileName } from '../data/report'
import { whenOf } from '../components/fields'
import { bodyLine } from './body'
import { workoutLine } from './workout'
import { nutritionLineFor } from './nutrition'
import { movementLine } from './movement'
import { danceLine } from './dance'
import appSeed from '../seed/app.json'
import './home.css'

/** What a recent row says about an entry. Every module owns the sentence about
 *  its own payload and hands it over here, so home knows which module wrote a
 *  row and nothing else about it — a walk, a block, a meal and a session all
 *  read on home exactly as they read in the module that recorded them.
 *
 *  Imported rather than registered: a registry fills only for the modules that
 *  happen to have been imported, which is an import-order accident waiting to
 *  show a blank row. */
function detail(entry: Entry, config: typeof appSeed): string {
  switch (entry.module) {
    case 'body':
      return bodyLine(entry, config.body)
    case 'workout':
      return workoutLine(entry)
    case 'nutrition':
      return nutritionLineFor(entry)
    case 'movement':
      return movementLine(entry)
    case 'dance':
      return danceLine(entry)
  }
}

/** The export, from home's footer — `DESIGN.md` §10.3 names the spot. One
 *  press builds the whole report and hands it to the browser as a download;
 *  the build fetches every picture from Drive, so the press can take a
 *  moment, and the button says so rather than sitting silent under a second
 *  press that would build it twice. */
function ReportDownload({ profileName }: { profileName: string }): VNode {
  const [building, setBuilding] = useState(false)

  const download = async () => {
    setBuilding(true)
    try {
      const html = await buildReport()
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      const link = document.createElement('a')
      link.href = url
      link.download = reportFileName(profileName, toIso(new Date()))
      link.click()
      /* on a tick, not inline — the click starts the download, and revoking
         in the same task can pull the blob out from under a browser that has
         not yet opened it */
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } finally {
      setBuilding(false)
    }
  }

  return (
    <button
      type="button"
      class="home-report hit"
      disabled={building}
      onClick={() => void download()}
    >
      {building ? 'building the report…' : 'download report'}
    </button>
  )
}

/** Home in its silent state: the modules, what was last recorded, and whose
 *  log it is. Not a dashboard — no counts, no progress, no totals. */
export function Home(): VNode {
  const config = readJson('config/app.json', appSeed)
  const { locale } = config
  const within = config.home.weekday_within_days
  const recent = recentEntries(config.home.recent_count)

  return (
    <main class="home">
      <nav class="home-band">
        {MODULES.map((module) => {
          const touched = lastTouched(module)
          return (
            <a class="home-tile hit" key={module} href={`#/${module}`}>
              <span class="home-tile-name">{module}</span>
              <span class="home-tile-when">
                {touched === null ? '' : whenOf(touched, locale, within)}
              </span>
            </a>
          )
        })}
      </nav>

      <section class="home-recent">
        <h2 class="home-label">recent</h2>
        {recent.length === 0 ? (
          <p class="home-empty">nothing recorded yet</p>
        ) : (
          recent.map((entry) => (
            <a class="home-row hit" key={entry.id} href={`#/entry/${entry.id}`}>
              <span class="home-meta">
                <span class="home-time">{whenOf(entry.ts, locale, within)}</span>
                <span class="home-module">{entry.module}</span>
              </span>
              <span class="home-detail">{detail(entry, config)}</span>
            </a>
          ))
        )}
      </section>

      <footer class="home-foot">
        {/* whose log the screen is showing, and the way to make it someone
            else's — see ADR 0004. Making a second person is not a thing the
            front page of a logging app should suggest, so the profiles screen
            is where that lives and this is only the door to it (§2). */}
        <span class="home-profile">
          <span class="home-profile-name">{activeProfile().name}</span>
          <a class="home-profile-link hit" href="#/profiles">
            switch profile
          </a>
        </span>
        {/* the report, from this footer and nowhere else (§10.3). A quiet
            control like its neighbour: rare, whole-log, and not a door out —
            the file leaves, the screen stays. */}
        <ReportDownload profileName={activeProfile().name} />
      </footer>
    </main>
  )
}

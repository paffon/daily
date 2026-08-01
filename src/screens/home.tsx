import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { MODULES } from '../data/entry'
import { lastTouched, readJson, recentEntries } from '../data/store'
import { whenOf } from '../components/fields'
import { bodyLine } from './body'
import appSeed from '../seed/app.json'
import './home.css'

/** What a recent row says about an entry. Only body records anything yet;
 *  P5–P7 bring the other four, and P4's renderer registry is where this
 *  belongs once it exists. */
function detail(entry: Entry, config: typeof appSeed): string {
  return entry.module === 'body' ? bodyLine(entry, config.body) : ''
}

/** Home in its silent state: the modules, what was last recorded, and the way
 *  to objectives. Not a dashboard — no counts, no progress, no totals. */
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

      <a class="home-objectives" href="#/objectives">
        objectives &nbsp;→
      </a>
    </main>
  )
}

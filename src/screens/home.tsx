import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { MODULES } from '../data/entry'
import { lastTouched, readJson, recentEntries } from '../data/store'
import { whenOf } from '../components/fields'
import { weightLine } from './body'
import appSeed from '../seed/app.json'
import './home.css'

/** The five modules live with the entry primitive now; main.tsx still reads
 *  the list from here. */
export { MODULES }

/** What a recent row says about an entry. Only body records anything yet;
 *  P5–P8 bring the other four, and P4's renderer registry is where this
 *  belongs once it exists. */
function detail(entry: Entry, unit: string): string {
  return entry.module === 'body' ? weightLine(entry, unit) : ''
}

/** Home in its silent state: the modules, what was last recorded, and the way
 *  to objectives. Not a dashboard — no counts, no progress, no totals. */
export function Home(): VNode {
  const config = readJson('config/app.json', appSeed)
  const locale = config.locale
  const recent = recentEntries(config.home.recent_count)

  return (
    <main class="home">
      <nav class="home-band">
        {MODULES.map((module) => {
          const touched = lastTouched(module)
          return (
            <a class="home-tile hit" key={module} href={`#/${module}`}>
              <span class="home-tile-name">{module}</span>
              <span class="home-tile-when">{touched === null ? '' : whenOf(touched, locale)}</span>
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
                <span class="home-time">{whenOf(entry.ts, locale)}</span>
                <span class="home-module">{entry.module}</span>
              </span>
              <span class="home-detail">{detail(entry, config.body.weight_unit)}</span>
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

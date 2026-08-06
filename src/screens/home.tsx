import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { MODULES } from '../data/entry'
import { lastTouched, readJson, recentEntries } from '../data/store'
import { activeProfile } from '../data/profile'
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

      <footer class="home-foot">
        <a class="home-objectives" href="#/objectives">
          objectives &nbsp;→
        </a>
        {/* whose log the screen is showing, and the two ways to make it
            someone else's — see ADR 0004 */}
        <span class="home-profile">
          <span class="home-profile-name">{activeProfile().name}</span>
          <a class="home-profile-link hit" href="#/profiles">
            switch profile
          </a>
          <a class="home-profile-link hit" href="#/profiles/new">
            new profile
          </a>
        </span>
      </footer>
    </main>
  )
}

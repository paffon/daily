import type { VNode } from 'preact'
import './home.css'

/** The five recording modules, in the order home lists them. */
export const MODULES = ['workout', 'nutrition', 'movement', 'dance', 'body'] as const

export type Module = (typeof MODULES)[number]

/** One row of `recent`. Both strings arrive display-ready — home does no
 *  date arithmetic and no formatting of its own. */
export type RecentEntry = {
  id: string
  module: Module
  /** `18:10`, `fri 20:15` */
  time: string
  /** `coffee · 1 cup · normal` */
  detail: string
}

/** Shim. P2 replaces this with a store read. */
export function recentEntries(): RecentEntry[] {
  return []
}

/** Shim. P2 replaces this with a store read. `null` is "never touched" —
 *  unknown, not a miss, so it prints as nothing at all. */
export function lastTouched(_module: Module): string | null {
  return null
}

/** Home in its silent state: the modules, what was last recorded, and the way
 *  to objectives. Not a dashboard — no counts, no progress, no totals. */
export function Home(): VNode {
  const recent = recentEntries()
  return (
    <main class="home">
      <nav class="home-band">
        {MODULES.map((module) => (
          <a class="home-tile hit" key={module} href={`#/${module}`}>
            <span class="home-tile-name">{module}</span>
            <span class="home-tile-when">{lastTouched(module) ?? ''}</span>
          </a>
        ))}
      </nav>

      <section class="home-recent">
        <h2 class="home-label">recent</h2>
        {recent.length === 0 ? (
          <p class="home-empty">nothing recorded yet</p>
        ) : (
          recent.map((entry) => (
            <a class="home-row hit" key={entry.id} href={`#/entry/${entry.id}`}>
              <span class="home-meta">
                <span class="home-time">{entry.time}</span>
                <span class="home-module">{entry.module}</span>
              </span>
              <span class="home-detail">{entry.detail}</span>
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

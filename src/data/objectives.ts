/** Objectives are the coach's only reference point beyond gap arithmetic, so
 *  they have to be data — `DESIGN.md` §9. Nothing reads them yet; the coach is
 *  a later plan, and this is what it will read.
 *
 *  Every number produced here is a **fact**, never a score. There is no
 *  remainder, no ratio and no percentage anywhere below, because a missed
 *  target is something that happened rather than a debt. */

import type { Entry, Module } from './entry'
import { scope } from './profile'
import { readJson, writeJson } from './store'
import appSeed from '../seed/app.json'
import objectivesSeed from '../seed/objectives.json'

/** `3 workouts a week`, or the same scoped to a body part. */
export type CountTarget = {
  kind: 'count'
  label: string
  module: Module
  per: 'week'
  target: number
  body_part?: string
}

/** `protein up`, `weight stable` — no number, and it does not pretend to one. */
export type DirectionTarget = {
  kind: 'direction'
  label: string
  direction: 'up' | 'stable' | 'down'
}

export type Target = CountTarget | DirectionTarget

/** The statement is the only first-person text in the product, and the app
 *  never parses it. It is stored and shown, and that is all. */
export type Objectives = { statement: string; targets: Target[] }

/** Targets are the one config that is a person's rather than the app's, so
 *  each profile keeps its own file — the original under the bare legacy name. */
const path = (): string => `config/${scope()}objectives.json`

export const readObjectives = (): Objectives => readJson(path(), objectivesSeed as Objectives)

export const writeObjectives = (next: Objectives): void => writeJson(path(), next)

/** Sunday to Saturday, from `config/app.json`. Local throughout — the week is
 *  the user's, so its edges are midnights on their clock rather than an offset
 *  from an instant, which is also what keeps it right across a DST change. */
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const midnight = (at: Date): number => new Date(at).setHours(0, 0, 0, 0)

/** `[start, end)` — `end` is the next week's first midnight, so a Saturday
 *  23:59 is inside and the Sunday 00:00 after it is not. Exported because the
 *  coach plan lifts this out into a shared module. */
export function weekBounds(date: Date): { start: Date; end: Date } {
  /* An unrecognised day name falls back to the boundary `RULES.md` states
     rather than to index -1, which would shift the week by a day in silence. */
  const first = Math.max(0, DAYS.indexOf(readJson('config/app.json', appSeed).week.starts))

  const start = new Date(midnight(date))
  start.setDate(start.getDate() - ((start.getDay() - first + DAYS.length) % DAYS.length))
  const end = new Date(start)
  end.setDate(end.getDate() + DAYS.length)
  return { start, end }
}

/** A workout entry records the body parts it touched, rather than this looking
 *  them up in `library/exercises.json` at read time: nothing in a library is
 *  protected from being renamed or re-tagged later, and an entry has to keep
 *  saying what was true when it happened. */
const bodyParts = (payload: Entry['payload']): unknown[] => {
  const parts = payload['body_parts']
  return Array.isArray(parts) ? parts : []
}

const matches = (target: CountTarget, entry: Entry): boolean =>
  !entry.deleted &&
  entry.module === target.module &&
  (target.body_part === undefined || bodyParts(entry.payload).includes(target.body_part))

/** The plain fact beside a target: `2 this week` while it is happening,
 *  `9 days` once it is not, `direction` where there is no number to give.
 *  Never the target itself, never what is left of it. */
export function factFor(target: Target, entries: Entry[]): string {
  if (target.kind === 'direction') return 'direction'

  const matched = entries.filter((entry) => matches(target, entry))
  const { start, end } = weekBounds(new Date())
  const inside = matched.filter((entry) => {
    const at = Date.parse(entry.ts)
    return at >= start.getTime() && at < end.getTime()
  })
  /* A target nothing has ever matched reads `0 this week` rather than anything
     softer: it is the plainest true thing, and it is what a target says on the
     day it is written. */
  if (inside.length > 0 || matched.length === 0) return `${inside.length} this week`

  /* Nothing this week, so how long it has been is the useful thing to say.
     Counted midnight to midnight, so it does not change under the reader, and
     reduced rather than spread — `matched` is every entry the module ever
     recorded, which is more arguments than a call can take. */
  const newest = matched.reduce((latest, entry) => Math.max(latest, midnight(new Date(entry.ts))), 0)
  /* A timestamp is editable, so the newest match can sit in the future. Then
     there is no elapsed time to state, and `0 days` beats a negative. */
  const days = Math.max(0, Math.round((midnight(new Date()) - newest) / 86_400_000))
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

/** The exercise library, and the notation its set rows are typed in. Which
 *  fields a set records is data — a kind's field list, or an exercise's own
 *  override — so nothing here switches on a kind's name. */

import type { Entry } from './entry'
import { readJson, writeJson } from './store'
import exercisesSeed from '../seed/exercises.json'

/** One column of a set row. `sep` is what precedes the value when the row is
 *  written out as a line (`47.5 kg × 10`, `5 km / 28 min`), which is why the
 *  four separators the design uses need no formatting code. */
export type Field = { name: string; unit: string; optional?: boolean; sep?: string }

export type Exercise = {
  id: string
  /** The user's own name for it — `dips yellow machine` is correct. */
  name: string
  body_part: string
  kind: string
  /** Overrides the kind's list, for an exercise that needs both. */
  fields?: Field[]
  /** A free string. A hint, never enforced or validated. */
  rep_scheme?: string
  notes?: string
}

/** `sign` is the fast input's trailing character, `short` the phone's glyph. */
export type Mark = { value: string; short: string; sign: string }

export type Library = { kinds: Record<string, Field[]>; marks: Mark[]; exercises: Exercise[] }

/** A set row: one value per field its kind declares, plus the next-time mark.
 *  A blank field is `null` — a set with nothing in it is a valid set. */
export type SetRow = { mark: string; [field: string]: number | string | null }

export type Performed = { exercise_id: string; sets: SetRow[]; comment: string }

export const loadExercises = (): Library => readJson('library/exercises.json', exercisesSeed)

/** Read-modify-write of the stored file, never of a copy the caller is holding.
 *  Two library edits can land before a re-render — a name typed and then a body
 *  part, on the same header — and spreading a copy read at render time writes
 *  the first one back out. Both surfaces that edit the library go through here,
 *  so the race cannot come back on one side only. The read is the mirror, so it
 *  costs nothing. */
export function writeExercises(change: (held: Library) => Exercise[]): void {
  const held = loadExercises()
  writeJson('library/exercises.json', { ...held, exercises: change(held) })
}

/** The performed exercises a workout entry holds. The payload key lives with
 *  the type it names rather than in the screen that happens to render it. */
export const performedIn = (entry: Entry): Performed[] =>
  (entry.payload['exercises'] as Performed[]) ?? []

/** An exercise the library no longer has — renamed away on another device, or
 *  deleted, since nothing in a seed is protected. Its own rows say what fields
 *  it was logged with, so the numbers stay visible rather than silently
 *  dropping out of the screen while sitting in the file. */
export const asExercise = (performed: Performed, library: Exercise[]): Exercise =>
  library.find((item) => item.id === performed.exercise_id) ?? {
    id: performed.exercise_id,
    name: performed.exercise_id,
    body_part: '',
    kind: '',
    fields: Object.keys(performed.sets[0] ?? {})
      .filter((key) => key !== 'mark')
      .map((name) => ({ name, unit: '' })),
  }

/** The distinct body parts a workout touched, resolved against the library at
 *  the moment it is logged and written onto the entry. Nothing reads it today —
 *  `docs/adr/0006-objectives-are-cut-and-body-parts-survive.md` is the file
 *  that says why it is stamped anyway, and the short of it is that it cannot be
 *  reconstructed afterwards: nothing in a library is protected from being
 *  renamed, re-tagged or deleted, and an entry has to keep saying what was true
 *  when it happened. An exercise carrying no body part contributes none. */
export function bodyPartsOf(performed: Performed[], library: Exercise[]): string[] {
  const parts = performed.map(
    (done) => library.find((item) => item.id === done.exercise_id)?.body_part ?? '',
  )
  return [...new Set(parts.filter((part) => part !== ''))]
}

export function fieldsFor(exercise: Exercise): Field[] {
  return exercise.fields ?? loadExercises().kinds[exercise.kind] ?? []
}

/** When each exercise was last done, as epoch milliseconds keyed by id. One
 *  pass over the workouts the caller has already read, never a scan per
 *  exercise.
 *
 *  Takes the maximum rather than trusting the order it was handed: a timestamp
 *  is editable, so the newest line is not always the newest instant. */
export function lastUsedAt(workouts: Entry[]): Map<string, number> {
  const seen = new Map<string, number>()
  for (const entry of workouts) {
    const at = Date.parse(entry.ts)
    if (Number.isNaN(at)) continue
    for (const done of performedIn(entry)) {
      const held = seen.get(done.exercise_id)
      if (held === undefined || at > held) seen.set(done.exercise_id, at)
    }
  }
  return seen
}

/** The order the exercise list is offered in — `DESIGN.md` §8.1. Longest-ago
 *  first, with the least recent exercise of each body part lifted above that
 *  gradient, so the opening rows cannot all be legs and no part is offered
 *  twice before every part has been offered once.
 *
 *  This is *staleness* in the sense `CONTEXT.md` gives the word: time since a
 *  library item was last used. Never performed is the longest gap there is and
 *  sorts as one — which means every never-performed exercise ties, and a tie
 *  falls back to the library's own order. That is what the stable sort below
 *  is for, rather than an index carried alongside.
 *
 *  A blank body part is the absence of one rather than a part of its own, so it
 *  is never promoted: `bodyPartsOf` reads a blank the same way, and a
 *  guaranteed opening row for *no part* is the opposite of what promotion is
 *  for. It still sorts in the gradient on its own gap. */
export function byStaleness(exercises: Exercise[], lastUsed: Map<string, number>): Exercise[] {
  const doneAt = (item: Exercise) => lastUsed.get(item.id) ?? -Infinity
  const gradient = [...exercises].sort((a, b) => doneAt(a) - doneAt(b))

  const parts = new Set<string>()
  const promoted = new Set<string>()
  for (const item of gradient) {
    if (item.body_part === '' || parts.has(item.body_part)) continue
    parts.add(item.body_part)
    promoted.add(item.id)
  }

  /* both filters walk `gradient`, so the promoted block is itself in staleness
     order — most neglected part first — and the tail keeps the gradient */
  return [
    ...gradient.filter((item) => promoted.has(item.id)),
    ...gradient.filter((item) => !promoted.has(item.id)),
  ]
}

/** The stored workouts that logged this exercise, in the order they were handed
 *  over. A delete names them rather than refusing in the abstract (§7).
 *
 *  `readEntries` has already dropped the tombstones, so a deleted workout does
 *  not hold an item hostage — deleting the workout is exactly the way out §7
 *  describes. */
export const usedBy = (exercise_id: string, workouts: Entry[]): Entry[] =>
  workouts.filter((entry) => performedIn(entry).some((done) => done.exercise_id === exercise_id))

/** Gym v.3's notation, which is the next-time mark in its original form:
 *  `47.5+` is 47.5 marked `more`, `30--` is 30 marked `less`, and a bare
 *  number carries no mark of its own. The run may be any length — the sign is
 *  typed as many times as the hand felt like, and the last one is the intent. */
export function parseMark(input: string): { value: number | null; mark: string } {
  const marks = loadExercises().marks
  const signs = marks.map((mark) => mark.sign)

  /* which characters end a number is the marks' own business — the seed
     declares them, so the notation is read from the same place it is named */
  const trimmed = input.trim()
  let at = trimmed.length
  while (at > 0 && signs.includes(trimmed[at - 1]!)) at--
  const typed = trimmed.slice(0, at)
  const number = Number(typed)

  return {
    value: typed === '' || Number.isNaN(number) ? null : number,
    mark: marks.find((mark) => mark.sign === trimmed.slice(at).slice(-1))?.value ?? '',
  }
}

/** `47.5 kg × 10`. Blanks are skipped rather than written as gaps, so a run
 *  with no incline reads `5 km / 28 min` and not `5 km / 28 min @`. */
export function setLine(set: SetRow, fields: Field[]): string {
  return fields
    .filter((field) => set[field.name] !== null && set[field.name] !== undefined)
    .map((field) => [field.sep, String(set[field.name]), field.unit].filter(Boolean).join(' '))
    .join(' ')
}

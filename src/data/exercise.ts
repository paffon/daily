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

/** Every field the kinds between them declare, which is what a field list is
 *  picked from. Deduped by name alone — `duration` in seconds and `duration`
 *  in minutes are the same offer, since a set row can only ever hold one
 *  column of that name anyway (2026-08-11, reversing the pair of separate
 *  offers this used to keep) — keeping the first declaration, decoration and
 *  all, in the order the kinds file declares them. The palette is the kinds
 *  map read sideways, so it grows with the library and is never a list
 *  written in source (§11). A field's unit is picked separately, and is never
 *  what tells two offers apart. */
export function fieldPalette(kinds: Record<string, Field[]>): Field[] {
  const offered = new Map<string, Field>()
  for (const field of Object.values(kinds).flat()) {
    if (!offered.has(field.name)) offered.set(field.name, field)
  }
  return [...offered.values()]
}

/** Every field declared anywhere in the library — the kinds map and every
 *  exercise's own list — which `unitsFor` and `fieldNamesIn` both read
 *  sideways, the same way `fieldPalette` reads the kinds map alone. */
const allFields = (library: Library): Field[] => [
  ...Object.values(library.kinds).flat(),
  ...library.exercises.flatMap((item) => item.fields ?? []),
]

/** Every unit this field name has ever been recorded in, offered when the
 *  field's unit is being changed — the same way a food offers the units it
 *  has already used (§8.2). Never enforced: typing one that has never
 *  appeared is how a field's unit changes at all (2026-08-11). */
export function unitsFor(library: Library, name: string): string[] {
  return [...new Set(allFields(library).filter((field) => field.name === name).map((field) => field.unit))]
    .filter((unit) => unit !== '')
    .sort()
}

/** Every field name declared anywhere in the library, kinds and per-exercise
 *  overrides alike — offered when a wholly new field is being typed, so a
 *  one-off parameter added for one exercise (`raise`, `cm`) is easy to reuse
 *  on another rather than retyped from nothing (2026-08-11). */
export function fieldNamesIn(library: Library): string[] {
  return [...new Set(allFields(library).map((field) => field.name))].sort()
}

/** The kind that already says what this list says, or `null` when none does.
 *  A column's identity is its name and unit; `optional` and `sep` are the
 *  kind's own decoration and never block a match, so a list that lands on a
 *  kind is recorded as the kind rather than as a copy — a copy would stop
 *  following the kind when the kind is edited, and kinds are editable data
 *  (§11). Order counts: weight-then-reps is `loaded`, reps-then-weight is
 *  `bodyweight`, and the two mean what they read as. */
export function kindOf(kinds: Record<string, Field[]>, fields: Field[]): string | null {
  const written = (list: Field[]) => JSON.stringify(list.map((field) => [field.name, field.unit]))
  const wanted = written(fields)
  return Object.keys(kinds).find((kind) => written(kinds[kind]!) === wanted) ?? null
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
 *  with no incline reads `5 km / 28 min` and not `5 km / 28 min @`. A
 *  separator says what it follows, so the first value written carries none: a
 *  run with no distance reads `28 min` rather than `/ 28 min`, and a picked
 *  list that leads with `reps` never opens with `×`. */
export function setLine(set: SetRow, fields: Field[]): string {
  return fields
    .filter((field) => set[field.name] !== null && set[field.name] !== undefined)
    .map((field, at) =>
      [at === 0 ? undefined : field.sep, String(set[field.name]), field.unit]
        .filter(Boolean)
        .join(' '),
    )
    .join(' ')
}

/** `weight kg × reps` — what an exercise records, written in a set row's own
 *  notation with the field names standing where its numbers go. The kind's
 *  name stops describing an exercise the moment its own field list overrides
 *  it (§8.1, 2026-08-10), and this never does: it is read off the list that is
 *  actually drawn. Every field is named, the optional ones included — this
 *  says what a set *can* hold, not what one of them did.
 *
 *  A column that declares no separator gets `/` here, which a row of numbers
 *  does not: `10 40 kg` is a bodyweight set and reads fine because the numbers
 *  are distinct, and `reps weight kg` reads as one field with a long name. The
 *  glyph is the library's own — the seeded kinds already separate two columns
 *  with it. */
export const fieldLine = (fields: Field[]): string => {
  const shown = fields.map((field) => ({ ...field, sep: field.sep ?? '/' }))
  return setLine(
    { mark: '', ...Object.fromEntries(shown.map((field) => [field.name, field.name])) },
    shown,
  )
}

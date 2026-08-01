/** The exercise library, and the notation its set rows are typed in. Which
 *  fields a set records is data — a kind's field list, or an exercise's own
 *  override — so nothing here switches on a kind's name. */

import { readJson } from './store'
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

export function fieldsFor(exercise: Exercise): Field[] {
  return exercise.fields ?? loadExercises().kinds[exercise.kind] ?? []
}

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

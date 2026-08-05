import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { newEntry, toIso } from '../data/entry'
import { putEntry, readEntries, readJson, writeJson } from '../data/store'
import type { Exercise, Performed } from '../data/exercise'
import { bodyPartsOf, fieldsFor, loadExercises, setLine } from '../data/exercise'
import { Previous, Timestamp, dayTimeOf } from '../components/fields'
import { LibraryPicker } from '../components/library_picker'
import { SetTable } from '../components/set_table'
import { registerEditor } from './edit_entry'
import appSeed from '../seed/app.json'
import './workout.css'

/** Frame 4b. One screen logs live and logs after the fact — the timestamp is
 *  editable and `Previous` is always there, which is the whole of what a
 *  session runner would have added. */

const performedIn = (entry: Entry): Performed[] => (entry.payload['exercises'] as Performed[]) ?? []

/** An exercise the library no longer has — renamed away on another device, or
 *  deleted, since nothing in a seed is protected. Its own rows say what fields
 *  it was logged with, so the numbers stay visible rather than silently
 *  dropping out of the screen while sitting in the file. */
const asExercise = (performed: Performed, library: Exercise[]): Exercise =>
  library.find((item) => item.id === performed.exercise_id) ?? {
    id: performed.exercise_id,
    name: performed.exercise_id,
    body_part: '',
    kind: '',
    fields: Object.keys(performed.sets[0] ?? {})
      .filter((key) => key !== 'mark')
      .map((name) => ({ name, unit: '' })),
  }

/** The sets of one performed exercise, with the marks as prominent as the
 *  numbers — a set reads `47.5 kg × 10 more`, and `more` is the half that is
 *  worth having in September. */
function Sets({ performed, exercise }: { performed: Performed; exercise: Exercise }): VNode {
  const fields = fieldsFor(exercise)
  return (
    <>
      <span class="workout-previous-sets">
        {performed.sets.map((set, at) => (
          <span class="workout-previous-set" key={at}>
            {setLine(set, fields)} <b class="workout-mark">{set.mark}</b>
          </span>
        ))}
      </span>
      {performed.comment !== '' && <q class="workout-previous-comment">{performed.comment}</q>}
    </>
  )
}

/** A single-line comment, and the reason the log remembers *how* to do a
 *  movement rather than only how much. */
function Comment({ value, onChange }: { value: string; onChange: (v: string) => void }): VNode {
  return (
    <label class="workout-comment">
      <span class="workout-label">comment</span>
      <input
        type="text"
        aria-label="comment"
        value={value}
        onInput={(e) => onChange(e.currentTarget.value)}
      />
    </label>
  )
}

/** Workout's half of frame 4h: every performed exercise with the fields it was
 *  logged with, so a past workout edits the way it was entered. */
registerEditor('workout', (payload, onChange) => {
  const library = loadExercises().exercises
  const performed = (payload['exercises'] as Performed[]) ?? []
  const write = (at: number, next: Performed) =>
    onChange({ ...payload, exercises: performed.map((p, i) => (i === at ? next : p)) })

  return (
    <div class="workout-edit">
      {performed.map((entry, at) => {
        const exercise = asExercise(entry, library)
        return (
          <div class="workout-edit-item" key={at}>
            <h2 class="workout-edit-name">{exercise.name}</h2>
            <SetTable
              exercise={exercise}
              sets={entry.sets}
              onChange={(sets) => write(at, { ...entry, sets })}
            />
            <Comment value={entry.comment} onChange={(comment) => write(at, { ...entry, comment })} />
          </div>
        )
      })}
    </div>
  )
})

export function Workout(): VNode {
  const locale = readJson('config/app.json', appSeed).locale
  const library = loadExercises()

  const [ts, setTs] = useState(() => toIso(new Date()))
  const [performed, setPerformed] = useState<Performed[]>([])
  const [at, setAt] = useState(0)
  const [picking, setPicking] = useState(true)
  const [past, setPast] = useState(() => readEntries('workout'))
  /** Bumped when the library is written, since `library` above is read on
   *  render and nothing else here would ask for a fresher one. */
  const [, retagged] = useState(0)

  const today = new Date().toDateString()
  const isToday = (entry: Entry) => new Date(entry.ts).toDateString() === today

  const write = (next: Performed) =>
    setPerformed(performed.map((p, i) => (i === at ? next : p)))

  const start = (exercise_id: string) => {
    setPerformed([...performed, { exercise_id, sets: [], comment: '' }])
    setAt(performed.length)
    setPicking(false)
  }

  /** What was typed to filter is the new exercise's name. Body part and kind
   *  start blank and at the library's first kind, and the header above the set
   *  table is where both are answered — see `retag`. */
  const create = (name: string) => {
    const exercise: Exercise = {
      id: crypto.randomUUID(),
      name,
      body_part: '',
      kind: Object.keys(library.kinds)[0] ?? '',
    }
    writeJson('library/exercises.json', {
      ...library,
      exercises: [...library.exercises, exercise],
    })
    start(exercise.id)
  }

  /** The library edited from the screen that logs it, which is the only place
   *  either field is reachable: an exercise made inline otherwise kept a kind
   *  nobody chose forever, so `run · park loop` drew a weight box against
   *  `RULES.md`, and the blank body part is the one `DESIGN.md` §8.1 calls the
   *  reason the field exists — objectives count against it.
   *
   *  A kind decides which fields a set row records, so changing it makes the
   *  rows already typed rows of something else. They are cleared rather than
   *  carried over half-filled; in the case this exists for — a kind chosen
   *  right after making the exercise — there is nothing there to lose. */
  const retag = (id: string, patch: Partial<Exercise>) => {
    writeJson('library/exercises.json', {
      ...library,
      exercises: library.exercises.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
    retagged((n) => n + 1)
    if (patch.kind !== undefined && current !== undefined) write({ ...current, sets: [] })
  }

  /** `ended` is optional and is left out rather than guessed: pressing this
   *  ends the *recording*, which is the workout's end only when the workout is
   *  now — and a log written for last Tuesday would otherwise store a session
   *  that ran for four days. See this phase's doc. */
  const end = () => {
    const body_parts = bodyPartsOf(performed, library.exercises)
    putEntry(newEntry('workout', { started: ts, exercises: performed, body_parts }, ts))
    setPast(readEntries('workout'))
    setPerformed([])
    setAt(0)
    setPicking(true)
    setTs(toIso(new Date()))
  }

  /** Scoped to the exercise, not to the workout: the last time *this* was
   *  done, however long ago. */
  const previousOf = (exercise_id: string): Entry | null =>
    past.find((entry) => performedIn(entry).some((p) => p.exercise_id === exercise_id)) ?? null

  const current = performed[at]
  const exercise = current === undefined ? undefined : asExercise(current, library.exercises)

  /** What the library already calls a body part, offered rather than enforced. */
  const bodyParts = [
    ...new Set(library.exercises.map((item) => item.body_part).filter((part) => part !== '')),
  ].sort()

  const rail = (entries: Entry[]) =>
    entries.map((entry) => (
      <a class="workout-rail-row hit" key={entry.id} href={`#/entry/${entry.id}`}>
        <span class="workout-rail-when">{dayTimeOf(entry.ts, locale)}</span>
        <span class="workout-rail-count">{performedIn(entry).length}</span>
      </a>
    ))

  return (
    <main class="workout">
      <header class="workout-strip">
        <a class="workout-back hit" href="#/">
          ← &nbsp;workout
        </a>
        <Timestamp value={ts} onChange={setTs} locale={locale} />
      </header>

      <div class="workout-split">
        <section class="workout-rail">
          <h2 class="workout-rail-label">this workout</h2>
          {performed.map((entry, index) => (
            <button
              type="button"
              class={index === at && !picking ? 'workout-rail-row live hit' : 'workout-rail-row hit'}
              key={index}
              onClick={() => {
                setAt(index)
                setPicking(false)
              }}
            >
              <span class="workout-rail-name">{asExercise(entry, library.exercises).name}</span>
              <span class="workout-rail-count">{entry.sets.length}</span>
            </button>
          ))}
          <button type="button" class="workout-rail-add hit" onClick={() => setPicking(true)}>
            + exercise
          </button>

          {past.some(isToday) && (
            <>
              <h2 class="workout-rail-label">today</h2>
              {rail(past.filter(isToday))}
            </>
          )}
          {past.some((entry) => !isToday(entry)) && (
            <>
              <h2 class="workout-rail-label">history</h2>
              {rail(past.filter((entry) => !isToday(entry)))}
            </>
          )}

          <p class="workout-rail-progress">
            {`progress · ${past.length} ${past.length === 1 ? 'workout' : 'workouts'}, not enough to draw`}
          </p>
        </section>

        <section class="workout-fields">
          {picking || current === undefined || exercise === undefined ? (
            <>
              <h1 class="workout-title">exercise</h1>
              <LibraryPicker
                items={library.exercises.map((item) => ({
                  id: item.id,
                  name: item.name,
                  hint: item.body_part,
                }))}
                onPick={start}
                onNew={create}
                newLabel="+ new exercise"
              />
            </>
          ) : (
            <>
              <div class="workout-head">
                <h1 class="workout-title">{exercise.name}</h1>
                {/* the kinds map, never a list written here — a kind added to
                    the library shows up in this control without a build */}
                <select
                  class="workout-kind hit"
                  aria-label="kind"
                  value={exercise.kind}
                  onChange={(e) => retag(exercise.id, { kind: e.currentTarget.value })}
                >
                  {Object.keys(library.kinds).map((kind) => (
                    <option value={kind} key={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
                {/* the parts already in the library are offered, and a new one
                    is still typeable: the taxonomy is the user's, not a fixed
                    set this file knows */}
                <input
                  class="workout-part"
                  type="text"
                  aria-label="body part"
                  placeholder="body part"
                  list="workout-body-parts"
                  value={exercise.body_part}
                  onChange={(e) => retag(exercise.id, { body_part: e.currentTarget.value.trim() })}
                />
                <datalist id="workout-body-parts">
                  {bodyParts.map((part) => (
                    <option value={part} key={part} />
                  ))}
                </datalist>
                <span class="workout-scheme">{exercise.rep_scheme}</span>
              </div>
              {exercise.notes !== undefined && <p class="workout-notes">{exercise.notes}</p>}

              <Previous
                entry={previousOf(current.exercise_id)}
                locale={locale}
                render={(entry) => {
                  /* the last block of it in that workout, not the first — an
                     exercise done again as a burnout is the newer answer */
                  const last = [...performedIn(entry)]
                    .reverse()
                    .find((p) => p.exercise_id === current.exercise_id)
                  return last === undefined ? null : <Sets performed={last} exercise={exercise} />
                }}
              />

              {/* keyed on the position in the workout, and on the kind: two
                  exercises share the set table's inputs, and an uncontrolled
                  box keeps what was typed unless the subtree is rebuilt — a
                  kind changed under it swaps the columns the same way */}
              <SetTable
                key={`${at}:${exercise.kind}`}
                exercise={exercise}
                sets={current.sets}
                onChange={(sets) => write({ ...current, sets })}
              />

              <Comment
                value={current.comment}
                onChange={(comment) => write({ ...current, comment })}
              />
            </>
          )}

          <div class="workout-actions">
            <button
              type="button"
              class="workout-end hit"
              disabled={performed.length === 0}
              onClick={end}
            >
              end workout
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

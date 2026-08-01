import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { newEntry, toIso } from '../data/entry'
import { putEntry, readEntries, readJson, writeJson } from '../data/store'
import type { Exercise, Performed } from '../data/exercise'
import { fieldsFor, loadExercises, setLine } from '../data/exercise'
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

  const today = new Date().toDateString()
  const isToday = (entry: Entry) => new Date(entry.ts).toDateString() === today

  const write = (next: Performed) =>
    setPerformed(performed.map((p, i) => (i === at ? next : p)))

  const start = (exercise_id: string) => {
    setPerformed([...performed, { exercise_id, sets: [], comment: '' }])
    setAt(performed.length)
    setPicking(false)
  }

  /** What was typed to filter is the new exercise's name. It carries no body
   *  part yet and takes the library's first kind — see this phase's doc. */
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

  /** `ended` is optional and is left out rather than guessed: pressing this
   *  ends the *recording*, which is the workout's end only when the workout is
   *  now — and a log written for last Tuesday would otherwise store a session
   *  that ran for four days. See this phase's doc. */
  const end = () => {
    putEntry(newEntry('workout', { started: ts, exercises: performed }, ts))
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
                <span class="workout-kind">{exercise.kind}</span>
                <span class="workout-scheme">
                  {[exercise.body_part, exercise.rep_scheme].filter(Boolean).join(' · ')}
                </span>
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

              {/* keyed on the position in the workout: two exercises share the
                  set table's inputs, and an uncontrolled box keeps what was
                  typed unless the subtree is rebuilt */}
              <SetTable
                key={at}
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

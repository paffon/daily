import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { newEntry, toIso } from '../data/entry'
import { deleteEntry, putEntry, readEntries, readJson, updateEntry } from '../data/store'
import type { Exercise, Performed } from '../data/exercise'
import {
  asExercise,
  bodyPartsOf,
  byStaleness,
  fieldsFor,
  lastUsedAt,
  loadExercises,
  performedIn,
  setLine,
  usedBy,
  writeExercises,
} from '../data/exercise'
import { Comment, Danger, Previous, Timestamp, dayTimeOf } from '../components/fields'
import { DeleteRefused } from '../components/delete_refused'
import { ItemPhoto } from '../components/item_photo'
import { LibraryPicker } from '../components/library_picker'
import { SetFields } from '../components/set_fields'
import { SetTable } from '../components/set_table'
import { registerEditor } from './edit_entry'
import appSeed from '../seed/app.json'
import './workout.css'

/** Reshaped 2026-08-06: the module opens on the list of past workouts, with
 *  `+ new workout` above them. New and old open the same builder — one screen
 *  logs live, logs after the fact, and corrects last Tuesday, which is the
 *  whole of what `DESIGN.md` §6.2 asks of an entry. */

/** What home's recent row says about a workout: the exercises it touched, in
 *  the order they were done. The count alone reads as a number with no
 *  subject, and the names are what makes the row worth a glance.
 *
 *  A workout with nothing in it is a workout (§8.1) and says so, rather than
 *  leaving home a blank row. Descriptive, never a verdict — `RULES.md` bans
 *  motivational copy, and it bans it in both directions. */
export const workoutLine = (entry: Entry): string => {
  const library = loadExercises().exercises
  const names = performedIn(entry).map((done) => asExercise(done, library).name)
  return names.length === 0 ? 'nothing done' : names.join(', ')
}

/* `asExercise` lives in `src/data/exercise.ts` since the export needed it
   too — the fallback belongs with the type it stands in for. */

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
      {performed.comment !== '' && <q class="field-previous-comment">{performed.comment}</q>}
    </>
  )
}

/** Frame 4h's half, kept for the generic edit screen home links to: every
 *  performed exercise with the fields it was logged with. The module's own
 *  list opens the full builder instead. */
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

/** One workout being built or corrected. `entry` is null for a new one; both
 *  wear the same screen, which is what makes editing look like adding. */
function Builder({ entry, locale, onClose }: {
  entry: Entry | null
  locale: string
  onClose: () => void
}): VNode {
  const library = loadExercises()

  const [ts, setTs] = useState(() => entry?.ts ?? toIso(new Date()))
  const [performed, setPerformed] = useState<Performed[]>(() =>
    entry === null ? [] : performedIn(entry),
  )
  const [at, setAt] = useState(0)
  const [picking, setPicking] = useState(() => entry === null || performedIn(entry).length === 0)
  /** Every stored workout, frozen at mount. The picker's order is built from
   *  it, and an order that reshuffles between two presses is hostile —
   *  mid-workout is exactly when the picker is opened twice. */
  const [history] = useState(() => readEntries('workout'))
  /** The workout being corrected cannot be its own previous. It is still in
   *  `history`, because an exercise done in the workout you are fixing is not
   *  neglected, and because its reference to that exercise is as real as any
   *  other workout's. */
  const past = history.filter((line) => line.id !== entry?.id)
  const [lastUsed] = useState(() => lastUsedAt(history))
  /** Bumped when the library is written, since `library` above is read on
   *  render and nothing else here would ask for a fresher one. */
  const [, retagged] = useState(0)
  /** The exercise just made inline, still at its definition moment (§8.1) —
   *  the one time its field list is more urgent than its first set. Session
   *  state, like the rest of the builder: an exercise picked from the library
   *  was defined when it was made, and never lands here. */
  const [defining, setDefining] = useState('')

  const write = (next: Performed) =>
    setPerformed(performed.map((p, i) => (i === at ? next : p)))

  const start = (exercise_id: string) => {
    setPerformed([...performed, { exercise_id, sets: [], comment: '' }])
    setAt(performed.length)
    setPicking(false)
  }

  /** What was typed to filter is the new exercise's name. Body part starts
   *  blank and the kind at the library's first, and the header above the set
   *  table is where both are answered — see `retag`. The first kind is a seed
   *  like any other guess, so the definition block the id lands in below says
   *  so and offers the field list directly. */
  const create = (name: string) => {
    const exercise: Exercise = {
      id: crypto.randomUUID(),
      name,
      body_part: '',
      kind: Object.keys(library.kinds)[0] ?? '',
    }
    writeExercises((held) => [...held.exercises, exercise])
    retagged((n) => n + 1)
    start(exercise.id)
    setDefining(exercise.id)
  }

  /** Nothing in a seed list is protected while nothing references it —
   *  `DESIGN.md` §7. The picker asks `blocked` before it ever gets here, so
   *  what reaches this is an exercise no stored workout names. The library
   *  loses the name and the log keeps the numbers: an entry naming a removed
   *  exercise still renders through `asExercise`'s fallback. */
  const remove = (id: string) => {
    writeExercises((held) => held.exercises.filter((item) => item.id !== id))
    retagged((n) => n + 1)
  }

  /** What stands in the way of removing this exercise, or nothing. Fed from
   *  `history` rather than `past`: the workout being corrected holds a
   *  reference as real as any other's, and letting it through would delete an
   *  exercise the screen is showing the sets of. */
  const blocked = (id: string) => {
    const used = usedBy(id, history)
    if (used.length === 0) return null
    return (
      <DeleteRefused
        used={used}
        one="a workout"
        many="workouts"
        name={library.exercises.find((item) => item.id === id)?.name ?? id}
        locale={locale}
        onRename={(name) => retag(id, { name })}
      />
    )
  }

  /** The library edited from the screen that logs it: an exercise made inline
   *  otherwise kept a kind nobody chose forever, so `run · park loop` drew a
   *  weight box against `RULES.md`, and the blank body part is the one
   *  `DESIGN.md` §8.1 calls the reason the field exists — the coach counts
   *  against it, and since 2026-08-06 it also orders the list.
   *
   *  The name goes through here too. It reaches every workout that ever used
   *  the exercise for free, because an entry stores the id and `asExercise`
   *  resolves the name at read time — there is no way to fork an exercise, so a
   *  movement that has genuinely become a different one is a new exercise
   *  rather than a renamed old one (§8.1).
   *
   *  A kind or an exercise's own field list decides which columns a set row
   *  records, so changing either makes the rows already typed rows of
   *  something else. They are cleared rather than carried over half-filled; in
   *  the case this exists for — a list chosen right after making the exercise
   *  — there is nothing there to lose. A rename is not that case, which is why
   *  the branch is keyed on the patch carrying a kind or a `fields`. */
  const retag = (id: string, patch: Partial<Exercise>) => {
    writeExercises((held) =>
      held.exercises.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
    retagged((n) => n + 1)
    if ((patch.kind !== undefined || 'fields' in patch) && current !== undefined)
      write({ ...current, sets: [] })
  }

  /** An exercise picked into the workout by mistake, or one that was not
   *  actually done. Session state only — nothing has been written yet, so this
   *  is not a delete: it never arms, and leaving the screen undoes it (§8.1).
   *
   *  Dropping something above the cursor shifts the cursor down one, so the
   *  same exercise stays live; dropping the live one or anything below leaves
   *  it put and clamps, so the next exercise becomes live. */
  const drop = (index: number) => {
    const left = performed.filter((_, i) => i !== index)
    setPerformed(left)
    setAt(Math.max(0, index < at ? at - 1 : Math.min(at, left.length - 1)))
    if (left.length === 0) setPicking(true)
  }

  /** `ended` is optional and is left out rather than guessed: pressing this
   *  ends the *recording*, which is the workout's end only when the workout is
   *  now — and a log written for last Tuesday would otherwise store a session
   *  that ran for four days. */
  const save = () => {
    const body_parts = bodyPartsOf(performed, library.exercises)
    const payload = { started: ts, exercises: performed, body_parts }
    if (entry === null) putEntry(newEntry('workout', payload, ts))
    else updateEntry({ ...entry, ts, payload: { ...entry.payload, ...payload } })
    onClose()
  }

  /** Scoped to the exercise, not to the workout: the last time *this* was
   *  done, however long ago. */
  const previousOf = (exercise_id: string): Entry | null =>
    past.find((line) => performedIn(line).some((p) => p.exercise_id === exercise_id)) ?? null

  const current = performed[at]
  const exercise = current === undefined ? undefined : asExercise(current, library.exercises)

  /** What the library already calls a body part, offered rather than enforced. */
  const bodyParts = [
    ...new Set(library.exercises.map((item) => item.body_part).filter((part) => part !== '')),
  ].sort()

  return (
    <main class="workout">
      <header class="workout-strip">
        <button type="button" class="workout-back hit" onClick={onClose}>
          ← &nbsp;workout
        </button>
        <Timestamp value={ts} onChange={setTs} locale={locale} />
      </header>

      <div class="workout-split">
        <section class="workout-rail">
          <h2 class="workout-rail-label">this workout</h2>
          {performed.map((line, index) => (
            <div class="workout-rail-item" key={index}>
              <button
                type="button"
                class={
                  index === at && !picking ? 'workout-rail-row live hit' : 'workout-rail-row hit'
                }
                onClick={() => {
                  setAt(index)
                  setPicking(false)
                }}
              >
                <span class="workout-rail-name">{asExercise(line, library.exercises).name}</span>
                <span class="workout-rail-count">{line.sets.length}</span>
              </button>
              <button
                type="button"
                class="workout-rail-drop hit"
                aria-label={`remove ${asExercise(line, library.exercises).name}`}
                onClick={() => drop(index)}
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" class="workout-rail-add hit" onClick={() => setPicking(true)}>
            + exercise
          </button>
        </section>

        <section class="workout-fields">
          {picking || current === undefined || exercise === undefined ? (
            <>
              <h1 class="workout-title">exercise</h1>
              {/* longest-ago first, one exercise per body part promoted above
                  that gradient — §8.1. Built from a `lastUsed` frozen at mount,
                  so the rows do not move under a thumb that is mid-press */}
              <LibraryPicker
                items={byStaleness(library.exercises, lastUsed).map((item) => ({
                  id: item.id,
                  name: item.name,
                  hint: item.body_part,
                }))}
                onPick={start}
                onNew={create}
                onDelete={remove}
                blocked={blocked}
                newLabel="+ new exercise"
              />
            </>
          ) : (
            <>
              <div class="workout-head">
                {/* the heading is the name box: what is shown and what is
                    edited are one thing, so the screen cannot hold two names
                    that disagree between a keystroke and a blur. Committed on
                    change rather than on input, so no render happens while it
                    is being typed into.

                    A blank puts the old name back by hand rather than leaving
                    it to the controlled value: refusing writes nothing, so
                    nothing re-renders, and the box would otherwise sit there
                    empty while the library still holds the name. */}
                <input
                  class="workout-title workout-name"
                  type="text"
                  aria-label="name"
                  value={exercise.name}
                  onChange={(e) => {
                    const next = e.currentTarget.value.trim()
                    if (next === '') e.currentTarget.value = exercise.name
                    else retag(exercise.id, { name: next })
                  }}
                />
                {/* a pair, and one grid of two equal columns is what makes them
                    one size — a kind is the user's own word, so no width
                    written here can be the right one (§8.1) */}
                <div class="workout-pair">
                  {/* the kinds map, never a list written here — a kind added to
                      the library shows up in this control without a build.
                      Picking one adopts its list whole, dropping the
                      exercise's own (§8.1): a select that changed nothing
                      visible would read as broken. Overridden, it says so
                      rather than naming a kind the table is not drawing. */}
                  <select
                    class="workout-kind hit"
                    aria-label="kind"
                    value={exercise.fields === undefined ? exercise.kind : ''}
                    onChange={(e) =>
                      retag(exercise.id, { kind: e.currentTarget.value, fields: undefined })
                    }
                  >
                    {exercise.fields !== undefined && (
                      <option value="" disabled>
                        its own fields
                      </option>
                    )}
                    {Object.keys(library.kinds).map((kind) => (
                      <option value={kind} key={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                  {/* the parts already in the library are offered, and a new
                      one is still typeable: the taxonomy is the user's, not a
                      fixed set this file knows */}
                  <input
                    class="workout-part hit"
                    type="text"
                    aria-label="body part"
                    placeholder="body part"
                    list="workout-body-parts"
                    value={exercise.body_part}
                    onChange={(e) => retag(exercise.id, { body_part: e.currentTarget.value.trim() })}
                  />
                </div>
                <datalist id="workout-body-parts">
                  {bodyParts.map((part) => (
                    <option value={part} key={part} />
                  ))}
                </datalist>
                <span class="workout-scheme">{exercise.rep_scheme}</span>
              </div>
              {exercise.notes !== undefined && <p class="workout-notes">{exercise.notes}</p>}

              <ItemPhoto kind="exercise" id={exercise.id} name={exercise.name} />

              <Previous
                entry={previousOf(current.exercise_id)}
                locale={locale}
                render={(line) => {
                  /* the last block of it in that workout, not the first — an
                     exercise done again as a burnout is the newer answer */
                  const last = [...performedIn(line)]
                    .reverse()
                    .find((p) => p.exercise_id === current.exercise_id)
                  return last === undefined ? null : <Sets performed={last} exercise={exercise} />
                }}
              />

              {/* the definition moment: the exercise just made is new to the
                  library, so its field list is offered before its first set —
                  with the table live below, because define-then-log as a mode
                  would be a second screen for the same thing (§5). It leaves
                  when the first row is typed: a toggle clears the rows it
                  re-columns, which is free at that moment and a trap any
                  later. Afterwards the library screen is where the list is
                  edited (§7). */}
              {defining === current.exercise_id && current.sets.length === 0 && (
                <div class="workout-define">
                  <p class="workout-define-title">
                    this exercise is new — what does a set of it record?
                  </p>
                  <SetFields
                    exercise={exercise}
                    onChange={(patch) => retag(exercise.id, patch)}
                  />
                </div>
              )}

              {/* keyed on the position in the workout, and on the columns: two
                  exercises share the set table's inputs, and an uncontrolled
                  box keeps what was typed unless the subtree is rebuilt — a
                  field list changed under it, by the kind select or the
                  definition block, swaps the columns the same way */}
              <SetTable
                key={`${at}:${fieldsFor(exercise)
                  .map((field) => `${field.name} ${field.unit}`)
                  .join('·')}`}
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
        </section>

        {/* last in the column, under the workout it ends — reading the session
            and then ending it is the order the press happens in. It stays stuck
            to the bottom edge while the list above it scrolls, so a long
            workout never puts its own end out of reach.

            Live at zero exercises: a workout left with none is still a workout
            (§8.1). It saves, it sits in the list saying nothing was done, and
            it is deleted like any other entry if that is what was meant. */}
        <div class="workout-actions">
          <button type="button" class="workout-end hit" onClick={save}>
            {entry === null ? 'end workout' : 'save workout'}
          </button>
          {entry !== null && (
            <Danger
              onClick={() => {
                deleteEntry(entry.id)
                onClose()
              }}
            />
          )}
        </div>
      </div>
    </main>
  )
}

export function Workout(): VNode {
  const locale = readJson('config/app.json', appSeed).locale

  /** `null` is the list; `'new'` and an entry are the same builder. */
  const [open, setOpen] = useState<Entry | 'new' | null>(null)
  const [past, setPast] = useState(() => readEntries('workout'))

  const today = new Date().toDateString()
  const isToday = (entry: Entry) => new Date(entry.ts).toDateString() === today

  if (open !== null) {
    return (
      <Builder
        key={open === 'new' ? 'new' : open.id}
        entry={open === 'new' ? null : open}
        locale={locale}
        onClose={() => {
          setPast(readEntries('workout'))
          setOpen(null)
        }}
      />
    )
  }

  const rows = (entries: Entry[]) =>
    entries.map((entry) => (
      <button type="button" class="workout-rail-row hit" key={entry.id} onClick={() => setOpen(entry)}>
        <span class="workout-rail-when">{dayTimeOf(entry.ts, locale)}</span>
        <span class="workout-rail-count">
          {`${performedIn(entry).length} ${performedIn(entry).length === 1 ? 'exercise' : 'exercises'}`}
        </span>
      </button>
    ))

  return (
    <main class="workout">
      <header class="workout-strip">
        <a class="workout-back hit" href="#/">
          ← &nbsp;workout
        </a>
      </header>

      <section class="workout-rail workout-rail-page">
        <button type="button" class="workout-new hit" onClick={() => setOpen('new')}>
          + new workout
        </button>

        {past.some(isToday) && (
          <>
            <h2 class="workout-rail-label">today</h2>
            {rows(past.filter(isToday))}
          </>
        )}
        {past.some((entry) => !isToday(entry)) && (
          <>
            <h2 class="workout-rail-label">history</h2>
            {rows(past.filter((entry) => !isToday(entry)))}
          </>
        )}

        <p class="workout-rail-progress">
          {`progress · ${past.length} ${past.length === 1 ? 'workout' : 'workouts'}, not enough to draw`}
        </p>

        {/* the library's own door, opened from here rather than from home:
            correcting a name used to mean starting a workout you did not
            intend to log (§7). Home lost its one link out on 2026-08-06 and
            this is not a second one. */}
        <a class="workout-library" href="#/exercises">
          exercises &nbsp;→
        </a>
      </section>
    </main>
  )
}

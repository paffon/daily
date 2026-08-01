# P5: workout

**Plan:** v1-recording — build daily's five recording modules plus objectives
as a static offline web app storing data in the user's own Google Drive.
This phase is one step toward it; read `PLAN.md`'s Goal and Context in full
before starting. That line orients you; `PLAN.md` is the source of truth, so
don't restate its detail here.

**Your workspace.** Write freely here during implementation. Your only other
editable file is `PLAN.md` (your table row, your Phase-notes block, Incoming
comments in other phases' blocks); never another phase's `P*` doc.

**Demo:** Log a chest press with three sets where sets 2 and 3 are one tap
each, mark set 3 `more` by typing `47.5+` into the weight box, and add the
comment `30°`; reopen that exercise the next day and `Previous` hands back
`47.5 more` and `30°`.

**Goal:** Build the largest module — the exercise library with its seeds,
per-kind set rows, the copy-the-row-above set table, next-time marks with
their fast input, and comments that carry forward. One screen logs live and
logs after the fact; there is no session runner mode.

**Length note:** past 200 lines because the five kinds and their field lists
cannot split without splitting the set table itself.

## Entry criteria

Run each; all must hold before any other work. If any fails, follow
**If blocked** — do not improvise around it.

- [ ] Read this phase's block in `PLAN.md`, including any **Incoming comments** — they amend this doc
- [ ] P4's Status is `done` in `PLAN.md`'s phase table
- [ ] `npm test` → exit 0, all tests passed
- [ ] `git status --porcelain` → empty (clean tree)

## Context capsule

Read lines 232–503 of `Daily.dc.html` — frame 4b, which draws `loaded` and
`distance` side by side. Quote the path; it contains spaces. Then read
`docs/DESIGN.md` §8.1.

**A workout entry's payload:** `{ started, ended?, exercises: [...] }`; a
**performed exercise** is `{ exercise_id, sets: [...], comment }`; a **set**
carries the fields its kind declares plus `mark`. Blanks are valid.

**Library exercise**, in `library/exercises.json` seeded from
`src/seed/exercises.json`: `name` (the user's own — `dips yellow machine` is
correct, not a normalised name), `body_part` (abdomen, back, chest, hands,
heartrate, legs, shoulders), `kind`, optional `fields` overriding the kind's
field list, `rep_scheme` (a free string like `12-11-10-9` — a hint, never
enforced or validated), and `notes` (seat height, pin position). Body part is
not decoration: it is the only reason the coach can later notice that nothing
has been done for the back in three weeks.

**Kinds and their set row fields:**

| kind | set row fields |
| :- | :- |
| loaded | weight × reps |
| bodyweight | reps, optional added or assisted weight |
| hold | duration, optional weight |
| distance | distance + duration, optional incline |
| machine | duration + level, optional distance |

Kinds live in `src/seed/exercises.json` alongside the exercises, as a `kinds`
map from kind name to field list — **not as a TypeScript union or a switch.**
A per-exercise `fields` array overrides it, since an exercise needing both
distance and weight can have both.

**Resolves handoff open question 1.** `bodyweight`, `hold` and `machine` are
not drawn. Render their optional second field **always visible**, empty by
default, with the `steel-weak` border the design reserves for an optional
input. No reveal affordance. Record this as an assumption in your Outcome.

**The set table** is drawn in frame 4b; take its geometry from there. **The
number of sets is not a field.** `+ set` appends a row that **copies the row
above it, values included**, so three sets at one weight cost three taps.
The affordance carries the label `copies the row above` — **keep that label.**
It is the entire ergonomic argument and is not discoverable otherwise.

**The next-time mark** is `less` / `same` / `more` on every set row, defaulting
to `same`. It is an *instruction to a future reader*, not a rating of how the
set felt; never relabel it difficulty, effort or RPE, which `docs/CONTEXT.md`
retires. Laptop renders the words in a segmented control, phone `−` `·` `+`.
**The fast input must keep working:** the weight (or first) box accepts a
trailing run of `+` or `-`, so `47.5+` is 47.5 with mark `more` and `30--` is
30 with mark `less`. Parse the run; do not require exactly one character.

**`Previous`** here is scoped to the exercise, not the workout: the last time
*this exercise* was done, however long ago. It holds the date, every set from
last time **with its mark in `steel-text` at weight 500** — the marks are as
prominent as the numbers, which is the point of the block — and the
**carried-forward comment** in serif italic. A comment on a performed exercise
(`30°`, `strait poll, hands at shoulders width`) reappears here next time: the
log remembers *how* to do a movement, not only how much.

**Screen skeleton:** the shared one described in `PLAN.md`'s Context. This
module's rail reads `today` / `history` / `this workout` / `progress →`.

Two shared controls land here — `src/components/segmented.tsx` and
`src/components/library_picker.tsx`. **Their spec is in this phase's `PLAN.md`
block**, because P6 and P7 reuse them; build to it.

## Files

**Touch (complete list):**

- `src/screens/workout.tsx` — create: the module screen and its rail
- `src/screens/workout.test.tsx` — create: copy-row, marks, fast input
- `src/components/set_table.tsx` — create: per-kind rows and `+ set`
- `src/components/segmented.tsx` — create: the shared segmented control
- `src/components/library_picker.tsx` — create: the shared library picker
- `src/data/exercise.ts` — create: library reads, kinds, mark parsing
- `src/seed/exercises.json` — create: kinds map and a starting library
- `src/screens/edit_entry.tsx` — edit: one `registerEditor('workout', ...)` call

**Do not touch:** `src/data/store.ts` beyond adding
`['library/exercises.json', exercisesSeed]` to `SEEDS`; `src/screens/home.tsx`,
`src/data/drive.ts`, `src/data/sync.ts`; and anything not listed under Touch.
Needing an unlisted file means the plan is wrong: record it as a note in this
doc and a comment in your `PLAN.md` block; if the phase can't proceed without
it, follow **If blocked**.

## Tasks

### T1: The library and the mark parser

- Steps: write `src/seed/exercises.json` with a `kinds` map holding the five
  field lists from the capsule, and an `exercises` array of 20 to 30 entries
  covering all seven body parts and all five kinds — draft them, the user
  corrects later. Write `src/data/exercise.ts` exporting `loadExercises()`,
  `fieldsFor(exercise)` (per-exercise `fields` if present, else the kind's) and
  `parseMark(input): { value, mark }`. Register the seed in `SEEDS`. Write the
  `parseMark` cases first: `47.5+` → 47.5 / `more`, `30--` → 30 / `less`,
  `30` → 30 / `same`, `` → blank / `same`.
- Verify: `npm test` → exit 0, the `parseMark` cases pass.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T2: The shared controls

- Steps: write `src/components/segmented.tsx` and
  `src/components/library_picker.tsx` per the capsule. Both are
  presentational and read no config themselves; scales and lists are passed in.
- Verify: `npm run typecheck` → exit 0, no output.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T3: The set table

- Steps: write `src/components/set_table.tsx`, driven entirely by the field
  list from `fieldsFor` — no `if (kind === 'loaded')` anywhere. Optional fields
  render always-visible with the `steel-weak` border. `+ set` appends a deep
  copy of the last row and carries the label `copies the row above`. The first
  text field routes through `parseMark`, and a mark set that way updates the
  segmented control on the same row.
- Verify: `npm test` → exit 0, and new cases prove `+ set` copies values, that
  a `loaded` exercise renders no distance input, and that a `distance`
  exercise renders no weight input.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T4: The workout screen

- Steps: write `src/screens/workout.tsx` — strip with editable timestamp,
  rail, exercise picker, one `<SetTable>` per performed exercise, the
  single-line comment field, `+ exercise`, and the primary action that writes
  the entry through `putEntry`. `Previous` is scoped per exercise and renders
  marks in `steel-text` at weight 500.
- Verify: `npm test` → exit 0, all tests passed.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T5: The editor renderer

- Steps: add `registerEditor('workout', ...)` in `src/screens/edit_entry.tsx`
  rendering the same `<SetTable>` per performed exercise plus the comment,
  so a past workout edits with the fields it was logged with.
- Verify: `npm test` → exit 0, and a case proves opening a saved workout from
  `#/entry/{id}` renders its sets with their marks.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

## Validation gate

All of these, in order, before Exit criteria:

1. `npm test` → exit 0, all tests passed
2. `npm run typecheck` → exit 0, no output
3. Fresh review: the diff `git diff {baseline placeholder — executor
   substitutes the hash recorded in PLAN.md at phase start}..HEAD` is
   reviewed against this doc plus an over-engineering lens by a context that
   did not implement it (subagent given only the diff, this doc, and the lens
   the executor skill supplies; if subagents are unavailable, stop and ask the
   user to review in a new session). Fix findings, re-run 1-2 — but a lens
   finding on something this doc explicitly ordered is NOT fixed; record it as
   a note here and, if it affects another phase, an Incoming comment in that
   phase's `PLAN.md` block.

## Exit criteria

Runnable proof the Demo is real:

- `npm test` → exit 0, all tests passed
- `npm run build` → exit 0, `dist/index.html` written
- `npm run dev`, sign in, pick a `loaded` exercise, type `47.5` and `10`, press
  `+ set` twice → three identical rows; set row 3's weight to `47.5+` → its
  mark reads `more`; comment `30°`; save. Reopen it → `Previous` shows three
  sets, `47.5 more` on the third, `30°` in italic
- Pick a `distance` exercise → distance and duration, and **no weight box**
- Searching `src/` for `difficulty`, `effort` and `rpe` → 0 matches

## Anti-goals

Do not, even if it seems better:

- No session runner, timer or rest countdown. Live and after-the-fact are the
  same screen. No set-count field, no `sets × reps` shorthand — rows are the
  count.
- No kind logic in TypeScript. A `switch` on kind means the field list belongs
  in the seed instead.
- No validation or enforcement of `rep_scheme`. It is a hint. No graph either;
  `progress →` lists honest empty strings only.
- No renaming the mark: not difficulty, effort, RPE, or `hard/easy`.
- No 1RM estimate, volume total, tonnage, PR badge, or running count.

## Deviations

Three, all recorded rather than silently adapted.

1. **`src/main.tsx` is not in the Touch list, and the phase cannot be
   demonstrated without it.** `#/workout` rendered P1's stub, so nothing in
   the Exit criteria's `npm run dev` walk was reachable. Added exactly one
   import and one route line — the same two lines P2 needed for `#/body`.
   Every remaining module phase will need the same, so the Touch list of a
   module phase should name `main.tsx`.
2. **Four CSS files sit outside the Touch list**, following P1's recorded
   convention that per-screen and per-control CSS lives beside its module:
   `src/screens/workout.css`, `src/components/set_table.css`,
   `src/components/segmented.css`, `src/components/library_picker.css`. The
   doc named the `.tsx` files only.
3. **`src/screens/edit_entry.tsx` was not edited**, though the Touch list says
   "edit: one `registerEditor('workout', ...)` call". P4's Incoming comment in
   `PLAN.md` amends this: the call goes at module scope in the module's own
   screen file, which is how `body.tsx` does it. Written the doc's literal way,
   `edit_entry.tsx` would have to import `workout.tsx`, which imports
   `registerEditor` from `edit_entry.tsx` — a cycle. The registration lives at
   the top of `src/screens/workout.tsx`.

## Assumptions

1. **The optional second field** of `bodyweight`, `hold` and `machine` renders
   always visible with the `steel-weak` border and no reveal affordance —
   recorded here as the capsule instructed when it resolved handoff open
   question 1.
2. **The rail's order is frame 4b's**, not the capsule's sentence. The capsule
   lists `today` / `history` / `this workout` / `progress →`; the frame draws
   `this workout` at the top with `+ exercise` under it, and `PLAN.md`'s
   Context pins only that `progress →` ends the rail. So: `this workout`,
   `+ exercise`, `today`, `history`, `progress`. `today` and `history` list
   past workout entries as links to `#/entry/{id}`, and each label is hidden
   while its group is empty.
3. **`progress →` is one honest line, not a navigable list** — the shape
   `body.tsx` established in P2 (`progress · 1 workout, not enough to draw`).
   `PLAN.md`'s Goal puts progress views in a separate later plan, and P1's
   note forbids inventing routes, so no `#/workout/progress` was added.
4. **Segmented geometry.** `PLAN.md`'s "58–66px tall" appears to fuse two
   numbers frame 4b keeps apart: the segment is 66px wide and the set row is
   58px high. The control is built 66px wide, and its height is `--hit-min`
   (44px) rather than the frame's 42px, which is under the app's own hit floor
   and would have silently beaten `.hit` on specificity.
5. **"Adjacent borders do not double" is implemented as a general rule** —
   every segment but the first drops its left border, the selected one takes
   its left edge back, and the segment before it drops its right — rather than
   as the literal `border-left:none; border-right:none` on the middle child.
   The stated purpose holds at any scale length; the literal form only works
   at exactly three, and P6 or P7 may want more.
6. **The separator between two set fields is seed data** (`sep` on a field).
   `DESIGN.md` §8.1 writes `42.5 × 10`, `5 km / 28 min`, `20 min @ 8` and
   `12 +10` — four separators. In source that is a switch on kind, which the
   Anti-goals forbid, so it went into `exercises.json` beside the field it
   precedes.
7. **The next-time scale lives in `src/seed/exercises.json`**, not in
   `levels.json`. It is workout-only by `CONTEXT.md`, and `levels.json` is
   P6's to ship. Each mark carries its `value`, its phone `short` glyph and
   the `sign` its fast input is typed with; `parseMark` derives the notation's
   character set from those signs, so nothing about the scale is a literal.
8. **`ended` is left out of the payload rather than guessed** — see Fresh
   review, finding 3. The capsule marks it optional.
9. **A new exercise made inline** takes the name that was typed to filter for
   it, a blank body part, and the library's first kind. See Open questions 1.
10. **`+ set` has no inverse.** No remove affordance was specified, and a row
    left blank is a valid set. See Open questions 2.

## Fresh review

A subagent given only `git diff 19c476f..HEAD`, this doc, and the
over-engineering tag definitions. Six findings fixed in `c890609`, two of them
data bugs; the rest recorded below.

**Fixed:**

1. **The lone `-` on the way to typing `-20` set the mark to `less`, and
   nothing put it back.** The fast input fired on any text ending in a sign, so
   the first keystroke of a negative weight was read as an instruction about
   next time; every later keystroke had no trailing sign and so never restored
   it. A counterweight typed into `dips yellow machine` silently corrupted the
   one field this phase exists for. The gate now needs a real number *and* a
   mark other than the default, and the test was watched failing against the
   old gate.
2. **A workout logged for a past day stored an `ended` taken from when save
   was pressed** — a four-day session in the payload. `ended` is now omitted.
3. **`Previous` returned the first block of an exercise in the last workout,
   not the last** — an exercise repeated as a burnout handed back the opening
   sets.
4. **The selected segment's seam drew two borders**, which is the one thing
   the shared-control spec names; and its 42px height sat under `--hit-min`.
5. **`+ new exercise` silently ignored a press** when nothing was typed. It
   now disables itself and says so.
6. **The sign characters were hard-coded in a regex** while the seed already
   carried them as data, so editing one would have changed the lookup and not
   the parse. Both halves now read the seed.

**Left standing, over-engineering lens, because this doc ordered them:**

- `tone` on `Segmented` has one live value today (`steel`). `PLAN.md`'s P5
  block requires both and says `steel` and `ink-select` must not be unified;
  P6 and P7 supply the second.
- `newLabel` on `LibraryPicker` has one caller today, for the same reason —
  the control is specified as shared.
- `asExercise`'s synthesised fallback for a library item that no longer exists
  is unreachable through today's UI, since nothing renames or deletes one.
  Kept deliberately: `library/exercises.json` is a plain file in the user's
  Drive that the design expects to be readable and editable without the app,
  and without the fallback a hand-edited or another device's id would blank
  out numbers that are still in the file.

**Test gap noted, not closed:** `+ set` and the fast input are covered on the
module screen but only a reps correction is covered inside the edit screen.

## Open questions

For the planner. None blocked this phase.

1. **A new exercise has no body part and a kind nobody chose.** `+ new
   exercise` is the only way to add one, and there is no library-editing
   surface anywhere in `src/`, so both stay wrong permanently. `DESIGN.md`
   §8.1 calls body part "the only reason the field exists" — it is what lets
   the coach notice three weeks without a back exercise — and kind decides the
   fields, so a route added as `run · park loop` gets a weight box, against
   `RULES.md`'s "Never show a field the thing does not have." Not fixed here
   because the fix is UI the capsule does not specify. Smallest version: a
   native `<select>` over the kinds map and a text box for body part, both in
   the exercise header, which would also satisfy §8.1's "the field list of any
   individual exercise is editable".
2. **`+ set` cannot be undone.** A mis-tap leaves a row that can be blanked but
   not removed — including on the edit screen, which uses the same table.
   Is a blank row the intended answer, or should the table have a remove
   affordance?
3. **An unreadable box stores `null` while still showing what was typed.**
   `47..5` is recorded as blank, which "blanks are valid" allows, but the box
   goes on showing `47..5` until the entry is reopened, so a dropped value and
   a deliberate blank look identical at the moment it matters.
4. **The screen shell is now written three times** — `body.css`,
   `edit_entry.css` and `workout.css` carry the same strip, back link, field
   label and breakpoint. P4 predicted this and asked that it be raised before
   a third copy; there was no way to avoid it without touching files no module
   phase owns. P6, P7 and P8 make it six.
5. **`loadExercises()` re-reads and re-parses the library on every call**,
   including once per keystroke. Immaterial at 32 exercises; worth knowing
   before a library gets large.
6. **Should the fast input's signs be data at all?** They are now the single
   authority, which is rule-clean, but the notation is a fixed keyboard
   grammar rather than a tunable. Either reading is defensible; it is recorded
   so it is a decision rather than an accident.

## If blocked

Set this phase's Status to `blocked` in `PLAN.md`'s table (fill Baseline and
Updated), add a one-line reason to your Phase-notes block, then report to the
user and stop. Do not guess, do not widen the file list, do not edit another
phase's doc. To abandon work already done, roll back with
`git reset --hard {baseline hash from PLAN.md's phase table}`.

## On completion

1. Every Entry/Validation/Exit item passed — re-check, don't recall.
2. In `PLAN.md`: set this phase's Status to `done`, fill Baseline (the start
   hash) and Updated (today).
3. In `PLAN.md`, reflect a concise outcome into this phase's Phase-notes block
   — what other phases now need to know, and any Incoming comments for other
   phases. Keep it short; write the full detail below and point to it.
4. Record the full outcome in this doc under an **Outcome** heading:

```txt
## Outcome
Objective: {phase goal, one line}
HEAD: {git rev-parse --short HEAD} | Branch: {git branch --show-current}
Files changed: {git diff --name-only <baseline>..HEAD output}
Commands run: {the Verify/gate commands and their observed results}
Test status: {suite command + observed result}
Assumptions: {numbered, or "none"}
Open questions: {numbered, or "none"}
Next action: {the next eligible phase per PLAN.md's table, or "plan complete"}
```

## Outcome

```txt
Objective: the workout module — the exercise library and its kinds, the set
table, the next-time mark with its fast input, and comments that carry forward.

HEAD: c890609 | Branch: claude/complex-plan-phase-5-3c63d7

Files changed (14, +1596/-2):
  src/seed/exercises.json          kinds, the mark scale, 32 exercises
  src/data/exercise.ts             library reads, fieldsFor, parseMark, setLine
  src/components/segmented.tsx/css shared, reused by P6 and P7
  src/components/library_picker.tsx/css  shared, reused by P6 and P7
  src/components/set_table.tsx/css per-kind rows, + set, the fast input
  src/screens/workout.tsx/css      the module screen and the editor renderer
  src/screens/workout.test.tsx     24 cases
  src/data/store.ts                one SEEDS row
  src/main.tsx                     the #/workout route (deviation 1)
  docs/plans/v1-recording/PLAN.md  status, notes, incoming comments

Commands run:
  T1  npm test              exit 0, 62 passed — the four parseMark cases green
  T2  npm run typecheck     exit 0, no output
  T3  npm test              exit 0, 68 passed — copy-row, and the field list
                            proved by a loaded exercise with no distance box
                            and a distance exercise with no weight box.
                            The mark-preservation case was watched failing
                            against a deliberately broken gate first.
  T4  npm test              exit 0, 74 passed
  T5  npm test              exit 0, 76 passed
  gate 1  npm test          exit 0, 79 passed
  gate 2  npm run typecheck exit 0, no output
  gate 3  fresh review      6 findings fixed, 3 lens objections recorded
  exit    npm run build     exit 0, dist/index.html written
  exit    grep -rniE "difficulty|effort|rpe" src/   0 matches
  exit    npm run dev       the demo, driven in the browser:
                            chest press → 47.5 and 10 → + set ×2 → three
                            identical rows; row 3 weight `47.5+` → its mark
                            reads more while rows 1 and 2 stay same; comment
                            30°; end workout. Stored payload holds three sets
                            with mark more on the third and the comment, and
                            no ended. Reopening chest press: Previous reads
                            `47.5 kg × 10 same / same / more` and `30°`.
                            run · river path → distance, duration, incline
                            (optional, standing open) and no weight box.
                            No console errors.

Test status: npm test → exit 0, 79 passed (7 files). No test is deliberately
             left red by this phase, and none was inherited red.

Assumptions: 10, above.
Open questions: 6, above. Question 1 is the one to read.
Next action: P6, P7 and P8 are all eligible — each depends only on P4, and
             P5 blocked none of them. P6 is next in DESIGN.md §13's value
             order and inherits both shared controls.
```

# P7: movement_and_dance

**Plan:** v1-recording — build daily's five recording modules plus objectives
as a static offline web app storing data in the user's own Google Drive.
This phase is one step toward it; read `PLAN.md`'s Goal and Context in full
before starting. That line orients you; `PLAN.md` is the source of truth, so
don't restate its detail here.

**Your workspace.** Write freely here during implementation. Your only other
editable file is `PLAN.md` (your table row, your Phase-notes block, Incoming
comments in other phases' blocks); never another phase's `P*` doc.

**Demo:** Log `to work · 18 min · steady` against a library segment showing
`2.8 km · mixed`; log an `8h workday, ~6 sitting` posture block and see the
three-part bar with no percentage written anywhere; log `75 min · social` on
dance using the `75` shortcut.

**Goal:** Build the two remaining recording modules. Movement has two genuinely
different entry types — an event and a proportion — and dance is one screen
with no library and no progression tracking. They share a phase because dance
is small, not because they share code.

## Entry criteria

Run each; all must hold before any other work. If any fails, follow
**If blocked** — do not improvise around it.

- [ ] Read this phase's block in `PLAN.md`, including any **Incoming comments** — they amend this doc
- [ ] P4's Status is `done` in `PLAN.md`'s phase table
- [ ] `npm test` → exit 0, all tests passed
- [ ] `git status --porcelain` → empty (clean tree)

## Context capsule

Read lines 623–732 (frame 4d, movement) and 733–787 (frame 4e, dance) of
`Daily.dc.html`. Quote the path; it contains spaces. Then read
`docs/DESIGN.md` §8.3 and §8.4.

**Movement holds two entry types**, both listed in the rail with the posture
blocks ruled off below the events. They are distinguished by a field in the
payload, **not by a sixth module**.

**A segment is an event** — a walk, a commute leg, a flight of stairs.
Payload: `{ type: 'segment', segment_id, duration_min, level }`. The level
scale is `stroll` / `steady` / `brisk`, read from `config/levels.json`'s
`movement.scale` — P6 seeds that file, so read it, never restate the scale in
code.

Library segment, in `library/segments.json` seeded from
`src/seed/segments.json`: `name` (`to work`, `from work`), `distance_km`, and
`gradient` — one of flat, rising, descending, mixed. The distance and gradient
show beside the title as `2.8 km · mixed`. An ad-hoc segment with only a name
is valid; blanks are allowed everywhere.

Stairs count. Sprint work does not — that is a workout, and **the line is
intent, not intensity.** Nothing in code enforces this; it is why the seed
list looks the way it does.

**A posture block is a proportion** — a summary, not an event. Payload:
`{ type: 'posture', span_hours, sitting_hours }`. `8h workday, ~6 sitting` is
**one entry, not fourteen**, and the screen must make that the obvious shape.
A 12px three-part bar shows sitting / standing / remainder against the span.
**The bar is the reading, so no percentage is written** — no `75%`, no
`6 of 8`, no ratio text of any kind. `same as yesterday` is the one-tap path
for the days that repeat, prefilling from the most recent posture block.

This is the programmer-specific module absent from every fitness app, and it
covers the eight hours where the drift actually happens.

**Speed is the only scale in movement.** There is no second axis asking how
hard the commute was — nothing is being progressively loaded on a walk, so
there is no next-time mark here and no rating of any kind.

**Dance** is duration × intensity, one screen, no steps and no library.
Payload: `{ duration_min, level }`. The scale is `marking` / `social` /
`full-out` read from `config/levels.json`'s `dance.scale` — dance's own
vocabulary, never light/medium/hard, for the same reason exercises are called
`dips yellow machine`: the app uses the user's words, not a fitness app's.

Three common durations sit beside the stepper as plain tappable numbers —
`60 · 75 · 90` — seeded in `config/app.json` under `dance.common_durations`
so they are editable rather than typed into a component. The rail shows the
**last four sessions**, which is enough to answer "was that a long one"
without opening progress.

**No progression tracking, and no mark.** The app is not trying to improve the
user's dancing. Dance occupies the day and counts as load; that is all it is
for.

**Reuse, do not rebuild:** `src/components/segmented.tsx` and
`src/components/library_picker.tsx` from P5,
`src/components/amount_stepper.tsx` from P6 for durations, and `<Timestamp>`
and `<Previous>` from `src/components/fields.tsx`. The editable timestamp
reads e.g. `fri 18:20 · now sat 20:44` — logging yesterday's walk today is
normal.

`Previous` for movement is scoped to the segment; for dance it is the last
session outright.

**Level selection uses `ink-select`, not `steel`** — same rule as nutrition. A
level is a recorded property, not a live target.

## Files

**Touch (complete list):**

- `src/screens/movement.tsx` — create: both entry types and the rail
- `src/screens/movement.test.tsx` — create: segment, posture, no-percentage
- `src/screens/dance.tsx` — create: duration, intensity, last four
- `src/screens/dance.test.tsx` — create: shortcuts and scale assertions
- `src/components/posture_bar.tsx` — create: the three-part bar
- `src/data/segment.ts` — create: segment library reads
- `src/seed/segments.json` — create: a starting segment library
- `src/screens/edit_entry.tsx` — edit: two `registerEditor` calls

**Do not touch:** `src/data/store.ts` beyond adding
`['library/segments.json', segmentsSeed]` to `SEEDS`; `src/seed/levels.json`
— P6 owns it and it already carries both scales, so if a scale is wrong,
leave an Incoming comment in P6's block; `src/components/segmented.tsx`,
`src/components/amount_stepper.tsx`, `src/components/library_picker.tsx`.
`src/seed/app.json` needs `dance.common_durations` added — that is a one-key
edit and is permitted. Anything not listed under Touch. Needing an unlisted
file means the plan is wrong: record it as a note in this doc and a comment in
your `PLAN.md` block; if the phase can't proceed without it, follow
**If blocked**.

## Tasks

### T1: The segment library and the bar

- Steps: write `src/seed/segments.json` with roughly six to ten named routes
  drawn from the user's actual day — commute legs in both directions, stairs,
  the walk to lunch — each with a `distance_km` and a `gradient`. Register it
  in `SEEDS`. Write `src/data/segment.ts` exporting `loadSegments()`. Write
  `src/components/posture_bar.tsx`: a 12px bar in three parts, sitting /
  standing / remainder, sized against the span, with **no text inside or
  beside it**. Write its test first, asserting the rendered markup contains
  no `%` character and no digits.
- Verify: `npm test` → exit 0, the posture bar cases pass.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T2: The movement screen

- Steps: write `src/screens/movement.tsx` — strip with the editable
  timestamp, rail listing segment events with posture blocks ruled off below
  them, and a main column that switches between the two entry types. The
  segment form is picker, `Previous`, duration stepper, speed level control.
  The posture form is a span field, a sitting field, the bar, and
  `same as yesterday` prefilling from the most recent posture block. Both
  scales come from `config/levels.json`.
- Verify: `npm test` → exit 0, and a case proves both entry types write a
  `movement` entry distinguished by `payload.type`.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T3: The dance screen

- Steps: add `dance.common_durations` to `src/seed/app.json`. Write
  `src/screens/dance.tsx` — duration stepper with the common durations beside
  it as plain tappable numbers read from config, the intensity level control
  reading `dance.scale`, `Previous` showing the last session, and the rail
  showing the last four. No mark, no rating, no progression.
- Verify: `npm test` → exit 0, and cases prove the three scale labels render,
  that no `60`, `75` or `90` literal appears in `src/screens/dance.tsx`, and
  that no next-time mark control renders.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T4: The editor renderers

- Steps: add `registerEditor('movement', ...)` — branching on `payload.type`
  so a segment edits as a segment and a posture block as a posture block —
  and `registerEditor('dance', ...)` in `src/screens/edit_entry.tsx`.
- Verify: `npm test` → exit 0, all tests passed.
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
- `npm run dev`, sign in, then: pick `to work`, confirm `2.8 km · mixed`
  renders beside the title, set 18 minutes and `steady`, save → it appears in
  the rail and in home's `recent`
- Log a posture block of 8 hours with 6 sitting → the bar renders in three
  parts and **no percentage or ratio text appears anywhere on the screen**
- Log a second posture block via `same as yesterday` → the fields prefill
- On dance, tap `75`, choose `social`, save → the rail's last-four list shows
  it, and there is no mark control on the screen

## Anti-goals

Do not, even if it seems better:

- No sixth module for posture. It is movement's second entry type.
- No percentage, ratio, or `6 of 8` text near the posture bar. The bar is the
  reading.
- No next-time mark, no difficulty, no effort, no intensity rating on movement
  — speed is the only scale, and dance's intensity is a level, not a rating.
- No progression tracking, no personal best, no pace calculation, no
  steps-per-day, no GPS, no device import, no step counter.
- No fourteen posture entries for one day, and no UI that invites them.
- No duplicate level scale in code. Both scales are already in
  `src/seed/levels.json`.
- No graph. `progress →` lists honest empty strings only, as in P5.

## If blocked

Set this phase's Status to `blocked` in `PLAN.md`'s table (fill Baseline and
Updated), add a one-line reason to your Phase-notes block, then report to the
user and stop. Do not guess, do not widen the file list, do not edit another
phase's doc. To abandon work already done, roll back with
`git reset --hard {baseline hash from PLAN.md's phase table}`.

## Prior attempt

**Resolved.** `PLAN.md`'s table now reads `Depends on: P4, P5, P6` and this
phase is `pending`, waiting its turn. Nothing below asks for a change to this
doc — every task works as written once P6 lands. Kept as the record of why the
column says what it says.

**2026-08-01, at `19c476f`.** Stopped before touching code. Entry criteria
all passed — P4 `done`, `npm test` exit 0 (6 files, 55 tests), tree clean — and
the drift scan since P4's baseline `b736ee8` found nothing that collides. The
block was in this doc's own dependency assumption.

The phase table said **Depends on: P4**, and said P5–P8 were independent of each
other. This doc is not. Its capsule reuses four things that P5 and P6 build,
and its **Do not touch** list names all four, so they cannot be supplied here:

| needed by | artifact | owner | exists |
| :- | :- | :- | :- |
| T2, T3 | `src/components/segmented.tsx` | P5 | no |
| T2 | `src/components/library_picker.tsx` | P5 | no |
| T2, T3 | `src/components/amount_stepper.tsx` | P6 | no |
| T2, T3 | `src/seed/levels.json` → `config/levels.json` | P6 | no |

`src/components/` holds only `fields.tsx` and `fields.css`; `src/seed/` holds
only `app.json`; `SEEDS` in `src/data/store.ts` has one entry. Nothing under a
different name — `git grep` for `levels.json`, `segmented`, `amount_stepper`,
`library_picker`, `movement.scale`, `dance.scale` hits only the design handoff
README.

The scales are the sharpest edge. The capsule says to read `movement.scale` and
`dance.scale` from `config/levels.json`; **Anti-goals** says "No duplicate level
scale in code"; **Do not touch** assigns the file to P6 and says "it already
carries both scales". It does not exist. There is no reading of this doc under
which P7 can put `stroll / steady / brisk` on screen today.

**What is unaffected:** T1 in full — `src/seed/segments.json`, its `SEEDS`
registration, `src/data/segment.ts`, and `src/components/posture_bar.tsx` with
its test. None of it touches P5 or P6 territory. The posture *form* in T2 is
also close to independent (span field, sitting field, the bar, `same as
yesterday` — no picker, no stepper, no scale), but T2 also owns the segment
form and the two-type switch, so the task cannot complete.

**The fix, applied.** Cheapest was the true one: P7's **Depends on** was wrong,
not its content. It now reads `P4, P5, P6`, so this phase runs after P6 — which
is already the numbered order — and every task works as written with no other
change. Two alternatives were considered and rejected: reassigning the three
shared components and `levels.json` to whichever of P5/P6/P7 runs first, which
moves ownership out of the phase whose capsule specifies them; and splitting T1
into a standalone phase, which buys one commit and leaves the dependency behind.

A parallel session reached the same finding independently at `c28cc1d` on
branch `claude/complex-plan-phase-7-18b155`. Same conclusion, same four
artifacts; that branch was dropped rather than merged, to keep one record.

## Deviations

Recorded as they happened. Every one of them still ran the doc's Steps.

1. **`src/seed/app.json` gained two whole sections, not the one key.** **Do not
   touch** permits `dance.common_durations` as "a one-key edit". But
   `RULES.md`'s hard rule is *every number, threshold, default, multiplier,
   scale and list is editable data, never a constant in source*, and this phase
   puts six more numbers on screen: a segment's opening duration and step, a
   posture block's opening span, opening sitting figure and hours step, and
   dance's opening duration, step and rail length. Each would have been a
   literal in a screen. `movement` has six keys and `dance` five, matching
   P2's `home` and P6's `nutrition`. **`movement.default_level` and
   `dance.default_level` are the two worth knowing about** — a segment has no
   per-item default the way a food does, so the opening level is one global
   number rather than a field on every seeded route.
2. **`src/main.tsx` needed an import and a route line per screen**, and is in
   no module phase's Touch list. P5 recorded this first and P6 hit it too;
   without it `#/movement` and `#/dance` render P1's stub. Third phase, same
   two lines.
3. **Both `registerEditor` calls sit in their own screen file**, not in
   `src/screens/edit_entry.tsx` as T4's Steps and the Files list read. Putting
   them there makes the edit screen import the two modules that import it.
   P4's Incoming comment, P5's deviation 3 and P6's all say the same; that file
   is untouched by this phase.
4. **Three CSS files no list names** — `src/components/posture_bar.css`,
   `src/screens/movement.css`, `src/screens/dance.css`. P1's convention is that
   per-screen CSS lives beside its screen and every shared control carries its
   own; `tokens.css` does not grow. Same unlisted-file class as P1's
   `home.css`.
5. **The posture bar's test asserts on rendered text, not on the markup
   string.** T1 asks for a test "asserting the rendered markup contains no `%`
   character and no digits". A bar that is a proportion has to carry that
   proportion somewhere in an attribute, so the no-digits half cannot hold
   against `innerHTML` for any bar that draws. It is met in the strongest form
   that can be: the parts are sized with `flex-grow`, so **no `%` appears in
   the markup at all** — asserted literally — and the bar's `textContent` is
   empty, which is the stronger claim that it writes nothing rather than that
   it writes no percentage.
6. **`60`, `75` and `90` are searched for through Vite's `?raw` import**
   rather than `node:fs`, which would have wanted `@types/node` added for a
   file the bundler already reads. Two comments in `dance.tsx` were reworded to
   drop the digits — the same collision P8 hit, where a forbidden-term search
   cannot return zero while the prose documents the rule it follows. Here the
   comments read the same without the numbers.

## Assumptions

1. **A segment's opening level is one global config number**, not a
   `default_level` per library item as nutrition has. A food's normal portion
   genuinely differs per food; a walking pace is the user's own and is one
   number. Reversible — the field would go on the seeded segment.
2. **The rail's `today` label and filter follow nutrition's**, since frame 4d
   labels it `today`. See open question 2 for what that costs.
3. **`same as yesterday` disables itself before any block exists**, the way
   `+ new` disables with nothing typed, rather than being absent or silently
   doing nothing.
4. **One `log it`, not frame 4d's `log it` + `log and add another`.** Logging
   already lands back at the picker, so the second button is the first one
   pressed twice — nutrition made the same call for the same reason.
5. **A posture block's title in the edit screen is the word `posture`.** P4's
   registry titles an entry by its module, so without it a block and a walk
   both open under `movement` with no way to tell which is which.

## Fresh review

A subagent given only `git diff e614d5d..HEAD`, this doc and the
over-engineering lens. It re-ran the gate itself and then found seven things.
Three were fixed, four are recorded below rather than fixed.

**Fixed — a real data defect.** `setDuration` in `dance.tsx` was wired to both
the shortcut buttons and the stepper's own `onChange`, and it bumps the remount
key. So the box could not be typed into: the first keystroke replaced the
`<input>`, focus fell to `<body>`, a phone's keyboard would close, and a
session meant to be 45 minutes logged as 4 with nothing on screen having said
so. No test typed into that box, which is why 196 tests passed over it. The
shortcuts keep the remount, the box no longer triggers it; a case in
`dance.test.tsx` asserts the input node survives a keystroke and was watched to
fail first, `movement.test.tsx` carries the same guard, and the fix was walked
in a real browser — typing `45` keeps both characters and keeps focus.

**Fixed — a constant in source.** The dance rail's heading said `last four`
while the list length came from `dance.recent_count`; editing the config left
the word and the rows disagreeing. The heading counts what it shows.

**Fixed — five cuts.** `lineOf` dispatched on a `payload.type` both its call
sites had already filtered by; `movementConfig` sat in `segment.ts`, whose
stated job is segment library reads, while dance's twin was local to its
screen; an unused `Entry` import; `overflow: hidden` on a grow-only flex row
and `role="presentation"` on a div that has no role to suppress. The local
payload type `Segmented` was renamed `Walk` — it was shadowing the shared
control's own export name for anyone who later reaches for it in that file.

**Not fixed — see the open questions below.** The bar's inert third part (1),
the backdated entry that vanishes from the rail (2), an emptied stepper box
that saves the old number (3), and the two Incoming comments now due (4, 5).

## Open questions

For the planner. Nothing here blocked the phase.

1. **The posture bar's third part can never have width, and this doc ordered
   three.** The capsule says "a 12px three-part bar shows sitting / standing /
   remainder against the span", but the payload it also specifies —
   `{ span_hours, sitting_hours }` — carries two numbers, so standing is
   `span − sitting` by construction and the remainder is always zero. Measured
   in the browser: 615.75px / 205.25px / **0px**. Frame 4d had three parts
   because it had three inputs (`sitting 6 · standing 2 · rest 0.5`, from a
   `09:00 — 17:30` range); the payload dropped the third degree of freedom and
   the third part is what was left behind. Built as ordered and left in place
   per the Validation gate's rule. The fix is one of two planner calls: the
   payload gains `standing_hours` and the form a third field, or the bar is
   two parts and the doc says so. **Everything else about the bar is right** —
   it writes nothing, which is the part that matters.
2. **Fixed for movement; nutrition is the one screen left.** A backdated entry
   was saved and then vanished from the screen that saved it — the capsule
   calls logging yesterday's walk today the ordinary case and the editable
   timestamp makes it one press, but the rail filtered on the wall-clock day,
   so the entry was written correctly and shown nowhere. The only trace was
   `progress · 1 entry`, which reads as a failed save, and the obvious next
   press logs it twice. **The first report of this named the wrong screens.**
   Checked one at a time afterwards: `workout.tsx` had already answered it in
   P5 with `today` + `history` groups, `body.tsx` never filtered at all (its
   rail is `recorded`), and dance shows its last four by timestamp. Only
   movement and nutrition were affected. `movement.tsx` now carries the same
   two groups — `today` and `earlier`, the second rendered only when it has
   something in it, rows keyed to the clock for today and the date for the
   rest — with a case in `movement.test.tsx` watched to fail without it.
   `nutrition.tsx` is in no P7 list, so it is a comment in P6's block rather
   than a fix. Left standing and small: the wall-clock day is captured once per
   render, so a screen open across midnight goes on showing yesterday.
   `railRow`'s dispatch on `payload.type` is also the reason the fresh review's
   `lineOf` cut was right when it was made and would be wrong now — the history
   group is a call site that has not filtered by type.
3. **An emptied stepper box shows blank and logs the old number.**
   `AmountStepper` suppresses `onChange` for an unreadable box, which is right
   — half a typed number is not a number. But clearing the `sitting` box leaves
   the field blank while the bar underneath goes on drawing the old figure and
   `log the block` saves it. It reads worse here than in nutrition because the
   bar sits directly under the box and looks like a live echo of it. The
   control is P6's and this phase's **Do not touch** names it, so it is a note
   rather than a fix — see the Incoming comment left in P6's block.
4. **The edit screen's not-built-yet branch is now unreachable**, which P4
   asked to be told about rather than have deleted silently. All five modules
   have editors as of this phase. `src/screens/edit_entry.test.tsx:102` still
   passes only because that file imports no module screen, so nothing registers
   — the branch is covered by an import-order accident rather than by a
   reachable state. Deleting it is P4's call; it is not in this phase's list.
5. **Home's `recent` still says nothing about a walk or a session.**
   `detail(entry, config)` in `src/screens/home.tsx` switches on the module and
   answers only for `body`, so a logged segment, block or dance session shows
   its time, its module and a blank. P6 predicted this arriving "with the same
   gap for two more modules"; it now covers four of the five. `home.tsx` is in
   no module phase's Touch list, and the question P2 left P4 — whether the
   renderer registry should cover `recent` rows as well as the edit screen — is
   the fix. Every module now has a one-line renderer for exactly this
   (`segmentLine`, `postureLine`, `sessionLine`, nutrition's `lineOf`), so the
   answer is cheaper today than when it was asked.
6. **`DESIGN.md` §8.3 still says a segment records "a difficulty".** This
   doc's Anti-goals, frame 4d's own note, `RULES.md` and `CONTEXT.md` all say
   the opposite — difficulty was replaced by the next-time mark and is workout
   only. Built without it, per this doc. The spec sentence looks like a
   survivor of the reversal and is worth striking so it does not reintroduce
   the field by being read literally later.

## Outcome

```txt
Objective: build the two remaining recording modules — movement's segment and
  posture-block entry types, and dance.
HEAD: 550623f | Branch: v1-implementation
Files changed (git diff --name-only e614d5d..HEAD):
  docs/plans/v1-recording/PLAN.md
  src/components/posture_bar.css        src/components/posture_bar.tsx
  src/data/segment.ts                   src/data/store.ts
  src/main.tsx                          src/screens/dance.css
  src/screens/dance.test.tsx            src/screens/dance.tsx
  src/screens/movement.css              src/screens/movement.test.tsx
  src/screens/movement.tsx              src/seed/app.json
  src/seed/segments.json
Commands run:
  Entry: npm test → exit 0, 12 files / 155 tests passed; git status --porcelain
    → empty; P4 (and P5, P6) `done` in the table.
  Drift scan since P6's baseline 0a32e6b → no collision; none of this phase's
    Touch files existed, and all four artifacts it waited on were present.
  T1 npm test → exit 0 (13 files / 165). T2 → exit 0 (13 / 179).
  T3 → exit 0 (14 / 188). T4 → exit 0 (14 / 194).
  Gate 1 npm test → exit 0, 14 files / 196 tests passed.
  Gate 2 npm run typecheck → exit 0, no output.
  Gate 3 fresh review → 7 findings, 3 fixed, 4 recorded as open questions.
  Exit npm run build → exit 0, dist/index.html written.
  Watched to fail before their fix: the posture bar's sitting clamp, `same as
    yesterday` prefilling the box, and the dance box surviving a keystroke.
  After the record was written, open question 2 was fixed for movement — the
    rail gained an `earlier` group, watched to fail first — taking the suite to
    198 and re-running the gate: npm test exit 0, typecheck exit 0, build exit
    0, and the empty case confirmed in the browser (no `earlier` heading until
    it has something in it).
Test status: npm test → 14 files, 198 tests, all passed.
Assumptions: 5, above.
Open questions: 6, above. The one to read is question 1 — this doc ordered a
  three-part bar and specified a two-number payload, and the third part is 0px
  wide for every possible input.
Exit criteria: the two runnable ones passed. The four browser walkthroughs
  were walked as far as they can be walked without writing into the user's real
  log: `#/movement` renders the seeded library with `2.8 km · mixed` beside
  `to work`, the posture form draws the bar 615.75 / 205.25 / 0 px — 6 of an
  8 hour span — with no `%` and no ratio text anywhere on the screen, and
  `#/dance` shows `last 4`, the three seeded shortcuts, the three dance words,
  no mark control and no graph. The saving half of each bullet (save → it
  appears in the rail and in home's recent; a second block via `same as
  yesterday`; the dance rail's last-four list) would write four entries into
  the user's own body log and sync them to their Drive, so it was left for
  them; each is covered by a test in `movement.test.tsx` / `dance.test.tsx`.
Next action: every phase in PLAN.md's table is now `done` — the plan's
  On completion steps (graduate decisions to an ADR, stamp, archive) are the
  next thing, at the user's word.
```

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

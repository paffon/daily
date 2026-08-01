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

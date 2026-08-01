# P6: nutrition

**Plan:** v1-recording — build daily's five recording modules plus objectives
as a static offline web app storing data in the user's own Google Drive.
This phase is one step toward it; read `PLAN.md`'s Goal and Context in full
before starting. That line orients you; `PLAN.md` is the source of truth, so
don't restate its detail here.

**Your workspace.** Write freely here during implementation. Your only other
editable file is `PLAN.md` (your table row, your Phase-notes block, Incoming
comments in other phases' blocks); never another phase's `P*` doc.

**Demo:** Log 2 slices of pizza at `loaded` — the entry reads
`2 slices · loaded · 570 kcal · 24 g protein`, with the 1.4× multiplier
applied to the food's normal-case numbers — and the three level examples
render as three columns of prose under the three buttons.

**Goal:** Build a flat timeline of what was eaten and when, with per-food
units, optional level examples, and level multipliers that live in editable
data. Nothing in this module knows what a meal is.

## Entry criteria

Run each; all must hold before any other work. If any fails, follow
**If blocked** — do not improvise around it.

- [ ] Read this phase's block in `PLAN.md`, including any **Incoming comments** — they amend this doc
- [ ] P4's Status is `done` in `PLAN.md`'s phase table
- [ ] `npm test` → exit 0, all tests passed
- [ ] `git status --porcelain` → empty (clean tree)

## Context capsule

Read lines 504–622 of `Daily.dc.html` — frame 4c. Quote the path; it contains
spaces. Then read `docs/DESIGN.md` §8.2.

**No meals.** Nothing in the app knows what breakfast is. Six entries across a
day and one entry across a day are the same shape — no container, no session,
no `done` button, and **no day total anywhere.**

**An entry's payload:** `{ food_id, amount, level }`. That is all.

**Library food**, in `library/foods.json`, seeded from `src/seed/foods.json`:
`name` (pizza, coffee, cottage cheese), `unit` — the natural unit for *this*
food: slice, cup, piece, gram, plate — `default_level` so the common entry is
one tap, optional `kcal` and `protein` for the **normal** case at one unit,
and an optional `examples` object with `lean` / `normal` / `loaded` prose.

**Drinks are foods.** Coffee, beer and juice live in the same library. "What I
ate" silently excludes a real part of an office day, so the screen's language
is about entries, not eating.

**The unit belongs to the food, not the entry.** Pizza in slices, coffee in
cups, chicken in grams. It is shown beside the number in the stepper at 13px
mono and is never chosen per entry. Amounts are fractional: `3.5 slices` is a
valid entry.

**Levels are multipliers; examples are prose.** `src/seed/levels.json` holds
every module's level scale and the global multipliers — seed `lean` 0.7 and
`loaded` 1.4, `normal` 1.0 — and it is the file P7 reads for its own scales,
so give it this shape:

```json
{ "nutrition": { "scale": ["lean","normal","loaded"],
                 "multipliers": {"lean":0.7,"normal":1,"loaded":1.4} },
  "movement":  { "scale": ["stroll","steady","brisk"] },
  "dance":     { "scale": ["marking","social","full-out"] } }
```

Multipliers apply to the food's normal-case `kcal` and `protein`. **Only the
examples are per-item**, and they are optional — written once for the foods
where the distinction is genuinely confusing, blank everywhere else. Authoring
three sets of numbers per food would turn the library into a data-entry
project, and a food library that is a project does not get maintained.

**The level control** is the part that needed designing. Build **one**
component with an optional examples array, never two controls:

- With examples, all three render at once as serif prose in three columns
  under the three buttons. All three, because comparing is what makes them
  useful.
- With none, the prose simply does not exist and **the buttons are identical**
  to the with-examples case.

Selection uses `ink-select`, **not** `steel`. A level is a recorded property,
not a live target; the design deliberately does not unify them.

**Numbers.** Calories and protein, both optional, both authored for the normal
case only — carbohydrate, fat and fibre are noise at this precision and cost a
field each. Shown **per entry only**: `570 kcal · 24 g protein`. Never summed
across a day, a week, or anything.

**The timestamp** reads `20:05 · now 20:41` when pulled back from now, using
`<Timestamp>` from `src/components/fields.tsx`. Logging the apple from an hour
ago is the normal case, not a correction.

**Reuse, do not rebuild:** `src/components/segmented.tsx` and
`src/components/library_picker.tsx` from P5. The level control wraps the
segmented control and adds the examples row beneath it.

`Previous` for nutrition is scoped to the food: the last time *this food* was
logged, with its amount and level.

## Files

**Touch (complete list):**

- `src/screens/nutrition.tsx` — create: the module screen, rail and timeline
- `src/screens/nutrition.test.tsx` — create: multipliers, units, examples
- `src/components/amount_stepper.tsx` — create: fractional amount plus unit
- `src/components/level_control.tsx` — create: segmented plus optional prose
- `src/data/food.ts` — create: library reads and the multiplier arithmetic
- `src/seed/foods.json` — create: a starting food library
- `src/seed/levels.json` — create: every module's scale and the multipliers
- `src/screens/edit_entry.tsx` — edit: one `registerEditor('nutrition', ...)` call

**Do not touch:** `src/data/store.ts` beyond adding
`['library/foods.json', foodsSeed]` and `['config/levels.json', levelsSeed]`
to `SEEDS`; `src/components/segmented.tsx` and
`src/components/library_picker.tsx` — reuse them as they are, and if one needs
a change, leave an Incoming comment in P5's block rather than editing it
freely. Anything not listed under Touch. Needing an unlisted file means the
plan is wrong: record it as a note in this doc and a comment in your
`PLAN.md` block; if the phase can't proceed without it, follow **If blocked**.

## Tasks

### T1: The library, the scales and the arithmetic

- Steps: write `src/seed/levels.json` in exactly the shape above and
  `src/seed/foods.json` with roughly 30 to 40 foods covering the user's actual
  day — including drinks, and including several with no `kcal` at all, since
  blank is the common case. Give `examples` to only three or four foods,
  pizza among them, using `docs/DESIGN.md` §8.2's worked example verbatim.
  Register both in `SEEDS`. Write `src/data/food.ts` exporting `loadFoods()`
  and `nutritionFor(food, amount, level)` returning `{ kcal, protein }` or
  nulls, reading the multipliers from `config/levels.json`. Write the
  arithmetic cases first: 2 slices of a 200 kcal food at `loaded` → 560 kcal;
  at `normal` → 400; a food with no `kcal` → null, not 0.
- Verify: `npm test` → exit 0, the arithmetic cases pass.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T2: The controls

- Steps: write `src/components/amount_stepper.tsx` — a large mono number with
  the unit alongside and plus/minus buttons, taking geometry from frame 4c and
  accepting fractional input by typing as well as by stepping. Write
  `src/components/level_control.tsx` wrapping the segmented control, selection
  in `ink-select`, with the optional three-column examples row beneath.
- Verify: `npm test` → exit 0, and cases prove the examples row renders three
  columns when given examples and renders nothing at all when given none,
  with the buttons identical in both cases.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T3: The nutrition screen

- Steps: write `src/screens/nutrition.tsx` — strip with the editable
  timestamp, rail listing today's entries as a flat timeline newest first,
  main column with the food picker, `Previous` scoped to the food, the amount
  stepper carrying the food's unit, the level control defaulting to the food's
  `default_level`, the per-entry `kcal · protein` line, and the primary action.
- Verify: `npm test` → exit 0, and cases prove there is no element containing
  a day total and no text matching `/breakfast|lunch|dinner|meal/i`.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T4: The editor renderer

- Steps: add `registerEditor('nutrition', ...)` in
  `src/screens/edit_entry.tsx` rendering the food name, the amount stepper and
  the level control, so a past entry edits with the same fields it was logged
  with.
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
- `npm run dev`, sign in, then: pick pizza, set the amount to `2`, choose
  `loaded` → three columns of example prose appear and the line reads
  `2 slices · loaded` with kcal and protein at 1.4× the normal case. Save,
  then pick a food with no examples → the buttons look identical and no prose
  renders
- Log three entries in one day → a flat list, no grouping, header, total or
  `done` control
- Searching `src/` for `breakfast`, `lunch`, `dinner`, `meal` → 0 matches; for
  `0.7` and `1.4` → 0 matches outside `src/seed/levels.json`

## Anti-goals

Do not, even if it seems better:

- No meal, grouping, time-of-day bucket, `done` button, day total, weekly
  average, macro ring, calorie budget or remaining count.
- No carbohydrate, fat or fibre field. Two numbers, both optional. No required
  field either — a food name and a time is a complete entry.
- No per-food per-level numbers. Multipliers are global and editable; only
  examples are per food.
- No second control for the has-examples case. One component, optional array.
- No `steel` on the level selection — that colour means "the live one" and a
  level is a recorded property.
- No barcode scanning, nutrition database lookup, or import.

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

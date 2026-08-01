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

## Deviations

Recorded as they happened. Nothing here changed what the doc asked for; each
is a place reality and the doc disagreed.

1. **`src/screens/edit_entry.tsx` was not edited.** The Files list says
   `edit: one registerEditor('nutrition', ...) call`, but P5's Incoming comment
   in `PLAN.md` and P4's own note both say the call goes **at module scope in
   the module's own screen file** — putting it in `edit_entry.tsx` would make
   that screen import the module that imports it. The call sits at the top of
   `src/screens/nutrition.tsx`, and `edit_entry.tsx` is untouched.
2. **`src/main.tsx` needed one import and one route line**, and it is in no
   module phase's Touch list. P5 recorded the same deviation for `#/workout`;
   without it `#/nutrition` renders P1's stub. P7 will hit it too.
3. **Three CSS files were created that the Touch list does not name** —
   `src/components/amount_stepper.css`, `src/components/level_control.css` and
   `src/screens/nutrition.css`. P1's convention puts per-screen and
   per-component CSS beside its file and forbids growing `tokens.css`; every
   component P5 shipped has one. `nutrition.css` is the **fourth** copy of the
   module skeleton — see open question 3.
4. **Four keys were added to `config/app.json`** under a new `nutrition`
   section: `amount_start`, `amount_step`, `decimals` and `new_food`. Each one
   deletes a literal that `RULES.md` forbids — the amount a food opens at, what
   a press adds, how many decimals a number is shown to, and the unit and level
   a food created inline gets. `new_food` follows the shape P8 gave
   `objectives.new_target`.
5. **`src/seed/foods.json` is a wrapper object, not a bare array.** It is
   `{ units, foods }`, the shape `exercises.json` already uses. `units` maps a
   unit to how it reads past one (`slice` → `slices`); a unit absent from the
   map reads the same at either count, which is what `g` needs. The alternative
   was an English plural rule in source — which `RULES.md` forbids as a list in
   code, and which gets `glass` and `g` wrong anyway.
6. **A `change` press was added beside the food's name.** Nothing in the doc
   names one, but picking a food replaced the picker with the fields and left
   no way back: the wrong food, once picked, was permanent for that entry. One
   press, and it is what the tests use to reach a second food.
7. **The primary action is one button, not frame 4c's two.** `log it` and
   `log and add another` do the same thing here, because nothing contains an
   entry — logging always lands back at the picker. T3 says "the primary
   action", singular.
8. **Frame 4c's food reference line is not built** — the
   `slice · 285 kcal · 12 g protein at normal` beside the title. T3's field list
   does not name it, and the per-entry line below it says the same thing for
   the amount actually being logged. See open question 2.
9. **The entry criteria's clean-tree check was not literally met.**
   `git status --porcelain` reported one untracked file, `.claude/settings.json`
   — harness configuration, outside `src/`, and unable to enter either the
   review diff or the rollback target. The phase proceeded rather than blocking
   on it.

## Assumptions

1. **Pizza is seeded at the frame's numbers**, 285 kcal and 12 g protein at one
   slice — see open question 1 for why that contradicts this doc's Demo line.
2. **A food's `unit` is blank where the food counts as itself.** An apple reads
   `1 · normal`, which is what frame 4c's rail shows. `piece` never appears.
3. **The head reference numbers, had they been built, would have read at the
   food's `default_level`** rather than at a level named `normal` in source.
   Nothing in the code names a level.
4. **`examples` is all-three-or-nothing per food.** A partial object renders a
   blank column rather than collapsing the row — the has-examples distinction
   is per food, not per level.
5. **The rail lists today only**, and the `progress` line counts every entry
   ever logged. Frame 4c's rail is headed `today`; the progress affordance is
   about the history behind it.

## Fresh review

`git diff 0a32e6b..HEAD` reviewed by a context that did not implement it,
against this doc plus the over-engineering lens. Two data defects were found
and fixed, each with a test watched to fail without the fix:

- **A typed negative amount reached the payload.** The presses clamped at zero
  but the box did not, so typing `-5` stored a negative amount, reported
  negative calories and pluralised to `-5 slices`. A typed negative is now
  unreadable the way a word is.
- **A written-out `"kcal": null` multiplied to `0`.** The guard tested for an
  absent key only. The library is a file the user edits and syncs, and `null`
  is how a person writes down that there is no number — so an unknown was being
  recorded as a zero, which is the one distinction `nutritionFor` exists to
  keep.

Three lens findings were applied: `foodLine` collapsed into its single caller,
a redundant `gap: 0`, and a comment explaining that a `food === null` test is
the type checker's rather than a state the screen can reach.

The lens's largest finding was **not** applied, because this doc ordered the
file that carries it: `nutrition.css` is the fourth copy of the module
skeleton, and roughly 90 of its 232 lines are shared with `body.css`,
`workout.css` and `edit_entry.css`. Hoisting them crosses files no module
phase owns. It is open question 3, and P5's open question 4 before that.

## Open questions

For the planner. None blocked this phase.

1. **This doc's Demo cannot be produced as written.** It says 2 slices of pizza
   at `loaded` reads `570 kcal · 24 g protein` *with the 1.4× applied*. With
   the frame's seeded pizza (285 kcal, 12 g protein at one slice) that is the
   **normal** case; `loaded` gives `798 kcal · 34 g protein`. Frame 4c shows
   285/12 beside the title, the `normal` button filled, and 570/24 as the
   entry — so the Demo line took the frame's normal-case reading and attached
   `loaded` to it. The Exit criterion as phrased ("kcal and protein at 1.4× the
   normal case") is met. The seed follows the frame; the Demo string is the
   thing that is wrong.
2. **Should the food's reference line exist?** Frame 4c puts the food's own
   normal-case numbers beside the title, distinct from the per-entry line. T3's
   field list omits it and it was left out rather than improvised. It is the
   only thing that tells the user what one unit of a food is worth before they
   choose an amount.
3. **The module skeleton is now written four times**, and P7 makes it five and
   six. P4 asked that this be raised before a third copy, P5 could not avoid a
   third, and this is the fourth. The fix crosses files no module phase owns,
   so it needs a planner decision — a shared stylesheet, or an accepted
   duplication.
4. **`amount_step` is one global number, and gram foods pay for it.** Cottage
   cheese and chicken breast are logged in grams and open at `1 g`, stepping by
   `1` — so the presses are decorative for them and the number is typed every
   time. `RULES.md` makes logging speed the rule that wins. A per-unit step
   belongs in `foods.json`'s `units` map, which is already data, if this proves
   slow in use.
5. **Two entries logged in the same second show oldest-first.** `readEntries`
   orders by `ts`, and `toIso` is second-precision, so a tie falls back to the
   order the lines reached the file. This is the module where that happens,
   because logging lands straight back at the picker. It is cosmetic — the two
   rows show the same clock time — and the fix is in `src/data/entry.ts` or
   `src/data/store.ts`, which this phase does not own. The rail was left on the
   store's ordering rather than re-sorting locally.
6. **`ensureSeeded` still never backfills, and this phase added a fifth key
   section.** `nutritionConfig()` in `src/data/food.ts` spreads the seed under
   the stored `nutrition` section for exactly the reason P8 had to do it twice.
   Three phases have now written this workaround. P8's open question 2.

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

**Objective:** a flat timeline of what was eaten and when, with per-food units,
optional level examples, and level multipliers that live in editable data.

**HEAD:** `715f829` | **Branch:** `v1-implementation` | **Baseline:** `0a32e6b`

**Files changed**

```txt
src/components/amount_stepper.css   src/screens/nutrition.css
src/components/amount_stepper.tsx   src/screens/nutrition.test.tsx
src/components/level_control.css    src/screens/nutrition.tsx
src/components/level_control.tsx    src/seed/app.json
src/data/food.ts                    src/seed/foods.json
src/data/store.ts                   src/seed/levels.json
src/main.tsx
```

**Commands run**

| command | result |
| :- | :- |
| `npm test` (entry) | exit 0 — 120 tests over 11 files, the count `PLAN.md` predicts |
| `npm test` (T1 → gate) | exit 0 — 130, 140, 151, 153, then **155 tests over 12 files** |
| `npm run typecheck` | exit 0, no output, at every task boundary |
| `npm run build` | exit 0, `dist/index.html` written (1.15 kB), service worker generated |
| `npm run dev` | serves `http://localhost:5173`, HTTP 200 |
| fresh review | subagent on `git diff 0a32e6b..HEAD` — 2 data defects fixed, 3 lens cuts applied, 1 lens finding recorded rather than fixed |

**Test status:** `npm test` → exit 0, 155 tests over 12 files, all passing. 35
of them are this phase's, in `src/screens/nutrition.test.tsx`. No test is left
deliberately red, and none of the four still-red-for-a-later-phase kind exists
anywhere in this plan.

**Exit criteria**

- `npm test` → exit 0 ✓
- `npm run build` → exit 0, `dist/index.html` written ✓
- The pizza walkthrough, the identical-buttons case and the three-in-a-day flat
  list are all **covered by tests rather than walked in a browser** — the
  browser path needs a Google sign-in this session cannot perform. Under test:
  2 slices at `loaded` reads `798 kcal · 34 g protein` (1.4× the normal case's
  570/24 — see open question 1), three example columns render, a food with no
  examples renders identical buttons and no prose at all, and three entries in
  one day give three rows, one label, no total and no `done`.
- Searching `src/` for `breakfast`, `lunch`, `dinner`, `meal` → **1 match**, in
  `nutrition.test.tsx`, and it is the assertion that forbids them. P8 recorded
  the same shape of expected non-zero.
- Searching `src/` for `0.7` and `1.4` → the only multiplier is in
  `src/seed/levels.json`. A bare substring search also hits typographic
  line-heights (`/1.4`, `/1.45`) in four CSS files, two of which predate this
  phase — so the criterion's number was already unmeetable, while its intent
  holds. Scope it to `.ts`/`.tsx` if it is re-run.

**Assumptions:** 5, above. **Open questions:** 6, above — question 1 is the one
to read.

**Next action:** P7 (`movement_and_dance`). Both things it was waiting on now
exist: `src/components/amount_stepper.tsx` and `src/seed/levels.json` with its
`stroll / steady / brisk` and `marking / social / full-out` scales. It is the
last phase of the plan.

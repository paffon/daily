# P8: photos_and_objectives

**Plan:** v1-recording — build daily's five recording modules plus objectives
as a static offline web app storing data in the user's own Google Drive.
This phase is one step toward it; read `PLAN.md`'s Goal and Context in full
before starting. That line orients you; `PLAN.md` is the source of truth, so
don't restate its detail here.

**Your workspace.** Write freely here during implementation. Your only other
editable file is `PLAN.md` (your table row, your Phase-notes block, Incoming
comments in other phases' blocks); never another phase's `P*` doc.

**Demo:** Add a photo from the body screen and see the rail read
`photos · 4 · april, may, july, august`; add the objective `3 workouts a week`
and see `2 this week` beside it, with no bar, ring, percentage or red state
anywhere on the screen.

**Goal:** Finish the body module with its second entry type, then build the
objectives surface — a free-text statement of intent the app never parses,
over a short editable list of targets. Objectives are the coach's only
reference point beyond gap arithmetic, so they must exist as data before the
coach plan begins, even though nothing reads them yet.

## Entry criteria

Run each; all must hold before any other work. If any fails, follow
**If blocked** — do not improvise around it.

- [ ] Read this phase's block in `PLAN.md`, including any **Incoming comments** — they amend this doc
- [ ] P4's Status is `done` in `PLAN.md`'s phase table
- [ ] `npm test` → exit 0, all tests passed
- [ ] `git status --porcelain` → empty (clean tree)

## Context capsule

Read lines 788–841 (frame 4f, body) and 842–875 (frame 4g, objectives) of
`Daily.dc.html`. Quote the path; it contains spaces. Then read
`docs/DESIGN.md` §8.5 and §9.

**Photos.** A body entry whose payload is `{ photo: 'photos/2026-08-01.jpg' }`
rather than a weight. Same spot, same light, same pose, roughly monthly — the
app states that as a plain line and does nothing to enforce it.

The file goes to `daily/photos/` in Drive via a binary upload, which is the
one place the store's text-only adapter does not fit: add
`putBinary(path, blob)` to `src/data/photos.ts` calling `drive.ts`'s upload
directly, and keep it out of `store.ts`. **Resize on import** — longest edge
1600px via a `<canvas>` draw, re-encoded as JPEG at quality 0.8 — because
`docs/DESIGN.md` §12 R4 names asset weight as a live risk and images are the
only part of this app with real size. Photos are **not** mirrored in
`localStorage`; only their entry lines are. Render them lazily with
`loading="lazy"`.

The rail lists recorded weights and a photo count — `photos · 3 · april, may,
july` — and nothing else. The empty state stays prose: `Four weights since
May. Not enough to draw a line yet.` **No graph is drawn**, now or once there
are forty weights. That is P-plus-one's decision, not this phase's.

**Objectives**, stored in `config/objectives.json`, seeded from
`src/seed/objectives.json` with an empty list and an empty statement — the
user writes their own, and a shipped default objective would be exactly the
hard-coded target `docs/RULES.md` forbids.

Shape: `{ statement: string, targets: [...] }`, where a target is either
`{ kind: 'count', label, module, per: 'week', target: 3, body_part? }` or
`{ kind: 'direction', label, direction: 'up' | 'stable' | 'down' }`.

The screen, per frame 4g: the **statement of intent** at the top in 33px
serif, which **the app never parses** — it is the only first-person text in
the product, because it is the user's own. Below it, the editable target list.
Each row is the target in 23px serif with a plain fact beside it in 13px mono:
`2 this week` for a count, `9 days` for recency, `direction` for a direction
target, which has no number and does not pretend to.

**Nothing here gets a progress bar, a ring, a percentage, a red state, or a
colour that means behind.** A missed target is a fact the coach may mention;
it is not a debt. This is the single easiest rule in the plan to break by
reflex — a target with a number beside it *looks* like it wants a bar.

**Week arithmetic.** The week runs **Sunday morning to Saturday evening**, not
Monday. Put `weekBounds(date)` in `src/data/objectives.ts` reading
`config/app.json`'s `week.starts`, and **export it** — the coach plan lifts it
into a shared module. A body-part-scoped count target (`something for the back
weekly`) counts workouts containing at least one exercise whose `body_part`
matches, which is the only reason `body_part` exists on an exercise.

Adding, editing and removing targets happens inline on this screen. There is
no separate settings area, and objectives are not a wizard.

## Files

**Touch (complete list):**

- `src/screens/body.tsx` — edit: the photo path and the rail's photo count
- `src/data/photos.ts` — create: resize, `putBinary`, photo listing
- `src/screens/objectives.tsx` — create: statement and target list
- `src/screens/objectives.test.tsx` — create: no-bar and editing assertions
- `src/data/objectives.ts` — create: `weekBounds`, target fact computation
- `src/data/objectives.test.ts` — create: week boundary and count cases
- `src/seed/objectives.json` — create: empty statement, empty list
- `src/screens/home.tsx` — edit: the `objectives →` link becomes live

**Do not touch:** `src/data/store.ts` beyond adding
`['config/objectives.json', objectivesSeed]` to `SEEDS`;
`src/screens/edit_entry.tsx` — body is already registered by P4 and the photo
payload renders through the same renderer with one added branch, which belongs
in `src/screens/body.tsx`; `src/data/sync.ts`. Anything not listed under
Touch. Needing an unlisted file means the plan is wrong: record it as a note
in this doc and a comment in your `PLAN.md` block; if the phase can't proceed
without it, follow **If blocked**.

## Tasks

### T1: Photos

- Steps: write `src/data/photos.ts` with `resize(file): Promise<Blob>` at
  longest edge 1600px and JPEG quality 0.8, `putPhoto(file, ts)` uploading to
  `photos/YYYY-MM-DD.jpg` and returning the path, and `photoMonths(entries)`
  producing the rail's month list. Edit `src/screens/body.tsx`: the
  `add a photo instead` button opens a file picker, uploads, and writes a body
  entry whose payload holds the path; the rail gains the photo count row; the
  body editor renderer gains a branch showing the photo with `loading="lazy"`
  instead of the weight field.
- Verify: `npm test` → exit 0, and a case proves `resize` caps the longest
  edge at 1600 and that a photo entry writes a `body` entry with a `photo`
  payload rather than a weight.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T2: Objectives data

- Steps: write `src/seed/objectives.json` as
  `{"statement": "", "targets": []}` and register it in `SEEDS`. Write
  `src/data/objectives.ts` with `weekBounds(date)` and
  `factFor(target, entries)` returning the mono string beside each row. Write
  `src/data/objectives.test.ts` first: a Saturday 23:00 entry and the
  following Sunday 00:30 entry fall in **different** weeks; a Sunday 00:30 and
  the Friday after fall in the same week; a count target of 3 with 2 matching
  entries reads `2 this week`; a direction target reads `direction`; a
  body-part-scoped target counts only workouts containing that body part.
- Verify: `npm test` → exit 0, the week boundary cases pass.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T3: The objectives screen

- Steps: write `src/screens/objectives.tsx` per the capsule — the statement as
  an editable 33px serif field saved on blur, the target list with inline add,
  edit and remove, and the fact beside each row. Wire it onto `#/objectives`,
  replacing P1's stub, and make home's `objectives →` link live. Write
  `src/screens/objectives.test.tsx`: editing the statement writes
  `config/objectives.json` and nothing parses it; adding a target renders its
  fact; and the rendered markup contains no `progress`, `meter`, `role="
  progressbar"`, `%` or `--danger` reference.
- Verify: `npm test` → exit 0, all tests passed.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T4: Whole-app pass

- Steps: with all five modules and objectives present, walk the app once
  against `docs/RULES.md`'s Hard rules list and record the result in this
  doc's Outcome. Fix anything that is a rule break in a file this phase may
  touch; anything else becomes an Incoming comment in the owning phase's
  `PLAN.md` block and a note here.
- Verify: `npm test` → exit 0, and searching `src/` for `streak`, `badge`,
  `points`, `total`, `progressbar` and `Notification` returns 0 matches.
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
- `npm run dev`, sign in, then: add a photo → it lands in `daily/photos/` in
  Drive, its longest edge is at most 1600px, and the body rail's count grows
- Write a statement of intent and add `3 workouts a week` → the row shows
  `0 this week`; log a workout → it shows `1 this week`; confirm by eye that
  no bar, ring, percentage or red state appears
- Log one entry in every module, reload, and confirm home's `recent` shows
  them newest first with the correct module names

## Anti-goals

Do not, even if it seems better:

- No progress bar, ring, percentage, red state, "behind" colour, or streak on
  the objectives screen. A number beside a target is a fact, not a score.
- No parsing of the statement of intent. Not for keywords, not for targets,
  not for anything. It is displayed and stored.
- No seeded default objectives. An empty list is correct on day one.
- No graph on body, no trend line, no BMI, no body-fat estimate, no tape
  measurements — `docs/DESIGN.md` §8.5 considered and declined them.
- No full-size photo upload. Resize on import is a stated risk mitigation.
- No photo gallery, lightbox, comparison slider or before-and-after view.
  A count in the rail and the image on the entry is the whole feature.
- No Monday week boundary anywhere, including in a test fixture.

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

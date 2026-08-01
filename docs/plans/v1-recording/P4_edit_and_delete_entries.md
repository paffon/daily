# P4: edit_and_delete_entries

**Plan:** v1-recording — build daily's five recording modules plus objectives
as a static offline web app storing data in the user's own Google Drive.
This phase is one step toward it; read `PLAN.md`'s Goal and Context in full
before starting. That line orients you; `PLAN.md` is the source of truth, so
don't restate its detail here.

**Your workspace.** Write freely here during implementation. Your only other
editable file is `PLAN.md` (your table row, your Phase-notes block, Incoming
comments in other phases' blocks); never another phase's `P*` doc.

**Demo:** Open a `recent` row on home, move its date and time — including
back across a month boundary — and save; the entry appears in its new place
and its old month file no longer holds it. Delete another entry and watch it
leave home. The provenance line reads `recorded 19:44 · changed once`.

**Goal:** Build frame 4h, the one screen that edits every module's entries,
and the registry that lets P5 through P8 plug into it with a single
registration each. This is the phase that makes *every entry is editable and
deletable, timestamp included* true rather than aspirational.

## Entry criteria

Run each; all must hold before any other work. If any fails, follow
**If blocked** — do not improvise around it.

- [ ] Read this phase's block in `PLAN.md`, including any **Incoming comments** — they amend this doc
- [ ] P3's Status is `done` in `PLAN.md`'s phase table
- [ ] `npm test` → exit 0, all tests passed
- [ ] `git status --porcelain` → empty (clean tree)

## Context capsule

Read lines 876–970 of `Daily.dc.html` — frame 4h. Quote the path; it contains
spaces.

**The screen**, top to bottom:

- **Date and time as ordinary fields at the top**, in `1.5px steel` boxes.
  Not a repair tool behind a long-press: moving an entry to when it actually
  happened is the most common reason this screen is opened, so it is the first
  thing on it.
- Below them, whatever the module records, rendered by that module's
  registered renderer.
- `save changes`, `discard`, and `delete this entry` — the last in `danger`
  colour, right-aligned and unemphasised. A confirmation is fine; a modal
  ceremony is not.
- Provenance last, quiet, in 11px mono: `recorded 19:44 · changed once`,
  pluralised from `rev - 1`. It never blocks a change and it is never framed
  as a correction.

**The registry.** In `src/screens/edit_entry.tsx`:

```ts
type EditorRenderer = (payload, onChange) => JSX.Element
const editors: Partial<Record<Entry['module'], EditorRenderer>> = {}
export function registerEditor(module, renderer) { editors[module] = renderer }
```

The screen looks up `editors[entry.module]`. A module with no registered
renderer shows its payload as read-only JSON plus a plain line saying the
module's editor is not built yet — an honest empty state, consistent with the
rest of the app, not a crash. **P5–P8 each call `registerEditor` once; that is
their only edit to this file.** Registration happens as a side effect of
importing the module's screen, which `src/main.tsx` already does.

This phase registers `body` itself, so the mechanism has one real consumer.

**Store additions**, in `src/data/store.ts`:

- `updateEntry(entry)` — increments `rev`, writes. **If the new `ts` has a
  different `monthKey` than the stored entry's, the line must be removed from
  the old month file and written to the new one.** This is the gotcha of the
  phase; a missed month move leaves a duplicate that `readEntries` will return
  twice.
- `deleteEntry(id)` — sets `deleted: true`, increments `rev`, and writes the
  tombstone back. **Never remove the line.** A removed line would reappear on
  the next `pull` from a device that still had it.
- `getEntry(id)` — finds an entry across month files including deleted ones,
  since the edit screen is reachable by id.

Both go through `putEntry`, so sync, dirty marking and offline all come for
free from P3.

**Routing.** P1 already routes `#/entry/{id}`. Home's `recent` rows become
links to it — every row opens 4h. That is the only entry point in this plan.

The date and time controls reuse `<Timestamp>` from
`src/components/fields.tsx` but rendered in its **expanded** form: two
labelled boxes with `1.5px steel` borders rather than the single collapsed
box the logging screens use. Add a `variant` prop rather than a second
component.

`danger` is `oklch(0.5 0.03 25)` text on an `oklch(0.82 0.03 25)` border, and
it is used on this control and nowhere else in the entire app.

## Files

**Touch (complete list):**

- `src/screens/edit_entry.tsx` — create: frame 4h and the editor registry
- `src/screens/edit_entry.test.tsx` — create: edit, month move, delete
- `src/data/entry.ts` — edit: helpers for bumping `rev` and tombstoning
- `src/data/store.ts` — edit: `updateEntry`, `deleteEntry`, `getEntry`
- `src/data/store.test.ts` — edit: month-move and tombstone cases
- `src/screens/home.tsx` — edit: `recent` rows link to `#/entry/{id}`
- `src/screens/body.tsx` — edit: call `registerEditor('body', ...)`
- `src/components/fields.tsx` — edit: `Timestamp` variant, the danger button

**Do not touch:** `src/data/drive.ts`, `src/data/sync.ts`, `vite.config.ts` —
P3 settled them. Anything not listed under Touch. Needing an unlisted file
means the plan is wrong: record it as a note in this doc and a comment in
your `PLAN.md` block; if the phase can't proceed without it, follow
**If blocked**.

## Tasks

### T1: Store operations, red first

- Steps: add the failing cases to `src/data/store.test.ts` before writing any
  implementation — an entry moved from `2026-08-31T23:30+03:00` to
  `2026-07-31T23:30+03:00` is present in exactly one month file and absent
  from the other; `deleteEntry` leaves a line in the file with
  `deleted: true` and bumps `rev`; `readEntries` does not return it;
  `getEntry` does. Then add `updateEntry`, `deleteEntry` and `getEntry` to
  `src/data/store.ts`, with the `rev` and tombstone helpers in
  `src/data/entry.ts`.
- Verify: `npm test` → exit 0, all tests passed including the four new cases.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T2: The editor registry and the screen

- Steps: write `src/screens/edit_entry.tsx` per the capsule — the registry,
  the expanded date and time fields, the renderer slot, the three actions and
  the provenance line. Add the `variant` prop and the danger button to
  `src/components/fields.tsx`. Wire the screen onto `#/entry/{id}` in the
  route table, replacing P1's stub.
- Verify: `npm run typecheck` → exit 0, no output.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T3: Body registers, home links

- Steps: in `src/screens/body.tsx`, call `registerEditor('body', ...)` with a
  renderer showing the weight number field and its unit read from config. In
  `src/screens/home.tsx`, make every `recent` row a link to
  `#/entry/{id}`. The row's appearance does not change.
- Verify: `npm test` → exit 0, all tests passed.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T4: The screen's own tests

- Steps: write `src/screens/edit_entry.test.tsx`: changing the date across a
  month boundary and saving calls `updateEntry` and leaves one copy;
  `delete this entry` calls `deleteEntry` and the entry vanishes from
  `recentEntries`; `discard` leaves the stored entry untouched; provenance
  renders `changed once` at `rev: 2` and `changed 3 times` at `rev: 4`; a
  module with no registered renderer renders the honest not-built-yet line
  rather than throwing.
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
- `npm run dev`, sign in, log two weights, then: open one from `recent`, move
  its date into the previous month, save → it leaves the current month's rail
  position and the two Drive month files together hold exactly one copy of it
- Open the other, press `delete this entry` → it disappears from home's
  `recent`, and its line survives in the Drive file with `"deleted":true`

## Anti-goals

Do not, even if it seems better:

- No undo stack, no trash view, no restore UI. The tombstone exists for sync
  correctness, not as a feature.
- No confirmation modal on save, no "are you sure you want to discard"
  interception, no unsaved-changes guard. One user, reversible data.
- No editing of library items here — that is a different surface and P5 and
  P7 raise it if they need it.
- No renderers for workout, nutrition, movement or dance. Registering them is
  each module phase's job, and the not-built-yet state is what proves the
  registry works before they exist.
- No `deleted` line removal, ever, including a "compact old files" pass.
- No second use of `danger` anywhere. It marks this one control.

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

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

## Deviations

Recorded as they happened. None of them stopped the doc working as written.

1. **`src/main.tsx` is not on the Touch list, and T2 requires it.** The route
   table lives there (P1 hand-rolled the hash router inside it), so "wire the
   screen onto `#/entry/{id}`, replacing P1's stub" cannot be done anywhere
   else. Two lines changed: the import, and the stub swapped for `<EditEntry>`.
2. **`src/screens/edit_entry.css` is not on the Touch list.** P1's convention —
   recorded in its `PLAN.md` notes — is that per-screen CSS lives beside the
   screen as `src/screens/{screen}.css` and `tokens.css` does not grow. The
   Touch list named only the `.tsx`.
3. **`src/components/fields.css` is not on the Touch list.** Same shape: the
   doc orders a danger button in `fields.tsx`, and its one style block has to
   live in that file's CSS sibling.
4. **`src/screens/home.tsx` needed no edit.** T3 asks for `recent` rows to link
   to `#/entry/{id}`; they already did, since P1. Rather than touch
   `home.test.tsx` — also not on the Touch list, and nothing there pinned the
   href — the link is asserted from `edit_entry.test.tsx`, which is on it. It
   is the only way onto this screen, so it is this phase's to hold.
5. **One revision helper, not two.** The doc asks for "the `rev` and tombstone
   helpers" in `entry.ts`. `revise(entry, changes)` does both jobs; the
   tombstone is `revise(entry, { deleted: true })` at its single call site. A
   named one-line wrapper around that would have been an abstraction with one
   caller.
6. **The screen's title is the module name.** Frame 4h titles the entry — `chest
   press`, `pizza` — with a module chip beside it. A body entry has no name,
   and deriving one per module inside `edit_entry.tsx` would break "P5–P8 each
   call `registerEditor` once; that is their only edit to this file". So the
   title is the module, and anything module-specific belongs inside the
   renderer. P5–P8 should know this before they build theirs.

## Fresh review

A subagent that did not implement the phase reviewed `git diff b736ee8..HEAD`
against this doc plus the over-engineering lens. Compliance came back PASS on
every capsule item and every Anti-goal but one, and it found two real bugs.

**Fixed:**

- **An edit screen reused between two entry hashes kept the first entry's
  timestamp and payload, and `save changes` wrote them onto the second.**
  `useState` initialisers run once per instance, and `main.tsx` returns
  `<EditEntry>` at a fixed position, so a hash change from one entry to another
  reuses the instance. Silent, and it moved the second entry to the first one's
  month. Every in-app exit goes via `#/`, which unmounts the screen — so this
  needed an external navigation today, and would have become trivially
  reachable the moment any of P5–P8 links entry to entry. The screen is now
  keyed by id.
- **A tombstone moved across a month boundary had its line removed from the old
  file** — the Anti-goal *No `deleted` line removal, ever*. Reached by pressing
  back onto the hash of an entry just deleted, which rendered it as a live
  editable entry, then moving its date. A device still holding the live line
  would have resurrected the entry. Two guards: the store never removes a
  tombstone line (it accepts a second tombstone in the old month, which every
  read already drops), and the screen treats a deleted entry as nothing to
  edit — offering it back would be the restore surface the Anti-goals rule out.

Both fixes were watched failing before they were written.

**Lens findings taken:** one screen shell instead of a duplicated one for the
empty state; `Danger` carries its own label rather than taking a prop with one
call site; `EditorRenderer` is no longer exported (P5–P8 get it by contextual
typing from `registerEditor`).

**Lens findings declined, with reasons:**

- *`clockOf` is a one-line adapter with one caller; export `timeOf` instead.*
  `fields.tsx` keeps a deliberate boundary — `dayOf`, `weekdayOf` and `timeOf`
  are private and take `Date`; every exported formatter (`monthOf`,
  `dayTimeOf`, `whenOf`) takes a `ts` string. `clockOf` is the fourth of those.
  Exporting the `Date` one saves two lines and breaks the boundary P2 set.
- *`edit_entry.css` duplicates `body.css`'s strip, back link, label and media
  rules; promote them into `tokens.css`.* Real, and it grows with every module
  screen — but P1 recorded the opposite convention ("per-screen CSS lives
  beside the screen — grow that, not `tokens.css`"), and the fix would touch
  two files this phase must not. Left for the planner; see Open questions and
  the Incoming comment on P5.

**Lens findings on things this doc ordered — recorded, not fixed:**

- The registry is an indirection with one registration and one lookup today; it
  earns its keep on the second consumer, which is its stated purpose.
- The not-built-yet branch is code for a state that stops existing the day P8
  registers the last renderer. The doc orders it as the proof the registry
  works before P5–P8 exist. **It becomes dead code at the end of this plan** —
  worth a deliberate decision then rather than an accident.
- `Danger` lives in `src/components/fields.tsx`, a shared-components file it
  will never be shared from, since the doc says danger marks this one control
  and nothing else in the app.
- `variant` has two states and one caller passing the non-default.

## Open questions

Numbered for the planner; none of them blocked this phase.

1. **A vacated month file is left behind as a bare newline.** When the last
   entry moves out of a month, the store writes `"\n"` rather than dropping the
   path — `Adapter` has `get`, `set` and `list`, and no delete. Reads filter it
   out, so nothing is wrong; but the path stays in `list()`, is marked dirty,
   is uploaded, and is pulled by every other device from then on. Fixing it
   means adding a delete to the adapter, which lives in `src/data/sync.ts` and
   `src/data/drive.ts` — both on this phase's **Do not touch** list.
2. **`updateEntry`'s two writes reach Drive in the dirty set's order, not the
   call order.** P3's Incoming comment asked for the destination to be written
   before the source is cleared, and it is — locally the two land together, so
   the month move is never half-applied on this device. But `sync.ts` pushes
   dirty paths in insertion order, so if the source month was already dirty
   from an earlier offline write, it can be uploaded first and a failure before
   the destination leaves Drive briefly holding zero copies. It self-heals on
   the next pass. The comment in the store no longer claims otherwise; making
   it true would mean ordering the push, which is `sync.ts`'s business.
3. **The registry does not cover home's `recent` rows** — answering P2's
   Incoming comment. `home.tsx` keeps its private `detail(entry, config)`
   switch, and P5–P8 register one editor each, not two functions. A recent row
   is one line of text and an editor is a set of fields; nothing yet suggests a
   module wants them derived from the same function, and a second registration
   per module is speculative until one does. If a module ever disagrees, that
   is the moment to unify them.
4. **The provenance line shows a time and no date** — `recorded 19:44`, straight
   from frame 4h. On an entry recorded months ago it says less than it looks
   like it says. The frame is explicit, so it was built as drawn.

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

Objective: frame 4h — the one screen that edits and deletes every module's
entries, timestamp included, and the registry P5–P8 plug into with one call.

HEAD: cd846e8 | Branch: v1-implementation | Baseline: b736ee8

Files changed:

```txt
docs/plans/v1-recording/PLAN.md
src/components/fields.css
src/components/fields.tsx
src/data/entry.ts
src/data/store.test.ts
src/data/store.ts
src/main.tsx
src/screens/body.tsx
src/screens/edit_entry.css
src/screens/edit_entry.test.tsx
src/screens/edit_entry.tsx
```

Commands run:

- `npm test` → exit 0, 55 passed / 6 files (44 after T1, 53 after T4, 55 after
  the review fixes). Entry criteria run: 40 passed.
- `npm run typecheck` → exit 0, no output. Run after T2 and again at the gate.
- `npm run build` → exit 0, `dist/index.html` written (plus `sw.js`, 4 precache
  entries).
- `git status --porcelain` → empty at entry and at exit.
- Fresh review: subagent on `git diff b736ee8..HEAD` against this doc plus the
  over-engineering lens. Two bugs found and fixed, three lens findings taken,
  two declined with reasons, four recorded as doc-ordered. See **Fresh review**.
- Mutation checks: four times, an implementation guard was removed and the test
  covering it watched to fail — the month move (both its store test and its
  screen test), the tombstone-survives-a-move guard, and the screen's
  deleted-entry guard. Each was restored and the suite re-run green.

Test status: `npm test` → exit 0, 55 passed, 0 failed, 0 skipped. No test is
left deliberately red by this phase, and none was inherited red.

Demo, driven in the running app (`npm run dev`, dev server on 5174 — see
Assumption 2), against a mirror seeded with two body entries:

- Opened the 07:35 entry from a `recent` row; the screen showed its date, its
  time, its stored weight in the box, and `recorded 07:35 · unchanged since`.
- Moved the date from `2026-08-01` to `2026-07-31` and pressed `save changes`:
  `entries/body-2026-07.jsonl` holds it at `rev` 2 with `recorded_at`
  unmoved, `entries/body-2026-08.jsonl` no longer holds it — exactly one copy
  across the two. Home's row for it changed from `today 07:35` to `fri 07:35`.
- Pressed `delete this entry` on the other: the first press armed the control
  (`press again`) and stored nothing; the second removed it from home and left
  its line in `entries/body-2026-08.jsonl` with `"deleted":true` at `rev` 2.
- Navigated back onto the deleted entry's hash: `nothing here / no entry is
  stored under that id.`, with no actions and no danger control.

Assumptions:

1. **The Drive half of the Exit criteria was not run by the executor.** The
   criteria ask for sign-in and for the two *Drive* month files to hold one
   copy. Signing in needs the user's own Google account, so the Demo above was
   driven against the local mirror instead — which is the same code path, since
   P3's adapter writes the mirror and marks the path dirty, and the sync pass
   carries it up unchanged. The store operations are the phase's own work and
   are fully covered; what is unverified is P3's push, which P3 verified
   against real Drive. **The user should confirm once, signed in.**
2. The dev server ran on 5174, not 5173: another session held 5173. Vite
   ignores the harness's assigned port (`npm run dev` is a bare `vite`, and
   Vite does not read `PORT`), so it auto-incremented. `.claude/launch.json`
   was set to `autoPort` for the run and restored afterwards — the repo carries
   P1's version. A real sign-in test must use 5173, since that is the origin
   the OAuth client authorises.
3. `Danger` asks for a second press rather than raising a dialog. The capsule
   permits a confirmation and rules out modal ceremony; with no restore UI
   anywhere, a mis-tap would read as loss.
4. The weight box inside the edit screen is uncontrolled (`defaultValue`). The
   payload holds the parsed number, and writing that number back on every
   keystroke would swallow the dot the moment `72.` parses to `72`.

Open questions: four, in the **Open questions** section above — the vacated
month file left as a bare newline (1), the dirty-set push order behind
`updateEntry`'s two writes (2), whether the registry should cover home's
`recent` rows (3, answered: no), and the provenance line's missing date (4).

Next action: **P5, P6, P7 and P8 are all eligible** — every one of them depends
only on P4, and they are independent of each other. `PLAN.md` numbers them in
`DESIGN.md` §13's value order, so P5 (workout) unless the user says otherwise.

# Plan: v1-recording

**Live document.** Unlike the old design, this file is written to during
execution. The executor of phase N may edit **only two files**: its own
`P{N}_{...}.md` doc and this `PLAN.md`. It updates its row in the phase
table, reflects concise notes into its own per-phase block, and leaves
**Incoming comments** in *another* phase's block here when it discovers
something that phase must know. It never edits another phase's `P*` doc.

**Execution:** one phase per fresh session via the **/complex-plan-implement-phase**
skill. Fallback without that skill: pick the lowest-numbered phase whose
**Depends on** entries are all `done` in the table below and whose own Status
is `pending`; then follow that phase doc top to bottom — its Entry criteria,
Tasks, Validation gate, Exit criteria, and On completion sections are the
complete procedure. Read this whole `PLAN.md` first for cross-phase context
and any Incoming comments left in your phase's block.

## Goal

Build the recording half of **daily** end to end: five logging modules —
workout, nutrition, movement, dance, body — plus an objectives list, as a
static offline-capable web app that stores everything in the user's own
Google Drive. This is build steps 1–6 of `docs/DESIGN.md` §13.

When this plan is done the app is complete and useful on its own. The coach
(step 7), progress views (8) and export (9) are a **separate later plan**,
because the coach's floor value and drift thresholds can only be tuned against
real logged history, which does not exist until this plan ships and gets used.

## Context

**Read before any phase:** `docs/DESIGN.md`, `docs/RULES.md`,
`docs/CONTEXT.md`. CONTEXT.md is the naming authority — use its words for
identifiers (`entry`, `library item`, `level`, `next-time mark`, `previous`,
`segment`, `posture block`). `docs/COACH.md` is not needed here; no phase in
this plan builds the coach.

**Design reference:** `Three UI approaches for coaching app/design_handoff_daily/`
— note the spaces in that path, quote it in shell commands. `README.md` there
holds the full colour, type and geometry token tables; read them once at P1 and
treat them as final. `Daily.dc.html` is inline-styled HTML showing intended look
and layout. **It is not production code — read it, never copy it.** Only turn 4
is current; frames `3*` and `2*` are a superseded design.

| frame | screen | lines in `Daily.dc.html` |
| :- | :- | -: |
| 4a | home | 64–231 |
| 4b | workout | 232–503 |
| 4c | nutrition | 504–622 |
| 4d | movement | 623–732 |
| 4e | dance | 733–787 |
| 4f | body | 788–841 |
| 4g | objectives | 842–875 |
| 4h | editing an entry | 876–970 |
| 4i | drift (coach — **not this plan**) | 971–1110 |

**Stack.** Vite + TypeScript + Preact + Vitest. Static `dist/` output, no
server. Hash routing is hand-rolled inside `src/main.tsx` (~20 lines, no
router dependency). Styling is plain CSS with custom properties — no CSS
framework. Every colour stays in `oklch()`; hex conversion loses the
palette's shared lightness/chroma relationships.

**Every module screen shares one skeleton**, so P5 through P8 do not each
redesign it: a 56px strip with a back affordance and the editable timestamp;
a 320–340px `paper-panel` left rail listing what has been recorded, ending in
`progress →`; and a main column with the title, `Previous`, the fields, and
the primary action. On phone the rail collapses below the fields and the
primary action pins to the bottom. `progress →` renders a list that states
plainly what cannot be drawn (`3 sessions · not enough to draw`) — keep those
honest empties as strings and never draw a two-point line to avoid an empty
state. **No graph is built anywhere in this plan.**

**Storage layout**, in a *visible* `daily/` folder in the user's Drive (not
`appDataFolder`, which is hidden and would break "readable without the app"):

```txt
daily/
  entries/{module}-YYYY-MM.jsonl    one JSON object per line
  library/exercises.json  foods.json  segments.json
  config/app.json  levels.json  objectives.json
  photos/YYYY-MM-DD.jpg
```

**Entry shape**, one per JSONL line, identical in every module:

```json
{"id":"<uuid>","module":"body","ts":"2026-08-01T07:35:00+03:00","rev":1,
 "recorded_at":"2026-08-01T19:44:00+03:00","deleted":false,"payload":{}}
```

`ts` is the entry's own editable timestamp and decides which month file holds
it. `rev` increments on every edit; merges are last-write-wins on higher `rev`.
`deleted` is a tombstone, never a removed line, so a delete propagates.

**Reads never hit the network.** `localStorage` mirrors every Drive file
(key = the Drive path, value = the file text). Writes go to the mirror and
mark the path dirty; a sync pass pushes dirty paths to Drive when online.
Whole files are read-modify-written — one user, tiny files, no append API.

**The rule that gets broken by accident.** `docs/RULES.md`: *no hard-coded
targets — every number, threshold, default, multiplier, scale and list is
editable data, never a constant in source.* Concretely: seeds live in
`src/seed/*.json`, are copied into Drive `config/` and `library/` on first run
only if absent, and are read back through the store from then on. A literal
like `const LEAN = 0.7` anywhere in `src/` is a defect, including in tests of
production paths.

**Other rules with teeth here:** every entry is editable and deletable
including its timestamp; `Previous` appears at every point of logging,
unconditionally; blanks are valid entries; libraries ship seeded and nothing in
a seed is protected; no streaks, totals, running counts, rings, budgets or
progress bars anywhere; no notifications of any kind, including no push
registration in the service worker; the week runs Sunday to Saturday; locale is
Israel.

**Prerequisite the user must do before P3:** create a Google Cloud project,
enable the Drive API, and create an OAuth 2.0 **Web application** client ID with
`http://localhost:5173` and the eventual host origin as authorised JavaScript
origins. P3 reads it from `VITE_GOOGLE_CLIENT_ID` in `.env.local`.

## Phases

| Phase | Purpose | Depends on | Status | Baseline | Updated |
| - | - | - | - | - | - |
| [P1: toolchain_and_home](./P1_toolchain_and_home.md) | Toolchain, design tokens, and home in its silent state | - | done | a596d41 | 2026-08-01 |
| [P2: entry_store_and_body_weight](./P2_entry_store_and_body_weight.md) | The entry primitive, the local store, and the first thing logged | P1 | done | 1811f3d | 2026-08-01 |
| [P3: drive_store_and_offline](./P3_drive_store_and_offline.md) | Google sign-in, Drive as the durable store, offline shell and sync | P2 | done | 7911067 | 2026-08-01 |
| [P4: edit_and_delete_entries](./P4_edit_and_delete_entries.md) | The generic entry editor (frame 4h) and the per-module renderer registry | P3 | done | b736ee8 | 2026-08-01 |
| [P5: workout](./P5_workout.md) | Exercise library, kinds, the set table, next-time marks, carried comments | P4 | done | 19c476f | 2026-08-01 |
| [P6: nutrition](./P6_nutrition.md) | Food library, per-food units, levels with examples, multipliers | P4, P5 | done | 0a32e6b | 2026-08-01 |
| [P7: movement_and_dance](./P7_movement_and_dance.md) | Segments, posture blocks, dance sessions | P4, P5, P6 | done | e614d5d | 2026-08-02 |
| [P8: photos_and_objectives](./P8_photos_and_objectives.md) | Body photos, and the objectives surface | P4 | done | 19c476f | 2026-08-01 |

P5 ships two shared controls — `src/components/segmented.tsx` and
`src/components/library_picker.tsx` — that P6 and P7 reuse and are explicitly
forbidden to rebuild, so both wait on it. P7 additionally waits on P6, which
owns `src/components/amount_stepper.tsx` and `src/seed/levels.json` — P7's
duration fields and both its level scales come from those, and its
**Do not touch** list forbids it creating either. P8 hangs off P4 alone. They
are numbered in `DESIGN.md` §13's order, which is value order — follow it
unless the user says otherwise.

## Test commands

| Purpose | Command | Expected |
| - | - | - |
| full suite | `npm test` | exit 0, all tests passed |
| typecheck | `npm run typecheck` | exit 0, no output |
| build | `npm run build` | exit 0, `dist/index.html` written |
| dev server | `npm run dev` | serves `http://localhost:5173` |

**Baseline at plan time:** no `package.json` exists, so `npm test` fails with
`Missing script: "test"`. P1 creates the suite; from P2 onward the expected
baseline is exit 0 with every test passing. There is no lint step and none is
being added — `npm run typecheck` is the static gate.

**If you run your phase in a git worktree, check the file count.** Until the
P5 merge, `vitest`'s default include walked `.claude/worktrees/` and collected
a whole second copy of `src/` per worktree — the suite reported 505 tests over
52 files where the checkout had 120 over 11. Every test count recorded in a
phase outcome before P5 counted branches that were not checked out, which is
why those numbers do not add up against each other. `vite.config.ts` now sets
`include: ['src/**/*.test.{ts,tsx}']`. **After the merge the suite is 120 tests
over 11 files** — if you see a number far above that, something is collecting a
worktree again.

## Phase notes

### P1: toolchain_and_home

- **For other phases:** fixes the stack, the npm scripts, `src/styles/tokens.css`
  (every design token as a CSS custom property in `oklch()`), and the hash
  routes `#/`, `#/workout`, `#/nutrition`, `#/movement`, `#/dance`, `#/body`,
  `#/objectives`, `#/entry/{id}`. Later phases fill in stub screens; they do
  not invent new routes without recording it here.
- **Notes:** home reads from an empty in-file shim until P2 replaces it with
  the store. Done — every route above is live, unknown hashes fall back to
  home, and `#/entry/{id}` already parses its id into the stub. Two files
  outside the doc's Touch list were needed: `src/screens/home.css` and
  `.claude/launch.json`. **Convention: per-screen CSS lives beside the screen
  as `src/screens/{screen}.css`** — grow that, not `tokens.css`. Layout is one
  fluid arrangement with a single `@media (min-width: 760px)`; neither canvas
  width appears anywhere. TypeScript resolved to 7.x, which needs `vite/client`
  in `tsconfig`'s `types` before a CSS import will typecheck. Home has no top
  strip — see open question 1 in `P1_toolchain_and_home.md` → **Deviations**,
  which also records the token midpoints and the over-engineering objections
  left standing because this doc ordered them.
- **Incoming comments:**

### P2: entry_store_and_body_weight

- **For other phases:** owns `src/data/entry.ts` (the entry shape, `newEntry`,
  `monthKey`) and `src/data/store.ts` — the only module that touches
  persistence. Every later phase logs through `putEntry` and reads config and
  libraries through `readJson`, never through a constant. Also owns the shared
  `Previous` and `Timestamp` controls in `src/components/fields.tsx`; later
  phases add controls to that file rather than restating them.
- **Notes:** Done. `MODULES` moved to `src/data/entry.ts` — import the module
  list and the `Module` type from there, not from `home.tsx`. `fields.tsx`
  also exports the date formatters every screen needs (`dayTimeOf`, `monthOf`,
  `whenOf`); reuse them rather than reaching for `Intl` again. **Every unit,
  count, precision and window is in `src/seed/app.json`** — `locale`,
  `body.weight_decimals`, `home.recent_count` and `home.weekday_within_days`
  joined the three keys T2 named, each one deleting a source literal. Per-screen
  CSS follows P1's convention and `fields.css` extends it to shared controls.
  `tsconfig.json` needed `resolveJsonModule` back for T2's seed import. Full
  detail, including where frame 4f and the capsule disagree, is in
  `P2_entry_store_and_body_weight.md` → **Deviations**.
- **Incoming comments:**
  - *From P1.* `src/screens/home.tsx` exports two shims for you to replace:
    `recentEntries()` returning `[]` and `lastTouched(module)` returning
    `null`. Both hand back **display-ready strings** — `RecentEntry` carries
    `time` and `detail` as text, and `lastTouched` returns something like
    `wed 19:40` — so home does no date arithmetic and no formatting. Keep that
    boundary: the formatting belongs on your side. The populated-`recent`
    markup and its CSS already exist and go live the moment the shim returns
    rows.
  - *From P1.* Home does **not** render frame 4a's top strip (the 56px/52px
    band carrying `daily` and the date). P1's capsule omitted it and its Exit
    criteria said nothing sits above the modules band, so it was left out
    rather than improvised. If home should have one, that is a planner
    decision — see open question 1 in `P1_toolchain_and_home.md`.
  - *From P8, for the planner rather than for an executor — P2 is `done`.*
    `src/components/fields.tsx` carries `60_000` in source: the distance from
    now past which the timestamp box shows `· now 20:41` beside it. `RULES.md`
    says every threshold is editable data, so this is the rule this plan calls
    the easiest to break by accident, in the one file every module's fields go
    through. P8 did not touch it — `fields.tsx` is not in its list. P8's open
    question 6.
  - *From P8.* `weightLine` in `src/screens/home.tsx`'s `detail()` is now
    `bodyLine` — body has two entry types and the function answers for either,
    returning `photo` for the one that is a photo. Payload knowledge stayed in
    `body.tsx` where P4 put it; only the name and the call site moved.
  - *From P7, for the planner rather than for an executor — P2 is `done`.*
    **The question you left P4 now covers four of the five modules.**
    `detail(entry, config)` in `src/screens/home.tsx` still answers only for
    `body`, so a walk, a posture block, a dance session and a food each show
    their time, their module and a blank on home's `recent`. What changed is
    that the answer got cheap: every module now has a one-line renderer for
    exactly this sentence — `segmentLine` and `postureLine` in `movement.tsx`,
    `sessionLine` in `dance.tsx`, `lineOf` in `nutrition.tsx` — so the registry
    covering `recent` rows is now four one-line registrations rather than four
    payload readers to write. `home.tsx` is in no module phase's Touch list, so
    P7 did not touch it. P7's open question 5.

### P3: drive_store_and_offline

- **For other phases:** swaps the store's adapter from local-only to
  Drive-backed with a local mirror. The store's public API does not change, so
  P4–P8 are written against P2's signatures. Any phase shipping a new
  `src/seed/*.json` registers it in the `SEEDS` list in `src/data/store.ts` —
  that is the one edit later phases make to that file.
- **Notes:** Done, and verified against real Drive — a weight logged offline
  reaches `entries/body-2026-08.jsonl` after reconnecting. The store's public
  signatures are unchanged, so P4–P8 are unaffected: the swap really was the
  one line P2 predicted. `src/data/sync.ts` owns the mirror, the dirty set and
  the pass; `src/data/drive.ts` owns auth and the REST calls. **Log through
  `putEntry` as before and sync happens by itself** — `set` marks the path
  dirty and fires a pass without being awaited, and reads stay synchronous.
  Two things every later phase should know. **There is no silent sign-in** —
  GIS token clients have no silent mode, so every page load renders the
  sign-in screen and needs one press; `trySilentSignIn` does not exist. And
  **the app cannot be entered offline at all**, which partly defeats this
  phase's own Goal: the fix is small and breaks no Anti-goal, but it needs a
  planner decision about what a signed-out app shows. That plus three smaller
  ones are in `P3_drive_store_and_offline.md` → **Fresh review → Open
  questions**, in severity order; the full deviation record is in the same doc.
  The fresh review caught two data-loss paths in the first cut of the sync
  pass, both fixed with tests that were watched to fail without the fix.
- **Incoming comments:**
  - *From P2.* The adapter swap is literally one line —
    `const adapter: Adapter = localAdapter` near the top of
    `src/data/store.ts`. Nothing above it moves, and `readText`/`writeText`
    are already the only things the rest of the store calls, so the dirty-path
    mirror hooks in there.
  - *From P2.* **`ensureSeeded` only writes a seed when the whole file is
    absent** — it never backfills a key added later. A browser holding an
    older `config/app.json` gets `undefined` where TypeScript says a value is
    present. This already bit once during P2. The capsule specified the
    file-level behaviour so P2 did not change it; if it should merge, that is
    a planner decision to make before more keys land.
  - *From P2.* `tsconfig.json` carries `resolveJsonModule` because `SEEDS`
    imports `src/seed/app.json`. Any phase adding a seed follows the same
    import shape.
  - *From P8, for the planner rather than for an executor — P3 is `done`.*
    **P8 changed `src/data/sync.ts`, which its own doc lists as Do-not-touch.**
    `pull` walked every file `listFiles` returned, and `photos` is a resolved
    prefix in `drive.ts` — so each JPEG was fetched with `.text()` and written
    into the `localStorage` mirror as replacement characters. That mirror
    holds every entry ever logged in the same few megabytes; a handful of
    photos fills it and `setItem` then throws inside `putEntry`, which is
    recording stopping. The user was asked before any code was written and
    chose the one-line skip over blocking the phase. `sync.test.ts` carries a
    case watched to fail without it.
  - *From P8.* Your `listFiles` paging comment is **closed out** — it follows
    `nextPageToken` now, with a test in `src/data/drive.test.ts` watched to
    fail without the loop. Your `findId` escaping comment needed nothing: every
    photo path is built from a timestamp, not from anything typed. `drive.ts`
    also gained `getBlob`, and `putFile` now takes `string | Blob` so
    `putBinary` could call it — one word, and `fetch` reads the content type
    off the blob.
  - *From P8.* **`ensureSeeded` not backfilling is now four keys deep.** P8
    added `body.photo_max_edge`, `body.photo_quality`, `objectives.directions`
    and `objectives.new_target` to `config/app.json`, and had to defend two of
    them by spreading the seed under the stored section in both `photos.ts` and
    `objectives.tsx` — a browser holding an older file gets `undefined` where
    TypeScript says a number is, and a canvas sized `NaN` uploads a photo
    nothing can open. Every later phase adding a config key inherits that
    workaround. P8's open question 2.
  - *From P6, for the planner rather than for an executor — P3 is `done`.*
    **Third phase, same workaround.** P6 added a `nutrition` section of four
    keys to `config/app.json` and defends it with `nutritionConfig()` in
    `src/data/food.ts`, which spreads the seed under the stored section. An
    older stored file would otherwise hand `undefined` to `toFixed`, and every
    number on the screen would read `NaN`. P7 adds a fifth section and writes
    it a fourth time. The duplication is the symptom; `ensureSeeded` merging
    keys is the fix, and it is still a planner decision.
  - *From P7, for the planner rather than for an executor — P3 is `done`.*
    **Fourth phase, same workaround, and P6 called it exactly.** P7 added a
    `movement` section of six keys and a `dance` section of five to
    `config/app.json`, and defends both by spreading the seed under the stored
    section — once in `src/screens/movement.tsx` and once in
    `src/screens/dance.tsx`. Without it an older stored file hands `undefined`
    to a stepper's `step` and to `slice`, and the numbers on both screens stop
    being numbers. That is four phases and six call sites now. Every phase that
    adds a config key inherits it until `ensureSeeded` merges.

### P4: edit_and_delete_entries

- **For other phases:** defines the **module renderer registry** — each module
  registers a function that renders its payload's fields inside the edit
  screen. P5–P8 each add exactly one registration; that is their only edit to
  `src/screens/edit_entry.tsx`. Also adds `updateEntry` and `deleteEntry` to
  the store, including moving an entry between month files when its `ts`
  crosses a month boundary.
- **Notes:** Done. `registerEditor(module, renderer)` is exported from
  `src/screens/edit_entry.tsx`; call it **once at module scope** in your
  screen file — importing the screen registers it, and `src/main.tsx` already
  imports every screen it routes to. The renderer is
  `(payload, onChange) => VNode` and owns only the module's own fields: the
  strip, the title, the when boxes, the three actions and the provenance line
  are the screen's. **The title is the module name**, not the entry's — frame
  4h titles it `chest press`, but naming an entry needs payload knowledge, and
  that lives in your renderer, so render the name there if you want it.
  `getEntry`, `updateEntry` and `deleteEntry` joined the store; log and edit
  through them and the month move, the tombstone and sync all come for free.
  Two data bugs were caught by the fresh review and fixed — a screen instance
  reused between two entry hashes saved the first entry's values onto the
  second, and a tombstone moved across a month boundary lost its old line,
  which is the resurrection tombstones exist to prevent. Deviations, four open
  questions and the full record are in
  `P4_edit_and_delete_entries.md` → **Deviations**, **Fresh review**,
  **Open questions**. The one to read is question 1: a month file emptied by a
  move is left behind as a bare newline, and clearing it needs a delete on the
  `Adapter` that only P3's files can add.
- **Incoming comments:**
  - *From P2.* `src/screens/home.tsx` has a private `detail(entry, config)`
    that switches on `entry.module` to write a `recent` row's text — today it
    handles `body` and returns `''` for the other four. That is your renderer
    registry in miniature. Decide whether the registry covers `recent` rows as
    well as the edit screen; if it does, home's switch should go and P5–P8
    register one function each instead of two.
  - *From P2.* `putEntry` is a plain read-modify-write of one month file. It
    does **not** move an entry when an edited `ts` crosses a month boundary —
    left alone deliberately, since this block already assigns that to you.
  - *From P3.* Moving an entry between month files is **two writes**, and each
    one syncs independently. Write the destination before deleting from the
    source: if the second write is the one that never reaches Drive, a
    duplicated entry is recoverable and a vanished one is not. `putEntry`'s
    read-modify-write of a whole file is also why a delete must stay a
    tombstone — a removed line looks identical to a stale mirror.
  - *From P8, for the planner rather than for an executor — P4 is `done`.*
    Your comment on P8's block said the not-built-yet branch becomes
    unreachable the day the last renderer is registered. **It has not fired.**
    P8 ran out of order, before P5–P7, and body was already registered — so
    P8 added no new registration at all, and the branch still serves the four
    unbuilt modules. Whoever runs the last of P5–P7 inherits that call.
  - *From P8.* A deleted photo entry leaves its JPEG in Drive. The tombstone
    is right and the file is orphaned, and clearing it needs the same
    `Adapter` delete your open question 1 asks for — one primitive, two
    callers now.
  - *From P6, for the planner rather than for an executor — P4 is `done`.*
    Your not-built-yet branch is **down to two modules**, movement and dance.
    Whoever runs P7 registers both and makes it unreachable, which is the call
    P8's comment above already handed forward.
  - *From P7, for the planner rather than for an executor — P4 is `done`.*
    **Your not-built-yet branch is now unreachable, and this is the call your
    own comment handed forward.** All five modules have editors as of this
    phase. `src/screens/edit_entry.test.tsx:102` still passes, but only because
    that file imports no module screen and so nothing registers — the branch is
    covered by an import-order accident rather than by any state the app can
    reach. Deleting it is yours to decide, not P7's; the read-only JSON dump
    and the line saying an editor is not built are both dead.
  - *From P6, for the planner.* A nutrition entry's row on home renders an
    empty detail. `detail(entry, config)` in `src/screens/home.tsx` still
    switches on the module and answers only for `body`, so a logged food shows
    its time and nothing else — the question P2 left you about whether the
    renderer registry should cover `recent` rows as well as the edit screen.
    Nutrition would answer it with the same `lineOf` the rail uses. `home.tsx`
    is in no module phase's Touch list, so P6 did not touch it, and P7 will
    arrive with the same gap for two more modules.

### P5: workout

- **For other phases:** two shared controls land here and P6 and P7 reuse them
  rather than building their own. `src/components/segmented.tsx` — contiguous
  buttons, radius 0, 58–66px tall, the middle segment carrying
  `border-left:none; border-right:none` so adjacent borders do not double;
  selection is `steel` for the next-time mark and `ink-select` for any level,
  and those two must not be unified. `src/components/library_picker.tsx` — a
  filterable list of library items with `+ new item` always available inline;
  nothing in a seed is protected from rename or delete. Both are
  presentational: scales and lists are passed in, never read from config
  inside them. Resolves handoff open question 1 — see the doc.
- **Notes:** Done. Both shared controls are built to the spec above.
  `Segmented` takes `options: {value, short?}[]`, `value`, `onChange`,
  `tone: 'steel' | 'ink-select'` and `label`; it renders `short` on the phone
  and `value` on the laptop from one markup, so **a scale with no glyph of its
  own reads as the word at either width** — pass no `short` and nothing breaks.
  `LibraryPicker` takes `items: {id, name, hint?}[]`, `onPick`, `onNew(name)`
  and `newLabel`; the filter matches name *and* hint (workout passes the body
  part, so `back` finds `lat pulldown`), **what is typed becomes the new
  item's name**, and `+ new` disables itself when nothing is typed. Neither
  control offers rename or delete — the spec's "nothing in a seed is
  protected" was read as a statement about the data, not as required UI.
  Three things every later phase needs. **`src/main.tsx` is in no module
  phase's Touch list, but every module screen needs one route line there** —
  added as a recorded deviation, and P6–P8 will each need the same.
  **Register your editor at module scope in your own screen file**, never
  inside `edit_entry.tsx` — the doc's literal wording would make that screen
  import the module that imports it. And **a set field's separator is seed
  data** (`sep`), which is how `42.5 × 10` and `5 km / 28 min` coexist with the
  Anti-goal on kind logic; the next-time scale, its phone glyphs and its
  fast-input signs all live in `src/seed/exercises.json`, not `levels.json`,
  because the mark is workout-only. The fresh review caught two data bugs — a
  lone `-` on the way to typing a negative weight was setting the mark to
  `less` for good, and a workout logged for a past day stored an end time taken
  from when save was pressed. Ten assumptions, six open questions and the full
  record are in `P5_workout.md` → **Assumptions**, **Fresh review**, **Open
  questions**. The one to read is question 1: **an exercise created inline gets
  a blank body part and the library's first kind, permanently**, so a route
  added as `run · park loop` gets a weight box and the coach loses the field
  `DESIGN.md` calls the only reason it exists.
- **Merged 2026-08-01, after P8 rather than before it.** P5 was built in a
  worktree off `19c476f` and left unmerged, so `PLAN.md` on the main branch
  went on saying `pending` while the work existed. Both phases branched from
  the same commit; three files conflicted and all three were pure unions —
  a `SEEDS` row each in `src/data/store.ts`, a stub route each in
  `src/main.tsx`, and the phase table, which took P5's `done` alongside the
  corrected `P6, P7` dependency columns that P5 predates. **Two things landed
  with the merge that are not in P5's own record.** `payload.body_parts` is now
  written at log time, closing P8's open question 1 — see the closed comment
  below. And `npm test` had been collecting the worktrees: vitest's default
  include walks `.claude/worktrees/`, so the suite reported 505 tests over 52
  files where this checkout has 120 over 11, and **every phase outcome recorded
  before this one counted branches that were not checked out**. `vite.config.ts`
  now scopes the include to `src/`.
- **Incoming comments:**
  - *From P4.* You are the first phase to build a module screen since the edit
    screen landed, and `src/screens/edit_entry.css` now duplicates `body.css`
    almost rule for rule — the 52/56px strip, the back link, the uppercase
    field label, and both `@media (min-width: 760px)` blocks. P1's convention
    says per-screen CSS lives beside its screen and `tokens.css` does not grow,
    so P4 followed it rather than hoisting. If workout copies the same shell
    again it will be the third copy, and the fourth through sixth are P6–P8.
    Worth raising with the planner before you write yours — the fix crosses
    files no single module phase owns.
  - *From P4.* Registering an editor is one call at module scope:
    `registerEditor('workout', (payload, onChange) => …)`. Do not add anything
    else to `src/screens/edit_entry.tsx`. Your renderer draws only the module's
    own fields — the timestamp boxes, the actions and the provenance line are
    already there — and the screen's title is the module name, so if a workout
    entry should read `chest press`, render that inside your own renderer.
  - *From P4.* A payload field edited on that screen flows back through
    `onChange` and is saved verbatim. If your renderer parses what is typed
    (a number, a duration), keep the input **uncontrolled** — `defaultValue`,
    not `value` — or writing the parsed value back mid-keystroke will eat a
    decimal point as it is typed. `src/screens/body.tsx` shows the shape.
  - *From P8 — **closed at the merge**, and it had fired.* Objectives counts
    your entries, and a body-part-scoped target (`something for the back
    weekly`) reads **`payload.body_parts`, a flat array of strings on the
    workout entry**. P5 was built in its worktree without seeing this comment
    and stored `{ started, exercises: [{ exercise_id, sets, comment }] }` —
    no `body_parts` anywhere — so every such target read `0 this week` with no
    error, exactly as predicted. Fixed when the branches were merged, P8's way
    rather than by changing the reader: `bodyPartsOf` in `src/data/exercise.ts`
    resolves the distinct parts against the library and `end()` writes them
    onto the payload. The reader was the wrong place because the entry is only
    joinable to the library by `exercise_id`, and `asExercise` in your own
    screen already documents that that lookup fails — nothing in a library is
    protected from rename or delete. Five tests in `workout.test.tsx`, three
    watched to fail first, one of which re-tags the library after logging and
    still expects `1 this week`.
  - *From P8.* `src/components/segmented.tsx` is yours to build and P8 needed
    a choice control before it existed, so `src/screens/objectives.tsx` uses
    plain `<select>` elements. They are not a precedent for the next-time mark
    or for a level — those are what your segmented control is for. Do not
    unify them.

### P6: nutrition

- **For other phases:** `src/seed/levels.json` holds every module's level
  scale and the global multipliers, not just nutrition's. P7 reads its
  `stroll / steady / brisk` and `marking / social / full-out` scales from it.
- **Notes:** Done. `src/seed/levels.json` is in the tree in exactly the shape
  the capsule specified, and `src/components/amount_stepper.tsx` with it — the
  two things P7 was waiting on. `src/data/food.ts` owns the library and the
  arithmetic: `loadFoods()`, `loadLevels()`, `nutritionFor(food, amount, level)`
  and `unitOf`. Four things every later phase should know. **`AmountStepper`
  takes `value`, `unit`, `step`, `onChange` and `label`, and is presentational
  like P5's two** — the step is a prop, not a config read, and the box holds
  what was typed so a decimal point survives; key it on whatever changes the
  number underneath it. **`LevelControl` takes `scale`, `value`, `onChange`,
  optional `examples` and `label`**, wraps `Segmented` at `tone="ink-select"`,
  and is one component in two conditions — pass no examples and the prose does
  not exist while the buttons stay identical. **`src/seed/foods.json` is
  `{ units, foods }`, not a bare array**: `units` maps a unit to how it reads
  past one, and a unit absent from it reads the same at either count, which is
  how `g` avoids becoming `gs`. And **`nutritionConfig()` spreads the seed under
  the stored `nutrition` section** — the third phase to write that workaround
  for `ensureSeeded` not backfilling. The fresh review caught two data defects,
  both fixed with tests watched to fail first: a typed negative amount reached
  the payload where the presses had always refused one, and a written-out
  `"kcal": null` multiplied to `0` instead of staying unknown. Nine deviations,
  five assumptions and six open questions are in `P6_nutrition.md` →
  **Deviations**, **Assumptions**, **Fresh review**, **Open questions**,
  **Outcome**. The one to read is question 1: **this phase's own Demo line
  cannot be produced** — `570 kcal · 24 g protein` is 2 slices of the seeded
  pizza at `normal`, not at `loaded`, and frame 4c agrees with the code rather
  than with the doc.
- **Incoming comments:**
  - *From P5.* Both shared controls are built and their signatures are in P5's
    Notes above — read them before writing a level control or a food picker.
    For a level, pass `tone="ink-select"`: `steel` means "this is the live
    one" and belongs to the next-time mark, and the two are deliberately not
    unified. Your scale's entries need no `short`; the control falls back to
    the word on the phone.
  - *From P5.* `src/main.tsx` is in no module phase's Touch list, yet
    `#/nutrition` renders P1's stub until one import and one route line are
    added there. P5 added them for `#/workout` as a recorded deviation; do the
    same and record it rather than assuming the omission was deliberate.
  - *From P5.* Register your editor with a `registerEditor('nutrition', …)`
    call **at module scope in `src/screens/nutrition.tsx`**, not inside
    `edit_entry.tsx` — the Files line in your doc may say otherwise, but
    putting it there creates an import cycle. P4's comment and P5's deviation 3
    both cover this.
  - *From P7, for the planner rather than for an executor — P6 is `done`.*
    **A nutrition entry logged for another day is saved and then shows nowhere
    on the screen that saved it.** `nutrition.tsx` filters its rail on the
    wall-clock day, so an apple logged this morning but stamped yesterday is
    written correctly, syncs, and appears on home's `recent` — but the rail
    that just took it stays empty, which reads as a failed save, and the
    obvious next press logs it twice. **Nutrition is the only screen left with
    this.** `workout.tsx` answered it first with `today` + `history` groups,
    P7 gave `movement.tsx` the same two (`today` + `earlier`, the second
    rendered only when it has something in it), `body.tsx` never filtered, and
    dance shows its last four by timestamp. The fix is one conditional group,
    and `movement.tsx`'s `railRow` is the shape. Not done here because
    `nutrition.tsx` is in no P7 list. P7's open question 2.
  - *From P7, for the planner rather than for an executor — P6 is `done`.*
    **An emptied `AmountStepper` box shows blank and logs the number it used to
    hold.** Suppressing `onChange` for an unreadable box is right — half a
    typed number is not a number — but the field then reads empty while the
    payload keeps the old figure, and pressing log saves it. It shows worst on
    P7's posture form, where the bar sits directly under the box and looks like
    a live echo of it: clear `sitting` and the bar goes on drawing the old
    split. `amount_stepper.tsx` is yours and P7's **Do not touch** names it, so
    this is a note rather than a fix. P7's open question 3. Also, for the
    record: **both your scales were exactly right** — `movement.scale` and
    `dance.scale` went on screen from `loadLevels()` with no change to
    `levels.json` and no scale literal in either screen.
  - *From P5.* The screen shell is now written three times — `body.css`,
    `edit_entry.css` and `workout.css` all carry the same strip, back link,
    field label and 760px breakpoint. Yours is the fourth. P4 asked that this
    be raised before a third copy and P5 could not avoid it without touching
    files no module phase owns; it is open question 4 in `P5_workout.md`.

### P7: movement_and_dance

- **For other phases:** posture blocks are a second entry type inside the
  movement module, distinguished by a field in the payload, not a sixth module.
- **Notes:** Done, 2026-08-02, on the second attempt — the first stopped before
  any code on 2026-08-01 because the table said **Depends on: P4** while the
  capsule builds on four things P5 and P6 own. The column was corrected to
  `P4, P5, P6`; all four artifacts were in the tree this time and every task
  ran as written. `P7_movement_and_dance.md` → **Prior attempt** keeps that
  record. Five things later work should know. **A posture block is
  `{ type: 'posture', span_hours, sitting_hours }` and a segment is
  `{ type: 'segment', segment_id, duration_min, level }`** — one module, told
  apart by that field, and `payload.type` is on the entry rather than inferred
  from which fields are present, which is what lets one `registerEditor` call
  serve both. **`src/components/posture_bar.tsx` takes `span` and `sitting`
  and writes nothing at all**: the parts are `flex-grow`, so no percentage is
  computed and none can be written, and sitting clamps to the span. **The
  editors are registered in the screen files, `src/main.tsx` carries two more
  route lines, and `src/seed/app.json` gained a `movement` and a `dance`
  section** rather than the single key the doc named — six numbers this phase
  puts on screen would otherwise have been literals. **`src/data/segment.ts`
  is `loadSegments()` and `hintOf()` and nothing else.** And the fresh review
  caught one real data defect: dance's duration box could not be typed into,
  because its `onChange` shared a handler with the shortcut buttons and that
  handler bumps the stepper's remount key — a session meant to be 45 minutes
  logged as 4, with nothing on screen having said so. Fixed, watched to fail
  first, and walked in a browser. Six deviations, five assumptions and six open
  questions are in `P7_movement_and_dance.md` → **Deviations**,
  **Assumptions**, **Fresh review**, **Open questions**, **Outcome**. The one
  to read is question 1: **this doc ordered a three-part bar and specified a
  two-number payload, so the third part is 0px wide for every possible input**
  — measured in the browser, not reasoned about.
- **The rail shows `today` and `earlier`, not today alone.** A backdated entry
  used to be saved and then show nowhere on the screen that saved it, which
  reads as a failed save and invites logging it twice. `workout.tsx` had
  answered this in P5 and movement had not followed; it does now. `body.tsx`
  never filtered and dance lists by timestamp, so **nutrition is the only
  screen left with it** — see the comment in P6's block.
- **The suite is now 198 tests over 14 files**, which supersedes the 120-over-11
  figure in **Test commands** above — P6 added one file and P7 two, and the
  worktree collection that made the older numbers untrustworthy is still fixed.
  A count far above 196 still means something is collecting a worktree.
- **The saving half of the Exit walkthrough was not run.** Rendering was: the
  seeded library, `2.8 km · mixed`, the bar at 615.75 / 205.25 / 0 px with no
  `%` or ratio text anywhere, `last 4`, the three shortcuts, no mark control,
  no graph. Actually pressing `log it` would write four entries into the user's
  own body log and sync them to their Drive, so it was left for them; each
  bullet is covered by a test.
- **Incoming comments:**
  - *From P5.* The two shared controls are built; their signatures are in P5's
    Notes above. Your two level scales (`stroll / steady / brisk` and
    `marking / social / full-out`) both take `tone="ink-select"` — `steel` is
    the next-time mark's alone, and movement and dance carry no mark at all.
  - *From P5.* `src/main.tsx` needs one import and one route line per module
    screen and is in no module phase's Touch list; register your editor at
    module scope in your own screen file, not in `edit_entry.tsx`. Both are
    recorded deviations in `P5_workout.md`, and P6 carries the same two.
  - *From P6.* **Both things you were waiting on are now in the tree.**
    `src/seed/levels.json` carries your two scales — `movement.scale` is
    `stroll / steady / brisk` and `dance.scale` is `marking / social /
    full-out`, each under its module's own key, and neither has `multipliers`
    because only nutrition multiplies anything. Read them with `loadLevels()`
    from `src/data/food.ts`, which returns `Record<string, Scale>` and is the
    one export of that file you need. `src/components/amount_stepper.tsx` is
    built to the signature in P6's Notes above.
  - *From P6.* **The stepper is a number and a unit, and your durations are
    minutes** — pass `unit="min"` and a step from config rather than adding a
    duration control. It is presentational: it takes `step` as a prop and reads
    no config itself. Key it on whatever changes the number underneath it, or
    the box keeps what was typed for the previous thing.
  - *From P6.* Nutrition's `amount_step` is one global number, which is fine
    for slices and wrong for grams — see P6's open question 4 before you pick
    how a duration steps. If the planner moves the step into the `units` map,
    your durations inherit it.
  - *From P6.* You write the **fifth and sixth** copies of the module skeleton
    CSS. It is P5's open question 4 and P6's open question 3, still open, and
    still crossing files no module phase owns.

### P8: photos_and_objectives

- **For other phases:** last phase of this plan **by number, not by order** —
  it depends only on P4 and was run before P5–P7. Week arithmetic (Sunday to
  Saturday, boundary read from `config/app.json`) lands in
  `src/data/objectives.ts` and stays exported — the coach plan lifts it out.
- **Notes:** Done, out of order at the user's request. `weekBounds(date)` and
  `factFor(target, entries)` are exported from `src/data/objectives.ts`;
  `readObjectives`/`writeObjectives` are the only things that name
  `config/objectives.json`. **A count target's fact is `N this week`, and
  `N days` only once matches exist but none this week** — a target nothing has
  ever matched reads `0 this week`, which is what Exit criteria requires and
  what frame 4g's `9 days` had to be reconciled with. Photos are a body entry
  whose payload is `{ photo: 'photos/YYYY-MM-DD.jpg' }`; `src/data/photos.ts`
  owns the resize and the upload and is **the one module that writes outside
  the store**. Three things every later phase should know. **`ensureSeeded`
  still never backfills**, and this phase added four keys to
  `config/app.json`, so it now defends them by spreading the seed under the
  stored section in two places — the duplication is the symptom, not the
  defect. **T4's forbidden-term search cannot return zero** while the code
  documents the rules it follows. And **the workout payload's `body_parts` is
  this phase's invention**, which is the one thing here most likely to be
  wrong — see P5's Incoming comment and open question 1. Deviations, the fresh
  review and six open questions are in `P8_photos_and_objectives.md` →
  **Deviations**, **Fresh review**, **Open questions**, **Outcome**. Four Exit
  items could not be walked because P5–P7 are pending; the Outcome names each
  one and what covers it instead.
- **Open question 1 is closed, 2026-08-01, and it had fired.** P5 turned out to
  have been built already, in an unmerged worktree, storing its body parts
  inside `exercises[]` and never as `payload.body_parts` — so every body-part
  target read `0 this week`, silently, exactly as this phase predicted. The
  merge resolved it the way this phase argued for: `bodyPartsOf` in
  `src/data/exercise.ts`, called from `end()`, writing the distinct parts onto
  the entry at log time. The invention was correct. What failed was its reach —
  an Incoming comment in `PLAN.md` cannot bind a phase whose executor branched
  before it was written and never merged back. **Two of the four unwalked Exit
  items are now walked**: a workout can be logged, and the objectives row it
  feeds goes `0 this week` → `1 this week` under test rather than by hand in a
  browser.
- **Incoming comments:**
  - *From P5.* `src/main.tsx` needs one import and one route line for
    `#/objectives`, and it is in no phase's Touch list — a recorded deviation
    in `P5_workout.md`, and P6 and P7 hit it too. Register any editor at module
    scope in your own screen file rather than in `edit_entry.tsx`.
  - *From P4.* You register the last renderer, and the day you do, the edit
    screen's not-built-yet branch becomes unreachable — the read-only JSON and
    the line saying a module's editor is not built. P4's doc ordered it as the
    proof the registry works before P5–P8 existed. Deleting it is a planner
    decision, not yours to make silently; raise it when you finish.
  - *From P3.* You add the photos, and photos are what make the file count
    grow. `listFiles` in `src/data/drive.ts` asks for `pageSize=1000` and does
    **not** follow `nextPageToken`, so past a thousand files a pull silently
    stops seeing the rest — no error, just older files that never come down on
    a second device. Entries alone reach that in roughly three years; one photo
    a day gets there far sooner. Add the paging loop when you add photos.
  - *From P3.* `findId` interpolates a filename straight into a Drive query
    (`name='${name}'`) with no escaping. Safe today because every filename is
    generated from a module name and a date. If any path you add derives from
    text the user typed, escape the quote first.

## On completion

Only after every phase shows `done` in the table above, in this order:

1. Graduate durable decisions out of the plan: anything in a Phase-notes
   block or a phase doc that a future maintainer must know goes to an ADR
   (invoke /domain-modeling; if unavailable, a dated note in the repo's docs).
   At minimum: the storage format, the entry shape, and the seed-and-config
   mechanism.
2. Stamp the top of this file: `COMPLETED {YYYY-MM-DD} — historical record,
   not current truth`.
3. Move the whole plan directory to `docs/plans/archive/v1-recording/`.

Stale plan docs poison future agents — archive, don't keep.

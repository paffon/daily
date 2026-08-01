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
| [P4: edit_and_delete_entries](./P4_edit_and_delete_entries.md) | The generic entry editor (frame 4h) and the per-module renderer registry | P3 | in progress | b736ee8 | 2026-08-01 |
| [P5: workout](./P5_workout.md) | Exercise library, kinds, the set table, next-time marks, carried comments | P4 | pending | | |
| [P6: nutrition](./P6_nutrition.md) | Food library, per-food units, levels with examples, multipliers | P4 | pending | | |
| [P7: movement_and_dance](./P7_movement_and_dance.md) | Segments, posture blocks, dance sessions | P4 | pending | | |
| [P8: photos_and_objectives](./P8_photos_and_objectives.md) | Body photos, and the objectives surface | P4 | pending | | |

P5 through P8 are independent of each other and all hang off P4. They are
numbered in `DESIGN.md` §13's order, which is value order — follow it unless
the user says otherwise.

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

### P4: edit_and_delete_entries

- **For other phases:** defines the **module renderer registry** — each module
  registers a function that renders its payload's fields inside the edit
  screen. P5–P8 each add exactly one registration; that is their only edit to
  `src/screens/edit_entry.tsx`. Also adds `updateEntry` and `deleteEntry` to
  the store, including moving an entry between month files when its `ts`
  crosses a month boundary.
- **Notes:**
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
- **Notes:**
- **Incoming comments:**

### P6: nutrition

- **For other phases:** `src/seed/levels.json` holds every module's level
  scale and the global multipliers, not just nutrition's. P7 reads its
  `stroll / steady / brisk` and `marking / social / full-out` scales from it.
- **Notes:**
- **Incoming comments:**

### P7: movement_and_dance

- **For other phases:** posture blocks are a second entry type inside the
  movement module, distinguished by a field in the payload, not a sixth module.
- **Notes:**
- **Incoming comments:**

### P8: photos_and_objectives

- **For other phases:** last phase of this plan. Week arithmetic (Sunday to
  Saturday, boundary read from `config/app.json`) lands in
  `src/data/objectives.ts` and stays exported — the coach plan lifts it out.
- **Notes:**
- **Incoming comments:**
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

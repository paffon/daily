# P1: toolchain_and_home

**Plan:** v1-recording — build daily's five recording modules plus objectives
as a static offline web app storing data in the user's own Google Drive.
This phase is one step toward it; read `PLAN.md`'s Goal and Context in full
before starting. That line orients you; `PLAN.md` is the source of truth, so
don't restate its detail here.

**Your workspace.** Write freely here during implementation. Your only other
editable file is `PLAN.md` (your table row, your Phase-notes block, Incoming
comments in other phases' blocks); never another phase's `P*` doc.

**Demo:** `npm run dev` shows home in frame 4a's *silent* state — five module
tiles over their last-touched line, an honest-empty `recent`, an
`objectives →` link, and no coach row and no space reserved for one — and each
tile routes to a stub screen.

**Goal:** Stand up the toolchain and the visual system, then render the one
screen every other phase hangs off. There is no data layer yet: home reads
from an empty shim that P2 replaces with the store. What this phase fixes for
good is the build, the tokens, the type rules and the routes.

## Entry criteria

Run each; all must hold before any other work. If any fails, follow
**If blocked** — do not improvise around it.

- [ ] Read this phase's block in `PLAN.md`, including any **Incoming comments** — they amend this doc
- [ ] No dependencies — this is the first phase
- [ ] `node --version` → `v22.14.0` or later
- [ ] `git status --porcelain` → empty (clean tree)

## Context capsule

The repo is documentation only. There is no `src/`, no `package.json`, no
build. Everything in **Files** is a create.

Read, once, before writing CSS: the **Design tokens** section of
`Three UI approaches for coaching app/design_handoff_daily/README.md` —
the colour table, the type scale, and the geometry table. Reproduce those
values exactly. Then read lines 64–231 of `Daily.dc.html` in the same folder,
which is frame 4a. Quote the path; it contains spaces.

Frame 4a is drawn in three states — nothing to say, one coach line, three
coach lines. **Build only the first.** The coach is not in this plan.

Home's parts, top to bottom:

- **Modules band.** Five entries: workout, nutrition, movement, dance, body.
  Laptop is one horizontal band of five equal columns divided by 1px verticals
  with `rule` above and below; each column is a serif name over a mono
  last-touched timestamp (`wed 19:40`, `today 18:10`, `12 july`). Hover fills
  `oklch(0.947 0.005 255)`. Phone is five 60–62px rows, name left, timestamp
  right, hairline between. The last-touched line is the **only** status shown.
- **Recent.** The last 3–6 entries across all modules, newest first. Laptop
  columns: time (100px mono), module name (104px mono, `mono-faint`), detail
  (serif 18–19px). Phone: two lines per row, `18:10 · nutrition` over the
  detail. With no data, show an honest empty string rather than a placeholder
  row — `nothing recorded yet` in `mono-faint`.
- **`objectives →`** as a quiet link.

Rules that bind this screen: it is **not a dashboard**. No counts, no
progress, no `3 of 5 logged`, no streaks, no totals. When the coach has
nothing, the modules start where the coach would have started — no reserved
empty space, no label announcing the silence.

The serif/mono split is semantic and load-bearing: **serif is language, mono
is data.** Never mix within one span. Newsreader for anything the app says,
IBM Plex Mono for anything measured, IBM Plex Sans for library item names in
lists.

1120×700 and 372×780 are design canvases, **not breakpoints**. Build one
fluid layout that holds at both. Minimum hit target is 44px on either surface.

The router is ~20 lines inside `src/main.tsx`: read `location.hash`, match it
against a route table, render the screen, and re-render on `hashchange`. No
router dependency. Routes: `#/`, `#/workout`, `#/nutrition`, `#/movement`,
`#/dance`, `#/body`, `#/objectives`, `#/entry/{id}`. Every route except `#/`
renders a one-line stub in this phase.

## Files

**Touch (complete list):**

- `package.json` — create: dependencies and the four npm scripts
- `tsconfig.json` — create: strict TypeScript, Preact JSX
- `vite.config.ts` — create: Preact plugin, Vitest with jsdom
- `index.html` — create: mount point and the Google Fonts link
- `src/main.tsx` — create: mount, hash router, stub screens
- `src/styles/tokens.css` — create: every design token, plus base type rules
- `src/screens/home.tsx` — create: the silent-state home screen
- `src/screens/home.test.tsx` — create: home's rendering assertions

**Do not touch:** `docs/`, `CLAUDE.md`, and the entire
`Three UI approaches for coaching app/` folder — it is read-only reference.
Anything not listed under Touch. Needing an unlisted file means the plan is
wrong: record it as a note in this doc and a comment in your `PLAN.md` block;
if the phase can't proceed without it, follow **If blocked**.

## Tasks

### T1: Scaffold the toolchain

- Steps: `npm init -y`, then install `preact` as a dependency and
  `vite`, `@preact/preset-vite`, `typescript`, `vitest`, `jsdom`,
  `@testing-library/preact` as dev dependencies. Write `tsconfig.json` with
  `"strict": true`, `"jsx": "react-jsx"`, `"jsxImportSource": "preact"`,
  `"noEmit": true`, `"moduleResolution": "bundler"`. Write `vite.config.ts`
  using `@preact/preset-vite` with a `test` block setting
  `environment: 'jsdom'` and `globals: true`. Add scripts: `dev` → `vite`,
  `build` → `vite build`, `test` → `vitest run`, `typecheck` → `tsc --noEmit`.
  Write `index.html` with `<div id="app">` and the Google Fonts `<link>` for
  Newsreader (200, 300, 400, and 300 italic), IBM Plex Mono (400, 500) and
  IBM Plex Sans (400, 500). Write a `src/main.tsx` that renders the literal
  text `daily` into `#app`. Add `dist/` and `.env.local` to `.gitignore`.
- Verify: `npm run build` → exit 0, and `dist/index.html` exists.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T2: Design tokens

- Steps: write `src/styles/tokens.css` defining every token from the handoff
  README's colour table as a CSS custom property on `:root`, keeping each
  value in `oklch()`: `--paper`, `--paper-panel`, `--paper-panel-sel`,
  `--paper-quote`, `--paper-input`, `--paper-control`, `--ink`, `--ink-body`,
  `--ink-quiet`, `--mono`, `--mono-faint`, `--steel`, `--steel-hover`,
  `--steel-text`, `--steel-weak`, `--ink-select`, `--rule`, `--rule-light`,
  `--danger`, `--danger-border`. Where the README gives a range, take its
  midpoint and note the choice in this doc. Below the tokens add base rules:
  `body` background `--paper`, a `.serif` class (Newsreader) and a `.mono`
  class (IBM Plex Mono), `*{box-sizing:border-box}`, a 2px control radius,
  and a `.hit` utility guaranteeing 44px minimum. Import it from `src/main.tsx`.
- Verify: `npm run build` → exit 0, and searching `src/styles/tokens.css` for
  `oklch(` returns at least 20 matches while searching it for `#` returns 0
  → no hex colour survived.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T3: The hash router and stub screens

- Steps: in `src/main.tsx`, add a `Route` table mapping each hash in the
  capsule to a component. Read `location.hash`, default to `#/`, render the
  match, and re-render on `hashchange`. Unknown hashes render home. Every
  route except `#/` renders a stub: the module name as a 38–42px serif title
  and the text `not built yet` in `mono-faint`. `#/entry/{id}` parses the id
  and renders it in the stub so P4 can see the parameter arrives.
- Verify: `npm run typecheck` → exit 0, no output.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T4: Home in its silent state

- Steps: write `src/screens/home.tsx` per the capsule. Export a
  `recentEntries()` shim from inside that file returning `[]`, and a
  `lastTouched()` shim returning `null` for every module — P2 replaces both
  with store calls. Render the modules band, the recent section (empty
  string when the list is empty), and the `objectives →` link. Write
  `src/screens/home.test.tsx` asserting: all five module names render; the
  empty-recent string renders; no element carries a coach-row class or the
  steel dash; and no rendered text matches `/\d+\s*of\s*\d+/` — the guard
  against a progress readout creeping in.
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

- `npm run build` → exit 0, `dist/index.html` written
- `npm test` → exit 0, all tests passed
- `npm run dev`, open `http://localhost:5173`, and confirm by eye against
  frame 4a: five module tiles, the empty-recent string, `objectives →`, and
  nothing above the modules band. Narrow the window to ~372px wide and
  confirm the band becomes five rows without horizontal scrolling.

## Anti-goals

Do not, even if it seems better:

- No coach row, no placeholder for one, no "nothing to report" label. The
  coach is a different plan entirely.
- No data layer, no localStorage, no Drive, no entry types — P2 owns all of it.
- No CSS framework, no component library, no router package, no state
  management library. The dependency list in T1 is the whole list.
- No copying markup out of `Daily.dc.html`. Read it, then write your own.
- No hex colours, no icons, no imagery. The visual vocabulary is type,
  hairlines and one steel accent, and the absence of icons is deliberate.
- No `1120px` or `372px` media queries — those are canvases, not breakpoints.

## Deviations and decisions

Recorded during execution. Nothing here changed what the doc ordered; these
are the places reality needed a choice or an extra file.

### Two files outside the Touch list

- `src/screens/home.css` — home's layout could not be written without it. Home
  needs a `:hover` fill and a breakpoint, and neither is expressible in inline
  styles. The two candidates were "put home's layout rules in `tokens.css`",
  which contradicts that file's stated purpose, or a stylesheet beside the
  screen. **Convention set here: per-screen CSS lives next to the screen as
  `src/screens/{screen}.css`, imported by the screen.** P2–P8 should follow it
  rather than growing `tokens.css`.
- `.claude/launch.json` — harness config so `npm run dev` can be started for
  the Exit-criteria by-eye check. Not app source.

### Token midpoints (T2 asked for these to be noted)

Where the handoff README gives a range, `tokens.css` takes the midpoint:
`ink-quiet` 0.28, `mono` 0.54, `mono-faint` 0.65, `steel-text` 0.43 lightness
with 0.055 chroma, `rule` 0.87, `rule-light` 0.915. `danger`'s two values
became `--danger` (text) and `--danger-border`.

One token beyond the README's colour table: `--paper-hover:
oklch(0.947 0.005 255)`, the module-tile hover fill. The README gives it inline
in its Home spec rather than in the table, so it had nowhere else to live.

### Toolchain facts the doc did not predict

- TypeScript installed at 7.x, which errors `TS2882` on the side-effect import
  of a `.css` file. Fixed by adding `vite/client` to `compilerOptions.types` in
  `tsconfig.json` — a Touch-listed file, no new file needed.
- `package.json` is `"type": "module"`, and `vite.config.ts` imports
  `defineConfig` from `vitest/config` rather than `vite` so the `test` block
  typechecks.

### Open notes for the planner

1. **`760px` breakpoint.** The capsule says "build one fluid layout" and also
   specifies two genuinely different arrangements (five columns with verticals
   vs. five 60–62px rows; three-column `recent` vs. two-line `recent`). Those
   cannot both exist without a breakpoint or a container query. `home.css` uses
   `@media (min-width: 760px)`, which honours the Anti-goal as written — it
   bans `1120px` and `372px` specifically — but the tension is real and P5–P8
   will hit it on every module screen.
2. **Frame 4a's top strip is not built.** The frame draws a 56px/52px strip
   carrying `daily` and the date above the modules band. The capsule's "Home's
   parts, top to bottom" omits it and Exit criteria says "nothing above the
   modules band", so it was left out. Whether home should have the strip is a
   planner decision, not an executor one. P2 has an Incoming comment.
3. **Doc-ordered things the over-engineering lens objected to**, left in place
   per the skill's rule: the `.serif`/`.mono` classes and the control-radius
   base rule in `tokens.css` (T2 named all three); the 13 tokens with no
   consumer yet (T2 named each); and the populated-`recent` branch in
   `home.tsx`, unreachable while `recentEntries()` returns `[]` but specified
   in full by the capsule and swapped live by P2.
4. **The five-module list is a source constant** (`MODULES` in `home.tsx`).
   Read against RULES.md's no-hard-coded-targets rule this is structure — the
   routes and screens are source — not editable data. Flagged so it is a
   decision rather than an oversight.

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

Objective: stand up the toolchain and the visual system, then render home in
its silent state with every route reachable.

HEAD: `eb6b827` | Branch: `v1-implementation` | Baseline: `a596d41`

Files changed:

```txt
.gitignore
.claude/launch.json
docs/plans/v1-recording/PLAN.md
docs/plans/v1-recording/P1_toolchain_and_home.md
index.html
package-lock.json
package.json
src/main.tsx
src/screens/home.css
src/screens/home.test.tsx
src/screens/home.tsx
src/styles/tokens.css
tsconfig.json
vite.config.ts
```

Commands run:

| command | result |
| :- | :- |
| `node --version` | `v22.14.0` — entry criterion held |
| `git status --porcelain` | empty — entry criterion held |
| `npm run build` | exit 0, `dist/index.html` written (T1, T2, Exit) |
| `grep -c 'oklch(' src/styles/tokens.css` | 22 — above the 20 the doc asks for |
| `grep -c '#' src/styles/tokens.css` | 0 — no hex colour survived |
| `npm run typecheck` | exit 0, no output (T3, gate 2) |
| `npm test` | exit 0, 4 tests passed (T4, gate 1) |
| fresh review | subagent, diff-only; findings applied in `71198f2` |
| `npm run dev` at 1120×700 | five columns on one row, `rule` above and below, `nothing recorded yet`, `objectives →` at the foot, nothing above the band |
| `npm run dev` at 372×780 | five 62px rows, `scrollWidth == 372` — no horizontal scroll |
| route check | `#/workout` `#/objectives` stub; `#/entry/abc-123` shows `entry abc-123`; `#/nonsense` falls back to home |

Test status: `npm test` → exit 0, 4 passed, 0 failed. No test is deliberately
left red by this phase.

Assumptions:

1. Home has no top strip, because the capsule's parts list omits it and Exit
   criteria says nothing sits above the modules band — see Deviations note 2.
2. A module never touched prints nothing rather than a placeholder string.
   Silence is unknown, not a miss, and the doc names no string for it.
3. `recentEntries()` returns rows already formatted for display (`time`,
   `detail` as strings), so home does no date arithmetic. P2 formats.
4. `760px` is a legitimate breakpoint since the Anti-goal names only the two
   canvas widths — see Deviations note 1.

Open questions:

1. Should home carry frame 4a's `daily` strip? Planner decision; P2 has an
   Incoming comment in `PLAN.md`.
2. Does the module list belong in `config/app.json` once P3 exists, or is it
   permanently source? Treated as source here — see Deviations note 4.

Next action: **P2: entry_store_and_body_weight** — its only dependency, P1, is
now `done`.

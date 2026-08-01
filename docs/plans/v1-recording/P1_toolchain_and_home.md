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

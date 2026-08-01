# P2: entry_store_and_body_weight

**Plan:** v1-recording — build daily's five recording modules plus objectives
as a static offline web app storing data in the user's own Google Drive.
This phase is one step toward it; read `PLAN.md`'s Goal and Context in full
before starting. That line orients you; `PLAN.md` is the source of truth, so
don't restate its detail here.

**Your workspace.** Write freely here during implementation. Your only other
editable file is `PLAN.md` (your table row, your Phase-notes block, Incoming
comments in other phases' blocks); never another phase's `P*` doc.

**Demo:** Log a weight of 72.4 kg at a timestamp pulled back to this morning;
reload the page; the entry is in home's `recent` and in the body screen's
rail, and `Previous` on the body screen shows the weight before it with its
date.

**Goal:** Introduce the one data primitive the whole app is built on and the
single module that touches persistence, then prove both by shipping the
smallest module end to end. Storage is `localStorage` only; P3 swaps the
adapter for Drive without changing this phase's public API.

## Entry criteria

Run each; all must hold before any other work. If any fails, follow
**If blocked** — do not improvise around it.

- [ ] Read this phase's block in `PLAN.md`, including any **Incoming comments** — they amend this doc
- [ ] P1's Status is `done` in `PLAN.md`'s phase table
- [ ] `npm test` → exit 0, all tests passed
- [ ] `git status --porcelain` → empty (clean tree)

## Context capsule

Read lines 788–841 of `Daily.dc.html` — frame 4f, body. Quote the path; it
contains spaces. Build only the **weight** half; photos are P8.

The entry shape and the Drive layout are in `PLAN.md`'s Context. Everything
below is what this phase implements.

`src/data/entry.ts` exports:

- `type Entry = { id, module, ts, rev, recorded_at, deleted, payload }` where
  `module` is `'workout' | 'nutrition' | 'movement' | 'dance' | 'body'`,
  `ts` and `recorded_at` are ISO 8601 strings **with offset**, and `payload`
  is `Record<string, unknown>` narrowed per module by each module's own file.
- `newEntry(module, payload, ts?)` — `id` from `crypto.randomUUID()`, `rev` 1,
  `recorded_at` now, `deleted` false, `ts` defaulting to now.
- `monthKey(ts)` → `'2026-08'`, computed from the **local** date, not UTC.
  A 23:30 entry in Israel must not land in the previous month's file.
- `entryPath(module, ts)` → `entries/{module}-{monthKey}.jsonl`.

`src/data/store.ts` is the **only** module in `src/` that touches persistence.
It exports:

- `readText(path): string | null` / `writeText(path, text)` — the mirror.
- `readJson<T>(path, fallback: T): T` / `writeJson(path, value)`.
- `readEntries(module, months?): Entry[]` — parses the JSONL month files,
  drops `deleted` lines, sorts by `ts` descending.
- `putEntry(entry)` — read-modify-write of the whole month file: parse, replace
  the line with the same `id` if present, otherwise append, serialise, write.
- `recentEntries(n)` — the newest `n` entries across all modules.
- `lastTouched(module)` — the newest entry's `ts` for a module, or `null`.
- `ensureSeeded()` — for each path in a `SEEDS` array, if the mirror has no
  file there, write the imported seed JSON. Called once at boot. **P3–P8 add
  entries to `SEEDS`; that is the only edit they make to this file.**

Behind these, an adapter object with `get(path)` / `set(path, text)` /
`list(prefix)`. This phase ships one adapter backed by `localStorage`, keys
prefixed `daily:`. P3 adds a Drive-backed adapter with the same three
methods. Keep the interface exported so P3's swap is one line.

`src/components/fields.tsx` holds shared controls. This phase adds two, and
P5–P8 add to the same file rather than restating them:

- `<Timestamp value onChange />` — renders `sat 1 august · 07:35` in a 52px
  mono box with a `rule` border. Clicking opens native `date` and `time`
  inputs. When the value differs from now by more than a minute, append
  `· now 20:41` in `mono-faint` — logging the apple from an hour ago is the
  normal case, not a correction, so this reads as information, not a warning.
- `<Previous entry render />` — a `paper-quote` block with a 2px `steel` left
  border, showing the date in mono and whatever `render` returns. When there
  is no previous entry it renders an honest string, not an empty box:
  `nothing recorded yet`. It is **never** conditional on anything else and it
  is not the coach speaking.

`src/screens/body.tsx` — frame 4f's laptop layout: a left rail (340px,
`paper-panel`) listing recorded weights newest first as `12 july 07:40` /
`73.1 kg`, and a main column with the 42px serif title `weight`, the previous
line, a 210×82px number input with a 1.5px `steel` border and the unit `kg`
alongside at 14px, the `<Timestamp>` box labelled `when`, and a steel
`log it` button. Below them, the honest empty state as prose in 20px serif —
`Four weights since May. Not enough to draw a line yet.` — with the count
taken from the data. **No graph is drawn.** On phone the rail collapses below
the fields and `log it` pins to the bottom.

`kg` is a unit, and units are data: it comes from `config/app.json`'s
`body.weight_unit`, seeded to `kg`. This is the no-constants rule in its
smallest form — get it right here and the pattern is set.

Gotcha: `localStorage` values are strings. Never `JSON.parse` a JSONL file as
a whole; split on `\n`, drop blank lines, parse each.

## Files

**Touch (complete list):**

- `src/data/entry.ts` — create: the entry primitive
- `src/data/store.ts` — create: adapter, mirror, entry and JSON reads/writes
- `src/data/store.test.ts` — create: round-trip, month boundary, seeding
- `src/seed/app.json` — create: week start, day zones, body weight unit
- `src/components/fields.tsx` — create: `Timestamp` and `Previous`
- `src/screens/body.tsx` — create: the weight half of frame 4f
- `src/screens/body.test.tsx` — create: logging and `Previous` assertions
- `src/screens/home.tsx` — edit: replace P1's shims with store calls

**Do not touch:** `src/main.tsx` (P1 already routes `#/body`),
`src/styles/tokens.css`, `docs/`, and the
`Three UI approaches for coaching app/` folder. Anything not listed under
Touch. Needing an unlisted file means the plan is wrong: record it as a note
in this doc and a comment in your `PLAN.md` block; if the phase can't proceed
without it, follow **If blocked**.

## Tasks

### T1: The entry primitive

- Steps: write `src/data/entry.ts` per the capsule. First write the failing
  cases in `src/data/store.test.ts`: `monthKey` on `2026-08-31T23:30:00+03:00`
  is `2026-08`, `newEntry` produces `rev: 1` and a parseable `id`, and
  `entryPath` composes correctly. Then implement until green.
- Verify: `npm test` → exit 0, the three new cases pass.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T2: The store

- Steps: write `src/seed/app.json` holding `{"week": {"starts": "sunday"},
  "day_zones": {...}, "body": {"weight_unit": "kg"}}` — day zones are
  morning / work / afternoon / evening / bedtime with hour boundaries, unused
  in this plan but seeded now because the coach plan needs them and they are
  configuration, not code. Then write `src/data/store.ts` per the capsule with
  the `localStorage` adapter and `SEEDS = [['config/app.json', appSeed]]`.
  Extend `src/data/store.test.ts`: put two entries in different months and read
  both back; put an entry twice with the same `id` and confirm one line
  survives with the higher `rev`; confirm a `deleted` line is stored but not
  returned by `readEntries`; confirm `ensureSeeded` writes `config/app.json`
  once and does not overwrite an edited copy on a second call.
- Verify: `npm test` → exit 0, all tests passed.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T3: Shared fields

- Steps: write `src/components/fields.tsx` with `Timestamp` and `Previous`
  per the capsule. Both are presentational — they take values and callbacks
  and never call the store themselves.
- Verify: `npm run typecheck` → exit 0, no output.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T4: The body screen, and home wired to real data

- Steps: write `src/screens/body.tsx` per the capsule, reading the unit from
  `config/app.json` through `readJson`. Register it on the `#/body` route by
  replacing P1's stub import in the route table — that is a one-line change
  and does not count as touching `src/main.tsx` for any other reason. In
  `src/screens/home.tsx`, replace the `recentEntries()` and `lastTouched()`
  shims with the store's. A body entry's `recent` detail line reads
  `72.4 kg`. Write `src/screens/body.test.tsx`: entering a weight and pressing
  `log it` calls `putEntry` with a `body` module entry whose payload holds the
  number; a second render shows the first weight in `Previous`; with no
  entries at all, `Previous` renders `nothing recorded yet` rather than an
  empty block; and no rendered text contains a `kg` literal sourced from code
  rather than config.
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
- `npm run dev`, then in the browser: log `74.0` at the default timestamp, log
  `72.4` after pulling the time back to 07:35 this morning, reload the page,
  and confirm both appear in the body rail newest first, `72.4 kg` appears in
  home's `recent` with `body` beside it, and `Previous` shows `74.0 kg`.

## Anti-goals

Do not, even if it seems better:

- No Drive, no network, no sign-in, no service worker — P3 owns all of it.
- No photos — P8 owns them. This screen logs a weight and nothing else.
- No graph, no trend line, no sparkline. The empty state is prose, and it
  stays prose even once there are twenty weights.
- No `kg`, no week boundary and no day zone as a literal in `src/`. If you
  find yourself typing a number that a user might reasonably disagree with,
  it belongs in `src/seed/app.json`.
- No generic "repository" or "unit of work" abstraction over the store. Three
  adapter methods and a handful of functions is the whole design.
- No entry deletion or editing UI — P4 owns it. `deleted` exists in the shape
  and is honoured by `readEntries`, but nothing sets it yet.

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

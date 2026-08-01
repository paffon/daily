# P3: drive_store_and_offline

**Plan:** v1-recording — build daily's five recording modules plus objectives
as a static offline web app storing data in the user's own Google Drive.
This phase is one step toward it; read `PLAN.md`'s Goal and Context in full
before starting. That line orients you; `PLAN.md` is the source of truth, so
don't restate its detail here.

**Your workspace.** Write freely here during implementation. Your only other
editable file is `PLAN.md` (your table row, your Phase-notes block, Incoming
comments in other phases' blocks); never another phase's `P*` doc.

**Demo:** Sign in with Google; log a weight; open
`daily/entries/body-2026-08.jsonl` in Drive and read the line by eye; then go
offline in devtools, log a second weight, reconnect, reload, and see the
second line in the same Drive file.

**Goal:** Make the data durable and the app usable without a signal. The
store's public API from P2 does not change — only its adapter and a sync pass
are added — so P4 through P8 are written against P2's signatures.

**This is the riskiest phase in the plan** and the only one with an external
prerequisite. If sign-in cannot be completed, mark it `blocked`; do not build
a fake Drive.

## Entry criteria

Run each; all must hold before any other work. If any fails, follow
**If blocked** — do not improvise around it.

- [ ] Read this phase's block in `PLAN.md`, including any **Incoming comments** — they amend this doc
- [ ] P2's Status is `done` in `PLAN.md`'s phase table
- [ ] `npm test` → exit 0, all tests passed
- [ ] `git status --porcelain` → empty (clean tree)
- [ ] A `.env.local` exists containing `VITE_GOOGLE_CLIENT_ID=...`. If it does
      not, ask the user for it before writing any code: they must create a
      Google Cloud project, enable the Drive API, and create an OAuth 2.0
      **Web application** client ID with `http://localhost:5173` as an
      authorised JavaScript origin. This is theirs to do, not yours.

## Context capsule

**Auth.** Google Identity Services, loaded from
`https://accounts.google.com/gsi/client` with a `<script>` tag in
`index.html`. Use `google.accounts.oauth2.initTokenClient` with scope
`https://www.googleapis.com/auth/drive.file` — the app sees only files it
created, which is the narrowest scope that works and is why no consent screen
review is needed. Keep the access token **in memory only**; never in
`localStorage`. On boot, try a silent refresh with `prompt: ''`; if it fails,
render the sign-in screen. There is no refresh token and no server, by design:
an expiry mid-session just re-prompts on the next sync, and the mirror means
nothing is lost meanwhile.

**Drive API**, all plain `fetch` against `https://www.googleapis.com`:

- find a folder or file — `files?q=name='daily' and trashed=false`, adding
  `mimeType='application/vnd.google-apps.folder'` for folders and
  `'{parent}' in parents` to scope to a parent
- read — `drive/v3/files/{id}?alt=media`
- create — `upload/drive/v3/files?uploadType=multipart`, metadata part naming
  the parent; update — `upload/drive/v3/files/{id}?uploadType=media`

Create `daily/` and one subfolder per prefix (`entries`, `library`, `config`,
`photos`), and cache the folder ids in the mirror under `_folders.json` so boot
costs one lookup rather than five per write.

**The adapter swap.** P2's `store.ts` has an adapter with `get(path)` /
`set(path, text)` / `list(prefix)`. Replace the `localStorage`-only adapter
with one that:

- `get` — returns the mirror's copy, always. Never a network read.
- `set` — writes the mirror, then adds the path to a dirty set stored under
  `daily:dirty`, then fires a sync pass without awaiting it.
- `list` — lists the mirror's keys.

Every read stays synchronous, which is what makes logging work in a basement.

**Sync**, in `src/data/sync.ts`:

- `pull()` — on boot, after auth: for every file under `daily/`, fetch it and
  write it into the mirror **unless** its path is dirty. A dirty local file
  always wins; it holds a write the remote has not seen.
- `push()` — for each dirty path, upload the mirror's text and clear the flag
  on success. On failure, leave it dirty and stop; the next pass retries.
- `syncNow()` — `push()` then `pull()`. Called on boot, on `online`, and after
  any `set`. Debounce to at most one in flight.

Conflict handling is deliberately thin: one user, whole-file overwrite. If a
pull would overwrite a dirty file, the dirty file wins — that is the whole
policy. The `rev` field exists so a future merge needs no migration, not
because this phase merges.

**Offline shell.** Add `vite-plugin-pwa` in `generateSW` mode with
`registerType: 'autoUpdate'`, precaching the built assets and the Google Fonts
stylesheet. **Do not enable any push or notification capability** — `RULES.md`
forbids notifications on every channel, and registering for push is a rule
break even if nothing is ever sent.

**Sign-in screen.** One line of serif text naming the app, one steel button
reading `sign in with google`, nothing else. No greeting, no benefits, no
marketing. It is the only screen that exists because of a platform constraint
rather than because something is being recorded.

Gotchas: the GIS script loads asynchronously, so `google.accounts` may be
undefined when `main.tsx` runs — wait for the script's `load` event before
calling `initTokenClient`. And if `import.meta.env.VITE_GOOGLE_CLIENT_ID` is
missing, throw a clear error naming `.env.local` rather than falling back to a
placeholder that fails obscurely at the consent screen.

## Files

**Touch (complete list):**

- `src/data/drive.ts` — create: token client and the Drive REST calls
- `src/data/sync.ts` — create: `pull`, `push`, `syncNow`, the dirty set
- `src/data/sync.test.ts` — create: dirty-wins and retry cases
- `src/data/store.ts` — edit: swap the adapter, expose the mirror to sync
- `src/screens/signin.tsx` — create: the one-button screen
- `src/main.tsx` — edit: gate on auth, call `ensureSeeded` then `syncNow`
- `vite.config.ts` — edit: add the PWA plugin
- `.gitignore` — edit: ensure `.env.local` and `dist/` are ignored

**Do not touch:** `src/screens/body.tsx`, `src/screens/home.tsx`,
`src/components/fields.tsx`, `src/data/entry.ts` — needing any of them means
the adapter boundary leaked. Anything not listed under Touch. Needing an
unlisted file means the plan is wrong: record it as a note in this doc and a
comment in your `PLAN.md` block; if the phase can't proceed without it, follow
**If blocked**.

## Tasks

### T1: Sign in

- Steps: add the GIS `<script>` to `index.html` via `vite.config.ts`'s
  transform or directly — either is fine, but the tag belongs in the HTML, not
  injected at runtime. Write `src/data/drive.ts` exporting
  `signIn(): Promise<void>`, `trySilentSignIn(): Promise<boolean>` and
  `token(): string`. Write `src/screens/signin.tsx`. In `src/main.tsx`, on
  boot await `trySilentSignIn()`; if false, render the sign-in screen instead
  of the router.
- Verify: `npm run dev`, open the app, press `sign in with google`, complete
  the Google consent flow → the app renders home. Reload → home renders
  without a second consent prompt.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T2: Drive reads and writes

- Steps: extend `src/data/drive.ts` with `ensureFolders()`,
  `getFile(path): Promise<string | null>`, `putFile(path, text)` and
  `listFiles(): Promise<string[]>`, using the endpoints in the capsule and
  caching folder ids in the mirror under `_folders.json`.
- Verify: `npm run dev`, sign in, and in the browser console call the exported
  `putFile('config/probe.json', '{"ok":true}')` → the file appears in Drive
  under `daily/config/`, opens in a browser tab, and reads `{"ok":true}`.
  Delete it from Drive afterwards.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T3: The adapter swap and sync

- Steps: write `src/data/sync.ts` per the capsule. Edit `src/data/store.ts` so
  `set` marks the path dirty and calls `syncNow()` without awaiting, and `get`
  still reads the mirror synchronously. Write `src/data/sync.test.ts` with a
  fake `drive` module: a dirty local file is not overwritten by `pull`; a
  clean local file is; a `push` failure leaves the path dirty and a second
  `push` retries it; two concurrent `syncNow()` calls result in one in-flight
  pass.
- Verify: `npm test` → exit 0, all tests passed.
- Commit when green (write the message at commit time: a concise line describing what this task changed).

### T4: The offline shell

- Steps: install `vite-plugin-pwa` and add it to `vite.config.ts` per the
  capsule. In `src/main.tsx`, register a `window.addEventListener('online',
  syncNow)`. Confirm the generated service worker contains no `push` or
  `Notification` reference.
- Verify: `npm run build` → exit 0, and searching `dist/` for `push` and
  `Notification` returns 0 matches in the generated service worker.
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
- `npm run dev`, sign in, log a weight, then open Drive in another tab and
  read `daily/entries/body-<this month>.jsonl` → one JSON line whose `payload`
  holds the weight, legible without the app
- Offline in devtools: log a second weight → it appears in the body rail at
  once. Back online, after the sync, reload the Drive file → two lines

## Anti-goals

Do not, even if it seems better:

- No server, proxy, cloud function or Firebase between the browser and Google.
- No push subscription, `Notification` permission request or background-sync
  registration — notifications are forbidden on every channel.
- No token in `localStorage`, `sessionStorage` or a cookie. Memory only.
- No `appDataFolder`. The folder must be visible and openable by the user.
- No CRDT, operational transform, vector clock or three-way merge. One user,
  whole-file writes, dirty-wins. No migration or versioning scheme either.
- No change to the store's public signatures. A signature that must change is
  a finding for P4's Incoming comments, not a silent edit.

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
## Deviations

Recorded as they happened. Each says what the doc asked for, what was built,
and why.

### T1: there is no silent sign-in, so `trySilentSignIn` does not exist

**The doc asked for** `trySilentSignIn(): Promise<boolean>`, called on boot,
falling back to the sign-in screen when it fails — so a reload lands on home.

**What is built:** `signIn(): Promise<boolean>` and nothing else. Every page
load renders the sign-in screen and waits for a press.

**Why:** a GIS token client has no silent mode. Every `requestAccessToken()`
opens a popup, and a popup outside a user gesture is blocked. This is not a
configuration problem to solve — it is what the token model is, and the phase's
own Anti-goals close every escape from it: the token is memory-only, there is
no refresh token, and there is no server to hold one.

Built as written first, and it hung: on boot the popup opened, nothing could
complete it, and **GIS calls neither `callback` nor `error_callback` when a
popup is blocked** — so the promise never settled and the app rendered an empty
page. Verified in the browser: the popup tab opened at `accounts.google.com`
and sat there, and `window.open` without a gesture is refused outright.

**Consequence for the doc:** T1's Verify says *"Reload → home renders without a
second consent prompt."* Half of that holds — Google does not ask for consent
again — but a press is needed on every load. Rewritten in practice as: reload →
sign-in screen → one press → home, no consent prompt. Confirmed by the user.

**For the planner:** the only way to remove that press is to persist a
credential, which the Anti-goals forbid. Worth deciding whether the press is
accepted permanently (it is honest — the app holds nothing) or whether the
memory-only rule is worth revisiting. Not a decision this phase should make.

### T1: a blocked popup leaves the button silent

If a browser blocks the popup, `signIn()` never settles and the button appears
dead — GIS logs to the console and tells the app nothing. Not handled, because
the doc specifies the sign-in screen as *"one line of serif text naming the
app, one steel button… nothing else"*, and any feedback is a third element.
Low stakes for one user who grants popups once, but it is the screen's only
failure mode and it is invisible. A planner call.

### T1: `src/screens/signin.css` is outside the Touch list

The doc lists `src/screens/signin.tsx` only. P1 established that per-screen CSS
lives beside the screen as `src/screens/{screen}.css`, and P2 followed it; the
button needs a `:hover` rule, which an inline style cannot carry. Four rules,
no shared control extracted — two screens is not a pattern yet.

### T1: `.gitignore` needed no edit

Listed under Touch as *"ensure `.env.local` and `dist/` are ignored"*. Both were
already there from P1. No change made.

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

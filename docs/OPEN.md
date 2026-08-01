# Open

What the v1-recording build left unresolved, carried out of the plan on
2026-08-02 so it does not archive with it. Each item was found and recorded by
the phase that hit it; the full reasoning is in
`docs/plans/archive/v1-recording/`, which is a historical record and not
current truth. This file is current truth.

Nothing here is a bug report against a phase. Every one of these was either a
decision the executor was not authorised to make or a defect whose fix crossed
files no single phase owned.

## Recording can be lost or wrong

**`ensureSeeded` never backfills a config key.** It writes a seed only when the
whole file is absent, so a browser holding an older `config/app.json` gets
`undefined` where TypeScript says a value is present. Four phases defended
their own section by spreading the seed under the stored one, at six call
sites, and every future config key inherits that workaround. Merging on read
in `src/data/store.ts` removes all six. See
[ADR 0003](./adr/0003-every-number-is-seeded-data.md).

**A backdated entry saves and then vanishes from the screen that saved it.**
Logging yesterday's walk today is one press on the editable timestamp and is
the ordinary case, but the rails in `src/screens/workout.tsx:109`,
`nutrition.tsx:94` and `movement.tsx:148` filter on the wall-clock day. The
entry is written correctly and shows nowhere, and the likely next action is to
log it again and silently duplicate it. One decision across those three
screens: the rail follows the day the *timestamp* names, or the honest empty
says something about entries filed on other days. (`body.tsx` and `dance.tsx`
do not day-filter and are unaffected.)

**An emptied amount box logs the number it used to hold.**
`src/components/amount_stepper.tsx` suppresses `onChange` for an unreadable
box, which is right — half a typed number is not a number — but the field then
reads empty while the payload keeps the old figure, and pressing log saves it.
Worst on the posture form, where the bar sits directly under the box and looks
like a live echo of it.

**An exercise created inline gets a blank body part and the library's first
kind, permanently.** So a route added as `run · park loop` gets a weight box,
and the body part that objectives count against is empty. `DESIGN.md` calls
that field the only reason the kind exists.

## Data left behind

**Two callers want one primitive: a `delete` on the `Adapter`.** A month file
emptied by an entry moving out is left behind as a bare newline, and a deleted
photo entry leaves its JPEG in Drive — the tombstone is right and the file is
orphaned. `Adapter` in `src/data/store.ts` has `get`, `set` and `list` only.

## Visibly wrong, or dead

**Home's `recent` shows a blank detail for four of the five modules.**
`detail()` in `src/screens/home.tsx:14` answers only for `body`, so a walk, a
posture block, a dance session and a food each show their time, their module
and nothing else. The answer is now cheap: every module already has a one-line
renderer written for exactly this sentence — `segmentLine` and `postureLine`
in `movement.tsx`, `sessionLine` in `dance.tsx`, `lineOf` in `nutrition.tsx`.
This is the open question of whether the editor registry should also cover
`recent` rows; if it should, home's switch goes and each module registers one
more function.

**The edit screen's not-built-yet branch is unreachable.** All five modules
have editors, so the read-only JSON dump and the line at
`src/screens/edit_entry.tsx:73-77` are dead. `edit_entry.test.tsx:102` still
covers them, but only because that file imports no module screen and so
nothing registers — an import-order accident, not a state the app can reach.

**The posture bar's third part is 0px wide for every possible input.** The
plan ordered a three-part bar and specified a two-number payload
(`span_hours`, `sitting_hours`), so the third part can never have a value.
Measured in the browser at 615.75 / 205.25 / 0 px, not reasoned about.

## Rules and shape

**One threshold is still a source literal.** `src/components/fields.tsx:68`
carries `60_000` — the distance from now past which the timestamp box shows
`· now 20:41` beside it. `RULES.md` says every threshold is editable data, and
this sits in the one file every module's fields go through. (The `60_000` in
`src/data/entry.ts:31` is a minutes-to-milliseconds conversion, not a
threshold, and is fine.)

**The module screen skeleton is written six times.** The 52/56px strip, the
back link, the uppercase field label and the `@media (min-width: 760px)` block
are duplicated across `body.css`, `edit_entry.css`, `workout.css`,
`nutrition.css`, `movement.css` and `dance.css`. Raised before the third copy
and again at the fifth; the fix crosses files no module phase owned.

**There is no silent sign-in, and the app cannot be entered offline at all.**
Google Identity Services token clients have no silent mode, so every page load
renders the sign-in screen and needs one press. The offline shell exists but
cannot be reached without that press, which partly defeats the goal of the
phase that built it. The fix is small and breaks no anti-goal, but it needs a
decision about what a signed-out app shows.

**Home has no top strip.** Frame 4a shows a 56/52px band carrying `daily` and
the date above the modules; home does not render it. It was left out rather
than improvised, and was never decided either way.

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

**An emptied amount box logs the number it used to hold.**
`src/components/amount_stepper.tsx` suppresses `onChange` for an unreadable
box, which is right — half a typed number is not a number — but the field then
reads empty while the payload keeps the old figure, and pressing log saves it.
Worst on the posture form, where the bar sits directly under the box and looks
like a live echo of it.

**An exercise created inline gets a blank body part and the library's first
kind, permanently.** Closed on 2026-08-05. The workout header now carries a
`<select>` over the library's kinds map and a body-part box backed by a
`datalist` of the parts already in use, both writing straight to
`library/exercises.json`, and both reachable for a seeded exercise as well as an
added one. Changing the kind clears the rows already typed — they are rows of
something else once the field list moves. Still open underneath it: an
exercise's own `fields` override, which `DESIGN.md` §8.1 also calls editable, has
no surface — the kind is the whole of what can be chosen.

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

**The app cannot be entered offline at all, and that is now deliberate.** The
question this entry used to ask — what a signed-out app shows — was decided on
2026-08-05: nothing. No token, no modules and no mirror, on every screen. Google
Identity Services token clients have no silent mode and the token is memory-only,
so that means one press per page load, and it means a browser with no signal
cannot get in even though the mirror behind the gate holds every entry ever
logged and would take the write.

That is a live conflict with `DESIGN.md` §10, which lists offline-capable so a
dead signal in a basement gym does not stop logging mid-set. Both cannot be true
at once. What would settle it without giving the gate up is a way to prove a
past sign-in that survives a reload — a stored profile, or an ID token with its
expiry checked — so the mirror opens offline for a browser that has signed in
before, and only for one.

**Home has no top strip.** Frame 4a shows a 56/52px band carrying `daily` and
the date above the modules; home does not render it. It was left out rather
than improvised, and was never decided either way.

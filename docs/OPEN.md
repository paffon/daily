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

**A push can put a thin mirror over a full Drive.** Found on 2026-08-09 while
taking the sign-in gate out, and the reason the gate went back in. Every writer
in the app is a read-modify-write over the mirror with the seed as its
fallback: `putEntry` in `src/data/store.ts` reads `[]` for a month file the
mirror does not hold, and `writeExercises`, `writeFoods` and `createProfile`
all read through `readJson(path, seed)`. The result is written back whole and
marked dirty. `syncNow` in `src/data/sync.ts` then runs `push` before `pull`,
`push` consults only the dirty set, and `putFile` is a whole-file `PATCH` — so
a one-line month file goes over the month Drive holds. `push` then records the
upload's own `modifiedTime`, so the `pull` right after skips the path, and
there is nothing left on either side to restore from.

The gate keeps it unreachable in the ordinary case, and since later on
2026-08-09 it says so directly: `enterable` in `src/main.tsx` asks `filled` in
`src/data/sync.ts`, which is whether `daily:pulled` holds anything — one file
reconciled with Drive either way, pulled down or pushed up. A browser that has
never synced still cannot type a character. What changed is that a browser that
has can, with or without a token, which is what the hazard was always about: an
empty mirror, not an absent token.

Two ways in survive it, both narrow, and both predate 2026-08-09. Writing
during the pass the press starts — `entered` paints before `catchUp` finishes —
and a dirty path left over from a session whose pull never landed, which pushes
before the next pull on the following boot.

What the same change widens is the conflict policy's window rather than this
hazard. `pull` skips dirty paths and `push` uploads whole files, so
last-writer-wins was always the policy; entries can now be logged for days
without a token and go up whole on the next pass, beating whatever another
browser wrote to the same month meanwhile. One person, usually one browser, and
the merge below is what would end the argument for good.

What would actually close it is a merge rather than an order: entries carry
`id` and `rev` and tombstone rather than disappear (ADR 0002), so a month file
is mergeable line by line and nothing in `sync.ts` tries. The library and
config JSON have no such handle and would need a policy of their own, which is
why this is not an afternoon.

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

**A food created inline was logged at no level at all, and kept a blank unit.**
Closed on 2026-08-08. `start` in `src/screens/nutrition.tsx` resolved the food
against the library copy read at render time, which is one press older than the
food just made, so `asFood`'s fallback handed back a blank `default_level` and
that blank was written onto the entry — invisibly, since the rail prints the
level without comment. It now resolves against a fresh read. The blank unit
beside it is answered rather than fixed: the builder's head carries the name,
the unit and the food's note, so everything a food is can be written without
leaving the meal.

## Data left behind

**Two callers want one primitive: a `delete` on the `Adapter`.** A month file
emptied by an entry moving out is left behind as a bare newline, and a deleted
photo entry leaves its JPEG in Drive — the tombstone is right and the file is
orphaned. `Adapter` in `src/data/store.ts` has `get`, `set` and `list` only.

**A profile cannot be renamed or deleted.** Creating and switching
(2026-08-06, ADR 0004) is the whole surface: a mistyped name is permanent, and
an abandoned profile's files stay in Drive and in every mirror. Rename is a
registry edit; delete is a third caller for the missing `Adapter` primitive
above, this time over a whole `~`-prefixed family of files.

## Visibly wrong, or dead

**Home's `recent` showed a blank detail for four of the five modules.**
Closed on 2026-08-06. Each module now exports the sentence about its own
payload — `workoutLine`, `nutritionLineFor`, `movementLine`, `danceLine`
beside the existing `bodyLine` — and `detail()` in `src/screens/home.tsx`
switches over the five. Imported rather than registered: a registry fills only
for the modules that happen to have been imported, which is the import-order
accident the next entry was about.

**The edit screen's not-built-yet branch is unreachable.** Closed on
2026-08-06 by deleting it. All five modules register an editor and home now
imports all five, so the branch could not be reached; the test that covered it
asserts the registered editor renders instead.

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

The catalog screens are a second family of the same thing: `foods.css`
(2026-08-08) is `exercises.css` with two blocks added, and the two screens are
deliberately identical everywhere else. Hoisting either family is the same
piece of work and neither has been done.

**The app could not be entered offline at all. Closed on 2026-08-09**, in two
steps on the same day. First the token was written to `localStorage` beside its
expiry and restored at module load, which bought an hour. Then the gate was
moved off the token and onto the mirror — `enterable` asks `filled`, above — so
a browser that has synced once opens on the log with no token and no network at
all. That is the basement gym `DESIGN.md` §10 asks for, without a clock on it.

**Reaching Drive is still capped at an hour**, and that part is not closed and
cannot be. The four ways around it are all dead and the reasons are worth
keeping so nobody spends the afternoon again: a GIS token client opens a popup
on its only code path and a popup needs a gesture; the redirect flow returns its
token in the URL fragment, which is where this app's router lives; the
hidden-iframe flow is refused by `X-Frame-Options` on Google's endpoint; and a
refresh token needs a client secret, which a static page cannot hold without
publishing it to anyone who opens the source. An hour is the ceiling for any
browser-only Google integration. What the second step changed is what the
ceiling costs: a press to sync rather than a press to get in.

Only a server could lift it — a function holding the client secret and
exchanging a code for a refresh token. That is the one alternative that was
live rather than dead, and it was not taken: it contradicts the no-server line
in `DESIGN.md` §10, needs a billing plan, and would put a renewable credential
on the disk in place of one that expires by itself. It would want an ADR.

**The gate was removed and put back on 2026-08-09, and then moved rather than
removed, which is the part worth reading.** Opening the app on the mirror
regardless of a token looks free — the mirror is already what every screen
reads — and it is not: it turns *a push can put a thin mirror over a full
Drive* above from a race into the ordinary state of a fresh browser. What made
it safe was not taking the door out but asking a better question at it. Anything
that widens `filled` has to answer the same one.

**Home has no top strip.** Frame 4a shows a 56/52px band carrying `daily` and
the date above the modules; home does not render it. It was left out rather
than improvised, and was never decided either way.

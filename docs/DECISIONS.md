# Decisions

The door to `docs/adr/`: what earns a record, what the records have in common,
and which one to open. It settles nothing itself.

## Where a decision is written

| record | what belongs in it |
| :- | :- |
| `docs/DESIGN.md` | the behaviour itself — what the app does and why it does it that way. Most decisions land here and nowhere else |
| `docs/adr/` | a decision with a trade-off — what was chosen, what was rejected, and what it costs |
| the *Reversals* table in `RULES.md` | a rule that flipped, so that changing back looks like a decision rather than a correction |
| `docs/CONTEXT.md` | vocabulary — what a word means here, and which words are deliberately not used |

An ADR is warranted only when all three of these hold at once.

1. **Hard to reverse.** Changing your mind later costs something real.
2. **Surprising without context.** A future reader looks at the code and
   wonders why on earth it was done this way.
3. **A real trade-off.** There were genuine alternatives, and one was chosen
   for reasons that can be stated.

Doing the obvious thing is not a decision. Neither is anything undoable in an
afternoon. Two of the three is a commit message.

## The spirit

Six records, and the same few instincts under all of them.

**The log outlives the app.** Storage is files in a folder the user can open
without us (0001), which is also why there is no server, no notification and
nothing installed. The data has to be reachable when this code is gone.

**One shape, narrowed — never five shapes.** Every module records the same
entry and differs only in `payload` (0002). A module is a value in a field, not
a schema, which is what lets the edit screen and the sync pass be written once
instead of five times.

**Defaults are seeds, never truth.** Every number, list and threshold is
editable data copied into the user's Drive on first run and never written over
(0003). A constant in `src/` is a defect, and nothing in a seeded library is
protected from being renamed or deleted.

**An entry says what was true when it happened.** Libraries are mutable and
nothing in them is safe, so whatever an entry will need later is stamped onto
it at save time rather than looked up afterwards (0002, 0004, 0006). This is
what stops a rename from rewriting history, and it is why one field is kept
that nothing currently reads.

**Delete a feature rather than keep it behind a setting.** Objectives were cut
whole rather than hidden (0006), and the reversal is recorded so that the next
reader does not quietly rebuild them.

## The records

| ADR | what it settles |
| :- | :- |
| [0001](adr/0001-storage-in-the-users-own-drive.md) | the store is a visible `daily/` folder in the user's Drive, and every read comes from a local mirror |
| [0002](adr/0002-one-entry-shape-for-every-module.md) | one entry object for all five modules, and a delete is a tombstone rather than a removed line |
| [0003](adr/0003-every-number-is-seeded-data.md) | numbers live in `src/seed/*.json` and reach the app through the store, never as source constants |
| [0004](adr/0004-profiles-share-the-catalog-and-own-their-records.md) | profiles share the libraries and own their records, told apart by a filename prefix rather than a folder |
| [0005](adr/0005-a-merge-into-master-is-the-deploy.md) | a push to master builds, checks and ships, because a merged pull request used to look finished without being live |
| [0006](adr/0006-objectives-are-cut-and-body-parts-survive.md) | objectives are removed, and the body-part snapshot they were the only reader of is kept regardless |

## The decision log

Each decision is written once, in the document that owns it. This log only says
which document — where a line here and the document disagree, the document is
right and the line is stale.

### 2026-08-06 · the workout batch

| decided | written in |
| :- | :- |
| an exercise's name is editable where it is logged and on the library screen, and a rename reaches every past workout | [§8.1](DESIGN.md#81-workout) |
| a one-off parameter — how high the feet were on a push-up — is a comment, never a new field | [§8.1](DESIGN.md#81-workout) |
| an exercise can be taken out of a workout, and a workout left with none still saves | [§8.1](DESIGN.md#81-workout) |
| the kind and the body-part controls are one size | [§8.1](DESIGN.md#81-workout) |
| the exercise list is ordered by neglect, with one exercise per body part promoted above it | [§8.1](DESIGN.md#81-workout) |
| the exercise library gets a screen of its own, beside the inline path, which stays | [§7](DESIGN.md#7-the-data-model) |
| deleting a library item is refused while a logged entry still references it | [§7](DESIGN.md#7-the-data-model) |
| objectives are cut whole, and the body-part snapshot nothing reads is kept anyway | [ADR 0006](adr/0006-objectives-are-cut-and-body-parts-survive.md) |
| a profile is created on the profiles screen and nowhere else | [§2](DESIGN.md#2-who-it-is-for) |
| item pictures are compressed; body photographs are kept at the size they were shot | [§10.2](DESIGN.md#102-images), [§12 R4](DESIGN.md#12-open-risks) |
| an item's picture is shown 1:1, cropped for display and never on import | [§10.2](DESIGN.md#102-images) |
| the export is one self-contained HTML file, serving a trainer and an LLM alike | [§10.3](DESIGN.md#103-export) |

**Built on 2026-08-07.** Every row above landed on
`claude/workout-module-refinements-8c24c8` except the HTML export —
`DESIGN.md` §13's last step and the one row here that is not a workout-module
refinement — which landed the same day on its own branch,
`claude/downloadable-html-report-12182c`. `CONTEXT.md` gained **Report** with
it.

`DESIGN.md` says what the app does; `RULES.md` and `CONTEXT.md` say what is true
now, so their edits were written when the code landed rather than when the
decision was taken. That is now done: `RULES.md` carries *Reversals* rows for
the objectives cut and for the photo policy, `DESIGN.md` §9 is retired in place
(keeping its number, because the sections after it are cited by number) and §12
R3 says plainly that cutting objectives made that risk worse rather than
answering it, `COACH.md` has lost the `target.` / `done.` / `gap.` family along
with the one worked line that read it, and `CONTEXT.md` has lost the
**Objective** entry and gained a *Retired* row for the vocabulary that went with
it. **Staleness** there also gained the sentence it was missing: since
2026-08-06 it is what orders the exercise list.

### 2026-08-07 · the starred profile

| decided | written in |
| :- | :- |
| the registry names a starred profile, and a browser that has never been switched opens on it rather than on the original | [§2](DESIGN.md#2-who-it-is-for), [ADR 0004](adr/0004-profiles-share-the-catalog-and-own-their-records.md) |
| the star is shared data; which profile a device is on after it has switched stays the device's own | [ADR 0004](adr/0004-profiles-share-the-catalog-and-own-their-records.md) |
| starring also switches the device that set it, so the star is never a control that appears to do nothing | [ADR 0004](adr/0004-profiles-share-the-catalog-and-own-their-records.md) |

Built on the day it was decided. `DESIGN.md` §2 and the **Profile** entry in
`CONTEXT.md` carry the behaviour; ADR 0004 gains the paragraph rather than a
record of its own, since starring is a fallback the existing decision left to a
source constant and reversing it is an afternoon.

### 2026-08-08 · the food library

| decided | written in |
| :- | :- |
| fat is the third number a food carries, beside calories and protein, and stays optional | [§8.2](DESIGN.md#82-nutrition), *Reversals* in [RULES.md](RULES.md#reversals) |
| carbohydrate and fibre stay cut | [§8.2](DESIGN.md#82-nutrition) |
| the food library gets a screen of its own, opened from the nutrition list, beside the inline path which stays | [§7](DESIGN.md#7-the-data-model) |
| every field of a food is editable from either end — the library screen and the meal being logged — and every correction reaches every meal that ever held it | [§8.2](DESIGN.md#82-nutrition) |
| the numbers and the level prose are one block, folded away behind the line that shows them, so the fast path is unchanged and a just-made food still has somewhere to type | [§8.2](DESIGN.md#82-nutrition) |
| deleting a food is refused while a logged meal still holds it, the way deleting an exercise already was | [§7](DESIGN.md#7-the-data-model) |

No ADR. Every row is undoable in an afternoon — the reversal is one optional
field and one screen — which is the first of the three tests an ADR has to pass.

Built on the day it was decided, on `claude/food-editing-nutrients-e7aae8`. The
seeded library gained fat figures for the foods that already carried numbers;
a browser holding its own `library/foods.json` keeps what it has, since a seed
is written only when the file is absent, and the new screen is where those
foods get their third number.

### 2026-08-08 · the level matrix

| decided | written in |
| :- | :- |
| a food's numbers are three levels by three macros, and every one of the nine cells is optional | [§8.2](DESIGN.md#82-nutrition), *Reversals* in [RULES.md](RULES.md#reversals) |
| a cell nobody typed is still the base row times the global multiplier, so a library nobody fills in behaves exactly as it did | [§8.2](DESIGN.md#82-nutrition) |
| the base row is the level the scale multiplies by 1, never the word *normal* written into source | [§8.2](DESIGN.md#82-nutrition) |
| a derived cell shows the number it would be given, greyed, in the box that overrides it — the app shows its working and stores nothing it was not told | [§8.2](DESIGN.md#82-nutrition) |

No ADR, for the reason the batch above gives: the reversal is one optional field
on the food and one grid in place of one row, which is an afternoon. It is
recorded as a reversal because *levels are multipliers* was argued for
explicitly, and the argument it was made from — a library that is a data-entry
project does not get maintained — is still the reason the multiplier is what
fills a blank cell rather than being deleted.

Built on the day it was decided, on `claude/optional-nutrition-per-level-76l5bz`.
The seeded library fills the matrix for two foods and no more: salad, whose
loaded plate is tahini and avocado rather than more salad, and schnitzel, which
is §8.2's own worked argument for recording fat. A browser holding its own
`library/foods.json` keeps what it has and gains nine boxes to fill or ignore.

### 2026-08-08 · a food carries no numbers

| decided | written in |
| :- | :- |
| a food item is four fields and no fifth — name, unit, the level it opens at, and one free-text note | [§8.2](DESIGN.md#82-nutrition), *Reversals* in [RULES.md](RULES.md#reversals) |
| calories, protein and fat are cut, and the matrix and its multipliers with them | [§8.2](DESIGN.md#82-nutrition), *Reversals* in [RULES.md](RULES.md#reversals) |
| the per-level `examples` block becomes one note on the food, and the level control loses its prose in every module | [§8.2](DESIGN.md#82-nutrition), *Reversals* in [RULES.md](RULES.md#reversals) |
| a note is a library item's own free text and a comment is one occurrence's; the food screen shows both, one above the other | [CONTEXT.md](CONTEXT.md) |
| the export prints a food's unit, its opening level and its note, and no numbers column in the meals | [§10.3](DESIGN.md#103-export) |

No ADR, and the bar is worth stating because this is the third decision about
the same field in a week. It is not hard to reverse — the numbers are one
optional field group and one component — and there was no trade-off left to
weigh once the user said the numbers were not wanted. What it costs is stated
in §8.2 rather than hidden: the app can no longer say how much protein a day
held, and nothing in it ever will unless the field comes back.

Both rows it reverses were decided the same day and are left in the log above
rather than deleted. The reversal is not that the earlier reasoning was wrong
about maintenance cost — it was right, and it is the reason given here — but
that the answer to a library nobody will maintain is not a cleverer way to
fill it in.

Built on the day it was decided, on `claude/food-item-parameters-09ae11`. The
seeded library keeps a note on the five foods whose levels the old `examples`
described and is otherwise four fields per food. A browser holding its own
`library/foods.json` keeps every number it has written there, unread: the app
never migrates the store, and nothing looks at those keys any more.

### 2026-08-09 · remember me

| decided | written in |
| :- | :- |
| the access token is written to `localStorage` beside the moment it expires, so a reload inside its hour opens an app that is already signed in | [§10](DESIGN.md#10-platform), *Reversals* in [RULES.md](RULES.md#reversals) |
| the account's opaque `sub` is kept past the token's death and handed back as `login_hint`, so the once-an-hour press opens no account chooser | [§10](DESIGN.md#10-platform) |
| the sign-in gate stays — the app is still not enterable without a token, and offline entry is bounded by the token's hour rather than opened up | [§10](DESIGN.md#10-platform), [OPEN.md](OPEN.md) |

No ADR, and the bar is worth stating because this reverses a security posture
rather than a feature. It fails the first of the three tests: reverting is
deleting two functions and restoring one branch in `main.tsx`, which is an
afternoon. It passes the other two easily — a future reader finding a Drive
token in `localStorage` will want to know who thought that was acceptable, and
there were four genuine alternatives.

All four are dead, which is the part worth recording, because each looks
plausible until it is tried. A GIS token client has no silent mode —
`requestAccessToken` has one code path and it opens a popup, `ux_mode` is
ignored for tokens, and a popup outside a user gesture is blocked. The
hand-rolled redirect flow returns its token in the URL fragment, which is
where this app's router lives, and the two cannot share it. The hidden-iframe
flow is refused outright by `X-Frame-Options: DENY` on Google's auth endpoint,
and was never Google-applicable advice to begin with. A refresh token — the
only thing that would buy more than an hour — requires a client secret on
Google's token grant even under PKCE, and a static page cannot hold one
without publishing it to anyone who opens the source.

So the hour is the ceiling for any browser-only Google integration, and the
honest shape of the decision is: one press per hour of active use instead of
one per page load, and an app that works with no signal at all for the length
of that hour, because the token is read from disk rather than from Google.

**The gate came out and went back in the same day**, which is recorded because
the reasoning is the useful part. Opening the app on the mirror regardless of a
token looks free — the mirror is already what every screen reads, and the log is
already in `localStorage` in the clear, so the door curtains nothing. It is not
free. Every writer is a read-modify-write over the mirror with the seed as its
fallback, `push` runs before `pull` and uploads whole files, and `pull` skips
dirty paths — so an entry logged on a browser whose mirror has never been
filled puts a one-line month file over the month Drive holds, and the pull that
follows skips it. The gate is what keeps that unreachable: nothing can be typed
until a token exists, and a token means a pass has run. Removing it needs a
merge in `sync.ts` first, and a merge for the library and config JSON is a
decision nobody has taken. `OPEN.md` carries both halves.

What it costs is stated rather than hidden. A live Drive key sits on disk for
up to an hour. It cannot be renewed, `drive.file` reaches only files the app
itself wrote, and every entry is already in the same `localStorage` in the
clear — so what the key adds over the status quo is the body photographs,
which are deliberately never mirrored, and write access. `DESIGN.md` §10.1
says the realistic risk here is losing years of history, not an attacker, and
the exposure this genuinely adds is a stolen or forensically-imaged browser
profile. The owner was asked and took the trade.

Built on the day it was decided, on `claude/remember-me-login-3dce71`. A
browser that has signed in before gains nothing until its next press, since
there is no token on disk to restore until one is written.

### 2026-08-09 · the gate moves to the mirror, and the door gains a choice

| decided | written in |
| :- | :- |
| the gate is on the mirror, not the token: a browser that has squared itself against Drive at least once opens on the log with or without one, and a browser that has never synced is still kept out | [§10](DESIGN.md#10-platform), *Reversals* in [RULES.md](RULES.md#reversals), [OPEN.md](OPEN.md) |
| a checkbox on the door decides whether the token is kept, ticked unless a press turned it off — unticked, neither the token nor the `sub` reaches the disk | [§10](DESIGN.md#10-platform) |
| the band carries a sign-out, which drops the token, the name and the `sub`, puts the door back and revokes nothing at Google | [§10](DESIGN.md#10-platform) |

Written the morning after the token went to disk, because that change did not
do what it was for. It bought an hour, and an app opened once or twice a day is
past the hour every single time — so for its owner the shipped feature was
indistinguishable from not shipping it. The hour is Google's and cannot be
argued with. What could be argued with was the assumption that a token is what
holds the app open.

No ADR, on the same reasoning as the entry above: reverting is one boolean in
`enterable`. It reverses a rule rather than a feature, so the *Reversals* table
carries it and `main.tsx` argues it at the gate itself.

**The hazard is unchanged and is now named directly.** *A push can put a thin
mirror over a full Drive* is a defect of a mirror that has never been filled —
the token was only ever a proxy for one having been. `filled` in `sync.ts` asks
`daily:pulled`, which `pull` writes from the listing and `push` writes from the
upload's own `modifiedTime`, so it is non-empty exactly when the mirror has been
squared against the remote at least once. A Drive with nothing in it yet answers
no until the seeds land, which is a pass and a push away and always inside the
hour the first token bought. The conservative direction: a browser that has not
proved it holds the log does not get to open on it.

**What it does widen is the conflict policy's window**, which is the honest cost
and is last-writer-wins either way. Entries can now be logged for days without a
token and go up whole on the next pass, over whatever another browser wrote to
the same month meanwhile. One person, usually one browser; the merge in
`OPEN.md` is what would end it.

**Three alternatives, and the one that was live.** Keeping the door and making
the press cheaper does nothing — the press was already one click with no chooser
and it is the *interruption* that costs, not the clicks. Widening the token is
not available: the four ways were tried the night before and are dead. A server
holding the client secret and exchanging a code for a refresh token would
genuinely lift the hour, and is the alternative that was rejected rather than
refuted — it contradicts the no-server line in §10, needs a billing plan, and
swaps a credential that expires by itself for one that does not. The owner was
offered it and chose the mirror.

**Why the sign-out arrives with this and not with the token.** Yesterday
closing the tab was the sign-out. It stopped being one when the token went to
disk, and stops being one twice over now that the app opens without a token at
all — a button that only dropped the token would leave the log on screen and
look broken, so `daily:signed-out` outranks the mirror at the gate. It is the
one of the three states a person chooses, which is also why the checkbox lives
on the door beside it: after the first sign-in a browser never sees that screen
again unless sign-out is pressed, and pressing it is exactly when somebody wants
to change their mind about being remembered.

# daily — design document

Status: rewritten 2026-08-01, replacing the design agreed 2026-07-30/31. The old
version made the coach the app's face and recording something you reached onward
to. This one inverts that: **daily is a place to record what you did, read by a
coach that speaks only when it has something worth saying.**

§3 lists what changed, so the reversals are deliberate and are not re-argued by
accident. The utterance layer is specified in `COACH.md`. Vocabulary is fixed in
`CONTEXT.md`.

Where it says *seed default*, the value lives in editable data and is expected to
be wrong at first.

## 1. What daily is

**A log you actually keep, read by something that has read it.**

Two halves, in this order of importance:

1. **Recording.** Four modules — workout, nutrition, movement, dance — plus the
   body. Fast, forgiving, timestamped, editable after the fact.
2. **The coach.** On open, the app looks at the data and the clock. If it has
   something specific worth saying, asking, or reminding, it says it. Otherwise
   it says nothing.

The app is opened because there is something to record. That is the load-bearing
assumption and it is the user's own: *trust me to open the app regularly and feed
it data.* The coach earns its place on top of that, never in front of it.

## 2. Who it is for

One person. Age 36, 181 cm, ~74 kg. Formerly athletic with little effort; still
slim, no longer conditioned. Out of breath on stairs. Low daily movement. Works
in tech at a desk, lives near the office, dances semi-seriously about twice a
week, has gym access.

Goal: **body recomposition** — rebuild strength, muscle and conditioning, and
make food consistent, at roughly stable weight. Not aggressive fat loss. Not a
bulk.

Not a product. No onboarding for strangers, no account system beyond the
owner's own Google sign-in. Since 2026-08-06 that one account can hold more
than one **profile** — the same libraries and configuration, separate records
(ADR 0004) — and that is as far toward a second user as this goes. Switching and
creating both live on the profiles screen and nowhere else. Home names whose log
it is showing and offers the single link there; making a second person is not a
thing the front page of a logging app should suggest.

One profile in the registry is **starred**: what a browser opens on before it
has been switched, so a new phone or a cleared cache lands on the log actually
being kept rather than on whichever profile happens to be the original. The star
is shared like the registry holding it, and a device that has switched since
stays where it was put (ADR 0004).

## 3. What changed, and why

| the previous design | now |
| :- | :- |
| One entry screen — every open lands on the coach | Home is the four modules. The coach sits above them, and only when it has something |
| Libraries grow by use, never pre-seeded | Libraries ship with defaults you add to |
| No grams, ever — portion expressed only as a level | Amount is in the food's own unit; grams where grams are natural |
| Escalation: stored rungs, qualifying actions, standing lines | A longer gap is a narrower condition, so it gets a sharper line. No rung state machine |
| Month plan, week plan, weekly planning conversation | Objectives replaced them on 2026-08-01 and were themselves cut on 2026-08-06 (§9, ADR 0006). Nothing is compared against a number |
| Fitness battery as its own domain | A workout whose exercises do not change. Not built now |
| Staleness rotation composes each session | Something the coach may remark on. Nothing composes sessions |
| Meals as a unit — breakfast, lunch, dinner | Gone 2026-08-01; the *meal* returned 2026-08-06 as an untyped container (§8.2). Breakfast, lunch and dinner stay gone |

The reason for all of it: the previous design spent its complexity budget on the
coach and left the recording surface — the thing used every day — underspecified.
The scarce resource is still interest, but interest is spent at the point of
logging, not at the point of being spoken to.

## 4. Principles

1. **Recording is the product.** Every decision is resolved in favour of fewer
   taps to log the thing.
2. **The coach is conditional.** Silence is the default and is never a failure.
3. **Deterministic and inspectable.** Rules, not a model. It is always possible
   to see why the app said something.
4. **Nothing is welded shut.** Every number, threshold, scale, list and default
   is editable data.
5. **Honesty over flattery.** The app may say it does not know. It may never
   assert something it did not observe.
6. **One data primitive**, reused across every module.
7. **`Previous` everywhere.** Whatever is being logged, what happened last time
   is visible at the point of logging.

## 5. Non-goals

- **No streaks, points, badges, or gamification.**
- **No motivational prose.** No wellness language, no encouragement copy.
- **No notifications.** Not push, not email, not any channel. Ever.
- **No installed applications**, on any device.
- **No server holding user data.**
- **No meal taxonomy.** Nothing in the app knows what breakfast is.
- **No live session runner as a separate mode.** Logging as you go and logging
  afterwards are the same screen (§7.2).

## 6. The shape of the app

**Home is the way in.** Four modules and the body, reachable in one tap, plus the
most recent entries so it is obvious the thing is recording.

**The coach sits above them.** On open, the app computes what it knows and asks
whether any authored line is both eligible and worth the space. Usually the
answer is no, and home is just home. When the answer is yes, up to three lines
(seed default) appear above the modules: observations, questions, or a route into
a module with the entry half-filled.

Answer all, some, or none. Nothing is recorded as a miss. Answering a question
removes it and nothing is promoted to replace it — the stack shrinks. Full
mechanism in `COACH.md`.

**Progress lives inside each module**, not on home. A graph of chest press over
eight months is looked at deliberately; it is not pushed at you on open.

**A module opens on what it has already recorded** (2026-08-06). The list of
past workouts, meals, movement entries or dance sessions, with `+ new` above
it. Pressing `+ new` and pressing a past entry open the *same* screen, so
correcting last Tuesday and logging tonight are one thing to learn rather than
two. The entry being corrected is left out of its own `Previous`.

### 6.1 Two doors

Every data type has two paths in and neither is privileged:

- **Prompted** — the coach asks, the answer is recorded inline.
- **Spontaneous** — walk into the module and log it.

### 6.2 Time on every entry

Every entry carries a timestamp, set automatically to now and **always editable**
— at the moment of entry (logging the apple eaten an hour ago) or long after
(fixing yesterday's walk). Some entries carry a span rather than a point: a
workout has a start and an end, a movement segment has a duration, a sitting
block covers part of a day.

**Every entry, in every module, can be edited and deleted.** Not just workouts.

## 7. The data model

One primitive:

> **A library of named items, plus entries that reference an item with an amount
> and, where it applies, a level.**

| module | library item | entry records |
| :- | :- | :- |
| Workout | exercise | sets, each with the fields its kind declares, plus a next-time mark and a comment |
| Nutrition | food item | a meal — foods, each an amount in its item's unit × level (lean / normal / loaded), plus a comment |
| Movement | segment | duration × speed; or a sitting/standing block |
| Dance | — | duration × intensity |
| Body | — | weight, or a photo |

Three rules fall out:

- **Libraries ship seeded and grow by use.** A useful default list on day one,
  "add new" always available inline at the point of logging, and anything added
  is remembered. Nothing in a seed list is protected — rename it, and delete it
  while nothing references it.
- **Amounts are fractional.** `3.5 slices` is a valid entry.
- **Blanks are allowed everywhere.** An item may exist with only a name.

**A library also has a door of its own** (2026-08-06). Inline at the point of
logging stays — it is the fast path and the rule above still holds — but it was
the *only* way to reach an item, so correcting a name meant starting a workout
you did not intend to log. Exercises get a screen, opened from the workout
module's list rather than from home, where an item's name, kind, body part and
picture are edited directly — and, since 2026-08-10, the field list its sets
record (§8.1).

**Foods got the same screen on 2026-08-08**, opened from the nutrition module's
list. It carries the whole of a food — name, unit, the level it opens at, the
note that says what it is (§8.2) — and its picture, and it is for filling one in
when you are not currently eating it, which used to mean starting a meal you did
not intend to log. It is not the only door: the name, the unit and the note are
also written where the food is being logged (§8.2), because the moment a food is
invented is the moment anybody knows what it is, and sending that press to
another screen would lose the meal being built. The level it opens at is the
library screen's alone — the meal is already choosing a level a line below, and
a second level control there would read as the same field twice. Segments have
the same problem and will take the same shape when they are asked for.

**Delete is refused while history depends on it.** Deleting a library item is
unconditional only while nothing references it. Once an exercise appears in a
logged workout — or, since 2026-08-08, a food in a logged meal — the delete
names the entries that use it, as links, and offers to rename it instead.
Renaming reaches every one of them, because an entry stores the item's id and
resolves its name at read time, so the case that usually wants deleting is
answered without touching a single set. There is no bulk edit of past entries
behind this dialog and no hidden state: to actually remove the item, remove it
from those entries first, one at a time, with the numbers in front of you. The consequence is deliberate — **an item that has been
used once stays in its picker**, and the way out is through the entries, not
around them.

### 7.1 Level, and the next-time mark

**Level** says *what the thing was* — a food portion, a walking speed, a dance
intensity. A property of the thing. Every module that has one has exactly one.

**The next-time mark** says *what to do about it next time* — `more` · `same` ·
`less`. It exists on workout sets and nowhere else.

| module | level | next-time mark |
| :- | :- | :- |
| Workout | — | more · same · less |
| Nutrition | lean · normal · loaded | — |
| Movement | stroll · steady · brisk | — |
| Dance | marking · social · full-out | — |

**The mark is an instruction, not a rating.** An earlier draft of this document
had a universal *difficulty* field — how hard it felt, recorded everywhere. That
is worse, and it is worse for a specific reason: a rating has to be interpreted
before it is useful, and interpreting it is work done at exactly the wrong
moment, months later, standing at the machine. `more` needs no interpretation.
It is what `Previous` (§7.2) exists to hand back.

So a set reads `47.5 more` — the weight that was lifted, and the decision that
was made about it while the memory of lifting it was still available.

Gym v.3's one-keystroke notation is this field in its original form and survives
as the fast input for it: `+` is `more`, blank is `same`, `-` is `less`. `30--`
stays legal and means what it looks like.

Movement and dance carry no mark. Nothing is being progressively loaded on a
commute, and the app is explicitly not trying to improve the user's dancing
(§8.4). Speed and intensity are levels — what the thing was — and that is all
either module needs.

### 7.2 `Previous`

At the point of logging anything, what happened last time is visible: when, the
numbers, and the comment. This was the single feature that made Gym v.3 worth
opening, and it costs nothing to apply it everywhere — the last time this
exercise was done, the last time this food was eaten, the last time this segment
was walked.

It is not the coach speaking. It is always there, unconditional, with no
cleverness attached.

Because `Previous` and an editable timestamp are both always present, **logging
live and logging afterwards are the same screen.** There is no separate session
runner mode.

### 7.3 Storage — deferred

The on-disk representation is not decided here, and may differ per module.
Whatever is chosen must satisfy: the data outlives the app, is readable without
the app, and is not destroyed by an application bug.

## 8. The modules

### 8.1 Workout

**New workout** and **edit past workout**. A workout is a start time, an optional
end time, and an ordered list of performed exercises.

A **performed exercise** is a library exercise plus an ordered list of **sets**
plus a comment. **The number of sets is not a field** — it is how many rows were
filled. Adding a set copies the row above it, so three sets at the same weight
cost three taps rather than nine numbers.

**A performed exercise can be taken out of a workout**, and a workout left with
none is still a workout: it saves, it sits in the list saying nothing was done,
and it is deleted like any other entry if that is what was meant. Nothing in the
builder is committed until the workout is saved, so removing one is undone by
leaving the screen.

**Each exercise declares its kind**, and the kind decides which fields a set row
shows. A weight box never appears for running.

| kind | a set row records | example |
| :- | :- | :- |
| loaded | weight × reps | `42.5 × 10` |
| bodyweight | reps, optional added or assisted weight | `12`, `12 +10`, `8 −20` |
| count | a count, and nothing else | `100` |
| hold | duration, optional weight | `45 s`, `60 s +10` |
| distance | distance + duration, optional incline | `5 km / 28 min` |
| machine | duration + level, optional distance | `20 min @ 8` |

Every row also carries a next-time mark. Kinds are a starting point, and the field list
of any individual exercise is editable — an exercise that needs both distance and
weight can have both.

**The field list has a surface of its own** (2026-08-10). The moment an
exercise is made inline, the builder says it is new and offers every field the
kinds between them declare — weight, reps, a duration in seconds and one in
minutes, distance, incline, level, count, read off the kinds map rather than
written in source — as a row of toggles, with the set table live beneath them,
so defining and logging stay one screen rather than a mode. The same row sits
on the library screen (§7). A list that lands exactly on a kind's is recorded
as the kind — a copy would stop following the kind when the kind is edited —
and any other list is the exercise's own. The kind control then says *its own
fields* rather than naming a kind the rows are not drawn from, and picking a
kind from it adopts that kind's list whole. A field is for what is worth
comparing over time; the one-off parameter stays a comment, as above. A picked
list can be longer than any kind's, so the set row wraps once it outgrows the
line on a wide screen as it already did on a phone — the page clips rather than
pans, and a box past the edge would be a box that cannot be typed into.

**A field's unit is typed, not only chosen (2026-08-11).** The toggle row
offers one chip per field name, never two for the same name in different
units — `duration` in seconds and `duration` in minutes used to be separate
offers, and a set row can only ever hold one duration column regardless, so
the two were never really different fields. A name and a unit can also be
typed directly beneath the chips: changing an existing field's unit, or adding
one no kind declares at all, the same free-typed-with-suggestions shape a
food's own unit already has (§8.2). A typed name is lower-cased on the way in,
because it is the key a set row stores its number under and `reps` beside
`REPS` is two boxes for one number. That is also how a comparable one-off
parameter becomes a field — see the reversal below.

**Changing a unit restates the sets already logged, so it names them first.**
A set stores its number under the field's name and nothing else, and every
screen — the set table, `Previous`, and the report (§10.3) — resolves the unit
from the library as it draws. So a plank logged at `45 s` reads `45 min` the
moment the unit changes, and the seeded rowing machine's metres would read as
kilometres. The number is never touched; what it says is. The change is
allowed, because the alternative is a unit that is wrong for good, but it is
not quiet: it names the workouts holding those sets, as links, and goes
through only on a second press — the shape §7 already uses for a refused
delete, for the same reason. Switching a chip off and back on gives back the
unit it went out with rather than the kind's default, so a round trip is not a
silent way around the ask.

What is still open is the general case: an entry does not record the unit it
was logged under, so nothing can distinguish a set logged in seconds from one
logged in minutes after the fact. Stamping it onto the set at save time is
what `DECISIONS.md` — *an entry says what was true when it happened* — would
actually ask for, and it is the fix this ask is standing in for. `OPEN.md`
carries it.

An **exercise** in the library carries:

| field | purpose |
| :- | :- |
| `name` | the user's own name for it — `dips yellow machine` is correct |
| `body part` | the user's taxonomy: abdomen, back, chest, hands, heartrate, legs, shoulders |
| `kind` | which fields its sets record |
| `rep scheme` | a free string — `12-11-10-9`, `60-60-45-40`, `1-10`. A hint, never enforced |
| `image` | optional, resolved by naming convention with a placeholder fallback (§10.2) |
| `notes` | fixed setup detail — seat height, pin position |

**Name, kind and body part are editable where the exercise is being logged**, as
well as on the library screen (§7). The kind control and the body-part control
are the same size: they are a pair, and one of them looking larger reads as a
hierarchy that is not there. A rename from either place reaches every workout
that ever used the exercise, because an entry stores its id and resolves the
name at read time — there is no way to fork an exercise, so a movement that has
genuinely become a different one is a new exercise rather than a renamed old one.

**Comments carry forward.** A comment written on an exercise (`30°`,
`strait poll, hands at shoulders width`) appears with `Previous` next time. The
log remembers *how* to do a movement, not only how much. It is where a
one-off detail belongs — which pin is really the counterweight, a note about
the grip — rather than a new field on the exercise. A field earns its place by
being compared over time; everything else is remembered, and remembering is
what a comment is for.

**A parameter compared over time is a field, not a comment (2026-08-11,
reversing this section's own earlier example).** How high the feet were on a
push-up used to be named right here as what a comment is for, and it stopped
being true the moment a field's unit could be typed rather than only chosen:
height on a raised push-up gets pushed the same way a loaded exercise's weight
does, and it is exactly the number `Previous` exists to hand back. The bar has
not moved — is it worth comparing over time? — only which side of it this one
example sits on. The pin and the grip note stay comments; they answer no.

**Body part is not decoration.** It is what lets the coach notice that nothing
has been done for the back in three weeks, and since 2026-08-06 it is also what
orders the exercise list below. The coach is the eventual reason for the field;
the list is the present one.

**The exercise list is ordered by neglect.** The picker sorts longest-ago
first — the top of the list is what has not been done in the longest time, the
foot of it is what was done yesterday. Above that gradient one exercise per body
part is promoted: the least recent chest, the least recent legs, the least
recent back, so that the opening rows cannot all be legs and no part is offered
twice before every part has been offered once. Never performed is the longest
gap there is and sorts as one; ties fall back to the library's own order.
Filtering narrows the list without reordering it.

This has a known edge, accepted rather than overlooked: an exercise performed
once and then abandoned has the longest gap of anything in the library, and §7
refuses to delete it while that one workout references it. So it climbs to the
top and stays there. The way down is to clear it out of that workout, which is
the same deliberate path §7 describes. Nothing hides it in the meantime, because
hiding it would be the retire flag that was considered and turned down.

### 8.2 Nutrition

**What was eaten, and when, grouped into meals.** A meal is started and ended
the way a workout is — foods added one at a time, one entry holding the lot
(added 2026-08-06, reversing this section's own 2026-08-01 removal). The
container is untyped: no breakfast, no lunch, no dinner, no name at all. A
single bite is a meal of one, a long evening is a meal of six, and the two are
the same shape.

An entry is a timestamp and a list of foods, each with an amount in that food's
own unit, a level, and a comment.

**Comments carry forward here too** (2026-08-06). Free text on a food in a meal
— `the good bakery`, `left half of it`, `reheated` — and it comes back with
`Previous` the next time that food is logged, the same way a form cue does on an
exercise (§8.1). It is what a level cannot say: `loaded` records that the
portion was large, and nothing but prose records that it was large *because it
was shared off someone else's plate*. Optional, like every other field here.

A **food item** carries four things, and there is no fifth:

| field | purpose |
| :- | :- |
| `name` | pizza, coffee, cottage cheese |
| `unit` | the natural unit for *this* food — slice, cup, piece, gram, plate |
| `default level` | so a normal entry is one tap and lean/loaded is the exception |
| `note` | free text about the food itself: what it is, and what its levels mean for it. Optional |

**Every one of these is editable on the library screen** (§7), **and the three
that are not the opening level are editable in the meal being logged as well** —
and a correction from either place reaches every meal that ever held the food,
the unit and the note as much as the name, because all of them belong to the
food and none is stored on the entry.

Where the food is being logged, those three are the head of the screen: the
name, the unit beside it, the note under both. What sits below is the entry's
own — the amount, the level, the comment — and that split is the whole grammar
of the screen. A food made mid-meal opens with the blank unit config gives it
and an empty note, which is the moment both are actually known. The opening
level stays out of it: the entry is choosing a level a line further down, and
two level controls on one screen read as one field drawn twice.

**Drinks are food items.** Coffee, beer, juice. "What I ate" silently excludes a
real part of an office day, so the module does not use that framing.

**A food carries no numbers** (2026-08-08, reversing this section's own matrix,
the multipliers that filled it, and calories, protein and fat with them — all of
which this section argued for inside the same week). Nothing in the app records
kcal, protein or fat. What a portion was is read off three things: what the food
is, the level it was logged at, and the sentence written on the food.

The case for the numbers was that protein is the figure recomposition turns on.
The case against is what the numbers turned into. Nine optional cells per food is
a data-entry project by another name, and a library that is a project does not
get maintained — which is the argument this section itself used to justify the
multiplier. And the multiplier is worse than the gap it filled: eight cells
derived from one is arithmetic wearing the clothes of a measurement, in an app
whose fifth principle is that it never asserts something it did not observe.
Remove the guesswork and what is left standing is the level and the prose, which
were the parts that were true to begin with.

So the numbers are not folded away or made more optional. They are gone, and the
note is where what they were reaching for now lives: *lean is baked with a thin
crumb; loaded is thick and deep fried* says what `fat: 6` against `fat: 30` was
trying to say, and says it in the form the reader of the export (§10.3) can
actually use. Carbohydrate and fibre stay cut, and now so does everything that
was beside them.

**The note is prose, and per food.** One field rather than the three-line
`examples` block it replaces, for the same reason the numbers went: three boxes
per food is a form, and one is a sentence. Written for the foods where the
levels are genuinely confusing — five of them in the seeded library — and blank
on everything else.

The worked example, in the user's own case:

| food | note |
| :- | :- |
| pizza | lean is thin crust with vegetables; loaded is thick crust, meat and extra cheese |
| salad | what makes it loaded is the tahini and the avocado, not more salad |

**Nothing is required.** An entry with a name, a time and nothing else is a valid
entry and is worth more than an entry that was never made — and so is a food that
is a name and a unit. The note is on offer; it is not a question the food has to
answer.

### 8.3 Movement

Two entry types, because they are genuinely different data.

**A segment** is an event: a walk, a commute leg, a flight of stairs. It records
a segment from the library (or an ad-hoc one), a duration, a speed level and a
difficulty. A **segment** in the library carries a name (`to work`,
`from work`), a distance and a gradient (flat / rising / descending / mixed).

Stairs count. Sprint work does not — that is a workout, and the line is intent,
rather than intensity.

**A posture block** is a proportion: a date, a span, and roughly how much of it
was spent sitting versus standing. It is a summary, not an event, and is entered
as such — `8h workday, ~6 sitting` is one entry, not fourteen.

This is the programmer-specific module absent from every fitness app, and it
covers the eight hours where the drift actually happens.

### 8.4 Dance

Duration × intensity. Three levels, in dance's own vocabulary:

| level | what it is |
| :- | :- |
| marking | going through it at low energy |
| social | a normal night out dancing |
| full-out | performance intensity |

Not light/medium/hard, for the same reason exercises are called
`dips yellow machine` — the app uses the user's vocabulary, not a fitness app's.

**No progression tracking.** The app is not trying to improve the user's dancing.
Dance occupies the day and counts as load; that is all it is for.

### 8.5 Body

The smallest module, and non-optional. This is a body-recomposition app, so a
data set with no measurement of the body cannot answer whether any of the rest
worked.

- **Weight.** A number and a timestamp. Context, not a verdict; if recomposition
  works the number barely moves.
- **Photo.** Same spot, same light, same pose, roughly monthly.

That is the whole module. Tape measurements were considered and declined.
Strength progression is the third signal and it is already free — it is the
workout log.

## 9. Objectives — removed

Objectives were a short editable list of targets, and the coach's only reference
point that was not arithmetic on its own log. They were **cut whole on
2026-08-06** — the user does not write them and does not want anything compared
against a number, which left a module whose entire purpose was the comparison.
[ADR 0006](adr/0006-objectives-are-cut-and-body-parts-survive.md) records what
went, what was kept anyway, and what the cut costs.

What remains is gap arithmetic — how long since a thing last happened — which is
enough for a coach that is absent on most opens.

The section keeps its number rather than being deleted: §10.2, §12 R4 and the
sections after them are cited by number from the ADRs, from `OPEN.md` and from
several source comments, and renumbering would quietly break all of them.

## 10. Platform

**Laptop-first, phone browser as an equal surface, same URL, nothing installed.**

- **Static files only** — HTML, CSS, JS on a host. No server-side code of ours.
- **Google sign-in.** OAuth hands a short-lived, narrowly-scoped token to the
  browser, and since 2026-08-09 the browser keeps it until it expires, so
  signing in is something that happens about once an hour rather than on every
  page load. No credential of ours exists to leak, and there is no refresh
  token to be had: a refresh token needs a client secret, and a page anyone can
  read the source of cannot hold one. The hour is therefore a ceiling, not a
  setting.
- **All records live in the user's own Google Drive**, written by calls from the
  browser to Google's API.
- **Offline-capable**, so a dead signal in a basement gym does not stop logging
  mid-set. Since 2026-08-09 this holds for the life of a token and no longer:
  the token is read from disk with no network touched, so inside its hour the
  app opens, reads and records with no signal at all. Past the hour the door
  needs Google and there is no way in. Closing that last gap is not a screen
  change — see `OPEN.md`.

### 10.1 The threat model, stated plainly

The realistic risk is not an attacker — the data is squat weights and form notes.
It is **losing years of history because it lived somewhere only the app
understood.** Design against that.

### 10.2 Images

Exercise images are optional, resolved **by naming convention** from an ordinary
Drive folder, with a placeholder whenever a file is absent. Adding an image is a
file drop, not a feature. Resize on import, lazy load, cache for offline.

Since 2026-08-06 the logging screens also take one directly — *+ add a photo
for this exercise / food* — resized on import and filed under the same naming
convention (`photos/exercise-<id>.jpg`, `photos/food-<id>.jpg`). Food items get
the same treatment as exercises. Since 2026-08-10 the press also takes a
literal drop: a file dragged onto the picture or the press adds or replaces
it, on the item screens and the body module alike, which is this section's
first sentence honoured on the screens themselves. Like the body module's
photos these are never mirrored: the bytes are fetched from Drive when the
item is on screen, so a photo is absent offline, and the caching this section
asks for is still open.

**Item pictures are compressed; body photographs are not** (2026-08-06,
reversing this section's own *resize on import* for the body alone). An exercise
or food picture is a reminder of which machine or which plate — it is never
studied — so it is capped at a small edge and a modest quality. A body
photograph is the thing being measured, so it is kept at the resolution it was
shot at. Both are still re-encoded to JPEG on the way in rather than stored as
the camera wrote them: the stored name ends `.jpg`, and a phone shooting HEIC
would otherwise put a file in Drive that the app cannot display.

**An item's picture is shown square.** Exercise and food pictures display 1:1
whatever shape they were shot in, cropped to fill the frame rather than
letterboxed into it — a row of items reads as a row when every picture is the
same shape, and a portrait phone shot next to a landscape one reads as neither.
The crop is display only. **What is stored keeps the aspect it was taken at**,
because import is the one moment the discarded pixels cannot be got back, and
a square is a decision about a frame rather than about the photograph. The body
module's photos are not square: a body shot is the whole body.

Photographs will eventually beat any stock set here, because the exercise names
are specific to one gym: an illustration of a generic cable machine says nothing
about *the yellow one*. That is a later call, not a build dependency.

### 10.3 Export

One report, one file: a **self-contained HTML document**, downloaded from home's
footer, holding everything the active profile has recorded. Two readers share
it, which is why it has the shape it has. A trainer is sent the file and opens
it. An LLM is handed the text copied out of it when a second opinion is wanted,
which keeps the qualitative layer available on demand without letting a model
inside the walls. Prose and tables, never a database dump — the copied-out text
has to read as a document, so the document is what gets built.

**What is in it.** Every entry of every module, set by set and food by food,
with the comments and the next-time marks kept: those are the half worth
having, and a report that dropped them would be numbers with the reasoning
taken out. Pictures of exercises and of foods are embedded, each one once
however often its item recurs. Body photographs go in too, at the resolution
they were shot at (§10.2), with the weights beside them. One profile per report
— entries belong to whoever recorded them (ADR 0004).

**It states, it does not judge.** No scores, no totals dressed as a verdict, no
commentary of any kind. *No LLM in the app* and the coach's rule that it
observes rather than explains land in the same place here: the report says what
happened and stops, because interpreting it is the reader's job and the reader
is the point.

**It needs a signal.** Photos are never mirrored (§10.2), so the pictures are
fetched from Drive as the report is built. Offline it still builds, and it names
the pictures it could not reach rather than refusing to produce anything.

**Its size has a horizon**, accepted rather than missed. Full-resolution body
photographs plus the third that base64 adds mean the file grows by a few
megabytes per photograph and outgrows what most mail carries within roughly half
a year of monthly shots. It remains a good download; it stops being an
attachment. No switch turns them off — `RULES.md` prefers deleting a feature to
adding a setting that disables it — so when the file outgrows mail the answer is
a link to it in Drive, not a toggle.

## 11. The configurability contract

Every default is a guess and every guess is the user's to overwrite. Nothing in
this list may exist as a constant in source:

- Every threshold the coach reads
- Day-zone boundaries and per-line windows
- Line weights, cooldowns and expiries; lines may be added, edited or disabled
- Portion conventions
- Level scales per module — names, order, length
- Body-part taxonomy; the exercise, food and segment libraries
- Exercise kinds and per-exercise field lists
- Rep schemes
- The provocation pool

## 12. Open risks

**R1 — Logging friction.** The whole app now rests on entries being cheap to
make. Every module must be checked against a stopwatch: an apple should cost two
taps, a full workout should not require typing a number twice. This replaces
tuning decay as the project's primary risk.

**R2 — Opening the app. CLOSED.** Settled by the user: he will open it, and not
only for the gym. Not to be re-argued.

**R3 — Coach thinness. Worse, not gone.** With planning gone, the coach had less
to reason from, and objectives (§9) were the mitigation. They were cut on
2026-08-06 (ADR 0006), so the mitigation went with them: the coach now reasons
from the log and the clock alone, and gap arithmetic is the whole of what it can
say. That is a thinner corpus than `COACH.md` was written against, and it is the
accepted cost of the cut rather than an oversight. The failure mode is unchanged
— an app with nothing specific to say says nothing — but it is now the ordinary
case rather than the empty-objectives one.

**R4 — Asset weight.** Images are the only part of this app with real size.
Needs resize-on-import and lazy loading from the start. Since 2026-08-06 the
resize covers item pictures only: body photographs are kept at full size
(§10.2), which spends this mitigation on the one thing in the app whose detail
is the whole point. It is also what gives the export (§10.3) its size horizon,
so the risk did not go away — it moved.

## 13. Build sequence

1. **Foundation** — the entry primitive, library items, timestamps, edit and
   delete, Drive storage, Google sign-in, offline shell.
2. **Workout module** — exercise library with seeds, kinds and per-kind set
   rows, `Previous`, `+`/`-`, carried-forward comments.
3. **Nutrition module** — food library with seeds, units, levels.
4. **Movement and dance** — segments, posture blocks, sessions.
5. **Body** — weight and photos.
6. **The coach** — facts, lines as data, the cascade, the floor (`COACH.md`).
7. **Progress views** inside each module.
8. **Export.**

Steps 1–5 are a complete and useful app on their own. That is intentional: the
coach is the last thing built, because it is the only thing that cannot be built
before there is data to read.

## 14. Deferred decisions

| item | owner |
| :- | :- |
| Storage format — text / CSV / JSON, possibly mixed per module | implementation, once data requirements are firm |
| Polarity of the `+` / `-` marker (§7.1) | user — one question |
| Seed contents of the exercise, food and segment libraries | implementation drafts, user corrects |
| Seed notes on the foods whose levels need one | implementation drafts, user corrects |
| Host choice and the one-time OAuth setup | implementation |
| The provocation pool's contents | user |
| Whether sleep becomes a sixth thing | user — deliberately left out for now |
| Language of the line corpus (assumed English) | user |

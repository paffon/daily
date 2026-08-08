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
picture are edited directly. Foods and segments have the same problem and will
take the same shape when they are asked for.

**Delete is refused while history depends on it.** Deleting a library item is
unconditional only while nothing references it. Once an exercise appears in a
logged workout, the delete names the workouts that use it — as links — and
offers to rename it instead. Renaming reaches every one of them, because an
entry stores the item's id and resolves its name at read time, so the case that
usually wants deleting is answered without touching a single set. There is no
bulk edit of past workouts behind this dialog and no hidden state: to actually
remove the item, remove it from those workouts first, one at a time, with the
numbers in front of you. The consequence is deliberate — **an item that has been
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
log remembers *how* to do a movement, not only how much. It is also where a
one-off parameter belongs — how high the feet were on a push-up, which pin is
really the counterweight — rather than a new field on the exercise. A field
earns its place by being compared over time; everything else is remembered, and
remembering is what a comment is for.

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

A **food item** carries:

| field | purpose |
| :- | :- |
| `name` | pizza, coffee, cottage cheese |
| `unit` | the natural unit for *this* food — slice, cup, piece, gram, plate |
| `default level` | so a normal entry is one tap and lean/loaded is the exception |
| `kcal`, `protein`, `fat` | for the **normal** case, at one unit. All optional, each unknown on its own |
| `examples` | what lean, normal and loaded look like for this food. Optional |

**Drinks are food items.** Coffee, beer, juice. "What I ate" silently excludes a
real part of an office day, so the module does not use that framing.

**Levels are multipliers, examples are prose.** The nutritional effect of a level
is a global editable multiplier (seed defaults: lean 0.7×, loaded 1.4×), applied
to the item's normal-case numbers. Only the **examples** are per-item, and they
are optional — written once for foods where the distinction is genuinely
confusing, blank everywhere else.

This is deliberate. Authoring three sets of numbers for every food turns the
library into a data-entry project, and a food library that is a project does not
get maintained.

The worked example, in the user's own case:

| level | pizza |
| :- | :- |
| lean | thin crust, light cheese, vegetable toppings |
| normal | plain cheese and tomato, standard slice |
| loaded | thick crust, meat, extra cheese |

**Which numbers.** Calories, protein and fat. For recomposition, protein is the
number that matters more than calories; fat joined the two on 2026-08-08,
reversing this section's own *calories and protein, and nothing else*.

The argument it reverses was that a field costs a decision per food. That is
true, and it is answered by the field being optional rather than by the field
not existing: most of the library carries no fat figure, exactly as most of it
carries no protein figure, and a food that answers only *kcal* says only that
where it is logged. What changed the balance is that fat is the one macro a
portion can be doubled by without the plate looking any different — the same
schnitzel fried or baked — and that is a thing prose in `examples` describes
and no number recorded it. Carbohydrate and fibre stay cut, for the reason this
paragraph used to give for all three: noise at this level of measurement
precision.

**Nothing is required.** An entry with a name, a time and no numbers at all is a
valid entry and is worth more than an entry that was never made.

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
  browser. No credential of ours exists to leak.
- **All records live in the user's own Google Drive**, written by calls from the
  browser to Google's API.
- **Offline-capable**, so a dead signal in a basement gym does not stop logging
  mid-set.

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
the same treatment as exercises. Like the body module's photos these are never
mirrored: the bytes are fetched from Drive when the item is on screen, so a
photo is absent offline, and the caching this section asks for is still open.

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
- Level multipliers and portion conventions
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
3. **Nutrition module** — food library with seeds, units, levels, multipliers.
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
| Level multiplier seed values | implementation, editable |
| Host choice and the one-time OAuth setup | implementation |
| The provocation pool's contents | user |
| Whether sleep becomes a sixth thing | user — deliberately left out for now |
| Language of the line corpus (assumed English) | user |

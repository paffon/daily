# daily

A single-user body-recomposition log, read by a deterministic coach that speaks
only when it has something worth saying. This file is the project's canonical
vocabulary and nothing else — the spec is `DESIGN.md`, the utterance layer is
`COACH.md`.

## The data

**Amount**:
How much of a library item an entry records, in that item's own unit. Fractional
— `3.5 slices` is valid.

**Comment**:
Free text attached to a performed exercise — usually a form cue — or, since
2026-08-06, to a food in a meal. Carried forward with *Previous* so the log
remembers how a movement was done and what a portion actually was, not only how
much of either.

**Entry**:
One logged occurrence: a timestamp plus whatever its module records. Every entry
in every module is editable and deletable, timestamp included.

**Kind** (exercise):
Which fields an exercise's set rows record — loaded, bodyweight, count, hold,
distance, machine. What stops a weight box appearing for running, or a clock
appearing for skipping rope. Per-exercise field lists override it.
_Avoid_: type, category, shape (taken — see below)

**Level**:
An ordered scale saying *what a thing was* — a food portion (lean / normal /
loaded), a movement speed (stroll / steady / brisk), a dance intensity (marking
/ social / full-out). A property of the thing. Every module that has one has
exactly one; the workout module has none.
_Avoid_: descriptor, grade, tier

**Library item**:
A named thing an entry references — an exercise, a food, a segment. Libraries
ship seeded with useful defaults and grow by use; nothing in a seed list is
protected.
_Avoid_: catalogue entry, template, preset

**Meal**:
One nutrition entry: an untyped container of the foods eaten together, started
and ended the way a workout is. Reintroduced 2026-08-06 — only the word came
back, not the breakfast / lunch / dinner taxonomy it left with; the app still
does not know what breakfast is.
_Avoid_: breakfast, lunch, dinner, eating session

**Next-time mark**:
What to do about a workout set next time — `more` / `same` / `less`. An
instruction to a future reader, not a rating of how hard it felt, and the thing
*Previous* exists to hand back. Gym v.3's `+` / blank / `-` notation is this
field in its original form and is the fast input for it. Workout sets only; no
other module has one.
_Avoid_: difficulty, effort, RPE, exertion, rating

**Performed exercise**:
One exercise inside a workout: the library exercise, an ordered list of sets, and
a comment. **The number of sets is not a field** — it is how many rows were
filled.

**Posture block**:
A movement entry recording a span and roughly how much of it was spent sitting
versus standing. A summary, not an event — which is what distinguishes it from a
*segment*.

**Previous**:
What happened last time, shown beside today's input at the point of logging: when
it was, the numbers, and the comment. Unconditional and always present, in every
module. Not the coach speaking. Inherited from Gym v.3, where it was the single
feature that made the sheet worth opening.

**Profile**:
One log among several in the same Drive (added 2026-08-06 — ADR 0004).
Profiles share the catalog — the libraries, their pictures, the app's
configuration — and own their entries and body photos. Which one a device is on
is the device's own state and never syncs.
_Avoid_: user, account (the account is Google's, and every profile lives in one)

**Report**:
The export (`DESIGN.md` §10.3): one self-contained HTML document holding
everything the active profile has recorded, downloaded from home's footer.
Sent to a trainer whole; an LLM is handed text copied out of it, which is how
a second opinion stays outside the walls. It states, it does not judge.
_Avoid_: dump, backup (the data's home is Drive; the report is a document)

**Segment**:
A named route in the movement library — `to work`, `from work` — carrying a
distance and a gradient. Also, loosely, one logged movement event.

**Set**:
One row inside a performed exercise, carrying the fields its exercise's *kind*
declares plus a *next-time mark*.

**Staleness**:
Time since a library item was last used. Since 2026-08-06 it is what orders the
exercise list — longest-ago first, one exercise per *body part* promoted above
that gradient (`DESIGN.md` §8.1) — and something the coach may remark on.
Nothing composes sessions from it: it decides what is offered first, never what
is done.

## The coach

**Away**:
A period declared as a legitimate absence, before or after the fact. Marked
permanently in the record; gap conditions skip it, *staleness* does not.
_Avoid_: pause, vacation mode, hold

**Condition**:
One predicate over the snapshot that must hold for a line to be eligible. A line
carries several; all must hold, and how many there are is what makes one line
more specific than another.
_Avoid_: trigger, criterion, rule

**Fact**:
A single derived value describing the present moment, such as days since the last
workout. Facts are computed, never stored.
_Avoid_: state, variable, signal

**Floor**:
The score a line must clear to appear at all. Set high — the test is not whether
a line is true but whether a coach who had read the file would lead with it. What
makes silence real rather than performed.

**Line**:
One authored thing the coach can say, stored as a row of data. The utterance
primitive; *remark*, *question*, *offer* and *provocation* are its subtypes.
_Avoid_: utterance, message, prompt, nudge, card

**Offer**:
A line that routes into a module rather than recording an answer, such as
starting a workout.
_Avoid_: action, CTA, shortcut

**Provocation**:
A short, hard conceptual reframe from a small user-owned pool, deployed rarely
and only at deep drift. Not encouragement.
_Avoid_: motivation, pep talk, quote

**Question**:
A line that expects an answer. Not the general term for what the coach says —
that is a *line*.

**Register break**:
The single line at extreme drift that addresses the reader directly. The only
place in the app that uses second person, and the loudest thing it can do.
_Avoid_: alert, warning, escalation message

**Remark**:
A line that states something and expects no answer.
_Avoid_: observation, note, comment (taken — see The data)

**Shape**:
A tag naming a line's sentence skeleton. No two lines in one stack may share
one, which is what stops every line reading `N days since X`.

**Snapshot**:
The complete set of facts at one moment, computed on open. Everything the coach
knows when choosing what to say — or, usually, when choosing to say nothing.

**Stack**:
The zero to three lines shown above the modules on open. Finite, cleared by
answering, and empty on most opens.
_Avoid_: feed, queue, timeline, inbox

**Topic**:
The concern a line belongs to, such as gym absence or food logging. At most one
line per topic appears in a stack, and tuning acts on topics rather than on
individual lines.
_Avoid_: category, subject, channel

**Utterance log**:
The stored record of every line shown and every answer given. What lets the coach
know what it already said.

## Time

**Day-zone**:
A named part of the day — morning, work, afternoon, evening, bedtime — defined
once and shiftable in one place.
_Avoid_: time slot, period, bucket

**Week**:
Sunday morning to Saturday evening. Every "this week" calculation follows this
boundary, not a Monday one.

## Retired

Vocabulary from the previous design, listed so it is recognised as gone rather
than reintroduced by habit.

| term | status |
| :- | :- |
| Breakfast, lunch, dinner | never existed in the data and still not in the app. *Meal* left this row on 2026-08-06, returning as an untyped container — see The data |
| Rung, ceiling, standing line, qualifying action | escalation is the specificity cascade; no stored state |
| Effort, difficulty | replaced by the *next-time mark* — an instruction, not a rating, and workout-only |
| Descriptor | renamed *level* |
| Battery, bar, protocol, test week | a workout whose exercises do not change; not built now |
| Month plan, week plan, planning conversation | replaced by *objectives*, which were themselves cut on 2026-08-06 — see the row below |
| Objective, target, done, gap | cut on 2026-08-06 (ADR 0006). Nothing is compared against a number. *Gap* survives only as arithmetic — how long since a thing last happened |
| Session runner | logging live and logging afterwards are the same screen |

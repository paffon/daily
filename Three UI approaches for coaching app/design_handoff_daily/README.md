# Handoff: daily — a body-recomposition log read by a deterministic coach

## Overview

`daily` is a single-user logging app. Five recording surfaces — **workout, nutrition,
movement, dance, body** — plus an **objectives** list, sitting under a **coach** layer that
speaks only when it has something specific worth saying, and is silent on most opens.

It is laptop-first with the phone browser as an equal surface, same URL, nothing installed.
Static files only; no server the project owns; all records live in the user's own Google
Drive. There is exactly one user.

**Read `spec/DESIGN.md` before writing any code.** This README describes the *screens*.
`spec/` describes the *product*, and where the two ever disagree, `spec/` wins.

| file | what it is |
| :- | :- |
| `spec/DESIGN.md` | the spec — data model, modules, platform, build sequence |
| `spec/COACH.md` | the utterance layer — facts, lines, the stack, drift, repetition |
| `spec/RULES.md` | the short list of rules that are easy to break by accident |
| `spec/CONTEXT.md` | canonical vocabulary. Use these words in code identifiers |
| `spec/design-brief.txt` | the brief these screens were drawn against |
| `Daily.dc.html` | the design itself (see below) |

## About the design files

`Daily.dc.html` is a **design reference created in HTML** — a prototype showing intended
look and layout. It is not production code and should not be copied into the app. Open it
in a browser and read it; then **recreate these screens in the target codebase's own
environment**, using its established patterns and libraries. If no codebase exists yet,
pick a framework appropriate to the constraints in `spec/DESIGN.md` §10 (static hosting,
offline-capable, no server-side code) and build there.

The file is a **design canvas** holding three rounds of work, newest first:

- **Turn 4 — the current design. Implement this and nothing else.** Frames `4a`–`4i`.
- Turn 3 (`3a`–`3g`) and turn 2 (`2a`–`2e`) are kept as the record of a **superseded**
  design in which the coach was the app's face. The spec reversed on 1 August 2026.
  Do not implement anything from them. Two things survived and were redrawn in turn 4:
  the coach row shape (`3a`) and the direct line (`3d`).

The top of turn 4 carries a two-column ledger of everything that was cut and everything
that carried through. Read it — it is the fastest way to understand what the app is not.

Each frame is drawn twice, at **1120×700 (laptop)** and **372×780 (phone)**. Those are
design canvases, not breakpoints: build fluid layouts that hold at both.

## Fidelity

**High fidelity.** Colours, typography, spacing, hit targets and copy are final and should
be reproduced closely. Every colour is `oklch()` — keep it in `oklch()`; the palette is
built on shared lightness/chroma relationships that get lost in hex conversion.

The one deliberate exception: the design contains **no icons and no imagery**. That is not
an omission to fill in. The app's entire visual vocabulary is type, hairlines, and one
steel accent.

---

## Design tokens

### Colour

Three families: paper (near-white neutrals at hue 255–265), ink (dark neutrals), and one
accent, steel-blue at hue 200. Nothing else. No second accent, no semantic colour scale.

| token | value | used for |
| :- | :- | :- |
| `paper` | `oklch(0.963 0.005 255)` | every screen background |
| `paper-panel` | `oklch(0.932 0.006 255)` | left rail on module screens |
| `paper-panel-sel` | `oklch(0.951 0.006 255)` | selected row in the left rail |
| `paper-quote` | `oklch(0.941 0.006 255)` | the `Previous` block |
| `paper-input` | `oklch(0.995 0.002 255)` | inside number/text inputs |
| `paper-control` | `oklch(0.99 0.003 255)` | unselected buttons |
| `ink` | `oklch(0.19 0.014 265)` | headline serif, values in inputs |
| `ink-body` | `oklch(0.23 0.014 265)` | coach line text, set values |
| `ink-quiet` | `oklch(0.26–0.30 0.014 265)` | recent-entry detail, secondary serif |
| `mono` | `oklch(0.50–0.58 0.012 260)` | mono labels, units, timestamps |
| `mono-faint` | `oklch(0.62–0.68 0.012 260)` | tuning taps, hints, disabled |
| `steel` | `oklch(0.45 0.05 200)` | primary buttons, focused input border, the dash |
| `steel-hover` | `oklch(0.38 0.055 200)` | primary button hover |
| `steel-text` | `oklch(0.42–0.44 0.05–0.06 200)` | `+ set`, `+ exercise`, next-time marks |
| `steel-weak` | `oklch(0.72 0.03 200)` | border of a secondary/optional input |
| `ink-select` | `oklch(0.35 0.012 260)` | selected segment in a level control |
| `rule` | `oklch(0.86–0.88 0.006 255)` | section rules, control borders |
| `rule-light` | `oklch(0.91–0.92 0.005 255)` | row separators inside a list |
| `frame` | `oklch(0.84 0.006 255)` | device frame border (canvas only) |
| `danger` | `oklch(0.5 0.03 25)` text, `oklch(0.82 0.03 25)` border | `delete this entry` only |

**Steel means "this is the live one".** A focused input, the primary action, the selected
next-time mark, the dash on a coach row. A level control's selection uses `ink-select`
instead, because a level is a recorded property rather than a live target — do not
unify them.

### Typography

Three families, loaded from Google Fonts:

| family | weights | role |
| :- | :- | :- |
| **Newsreader** (serif) | 200, 300, 400 + 300 italic | everything the app *says* — coach lines, screen titles, entry names, prose |
| **IBM Plex Mono** | 400, 500 | everything the app *measured* — numbers, units, timestamps, labels, controls |
| **IBM Plex Sans** | 400, 500 | library item names in lists, and the canvas chrome |

The serif/mono split is the design's core rule and it is semantic, not decorative:
**serif is language, mono is data.** A weight is mono. "Nine days since anything for the
back." is serif. Never mix within one span.

Scale, as used:

| role | size / weight / leading |
| :- | :- |
| direct line (the register break) | 50px / 200 / 1.18, `letter-spacing:-0.012em` — 36px on phone |
| module screen title | 38–42px / 200 / 1.1 |
| objectives statement of intent | 33px / 200 / 1.35 |
| coach line in the stack | 22px / 300 / 1.3 — 21px on phone |
| objective row, module tile | 23–26px / 300 / 1 |
| recent-entry detail | 18–19px / 300 / 1 |
| `Previous` comment quote | 16px / 300 italic / 1.4 |
| set values, weights, durations | 19–21px mono / 400 |
| big number in a stepper | 30–40px mono / 400, unit at 13px alongside |
| section label | 10px mono / 400, `letter-spacing:0.16em`, uppercase |
| strip / timestamp | 11px mono / 400, `letter-spacing:0.12em` |
| tuning taps | 10.5px mono / 400 |
| next-time mark in `Previous` | 16px mono / **500**, `steel-text` |

Minimum type size anywhere is 9.5px, and only for uppercase tracked labels.

### Geometry

| token | value |
| :- | :- |
| radius, controls | `2px` |
| radius, segmented controls | `0` — segments are contiguous |
| border, resting control | `1px solid rule` |
| border, focused input | `1.5px solid steel` |
| border, optional/secondary input | `1px solid steel-weak` |
| hairline between rows | `1px solid rule-light` |
| left rail width | `320–340px` |
| strip height | `56px` laptop, `52px` phone |
| screen padding | `44px` (strip), `52–96px` (content), `24px` phone |
| hit target minimum | `44px` — never smaller, on either surface |
| stepper button | `52–58 × 64–70px` |
| segmented control segment | `58–66px` tall |

Segmented controls (`lean/normal/loaded`, `stroll/steady/brisk`, `less/same/more`) are
built as contiguous buttons: the middle segment carries `border-left:none;
border-right:none` so adjacent borders do not double.

---

## Screens

Frame ids below are the anchors in `Daily.dc.html` (`#4a` etc.). Every module screen shares
one skeleton:

```
┌ strip ────────────────────────────────────┐   ← back affordance + editable timestamp
│ ┌ left rail ─┐ ┌ main ────────────────┐   │
│ │ today /    │ │ title + kind          │   │
│ │ history /  │ │ Previous              │   │
│ │ this       │ │ the fields            │   │
│ │ workout    │ │ …                     │   │
│ │            │ │ primary action        │   │
│ └────────────┘ └───────────────────────┘   │
└────────────────────────────────────────────┘
```

On phone the rail collapses below the fields as a short list, and the primary action pins
to the bottom.

### 4a — Home

The way in. **Not a dashboard.** Three states, all of which must be built:

1. **Nothing to say** — the common case. Modules band, then `recent`, then `objectives →`.
   No label announcing the silence, no filler observation, no reserved empty space where
   the coach would be. The modules start where the coach would have started.
2. **One line** — a single coach row above the modules.
3. **Three lines** — the cap. Never more, and never padded to reach it.

**Modules band.** Five entries — workout, nutrition, movement, dance, body. Laptop: one
horizontal band, five equal columns divided by 1px verticals, `rule` above and below, each
column a serif name over a mono last-touched timestamp (`wed 19:40`, `today 18:10`,
`12 july`), hover fills `oklch(0.947 0.005 255)`. Phone: five 60–62px rows, name left,
timestamp right, hairline between.

The last-touched line is the only status shown. **No counts, no progress, no "3 of 5
logged".**

**Recent.** The last 3–6 entries across all modules, newest first. Laptop columns: time
(100px mono), module name (104px mono, `mono-faint`), detail (serif 18–19px). Phone: two
lines per row, `18:10 · nutrition` over the detail. Every row opens `4h`.

**Coach row** — the shape reused everywhere the coach speaks:

- `rule` above the first row, `rule-light` between rows
- 24×2px steel dash at the left, then the line in 22px serif, flex:1
- answer controls inline on the row, right-aligned
- `not now` and `never` at the far right, 10.5px mono, `mono-faint`
- min-height 66px laptop; phone stacks the controls under the sentence with a 32px
  left indent so they align past the dash

Answer types: **remark** (no control), **question** (inline number input, or a segmented
control), **offer** (one steel button, e.g. `start a workout`).

Answering a row removes it. **Nothing is promoted to replace it and no count appears
anywhere** — the stack simply shrinks. Ignoring every row and walking into a module is a
normal exit and must not be styled as leaving something undone.

### 4b — Workout

The largest module. One screen logs live and logs after the fact; **there is no session
runner mode.** The timestamp in the strip is editable, and `Previous` is always present,
which is what makes the two cases the same screen.

**Kinds.** Each exercise declares a kind and the kind decides which fields a set row shows.
A weight box never appears for running.

| kind | set row fields |
| :- | :- |
| `loaded` | weight × reps |
| `bodyweight` | reps, optional ± load |
| `hold` | duration, optional load |
| `distance` | distance + duration, optional incline |
| `machine` | duration + level, optional distance |

`loaded` and `distance` are drawn. **`bodyweight`, `hold` and `machine` are not drawn** —
they follow the same table geometry with different column headers, but how the *optional*
second field presents (always visible vs. revealed) is an open design question; ask before
inventing an answer.

**Set table.** A header row in 10px tracked mono (`set · weight · reps · next time`), then
58px rows separated by `rule-light`. Set number in 13px mono `mono-faint`, values in 21px
mono, the next-time mark right-aligned.

**The number of sets is not a field.** `+ set` appends a row that **copies the row above
it, values included**; the user changes only what changed. Three sets at one weight cost
three taps. The affordance carries the label `copies the row above` in 11.5px
`mono-faint` — keep it; it is the entire ergonomic argument and it is not discoverable
otherwise.

**Next-time mark.** `less` / `same` / `more`, on every set row. It is an *instruction to a
future reader*, not a rating of how the set felt — do not relabel it as difficulty, effort
or RPE (`spec/CONTEXT.md` retires all three). Laptop renders words in a 3×66px segmented
control; phone renders `−` `·` `+` at 44px. Typing `30--` into the weight box is legal
input for weight-and-mark together and must keep working.

**Previous.** A `paper-quote` block with a 2px steel left border, holding the date, every
set from last time with its mark in `steel-text` at weight 500, and the carried-forward
comment in 16px serif italic. The marks are as prominent as the numbers — that is the
point of the block.

**Comment.** A single-line field at the bottom of the exercise, carried forward to the next
session with `Previous`.

**Progress** lives inside the module (`progress →` in the rail), not on home. One graph at a
time, chosen from a list that states plainly what cannot be drawn yet
(`3 sessions · not enough to draw`, `1 session`). Keep those honest empties as strings; do
not draw a two-point line to avoid an empty state.

### 4c — Nutrition

**A flat timeline of what was eaten and when. There is no meal, no breakfast, no dinner and
no session.** Six entries in a day and one entry in a day are the same shape. There is no
`done` button and no day total anywhere.

An entry is a **timestamp, a food, an amount in that food's own unit, and a level.**

- **Unit belongs to the food, not the entry** — pizza in slices, coffee in cups, chicken in
  grams. Shown beside the number in the stepper at 13px mono. Amounts are fractional.
- **Level** is `lean` / `normal` / `loaded`. Each food carries a default level so the
  common entry is one tap.
- **Level examples** are the part that needed designing. When a food has them, all three
  render as 15px serif prose in three columns aligned under the three buttons — all three
  at once, because comparing is what makes them useful. When a food has none, the prose
  simply does not exist and **the buttons are identical**. Build one component with an
  optional examples array; do not build two controls.
- **Drinks are foods.** Coffee, beer and juice live in the same library.
- **kcal and protein** are optional, authored for the *normal* case at one unit, and scaled
  by a global editable multiplier per level (seed 0.7× lean, 1.4× loaded). Shown per entry
  only — `570 kcal · 24 g protein`. Never summed across the day.
- The timestamp reads `20:05 · now 20:41` when it has been pulled back from now. Logging
  the apple from an hour ago is the normal case, not a correction.

### 4d — Movement

One module, **two entry types**, both listed in the rail with the block ruled off below the
events.

- **A segment** is an event: a named route from the library, a duration, and a speed level
  (`stroll` / `steady` / `brisk`). Library segments carry a distance and a gradient, shown
  beside the title (`2.8 km · mixed`). Editable timestamp reading e.g.
  `fri 18:20 · now sat 20:44`.
- **A posture block** is a proportion: a date, a span, and hours sitting vs. standing. One
  entry for a workday, never fourteen. A 12px three-part bar shows sitting / standing /
  remainder against the span — **the bar is the reading, so no percentage is written.**
  `same as yesterday` is the one-tap path for the days that repeat.

Speed is the only scale here. There is no second axis asking how hard the commute was.

### 4e — Dance

Duration × intensity, one screen, no steps. Intensity is `marking` / `social` / `full-out`
— dance's own words, not light/medium/hard. Three common durations sit beside the stepper
as plain tappable numbers (`60 · 75 · 90`). The rail shows the last four sessions, which is
enough to answer "was that a long one" without opening progress. No mark, no rating: the
app is not trying to improve the user's dancing.

### 4f — Body

The smallest module. Two entry types and nothing else: **a weight with a timestamp**, and
**a photo**. The rail lists recorded weights and a photo count. The empty state is stated
in prose — "Four weights since May. Not enough to draw a line yet." — and no graph is
drawn.

### 4g — Objectives

A free-text **statement of intent** at the top in 33px serif, which the app never parses,
followed by a short editable list of targets. Each row: the target in 23px serif, and a
plain fact beside it in 13px mono (`2 this week`, `9 days`, `direction`).

**Nothing here gets a progress bar, a ring, a percentage or a red state.** A missed target
is a fact the coach may mention; it is not a debt. The statement of intent is the only
first-person text in the product, because it is the user's own.

### 4h — Editing an entry

One frame edits every module's entries, opened from any `recent` row on home.

- **Date and time are ordinary fields at the top**, in `1.5px steel` boxes, not a repair
  tool behind a long-press. Moving an entry to when it actually happened is the common
  reason for opening this screen.
- Below them, whatever the module records — a set table, a food's amount and level, a
  walk's duration and speed, a weight.
- `save changes`, `discard`, and `delete this entry` in `danger`, right-aligned and
  unemphasised.
- Provenance sits quietly at the bottom (`recorded 19:44 · changed once`) and never blocks
  a change.

Every entry in every module is editable and deletable, timestamp included.

### 4i — Drift

**Two states. There is no rung counter, no stored escalation state and no half-loud
in-between.** A line is either an ordinary row in the stack or it is the whole screen.

1. **Sharper wording.** Three separately authored lines at three / nine / sixteen days,
   each with more conditions than the last, all rendering in the same position at the same
   size. The specificity cascade picks the winner — see `spec/COACH.md` §4.1. Only two
   tuning taps exist: `not now` (this line, rest of the zone) and `never` (mutes the
   topic).
2. **The direct line.** Alone on the screen, at most once a day, on the first open. 50px
   serif at weight 200, a second sentence at 24px, a concrete correction sized to tonight,
   and `never` left as a quiet mono link at the bottom. **This is the only place in the
   app that says "you"** — enforce that in the line corpus, not in the component.

At deep drift, `never` confirms once with the fact in front of the user, then obeys. The
escape hatch stays open; it just does not open by reflex.

---

## Behaviour

### The coach

Implement from `spec/COACH.md`; it is complete and is the harder half of this project. The
parts that touch the UI directly:

- The stack is a **pure query recomputed on every open**. Nothing cached, nothing
  invalidated. Answer a question and reopen a minute later and the line is gone because its
  condition now fails.
- **Zero to three lines, with a floor, not a quota.** A fixed count forces padding, and
  padding is the most reliable way to sound automated. Zero is the common outcome.
- **No two lines in one stack may share a `shape`.** On collision show fewer.
- **Randomness is seeded from `(line.id, date, zone)`** so a refresh never rewords a line.
- Lines are **rows of data, never code** — text, conditions, weight, cooldown, shape,
  answer type. Adding a line must not require a deploy of logic.
- Voice, enforced at authoring time by a linter (`spec/COACH.md` §10): no "I", no "you"
  outside the one direct line, no greetings, no judgement adjectives, no exclamation marks,
  no causal connectives, numbers not adverbs.

### Everywhere

- **`Previous` at every point of logging**, in every module, unconditionally. When, the
  numbers, and the comment. This is the highest-value element in the product.
- **Every entry carries an editable timestamp**, at entry time and long after.
- **Libraries ship seeded and grow by use.** `+ new item` is always available inline at the
  point of logging; nothing in a seed list is protected from rename or delete.
- **Blanks are allowed.** An entry with a name, a time and no numbers is valid and is worth
  more than an entry never made.
- **Offline-capable** — a dead signal in a basement gym must not stop logging mid-set.

### Motion

There is almost none, and that is intentional. Hover fills on module tiles and rail rows;
a row leaving the stack on answer; a copied set row appearing. Nothing else animates. No
page transitions, no spring physics, no skeleton shimmer.

---

## Hard constraints

From `spec/RULES.md`. Breaking any of these is a product change, not a detail:

- No LLM in the app. All coach logic deterministic and inspectable.
- **No notifications, ever** — not push, not email, not any channel. The app is inert until
  opened.
- No installed apps. Static web only, laptop and phone browser, same URL.
- No server the project owns. Google sign-in; data in the user's own Drive.
- **No hard-coded targets.** Every number, threshold, default, multiplier, scale and list
  is editable data — never a constant in source. See `spec/DESIGN.md` §11 for the list.
- No streaks, points, badges, rings, budgets, running counts, day totals, or motivational
  copy.
- No meal taxonomy. Nothing in the app knows what breakfast is.
- The week runs **Sunday morning to Saturday evening**. Locale is Israel.
- The realistic risk is not an attacker — it is losing years of history to a format only
  this app understands. Data must outlive the app and be readable without it.

## Build order

`spec/DESIGN.md` §13, unchanged and worth following exactly:

1. Foundation — entry primitive, library items, timestamps, edit/delete, Drive storage,
   Google sign-in, offline shell
2. Workout (`4b`)
3. Nutrition (`4c`)
4. Movement and dance (`4d`, `4e`)
5. Body (`4f`)
6. Objectives (`4g`)
7. The coach (`4a` stack, `4i`)
8. Progress views inside each module
9. Export

Steps 1–5 are a complete and useful app on their own. **The coach is built last, because it
is the only part that cannot be built before there is data to read.**

## Assets

None. No images, no icon set, no illustrations. Fonts are Newsreader, IBM Plex Mono and
IBM Plex Sans from Google Fonts.

Exercise images are a later, optional addition — resolved by naming convention from an
ordinary Drive folder with a placeholder fallback (`spec/DESIGN.md` §10.2). Adding an image
is a file drop, not a feature, and it is not a build dependency.

## Open questions — ask before deciding

1. **Workout kinds not drawn** — `bodyweight`, `hold`, `machine`. The table geometry is
   settled; how the optional second field presents is not.
2. **Segment library screen** — editing a segment's name, distance and gradient may need
   its own screen rather than reusing `4h`.
3. **Polarity of `+` / `−`** as the fast input for the next-time mark
   (`spec/DESIGN.md` §14) — one question for the user, still open.
4. **Storage format** — deliberately undecided, possibly different per module. Constraint
   is durability and readability without the app, not elegance.

## Files in this bundle

| path | what |
| :- | :- |
| `Daily.dc.html` | the design canvas — open in a browser. Turn 4 is current |
| `support.js` | runtime the canvas needs to render. Not part of the app |
| `spec/DESIGN.md` | the spec |
| `spec/COACH.md` | the coach |
| `spec/RULES.md` | rules checklist |
| `spec/CONTEXT.md` | vocabulary — use it for identifiers |
| `spec/design-brief.txt` | the brief turn 4 was drawn against |

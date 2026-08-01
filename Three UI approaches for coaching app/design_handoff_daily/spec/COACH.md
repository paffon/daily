# The coach — what it says, when, and how

Status: rewritten 2026-08-01 alongside `DESIGN.md`. The coach is no longer the
app's face. It is a layer above the modules that is **usually absent**, and this
document specifies what has to be true for it to speak at all.

It expands `DESIGN.md` §6 and overrides it where they conflict. Where it says
*seed default*, the value lives in editable data.

## 1. The problem, stated correctly

There is no model in this app. Every word it says was written by hand, months or
years before it appears, and one reader will see its output thousands of times.

The instinct is to build a phrasing engine — synonyms, sentence templates, a
grammar — so the words are never identical twice. **That is the wrong lever and
it makes the result worse.**

Canned text is not detected by noticing a repeated *word*. It is detected by
noticing a repeated *skeleton* — `N days since X`, every day, forever — or by a
line that is contextually wrong. A thesaurus fixes neither and adds mad-libs
uncanniness on top of both.

A coach who says *"how'd the deadlifts feel?"* verbatim after every deadlift
session is not strange. That is what coaches do. A coach who asks it on a day
with no deadlifts is instantly a machine.

> **Naturalness is a selection problem, not a phrasing problem.**

The whole engineering budget goes into having a supply of *true, specific things
it could say right now* and choosing well among them — including choosing to say
nothing, which is the usual outcome.

### 1.1 The five ways canned text dies

| failure | what it looks like | defence |
| :- | :- | :- |
| Wrong context | asks about a workout that never happened | conditions (§3) |
| Padding | three things said when one was true | the floor (§5.1) |
| Structural repeat | every line is `N days since X` | shape diversity (§6.3) |
| Verbatim repeat | the identical sentence, twice in a day | cooldowns (§6.2) |
| Nagging | the same unanswered question, forever | ask-shift (§7) |

Padding is second on that list rather than fourth, and that is the change from
the previous design. When the coach was the entry screen it had to fill the
screen. It no longer does. **An empty stack is now the expected case**, because
the modules underneath it are the point of the app.

### 1.2 Prior art

**Valve's dynamic dialog system** (Ruskin, GDC 2012) is the closest existing
thing and it is fully deterministic: a dictionary of *facts*, a database of
*lines* each carrying *criteria*, and on an event the eligible line with the
**most criteria wins** — so the system cascades from special cases down to
general ones. Writers add rows, never code. §3 and §4 are this, adapted.

**Motivational-interviewing research** supplies one hard finding: direct
confrontation reliably *increases* resistance. §8 is designed around it.

## 2. The voice

Decided, and not open for reinterpretation line by line.

- **No self-reference. Ever.** The coach never says "I".
- **No second person** — except the one line at extreme drift (§8.2), which is
  the only place in the app that addresses the reader directly.
- **No greetings.** Not "Evening", not "Welcome back".
- **No judgement adjectives.** No *good, bad, great, poor, impressive*.
- **No exclamation marks.**
- **Numbers, not adverbs.** `23 days`, never `quite a while`.
- **Shortest form that carries the fact.**

Baseline output is pure noun phrases. It reads as a file rather than as a person
— which is the point, because it makes the one thing a file never does available
as the loudest signal in the app.

```
Four days since the gym.

Dance tomorrow.

  Start a workout?   [ yes ]  [ no ]

Chest press +7.5 kg since March.
```

### 2.1 Why flat is correct, not merely a taste

A flat register makes **affect the scarcest resource in the app.** A coach that
has stated bare facts for four months and then, once, says something with heat in
it lands with a force no warm coach can achieve — because the warm coach spent it
on a Tuesday in March.

Escalation therefore does not raise its voice. It has no voice to raise.

## 3. Facts

On open, the app computes a **snapshot**: a flat dictionary of derived values.
Every condition and every interpolated value reads from the snapshot and nothing
else.

| family | examples |
| :- | :- |
| Clock | `now.zone`, `now.weekday`, `week.day_index` |
| Recency | `since.workout.days`, `since.workout.back.days`, `since.food.log.hours`, `since.weight.days`, `since.<exercise>.days` |
| Counts | `count.workout.week`, `count.dance.week`, `count.food.today` |
| Objectives | `target.<name>`, `done.<name>`, `gap.<name>` |
| Comparative | `best.<metric>.<window>`, `since_when.<metric>` |
| Delta | `delta.<exercise>.kg`, `delta.<exercise>.since` |
| Away | `away.active`, `away.days` |
| Coverage | `library.<module>.size`, `history.days`, `touched.<module>` |
| Utterance log | `shown.<line>.ago`, `shown.<line>.count`, `answered.<line>.value`, `muted.<topic>` |

Three things are stored; everything else is derived on demand:

1. **Entries** — the log of what happened (`DESIGN.md` §7).
2. **The utterance log** — every line shown, every answer, with timestamps.
3. **Tuning state** — mutes and away declarations.

The utterance log being a first-class store is what lets the coach avoid
repeating itself: **it knows what it already said.** Structurally that is most of
what "remembering" means here.

The **objectives** family is new and is what makes the coach able to say anything
beyond gap arithmetic. If objectives are empty, most of the corpus is ineligible
and the coach is quiet. That is correct behaviour, not a bug.

## 4. Lines

A **line** is one authored thing the coach can say. It is a row of data, never
code.

| field | purpose |
| :- | :- |
| `id` | stable identifier; the key in the utterance log |
| `topic` | the concern it belongs to — the unit of tuning, and of one-per-stack |
| `conditions` | predicates over the snapshot; **all** must hold |
| `text` | the words, with slots |
| `slots` | fact references interpolated into `text` |
| `shape` | tag for the sentence skeleton, for diversity (§6.3) |
| `answer` | `none · yes/no · number · scale · pick-one · opens-module` |
| `effect` | what an answer records or starts |
| `weight` | base rank |
| `cooldown` | minimum gap after being shown |
| `register` | `flat` (default) · `direct` (§8.2) |
| `alone` | if true, it is the whole stack |

Subtypes are derived from `answer`, never stored: `answer: none` is a **remark**;
one that expects an answer is a **question**; `answer: opens-module` is an
**offer**. Provocations are ordinary lines with a long cooldown and `alone: true`.

### 4.1 The specificity cascade

Within a topic, **the eligible line with the most conditions wins.** Ties break
on `weight`, then stably on `id`.

This one rule does most of the work, because it is what a coach actually does:
say the sharpest true thing available, and fall back to something general only
when nothing sharper applies.

```
conditions                                → line
─────────────────────────────────────────────────────────────────
since.workout.days ≥ 3                    → "Three days since the gym."

since.workout.days ≥ 3
gap.workouts.week ≥ 2                     → "Two of three sessions still open,
now.zone = evening                           and dance tomorrow."
dance.tomorrow = true
```

**Escalation needs no separate engine.** A longer absence is a *narrower*
condition, so a sharper line wins automatically. There is no rung counter, no
qualifying-action arithmetic and no stored escalation state — all of which the
previous design had and none of which earned its complexity.

## 5. The stack

Zero to three lines (seed default), above the modules, on open.

1. Compute the snapshot.
2. Filter: all conditions hold, topic not muted, cooldown expired.
3. Group by topic; within each, most conditions wins (§4.1).
4. Score: `weight × rung multiplier`.
5. Drop everything below **the floor**.
6. Sort; take the top three.
7. Apply shape diversity (§6.3).
8. If any selected line has `alone`, it is the entire stack.

### 5.1 The floor, and why a fixed count is forbidden

The stack has a cap, not a quota. A line appears only if its score clears a
threshold.

**A fixed-count stack forces the engine to pad, and padding is the single most
reliable way to sound automated.** One line is a valid stack. Zero is a valid
stack and is the common one.

The floor should be set high. The test is not *is this true* — most true things
are not worth saying. The test is **would a coach who had read the file actually
lead with this.**

### 5.2 The stack is a pure query

Recomputed on every open. Nothing cached, nothing invalidated.

This is safe because suppression is state-based (§6.1) and all randomness is
seeded (§6.4). Answer a question and reopen a minute later: the answer changed a
fact, the condition now fails, the line is gone. Ignore a question and reopen: it
is still there, because it is still true, which is correct.

### 5.3 Quiet days

When nothing is worth saying, **the coach shows nothing at all** and home is just
the modules. It does not announce that it has nothing to announce.

The one exception is a line that has genuinely earned itself — a comparative fact
that has never been true before (§9). Those are rare by construction.

## 6. Repetition

### 6.1 The governing rule

> **If answering makes the question false, use a condition.
> If answering does not make it false, use a cooldown.**

A cooldown standing in for a missing condition is a bug wearing a timer.

- *"Nothing logged since morning"* — logging changes the fact, the condition
  fails. **Condition. No cooldown.**
- *"Three weeks since a weight"* — still true tomorrow whether or not it was
  read. **Cooldown.**

### 6.2 Cooldowns

- **Per line** — guards verbatim repeats.
- **Per topic** — guards obsession. Stops the app looking fixated on food because
  food happens to have eleven lines.

### 6.3 Shape diversity

Three recency lines in one stack — *"4 days since the gym"*, *"3 weeks since a
weight"*, *"9 days since a photo"* — is the structural-repeat failure, and it is
worse than saying the same sentence twice.

Rule: **no two lines in one stack may share a `shape`.** On collision, keep the
higher-scoring line and take the next-best line of a different shape. If none
exists, **show fewer** — always permitted (§5.1).

### 6.4 Seeded randomness

Every random choice is seeded from `(line.id, date, zone)`. No RNG state to
persist, output reproducible for any given day, and **a refresh never rewords a
line.** A sentence that rephrases itself between two opens five minutes apart is
the most uncanny thing a canned system can do, and this makes it impossible by
construction.

### 6.5 Where variation actually comes from

In descending order of value. Note where the effort is *not* spent.

1. **Different facts.** Reality differs daily; the eligible set differs with it.
2. **The cascade.** As conditions change, different lines fire.
3. **Slot values.** `Four days since chest` / `Nine days since back`. Free, and
   reads as attention rather than as shuffling.
4. **The user's own words.** Comments and form cues, quoted back at the moment
   they are relevant. Zero authoring cost and the most convincing material the
   app has. `Previous` proved this in Gym v.3.
5. **A phrasing pool** — 2–4 hand-written alternatives, **only** for lines that
   fire more often than weekly.

**Rejected: synonym substitution and grammar-based generation.** It produces
mush, cannot be proofread, and can accidentally assert something the data does
not support. At this scale it is also unnecessary — the whole corpus is an
afternoon of writing, not an engine.

## 7. Ask-shift: how a question stops nagging

Showing a line writes `shown.<line>`. Answering writes `answered.<line>`. Both
are facts, so conditions can read both — which means **the question moves instead
of repeating.**

An offer at 18:00 (*"Start a workout?"*) becomes ineligible once asked. Its
retrospective partner becomes eligible at 21:00 (*"Did that happen?"*) with a
short expiry, seed default 12 hours. After expiry it drops and the state stays
`unknown`, which is a real and permanent answer.

**Follow-up depth is 1.** A follow-up may never arm another follow-up. Hard
limit, and the whole defence against nagging.

## 8. Drift

The coach notices absence and says so, more plainly as it grows. Two mechanisms,
and only two.

### 8.1 The cascade does the work

A longer gap satisfies more conditions, so a more specific line wins (§4.1). A
line must read differently at three days and at three weeks, or the ladder is
decorative. There is no state to store.

### 8.2 One direct line, at the extreme

At a threshold set per module, **one** line is written in a register that appears
nowhere else in the app: it addresses the reader directly.

```
23 days. You are not going to talk yourself into
this on day 24. Open the door tonight and do
twenty minutes of whatever is stalest.

  [ start a workout ]
```

Rules:

- `register: direct` and `alone: true`. It shares the screen with nothing. Heat
  and a readout on the same screen cheapen each other.
- It fires at most **once per day**, on the first open.
- It carries a correction that is concrete, small and doable today.

The rate limit is not softness. A break on every open is scenery by the fourth
exposure, and once the ceiling is scenery there is nothing above it left to use.

### 8.3 What drift lines may never do

- Raise their voice. Bluntness is plainness, never hostility (§1.2).
- Assert cause. Never *"because you skipped"* (§10).
- Fire against a module never touched. You cannot drift from something you have
  never done — without this rule the app spends its first fortnight furious about
  photographs.

### 8.4 Provocations

A small user-owned pool of short, hard conceptual reframes, deployed rarely and
only at deep drift. Ordinary lines with a cooldown measured in months,
`alone: true`, drawn without replacement. Distinct from motivational prose, and
the only place anything like heat is permitted besides §8.2.

## 9. Praise

Praise is an ordinary line whose conditions are comparative facts:
`count.workout.week ≥ best.workout.week.12w`. That is what makes it earned rather
than issued — it cannot fire unless something genuinely happened.

**Praise never coexists with drift at the extreme.** Both facts may be true at
once — six days of complete food logs and twenty-three days out of the gym — but
a screen that says both, in that order, in that tone, is not a coach. It is a
random line generator.

The seam is exactly between fact and celebration:

```
nothing drifting:
  Food: 6 days logged in full. Longest yet.

deep drift elsewhere:
  Food: 6 days logged in full.
```

**The fact survives, because withholding a true fact is dishonest. The
superlative does not, because that is celebration.** The celebrating line carries
one extra condition, which makes it more specific, so the cascade already does
this (§4.1).

## 10. Honesty, enforced mechanically

*The coach observes, never explains* cannot be enforced at runtime, because every
word was written in advance. It is enforced at **authoring time**, by rules a
linter can check.

1. **Every claim must be a condition.** A line may only reference facts that
   appear in its own `conditions` or `slots`. Checkable.
2. **No causal connectives.** Banned in `text`: *because, due to, caused, that's
   why, led to, as a result, which is why, thanks to.* Checkable.
3. **No claims about the future.** No *"this will help"*, no *"you'll feel
   better"*. The app does not know.
4. **Unknown is printable.** *"No weight recorded, ever."* is a shippable line.
5. **The log records what was chosen, not what was possible.** A gap is a gap
   until the user says otherwise (§11).

Rules 1 and 2 are the mechanical teeth. The rest is a writing rule (§13).

Why this matters concretely: the strength drop after the user's ten-week gap was
a *deliberate deload*. An app asserting "you got weaker because you skipped"
would be inventing a story its data cannot support, and inventing stories is what
destroys trust in a system.

## 11. Away

Declared in both directions: prospectively (*"away two weeks from Sunday"*) or
retroactively (*"ignore the last two weeks"*).

Days are marked `away` in the record, permanently, and never erased. Gap
conditions skip them; objective counts skip them. **Staleness is untouched** —
after two weeks off everything really is two weeks stale, and pretending
otherwise would be a lie about the body, which is a worse category of lie than an
unflattering statistic.

**Undeclared gaps.** When a gap past a threshold ends, the coach asks once, at
low priority, and it is ignorable:

```
22 days, no sessions.
  [ deliberate ]  [ it got away ]  [ × ]
```

Ignored, it expires and the gap stays `unknown` forever. Without this the app
mislabels every deliberate deload as drift purely because the user forgot to say
otherwise.

## 12. Tuning

Two taps, available on every line, never behind a settings screen.

| tap | scope | effect |
| :- | :- | :- |
| `not now` | this line | snoozed for the rest of the current zone |
| `never` | the topic | muted |

**Tuning acts on topics, not lines**, because *"stop asking about food"* is what a
person means. Which of eleven food lines happened to be on screen is an authoring
detail the user should never have to reason about.

The previous design also had `less often` and `good question` as weight
multipliers. They are cut: they require a persistent tuning store, they make the
engine's behaviour harder to predict, and a high floor (§5.1) does the same job
without state.

**`never` at deep drift** works, but confirms once with the fact in front of you,
and then obeys. The escape hatch stays open — it just does not open by reflex in
the one moment reflex is least trustworthy.

**No implicit learning from silence.** An ignored question is `unknown`, not
dislike, and a hidden weight that drifted on its own would break inspectability.
Only explicit taps tune.

**But the coach notices its own noise.** A line shown many times and never once
answered surfaces that fact and offers to stop:

```
Asked 8 times since May, never answered.
  [ stop asking ]  [ keep asking ]
```

## 13. The writing rulebook

Every line is hand-written. These are the constraints.

- No `I`. No `you` outside `register: direct`. No greetings.
- No judgement adjectives, no exclamation marks, no motivational copy.
- No causal connectives (§10.2).
- Numbers over adverbs.
- Every shortfall ships a correction that is **concrete, small, and doable
  today**: name the action, the size, and the day. *"Tomorrow, same day, one snack
  less"* — never a bare verdict.
- Prefer the user's own words to any authored phrase (§6.5).
- Shortest form that carries the fact.
- A line must read differently at three days and at three weeks.
- **Before writing a line, ask whether the app should simply be quiet instead.**
  Most of the time it should.

## 14. Worked example — one Tuesday, three opens

```
07:40   nothing new overnight

        Workouts: 1 of 3 this week.
          Gym today?   [ yes ]  [ no ]  [ maybe later ]

        ── workout ─ nutrition ─ movement ─ dance ─ body ──


13:10   lunch logged from the nutrition module ten minutes ago

        ( nothing. Two candidate lines sat below the floor
          and the third's condition no longer holds. )

        ── workout ─ nutrition ─ movement ─ dance ─ body ──


21:30   still nothing logged; the morning offer was
        answered "maybe later", which armed a follow-up

        Gym today: still open.
          Did it happen?   [ yes ]  [ no ]  [ × ]

        ── workout ─ nutrition ─ movement ─ dance ─ body ──
```

Three properties, each load-bearing:

- **The middle open shows nothing.** Under the previous design the coach was the
  screen and had to say something. Now the modules are the screen and silence
  costs nothing.
- The morning question **shifted** rather than repeating — prospective at 07:40,
  retrospective at 21:30 (§7).
- Answering removed a line and **nothing was promoted to replace it.** The stack
  shrank. No treadmill.

## 15. Open items

| item | owner |
| :- | :- |
| The floor value, and how it is expressed | implementation — the single most consequential number in this document |
| Drift thresholds per module | implementation, all editable |
| `shape` vocabulary — the list of sentence skeletons | implementation, emerges from writing the lines |
| The provocation pool's contents | user |
| Language of the line corpus (assumed English) | user |

# Rules

The rules that are easy to break by accident. This file is not the spec — it is
the short list you check yourself against. `DESIGN.md` is the spec; `COACH.md`
specifies the utterance layer.

## Hard rules

- **Recording is the product.** When a decision trades logging speed for
  anything else, logging speed wins.
- **The coach is conditional.** Home is the modules. The coach appears above
  them only when it has something specific worth saying, and most opens it has
  nothing. An empty stack is the expected case, not a failure.
- **No LLM in the app.** All logic is deterministic and inspectable. It must
  always be possible to see why the app said something.
- **No notifications, ever.** The app is inert until opened.
- **No installed apps.** Static web only — laptop and phone browser, same URL.
- **No server we own.** Google sign-in; all data lives in the user's own Google
  Drive.
- **No hard-coded targets.** Every number, threshold, default, multiplier, scale
  and list is editable data — never a constant in source.
- **No streaks, points, badges, or motivational copy.**
- **No meal taxonomy.** A meal is only an untyped container — started and
  ended the way a workout is — and nothing in the app knows what breakfast is.
- **Every entry is editable and deletable, in every module** — including its
  timestamp, at any time after the fact.
- **`Previous` at every point of logging.** What happened last time, with its
  numbers and its comment, wherever something is being entered. The entry
  being corrected is never its own previous.
- **A module opens on its list, and one screen adds and edits.** `+ new` and a
  past entry open the same builder — see `DESIGN.md` §6.
- **Nothing scrolls sideways.** A row that cannot shrink is a bug inside that
  row, never something the phone should pan to.
- **The coach observes, never explains.** State what happened; never claim why
  it happened or what it caused.
- **Silence is unknown, not failure.** An unanswered question is never recorded
  as a miss.
- **The week runs Sunday morning to Saturday evening.**

## Reversals

Each of these was once a rule and is now the opposite. They are listed so a
change back looks like the decision it would be, rather than a correction.

| was | is |
| :- | :- |
| One entry screen — every open lands on the coach | Home is the modules; the coach is a layer above, usually absent |
| Libraries never pre-seeded — they grow only by use | Libraries ship with defaults, and grow by use on top of them |
| No grams, ever — portion is expressed only as a level | Amount is in the food's own unit; grams where grams are natural |
| Escalation by stored rungs and qualifying actions | Escalation is the specificity cascade. No stored state |
| Nothing groups food entries — only what was eaten and when | A meal groups them (2026-08-06): an untyped container, started like a workout. Breakfast, lunch and dinner stay gone |
| No second user — one person, one log | The one account holds profiles (2026-08-06): the catalog is shared, the records are each profile's own. See ADR 0004 |
| Objectives — a short editable list of targets the coach reasons against | Gone (2026-08-06): nothing is compared against a number, and gap arithmetic is the whole of what the coach has. See ADR 0006 |
| Resize every photo on import | Item pictures are capped; a body photograph is kept at the size it was shot (2026-08-06), because it is the thing being measured. Both are still re-encoded to JPEG |

## The coach's voice

Full specification in `COACH.md` §2 and §13. The five easiest to violate without
noticing:

- **The coach never says "I".** Not once, anywhere.
- **The coach never says "you"** — except in the single `register: direct` line
  at extreme drift, the only place in the app that addresses the reader.
- **No greetings**, no judgement adjectives, no exclamation marks.
- **Never pad the stack to fill it.** The cap is a maximum, not a quota. One
  line is a valid stack; zero is the usual one.
- **Before writing a line, ask whether the app should be quiet instead.**

## Conventions

- Defaults are seeds, not truth. Ship them as editable data, not as code
  constants — including the contents of every seeded library.
- Every data type needs two paths: prompted by the coach, and logged
  spontaneously.
- Prefer deleting a feature over adding a setting that disables it.
- A merged pull request is not a deployed one, and a green run is not a visible
  change. Prove it by fetching the live bundle — `DEPLOY.md`.
- Never show a field the thing does not have. Running has no weight box.
- Locale is Israel. Portion sizes, week boundaries and units follow the user,
  not US defaults.
- Naming follows `CONTEXT.md`. In particular: **stack**, not "feed"; **line** as
  the utterance primitive, with *remark* / *question* / *offer* as its subtypes;
  **level** for what a thing was, and **next-time mark** — `more` / `same` /
  `less`, workout sets only — for what to do about it next time. There is no
  universal difficulty or effort rating; it was tried and cut.

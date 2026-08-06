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

**Built on 2026-08-07, except the export.** Every row above landed on
`claude/workout-module-refinements-8c24c8` but the HTML export, which is
`DESIGN.md` §13's last step and the one row here that is not a workout-module
refinement — it gets its own branch.

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

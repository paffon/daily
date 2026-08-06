# Objectives are cut, and the body-part snapshot survives them

`DESIGN.md` §9 named objectives one of the coach's three inputs, beside the
data and the clock — the only reference point it had that was not arithmetic
on its own log. They are removed (2026-08-06). The user does not write them and
does not want anything compared against them, which leaves a module whose whole
purpose was the comparison. The screen, its stylesheet and both test files go,
with `src/data/objectives.ts`, `src/seed/objectives.json`, the `#/objectives`
route, home's footer link, the `SEEDS` row and the `objectives` block in
`config/app.json`: about eight hundred lines behind a screen that was never
filled in.

`COACH.md`'s `target.` / `done.` / `gap.` family goes with them, and with it
most of what the corpus was ever eligible to say. What remains is what that
document calls gap arithmetic — how long since a thing last happened — which is
enough for a coach that is absent on most opens.

Two things do not go.

**`weekBounds()` moves to `src/data/entry.ts`.** It lived in `objectives.ts`
only because targets were weekly, and *the week runs Sunday morning to Saturday
evening* is a hard rule that outlives the first thing to need it.

**`bodyPartsOf()` keeps stamping `payload.body_parts` onto every workout**,
with nothing left to read it. That is the decision worth the file.

## Why a field with no reader stays

Deleting it is the stricter reading of the rules. `RULES.md` prefers deleting a
feature to keeping one nobody uses, and an unread field is dead flexibility of
exactly the kind this project cuts. It is kept anyway, because the alternative
is not *add it back later*. It is *never have it*.

The array is written at save time rather than resolved at read time precisely
because nothing in a library is protected — an exercise can be renamed,
re-tagged onto another body part, or deleted outright. A reader that resolved
against `library/exercises.json` would let a re-tag in September quietly rewrite
what June trained, and an entry has to keep saying what was true when it
happened. So the snapshot cannot be reconstructed afterwards. It is recorded
going forward or it is lost.

And the objection was to comparison, not to arithmetic. *Nothing for the back
in twelve days* is a gap rather than a target; it survives this ADR, and
`body_parts` is the only thing that makes it sayable.

## Consequences

**A future pass will find a stamped field that nothing reads.** It is not dead
code, and this file is the reason it is there. The cost of being wrong is
asymmetric: keeping it costs two or three short strings per workout, and
dropping it costs every body part every past workout ever touched.

**The exercise list's ordering is not that reader.** Since 2026-08-06 the picker
sorts by how long ago each exercise was last done, one per body part promoted
above the rest (`DESIGN.md` §8.1). That reads `body_part` off the library and
the exercise ids out of past entries; it never touches `payload.body_parts`. The
snapshot remains unread, and remains kept for the reason above.

**Three earlier ADRs now describe a module that is gone.**
[0002](./0002-one-entry-shape-for-every-module.md) counts "the objectives
arithmetic" among what one entry shape paid for,
[0003](./0003-every-number-is-seeded-data.md) uses the deliberately empty
`config/objectives.json` as its example of a seed that would otherwise be the
hard-coded target the rules forbid, and
[0004](./0004-profiles-share-the-catalog-and-own-their-records.md) lists that
file as profile-owned and names `path()` in `src/data/objectives.ts` as one of
three scope chokepoints — leaving two. Each is a record of when it was written
and is left alone.

**The stored files stay in Drive.** Every profile's `config/objectives.json` is
untouched: removing the code that reads a file is not permission to delete the
file. Any profile that has one keeps it, and nothing will open it again.

**This is a reversal, not a correction**, so it is written where reversals are
written — a row in `RULES.md`, the retirement of `DESIGN.md` §9, and the
**Objective** entry marked gone in `CONTEXT.md`. Rebuilding this later should
look like the decision it would be.

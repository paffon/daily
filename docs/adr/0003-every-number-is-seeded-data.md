# Every number is seeded data, never a source constant

`RULES.md` forbids hard-coded targets: every number, threshold, default,
multiplier, scale and list is editable data. The mechanism is one path with no
exceptions. Defaults live in `src/seed/*.json`, are copied into Drive
`config/` and `library/` on first run **only if the file is absent**, and are
read back through the store from then on. `SEEDS` in `src/data/store.ts` is
the registry; adding a seed is a row there and nothing else.

A literal like `const LEAN = 0.7` anywhere in `src/` is a defect, including in
tests of production paths. What this bought in practice: the level scales, the
next-time-mark glyphs, the per-food units, the stepper increments, the recent
count and the weekday window are all data, and the two shared level scales P7
needed were on screen from `loadLevels()` with no change to any file.

Seeds are defaults, not truth. `ensureSeeded` never writes over an edited copy,
and nothing in a seeded library is protected from rename or delete — a shipped
objective would itself be the hard-coded target the rule forbids, which is why
`config/objectives.json` seeds empty.

## Consequences

`ensureSeeded` writes a seed only when the **whole file** is absent; it never
backfills a key added later. A browser holding an older `config/app.json` gets
`undefined` where TypeScript says a value is present — a canvas sized `NaN`, a
`toFixed` on nothing, a stepper with no step. Four phases each defended their
own section by spreading the seed under the stored one, at six call sites, and
every future phase that adds a config key inherits that workaround until
`ensureSeeded` merges keys instead of skipping present files. This is the
first open item in [OPEN.md](../OPEN.md).

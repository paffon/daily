import { Fragment } from 'preact'
import type { VNode } from 'preact'
import type { Food, LevelNumbers, Macro } from '../data/food'
import { MACROS, baseLevel, loadLevels, perUnit } from '../data/food'
import './food_facts.css'

/** What a food is made of, and what its levels mean for it — the two halves of
 *  a food that are not the amount in front of you (`DESIGN.md` §8.2). The first
 *  half is a matrix, three levels by three numbers, and every cell of it is
 *  optional: the base row is what gets typed for nearly every food, and the
 *  rows either side of it are for the food the multiplier is wrong about.
 *
 *  One component, both surfaces: the food library screen opens it under every
 *  row, and the meal builder opens it behind the line that shows the numbers,
 *  because the moment a food is invented is the moment its numbers are known.
 *  Written twice it would drift, and the two are the same fields about the same
 *  thing.
 *
 *  It edits the **library**, not the meal — these numbers are the food's, and
 *  every meal that ever holds it reads them. The note at the foot says so,
 *  since the amount and the level directly above it in the builder are the
 *  opposite: those belong to the entry alone. */
export function FoodFacts({
  food,
  scale,
  onEdit,
}: {
  food: Food
  scale: string[]
  /** The change, applied inside the library's own read-modify-write rather
   *  than to the copy this render was built from — `editFood` is what the
   *  callers hand over, and the merge below depends on it. */
  onEdit: (change: (held: Food) => Food) => void
}): VNode {
  /* `per slice`, and `per one` where the food counts as itself */
  const per = food.unit === '' ? 'per one' : `per ${food.unit}`
  /** Read once for the whole grid rather than once per cell — nine reads of the
   *  mirror to draw nine boxes is nothing anyone would notice and still the
   *  wrong shape. */
  const levels = loadLevels()
  /** The row that owns the food's own three numbers. Every other row is an
   *  override of what the multiplier would have said. */
  const base = baseLevel(levels)

  /** An emptied box is the number becoming unknown again, never zero —
   *  `undefined` is dropped by `JSON.stringify`, so the food loses the key
   *  outright and wears the same absence as a food that never had one. A zero
   *  typed on purpose is kept, because *no fat in it* is a fact and blank is
   *  not. */
  const number = (input: string): number | undefined => {
    const said = input.trim()
    const value = Number(said)
    return said === '' || Number.isNaN(value) ? undefined : value
  }

  /* the column heads, in `MACROS`' own order — the grid draws what the
     arithmetic reads, so a macro cannot appear in one and not the other */
  const heads: Record<Macro, string> = { kcal: 'kcal', protein: 'protein g', fat: 'fat g' }

  /** One cell of the matrix. The base row is the food's own three fields; every
   *  other row is a `levels` entry, and an emptied cell loses its key the way
   *  an emptied base number does — a row with nothing left loses itself, and a
   *  food with no rows left loses `levels` outright, so a food that never
   *  overrode anything reads exactly as it did before the matrix existed. */
  const write = (level: string, macro: Macro, said: string) =>
    onEdit((held) => {
      if (level === base) return { ...held, [macro]: number(said) }

      const rows: Record<string, LevelNumbers> = { ...held.levels }
      const row = Object.fromEntries(
        Object.entries({ ...rows[level], [macro]: number(said) }).filter(
          ([, value]) => value !== undefined,
        ),
      )
      if (Object.keys(row).length === 0) delete rows[level]
      else rows[level] = row

      return { ...held, levels: Object.keys(rows).length === 0 ? undefined : rows }
    })

  /** What an empty box says: the number that level would be given anyway, so an
   *  untyped cell shows what the app will use rather than looking like a
   *  missing one. The base row has nothing behind it, and a food with no base
   *  number has nothing to derive from — both say `—`. */
  const behind = (level: string, macro: Macro): string => {
    const derived = level === base ? null : perUnit(food, level, levels)[macro]
    return derived === null ? '—' : String(derived)
  }

  /** What one level means, in prose. A level with nothing written loses its
   *  key and a food with nothing written at all loses `examples` entirely,
   *  which is what makes the control draw no prose block rather than three
   *  empty lines. */
  const describe = (level: string, said: string) =>
    onEdit((held) => {
      const next: Record<string, string> = { ...held.examples }
      if (said.trim() === '') delete next[level]
      else next[level] = said.trim()
      return { ...held, examples: Object.keys(next).length === 0 ? undefined : next }
    })

  return (
    <div class="facts">
      {/* the matrix: every level of the scale by every number a food carries,
          at one unit. Nine boxes and none of them required — the base row is
          usually the whole of what gets typed, and the rows above and below it
          stand empty showing what the multiplier makes of it (§8.2) */}
      <div class="facts-group">
        <span class="facts-label">{per}</span>
        <div class="facts-matrix">
          <span />
          {MACROS.map((macro) => (
            <span class="facts-number-label" key={macro}>
              {heads[macro]}
            </span>
          ))}
          {scale.map((level) => (
            <Fragment key={level}>
              <span class="facts-matrix-level">{level}</span>
              {MACROS.map((macro) => (
                <input
                  key={macro}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  aria-label={`${level} ${macro} of ${food.name}`}
                  placeholder={behind(level, macro)}
                  value={(level === base ? food[macro] : food.levels?.[level]?.[macro]) ?? ''}
                  onChange={(e) => write(level, macro, e.currentTarget.value)}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      {/* prose, and per food: what the scale's words mean for this one thing.
          Written where the distinction is genuinely confusing and left blank
          everywhere else — all of them show together under the buttons where
          it is logged, because comparing them is what makes them useful */}
      <div class="facts-group">
        <span class="facts-label">what each level means</span>
        {scale.map((level) => (
          <label class="facts-example" key={level}>
            <span class="facts-example-level">{level}</span>
            <input
              type="text"
              aria-label={`what ${level} means for ${food.name}`}
              placeholder="—"
              value={food.examples?.[level] ?? ''}
              onChange={(e) => describe(level, e.currentTarget.value)}
            />
          </label>
        ))}
      </div>

      <p class="facts-note">
        These belong to the food rather than to one meal — every meal that holds it reads them. A
        blank level is the {base} row times its multiplier, which is the greyed number in the box.
        Type over it where that is wrong about the food; leave the lot blank and the food carries no
        numbers at all.
      </p>
    </div>
  )
}

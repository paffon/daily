import type { VNode } from 'preact'
import type { Food } from '../data/food'
import './food_facts.css'

/** What a food is made of, and what its levels mean for it — the two halves of
 *  a food that are not the amount in front of you (`DESIGN.md` §8.2).
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

  /* the field list is data here for the same reason a kind's is: three boxes
     written out three times drift in three ways */
  const numbers = [
    { key: 'kcal', label: 'kcal' },
    { key: 'protein', label: 'protein g' },
    { key: 'fat', label: 'fat g' },
  ] as const

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
      {/* the normal case at one unit, which is the whole of what the library
          stores — lean and loaded are the global multipliers applied to these,
          never three sets of numbers typed here (§8.2) */}
      <div class="facts-group">
        <span class="facts-label">{`normal · ${per}`}</span>
        <div class="facts-numbers">
          {numbers.map((field) => (
            <label class="facts-number" key={field.key}>
              <span class="facts-number-label">{field.label}</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                aria-label={`${field.key} of ${food.name}`}
                value={food[field.key] ?? ''}
                onChange={(e) =>
                  onEdit((held) => ({ ...held, [field.key]: number(e.currentTarget.value) }))
                }
              />
            </label>
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
        These belong to the food rather than to one meal — every meal that holds it reads them.
        Blank is unknown and stays unknown; nothing here fills one in.
      </p>
    </div>
  )
}

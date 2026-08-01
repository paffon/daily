import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry, Module } from '../data/entry'
import { MODULES } from '../data/entry'
import { readEntries, readJson } from '../data/store'
import { factFor, readObjectives, writeObjectives } from '../data/objectives'
import type { DirectionTarget, Objectives as Stored, Target } from '../data/objectives'
import appSeed from '../seed/app.json'
import './objectives.css'

/** Frame 4g. Nothing here fills, colours or completes — no bar, no ring, no
 *  percentage, no red, no "behind". A target's number is never compared
 *  against anything on this screen: `factFor` states what happened and the
 *  number sits beside it as the thing the *coach* will read one day. A missed
 *  target is a fact, not a debt. `DESIGN.md` §9. */

/** Spread over the seed for the same reason `photos.ts` does it: `ensureSeeded`
 *  writes a config only when the whole file is absent, so a browser holding an
 *  older `config/app.json` has none of these. */
const settings = () => ({
  ...appSeed.objectives,
  ...readJson('config/app.json', appSeed).objectives,
})

/** What a fresh objective starts as, one per kind — config rather than five
 *  literals in here, because a starting number is exactly the hard-coded
 *  target `RULES.md` forbids. The kinds on offer are this list's own. */
const blanksOf = (): Target[] => settings().new_target as unknown as Target[]

function TargetFields({
  target,
  onChange,
  onRemove,
}: {
  target: Target
  onChange: (next: Target) => void
  onRemove: () => void
}): VNode {
  const blanks = blanksOf()
  const { directions } = settings()

  /* The label is the user's own words and survives the swap; nothing else can,
     because the two kinds share no other field. */
  const swap = (kind: string) =>
    onChange({ ...(blanks.find((blank) => blank.kind === kind) ?? target), label: target.label })

  return (
    <div class="obj-fields">
      <label class="obj-field">
        <span class="obj-field-label">said as</span>
        <input
          type="text"
          defaultValue={target.label}
          onChange={(e) => onChange({ ...target, label: e.currentTarget.value })}
        />
      </label>

      <label class="obj-field">
        <span class="obj-field-label">kind</span>
        <select value={target.kind} onChange={(e) => swap(e.currentTarget.value)}>
          {blanks.map((blank) => (
            <option key={blank.kind} value={blank.kind}>
              {blank.kind}
            </option>
          ))}
        </select>
      </label>

      {target.kind === 'count' ? (
        <>
          <label class="obj-field">
            <span class="obj-field-label">counting</span>
            <select
              value={target.module}
              onChange={(e) => onChange({ ...target, module: e.currentTarget.value as Module })}
            >
              {MODULES.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </label>

          <label class="obj-field">
            <span class="obj-field-label">a week</span>
            <input
              type="number"
              defaultValue={String(target.target)}
              onChange={(e) => onChange({ ...target, target: Number(e.currentTarget.value) })}
            />
          </label>

          <label class="obj-field">
            <span class="obj-field-label">body part</span>
            <input
              type="text"
              defaultValue={target.body_part ?? ''}
              onChange={(e) =>
                onChange({
                  ...target,
                  body_part: e.currentTarget.value === '' ? undefined : e.currentTarget.value,
                })
              }
            />
          </label>
        </>
      ) : (
        <label class="obj-field">
          <span class="obj-field-label">which way</span>
          <select
            value={target.direction}
            onChange={(e) =>
              onChange({
                ...target,
                direction: e.currentTarget.value as DirectionTarget['direction'],
              })
            }
          >
            {directions.map((direction) => (
              <option key={direction} value={direction}>
                {direction}
              </option>
            ))}
          </select>
        </label>
      )}

      <button type="button" class="obj-remove hit" onClick={onRemove}>
        remove
      </button>
    </div>
  )
}

export function Objectives(): VNode {
  const [stored, setStored] = useState<Stored>(readObjectives)
  const [open, setOpen] = useState<number | null>(null)

  /* Every module's log, because a count target names the module it counts. */
  const entries: Entry[] = MODULES.flatMap((module) => readEntries(module))

  const save = (next: Stored) => {
    writeObjectives(next)
    setStored(next)
  }

  const put = (at: number, target: Target) =>
    save({ ...stored, targets: stored.targets.map((held, i) => (i === at ? target : held)) })

  const add = () => {
    setOpen(stored.targets.length)
    save({ ...stored, targets: [...stored.targets, blanksOf()[0]!] })
  }

  const remove = (at: number) => {
    setOpen(null)
    save({ ...stored, targets: stored.targets.filter((_, i) => i !== at) })
  }

  return (
    <main class="obj">
      <header class="obj-strip">
        <a class="obj-back hit" href="#/">
          ← &nbsp;objectives
        </a>
      </header>

      <div class="obj-body">
        {/* Uncontrolled and saved on the native change event, which is blur.
            Stored and shown, and read by nothing — not for keywords, not for
            targets, not for anything. */}
        <textarea
          class="obj-statement"
          rows={2}
          aria-label="statement of intent"
          defaultValue={stored.statement}
          onChange={(e) => save({ ...stored, statement: e.currentTarget.value })}
        />
        <p class="obj-yours">your words · never read by the app</p>

        <section class="obj-targets">
          {stored.targets.map((target, at) => (
            <div class="obj-target" key={at}>
              <button
                type="button"
                class="obj-row hit"
                onClick={() => setOpen(open === at ? null : at)}
              >
                <span class="obj-label">{target.label}</span>
                <span class="obj-fact">{factFor(target, entries)}</span>
              </button>
              {open === at && (
                <TargetFields
                  target={target}
                  onChange={(next) => put(at, next)}
                  onRemove={() => remove(at)}
                />
              )}
            </div>
          ))}

          <button type="button" class="obj-add hit" onClick={add}>
            + objective
          </button>
        </section>

        <p class="obj-note">
          A number here is what the coach compares against. It is not owed back.
        </p>
      </div>
    </main>
  )
}

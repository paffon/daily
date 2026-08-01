import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { newEntry, toIso } from '../data/entry'
import { putEntry, readEntries, readJson, writeJson } from '../data/store'
import type { Segment } from '../data/segment'
import { hintOf, loadSegments, movementConfig } from '../data/segment'
import { loadLevels } from '../data/food'
import { Previous, Timestamp, clockOf } from '../components/fields'
import { LibraryPicker } from '../components/library_picker'
import { AmountStepper } from '../components/amount_stepper'
import { LevelControl } from '../components/level_control'
import { PostureBar } from '../components/posture_bar'
import { registerEditor } from './edit_entry'
import appSeed from '../seed/app.json'
import './movement.css'

/** Frame 4d. One module holding two genuinely different things: a segment is
 *  an event and a posture block is a proportion. They are told apart by
 *  `payload.type` and never by a sixth module — the walk and the workday are
 *  the same day's movement, and splitting them would put half of it behind a
 *  tile the user does not think of as a module. */

type Segmented = { type: 'segment'; segment_id: string; duration_min: number; level: string }

type Posture = { type: 'posture'; span_hours: number; sitting_hours: number }

const isPosture = (entry: Entry): boolean => entry.payload['type'] === 'posture'

/** A segment the library no longer has — renamed or deleted on another device,
 *  since nothing in a seed is protected. The entry keeps saying what it said. */
const asSegment = (id: string, library: Segment[]): Segment =>
  library.find((item) => item.id === id) ?? { id, name: id }

/** `18 min · steady`, which is the same sentence the rail and `Previous` say. */
const segmentLine = ({ duration_min, level }: Segmented): string =>
  [`${duration_min} min`, level].filter((part) => part !== '').join(' · ')

/** `8 h · 6 sitting` — the block's own two numbers and no third one derived
 *  from them. A percentage here would be the bar said again in the register
 *  the module exists to avoid. */
const postureLine = ({ span_hours, sitting_hours }: Posture): string =>
  `${span_hours} h · ${sitting_hours} sitting`

const lineOf = (entry: Entry): string =>
  isPosture(entry)
    ? postureLine(entry.payload as Posture)
    : segmentLine(entry.payload as Segmented)

const scaleOf = (): string[] => loadLevels()['movement']?.scale ?? []

/** Movement's half of frame 4h. Two entry types means two shapes behind one
 *  registration — a segment is corrected the way it was entered, and so is a
 *  block, which is why `payload.type` is on the entry rather than inferred
 *  from which fields happen to be present. */
registerEditor('movement', (payload, onChange) => {
  const config = movementConfig()

  if (payload['type'] === 'posture') {
    const block = payload as Posture
    return (
      <div class="movement-edit">
        <h2 class="movement-edit-name">posture</h2>

        <div class="movement-row">
          <label class="movement-field">
            <span class="movement-label">span</span>
            <AmountStepper
              value={block.span_hours}
              unit="h"
              step={config.hours_step}
              onChange={(span_hours) => onChange({ ...payload, span_hours })}
              label="span"
            />
          </label>

          <label class="movement-field">
            <span class="movement-label">sitting</span>
            <AmountStepper
              value={block.sitting_hours}
              unit="h"
              step={config.hours_step}
              onChange={(sitting_hours) => onChange({ ...payload, sitting_hours })}
              label="sitting"
            />
          </label>
        </div>

        <PostureBar span={block.span_hours} sitting={block.sitting_hours} />
      </div>
    )
  }

  const logged = payload as Segmented
  const segment = asSegment(logged.segment_id, loadSegments())

  return (
    <div class="movement-edit">
      <h2 class="movement-edit-name">{segment.name}</h2>
      <span class="movement-hint">{hintOf(segment)}</span>

      <label class="movement-field">
        <span class="movement-label">duration</span>
        <AmountStepper
          value={logged.duration_min}
          unit="min"
          step={config.duration_step}
          onChange={(duration_min) => onChange({ ...payload, duration_min })}
          label="duration"
        />
      </label>

      <div class="movement-field">
        <span class="movement-label">speed</span>
        <LevelControl
          scale={scaleOf()}
          value={logged.level}
          onChange={(level) => onChange({ ...payload, level })}
          label="speed"
        />
      </div>
    </div>
  )
})

export function Movement(): VNode {
  const { locale } = readJson('config/app.json', appSeed)
  const config = movementConfig()
  const library = loadSegments()
  const scale = scaleOf()

  const [ts, setTs] = useState(() => toIso(new Date()))
  const [past, setPast] = useState(() => readEntries('movement'))
  const [picked, setPicked] = useState<Segmented | null>(null)
  const [block, setBlock] = useState<Posture | null>(null)
  /* every stepper holds what was typed into it, so a number replaced from
     outside the box — a fresh pick, an opened block, `same as yesterday` —
     has to remount it, or the box goes on showing the last entry's figure
     while the payload carries this one's */
  const [filled, setFilled] = useState(0)
  const fill = () => setFilled((n) => n + 1)

  const today = new Date().toDateString()
  const isToday = (entry: Entry) => new Date(entry.ts).toDateString() === today

  const lastPosture = past.find(isPosture) ?? null

  const start = (segment_id: string) => {
    fill()
    setPicked({
      type: 'segment',
      segment_id,
      duration_min: config.duration_start,
      level: config.default_level,
    })
  }

  /** What was typed to filter names the new route. A segment made mid-log has
   *  neither distance nor gradient, and is a valid thing to log against — both
   *  are editable in the library afterwards. */
  const create = (name: string) => {
    const segment: Segment = { id: crypto.randomUUID(), name }
    writeJson('library/segments.json', [...library, segment])
    start(segment.id)
  }

  /** The block starts at the ordinary workday, so the common entry is one
   *  press. `same as yesterday` is for the days that repeat exactly. */
  const openBlock = () => {
    fill()
    setBlock({ type: 'posture', span_hours: config.span_start, sitting_hours: config.sitting_start })
  }

  const repeatBlock = () => {
    if (lastPosture === null) return
    fill()
    setBlock({ ...lastPosture.payload } as Posture)
  }

  const log = (payload: Segmented | Posture) => {
    putEntry(newEntry('movement', { ...payload }, ts))
    setPast(readEntries('movement'))
    setPicked(null)
    setBlock(null)
    setTs(toIso(new Date()))
  }

  /** Scoped to the route, not to the day: the last time *this* walk was
   *  logged, however long ago. A posture block's previous is the last block
   *  outright — there is only one kind of workday. */
  const previousSegment = (segment_id: string): Entry | null =>
    past.find((entry) => !isPosture(entry) && (entry.payload as Segmented).segment_id === segment_id) ??
    null

  const segment = picked === null ? null : asSegment(picked.segment_id, library)

  return (
    <main class="movement">
      <header class="movement-strip">
        <a class="movement-back hit" href="#/">
          ← &nbsp;movement
        </a>
        <Timestamp value={ts} onChange={setTs} locale={locale} />
      </header>

      <div class="movement-split">
        <section class="movement-rail">
          <h2 class="movement-rail-label">today</h2>
          {/* the events first and the blocks ruled off below them: one list,
              because they are one day's movement, and a rule because they are
              not the same kind of thing */}
          {past
            .filter((entry) => isToday(entry) && !isPosture(entry))
            .map((entry) => (
              <a class="movement-rail-row hit" key={entry.id} href={`#/entry/${entry.id}`}>
                <span class="movement-rail-when">{clockOf(entry.ts, locale)}</span>
                <span class="movement-rail-what">
                  {`${asSegment((entry.payload as Segmented).segment_id, library).name} · ${lineOf(entry)}`}
                </span>
              </a>
            ))}

          <div class="movement-rail-blocks">
            {past
              .filter((entry) => isToday(entry) && isPosture(entry))
              .map((entry) => (
                <a class="movement-rail-row hit" key={entry.id} href={`#/entry/${entry.id}`}>
                  <span class="movement-rail-when">{`${clockOf(entry.ts, locale)} · posture`}</span>
                  <span class="movement-rail-what">{lineOf(entry)}</span>
                </a>
              ))}
          </div>

          <p class="movement-rail-progress">
            {`progress · ${past.length} ${past.length === 1 ? 'entry' : 'entries'}, not enough to draw`}
          </p>

          <button type="button" class="movement-add-block hit" onClick={openBlock}>
            + posture block
          </button>
        </section>

        {block !== null ? (
          <section class="movement-fields">
            <div class="movement-head">
              <h1 class="movement-title">posture</h1>
              <button type="button" class="movement-change hit" onClick={() => setBlock(null)}>
                a segment instead
              </button>
            </div>

            <Previous
              entry={lastPosture}
              locale={locale}
              render={(entry) => postureLine(entry.payload as Posture)}
            />

            <div class="movement-row">
              <label class="movement-field">
                <span class="movement-label">span</span>
                <AmountStepper
                  key={`span-${filled}`}
                  value={block.span_hours}
                  unit="h"
                  step={config.hours_step}
                  onChange={(span_hours) => setBlock({ ...block, span_hours })}
                  label="span"
                />
              </label>

              <label class="movement-field">
                <span class="movement-label">sitting</span>
                <AmountStepper
                  key={`sitting-${filled}`}
                  value={block.sitting_hours}
                  unit="h"
                  step={config.hours_step}
                  onChange={(sitting_hours) => setBlock({ ...block, sitting_hours })}
                  label="sitting"
                />
              </label>
            </div>

            {/* the bar and nothing beside it: the block is one entry for the
                whole day, and the reading is how the two parts sit */}
            <PostureBar span={block.span_hours} sitting={block.sitting_hours} />

            <div class="movement-actions">
              <button type="button" class="movement-log hit" onClick={() => log(block)}>
                log the block
              </button>
              <button
                type="button"
                class="movement-repeat hit"
                disabled={lastPosture === null}
                onClick={repeatBlock}
              >
                same as yesterday
              </button>
            </div>
          </section>
        ) : (
          <section class="movement-fields">
            {picked === null || segment === null ? (
              <>
                <h1 class="movement-title">segment</h1>
                <LibraryPicker
                  items={library.map((item) => ({
                    id: item.id,
                    name: item.name,
                    hint: hintOf(item),
                  }))}
                  onPick={start}
                  onNew={create}
                  newLabel="+ new segment"
                />
              </>
            ) : (
              <>
                <div class="movement-head">
                  <h1 class="movement-title">{segment.name}</h1>
                  <span class="movement-hint">{hintOf(segment)}</span>
                  <button
                    type="button"
                    class="movement-change hit"
                    onClick={() => setPicked(null)}
                  >
                    change
                  </button>
                </div>

                <Previous
                  entry={previousSegment(picked.segment_id)}
                  locale={locale}
                  render={(entry) => segmentLine(entry.payload as Segmented)}
                />

                <div class="movement-row">
                  <label class="movement-field">
                    <span class="movement-label">duration</span>
                    <AmountStepper
                      key={`duration-${filled}`}
                      value={picked.duration_min}
                      unit="min"
                      step={config.duration_step}
                      onChange={(duration_min) => setPicked({ ...picked, duration_min })}
                      label="duration"
                    />
                  </label>

                  <div class="movement-field">
                    {/* speed, and no second axis asking how hard it was —
                        nothing is being progressively loaded on a walk */}
                    <span class="movement-label">speed</span>
                    <LevelControl
                      scale={scale}
                      value={picked.level}
                      onChange={(level) => setPicked({ ...picked, level })}
                      label="speed"
                    />
                  </div>
                </div>
              </>
            )}

            <div class="movement-actions">
              <button
                type="button"
                class="movement-log hit"
                disabled={picked === null}
                onClick={() => picked !== null && log(picked)}
              >
                log it
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

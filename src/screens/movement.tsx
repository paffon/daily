import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { newEntry, toIso } from '../data/entry'
import { deleteEntry, putEntry, readEntries, readJson, updateEntry, writeJson } from '../data/store'
import type { Segment } from '../data/segment'
import { hintOf, loadSegments } from '../data/segment'
import { loadLevels } from '../data/food'
import { Danger, Previous, Timestamp, clockOf, dayTimeOf } from '../components/fields'
import { LibraryPicker } from '../components/library_picker'
import { AmountStepper } from '../components/amount_stepper'
import { LevelControl } from '../components/level_control'
import { PostureBar } from '../components/posture_bar'
import { registerEditor } from './edit_entry'
import appSeed from '../seed/app.json'
import './movement.css'

/** Frame 4d, list-first since 2026-08-06 like every other module. One module
 *  holding two genuinely different things: a segment is an event and a posture
 *  block is a proportion. They are told apart by `payload.type` and never by a
 *  sixth module — the walk and the workday are the same day's movement, and
 *  splitting them would put half of it behind a tile the user does not think
 *  of as a module. */

/* not `Segmented` — that is the shared control's name, and a local type
   wearing it would silently shadow the import anyone reaches for next */
type Walk = { type: 'segment'; segment_id: string; duration_min: number; level: string }

type Posture = { type: 'posture'; span_hours: number; sitting_hours: number }

/** The seed under the stored section, because `ensureSeeded` writes a file
 *  only when the whole thing is absent and never backfills a key added later.
 *  The same defence P6 and P8 wrote, in the fourth phase to need it. */
const movementConfig = (): typeof appSeed.movement => ({
  ...appSeed.movement,
  ...readJson('config/app.json', appSeed).movement,
})

const isPosture = (entry: Entry): boolean => entry.payload['type'] === 'posture'

/** A segment the library no longer has — renamed or deleted on another device,
 *  since nothing in a seed is protected. The entry keeps saying what it said. */
const asSegment = (id: string, library: Segment[]): Segment =>
  library.find((item) => item.id === id) ?? { id, name: id }

/** `18 min · steady`, which is the same sentence the list and `Previous` say. */
const segmentLine = ({ duration_min, level }: Walk): string =>
  [`${duration_min} min`, level].filter((part) => part !== '').join(' · ')

/** `8 h · 6 sitting` — the block's own two numbers and no third one derived
 *  from them. A percentage here would be the bar said again in the register
 *  the module exists to avoid. */
const postureLine = ({ span_hours, sitting_hours }: Posture): string =>
  `${span_hours} h · ${sitting_hours} sitting`

/** What a row says about either entry type — home's recent row and this
 *  module's own list, so the two never drift apart. */
export const movementLine = (entry: Entry): string =>
  isPosture(entry)
    ? `posture · ${postureLine(entry.payload as Posture)}`
    : `${asSegment((entry.payload as Walk).segment_id, loadSegments()).name} · ${segmentLine(
        entry.payload as Walk,
      )}`

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

  const logged = payload as Walk
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

/** One movement entry being logged or corrected — a segment or a posture
 *  block, decided by which `+ new` was pressed or by what the entry already
 *  is. `entry` is null for a new one; both wear the same screen. */
function Builder({ entry, kind, locale, onClose }: {
  entry: Entry | null
  kind: 'segment' | 'posture'
  locale: string
  onClose: () => void
}): VNode {
  const config = movementConfig()
  const library = loadSegments()
  const scale = scaleOf()

  const stored = entry === null ? null : (entry.payload as Walk | Posture)

  const [ts, setTs] = useState(() => entry?.ts ?? toIso(new Date()))
  const [picked, setPicked] = useState<Walk | null>(() =>
    stored !== null && stored.type === 'segment' ? { ...stored } : null,
  )
  const [block, setBlock] = useState<Posture | null>(() =>
    stored !== null && stored.type === 'posture'
      ? { ...stored }
      : entry === null && kind === 'posture'
        ? { type: 'posture', span_hours: config.span_start, sitting_hours: config.sitting_start }
        : null,
  )
  /* every stepper holds what was typed into it, so a number replaced from
     outside the box — a fresh pick, an opened block, `same as yesterday` —
     has to remount it, or the box goes on showing the last entry's figure
     while the payload carries this one's */
  const [filled, setFilled] = useState(0)
  const fill = () => setFilled((n) => n + 1)
  /** The entry being corrected cannot be its own previous. */
  const [past] = useState(() => readEntries('movement').filter((line) => line.id !== entry?.id))

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

  /** Nothing in a seed list is protected — `DESIGN.md` §7. The library loses
   *  the name and the log keeps its numbers: an entry naming a removed segment
   *  still renders through `asSegment`'s fallback. */
  const remove = (id: string) => {
    writeJson(
      'library/segments.json',
      library.filter((item) => item.id !== id),
    )
    fill()
  }

  const repeatBlock = () => {
    if (lastPosture === null) return
    fill()
    setBlock({ ...lastPosture.payload } as Posture)
  }

  const save = (payload: Walk | Posture) => {
    if (entry === null) putEntry(newEntry('movement', { ...payload }, ts))
    else updateEntry({ ...entry, ts, payload: { ...payload } })
    onClose()
  }

  /** Scoped to the route, not to the day: the last time *this* walk was
   *  logged, however long ago. A posture block's previous is the last block
   *  outright — there is only one kind of workday. */
  const previousSegment = (segment_id: string): Entry | null =>
    past.find((line) => !isPosture(line) && (line.payload as Walk).segment_id === segment_id) ?? null

  const segment = picked === null ? null : asSegment(picked.segment_id, library)

  const strip = (
    <header class="movement-strip">
      <button type="button" class="movement-back hit" onClick={onClose}>
        ← &nbsp;movement
      </button>
      <Timestamp value={ts} onChange={setTs} locale={locale} />
    </header>
  )

  const remove_ = entry === null ? null : (
    <Danger
      onClick={() => {
        deleteEntry(entry.id)
        onClose()
      }}
    />
  )

  if (block !== null) {
    return (
      <main class="movement">
        {strip}
        <div class="movement-split">
          <section class="movement-fields">
            <div class="movement-head">
              <h1 class="movement-title">posture</h1>
            </div>

            <Previous
              entry={lastPosture}
              locale={locale}
              render={(line) => postureLine(line.payload as Posture)}
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
              <button type="button" class="movement-log hit" onClick={() => save(block)}>
                {entry === null ? 'log the block' : 'save the block'}
              </button>
              <button
                type="button"
                class="movement-repeat hit"
                disabled={lastPosture === null}
                onClick={repeatBlock}
              >
                same as yesterday
              </button>
              {remove_}
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main class="movement">
      {strip}
      <div class="movement-split">
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
                onDelete={remove}
                newLabel="+ new segment"
              />
            </>
          ) : (
            <>
              <div class="movement-head">
                <h1 class="movement-title">{segment.name}</h1>
                <span class="movement-hint">{hintOf(segment)}</span>
                <button type="button" class="movement-change hit" onClick={() => setPicked(null)}>
                  change
                </button>
              </div>

              <Previous
                entry={previousSegment(picked.segment_id)}
                locale={locale}
                render={(line) => segmentLine(line.payload as Walk)}
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
              onClick={() => picked !== null && save(picked)}
            >
              {entry === null ? 'log it' : 'save it'}
            </button>
            {remove_}
          </div>
        </section>
      </div>
    </main>
  )
}

export function Movement(): VNode {
  const { locale } = readJson('config/app.json', appSeed)

  /** `null` is the list; a kind or an entry opens the same builder. */
  const [open, setOpen] = useState<Entry | 'segment' | 'posture' | null>(null)
  const [past, setPast] = useState(() => readEntries('movement'))

  const today = new Date().toDateString()
  const isToday = (entry: Entry) => new Date(entry.ts).toDateString() === today

  if (open !== null) {
    const entry = typeof open === 'string' ? null : open
    return (
      <Builder
        key={entry === null ? String(open) : entry.id}
        entry={entry}
        kind={
          typeof open === 'string' ? open : isPosture(open) ? 'posture' : 'segment'
        }
        locale={locale}
        onClose={() => {
          setPast(readEntries('movement'))
          setOpen(null)
        }}
      />
    )
  }

  /** One row, either type. A block says so in its own line, so the two read
   *  apart in a list that is not grouped. Today's rows carry the clock and
   *  older ones the date, because "which day" is the whole question about an
   *  entry that is not today's. */
  const rows = (entries: Entry[]) =>
    entries.map((entry) => (
      <button
        type="button"
        class="movement-rail-row hit"
        key={entry.id}
        onClick={() => setOpen(entry)}
      >
        <span class="movement-rail-when">
          {isToday(entry) ? clockOf(entry.ts, locale) : dayTimeOf(entry.ts, locale)}
        </span>
        <span class="movement-rail-what">{movementLine(entry)}</span>
      </button>
    ))

  const earlier = past.filter((entry) => !isToday(entry))

  return (
    <main class="movement">
      <header class="movement-strip">
        <a class="movement-back hit" href="#/">
          ← &nbsp;movement
        </a>
      </header>

      <section class="movement-rail movement-rail-page">
        {/* two entry types, so two doors — a walk and a workday are not the
            same kind of thing and neither is the other's default */}
        <div class="movement-new-pair">
          <button type="button" class="movement-new hit" onClick={() => setOpen('segment')}>
            + new segment
          </button>
          <button type="button" class="movement-add-block hit" onClick={() => setOpen('posture')}>
            + posture block
          </button>
        </div>

        {past.some(isToday) && (
          <>
            <h2 class="movement-rail-label">today</h2>
            {rows(past.filter(isToday))}
          </>
        )}

        {earlier.length > 0 && (
          <>
            <h2 class="movement-rail-label">earlier</h2>
            {rows(earlier)}
          </>
        )}

        <p class="movement-rail-progress">
          {`progress · ${past.length} ${past.length === 1 ? 'entry' : 'entries'}, not enough to draw`}
        </p>
      </section>
    </main>
  )
}

/** The export — `DESIGN.md` §10.3. One report, one file: a self-contained
 *  HTML document holding everything the active profile has recorded, written
 *  for two readers. A trainer is sent the file and opens it; an LLM is handed
 *  the text copied out of it. Prose and tables, never a database dump — the
 *  copied-out text has to read as a document, so the document is what is
 *  built.
 *
 *  It states, it does not judge: no scores, no totals dressed as a verdict,
 *  no commentary. Comments and next-time marks are kept — they are the half
 *  worth having, and a report that dropped them would be numbers with the
 *  reasoning taken out.
 *
 *  Pictures come from Drive as the report is built, because photos are never
 *  mirrored (§10.2). Offline it still builds, and it names the pictures it
 *  could not reach rather than refusing to produce anything. */

import type { Entry } from './entry'
import { toIso } from './entry'
import { readEntries, readJson } from './store'
import { activeProfile } from './profile'
import type { Exercise } from './exercise'
import { asExercise, fieldsFor, loadExercises, performedIn, setLine } from './exercise'
import type { Food, Logged } from './food'
import { asFood, commentOf, foodsIn, loadFoods, nutritionFor, nutritionLine, unitOf } from './food'
import type { Segment } from './segment'
import { asSegment, hintOf, loadSegments } from './segment'
import { getBlob } from './drive'
import { itemPhotoPath, photoOf } from './photos'
import appSeed from '../seed/app.json'

/** An entry's timestamp read in the offset the entry itself carries, rather
 *  than in whatever zone the report happens to be built in. `new Date(ts)`
 *  alone would render a 07:40 workout as 04:40 on a machine set to UTC and as
 *  13:40 on one set to Tokyo, so a week abroad would rewrite the hours of
 *  every past session. The offset is written into every `ts` for this reason
 *  (`toIso`), and a document that outlives the device has to keep it: history
 *  says what the clock on the wall said. Shifting the instant by the offset
 *  and reading it as UTC is that wall clock. A `ts` without an offset has no
 *  wall clock of its own, so it keeps the reader's. */
const OFFSET = /(?:Z|([+-])(\d{2}):(\d{2}))$/

const asWritten = (ts: string): { at: Date; zone: string | undefined } => {
  const found = OFFSET.exec(ts)
  const at = new Date(ts)
  if (found === null) return { at, zone: undefined }
  const [, sign, hours, minutes] = found
  const offset =
    sign === undefined ? 0 : (sign === '-' ? -1 : 1) * (Number(hours) * 60 + Number(minutes))
  return { at: new Date(at.getTime() + offset * 60_000), zone: 'UTC' }
}

/** A report spans months and can span years, so unlike the rails' `12 july`
 *  the year is part of the fact here — the file is read long after the
 *  conversation that would have supplied it. Lowercased like every date the
 *  app writes. */
const format = (ts: string, locale: string, opts: Intl.DateTimeFormatOptions): string => {
  const { at, zone } = asWritten(ts)
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: zone }).format(at).toLowerCase()
}

const dayOf = (ts: string, locale: string): string =>
  format(ts, locale, { day: 'numeric', month: 'long', year: 'numeric' })

const whenOf = (ts: string, locale: string): string =>
  `${dayOf(ts, locale)} ${format(ts, locale, { hour: '2-digit', minute: '2-digit' })}`

/** Everything user-written lands in markup — names, comments, units — and a
 *  food called `<pizza>` has to read as one, not vanish into a tag. */
const esc = (text: string): string =>
  text.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)

/** One picture the report wants: where it lives, and how to say its name if
 *  it cannot be fetched — `named` is prose because a Drive path names nothing
 *  a trainer recognises. `expected` tells an absent file from an ordinary one:
 *  most items simply have no picture and that is silence, but a body entry
 *  names its photo, so a body photograph that is not in Drive is reported
 *  missing rather than skipped. */
type Wanted = { path: string; named: string; expected: boolean }

/** The bytes behind a path, as a `data:` URI the document can carry itself.
 *  `null` when Drive has never held the file. A failure to reach Drive is
 *  left to throw — the caller names the picture instead of losing it. */
async function embedded(path: string): Promise<string | null> {
  const blob = await getBlob(path)
  if (blob === null) return null
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error(`the picture at ${path} could not be read`))
    reader.readAsDataURL(blob)
  })
}

/** Every picture fetched, sorted into what arrived and what has to be named.
 *  Each is asked for once however often its item recurs (§10.3). */
async function fetchPictures(
  wanted: Wanted[],
): Promise<{ srcs: Map<string, string>; unreached: string[] }> {
  const srcs = new Map<string, string>()
  const unreached: string[] = []
  await Promise.all(
    wanted.map(async (want) => {
      try {
        const src = await embedded(want.path)
        if (src !== null) srcs.set(want.path, src)
        else if (want.expected) unreached.push(want.named)
      } catch {
        unreached.push(want.named)
      }
    }),
  )
  return { srcs, unreached }
}

/* ── The sections ──────────────────────────────────────────────────────────
   Each writes one module's entries, oldest first: the app's lists read
   newest-first because logging looks backwards one step, but a report is a
   history and reads forward. An empty module says so in the app's own words
   rather than disappearing — a module that was never used is a fact too. */

const NOTHING = '<p class="empty">nothing recorded</p>'

const section = (title: string, body: string): string =>
  `<section><h2>${title}</h2>${body === '' ? NOTHING : body}</section>`

/** `47.5 kg × 10` beside `more` — the set and the decision made about it, the
 *  same pair the module shows (§7.1). */
function workoutSection(entries: Entry[], locale: string): string {
  const library = loadExercises().exercises
  const blocks = entries.map((entry) => {
    const performed = performedIn(entry)
    const done = performed.map((did) => {
      const exercise = asExercise(did, library)
      const fields = fieldsFor(exercise)
      const rows = did.sets
        .map(
          (set) =>
            `<tr><td class="mono">${esc(setLine(set, fields))}</td>` +
            `<td class="mark">${esc(set.mark)}</td></tr>`,
        )
        .join('')
      const comment = did.comment === '' ? '' : `<p class="quote">${esc(did.comment)}</p>`
      return `<div class="performed"><h4>${esc(exercise.name)}</h4><table>${rows}</table>${comment}</div>`
    })
    const body = done.length === 0 ? '<p class="empty">nothing done</p>' : done.join('')
    return `<article><h3 class="mono">${whenOf(entry.ts, locale)}</h3>${body}</article>`
  })
  return section('workout', blocks.join(''))
}

/** A meal is its foods, food by food: what, how much, at what level, the
 *  numbers the library carries for it, and the comment. Per entry only —
 *  nothing sums these, in the report as in the app. */
function nutritionSection(entries: Entry[], locale: string): string {
  const library = loadFoods()
  const row = (logged: Logged): string => {
    const food = asFood(logged.food_id, library)
    const measure = [String(logged.amount), unitOf(library, food, logged.amount)]
      .filter((part) => part !== '')
      .join(' ')
    const numbers = nutritionLine(nutritionFor(food, logged.amount, logged.level))
    const comment = commentOf(logged)
    return (
      `<tr><td class="name">${esc(food.name)}</td><td class="mono">${esc(measure)}</td>` +
      `<td>${esc(logged.level)}</td><td class="mono">${esc(numbers)}</td>` +
      `<td class="quote">${esc(comment)}</td></tr>`
    )
  }
  const blocks = entries.map(
    (entry) =>
      `<article><h3 class="mono">${whenOf(entry.ts, locale)}</h3>` +
      `<table class="meal">${foodsIn(entry).map(row).join('')}</table></article>`,
  )
  return section('nutrition', blocks.join(''))
}

/** Two tables, because they are genuinely different data (§8.3): a segment is
 *  an event, a posture block is a proportion. */
function movementSection(entries: Entry[], locale: string): string {
  const library = loadSegments()
  const walks = entries.filter((entry) => entry.payload['type'] !== 'posture')
  const blocks = entries.filter((entry) => entry.payload['type'] === 'posture')

  const walkRows = walks
    .map((entry) => {
      const { segment_id, duration_min, level } = entry.payload as {
        segment_id: string
        duration_min: number
        level: string
      }
      return (
        `<tr><td class="mono when">${whenOf(entry.ts, locale)}</td>` +
        `<td class="name">${esc(asSegment(segment_id, library).name)}</td>` +
        `<td class="mono">${duration_min} min</td><td>${esc(level)}</td></tr>`
      )
    })
    .join('')
  const blockRows = blocks
    .map((entry) => {
      const { span_hours, sitting_hours } = entry.payload as {
        span_hours: number
        sitting_hours: number
      }
      return (
        `<tr><td class="mono when">${whenOf(entry.ts, locale)}</td>` +
        `<td class="mono">${span_hours} h · ${sitting_hours} sitting</td></tr>`
      )
    })
    .join('')

  const parts = [
    walkRows === '' ? '' : `<h3>segments</h3><table>${walkRows}</table>`,
    blockRows === '' ? '' : `<h3>posture</h3><table>${blockRows}</table>`,
  ]
  return section('movement', parts.join(''))
}

function danceSection(entries: Entry[], locale: string): string {
  const rows = entries
    .map((entry) => {
      const { duration_min, level } = entry.payload as { duration_min: number; level: string }
      return (
        `<tr><td class="mono when">${whenOf(entry.ts, locale)}</td>` +
        `<td class="mono">${duration_min} min</td><td>${esc(level)}</td></tr>`
      )
    })
    .join('')
  return section('dance', rows === '' ? '' : `<table>${rows}</table>`)
}

/** Weights and photographs in one chronological flow, so every photograph
 *  stands beside the weights of its time (§10.3). A photograph's caption also
 *  carries the weight recorded on its own day, when one was. */
function bodySection(
  entries: Entry[],
  srcs: Map<string, string>,
  locale: string,
  body: typeof appSeed.body,
): string {
  const weightOf = (entry: Entry): string | null => {
    const weight = entry.payload['weight']
    return typeof weight === 'number'
      ? `${weight.toFixed(body.weight_decimals)} ${body.weight_unit}`
      : null
  }
  const sameDay = (ts: string): string | null => {
    const held = entries.find(
      (entry) => entry.ts.slice(0, 10) === ts.slice(0, 10) && weightOf(entry) !== null,
    )
    return held === undefined ? null : weightOf(held)
  }

  const parts: string[] = []
  /* consecutive weights gather into one table; a photograph closes it and
     stands on its own, which is what interleaves the two by time */
  let rows: string[] = []
  const flush = () => {
    if (rows.length > 0) parts.push(`<table>${rows.join('')}</table>`)
    rows = []
  }
  for (const entry of entries) {
    const path = photoOf(entry.payload)
    if (path === null) {
      rows.push(
        `<tr><td class="mono when">${whenOf(entry.ts, locale)}</td>` +
          `<td class="mono">${esc(weightOf(entry) ?? '—')}</td></tr>`,
      )
      continue
    }
    const src = srcs.get(path)
    if (src === undefined) continue // named among the unreached instead
    flush()
    const weighed = sameDay(entry.ts)
    /* the weight string carries the configured unit, and the unit is the
       user's text — escaped here as it is in the weight rows above */
    const caption = [whenOf(entry.ts, locale), weighed === null ? '' : esc(weighed)].filter(
      (part) => part !== '',
    )
    parts.push(
      `<figure><img src="${src}" alt="body photograph, ${dayOf(entry.ts, locale)}">` +
        `<figcaption class="mono">${caption.join(' · ')}</figcaption></figure>`,
    )
  }
  flush()
  return section('body', parts.join(''))
}

/* ── The libraries ─────────────────────────────────────────────────────────
   What the log's names refer to, as the library holds them today — only the
   items the entries actually name, because the rest is a catalog and a
   catalog is a database dump. Pictures land here, each one once. */

const bare = (parts: (string | null)[]): string =>
  parts.filter((part): part is string => part !== null && part !== '').join(' · ')

function exerciseItems(used: Exercise[], srcs: Map<string, string>): string {
  const items = used.map((exercise) => {
    const src = srcs.get(itemPhotoPath('exercise', exercise.id))
    const picture =
      src === undefined ? '' : `<img class="item" src="${src}" alt="${esc(exercise.name)}">`
    const facts = bare([
      exercise.body_part,
      exercise.kind,
      exercise.rep_scheme === undefined ? null : `rep scheme ${exercise.rep_scheme}`,
    ])
    const notes =
      exercise.notes === undefined || exercise.notes === ''
        ? ''
        : `<p class="quote">${esc(exercise.notes)}</p>`
    return (
      `<div class="entry">${picture}<div><h4>${esc(exercise.name)}</h4>` +
      `${facts === '' ? '' : `<p>${esc(facts)}</p>`}${notes}</div></div>`
    )
  })
  return items.join('')
}

function foodItems(used: Food[], srcs: Map<string, string>): string {
  const items = used.map((food) => {
    const src = srcs.get(itemPhotoPath('food', food.id))
    const picture = src === undefined ? '' : `<img class="item" src="${src}" alt="${esc(food.name)}">`
    const numbers = nutritionLine({ kcal: food.kcal ?? null, protein: food.protein ?? null })
    const facts = bare([
      food.unit === '' ? null : `per ${food.unit}`,
      numbers === '' ? null : `normal is ${numbers}`,
    ])
    const examples =
      food.examples === undefined
        ? ''
        : Object.entries(food.examples)
            .map(([level, prose]) => `<p class="quote">${esc(level)} — ${esc(prose)}</p>`)
            .join('')
    return (
      `<div class="entry">${picture}<div><h4>${esc(food.name)}</h4>` +
      `${facts === '' ? '' : `<p>${esc(facts)}</p>`}${examples}</div></div>`
    )
  })
  return items.join('')
}

function segmentItems(used: Segment[]): string {
  const items = used.map((segment) => {
    const hint = hintOf(segment)
    return (
      `<div class="entry"><div><h4>${esc(segment.name)}</h4>` +
      `${hint === '' ? '' : `<p>${esc(hint)}</p>`}</div></div>`
    )
  })
  return items.join('')
}

/** The items a set of entries names, resolved against the library the way
 *  every screen resolves them, alphabetical because this part is read as a
 *  glossary rather than as a timeline. */
function usedItems<T extends { name: string }>(ids: string[], resolve: (id: string) => T): T[] {
  return [...new Set(ids)]
    .map(resolve)
    .sort((a, b) => a.name.localeCompare(b.name))
}

/* ── The document ────────────────────────────────────────────────────────── */

/** Self-contained on purpose: no script, no webfont, nothing fetched when it
 *  is opened — the file is sent to someone whose network the app knows
 *  nothing about. The palette is the app's own (`tokens.css`); the families
 *  are the app's fallbacks, since the named fonts live on a CDN. */
const STYLE = `
  :root {
    --paper: oklch(0.963 0.005 255);
    --paper-quote: oklch(0.941 0.006 255);
    --ink: oklch(0.19 0.014 265);
    --ink-body: oklch(0.23 0.014 265);
    --mono: oklch(0.54 0.012 260);
    --mono-faint: oklch(0.65 0.012 260);
    --rule: oklch(0.87 0.006 255);
    --rule-light: oklch(0.915 0.005 255);
    --family-serif: Georgia, serif;
    --family-mono: ui-monospace, monospace;
    --family-sans: system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0 auto;
    padding: 24px 16px 48px;
    max-width: 720px;
    background: var(--paper);
    color: var(--ink-body);
    font: 400 15px/1.55 var(--family-serif);
    overflow-x: clip;
    overflow-wrap: break-word;
  }
  h1 { font: 300 32px/1.2 var(--family-serif); color: var(--ink); margin: 0 0 4px; }
  header > p { color: var(--mono); margin: 0 0 8px; }
  h2 {
    font: 500 11px/1 var(--family-mono);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--mono);
    border-bottom: 1px solid var(--rule);
    padding-bottom: 6px;
    margin: 40px 0 12px;
  }
  h3 { font: 400 13px/1.3 var(--family-mono); color: var(--ink); margin: 20px 0 6px; }
  h4 { font: 500 14px/1.3 var(--family-sans); color: var(--ink); margin: 12px 0 2px; }
  p { margin: 2px 0; }
  table { border-collapse: collapse; width: 100%; margin: 4px 0; }
  td { border-top: 1px solid var(--rule-light); padding: 3px 12px 3px 0; vertical-align: top; }
  tr:first-child > td { border-top: none; }
  .mono { font-family: var(--family-mono); font-size: 13px; }
  .name { font-family: var(--family-sans); font-size: 13.5px; }
  .mark { font-family: var(--family-mono); font-size: 13px; color: var(--mono); }
  /* recurring columns hold one width across their section's tables, so a
     page of small tables reads as one ledger rather than a ragged stack */
  td.when { width: 30%; }
  .performed td:first-child { width: 55%; }
  .meal td:nth-child(1) { width: 22%; }
  .meal td:nth-child(2) { width: 13%; }
  .meal td:nth-child(3) { width: 12%; }
  .meal td:nth-child(4) { width: 26%; }
  .quote { font-style: italic; color: var(--mono); }
  .empty { color: var(--mono-faint); }
  .unreached { color: var(--mono); margin-top: 32px; }
  figure { margin: 16px 0; }
  figure > img { max-width: 100%; height: auto; }
  figcaption { color: var(--mono); font-size: 12px; margin-top: 4px; }
  .entry { display: flex; gap: 12px; margin: 10px 0; }
  img.item { width: 88px; height: 88px; object-fit: cover; flex: none; }
`

/** The whole report, as one HTML string the caller hands to a download. One
 *  profile per report — `readEntries` already reads as the active one, and
 *  entries belong to whoever recorded them (ADR 0004). */
export async function buildReport(): Promise<string> {
  const config = readJson('config/app.json', appSeed)
  const { locale } = config
  const profile = activeProfile()

  /* oldest first throughout — see the note above the sections */
  const workouts = readEntries('workout').reverse()
  const meals = readEntries('nutrition').reverse()
  const movement = readEntries('movement').reverse()
  const dance = readEntries('dance').reverse()
  const body = readEntries('body').reverse()

  const exercises = usedItems(
    workouts.flatMap((entry) => performedIn(entry).map((did) => did.exercise_id)),
    (id) => asExercise({ exercise_id: id, sets: [], comment: '' }, loadExercises().exercises),
  )
  const foods = loadFoods()
  const usedFoods = usedItems(
    meals.flatMap((entry) => foodsIn(entry).map((logged) => logged.food_id)),
    (id) => asFood(id, foods),
  )
  const segments = usedItems(
    movement
      .filter((entry) => entry.payload['type'] !== 'posture')
      .map((entry) => entry.payload['segment_id'] as string),
    (id) => asSegment(id, loadSegments()),
  )

  const wanted: Wanted[] = [
    ...exercises.map((exercise) => ({
      path: itemPhotoPath('exercise', exercise.id),
      named: `the picture of ${exercise.name}`,
      expected: false,
    })),
    ...usedFoods.map((food) => ({
      path: itemPhotoPath('food', food.id),
      named: `the picture of ${food.name}`,
      expected: false,
    })),
    ...body
      .filter((entry) => photoOf(entry.payload) !== null)
      .map((entry) => ({
        path: photoOf(entry.payload)!,
        named: `the body photograph of ${dayOf(entry.ts, locale)}`,
        expected: true,
      })),
  ]
  const { srcs, unreached } = await fetchPictures(wanted)

  const all = [...workouts, ...meals, ...movement, ...dance, ...body]
  const stamps = all.map((entry) => Date.parse(entry.ts)).filter((at) => !Number.isNaN(at))
  const written = toIso(new Date())
  const span =
    stamps.length === 0
      ? 'nothing recorded yet.'
      : `everything this profile has recorded, ` +
        `${dayOf(toIso(new Date(Math.min(...stamps))), locale)} to ` +
        `${dayOf(toIso(new Date(Math.max(...stamps))), locale)}.`

  const libraries =
    all.length === 0
      ? ''
      : `<section><h2>the libraries</h2>` +
        `<p>what the log's names refer to, as the library holds them today.</p>` +
        [
          exercises.length === 0 ? '' : `<h3>exercises</h3>${exerciseItems(exercises, srcs)}`,
          usedFoods.length === 0 ? '' : `<h3>foods</h3>${foodItems(usedFoods, srcs)}`,
          segments.length === 0 ? '' : `<h3>segments</h3>${segmentItems(segments)}`,
        ].join('') +
        `</section>`

  const missing =
    unreached.length === 0
      ? ''
      : `<p class="unreached">not reached when this report was written: ` +
        `${unreached.map(esc).join(' · ')}.</p>`

  return (
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>daily — ${esc(profile.name)}</title><style>${STYLE}</style></head><body>` +
    `<header><h1>daily — ${esc(profile.name)}</h1>` +
    `<p>${span} written ${dayOf(written, locale)}.</p></header>` +
    workoutSection(workouts, locale) +
    nutritionSection(meals, locale) +
    movementSection(movement, locale) +
    danceSection(dance, locale) +
    bodySection(body, srcs, locale, config.body) +
    libraries +
    missing +
    `</body></html>`
  )
}

/** `daily-report-omri-2026-08-07.html`. The profile is in the name because a
 *  report is one profile's (§10.3), and two profiles exported the same day
 *  should not fight over one filename. */
export function reportFileName(profileName: string, ts: string): string {
  const slug = profileName
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return `daily-report-${slug === '' ? 'profile' : slug}-${ts.slice(0, 10)}.html`
}

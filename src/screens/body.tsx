import { useEffect, useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry } from '../data/entry'
import { newEntry, toIso } from '../data/entry'
import { putEntry, readEntries, readJson } from '../data/store'
import { photoMonths, photoOf, photoUrl, putPhoto } from '../data/photos'
import { Previous, Timestamp, dayTimeOf, monthOf } from '../components/fields'
import { registerEditor } from './edit_entry'
import appSeed from '../seed/app.json'
import './body.css'

/** A weight and a time, or a photo. That is the whole module — `DESIGN.md`
 *  §8.5 considered tape measurements and declined them, and the third signal
 *  is already free in the workout log. */

type BodyConfig = typeof appSeed.body

/** Blanks are valid entries, so an empty or unreadable box records `null`
 *  rather than refusing the entry. */
const weightOf = (typed: string): number | null => {
  const value = Number(typed)
  return typed.trim() === '' || Number.isNaN(value) ? null : value
}

const weightText = (weight: unknown): string => (typeof weight === 'number' ? String(weight) : '')

/** `72.4 kg`, or `photo` for the module's other entry type. Both the unit and
 *  how finely it is written are config, never literals, and home reuses this
 *  so payload knowledge stays in the module that owns the payload. */
export function bodyLine(entry: Entry, body: BodyConfig): string {
  if (photoOf(entry.payload) !== null) return 'photo'
  const weight = entry.payload['weight']
  const written = typeof weight === 'number' ? weight.toFixed(body.weight_decimals) : '—'
  return `${written} ${body.weight_unit}`
}

/** The one thing on any screen that waits for the network: photos are not
 *  mirrored, so there is nothing local to draw from. Until the bytes arrive —
 *  or when they cannot — the path is shown, which still says which file the
 *  entry names. */
function Photo({ path }: { path: string }): VNode {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let made = ''
    let live = true
    /* dropped before the next one is fetched — the URL below is revoked on the
       way out, and holding it in the img would leave a dead src on screen */
    setUrl(null)
    void photoUrl(path).then((ready) => {
      if (ready === null) return
      if (live) {
        made = ready
        setUrl(ready)
      } else URL.revokeObjectURL(ready)
    })
    return () => {
      live = false
      if (made !== '') URL.revokeObjectURL(made)
    }
  }, [path])

  return url === null ? (
    <p class="body-photo-path">{path}</p>
  ) : (
    <img class="body-photo-shot" src={url} alt={path} loading="lazy" />
  )
}

/** Body's half of frame 4h. A photo entry has no field of its own — its
 *  timestamp and its delete are the screen's — so it renders the picture and
 *  nothing else. The weight box is uncontrolled on purpose: the payload holds
 *  the parsed number, and writing that number back mid-keystroke would swallow
 *  the dot the moment `72.` parses to 72. */
registerEditor('body', (payload, onChange) => {
  const { body } = readJson('config/app.json', appSeed)
  const path = photoOf(payload)
  if (path !== null) return <Photo path={path} />

  return (
    <div class="body-weight">
      <input
        class="body-weight-value"
        type="text"
        inputMode="decimal"
        aria-label="weight"
        defaultValue={weightText(payload['weight'])}
        onInput={(e) => onChange({ ...payload, weight: weightOf(e.currentTarget.value) })}
      />
      <span class="body-weight-unit">{body.weight_unit}</span>
    </div>
  )
})

export function Body(): VNode {
  const config = readJson('config/app.json', appSeed)
  const locale = config.locale

  const [entries, setEntries] = useState(() => readEntries('body'))
  const [weight, setWeight] = useState('')
  const [ts, setTs] = useState(() => toIso(new Date()))
  const [trouble, setTrouble] = useState('')
  /** A file is mid-drag over the photo press — the border that says the drop
   *  will land there. */
  const [over, setOver] = useState(false)

  const weights = entries.filter((entry) => photoOf(entry.payload) === null)
  const photos = entries.filter((entry) => photoOf(entry.payload) !== null)

  const log = () => {
    putEntry(newEntry('body', { weight: weightOf(weight) }, ts))
    setEntries(readEntries('body'))
    setWeight('')
    setTs(toIso(new Date()))
  }

  /** The bytes go up before the entry is written, so nothing is ever recorded
   *  pointing at a photo that is not there. Offline this is the one press in
   *  the app that cannot work, and saying so beats doing nothing visibly.
   *
   *  A photo is an addition, not an alternative: the weight box and the time
   *  are left as they are, so a weight typed before the picker still logs
   *  afterwards, at the same moment the photo was filed under. Fed by the
   *  picker and by a drop on the same press alike. */
  const addPhoto = async (file: Blob) => {
    setTrouble('')
    try {
      const path = await putPhoto(file, ts)
      putEntry(newEntry('body', { photo: path }, ts))
      setEntries(readEntries('body'))
    } catch {
      setTrouble('the photo did not reach drive — it is the one thing here that needs a signal.')
    }
  }

  const picked = (picker: HTMLInputElement) => {
    const file = picker.files?.[0]
    /* cleared so choosing the same file again is still a change event */
    picker.value = ''
    if (file !== undefined) void addPhoto(file)
  }

  /** §10.2's "adding an image is a file drop", honoured on the press itself —
   *  the body's photo as much as an item's. Not an image, and it is left
   *  where it was. */
  const dropped = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    const file = Array.from(e.dataTransfer?.files ?? []).find((one) =>
      one.type.startsWith('image/'),
    )
    if (file !== undefined) void addPhoto(file)
  }

  /* Both of these are about weights, because a line is what they are about
     not being enough to draw. Photos are counted in the rail and nowhere
     else. */
  const oldest = weights[weights.length - 1]
  const summary =
    oldest === undefined
      ? 'No weights recorded yet.'
      : `${weights.length} ${weights.length === 1 ? 'weight' : 'weights'} since ` +
        `${monthOf(oldest.ts, locale)}. Not enough to draw a line yet.`

  return (
    <main class="body">
      <header class="body-strip">
        <a class="body-back hit" href="#/">
          ← &nbsp;body
        </a>
        <span>{dayTimeOf(ts, locale)}</span>
      </header>

      <div class="body-split">
        <section class="body-rail">
          <h2 class="body-rail-label">recorded</h2>
          {weights.map((entry) => (
            <div class="body-rail-row" key={entry.id}>
              <span class="body-rail-when">{dayTimeOf(entry.ts, locale)}</span>
              <span class="body-rail-what">{bodyLine(entry, config.body)}</span>
            </div>
          ))}
          {photos.length > 0 && (
            <div class="body-rail-photos">
              <span class="body-rail-when">photos</span>
              <span class="body-rail-what">
                {`${photos.length} · ${photoMonths(photos, locale).join(', ')}`}
              </span>
            </div>
          )}
          <p class="body-rail-progress">
            {`progress · ${weights.length} ${weights.length === 1 ? 'entry' : 'entries'}, not enough to draw`}
          </p>
        </section>

        <section class="body-fields">
          <h1 class="body-title">weight</h1>

          <Previous
            entry={weights[0] ?? null}
            locale={locale}
            render={(entry) => bodyLine(entry, config.body)}
          />

          <div class="body-inputs">
            <div class="body-weight">
              <input
                class="body-weight-value"
                type="text"
                inputMode="decimal"
                aria-label="weight"
                value={weight}
                onInput={(e) => setWeight(e.currentTarget.value)}
              />
              <span class="body-weight-unit">{config.body.weight_unit}</span>
            </div>

            <div class="body-when">
              <span class="body-when-label">when</span>
              <Timestamp value={ts} onChange={setTs} locale={locale} />
            </div>
          </div>

          <div class="body-actions">
            <button type="button" class="body-log hit" onClick={log}>
              log it
            </button>
            {/* a label over a hidden input is the file picker — no ref, no
                synthetic click, and the whole control is the hit area. It is
                also the drop target, so the laptop half of §10 can skip the
                picker entirely */}
            <label
              class={over ? 'body-photo body-photo-over hit' : 'body-photo hit'}
              onDragOver={(e) => {
                if (!(e.dataTransfer?.types ?? []).includes('Files')) return
                e.preventDefault()
                setOver(true)
              }}
              onDragLeave={(e) => {
                /* into a child of the label fires this too, and is not leaving */
                if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
                setOver(false)
              }}
              onDrop={dropped}
            >
              <input
                type="file"
                accept="image/*"
                hidden
                aria-label="add a photo"
                onChange={(e) => picked(e.currentTarget)}
              />
              add a photo
            </label>
          </div>

          {trouble !== '' && <p class="body-trouble">{trouble}</p>}

          <p class="body-summary">{summary}</p>
        </section>
      </div>
    </main>
  )
}

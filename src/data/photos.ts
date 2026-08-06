/** The one thing in this app that does not go through the store. `store.ts`
 *  mirrors every path it writes into `localStorage`, and a photo is the only
 *  file here with real size — `docs/DESIGN.md` §12 R4 names asset weight as a
 *  live risk. So the bytes go straight to Drive and only the entry line naming
 *  the path is stored, which is also what keeps every other module's reads
 *  offline. */

import type { Entry } from './entry'
import { monthKey } from './entry'
import { getBlob, putFile } from './drive'
import { scope } from './profile'
import { readJson } from './store'
import { monthOf } from '../components/fields'
import appSeed from '../seed/app.json'

/** Spread over the seed rather than read straight off the file: `ensureSeeded`
 *  writes a config only when the whole file is absent and never backfills a
 *  key, so a browser holding a `config/app.json` from before this phase has
 *  none of these numbers. A missing edge length is `NaN`, and a canvas sized
 *  `NaN` uploads a photo nothing can open. */
const settings = () => ({ ...appSeed.images, ...readJson('config/app.json', appSeed).images })

/** The size to draw at. Never larger than the source — a phone photo is shrunk
 *  and a small one is left alone rather than blown up to the cap. */
export function fit(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** What to draw at, under either policy: an item picture is capped, a body
 *  photograph is drawn at the size it was shot (§10.2). This one branch is the
 *  whole of that split, and it sits out here rather than inside the canvas call
 *  because jsdom has no canvas — the same reason `fit` is its own function. */
export function drawAt(
  source: { width: number; height: number },
  max_edge?: number,
): { width: number; height: number } {
  return max_edge === undefined
    ? { width: source.width, height: source.height }
    : fit(source.width, source.height, max_edge)
}

/** One draw and one encode, which is everything the two photo paths share.
 *  Both come out JPEG and both are stored under a `.jpg` name: a phone
 *  shooting HEIC would otherwise put a file in Drive the app cannot display.
 *
 *  Never crops. The square frame an item's picture is shown in is a display
 *  decision (§10.2), and import is the one moment the discarded pixels cannot
 *  be got back.
 *
 *  Rejects rather than resolving something empty — an entry naming a photo
 *  that was never written is worse than the press doing nothing. */
async function encode(file: Blob, quality: number, max_edge?: number): Promise<Blob> {
  const source = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  try {
    const { width, height } = drawAt(source, max_edge)
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(source, 0, 0, width, height)
  } finally {
    /* the decoded bitmap is the large thing here — several times the file it
       came from — and it is held until it is closed */
    source.close()
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob === null ? reject(new Error('the photo could not be read')) : resolve(blob)),
      'image/jpeg',
      quality,
    )
  })
}

/** An item's picture is a reminder of which machine or which plate and is
 *  never studied, so it is capped at a small edge and a modest quality — the
 *  mitigation §12 R4 asks for, now spent here rather than on the body. */
export const shrinkItemPhoto = (file: Blob): Promise<Blob> =>
  encode(file, settings().item_quality, settings().item_max_edge)

/** A body photograph is the thing being measured, so it is kept at the
 *  resolution it was shot at (§10.2, reversing §12 R4 for the body alone) and
 *  re-encoded to JPEG all the same. */
export const recodeBodyPhoto = (file: Blob): Promise<Blob> => encode(file, settings().body_quality)

/** Straight to Drive, never through the store. The one write in the app that
 *  does not touch the mirror. */
export const putBinary = (path: string, blob: Blob): Promise<string> => putFile(path, blob)

/** `photos/2026-08-01.jpg`, and a second photo the same day replaces the
 *  first — one per day per profile is what the storage layout's filename
 *  allows, and the photo is a roughly monthly thing. A body photo is the
 *  body's, so it carries the profile scope the way an entries file does; the
 *  entry stores the full path, which is what keeps old lines pointing at the
 *  bare legacy names. `ts` carries its own offset, so its date part is
 *  already the local date.
 *
 *  Split out of `putPhoto` because the upload needs a canvas and the path does
 *  not, and the scoping is the part worth a test. */
export const bodyPhotoPath = (ts: string): string => `photos/${scope()}${ts.slice(0, 10)}.jpg`

export async function putPhoto(file: Blob, ts: string): Promise<string> {
  const path = bodyPhotoPath(ts)
  await putBinary(path, await recodeBodyPhoto(file))
  return path
}

/** `photos/exercise-<id>.jpg` — a library item's picture, resolved by naming
 *  convention the way `DESIGN.md` §10.2 asks. It sits beside the body photos,
 *  which are dated, so an id and a date cannot collide. */
export const itemPhotoPath = (kind: 'exercise' | 'food', id: string): string =>
  `photos/${kind}-${id}.jpg`

/** The path a payload names, or `null` when it is a weight. The one thing that
 *  tells the module's two entry types apart — a payload rather than an entry,
 *  because the edit screen hands its renderer only the payload. */
export const photoOf = (payload: Entry['payload']): string | null =>
  typeof payload['photo'] === 'string' ? payload['photo'] : null

/** `april, may, july` — the months named beside the rail's count, oldest first
 *  and each month said once however many photos it holds. Kept apart by month
 *  key rather than by name, or April this year and April the next would
 *  collapse into one and the rail would name fewer months than it counts. */
export function photoMonths(entries: Entry[], locale: string): string[] {
  const shot = entries.filter((entry) => photoOf(entry.payload) !== null)
  const named = shot.reverse().map((entry): [string, string] => [
    monthKey(entry.ts),
    monthOf(entry.ts, locale),
  ])
  return [...new Map(named).values()]
}

/** An object URL for a stored photo, or `null` when Drive cannot be reached.
 *  Photos are not mirrored, so there is nothing local to fall back to and an
 *  offline edit screen has to say so rather than show a broken image. The
 *  caller revokes the URL when it is done with it. */
export async function photoUrl(path: string): Promise<string | null> {
  try {
    const blob = await getBlob(path)
    return blob === null ? null : URL.createObjectURL(blob)
  } catch {
    return null
  }
}

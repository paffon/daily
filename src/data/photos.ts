/** The one thing in this app that does not go through the store. `store.ts`
 *  mirrors every path it writes into `localStorage`, and a photo is the only
 *  file here with real size — `docs/DESIGN.md` §12 R4 names asset weight as a
 *  live risk. So the bytes go straight to Drive and only the entry line naming
 *  the path is stored, which is also what keeps every other module's reads
 *  offline. */

import type { Entry } from './entry'
import { getBlob, putFile } from './drive'
import { readJson } from './store'
import { monthOf } from '../components/fields'
import appSeed from '../seed/app.json'

/** Spread over the seed rather than read straight off the file: `ensureSeeded`
 *  writes a config only when the whole file is absent and never backfills a
 *  key, so a browser holding a `config/app.json` from before this phase has
 *  neither of these numbers. A missing edge length is `NaN`, and a canvas
 *  sized `NaN` uploads a photo nothing can open. */
const settings = () => ({ ...appSeed.body, ...readJson('config/app.json', appSeed).body })

/** The size to draw at. Never larger than the source — a phone photo is shrunk
 *  and a small one is left alone rather than blown up to the cap. */
export function fit(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** Resize on import, which is the mitigation §12 R4 asks for: a phone camera
 *  writes several megabytes and what is kept is a couple of hundred kilobytes.
 *
 *  Rejects rather than resolving something empty — an entry naming a photo
 *  that was never written is worse than the press doing nothing. */
export async function resize(file: Blob): Promise<Blob> {
  const { photo_max_edge, photo_quality } = settings()
  const source = await createImageBitmap(file)
  const { width, height } = fit(source.width, source.height, photo_max_edge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(source, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob === null ? reject(new Error('the photo could not be read')) : resolve(blob)),
      'image/jpeg',
      photo_quality,
    )
  })
}

/** Straight to Drive, never through the store. The one write in the app that
 *  does not touch the mirror. */
export const putBinary = (path: string, blob: Blob): Promise<string> => putFile(path, blob)

/** `photos/2026-08-01.jpg`, and a second photo the same day replaces the
 *  first — one per day is what the storage layout's filename allows, and the
 *  photo is a roughly monthly thing. `ts` carries its own offset, so its date
 *  part is already the local date. */
export async function putPhoto(file: Blob, ts: string): Promise<string> {
  const path = `photos/${ts.slice(0, 10)}.jpg`
  await putBinary(path, await resize(file))
  return path
}

/** The path a payload names, or `null` when it is a weight. The one thing that
 *  tells the module's two entry types apart — a payload rather than an entry,
 *  because the edit screen hands its renderer only the payload. */
export const photoOf = (payload: Entry['payload']): string | null =>
  typeof payload['photo'] === 'string' ? payload['photo'] : null

/** `april, may, july` — the months named beside the rail's count, oldest first
 *  and each month said once however many photos it holds. */
export function photoMonths(entries: Entry[], locale: string): string[] {
  const shot = entries.filter((entry) => photoOf(entry.payload) !== null)
  return [...new Set(shot.reverse().map((entry) => monthOf(entry.ts, locale)))]
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

/** The movement library, and the config movement reads.
 *
 *  A segment is a named route. Only the name is required — an ad-hoc segment
 *  typed into the picker has nothing else, and blanks are valid everywhere. */

import { readJson } from './store'
import appSeed from '../seed/app.json'
import segmentsSeed from '../seed/segments.json'

export type Segment = {
  id: string
  /** The user's own name for it — `to work`, `stairs at home`. */
  name: string
  /** Both optional: a segment made mid-log is a name and nothing else. */
  distance_km?: number
  /** flat, rising, descending, mixed — prose, never a checked enum: the file
   *  is the user's, and a route they call `steep` is theirs to call that. */
  gradient?: string
}

export const loadSegments = (): Segment[] =>
  readJson<Segment[]>('library/segments.json', segmentsSeed)

/** `2.8 km · mixed`, and nothing at all for a segment carrying neither. */
export const hintOf = ({ distance_km, gradient }: Segment): string =>
  [distance_km === undefined ? '' : `${distance_km} km`, gradient ?? '']
    .filter((part) => part !== '')
    .join(' · ')

/** `ensureSeeded` writes a seed only when the whole file is absent, so a
 *  browser holding an `app.json` from before this phase has no `movement`
 *  section and `undefined` would reach the steppers. The fourth phase to write
 *  this defence; the duplication is the symptom of a store that never
 *  backfills a key. */
export const movementConfig = (): typeof appSeed.movement => ({
  ...appSeed.movement,
  ...readJson('config/app.json', appSeed).movement,
})

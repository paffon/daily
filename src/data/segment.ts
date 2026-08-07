/** The movement library. A segment is a named route, and only the name is
 *  required — an ad-hoc segment typed into the picker has nothing else, and
 *  blanks are valid everywhere. */

import { readJson } from './store'
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

/** A segment the library no longer has — renamed or deleted on another device,
 *  since nothing in a seed is protected. The entry keeps saying what it said. */
export const asSegment = (id: string, library: Segment[]): Segment =>
  library.find((item) => item.id === id) ?? { id, name: id }

/** `2.8 km · mixed`, and nothing at all for a segment carrying neither. */
export const hintOf = ({ distance_km, gradient }: Segment): string =>
  [distance_km === undefined ? '' : `${distance_km} km`, gradient ?? '']
    .filter((part) => part !== '')
    .join(' · ')

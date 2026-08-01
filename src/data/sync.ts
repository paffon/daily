/** The local mirror is the truth the app reads; Drive is where it survives.
 *  Reads never hit the network — that is what makes logging work in a
 *  basement. Writes land in the mirror, mark the path dirty, and a pass
 *  carries them up whenever there is a signal. */

import { getFile, listFiles, putFile, token } from './drive'
import type { Adapter } from './store'

/** Paths written locally that Drive has not seen. In `localStorage` rather
 *  than memory because a write made offline has to survive the browser being
 *  closed before it ever reaches Drive. */
const DIRTY_KEY = 'daily:dirty'

function dirty(): Set<string> {
  return new Set(JSON.parse(localStorage.getItem(DIRTY_KEY) ?? '[]') as string[])
}

function save(paths: Set<string>): void {
  localStorage.setItem(DIRTY_KEY, JSON.stringify([...paths]))
}

/** The mirror, handed over by the store at load. Kept here so the store can
 *  import this module without this module importing it back. */
let mirror: Adapter

/** The store's adapter, Drive-backed. `get` and `list` are the mirror's,
 *  untouched and synchronous. Only `set` gains anything, and it does not wait
 *  for the network either. */
export function driveAdapter(local: Adapter): Adapter {
  mirror = local
  return {
    ...local,
    set(path, text) {
      local.set(path, text)
      const paths = dirty()
      paths.add(path)
      save(paths)
      void syncNow()
    },
  }
}

/** Every dirty path up, clearing each flag as it lands. A failure leaves that
 *  path and everything after it dirty and stops — the next pass retries from
 *  there. The set is re-read each time so a write made during the pass is not
 *  cleared without having been sent. */
export async function push(): Promise<void> {
  for (const path of dirty()) {
    const text = mirror.get(path)
    if (text === null) continue
    try {
      await putFile(path, text)
    } catch {
      return
    }
    const paths = dirty()
    paths.delete(path)
    save(paths)
  }
}

/** Drive down into the mirror, skipping dirty paths. A dirty file holds a
 *  write the remote has not seen, so it wins — that is the whole of the
 *  conflict policy. */
export async function pull(): Promise<void> {
  const skip = dirty()
  for (const path of await listFiles()) {
    if (skip.has(path)) continue
    const text = await getFile(path)
    if (text !== null) mirror.set(path, text)
  }
}

let running: Promise<void> | null = null

/** `push` then `pull`, at most one in flight — a burst of writes joins the
 *  pass already going rather than queueing five of them. Signed out it does
 *  nothing at all: there is no token to spend and the mirror keeps the writes
 *  until there is one. */
export function syncNow(): Promise<void> {
  if (running !== null) return running
  if (token() === '') return Promise.resolve()

  running = (async () => {
    try {
      await push()
      await pull()
    } catch {
      /* offline, or the token expired mid-pass. Everything stays dirty and
         the next pass — on `online`, or on the next write — tries again. */
    } finally {
      running = null
    }
  })()
  return running
}

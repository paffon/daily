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
      /* If a pass is already running it may have read the dirty set before
         this write, so it owes the write another lap. Redundant when there is
         no pass — the one starting below clears the flag as it begins. */
      again = true
      void syncNow()
    },
  }
}

/** Every dirty path up, clearing each flag as it lands. A failure leaves that
 *  path and everything after it dirty and stops — the next pass retries from
 *  there. */
export async function push(): Promise<void> {
  for (const path of dirty()) {
    const text = mirror.get(path)
    try {
      if (text !== null) await putFile(path, text)
    } catch {
      return
    }
    /* Only clear the flag if the file still holds what was actually sent. A
       weight logged while this very upload was in flight rewrote the mirror,
       and clearing here would leave that entry clean but unsent — the pull
       right after would then overwrite it with the older remote copy and the
       entry would be gone from both sides. It stays dirty and goes up next
       pass instead. */
    if (mirror.get(path) !== text) continue
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

let running: Promise<boolean> | null = null
let again = false

/** `push` then `pull`, at most one in flight — a burst of writes joins the
 *  pass already going rather than queueing five of them, and a write that
 *  lands mid-pass gets a lap of its own rather than waiting for whatever
 *  happens next. Signed out it does nothing at all: there is no token to
 *  spend and the mirror keeps the writes until there is one.
 *
 *  Answers whether Drive was actually heard from — a caller about to write
 *  defaults needs to tell an empty Drive from an unreachable one. */
export function syncNow(): Promise<boolean> {
  if (running !== null) return running
  if (token() === '') return Promise.resolve(false)

  running = (async () => {
    try {
      do {
        again = false
        await push()
        await pull()
      } while (again)
      return true
    } catch {
      /* offline, or the token expired mid-pass. Everything stays dirty and
         the next pass — on `online`, or on the next write — tries again. */
      return false
    } finally {
      running = null
    }
  })()
  return running
}

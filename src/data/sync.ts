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

/** path → the `modifiedTime` of the copy the mirror already holds. Beside the
 *  dirty set and for the same reason: what a pull can skip has to survive the
 *  browser being closed, or every boot downloads everything again. */
const PULLED_KEY = 'daily:pulled'

function pulled(): Record<string, string> {
  return JSON.parse(localStorage.getItem(PULLED_KEY) ?? '{}') as Record<string, string>
}

function remember(times: Record<string, string>): void {
  localStorage.setItem(PULLED_KEY, JSON.stringify(times))
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
    let written: string | null = null
    try {
      if (text !== null) written = await putFile(path, text)
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
    /* The mirror now holds exactly what Drive holds, so the pull right after
       has nothing to fetch here. Without this line every write would still
       cost one download: its own upload, coming straight back. */
    if (written !== null) remember({ ...pulled(), [path]: written })
  }
}

/** Drive down into the mirror, skipping dirty paths. A dirty file holds a
 *  write the remote has not seen, so it wins — that is the whole of the
 *  conflict policy.
 *
 *  Only files whose `modifiedTime` has moved since this browser last took them
 *  are fetched. The list query hands that back for free, so a pass after a
 *  write is one round trip rather than one per file. */
export async function pull(): Promise<void> {
  const skip = dirty()
  const known = pulled()
  /* Rebuilt from the listing rather than edited in place, so a path that has
     left Drive leaves this with it — and a file that later reappears under the
     same name is fetched rather than skipped. */
  const times: Record<string, string> = {}

  for (const file of await listFiles()) {
    const held = known[file.path]
    if (skip.has(file.path)) {
      /* Not fetched, so the mirror still holds whatever it last took from
         Drive — carry that forward rather than claiming a time for text this
         browser has never seen. */
      if (held !== undefined) times[file.path] = held
      continue
    }
    if (held === file.modifiedTime) {
      times[file.path] = file.modifiedTime
      continue
    }
    const text = await getFile(file.path)
    if (text !== null) {
      mirror.set(file.path, text)
      times[file.path] = file.modifiedTime
    }
  }

  remember(times)
}

let running: Promise<boolean> | null = null
let again = false

/** Called when a pass ends, whatever it did. A pull can bring down entries
 *  logged on another device and a 401 during one drops the token — both change
 *  what should be on screen, and neither goes through a screen to get there.
 *  One listener, set by `main.tsx` at boot. */
let ended: () => void = () => {}

export function onPass(fn: () => void): void {
  ended = fn
}

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
      ended()
    }
  })()
  return running
}

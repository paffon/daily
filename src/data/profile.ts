/** Profiles: more than one log in the same Drive. The catalog — the libraries,
 *  their item photos, the app's config — is one copy every profile shares;
 *  entries, objectives and body photos belong to whoever recorded them.
 *  ADR 0004.
 *
 *  The original profile keeps the bare paths every existing file already has,
 *  so adding profiles never moves or rewrites a byte of history. A created
 *  profile writes under `<id>~` inside the same folders — `~` because no
 *  legacy filename contains one, which is what lets the original profile's
 *  listings tell its own files from everyone else's. */

import { readJson, writeJson } from './store'
import profilesSeed from '../seed/profiles.json'

export type Profile = { id: string; name: string }

/** The registry file: the profiles, and which of them is starred. `default`
 *  is optional because a registry written before starring existed has no such
 *  key, and `ensureSeeded` never backfills one — see `docs/OPEN.md`. */
type Registry = { profiles: Profile[]; default?: string }

/** The one profile whose files carry no prefix. */
export const ORIGINAL = 'main'

/** Which profile this device is reading as. Device state rather than data —
 *  it sits beside the mirror, never in it, and never syncs: each device is on
 *  whatever profile it was last switched to. */
const ACTIVE_KEY = 'daily:profile'

/** The device's own answer, and the registry's for a device that has none.
 *  A browser that has never been switched — a new phone, a cleared cache —
 *  opens on the starred profile rather than on the original one. */
export const activeId = (): string => localStorage.getItem(ACTIVE_KEY) ?? defaultId()

/** `4fd1a2b3~`, or nothing for the original profile. Applied to a filename and
 *  never to a folder, so Drive's layout stays exactly two segments deep and
 *  `drive.ts` does not know profiles exist. */
export function scope(): string {
  const id = activeId()
  return id === ORIGINAL ? '' : `${id}~`
}

const PATH = 'config/profiles.json'

/** The registry is shared data like the libraries are: a profile created on
 *  one device is a profile everywhere. */
const registry = (): Registry => readJson<Registry>(PATH, profilesSeed)

export const readProfiles = (): Profile[] => registry().profiles

/** The starred profile — what a browser opens on before it has an answer of
 *  its own. Shared like the rest of the file, so a star set on the laptop is
 *  the phone's first profile too; the active id beside it stays the device's.
 *  Nothing starred, or a registry older than starring, is the original one. */
export const defaultId = (): string => registry().default ?? ORIGINAL

/** Never null — a registry that has not synced yet still has to put a name on
 *  home, so an unlisted id answers with itself. */
export const activeProfile = (): Profile =>
  readProfiles().find((profile) => profile.id === activeId()) ?? {
    id: activeId(),
    name: activeId(),
  }

/** The id is minted rather than derived from the name: names are the user's
 *  to repeat or change, and a filename prefix has to be neither. Hex and
 *  dashes only, so it cannot collide with the `~` it is fenced by. */
export function createProfile(name: string): Profile {
  const profile = { id: crypto.randomUUID().slice(0, 8), name }
  const held = registry()
  writeJson(PATH, { ...held, profiles: [...held.profiles, profile] })
  return profile
}

export function switchTo(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id)
}

/** Star a profile. It is a statement about what loads, so it loads it: the
 *  registry gains the default and this device follows it now. Setting only
 *  the registry would look like nothing happened on the one browser that can
 *  see it — this device already holds an answer, and its own answer wins. */
export function makeDefault(id: string): void {
  writeJson(PATH, { ...registry(), default: id })
  switchTo(id)
}

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

/** The one profile whose files carry no prefix. */
export const ORIGINAL = 'main'

/** Which profile this device is reading as. Device state rather than data —
 *  it sits beside the mirror, never in it, and never syncs: each device is on
 *  whatever profile it was last switched to. */
const ACTIVE_KEY = 'daily:profile'

export const activeId = (): string => localStorage.getItem(ACTIVE_KEY) ?? ORIGINAL

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
export const readProfiles = (): Profile[] =>
  readJson<{ profiles: Profile[] }>(PATH, profilesSeed).profiles

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
  writeJson(PATH, { profiles: [...readProfiles(), profile] })
  return profile
}

export function switchTo(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id)
}

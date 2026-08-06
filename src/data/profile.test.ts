import { newEntry } from './entry'
import type { Entry } from './entry'
import {
  activeId,
  activeProfile,
  createProfile,
  defaultId,
  makeDefault,
  readProfiles,
  scope,
  switchTo,
} from './profile'
import { bodyPhotoPath, itemPhotoPath } from './photos'
import {
  getEntry,
  lastTouched,
  putEntry,
  readEntries,
  readJson,
  recentEntries,
  writeJson,
} from './store'

const weigh = (ts: string, weight: number): Entry => newEntry('body', { weight }, ts)

beforeEach(() => localStorage.clear())

describe('the profile registry', () => {
  it('starts as the original profile, whose scope is the bare path', () => {
    expect(activeId()).toBe('main')
    expect(scope()).toBe('')
    expect(readProfiles()).toEqual([{ id: 'main', name: 'main' }])
  })

  it('creates a profile with a minted id and lists it', () => {
    const made = createProfile('maya')
    expect(made.name).toBe('maya')
    expect(made.id).not.toBe('main')
    expect(made.id).not.toContain('~')
    expect(readProfiles().map((profile) => profile.name)).toEqual(['main', 'maya'])
  })

  it('answers with the active profile, and with the id itself before a sync', () => {
    const made = createProfile('maya')
    switchTo(made.id)
    expect(activeProfile()).toEqual(made)
    switchTo('never-synced')
    expect(activeProfile().name).toBe('never-synced')
  })
})

/* a browser that has never been switched. `localStorage.clear()` cannot stand
   in for it — the mirror is in there too, and clearing takes the registry the
   default is stored in with it */
const neverSwitched = (): void => localStorage.removeItem('daily:profile')

describe('the starred profile', () => {
  it('is the original one until something is starred', () => {
    expect(defaultId()).toBe('main')
    expect(activeId()).toBe('main')
  })

  it('is what a device with no answer of its own opens on', () => {
    const made = createProfile('maya')
    makeDefault(made.id)
    neverSwitched()
    expect(activeId()).toBe(made.id)
    expect(scope()).toBe(`${made.id}~`)
  })

  it('is shared data, and switches the device that starred it', () => {
    const made = createProfile('maya')
    makeDefault(made.id)
    expect(defaultId()).toBe(made.id)
    expect(activeId()).toBe(made.id)
    /* the star is written into the registry beside the profiles, never over
       them — the same file holds both */
    expect(readProfiles().map((profile) => profile.name)).toEqual(['main', 'maya'])
  })

  it('survives a profile created after it', () => {
    const made = createProfile('maya')
    makeDefault(made.id)
    createProfile('noa')
    expect(defaultId()).toBe(made.id)
  })

  it('loses to a device that has switched somewhere else', () => {
    makeDefault(createProfile('maya').id)
    switchTo('main')
    expect(activeId()).toBe('main')
  })

  it('reads as the original profile from a registry written before starring', () => {
    writeJson('config/profiles.json', { profiles: [{ id: 'main', name: 'main' }] })
    neverSwitched()
    expect(defaultId()).toBe('main')
    expect(activeId()).toBe('main')
  })
})

describe('what profiles separate', () => {
  it('writes a created profile under its own prefix and the original under none', () => {
    putEntry(weigh('2026-08-01T07:35:00+03:00', 72.4))
    expect(localStorage.getItem('daily:entries/body-2026-08.jsonl')).not.toBeNull()

    const made = createProfile('maya')
    switchTo(made.id)
    putEntry(weigh('2026-08-01T08:00:00+03:00', 61.2))
    expect(localStorage.getItem(`daily:entries/${made.id}~body-2026-08.jsonl`)).not.toBeNull()
    expect(localStorage.getItem('daily:entries/body-2026-08.jsonl')).not.toContain('61.2')
  })

  it('reads each profile its own records and nobody else’s', () => {
    const mine = weigh('2026-08-01T07:35:00+03:00', 72.4)
    putEntry(mine)

    const made = createProfile('maya')
    switchTo(made.id)
    expect(readEntries('body')).toHaveLength(0)
    expect(recentEntries(6)).toHaveLength(0)
    expect(lastTouched('body')).toBeNull()
    expect(getEntry(mine.id)).toBeNull()

    const hers = weigh('2026-08-01T08:00:00+03:00', 61.2)
    putEntry(hers)
    expect(readEntries('body')).toHaveLength(1)
    expect(getEntry(hers.id)?.payload['weight']).toBe(61.2)

    switchTo('main')
    expect(readEntries('body')).toHaveLength(1)
    expect(readEntries('body')[0]?.payload['weight']).toBe(72.4)
    expect(recentEntries(6)).toHaveLength(1)
    expect(getEntry(hers.id)).toBeNull()
  })

  /* a body photo is the body's, so its path carries the scope the way an
     entries file does — ADR 0004's other chokepoint, now that objectives are
     gone (ADR 0006) and `path()` in `objectives.ts` went with them */
  it('keeps body photos per profile', () => {
    expect(bodyPhotoPath('2026-08-01T07:35:00+03:00')).toBe('photos/2026-08-01.jpg')

    const made = createProfile('maya')
    switchTo(made.id)
    expect(bodyPhotoPath('2026-08-01T07:35:00+03:00')).toBe(`photos/${made.id}~2026-08-01.jpg`)

    switchTo('main')
    expect(bodyPhotoPath('2026-08-01T07:35:00+03:00')).toBe('photos/2026-08-01.jpg')
  })
})

describe('what profiles share', () => {
  it('reads the same libraries from every profile', () => {
    writeJson('library/exercises.json', { kinds: {}, marks: [], exercises: [{ id: 'x' }] })

    switchTo(createProfile('maya').id)
    const held = readJson<{ exercises: unknown[] }>('library/exercises.json', { exercises: [] })
    expect(held.exercises).toHaveLength(1)
  })

  /* the contrast ADR 0004 draws: the catalog is shared, so an item's picture
     is one file however many profiles the Drive holds */
  it('resolves a library item’s picture to one path from every profile', () => {
    const mine = itemPhotoPath('exercise', 'chest-press')
    switchTo(createProfile('maya').id)
    expect(itemPhotoPath('exercise', 'chest-press')).toBe(mine)
    expect(mine).not.toContain('~')
  })
})

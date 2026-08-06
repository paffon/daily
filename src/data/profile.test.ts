import { newEntry } from './entry'
import type { Entry } from './entry'
import { activeId, activeProfile, createProfile, readProfiles, scope, switchTo } from './profile'
import { readObjectives, writeObjectives } from './objectives'
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

  it('keeps objectives per profile', () => {
    writeObjectives({ statement: 'rebuild', targets: [] })

    const made = createProfile('maya')
    switchTo(made.id)
    expect(readObjectives().statement).toBe('')
    writeObjectives({ statement: 'hers', targets: [] })

    switchTo('main')
    expect(readObjectives().statement).toBe('rebuild')
    expect(localStorage.getItem(`daily:config/${made.id}~objectives.json`)).toContain('hers')
  })
})

describe('what profiles share', () => {
  it('reads the same libraries from every profile', () => {
    writeJson('library/exercises.json', { kinds: {}, marks: [], exercises: [{ id: 'x' }] })

    switchTo(createProfile('maya').id)
    const held = readJson<{ exercises: unknown[] }>('library/exercises.json', { exercises: [] })
    expect(held.exercises).toHaveLength(1)
  })
})

import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import {
  activeId,
  createProfile,
  defaultId,
  makeDefault,
  readProfiles,
  switchTo,
} from '../data/profile'
import './profiles.css'

/** Switching and creating end the same way: land on home as whoever is now
 *  active. The hash change is what repaints, so every screen remounts and
 *  reads the newly scoped paths rather than the state it was holding. */
const enter = (id: string): void => {
  switchTo(id)
  location.hash = '#/'
}

/** The registry, one row per profile, and a name box for the next one. What a
 *  profile is — same libraries, separate records — is ADR 0004's to say; this
 *  screen only lists and switches.
 *
 *  Since 2026-08-06 it is also the only place a profile is made (§2). The box
 *  is not focused on arrival: the screen's first job is switching, and stealing
 *  focus puts a keyboard over the list it opened to show.
 *
 *  A row carries two controls, because it answers two questions: the name
 *  switches to that profile, and the star to its right says which one a
 *  browser opens on. Starring stays on this screen — the star is the reply,
 *  and leaving for home would hide it. */
export function Profiles(): VNode {
  const [profiles] = useState(readProfiles)
  const [starred, setStarred] = useState(defaultId)
  const [name, setName] = useState('')

  const create = (): void => {
    const trimmed = name.trim()
    if (trimmed === '') return
    enter(createProfile(trimmed).id)
  }

  const star = (id: string): void => {
    makeDefault(id)
    setStarred(id)
  }

  return (
    <main class="profiles">
      <header class="profiles-strip">
        <a class="profiles-back hit" href="#/">
          ← &nbsp;profiles
        </a>
      </header>

      <div class="profiles-body">
        <section class="profiles-list">
          {profiles.map((profile) => (
            <div class="profiles-row" key={profile.id}>
              <button type="button" class="profiles-pick hit" onClick={() => enter(profile.id)}>
                <span class="profiles-name">{profile.name}</span>
                {profile.id === activeId() && <span class="profiles-current">current</span>}
              </button>
              <button
                type="button"
                class="profiles-star hit"
                aria-pressed={profile.id === starred}
                aria-label={`open on ${profile.name}`}
                onClick={() => star(profile.id)}
              >
                {profile.id === starred ? '★' : '☆'}
              </button>
            </div>
          ))}
        </section>

        <div class="profiles-new">
          <input
            type="text"
            class="profiles-input"
            aria-label="new profile name"
            placeholder="a name"
            value={name}
            onInput={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') create()
            }}
          />
          <button type="button" class="profiles-add hit" onClick={create}>
            + new profile
          </button>
        </div>

        <p class="profiles-note">
          Profiles share the exercise, food and segment libraries, their pictures and the
          app&#39;s configuration. What each one records is its own. The starred profile is
          the one the app opens on.
        </p>
      </div>
    </main>
  )
}

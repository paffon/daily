import type { VNode } from 'preact'
import { useState } from 'preact/hooks'
import { account, remembering, signIn, signOut, token } from '../data/drive'
import './signin.css'

/** Ask for a token, and hand back only if one arrived. A refusal, a blocked
 *  popup and a dead network all resolve false and leave what is on screen
 *  exactly as it was. */
function press(remember: boolean, onDone: () => void): void {
  void signIn(remember).then((ok) => {
    if (ok) onDone()
  })
}

/** The door. Since 2026-08-09 it is no longer what a signed-out app shows —
 *  `main.tsx` opens the app on the mirror once Drive has been heard from here
 *  once — so this is down to two visitors: a browser that has never signed in,
 *  and one that pressed sign out. Both are choosing, which is why the checkbox
 *  is here and nowhere else in the app.
 *
 *  Still one line and one button, plus the box. What the box promises is what
 *  it does: the token is written to disk beside its expiry, so the next page
 *  load inside the hour needs no press. Unticked, nothing about the account
 *  reaches the disk and the token dies with the tab, which is what this file
 *  did for its whole life before that date. */
export function SignIn({ onDone }: { onDone: () => void }): VNode {
  const [remember, setRemember] = useState(remembering())
  return (
    <main class="signin">
      <h1 class="signin-name">daily</h1>
      <button type="button" class="signin-go hit" onClick={() => press(remember, onDone)}>
        sign in with google
      </button>
      <label class="signin-remember">
        <input
          type="checkbox"
          class="signin-box"
          checked={remember}
          onChange={(event) => setRemember(event.currentTarget.checked)}
        />
        stay signed in on this browser
      </label>
    </main>
  )
}

/** Above every screen the app opens on: whose log this is, and the way out.
 *
 *  It draws in both states now, where it used to draw nothing without a name.
 *  A strip carrying only a name could be left off when there was no name; one
 *  carrying the only sign-out in the app cannot.
 *
 *  Without a token it says so rather than staying quiet, because the app looks
 *  identical either way — every screen reads the mirror — and an app that has
 *  silently stopped reaching Drive is the one thing here worth a line of
 *  chrome. It states the fact and offers the press; it does not warn, count
 *  down or apologise.
 *
 *  Nothing is synced on the way out. Every write already fires a pass as it
 *  lands, so a path still dirty at sign-out is one whose push has already
 *  failed — it needs a signal, not a button, and it survives on disk until
 *  there is one. */
export function AccountBand({
  onSignIn,
  onSignOut,
}: {
  onSignIn: () => void
  onSignOut: () => void
}): VNode {
  const inside = token() !== ''
  return (
    <div class="account-band">
      <span class="account-name">{inside ? account() : 'not reaching drive'}</span>
      {inside ? (
        <button
          type="button"
          class="account-door hit"
          onClick={() => {
            signOut()
            onSignOut()
          }}
        >
          sign out
        </button>
      ) : (
        <button
          type="button"
          class="account-door hit"
          onClick={() => press(remembering(), onSignIn)}
        >
          sign in
        </button>
      )}
    </div>
  )
}

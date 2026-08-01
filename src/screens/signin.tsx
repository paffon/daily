import type { VNode } from 'preact'
import { signIn } from '../data/drive'
import './signin.css'

/** Both doors do the same thing: ask for a token, and hand back only if one
 *  arrived. A refusal, a blocked popup and a dead network all resolve false and
 *  leave what is on screen exactly as it was. */
const press = (onDone: () => void) => () => {
  void signIn().then((ok) => {
    if (ok) onDone()
  })
}

/** The only screen that exists because of a platform constraint rather than
 *  because something is being recorded. One line, one button, nothing else —
 *  no greeting, no benefits, no marketing. Reached only by a browser whose
 *  mirror is empty: with nothing recorded there is nothing to show and nothing
 *  safe to seed, so this is the one case that has to wait for a token. */
export function SignIn({ onDone }: { onDone: () => void }): VNode {
  return (
    <main class="signin">
      <h1 class="signin-name">daily</h1>
      <button type="button" class="signin-go hit" onClick={press(onDone)}>
        sign in with google
      </button>
    </main>
  )
}

/** Above every screen while there is no token: after opening with no signal,
 *  and after a 401 has dropped an expired one mid-session. It states what is
 *  true — the mirror is taking writes and Drive is not seeing them — and the
 *  press is the only re-prompt there can be, since a token request is a popup
 *  and a popup needs a gesture.
 *
 *  Offline the state still holds but the door does not: the script that opens
 *  that popup is unreachable, so only the line shows rather than a button that
 *  would do nothing. */
export function SignInBand({ onDone }: { onDone: () => void }): VNode {
  return (
    <div class="signin-band">
      <span>not syncing</span>
      {navigator.onLine && (
        <button type="button" class="signin-band-go hit" onClick={press(onDone)}>
          sign in
        </button>
      )}
    </div>
  )
}

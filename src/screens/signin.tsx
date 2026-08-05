import type { VNode } from 'preact'
import { account, signIn } from '../data/drive'
import './signin.css'

/** Ask for a token, and hand back only if one arrived. A refusal, a blocked
 *  popup and a dead network all resolve false and leave what is on screen
 *  exactly as it was. */
const press = (onDone: () => void) => () => {
  void signIn().then((ok) => {
    if (ok) onDone()
  })
}

/** The only screen that exists because of a platform constraint rather than
 *  because something is being recorded. One line, one button, nothing else —
 *  no greeting, no benefits, no marketing.
 *
 *  It is also the whole of a signed-out app. The mirror still holds every
 *  entry ever logged and still takes writes, but none of it is shown or
 *  reachable without a token: the log is the owner's, and this is the door.
 *  Since the token lives in memory and GIS has no silent mode, that door is
 *  one press per page load. */
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

/** Above every screen once there is a token: whose log this is, and nothing
 *  else. Blank rather than a band when Google would not say the name — an
 *  empty strip is a rule across the top saying nothing. */
export function AccountBand(): VNode | null {
  const name = account()
  if (name === '') return null
  return (
    <div class="account-band">
      <span class="account-name">{name}</span>
    </div>
  )
}

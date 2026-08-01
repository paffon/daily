import type { VNode } from 'preact'
import { signIn } from '../data/drive'
import './signin.css'

/** The only screen that exists because of a platform constraint rather than
 *  because something is being recorded. One line, one button, nothing else —
 *  no greeting, no benefits, no marketing. */
export function SignIn({ onDone }: { onDone: () => void }): VNode {
  const press = () => {
    void signIn().then((ok) => {
      if (ok) onDone()
    })
  }

  return (
    <main class="signin">
      <h1 class="signin-name">daily</h1>
      <button type="button" class="signin-go hit" onClick={press}>
        sign in with google
      </button>
    </main>
  )
}

/** Google sign-in, and later the Drive calls themselves. The access token
 *  lives in this module's memory and nowhere else — never `localStorage`,
 *  never a cookie. There is no refresh token and no server by design: an
 *  expiry mid-session just re-prompts on the next sync, and the mirror means
 *  nothing is lost meanwhile. */

/** Per-file access — the app sees only files it created itself. The narrowest
 *  scope that works, and the reason no consent-screen review is needed. */
const SCOPE = 'https://www.googleapis.com/auth/drive.file'

/** The slice of Google Identity Services this app touches. Declaring it beats
 *  a types package for one call. The script tag in `index.html` defines it. */
type TokenResponse = { access_token?: string }
type TokenClient = { requestAccessToken(): void }

declare const google: {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string
        scope: string
        prompt: string
        callback: (response: TokenResponse) => void
        error_callback: (error: unknown) => void
      }): TokenClient
    }
  }
}

let accessToken = ''

/** Empty until a sign-in succeeds. */
export function token(): string {
  return accessToken
}

/** Read at call time, not at module load, so importing this file in a test
 *  does not need the environment to be set up. */
function clientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  if (!id) throw new Error('VITE_GOOGLE_CLIENT_ID is missing — put it in .env.local')
  return id
}

/** `prompt: ''` shows the consent screen only the first time; after that the
 *  popup opens and closes on its own. It must still be a popup, so this can
 *  only be called from a user gesture — see the note above `signIn`.
 *
 *  Resolves `false` instead of throwing: offline, consent declined and
 *  script-never-loaded all land back on the sign-in screen, so the caller has
 *  nothing to tell apart. */
export function signIn(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof google === 'undefined') return resolve(false)
    google.accounts.oauth2
      .initTokenClient({
        client_id: clientId(),
        scope: SCOPE,
        prompt: '',
        callback: (response) => {
          accessToken = response.access_token ?? ''
          resolve(accessToken !== '')
        },
        error_callback: () => resolve(false),
      })
      .requestAccessToken()
  })
}

/* There is no `trySilentSignIn`, though the phase doc asks for one. A GIS
   token client has no silent mode — every request opens a popup, and a popup
   outside a user gesture is blocked, so a boot-time attempt either hangs on a
   window nobody can complete or is refused. With the token held in memory and
   no refresh token, both by design, a press per page load is the cost of that
   design rather than something to work around. `signIn` is the only door. */

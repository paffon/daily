/** Google sign-in, and later the Drive calls themselves. The access token is
 *  held here and copied into `localStorage` beside the moment it dies, so a
 *  reload inside its hour opens an app that is already signed in. The note
 *  above `TOKEN_KEY` is where that is argued — it reverses a sentence this
 *  header used to carry.
 *
 *  There is still no refresh token and no server by design, so the hour is a
 *  ceiling rather than a setting: past it the next press buys another one, and
 *  the mirror means nothing is lost in between. */

/** Per-file access — the app sees only files it created itself — and the name
 *  on the account, which the app shows above every screen so it is never a
 *  question whose log is open. Both are non-sensitive scopes, so the pair is
 *  still the narrowest that works and still needs no consent-screen review. */
const PROFILE = 'https://www.googleapis.com/auth/userinfo.profile'
const SCOPE = ['https://www.googleapis.com/auth/drive.file', PROFILE].join(' ')

/** The slice of Google Identity Services this app touches. Declaring it beats
 *  a types package for one call. The script tag in `index.html` defines it. */
type TokenResponse = { access_token?: string; scope?: string; expires_in?: number }
type TokenClient = { requestAccessToken(): void }

declare const google: {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string
        scope: string
        prompt: string
        login_hint?: string
        callback: (response: TokenResponse) => void
        error_callback: (error: unknown) => void
      }): TokenClient
    }
  }
}

/** The token, and the moment it stops being one. In `localStorage`, which the
 *  header of this file used to forbid in as many words — *never
 *  `localStorage`, never a cookie* — and which is reversed here deliberately.
 *
 *  What that sentence bought was a browser profile holding no key to Drive.
 *  What it cost was a press on every single page load: Google Identity
 *  Services has no silent mode, `requestAccessToken` opens a popup, and a
 *  popup needs a gesture — so a token that does not outlive a reload cannot be
 *  got back without one. It also meant the app could not be opened without a
 *  signal at all, since the press needs Google; inside the hour it now can,
 *  because this is read from disk and no network is touched to do it.
 *
 *  The key is worth less than it looks. It expires in under an hour and cannot
 *  be renewed — there is no refresh token to be had by a page with no server
 *  behind it — `drive.file` reaches only files this app itself wrote, and
 *  every entry ever logged is already sitting in this same `localStorage` in
 *  the clear. What it reaches that the mirror does not is the body
 *  photographs, which are deliberately never mirrored, and write access to all
 *  of it. That is the trade, and it was taken knowingly. */
const TOKEN_KEY = 'daily:token'

/** The OIDC `sub` of the account last signed in — an opaque id, never the
 *  email. Kept past the token's death rather than beside it: handed back as
 *  `login_hint`, it is what keeps the once-an-hour press from opening an
 *  account chooser. */
const ACCOUNT_KEY = 'daily:account'

/** Two minutes short of the expiry Google names. A token with seconds left is
 *  restored only to 401 on the pass that boot starts, so it is treated as
 *  already gone. Not a threshold anyone would tune — it is slack against the
 *  round trip, like the milliseconds-per-minute in `entry.ts`. */
const MARGIN = 120_000

/** What Google hands back when it says nothing. It always names an expiry in
 *  practice; this is the value that stops a missing one meaning `NaN`. */
const HOUR = 3600

let accessToken = ''
let accountName = ''
let accountSub = localStorage.getItem(ACCOUNT_KEY) ?? ''

/** The last sign-in, if its hour is not up. Runs at module load, before
 *  anything has painted, so a reload inside the hour never shows a signed-out
 *  app on its way to a signed-in one.
 *
 *  Anything unreadable is dropped rather than repaired. The cost of dropping a
 *  good token is one press; the cost of restoring a half-parsed one is a pass
 *  that can only fail. */
function restore(): void {
  const held = localStorage.getItem(TOKEN_KEY)
  if (held === null) return
  try {
    const kept = JSON.parse(held) as { token?: string; name?: string; until?: number }
    if (typeof kept.until !== 'number' || kept.until <= Date.now() || !kept.token) {
      localStorage.removeItem(TOKEN_KEY)
      return
    }
    accessToken = kept.token
    accountName = kept.name ?? ''
  } catch {
    localStorage.removeItem(TOKEN_KEY)
  }
}

restore()

/** The token as the next page load will find it. Written on every press that
 *  wins one, not only the first: each buys a fresh hour, and the copy on disk
 *  has to name the new one or the reload after it hands back a corpse. */
function keep(expiresIn: number): void {
  localStorage.setItem(
    TOKEN_KEY,
    JSON.stringify({
      token: accessToken,
      name: accountName,
      until: Date.now() + expiresIn * 1000 - MARGIN,
    }),
  )
}

/** Empty until a sign-in succeeds — or until one that succeeded in the last
 *  hour is found on disk, which is the same statement made a reload later.
 *  Empty again the moment Drive answers 401. */
export function token(): string {
  return accessToken
}

/** The name on the signed-in account. Kept beside the token and for the same
 *  reasons — it is the token's fact, so it arrives with one, is written down
 *  with one and goes when one is dropped. Empty when nobody is signed in, and
 *  empty in the one case where a token arrived but the profile call did not. */
export function account(): string {
  return accountName
}

/** Read at call time, not at module load, so importing this file in a test
 *  does not need the environment to be set up. */
function clientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  if (!id) throw new Error('VITE_GOOGLE_CLIENT_ID is missing — put it in .env.local')
  return id
}

/** Set when a token comes back carrying less than was asked for, which happens
 *  to an account that consented before a scope was added: `prompt: ''` asks for
 *  no consent already given, so the old grant is handed back unchanged forever.
 *
 *  In `localStorage` rather than memory because the token is memory-only — the
 *  short-scoped token and the press that could fix it are always on opposite
 *  sides of a reload, so a flag that did not survive one would never be read.
 *
 *  Revoking the app at myaccount.google.com would also fix it, and is the wrong
 *  advice: under `drive.file` Google holds the app's per-file access alongside
 *  the grant, so dropping the grant can lose the app sight of the very files it
 *  wrote. Asking for consent again keeps the grant and widens it. */
const CONSENT_KEY = 'daily:needs-consent'

/** `prompt: ''` shows the consent screen only the first time; after that the
 *  popup opens and closes on its own. `'consent'` forces it, which is how a
 *  grant made before `PROFILE` existed gets widened — once, on the press after
 *  the short token, and never again once it worked.
 *
 *  It must still be a popup, so this can only be called from a user gesture —
 *  see the note above `signIn`.
 *
 *  Resolves `false` instead of throwing: offline, consent declined and
 *  script-never-loaded all leave the door exactly as it was, so the caller has
 *  nothing to tell apart. */
export function signIn(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof google === 'undefined') return resolve(false)
    google.accounts.oauth2
      .initTokenClient({
        client_id: clientId(),
        scope: SCOPE,
        prompt: localStorage.getItem(CONSENT_KEY) === null ? '' : 'consent',
        /* Absent until an account has signed in here once, which is the only
           press that has any business showing a chooser. */
        ...(accountSub === '' ? {} : { login_hint: accountSub }),
        callback: (response) => {
          accessToken = response.access_token ?? ''
          if (accessToken === '') return resolve(false)
          /* Resolved only once the name is in, so the first painted frame
             already carries it rather than filling in a beat later — and
             written down only then, since the name is part of what is kept. */
          void whoAmI(response.scope ?? '').then(() => {
            keep(response.expires_in ?? HOUR)
            resolve(true)
          })
        },
        error_callback: () => resolve(false),
      })
      .requestAccessToken()
  })
}

/** The name behind the token. A failure here is not a failed sign-in — Drive
 *  is reachable either way — so it is swallowed and the band above the app
 *  simply carries nothing. But a blank band is indistinguishable from a broken
 *  one, so each way it can fail says so in the console rather than nowhere.
 *
 *  `granted` is what Google actually handed over, which is not always what was
 *  asked for: an account that consented to `drive.file` before this scope
 *  existed can be handed a token carrying only that, and the profile call would
 *  then 403 for a reason no error message names. */
async function whoAmI(granted: string): Promise<void> {
  accountName = ''
  if (!granted.split(' ').includes(PROFILE)) {
    /* The press that could widen this grant is on the far side of a reload, so
       the flag goes down now and the next one asks for consent rather than
       reusing the grant that just came up short. */
    localStorage.setItem(CONSENT_KEY, 'yes')
    console.warn(
      `daily: signed in without ${PROFILE}, so there is no name to show. ` +
        'Reload and sign in again — the consent screen will ask for it this time. ' +
        'If it does not, the scope is missing from the OAuth client in Google Cloud console.',
    )
    return
  }
  /* Granted. Whatever this browser had to force to get here, it is over —
     later sign-ins go back to the silent popup. */
  localStorage.removeItem(CONSENT_KEY)
  try {
    const who = await (await api('/oauth2/v3/userinfo')).json()
    accountName = (who.name as string | undefined) ?? ''
    /* Kept whether or not the name came with it: the chooser this suppresses
       is a nuisance on exactly the presses that follow this one. */
    accountSub = (who.sub as string | undefined) ?? ''
    if (accountSub !== '') localStorage.setItem(ACCOUNT_KEY, accountSub)
    if (accountName === '') console.warn('daily: the profile call named no account')
  } catch (failure) {
    console.warn('daily: the profile call failed', failure)
  }
}

/* There is still no `trySilentSignIn`, and there cannot be one. A GIS token
   client has no silent mode — `requestAccessToken` has a single code path and
   it opens a popup, `ux_mode` is ignored for tokens, and a popup outside a
   user gesture is blocked — so a boot-time attempt either hangs on a window
   nobody can complete or is refused outright.

   What changed is what that costs. The press used to be per page load, because
   the token died with the tab; now it is per hour, because `restore` finds the
   one already bought. Nothing else was available: the redirect flow returns its
   token in the fragment, which is where this app's router lives; the iframe
   flow is refused by `X-Frame-Options` on Google's endpoint; and a refresh
   token needs a client secret, which a page anyone can read the source of
   cannot hold. `signIn` is still the only door — it is just no longer the only
   way through it. */

/* ── Drive ─────────────────────────────────────────────────────────────────
   Paths are always `{prefix}/{name}` — `entries/body-2026-08.jsonl`,
   `config/app.json`. Two segments, never more, which is why nothing here
   walks a tree. */

const API = 'https://www.googleapis.com'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const ROOT = 'daily'

/** The four subfolders of `daily/`, from the storage layout in `PLAN.md`.
 *  Structure, not a setting: renaming one orphans the data under it. */
const PREFIXES = ['entries', 'library', 'config', 'photos']

/** prefix → folder id, `''` for `daily/` itself. Memory only, like the file
 *  ids below: an id that outlives the session cannot tell that the folder it
 *  names was trashed, and Drive accepts a write into a trashed folder without
 *  complaint. Resolved once per session instead, which costs two queries. */
let folders: Record<string, string> = {}

/** path → file id. In memory only: `listFiles` refills it on every boot, and a
 *  stale id is worse than an absent one. */
const fileIds = new Map<string, string>()

async function api(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(API + path, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
  })
  /* An expired token is worse than no token: it looks signed in, so every
     write keeps firing passes that can only fail, silently, forever. Dropping
     it makes `token()` empty again, which is what the rest of the app reads
     to mean "nothing can reach Drive right now". */
  if (response.status === 401) {
    accessToken = ''
    accountName = ''
    /* And off the disk with it, or the next boot restores the very token that
       just proved itself dead and starts a pass that can only fail again. This
       is the whole of the expiry handling: nothing polls, nothing counts down,
       a stale token 401s once and clears itself. */
    localStorage.removeItem(TOKEN_KEY)
  }
  if (!response.ok) throw new Error(`drive ${response.status} on ${path}`)
  return response
}

/** The id of the one file or folder with this name in this parent, or `null`.
 *  Names in a prefix are unique by construction, so the first hit is the hit. */
async function findId(name: string, parent: string | null, folder: boolean): Promise<string | null> {
  const clauses = [`name='${name}'`, 'trashed=false']
  if (folder) clauses.push(`mimeType='${FOLDER_MIME}'`)
  if (parent !== null) clauses.push(`'${parent}' in parents`)
  const query = encodeURIComponent(clauses.join(' and '))
  const found = await (await api(`/drive/v3/files?q=${query}&fields=files(id)`)).json()
  return found.files[0]?.id ?? null
}

/** Metadata only — no content. Creating a file this way and then writing it
 *  with the same `PATCH` every later write uses costs one extra round trip on
 *  a file's first write, and saves assembling a multipart body by hand. */
async function create(name: string, parent: string | null, folder: boolean): Promise<string> {
  const metadata = {
    name,
    ...(folder ? { mimeType: FOLDER_MIME } : {}),
    ...(parent === null ? {} : { parents: [parent] }),
  }
  const made = await (
    await api('/drive/v3/files?fields=id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata),
    })
  ).json()
  return made.id
}

/** The folders directly inside one folder, by name. One query for all four,
 *  which is what makes resolving them every session cheap enough that nothing
 *  has to be remembered across one. */
async function subfolders(parent: string): Promise<Map<string, string>> {
  const clauses = [`'${parent}' in parents`, `mimeType='${FOLDER_MIME}'`, 'trashed=false']
  const query = encodeURIComponent(clauses.join(' and '))
  const found = await (await api(`/drive/v3/files?q=${query}&fields=files(id,name)`)).json()
  return new Map((found.files as { id: string; name: string }[]).map((f) => [f.name, f.id]))
}

/** Resolves `daily/` and its subfolders, creating any that are missing. Two
 *  queries, held for the rest of the session, so no write pays for a lookup —
 *  and nothing is held past a reload, so trashing `daily/` costs one reload
 *  rather than a hand-cleared key. Idempotent, and every call below funnels
 *  through it, so no caller has to remember to sequence it first. */
export async function ensureFolders(): Promise<Record<string, string>> {
  if (Object.keys(folders).length > 0) return folders

  const root = (await findId(ROOT, null, true)) ?? (await create(ROOT, null, true))
  const inside = await subfolders(root)
  const resolved: Record<string, string> = { '': root }
  for (const prefix of PREFIXES) {
    resolved[prefix] = inside.get(prefix) ?? (await create(prefix, root, true))
  }

  folders = resolved
  return folders
}

async function fileId(path: string): Promise<string | null> {
  const known = fileIds.get(path)
  if (known !== undefined) return known
  const [prefix, name] = path.split('/')
  const id = await findId(name, (await ensureFolders())[prefix], false)
  if (id !== null) fileIds.set(path, id)
  return id
}

/** `null` when the file has never been written. */
export async function getFile(path: string): Promise<string | null> {
  const id = await fileId(path)
  if (id === null) return null
  return (await api(`/drive/v3/files/${id}?alt=media`)).text()
}

/** The same file as `getFile`, as bytes. Photos are the only caller: they are
 *  never mirrored, so there is nothing local to read them from. */
export async function getBlob(path: string): Promise<Blob | null> {
  const id = await fileId(path)
  if (id === null) return null
  return (await api(`/drive/v3/files/${id}?alt=media`)).blob()
}

/** Whole-file write — one user, tiny files, and no append API to reach for.
 *  Hands back the file's new `modifiedTime`, which is how the pull that
 *  follows tells this browser's own upload from a change made elsewhere.
 *
 *  A `Blob` body is a photo. `fetch` takes the content type off the blob, so
 *  the same `PATCH` uploads a JPEG without any of it being written twice. */
export async function putFile(path: string, content: string | Blob): Promise<string> {
  let id = await fileId(path)
  if (id === null) {
    const [prefix, name] = path.split('/')
    id = await create(name, (await ensureFolders())[prefix], false)
    fileIds.set(path, id)
  }
  const written = await (
    await api(`/upload/drive/v3/files/${id}?uploadType=media&fields=modifiedTime`, {
      method: 'PATCH',
      body: content,
    })
  ).json()
  return written.modifiedTime as string
}

/** One file in Drive as the store sees it. `modifiedTime` is Drive's own
 *  change token: the pull compares it and downloads only what moved. */
export type DriveFile = { path: string; modifiedTime: string }

/** Drive's own ceiling for one listing, not a number worth tuning. */
const PAGE = 1000

/** Every file the app has ever written, as store paths. The `drive.file` scope
 *  means Drive shows this app nothing it did not create, so "all files" already
 *  means "all of daily's files" and no query narrows it further.
 *
 *  Every page of them: a listing that stopped at the first would go on
 *  answering without an error, and the files past it would simply never come
 *  down on a second device. Entries alone reach a thousand in a few years, and
 *  photos get there sooner. */
export async function listFiles(): Promise<DriveFile[]> {
  const known = await ensureFolders()
  const prefixOf = new Map(Object.entries(known).map(([prefix, id]) => [id, prefix]))
  const query = encodeURIComponent(`trashed=false and mimeType!='${FOLDER_MIME}'`)

  const files: DriveFile[] = []
  type Listed = { id: string; name: string; parents?: string[]; modifiedTime: string }
  let next = ''

  do {
    const found = await (
      await api(
        `/drive/v3/files?q=${query}&fields=nextPageToken,files(id,name,parents,modifiedTime)` +
          `&pageSize=${PAGE}${next === '' ? '' : `&pageToken=${next}`}`,
      )
    ).json()

    for (const file of found.files as Listed[]) {
      const prefix = prefixOf.get(file.parents?.[0] ?? '')
      if (prefix === undefined || prefix === '') continue
      const path = `${prefix}/${file.name}`
      fileIds.set(path, file.id)
      files.push({ path, modifiedTime: file.modifiedTime })
    }
    next = (found.nextPageToken as string | undefined) ?? ''
  } while (next !== '')

  return files
}

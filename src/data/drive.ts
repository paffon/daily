/** Google sign-in, and later the Drive calls themselves. The access token
 *  lives in this module's memory and nowhere else — never `localStorage`,
 *  never a cookie. There is no refresh token and no server by design: an
 *  expiry mid-session just re-prompts on the next sync, and the mirror means
 *  nothing is lost meanwhile. */

/** Per-file access — the app sees only files it created itself — and the name
 *  on the account, which the app shows above every screen so it is never a
 *  question whose log is open. Both are non-sensitive scopes, so the pair is
 *  still the narrowest that works and still needs no consent-screen review. */
const PROFILE = 'https://www.googleapis.com/auth/userinfo.profile'
const SCOPE = ['https://www.googleapis.com/auth/drive.file', PROFILE].join(' ')

/** The slice of Google Identity Services this app touches. Declaring it beats
 *  a types package for one call. The script tag in `index.html` defines it. */
type TokenResponse = { access_token?: string; scope?: string }
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
let accountName = ''

/** Empty until a sign-in succeeds. */
export function token(): string {
  return accessToken
}

/** The name on the signed-in account. Memory only, beside the token and for
 *  the same reasons — it is the token's fact, so it arrives with one and goes
 *  when one is dropped. Empty when nobody is signed in, and empty in the one
 *  case where a token arrived but the profile call did not. */
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
 *  script-never-loaded all land back on the sign-in screen, so the caller has
 *  nothing to tell apart. */
export function signIn(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof google === 'undefined') return resolve(false)
    google.accounts.oauth2
      .initTokenClient({
        client_id: clientId(),
        scope: SCOPE,
        prompt: localStorage.getItem(CONSENT_KEY) === null ? '' : 'consent',
        callback: (response) => {
          accessToken = response.access_token ?? ''
          if (accessToken === '') return resolve(false)
          /* Resolved only once the name is in, so the first painted frame
             already carries it rather than filling in a beat later. */
          void whoAmI(response.scope ?? '').then(() => resolve(true))
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
    if (accountName === '') console.warn('daily: the profile call named no account')
  } catch (failure) {
    console.warn('daily: the profile call failed', failure)
  }
}

/* There is no `trySilentSignIn`, though the phase doc asks for one. A GIS
   token client has no silent mode — every request opens a popup, and a popup
   outside a user gesture is blocked, so a boot-time attempt either hangs on a
   window nobody can complete or is refused. With the token held in memory and
   no refresh token, both by design, a press per page load is the cost of that
   design rather than something to work around. `signIn` is the only door. */

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

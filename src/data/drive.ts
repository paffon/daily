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

/** Drive ids for the folder cache. Bookkeeping about Drive, not app data, so
 *  it is kept beside the mirror rather than in it — nothing should ever try to
 *  sync this file back to Drive, where it does not exist. */
const FOLDERS_KEY = 'daily:_folders.json'

/** prefix → folder id, `''` for `daily/` itself. */
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
  if (response.status === 401) accessToken = ''
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

/** Resolves `daily/` and its subfolders, creating any that are missing, and
 *  caches the ids so a boot costs one lookup rather than five per write.
 *  Idempotent, and every call below funnels through it, so no caller has to
 *  remember to sequence it first. */
export async function ensureFolders(): Promise<Record<string, string>> {
  if (Object.keys(folders).length > 0) return folders

  const cached = localStorage.getItem(FOLDERS_KEY)
  if (cached !== null) {
    folders = JSON.parse(cached) as Record<string, string>
    return folders
  }

  const root = (await findId(ROOT, null, true)) ?? (await create(ROOT, null, true))
  const resolved: Record<string, string> = { '': root }
  for (const prefix of PREFIXES) {
    resolved[prefix] = (await findId(prefix, root, true)) ?? (await create(prefix, root, true))
  }

  folders = resolved
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(resolved))
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

/** Whole-file write — one user, tiny files, and no append API to reach for. */
export async function putFile(path: string, text: string): Promise<void> {
  let id = await fileId(path)
  if (id === null) {
    const [prefix, name] = path.split('/')
    id = await create(name, (await ensureFolders())[prefix], false)
    fileIds.set(path, id)
  }
  await api(`/upload/drive/v3/files/${id}?uploadType=media`, { method: 'PATCH', body: text })
}

/** Every file the app has ever written, as store paths. One query, because
 *  the `drive.file` scope means Drive shows this app nothing it did not
 *  create — so "all files" already means "all of daily's files". */
export async function listFiles(): Promise<string[]> {
  const known = await ensureFolders()
  const prefixOf = new Map(Object.entries(known).map(([prefix, id]) => [id, prefix]))
  const query = encodeURIComponent(`trashed=false and mimeType!='${FOLDER_MIME}'`)
  const found = await (
    await api(`/drive/v3/files?q=${query}&fields=files(id,name,parents)&pageSize=1000`)
  ).json()

  const paths: string[] = []
  for (const file of found.files as { id: string; name: string; parents?: string[] }[]) {
    const prefix = prefixOf.get(file.parents?.[0] ?? '')
    if (prefix === undefined || prefix === '') continue
    const path = `${prefix}/${file.name}`
    fileIds.set(path, file.id)
    paths.push(path)
  }
  return paths
}

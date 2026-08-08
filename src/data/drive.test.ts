/** Drive is faked at `fetch`, because the one thing in this module that can
 *  lose data does it in silence: a listing that stops at the first page keeps
 *  answering without an error, and the files past it just never come down. */

import { account, listFiles, signIn } from './drive'

const ROOT = 'folder-daily'
const ENTRIES = 'folder-entries'

const answer = (body: unknown) => ({ ok: true, status: 200, json: async () => body })

const listed = (name: string) => ({
  id: `file-${name}`,
  name,
  parents: [ENTRIES],
  modifiedTime: 'a-time',
})

it('follows every page of the listing, so a file past the first is not dropped', async () => {
  const asked: string[] = []
  const replies = [
    /* ensureFolders: `daily/` itself, then the folders inside it — all four,
       so nothing has to be created and the queue below stays in step */
    answer({ files: [{ id: ROOT }] }),
    answer({
      files: [
        { id: ENTRIES, name: 'entries' },
        { id: 'folder-library', name: 'library' },
        { id: 'folder-config', name: 'config' },
        { id: 'folder-photos', name: 'photos' },
      ],
    }),
    /* the listing, cut across two pages */
    answer({ files: [listed('body-2026-07.jsonl')], nextPageToken: 'the-rest' }),
    answer({ files: [listed('body-2026-08.jsonl')] }),
  ]

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      asked.push(url)
      return replies.shift()
    }),
  )

  const files = await listFiles()

  expect(files.map((file) => file.path)).toEqual([
    'entries/body-2026-07.jsonl',
    'entries/body-2026-08.jsonl',
  ])
  /* the second page was asked for by the token the first one handed back, and
     nothing was created along the way */
  expect(replies).toHaveLength(0)
  expect(asked[3]).toContain('pageToken=the-rest')
  expect(asked[2]).not.toContain('pageToken')

  vi.unstubAllGlobals()
})

/** The scope escalation. A grant made before `userinfo.profile` was asked for
 *  is handed back unchanged forever under `prompt: ''`, so the app has to
 *  notice and ask again — once, and never again once it worked. Revoking the
 *  app instead would risk the per-file access that holds the log. */

const DRIVE = 'https://www.googleapis.com/auth/drive.file'
const PROFILE = 'https://www.googleapis.com/auth/userinfo.profile'

/** GIS, reduced to the three things this module reads: what `prompt` and what
 *  `login_hint` were asked for, and what came back. */
function fakeGoogle(reply: { access_token?: string; scope?: string; expires_in?: number }): {
  prompts: string[]
  hints: (string | undefined)[]
} {
  const prompts: string[] = []
  const hints: (string | undefined)[] = []
  vi.stubGlobal('google', {
    accounts: {
      oauth2: {
        initTokenClient: (config: {
          prompt: string
          login_hint?: string
          callback: (r: unknown) => void
        }) => {
          prompts.push(config.prompt)
          hints.push(config.login_hint)
          return { requestAccessToken: () => config.callback(reply) }
        },
      },
    },
  })
  return { prompts, hints }
}

describe('a grant that came up short', () => {
  beforeEach(() => {
    localStorage.clear()
    import.meta.env.VITE_GOOGLE_CLIENT_ID = 'test-client'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('asks for consent on the next press, and stops once the scope arrives', async () => {
    /* the old grant: a token, but only the scope consented to years ago */
    const short = fakeGoogle({ access_token: 'partial', scope: DRIVE })
    expect(await signIn()).toBe(true)

    /* signed in — Drive works — but there is no name and no pretending there is */
    expect(short.prompts).toEqual([''])
    expect(account()).toBe('')

    /* the press after the reload, which is the one that can widen it */
    vi.unstubAllGlobals()
    const full = fakeGoogle({ access_token: 'whole', scope: `${DRIVE} ${PROFILE}` })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => answer({ name: 'Omri Nardin' })),
    )
    expect(await signIn()).toBe(true)

    expect(full.prompts).toEqual(['consent'])
    expect(account()).toBe('Omri Nardin')

    /* and it is over: the next press is silent again */
    vi.unstubAllGlobals()
    const after = fakeGoogle({ access_token: 'whole', scope: `${DRIVE} ${PROFILE}` })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => answer({ name: 'Omri Nardin' })),
    )
    await signIn()
    expect(after.prompts).toEqual([''])
  })

  it('keeps the app usable when the profile call fails outright', async () => {
    fakeGoogle({ access_token: 'whole', scope: `${DRIVE} ${PROFILE}` })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) })),
    )

    /* a failed name is not a failed sign-in — Drive is reachable either way */
    expect(await signIn()).toBe(true)
    expect(account()).toBe('')
  })
})

/** Remember me. The whole of it is that a token bought once is found again at
 *  module load and a dead one never is — so the press is per hour rather than
 *  per page load. The module is re-imported rather than reset in place,
 *  because the restore runs once at load and that is the moment being tested. */

const TOKEN_KEY = 'daily:token'

const whole = { access_token: 'whole', scope: `${DRIVE} ${PROFILE}`, expires_in: 3600 }

/** The profile call, naming the account and handing back the opaque id that
 *  later presses go back with. */
const profile = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => answer({ name: 'Omri Nardin', sub: 'the-sub' })),
  )

describe('a token that outlives the tab', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
    import.meta.env.VITE_GOOGLE_CLIENT_ID = 'test-client'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('is found by the next page load, carrying the name it came with', async () => {
    fakeGoogle(whole)
    profile()
    const pressed = await import('./drive')
    expect(await pressed.signIn()).toBe(true)

    /* the reload: a fresh module, and nothing pressed */
    vi.resetModules()
    const reloaded = await import('./drive')

    expect(reloaded.token()).toBe('whole')
    expect(reloaded.account()).toBe('Omri Nardin')
  })

  it('names the account on the press after it, so no chooser opens', async () => {
    fakeGoogle(whole)
    profile()
    expect(await (await import('./drive')).signIn()).toBe(true)

    /* an hour later, on a load that restored nothing */
    localStorage.removeItem(TOKEN_KEY)
    vi.resetModules()
    vi.unstubAllGlobals()
    const later = fakeGoogle(whole)
    profile()
    const fresh = await import('./drive')
    expect(fresh.token()).toBe('')

    await fresh.signIn()
    expect(later.hints).toEqual(['the-sub'])
  })

  it('is not restored once its hour is up', async () => {
    localStorage.setItem(
      TOKEN_KEY,
      JSON.stringify({ token: 'stale', name: 'Omri Nardin', until: Date.now() - 1 }),
    )

    const reloaded = await import('./drive')

    expect(reloaded.token()).toBe('')
    expect(reloaded.account()).toBe('')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('is dropped rather than repaired when what is on disk is not a token', async () => {
    localStorage.setItem(TOKEN_KEY, 'half a write')

    expect((await import('./drive')).token()).toBe('')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('goes off the disk the moment Drive refuses it', async () => {
    localStorage.setItem(
      TOKEN_KEY,
      JSON.stringify({ token: 'stale', name: 'Omri Nardin', until: Date.now() + 600_000 }),
    )
    const reloaded = await import('./drive')
    expect(reloaded.token()).toBe('stale')

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })),
    )
    await expect(reloaded.listFiles()).rejects.toThrow()

    /* or the next load restores the very token that just proved itself dead */
    expect(reloaded.token()).toBe('')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })
})

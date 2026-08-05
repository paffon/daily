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

/** GIS, reduced to the two things this module reads: what `prompt` was asked
 *  for, and what came back. */
function fakeGoogle(reply: { access_token?: string; scope?: string }): { prompts: string[] } {
  const prompts: string[] = []
  vi.stubGlobal('google', {
    accounts: {
      oauth2: {
        initTokenClient: (config: { prompt: string; callback: (r: unknown) => void }) => {
          prompts.push(config.prompt)
          return { requestAccessToken: () => config.callback(reply) }
        },
      },
    },
  })
  return { prompts }
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

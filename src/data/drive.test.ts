/** Drive is faked at `fetch`, because the one thing in this module that can
 *  lose data does it in silence: a listing that stops at the first page keeps
 *  answering without an error, and the files past it just never come down. */

import { listFiles } from './drive'

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

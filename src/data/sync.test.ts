/** Sync's whole job is deciding what not to overwrite, so these are about
 *  precedence and retry, not about Drive. Drive is faked; what is exercised is
 *  the policy on top of it. */

vi.mock('./drive', () => ({
  token: vi.fn(() => ''),
  getFile: vi.fn(),
  putFile: vi.fn(),
  listFiles: vi.fn(),
}))

import { getFile, listFiles, putFile, token } from './drive'
import { localAdapter } from './store'
import { driveAdapter, onPass, pull, push, syncNow } from './sync'

const remote = vi.mocked(getFile)
const upload = vi.mocked(putFile)
const remoteList = vi.mocked(listFiles)
const signedInAs = vi.mocked(token)

/** The same adapter the store holds: writing through it is what marks a path
 *  dirty, and writing through `localAdapter` is what leaves it clean. */
const adapter = driveAdapter(localAdapter)

const PATH = 'entries/body-2026-08.jsonl'

/** Drive's own change token. Nothing reads it, so any two distinct strings
 *  do — what matters is only whether the remote one still matches the one the
 *  mirror was filled from. */
const LISTED = 'listed-time'
const UPLOADED = 'uploaded-time'

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  /* Signed out by default, so a write marks its path and fires nothing — each
     test then drives `push` and `pull` itself. */
  signedInAs.mockReturnValue('')
  remoteList.mockResolvedValue([{ path: PATH, modifiedTime: LISTED }])
  remote.mockResolvedValue('from drive')
  upload.mockResolvedValue(UPLOADED)
})

describe('pull', () => {
  it('leaves a dirty file alone — it holds a write the remote has not seen', async () => {
    adapter.set(PATH, 'written here')
    await pull()
    expect(localAdapter.get(PATH)).toBe('written here')
  })

  it('overwrites a clean file', async () => {
    localAdapter.set(PATH, 'stale')
    await pull()
    expect(localAdapter.get(PATH)).toBe('from drive')
  })

  it('writes down a file the mirror has never seen', async () => {
    await pull()
    expect(localAdapter.get(PATH)).toBe('from drive')
  })

  it('does not fetch a file whose remote copy has not moved', async () => {
    await pull()
    expect(remote).toHaveBeenCalledTimes(1)

    await pull()
    expect(remote).toHaveBeenCalledTimes(1)
  })

  it('fetches it again the moment the remote copy does move', async () => {
    await pull()
    remoteList.mockResolvedValue([{ path: PATH, modifiedTime: 'moved' }])
    remote.mockResolvedValue('from another browser')

    await pull()
    expect(localAdapter.get(PATH)).toBe('from another browser')
  })

  it('never brings a photo down — the mirror is text, and shared with every entry', async () => {
    const PHOTO = 'photos/2026-08-01.jpg'
    remoteList.mockResolvedValue([
      { path: PHOTO, modifiedTime: LISTED },
      { path: PATH, modifiedTime: LISTED },
    ])

    await pull()

    expect(localAdapter.get(PHOTO)).toBeNull()
    expect(remote).toHaveBeenCalledTimes(1)
    expect(remote).toHaveBeenCalledWith(PATH)
    /* the entry line naming the photo still comes down with everything else */
    expect(localAdapter.get(PATH)).toBe('from drive')
  })

  it('forgets a file that has left Drive, so its name cannot be claimed later', async () => {
    await pull()
    remoteList.mockResolvedValue([])
    await pull()

    /* Same path, same time, but nothing was skipped on its behalf while it was
       absent — a file appearing under that name again is fetched. */
    remoteList.mockResolvedValue([{ path: PATH, modifiedTime: LISTED }])
    remote.mockResolvedValue('written somewhere else')
    await pull()
    expect(localAdapter.get(PATH)).toBe('written somewhere else')
  })
})

describe('push', () => {
  it('sends the mirror’s text and stops holding the path', async () => {
    adapter.set(PATH, 'written here')
    await push()
    expect(upload).toHaveBeenCalledWith(PATH, 'written here')

    await pull()
    expect(localAdapter.get(PATH)).toBe('from drive')
  })

  it('keeps holding a path that was written again while its upload was in flight', async () => {
    adapter.set(PATH, 'one weight')
    let landed: () => void = () => {}
    upload.mockImplementationOnce(
      () => new Promise<string>((done) => (landed = () => done(UPLOADED))),
    )

    const sending = push()
    adapter.set(PATH, 'one weight\nand a second')
    landed()
    await sending

    /* The second weight was never sent, so the path must still be dirty —
       otherwise the pull below hands back the one-weight copy and it is gone
       from the mirror and from Drive at once. */
    await pull()
    expect(localAdapter.get(PATH)).toBe('one weight\nand a second')

    await push()
    expect(upload).toHaveBeenLastCalledWith(PATH, 'one weight\nand a second')
  })

  it('stops holding a path the mirror no longer has', async () => {
    adapter.set(PATH, 'written here')
    localStorage.removeItem(`daily:${PATH}`)

    await push()
    expect(upload).not.toHaveBeenCalled()

    await pull()
    expect(localAdapter.get(PATH)).toBe('from drive')
  })

  it('leaves the path dirty when the upload fails, and a later pass retries it', async () => {
    adapter.set(PATH, 'written here')
    upload.mockRejectedValueOnce(new Error('offline'))

    await push()
    await pull()
    expect(localAdapter.get(PATH)).toBe('written here')

    await push()
    expect(upload).toHaveBeenCalledTimes(2)
    expect(upload).toHaveBeenLastCalledWith(PATH, 'written here')

    await pull()
    expect(localAdapter.get(PATH)).toBe('from drive')
  })
})

describe('syncNow', () => {
  it('runs one pass however many calls arrive at once', async () => {
    /* Marked dirty while signed out, so the pass below is the only one — a
       write made after the token arrives would start one of its own. */
    adapter.set(PATH, 'written here')
    signedInAs.mockReturnValue('a-token')

    await Promise.all([syncNow(), syncNow(), syncNow()])

    expect(remoteList).toHaveBeenCalledTimes(1)
    expect(upload).toHaveBeenCalledTimes(1)
  })

  it('gives a write that landed mid-pass a lap of its own', async () => {
    adapter.set(PATH, 'one weight')
    signedInAs.mockReturnValue('a-token')

    let landed: () => void = () => {}
    upload.mockImplementationOnce(
      () => new Promise<string>((done) => (landed = () => done(UPLOADED))),
    )

    const pass = syncNow()
    adapter.set(PATH, 'one weight\nand a second')
    landed()
    await pass

    expect(upload).toHaveBeenLastCalledWith(PATH, 'one weight\nand a second')
  })

  it('reports whether Drive was actually heard from', async () => {
    signedInAs.mockReturnValue('a-token')
    expect(await syncNow()).toBe(true)

    remoteList.mockRejectedValueOnce(new Error('offline'))
    expect(await syncNow()).toBe(false)

    signedInAs.mockReturnValue('')
    expect(await syncNow()).toBe(false)
  })

  it('does not fetch back the file it just uploaded', async () => {
    adapter.set(PATH, 'written here')
    signedInAs.mockReturnValue('a-token')
    /* Drive reports what the upload just wrote, because the list query runs
       after it. */
    remoteList.mockResolvedValue([{ path: PATH, modifiedTime: UPLOADED }])

    await syncNow()

    expect(upload).toHaveBeenCalledTimes(1)
    expect(remote).not.toHaveBeenCalled()
    expect(localAdapter.get(PATH)).toBe('written here')
  })

  it('says when a pass has ended, so the app can repaint', async () => {
    const repaint = vi.fn()
    onPass(repaint)
    signedInAs.mockReturnValue('a-token')

    await syncNow()
    expect(repaint).toHaveBeenCalledTimes(1)

    remoteList.mockRejectedValueOnce(new Error('offline'))
    await syncNow()
    expect(repaint).toHaveBeenCalledTimes(2)

    onPass(() => {})
  })

  it('does nothing while signed out, and keeps the write for later', async () => {
    adapter.set(PATH, 'written here')
    await syncNow()

    expect(upload).not.toHaveBeenCalled()
    expect(remoteList).not.toHaveBeenCalled()

    signedInAs.mockReturnValue('a-token')
    await syncNow()
    expect(upload).toHaveBeenCalledWith(PATH, 'written here')
  })
})

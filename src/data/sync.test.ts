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
import { driveAdapter, pull, push, syncNow } from './sync'

const remote = vi.mocked(getFile)
const upload = vi.mocked(putFile)
const remoteList = vi.mocked(listFiles)
const signedInAs = vi.mocked(token)

/** The same adapter the store holds: writing through it is what marks a path
 *  dirty, and writing through `localAdapter` is what leaves it clean. */
const adapter = driveAdapter(localAdapter)

const PATH = 'entries/body-2026-08.jsonl'

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  /* Signed out by default, so a write marks its path and fires nothing — each
     test then drives `push` and `pull` itself. */
  signedInAs.mockReturnValue('')
  remoteList.mockResolvedValue([PATH])
  remote.mockResolvedValue('from drive')
  upload.mockResolvedValue(undefined)
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
    upload.mockImplementationOnce(() => new Promise<void>((done) => (landed = done)))

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
    upload.mockImplementationOnce(() => new Promise<void>((done) => (landed = done)))

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

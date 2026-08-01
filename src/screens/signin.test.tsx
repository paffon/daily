/** The band is the whole of what a signed-out app says, so what it says and
 *  what it offers are both worth pinning down. Google is faked; nothing here
 *  is about GIS. */

vi.mock('../data/drive', () => ({ signIn: vi.fn() }))

import { fireEvent, render } from '@testing-library/preact'
import { signIn } from '../data/drive'
import { SignInBand } from './signin'

const asked = vi.mocked(signIn)

/** `navigator.onLine` is a getter on the prototype in jsdom, so it is replaced
 *  rather than spied on. */
const pretendOffline = (offline: boolean) =>
  Object.defineProperty(navigator, 'onLine', { value: !offline, configurable: true })

beforeEach(() => {
  vi.clearAllMocks()
  pretendOffline(false)
  asked.mockResolvedValue(true)
})

describe('the sign-in band', () => {
  it('states that nothing is reaching Drive, and offers the way back', async () => {
    const done = vi.fn()
    const { container } = render(<SignInBand onDone={done} />)
    expect(container.textContent).toContain('not syncing')

    fireEvent.click(container.querySelector<HTMLButtonElement>('.signin-band-go')!)
    await vi.waitFor(() => expect(done).toHaveBeenCalled())
  })

  it('leaves the app alone when the press wins no token', async () => {
    asked.mockResolvedValue(false)
    const done = vi.fn()
    const { container } = render(<SignInBand onDone={done} />)

    fireEvent.click(container.querySelector<HTMLButtonElement>('.signin-band-go')!)
    await vi.waitFor(() => expect(asked).toHaveBeenCalled())
    expect(done).not.toHaveBeenCalled()
  })

  it('offers no door offline, where a token request cannot open one', () => {
    pretendOffline(true)
    const { container } = render(<SignInBand onDone={vi.fn()} />)

    expect(container.textContent).toContain('not syncing')
    expect(container.querySelector('.signin-band-go')).toBeNull()
  })
})

/** The door is what a browser that has never synced — or that pressed sign
 *  out — shows, and the band is what every other screen wears above it.
 *  Google is faked; nothing here is about GIS. */

vi.mock('../data/drive', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  account: vi.fn(),
  remembering: vi.fn(),
  token: vi.fn(),
}))

import { fireEvent, render } from '@testing-library/preact'
import { account, remembering, signIn, signOut, token } from '../data/drive'
import { AccountBand, SignIn } from './signin'

const asked = vi.mocked(signIn)
const left = vi.mocked(signOut)
const named = vi.mocked(account)
const ticked = vi.mocked(remembering)
const held = vi.mocked(token)

beforeEach(() => {
  vi.clearAllMocks()
  asked.mockResolvedValue(true)
  named.mockReturnValue('')
  ticked.mockReturnValue(true)
  held.mockReturnValue('a-token')
})

describe('the sign-in screen', () => {
  const box = (container: Element) => container.querySelector<HTMLInputElement>('.signin-box')!
  const go = (container: Element) => container.querySelector<HTMLButtonElement>('.signin-go')!

  it('opens the app once a token arrives', async () => {
    const done = vi.fn()
    const { container } = render(<SignIn onDone={done} />)

    fireEvent.click(go(container))
    await vi.waitFor(() => expect(done).toHaveBeenCalled())
  })

  it('stays where it is when the press wins no token', async () => {
    asked.mockResolvedValue(false)
    const done = vi.fn()
    const { container } = render(<SignIn onDone={done} />)

    fireEvent.click(go(container))
    await vi.waitFor(() => expect(asked).toHaveBeenCalled())
    expect(done).not.toHaveBeenCalled()
  })

  it('opens with the box as the last press left it', () => {
    ticked.mockReturnValue(false)
    const { container } = render(<SignIn onDone={vi.fn()} />)

    expect(box(container).checked).toBe(false)
  })

  it('carries the box to the press, so unticking it means something', async () => {
    const { container } = render(<SignIn onDone={vi.fn()} />)

    fireEvent.click(box(container))
    fireEvent.click(go(container))

    await vi.waitFor(() => expect(asked).toHaveBeenCalledWith(false))
  })
})

describe('the account band', () => {
  const door = (container: Element) => container.querySelector<HTMLButtonElement>('.account-door')!

  it('carries the name on the signed-in account', () => {
    named.mockReturnValue('Omri Nardin')
    const { container } = render(<AccountBand onSignIn={vi.fn()} onSignOut={vi.fn()} />)

    expect(container.querySelector('.account-name')?.textContent).toBe('Omri Nardin')
  })

  it('draws the strip even with no name, because it carries the way out', () => {
    const { container } = render(<AccountBand onSignIn={vi.fn()} onSignOut={vi.fn()} />)

    expect(container.querySelector('.account-band')).not.toBeNull()
    expect(door(container).textContent).toBe('sign out')
  })

  it('signs out and hands back, which is what puts the door up', () => {
    const out = vi.fn()
    const { container } = render(<AccountBand onSignIn={vi.fn()} onSignOut={out} />)

    fireEvent.click(door(container))

    expect(left).toHaveBeenCalled()
    expect(out).toHaveBeenCalled()
  })

  it('says nothing is reaching Drive when the hour is up, and offers the press', async () => {
    held.mockReturnValue('')
    const back = vi.fn()
    const { container } = render(<AccountBand onSignIn={back} onSignOut={vi.fn()} />)

    expect(container.querySelector('.account-name')?.textContent).toBe('not reaching drive')

    fireEvent.click(door(container))
    await vi.waitFor(() => expect(back).toHaveBeenCalled())
    expect(left).not.toHaveBeenCalled()
  })
})

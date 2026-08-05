/** The door is the whole of what a signed-out app shows, and the band is what
 *  a signed-in one says about whose log it is. Google is faked; nothing here
 *  is about GIS. */

vi.mock('../data/drive', () => ({ signIn: vi.fn(), account: vi.fn() }))

import { fireEvent, render } from '@testing-library/preact'
import { account, signIn } from '../data/drive'
import { AccountBand, SignIn } from './signin'

const asked = vi.mocked(signIn)
const named = vi.mocked(account)

beforeEach(() => {
  vi.clearAllMocks()
  asked.mockResolvedValue(true)
  named.mockReturnValue('')
})

describe('the sign-in screen', () => {
  it('opens the app once a token arrives', async () => {
    const done = vi.fn()
    const { container } = render(<SignIn onDone={done} />)

    fireEvent.click(container.querySelector<HTMLButtonElement>('.signin-go')!)
    await vi.waitFor(() => expect(done).toHaveBeenCalled())
  })

  it('stays where it is when the press wins no token', async () => {
    asked.mockResolvedValue(false)
    const done = vi.fn()
    const { container } = render(<SignIn onDone={done} />)

    fireEvent.click(container.querySelector<HTMLButtonElement>('.signin-go')!)
    await vi.waitFor(() => expect(asked).toHaveBeenCalled())
    expect(done).not.toHaveBeenCalled()
  })
})

describe('the account band', () => {
  it('carries the name on the signed-in account', () => {
    named.mockReturnValue('Omri Nardin')
    const { container } = render(<AccountBand />)

    expect(container.querySelector('.account-name')?.textContent).toBe('Omri Nardin')
  })

  it('draws nothing at all rather than an empty strip when there is no name', () => {
    const { container } = render(<AccountBand />)

    expect(container.querySelector('.account-band')).toBeNull()
  })
})

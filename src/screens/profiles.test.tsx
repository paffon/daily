import { fireEvent, render } from '@testing-library/preact'
import { activeId, createProfile, defaultId, readProfiles, switchTo } from '../data/profile'
import { Profiles } from './profiles'

beforeEach(() => {
  localStorage.clear()
  location.hash = '#/profiles'
})

describe('the profiles screen', () => {
  it('lists every profile and marks the one this device is on', () => {
    switchTo(createProfile('maya').id)
    const { getByText } = render(<Profiles />)
    expect(getByText('main')).toBeTruthy()
    expect(getByText('maya')).toBeTruthy()
    expect(getByText('maya').closest('button')?.textContent).toContain('current')
    expect(getByText('main').closest('button')?.textContent).not.toContain('current')
  })

  it('switches on a press and lands on home', () => {
    const made = createProfile('maya')
    const { getByText } = render(<Profiles />)
    fireEvent.click(getByText('maya'))
    expect(activeId()).toBe(made.id)
    expect(location.hash).toBe('#/')
  })

  it('creates a profile from a typed name and enters it', () => {
    const { getByLabelText, getByText } = render(<Profiles />)
    fireEvent.input(getByLabelText('new profile name'), { target: { value: '  maya ' } })
    fireEvent.click(getByText('+ new profile'))

    const names = readProfiles().map((profile) => profile.name)
    expect(names).toEqual(['main', 'maya'])
    expect(activeId()).toBe(readProfiles()[1]?.id)
    expect(location.hash).toBe('#/')
  })

  it('does nothing on an empty name', () => {
    const { getByText } = render(<Profiles />)
    fireEvent.click(getByText('+ new profile'))
    expect(readProfiles()).toHaveLength(1)
    expect(location.hash).toBe('#/profiles')
  })

  it('stars the profile the app should open on, and stays put', () => {
    const made = createProfile('maya')
    const { getByLabelText } = render(<Profiles />)

    expect(getByLabelText('open on main').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(getByLabelText('open on maya'))

    expect(defaultId()).toBe(made.id)
    expect(getByLabelText('open on maya').getAttribute('aria-pressed')).toBe('true')
    expect(getByLabelText('open on main').getAttribute('aria-pressed')).toBe('false')
    /* the star is the reply — leaving for home would hide it */
    expect(location.hash).toBe('#/profiles')
  })

  it('follows the star on the device that set it', () => {
    const made = createProfile('maya')
    const { getByLabelText, getByText } = render(<Profiles />)
    fireEvent.click(getByLabelText('open on maya'))

    expect(activeId()).toBe(made.id)
    expect(getByText('maya').closest('button')?.textContent).toContain('current')
  })
})

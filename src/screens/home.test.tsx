import { render } from '@testing-library/preact'
import { MODULES } from '../data/entry'
import { Home } from './home'

describe('home, silent state', () => {
  it('names all five modules', () => {
    const { getByText } = render(<Home />)
    for (const module of MODULES) expect(getByText(module)).toBeTruthy()
  })

  it('says plainly that nothing is recorded rather than drawing a placeholder row', () => {
    const { getByText, container } = render(<Home />)
    expect(getByText('nothing recorded yet')).toBeTruthy()
    expect(container.querySelector('.home-row')).toBeNull()
  })

  it('carries no coach row and no steel dash', () => {
    const { container } = render(<Home />)
    expect(container.querySelector('[class*="coach"]')).toBeNull()
    expect(container.querySelector('[class*="dash"]')).toBeNull()
    // steel means "this is the live one" and home has nothing live to mark,
    // so the accent must not reach the markup by class or by inline style
    expect(container.innerHTML).not.toMatch(/coach|dash|steel/i)
  })

  it('reads out no progress', () => {
    const { container } = render(<Home />)
    expect(container.textContent ?? '').not.toMatch(/\d+\s*of\s*\d+/)
  })

  it('names the profile it is showing and the way to another one', () => {
    const { getByText } = render(<Home />)
    expect(getByText('main')).toBeTruthy()
    expect(getByText('switch profile').getAttribute('href')).toBe('#/profiles')
  })

  /* §2: making a second person is not something the front page of a logging
     app should suggest, so creating lives on the profiles screen and nowhere
     else. The library screen is the workout module's door, not home's. */
  it('offers no way to make a profile, and no door to a library', () => {
    const { container } = render(<Home />)
    expect(container.querySelector('a[href="#/profiles/new"]')).toBeNull()
    expect(container.textContent ?? '').not.toContain('new profile')
    expect(container.querySelector('a[href="#/exercises"]')).toBeNull()
  })

  /* §10.3: the report is downloaded from home's footer — a control, not a
     door: the file leaves and the screen stays, so it must not be a link. */
  it('offers the report from the footer, as a control rather than a route', () => {
    const { getByText, container } = render(<Home />)
    const control = getByText('download report')
    expect(control.closest('.home-foot')).not.toBeNull()
    expect(control.closest('a')).toBeNull()
    expect(container.querySelectorAll('.home-report')).toHaveLength(1)
  })
})

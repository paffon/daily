import { render } from '@testing-library/preact'
import { Home, MODULES } from './home'

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
    for (const el of container.querySelectorAll('*')) {
      expect(el.getAttribute('style') ?? '').not.toContain('steel')
    }
  })

  it('reads out no progress', () => {
    const { container } = render(<Home />)
    expect(container.textContent ?? '').not.toMatch(/\d+\s*of\s*\d+/)
  })
})

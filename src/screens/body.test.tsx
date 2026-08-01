import { fireEvent, render } from '@testing-library/preact'
import { Body } from './body'
import { ensureSeeded, readEntries, readJson, writeJson } from '../data/store'
import appSeed from '../seed/app.json'

const logWeight = (container: Element, value: string) => {
  const input = container.querySelector<HTMLInputElement>('.body-weight-value')!
  fireEvent.input(input, { target: { value } })
  fireEvent.click(container.querySelector<HTMLButtonElement>('.body-log')!)
}

beforeEach(() => {
  localStorage.clear()
  ensureSeeded()
})

describe('the body screen', () => {
  it('logs a weight as a body entry carrying the number', () => {
    const { container } = render(<Body />)
    logWeight(container, '72.4')

    const entries = readEntries('body')
    expect(entries).toHaveLength(1)
    expect(entries[0]?.module).toBe('body')
    expect(entries[0]?.payload['weight']).toBe(72.4)
    expect(entries[0]?.rev).toBe(1)
  })

  it('shows the weight before this one in Previous', () => {
    const first = render(<Body />)
    logWeight(first.container, '74.0')
    first.unmount()

    const { container } = render(<Body />)
    expect(container.querySelector('.field-previous')?.textContent).toContain('74 kg')
  })

  it('says nothing recorded yet rather than rendering an empty Previous', () => {
    const { container } = render(<Body />)
    const previous = container.querySelector('.field-previous')
    expect(previous).not.toBeNull()
    expect(previous?.textContent).toContain('nothing recorded yet')
  })

  it('takes the unit from config rather than from source', () => {
    writeJson('config/app.json', { ...appSeed, body: { weight_unit: 'st' } })
    const { container } = render(<Body />)
    logWeight(container, '11.4')

    expect(container.textContent).toContain('11.4 st')
    expect(container.textContent).not.toContain('kg')
    expect(readJson('config/app.json', appSeed).body.weight_unit).toBe('st')
  })

  it('draws no graph — the empty state is prose, and counts the data', () => {
    const { container } = render(<Body />)
    expect(container.querySelector('svg, canvas')).toBeNull()
    expect(container.querySelector('.body-summary')?.textContent).toBe('Nothing recorded yet.')

    logWeight(container, '72.4')
    expect(container.querySelector('.body-summary')?.textContent).toMatch(
      /^1 weight since \w+\. Not enough to draw a line yet\.$/,
    )
  })
})

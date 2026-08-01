import { fireEvent, render } from '@testing-library/preact'
import { loadLevels } from '../data/food'
import { ensureSeeded, readEntries, readJson, writeJson } from '../data/store'
import appSeed from '../seed/app.json'
import { Dance } from './dance'
// the screen's own source, through Vite rather than through `node:fs` — the
// bundler already reads files and `@types/node` would be a dependency for it
import danceSource from './dance.tsx?raw'

beforeEach(() => {
  localStorage.clear()
  ensureSeeded()
})

const press = (container: Element, selector: string) =>
  fireEvent.click(container.querySelector<HTMLButtonElement>(selector)!)

const shortcut = (container: Element, minutes: string) =>
  fireEvent.click(
    [...container.querySelectorAll<HTMLButtonElement>('.dance-shortcut')].find(
      (button) => button.textContent === minutes,
    )!,
  )

const chooseLevel = (container: Element, level: string) =>
  fireEvent.click(
    [...container.querySelectorAll<HTMLButtonElement>('.level .segmented button')].find((button) =>
      button.textContent?.includes(level),
    )!,
  )

const box = (container: Element) =>
  container.querySelector<HTMLInputElement>('[aria-label="duration"]')!

describe('the dance screen', () => {
  it('speaks dance’s own three words, read from the file', () => {
    const { container } = render(<Dance />)
    const words = [...container.querySelectorAll('.segmented-word')].map((w) => w.textContent)

    expect(words).toEqual(['marking', 'social', 'full-out'])
    expect(words).toEqual(loadLevels()['dance']?.scale)
    // never light/medium/hard, for the same reason an exercise is called
    // `dips yellow machine`
    expect(container.textContent).not.toMatch(/light|medium|hard/i)
  })

  it('logs the duration and the intensity, and nothing else', () => {
    const { container } = render(<Dance />)
    shortcut(container, '75')
    chooseLevel(container, 'social')
    press(container, '.dance-log')

    expect(readEntries('dance')[0]?.payload).toEqual({ duration_min: 75, level: 'social' })
  })

  it('takes a common duration as one tap, box and payload together', () => {
    const { container } = render(<Dance />)
    expect(box(container).value).toBe('60')

    shortcut(container, '90')
    expect(box(container).value).toBe('90')

    press(container, '.dance-log')
    expect(readEntries('dance')[0]?.payload['duration_min']).toBe(90)
  })

  it('takes the three numbers from config rather than from source', () => {
    writeJson('config/app.json', {
      ...readJson('config/app.json', appSeed),
      dance: { ...appSeed.dance, common_durations: [45, 120] },
    })

    const { container } = render(<Dance />)
    expect([...container.querySelectorAll('.dance-shortcut')].map((b) => b.textContent)).toEqual([
      '45',
      '120',
    ])
  })

  it('keeps every number it shows out of its own source', () => {
    // the shortcuts are seed data, so the screen that draws them must not know
    // what they are — the same rule that keeps a level scale out of source
    for (const literal of ['60', '75', '90']) expect(danceSource).not.toContain(literal)
  })

  it('carries no next-time mark and no rating of any kind', () => {
    const { container } = render(<Dance />)

    // intensity is a level — what the session was — and a mark would be an
    // instruction about the next one, which dance does not have
    expect(container.querySelector('.segmented-steel')).toBeNull()
    expect(container.querySelectorAll('.segmented')).toHaveLength(1)
    expect(container.querySelector('.segmented')?.className).toContain('segmented-ink-select')
    expect(container.textContent).not.toMatch(/more|less|difficulty|effort|rating|best/i)
  })

  it('shows the last session outright, because there is nothing to scope to', () => {
    const first = render(<Dance />)
    shortcut(first.container, '75')
    chooseLevel(first.container, 'full-out')
    press(first.container, '.dance-log')
    first.unmount()

    const { container } = render(<Dance />)
    expect(container.querySelector('.field-previous')?.textContent).toContain('75 min · full-out')
  })

  it('shows the last four sessions and no more', () => {
    for (let i = 0; i < 6; i++) {
      const { container, unmount } = render(<Dance />)
      shortcut(container, '60')
      press(container, '.dance-log')
      unmount()
    }

    expect(readEntries('dance')).toHaveLength(6)
    expect(render(<Dance />).container.querySelectorAll('.dance-rail-row')).toHaveLength(4)
  })

  it('draws no graph, and says plainly what there is instead', () => {
    const { container } = render(<Dance />)
    expect(container.querySelector('svg, canvas')).toBeNull()
    expect(container.querySelector('.dance-rail-progress')?.textContent).toBe(
      'progress · 0 sessions, not enough to draw',
    )
  })
})

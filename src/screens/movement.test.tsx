import { fireEvent, render } from '@testing-library/preact'
import { PostureBar } from '../components/posture_bar'
import { hintOf, loadSegments } from '../data/segment'
import { ensureSeeded, readEntries } from '../data/store'
import { Movement } from './movement'

beforeEach(() => {
  localStorage.clear()
  ensureSeeded()
})

describe('the posture bar', () => {
  const drawn = (span: number, sitting: number) =>
    render(<PostureBar span={span} sitting={sitting} />).container.querySelector<HTMLElement>(
      '.posture-bar',
    )!

  const grew = (bar: Element) =>
    [...bar.children].map((part) => (part as HTMLElement).style.flexGrow)

  it('is the reading, so it writes no percentage and no number at all', () => {
    const bar = drawn(8, 6)
    // the proportion lives in flex-grow, which is why nothing is written: no
    // `75%`, no `6 of 8`, and no labels under the parts
    expect(bar.textContent).toBe('')
    expect(bar.textContent).not.toMatch(/\d/)
    expect(bar.innerHTML).not.toContain('%')
  })

  it('splits the span into sitting, standing and what is left over', () => {
    expect(grew(drawn(8, 6))).toEqual(['6', '2', ''])
  })

  it('sizes against the span rather than against a fixed day', () => {
    // half a working day sitting is the same picture whether the span is 8
    // hours or 4 — the bar is a proportion, and the span is what it is of
    expect(grew(drawn(4, 2))).toEqual(['2', '2', ''])
  })

  it('refuses to draw more sitting than the day had hours', () => {
    // a typed 10 in an 8 hour span is a typo, and a bar drawn past its own end
    // would be the app inventing two hours that were never logged
    expect(grew(drawn(8, 10))).toEqual(['8', '0', ''])
    expect(grew(drawn(8, -3))).toEqual(['0', '8', ''])
  })

  it('draws an empty bar for a block with no span yet', () => {
    expect(grew(drawn(0, 0))).toEqual(['0', '0', ''])
  })
})

describe('the segment library', () => {
  it('ships the user’s own commute, in both directions', () => {
    const names = loadSegments().map((segment) => segment.name)
    for (const leg of ['to work', 'from work']) expect(names).toContain(leg)
  })

  it('counts stairs, because the line is intent rather than intensity', () => {
    expect(loadSegments().map((segment) => segment.name)).toContain('stairs at home')
  })

  it('gives every seeded route a distance and a gradient', () => {
    for (const segment of loadSegments()) {
      expect(typeof segment.distance_km).toBe('number')
      expect(['flat', 'rising', 'descending', 'mixed']).toContain(segment.gradient)
    }
  })

  it('reads a distance and a gradient as one line beside the title', () => {
    const toWork = loadSegments().find((segment) => segment.name === 'to work')!
    expect(hintOf(toWork)).toBe('2.8 km · mixed')
  })

  it('says nothing at all for a segment that is only a name', () => {
    // what an ad-hoc segment is: typed into the picker mid-log, with neither
    // number, and still a valid thing to log against
    expect(hintOf({ id: 'x', name: 'around the block' })).toBe('')
  })
})

describe('the movement screen', () => {
  const pick = (container: Element, name: string) =>
    fireEvent.click(
      [...container.querySelectorAll<HTMLButtonElement>('.picker-item')].find(
        (item) => item.textContent?.startsWith(name),
      )!,
    )

  const press = (container: Element, selector: string) =>
    fireEvent.click(container.querySelector<HTMLButtonElement>(selector)!)

  const type = (container: Element, label: string, value: string) =>
    fireEvent.input(container.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!, {
      target: { value },
    })

  const chooseLevel = (container: Element, level: string) =>
    fireEvent.click(
      [...container.querySelectorAll<HTMLButtonElement>('.level .segmented button')].find(
        (button) => button.textContent?.includes(level),
      )!,
    )

  const railLines = (container: Element) =>
    [...container.querySelectorAll('.movement-rail-what')].map((row) => row.textContent)

  const logToWork = (container: Element) => {
    pick(container, 'to work')
    type(container, 'duration', '18')
    chooseLevel(container, 'steady')
    press(container, '.movement-log')
  }

  const logBlock = (container: Element) => {
    press(container, '.movement-add-block')
    type(container, 'span', '8')
    type(container, 'sitting', '6')
    press(container, '.movement-log')
  }

  it('logs both entry types into one module, told apart by payload.type', () => {
    const { container } = render(<Movement />)
    logToWork(container)
    logBlock(container)

    const entries = readEntries('movement')
    expect(entries).toHaveLength(2)
    expect(entries.every((entry) => entry.module === 'movement')).toBe(true)
    expect(entries.map((entry) => entry.payload['type']).sort()).toEqual(['posture', 'segment'])
  })

  it('records a segment as the route, the duration and the speed', () => {
    const { container } = render(<Movement />)
    logToWork(container)

    expect(readEntries('movement')[0]?.payload).toEqual({
      type: 'segment',
      segment_id: 'to-work',
      duration_min: 18,
      level: 'steady',
    })
  })

  it('records a posture block as one entry for the whole day', () => {
    const { container } = render(<Movement />)
    logBlock(container)

    // `8h workday, ~6 sitting` is one entry and not fourteen
    expect(readEntries('movement')).toHaveLength(1)
    expect(readEntries('movement')[0]?.payload).toEqual({
      type: 'posture',
      span_hours: 8,
      sitting_hours: 6,
    })
  })

  it('shows what the route is beside what it is called', () => {
    const { container } = render(<Movement />)
    pick(container, 'to work')
    expect(container.querySelector('.movement-hint')?.textContent).toBe('2.8 km · mixed')
  })

  it('writes no percentage and no ratio anywhere on the posture form', () => {
    const { container } = render(<Movement />)
    press(container, '.movement-add-block')

    // the bar is the reading — `75%`, `6 of 8` and `three quarters` are all
    // the same fact said again, in the register this module exists to avoid
    expect(container.textContent).not.toContain('%')
    expect(container.textContent).not.toMatch(/\d\s*(of|\/)\s*\d/)
    expect(container.querySelector('.posture-bar')).not.toBeNull()
    expect(container.querySelector('.posture-bar')?.textContent).toBe('')
  })

  it('carries no next-time mark and no second scale', () => {
    const { container } = render(<Movement />)
    pick(container, 'to work')

    // speed is the only scale here: nothing is progressively loaded on a walk,
    // so there is no mark and no rating of how hard the commute was
    expect(container.querySelectorAll('.segmented')).toHaveLength(1)
    expect(container.querySelector('.segmented-steel')).toBeNull()
    expect(container.querySelector('.segmented')?.className).toContain('segmented-ink-select')
    expect(container.textContent).not.toMatch(/difficulty|effort|more|less|rating/i)
  })

  it('reads the speed scale from the file rather than from source', () => {
    const { container } = render(<Movement />)
    pick(container, 'to work')

    const words = [...container.querySelectorAll('.segmented-word')].map((w) => w.textContent)
    expect(words).toEqual(['stroll', 'steady', 'brisk'])
  })

  it('rules the blocks off below the events in one list', () => {
    const { container } = render(<Movement />)
    logToWork(container)
    logBlock(container)

    expect(railLines(container)).toEqual(['to work · 18 min · steady', '8 h · 6 sitting'])
    expect(container.querySelector('.movement-rail-blocks')?.textContent).toContain('6 sitting')
    expect(container.querySelectorAll('.movement-rail-label')).toHaveLength(1)
  })

  it('prefills the block from the last one for the days that repeat', () => {
    const first = render(<Movement />)
    press(first.container, '.movement-add-block')
    type(first.container, 'span', '9')
    type(first.container, 'sitting', '7')
    press(first.container, '.movement-log')
    first.unmount()

    const { container } = render(<Movement />)
    press(container, '.movement-add-block')
    expect(container.querySelector<HTMLInputElement>('[aria-label="span"]')?.value).toBe('8')

    press(container, '.movement-repeat')
    expect(container.querySelector<HTMLInputElement>('[aria-label="span"]')?.value).toBe('9')
    expect(container.querySelector<HTMLInputElement>('[aria-label="sitting"]')?.value).toBe('7')
  })

  it('opens the same route again at its own opening duration', () => {
    const { container } = render(<Movement />)
    logToWork(container)

    // the box holds what was typed, so a second walk on the same route would
    // go on showing 18 while the payload had already been reset to 20 — the
    // number on screen and the number logged have to be the same number
    pick(container, 'to work')
    expect(container.querySelector<HTMLInputElement>('[aria-label="duration"]')?.value).toBe('20')
    press(container, '.movement-log')
    // the two share a timestamp to the second, so neither is the newer one —
    // what matters is that the second walk logged what its box was showing
    expect(readEntries('movement').map((entry) => entry.payload['duration_min'])).toEqual(
      expect.arrayContaining([18, 20]),
    )
  })

  it('offers nothing to repeat before a block has ever been logged', () => {
    const { container } = render(<Movement />)
    press(container, '.movement-add-block')
    expect(container.querySelector<HTMLButtonElement>('.movement-repeat')?.disabled).toBe(true)
  })

  it('scopes Previous to the route rather than to the day', () => {
    const first = render(<Movement />)
    logToWork(first.container)
    first.unmount()

    const { container } = render(<Movement />)
    pick(container, 'to work')
    expect(container.querySelector('.field-previous')?.textContent).toContain('18 min · steady')

    press(container, '.movement-change')
    pick(container, 'park loop')
    expect(container.querySelector('.field-previous')?.textContent).toContain('nothing recorded yet')
  })

  it('makes a library segment out of what was typed to find it', () => {
    const { container } = render(<Movement />)
    fireEvent.input(container.querySelector<HTMLInputElement>('.picker-filter')!, {
      target: { value: 'around the block' },
    })
    press(container, '.picker-new')

    expect(container.querySelector('.movement-title')?.textContent).toBe('around the block')
    expect(loadSegments().some((segment) => segment.name === 'around the block')).toBe(true)
    // a route made mid-log has neither number, and is still loggable
    expect(container.querySelector('.movement-hint')?.textContent).toBe('')
  })

  it('draws no graph, and says plainly what there is instead', () => {
    const { container } = render(<Movement />)
    expect(container.querySelector('svg, canvas')).toBeNull()
    expect(container.querySelector('.movement-rail-progress')?.textContent).toBe(
      'progress · 0 entries, not enough to draw',
    )
  })
})

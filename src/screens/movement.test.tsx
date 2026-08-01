import { render } from '@testing-library/preact'
import { PostureBar } from '../components/posture_bar'
import { hintOf, loadSegments } from '../data/segment'
import { ensureSeeded } from '../data/store'

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

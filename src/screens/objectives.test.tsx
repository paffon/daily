import { fireEvent, render } from '@testing-library/preact'
import { Objectives } from './objectives'
import { readObjectives } from '../data/objectives'
import { newEntry } from '../data/entry'
import { ensureSeeded, putEntry, writeJson } from '../data/store'
import appSeed from '../seed/app.json'

const statement = (container: Element) =>
  container.querySelector<HTMLTextAreaElement>('.obj-statement')!

const addObjective = (container: Element) =>
  fireEvent.click(container.querySelector<HTMLButtonElement>('.obj-add')!)

const fieldNamed = (container: Element, label: string) =>
  [...container.querySelectorAll('.obj-field')]
    .find((field) => field.querySelector('.obj-field-label')?.textContent === label)!
    .querySelector<HTMLInputElement | HTMLSelectElement>('input, select')!

beforeEach(() => {
  localStorage.clear()
  ensureSeeded()
})

describe('the objectives screen', () => {
  it('ships with no objectives, because a shipped one would be a hard-coded target', () => {
    const { container } = render(<Objectives />)
    expect(readObjectives().targets).toEqual([])
    expect(readObjectives().statement).toBe('')
    expect(container.querySelectorAll('.obj-row')).toHaveLength(0)
  })

  it('stores the statement of intent on blur, and parses nothing out of it', () => {
    const { container } = render(<Objectives />)
    const written = 'Rebuild what I had at 28 without wrecking the knee again. Stay about 74.'
    fireEvent.change(statement(container), { target: { value: written } })

    /* stored whole and untouched — no keywords lifted, no targets derived */
    expect(readObjectives().statement).toBe(written)
    expect(readObjectives().targets).toEqual([])
    expect(container.querySelector('.obj-yours')?.textContent).toContain('never read by the app')
  })

  it('adds a target inline and states its fact beside it', () => {
    const { container } = render(<Objectives />)
    addObjective(container)
    fireEvent.change(fieldNamed(container, 'said as'), { target: { value: '3 workouts a week' } })

    expect(readObjectives().targets).toHaveLength(1)
    expect(container.querySelector('.obj-label')?.textContent).toBe('3 workouts a week')
    expect(container.querySelector('.obj-fact')?.textContent).toBe('nothing yet')
  })

  it('counts what has been logged, and says so as a fact', () => {
    putEntry(newEntry('workout', { body_parts: ['back'] }))
    const { container } = render(<Objectives />)
    addObjective(container)

    expect(container.querySelector('.obj-fact')?.textContent).toBe('1 this week')
  })

  it('takes a new objective’s shape from config rather than from source', () => {
    const objectives = {
      ...appSeed.objectives,
      new_target: [{ kind: 'count', label: '', module: 'dance', per: 'week', target: 2 }],
    }
    writeJson('config/app.json', { ...appSeed, objectives })

    const { container } = render(<Objectives />)
    addObjective(container)

    expect(readObjectives().targets[0]).toMatchObject({ module: 'dance', target: 2 })
    expect(fieldNamed(container, 'counting').value).toBe('dance')
  })

  it('swaps a target to the other kind, keeping the words and dropping the rest', () => {
    const { container } = render(<Objectives />)
    addObjective(container)
    fireEvent.change(fieldNamed(container, 'said as'), { target: { value: 'protein up' } })
    fireEvent.change(fieldNamed(container, 'kind'), { target: { value: 'direction' } })

    expect(readObjectives().targets[0]).toEqual({
      kind: 'direction',
      label: 'protein up',
      direction: 'stable',
    })
    expect(container.querySelector('.obj-fact')?.textContent).toBe('direction')
  })

  it('removes a target from the row that shows it', () => {
    const { container } = render(<Objectives />)
    addObjective(container)
    fireEvent.click(container.querySelector<HTMLButtonElement>('.obj-remove')!)

    expect(readObjectives().targets).toEqual([])
    expect(container.querySelectorAll('.obj-row')).toHaveLength(0)
  })

  it('keeps an edit across a reload, because it went to the store and not to state', () => {
    const first = render(<Objectives />)
    addObjective(first.container)
    fireEvent.change(fieldNamed(first.container, 'said as'), { target: { value: 'weight stable' } })
    first.unmount()

    const { container } = render(<Objectives />)
    expect(container.querySelector('.obj-label')?.textContent).toBe('weight stable')
  })

  it('draws no bar, ring, percentage or red state — a target is not a debt', () => {
    putEntry(newEntry('workout', {}))
    const { container } = render(<Objectives />)
    addObjective(container)
    fireEvent.change(fieldNamed(container, 'said as'), { target: { value: '3 workouts a week' } })

    /* scanned with the row's fields open, so the editing surface is covered
       too — that is where a progress control would be reached for */
    const markup = container.innerHTML
    for (const forbidden of ['progress', 'meter', 'progressbar', '%', '--danger:', 'behind']) {
      expect(markup).not.toContain(forbidden)
    }
    expect(container.querySelector('progress, meter, [role="progressbar"]')).toBeNull()
    expect(container.querySelector('svg, canvas')).toBeNull()

    /* the fact says what happened, and never what is left of the target */
    expect(container.querySelector('.obj-fact')?.textContent).toBe('1 this week')
  })
})

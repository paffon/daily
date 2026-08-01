import { fireEvent, render } from '@testing-library/preact'
import { newEntry } from '../data/entry'
import type { Entry } from '../data/entry'
import { ensureSeeded, getEntry, putEntry, recentEntries } from '../data/store'
import { EditEntry } from './edit_entry'
import { Home } from './home'
/* body registers its renderer as a side effect of being imported, which is how
   every module phase plugs into this screen */
import './body'

const stored = (entry: Entry): Entry => {
  putEntry(entry)
  return entry
}

const weight = (ts: string, value: number) => stored(newEntry('body', { weight: value }, ts))

const setDate = (container: Element, day: string) =>
  fireEvent.input(container.querySelector<HTMLInputElement>('.field-stamp-edit input[type=date]')!, {
    target: { value: day },
  })

const press = (container: Element, selector: string) =>
  fireEvent.click(container.querySelector<HTMLButtonElement>(selector)!)

beforeEach(() => {
  localStorage.clear()
  ensureSeeded()
})

describe('editing an entry', () => {
  it('moves an entry back across a month boundary, leaving one copy', () => {
    const entry = weight('2026-08-31T23:30:00+03:00', 72.4)
    const { container } = render(<EditEntry id={entry.id} />)

    setDate(container, '2026-07-31')
    press(container, '.edit-save')

    expect(localStorage.getItem('daily:entries/body-2026-07.jsonl')).toContain(entry.id)
    expect(localStorage.getItem('daily:entries/body-2026-08.jsonl')).not.toContain(entry.id)
    expect(recentEntries(6)).toHaveLength(1)
    expect(getEntry(entry.id)?.rev).toBe(2)
  })

  it('keeps the edited weight, written through the module that owns it', () => {
    const entry = weight('2026-08-01T07:35:00+03:00', 72.4)
    const { container } = render(<EditEntry id={entry.id} />)

    fireEvent.input(container.querySelector<HTMLInputElement>('.body-weight-value')!, {
      target: { value: '71.8' },
    })
    press(container, '.edit-save')

    expect(getEntry(entry.id)?.payload['weight']).toBe(71.8)
  })

  it('deletes the entry off home, and leaves the tombstone behind', () => {
    const entry = weight('2026-08-01T07:35:00+03:00', 72.4)
    const { container } = render(<EditEntry id={entry.id} />)

    press(container, '.field-danger')
    press(container, '.field-danger')

    expect(recentEntries(6)).toHaveLength(0)
    expect(getEntry(entry.id)?.deleted).toBe(true)
    expect(localStorage.getItem('daily:entries/body-2026-08.jsonl')).toContain(entry.id)
  })

  it('asks a second press before deleting, without raising a dialog', () => {
    const entry = weight('2026-08-01T07:35:00+03:00', 72.4)
    const { container } = render(<EditEntry id={entry.id} />)

    press(container, '.field-danger')
    expect(recentEntries(6)).toHaveLength(1)
    expect(container.querySelector('dialog')).toBeNull()
  })

  it('leaves the stored entry alone on discard', () => {
    const entry = weight('2026-08-31T23:30:00+03:00', 72.4)
    const { container } = render(<EditEntry id={entry.id} />)

    setDate(container, '2026-07-31')
    press(container, '.edit-discard')

    expect(getEntry(entry.id)?.ts).toBe('2026-08-31T23:30:00+03:00')
    expect(getEntry(entry.id)?.rev).toBe(1)
  })

  it('counts the revisions quietly, and never as a correction', () => {
    const once = stored({ ...weight('2026-08-01T07:35:00+03:00', 72.4), rev: 2 })
    expect(render(<EditEntry id={once.id} />).container.textContent).toContain('changed once')

    const thrice = stored({ ...weight('2026-08-02T07:35:00+03:00', 72.1), rev: 4 })
    expect(render(<EditEntry id={thrice.id} />).container.textContent).toContain('changed 3 times')

    const untouched = weight('2026-08-03T07:35:00+03:00', 72.0)
    const { container } = render(<EditEntry id={untouched.id} />)
    expect(container.textContent).toContain('unchanged since')
    expect(container.textContent).toMatch(/recorded \d{2}:\d{2}/)
  })

  it('says plainly that a module editor is not built yet rather than throwing', () => {
    const entry = stored(newEntry('workout', { sets: 3 }, '2026-08-01T19:40:00+03:00'))
    const { container } = render(<EditEntry id={entry.id} />)

    expect(container.textContent).toContain('the workout editor is not built yet')
    expect(container.querySelector('.edit-payload')?.textContent).toContain('"sets": 3')
    expect(container.querySelector('.field-stamp-edit')).not.toBeNull()
  })

  it('says so when the id names nothing, rather than rendering an empty form', () => {
    const { container } = render(<EditEntry id="a-lost-id" />)

    expect(container.textContent).toContain('no entry is stored under that id')
    expect(container.querySelector('.edit-actions')).toBeNull()
  })

  it('offers nothing to edit on an entry already deleted', () => {
    const entry = weight('2026-08-01T07:35:00+03:00', 72.4)
    const { container } = render(<EditEntry id={entry.id} />)
    press(container, '.field-danger')
    press(container, '.field-danger')

    // back onto the same hash: the tombstone is not an entry, and offering it
    // for editing would be the restore surface the app does without
    const back = render(<EditEntry id={entry.id} />)
    expect(back.container.textContent).toContain('no entry is stored under that id')
    expect(back.container.querySelector('.edit-actions')).toBeNull()
    expect(back.container.querySelector('.field-danger')).toBeNull()
  })

  it('is what home opens a recent row onto', () => {
    const entry = weight('2026-08-01T07:35:00+03:00', 72.4)
    const { container } = render(<Home />)

    expect(container.querySelector<HTMLAnchorElement>('.home-row')?.getAttribute('href')).toBe(
      `#/entry/${entry.id}`,
    )
  })
})

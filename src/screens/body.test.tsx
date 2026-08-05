/** Only the upload is faked — there is no Drive here and `resize` is a canvas
 *  draw jsdom cannot do. Everything the screen decides on top of it is real. */
vi.mock('../data/photos', async (original) => ({
  ...(await original<typeof import('../data/photos')>()),
  putPhoto: vi.fn(),
  photoUrl: vi.fn(async () => null),
}))

import { fireEvent, render, waitFor } from '@testing-library/preact'
import { Body } from './body'
import { putPhoto } from '../data/photos'
import { newEntry } from '../data/entry'
import { ensureSeeded, putEntry, readEntries, readJson, writeJson } from '../data/store'
import appSeed from '../seed/app.json'

const upload = vi.mocked(putPhoto)

const logWeight = (container: Element, value: string) => {
  const input = container.querySelector<HTMLInputElement>('.body-weight-value')!
  fireEvent.input(input, { target: { value } })
  fireEvent.click(container.querySelector<HTMLButtonElement>('.body-log')!)
}

const choosePhoto = (container: Element) =>
  fireEvent.change(container.querySelector<HTMLInputElement>('.body-photo input')!, {
    target: { files: [new File(['jpeg bytes'], 'shot.jpg', { type: 'image/jpeg' })] },
  })

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  upload.mockResolvedValue('photos/2026-08-01.jpg')
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

  it('shows the weight before this one in Previous, written as it was typed', () => {
    const first = render(<Body />)
    logWeight(first.container, '74.0')
    first.unmount()

    const { container } = render(<Body />)
    expect(container.querySelector('.field-previous')?.textContent).toContain('74.0 kg')
  })

  it('survives a date segment being cleared mid-edit', () => {
    const { container } = render(<Body />)
    fireEvent.click(container.querySelector<HTMLButtonElement>('.field-stamp-box')!)

    const date = container.querySelector<HTMLInputElement>('.field-stamp-edit input[type=date]')!
    expect(() => fireEvent.input(date, { target: { value: '' } })).not.toThrow()
    expect(container.querySelector('.body-strip')?.textContent).not.toContain('invalid')

    fireEvent.input(date, { target: { value: '2026-07-12' } })
    expect(container.querySelector('.body-strip')?.textContent).toContain('12 july')
  })

  it('says nothing recorded yet rather than rendering an empty Previous', () => {
    const { container } = render(<Body />)
    const previous = container.querySelector('.field-previous')
    expect(previous).not.toBeNull()
    expect(previous?.textContent).toContain('nothing recorded yet')
  })

  it('takes the unit from config rather than from source', () => {
    writeJson('config/app.json', { ...appSeed, body: { ...appSeed.body, weight_unit: 'st' } })
    const { container } = render(<Body />)
    logWeight(container, '11.4')

    expect(container.textContent).toContain('11.4 st')
    expect(container.textContent).not.toContain('kg')
    expect(readJson('config/app.json', appSeed).body.weight_unit).toBe('st')
  })

  it('draws no graph — the empty state is prose, and counts the data', () => {
    const { container } = render(<Body />)
    expect(container.querySelector('svg, canvas')).toBeNull()
    expect(container.querySelector('.body-summary')?.textContent).toBe('No weights recorded yet.')

    logWeight(container, '72.4')
    expect(container.querySelector('.body-summary')?.textContent).toMatch(
      /^1 weight since \w+\. Not enough to draw a line yet\.$/,
    )
  })

  it('records a photo as a body entry naming the file, and not as a weight', async () => {
    const { container } = render(<Body />)
    choosePhoto(container)

    await waitFor(() => expect(readEntries('body')).toHaveLength(1))
    const stored = readEntries('body')[0]!
    expect(stored.module).toBe('body')
    expect(stored.payload['photo']).toBe('photos/2026-08-01.jpg')
    expect(stored.payload['weight']).toBeUndefined()
    /* the bytes are Drive's, never the store's — nothing under `photos/` is
       allowed into the mirror every entry ever logged shares */
    expect(localStorage.getItem('daily:photos/2026-08-01.jpg')).toBeNull()
  })

  it('adds a photo without taking the typed weight or the chosen time with it', async () => {
    const { container } = render(<Body />)
    fireEvent.click(container.querySelector<HTMLButtonElement>('.field-stamp-box')!)
    fireEvent.input(
      container.querySelector<HTMLInputElement>('.field-stamp-edit input[type=date]')!,
      { target: { value: '2026-07-12' } },
    )
    const weight = container.querySelector<HTMLInputElement>('.body-weight-value')!
    fireEvent.input(weight, { target: { value: '72.4' } })

    choosePhoto(container)
    await waitFor(() => expect(readEntries('body')).toHaveLength(1))

    /* the photo is an addition — what was half-typed is still there to log */
    expect(weight.value).toBe('72.4')
    fireEvent.click(container.querySelector<HTMLButtonElement>('.body-log')!)

    const entries = readEntries('body')
    const logged = entries.find((entry) => entry.payload['weight'] !== undefined)!
    const photo = entries.find((entry) => entry.payload['photo'] !== undefined)!
    expect(logged.payload['weight']).toBe(72.4)
    expect(logged.ts).toBe(photo.ts)
    expect(logged.ts.startsWith('2026-07-12')).toBe(true)
  })

  it('counts photos in the rail with their months, rather than listing them', async () => {
    putEntry(newEntry('body', { photo: 'photos/2026-04-06.jpg' }, '2026-04-06T08:00:00+03:00'))
    putEntry(newEntry('body', { photo: 'photos/2026-05-02.jpg' }, '2026-05-02T08:00:00+03:00'))
    putEntry(newEntry('body', { photo: 'photos/2026-07-04.jpg' }, '2026-07-04T08:00:00+03:00'))
    putEntry(newEntry('body', { weight: 73.1 }, '2026-07-12T07:40:00+03:00'))

    const { container } = render(<Body />)
    expect(container.querySelector('.body-rail-photos')?.textContent).toBe(
      'photos3 · april, may, july',
    )
    /* the weights are listed one by one; the photos are not */
    expect(container.querySelectorAll('.body-rail-row')).toHaveLength(1)
    expect(container.querySelector('.body-summary')?.textContent).toContain('1 weight since july')
  })

  it('says nothing about photos before there are any', () => {
    const { container } = render(<Body />)
    expect(container.querySelector('.body-rail-photos')).toBeNull()
  })

  it('records nothing when the upload fails, and says the press did not land', async () => {
    upload.mockRejectedValue(new Error('offline'))
    const { container } = render(<Body />)
    choosePhoto(container)

    await waitFor(() => expect(container.querySelector('.body-trouble')).not.toBeNull())
    expect(readEntries('body')).toHaveLength(0)
  })
})

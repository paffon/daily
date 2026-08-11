/** Only the shrink and the upload are faked — there is no Drive here, and the
 *  shrink is a canvas draw jsdom cannot do. The wiring on top of them is real:
 *  a drop lands in the same path the picker feeds, and the block says while a
 *  file is over it that the drop will land. */
vi.mock('../data/photos', async (original) => ({
  ...(await original<typeof import('../data/photos')>()),
  shrinkItemPhoto: vi.fn(),
  putBinary: vi.fn(),
  photoUrl: vi.fn(async () => null),
}))

import { fireEvent, render, waitFor } from '@testing-library/preact'
import { ItemPhoto } from './item_photo'
import { itemPhotoPath, putBinary, shrinkItemPhoto } from '../data/photos'

const shrink = vi.mocked(shrinkItemPhoto)
const put = vi.mocked(putBinary)

const shot = () => new File(['jpeg bytes'], 'machine.jpg', { type: 'image/jpeg' })
const small = new Blob(['small'], { type: 'image/jpeg' })

const drag = (files: File[]) => ({ dataTransfer: { types: ['Files'], files } })

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  shrink.mockResolvedValue(small)
  put.mockResolvedValue('')
  /* jsdom has neither; the screen shows the very bytes that went up */
  URL.createObjectURL = vi.fn(() => 'blob:up')
  URL.revokeObjectURL = vi.fn()
})

describe('the item photo block', () => {
  it('says while a file is over it that the drop will land, and stops when it leaves', () => {
    const { container } = render(<ItemPhoto kind="exercise" id="chest-press" name="chest press" />)
    const block = container.querySelector('.item-photo')!

    fireEvent.dragOver(block, drag([]))
    expect(block.className).toContain('item-photo-over')

    fireEvent.dragLeave(block, {})
    expect(block.className).not.toContain('item-photo-over')
  })

  it('takes a dropped image through the same path the picker feeds', async () => {
    const { container } = render(<ItemPhoto kind="exercise" id="chest-press" name="chest press" />)
    const file = shot()

    fireEvent.drop(container.querySelector('.item-photo')!, drag([file]))

    await waitFor(() =>
      expect(put).toHaveBeenCalledWith(itemPhotoPath('exercise', 'chest-press'), small),
    )
    expect(shrink).toHaveBeenCalledWith(file)
    /* shown from the bytes that went up, not fetched back */
    await waitFor(() => expect(container.querySelector('.item-photo-shot')).not.toBeNull())
    expect(container.querySelector('.item-photo')?.className).not.toContain('item-photo-over')
  })

  it('leaves a drop that carries no image where it was', () => {
    const { container } = render(<ItemPhoto kind="food" id="pizza" name="pizza" />)

    fireEvent.drop(
      container.querySelector('.item-photo')!,
      drag([new File(['notes'], 'notes.txt', { type: 'text/plain' })]),
    )

    expect(shrink).not.toHaveBeenCalled()
    expect(put).not.toHaveBeenCalled()
  })

  it('still takes one from the picker, which stays for the phone', async () => {
    const { container } = render(<ItemPhoto kind="exercise" id="chest-press" name="chest press" />)

    fireEvent.change(container.querySelector<HTMLInputElement>('.item-photo-add input')!, {
      target: { files: [shot()] },
    })

    await waitFor(() => expect(put).toHaveBeenCalled())
  })

  it('says so when the upload does not land, and shows nothing new', async () => {
    put.mockRejectedValue(new Error('offline'))
    const { container } = render(<ItemPhoto kind="exercise" id="chest-press" name="chest press" />)

    fireEvent.drop(container.querySelector('.item-photo')!, drag([shot()]))

    await waitFor(() =>
      expect(container.querySelector('.item-photo-trouble')?.textContent).toContain('drive'),
    )
    expect(container.querySelector('.item-photo-shot')).toBeNull()
  })
})

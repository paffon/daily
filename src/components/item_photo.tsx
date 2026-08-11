import { useEffect, useRef, useState } from 'preact/hooks'
import type { VNode } from 'preact'
import { token } from '../data/drive'
import { itemPhotoPath, photoUrl, putBinary, shrinkItemPhoto } from '../data/photos'
import './item_photo.css'

/** A library item's own picture — the yellow machine, the actual plate — added
 *  from the screen that logs it and resolved by naming convention from the
 *  photos folder (`DESIGN.md` §10.2). Photos are never mirrored, so the bytes
 *  come from Drive when the item is on screen and the button is all there is
 *  until they do. */
export function ItemPhoto({
  kind,
  id,
  name,
}: {
  kind: 'exercise' | 'food'
  id: string
  name: string
}): VNode {
  const [url, setUrl] = useState<string | null>(null)
  const [trouble, setTrouble] = useState('')
  /** A file is mid-drag over the block — the outline that says the drop will
   *  land here. */
  const [over, setOver] = useState(false)
  /** The object URL on screen, held for revoking — swapping items or leaving
   *  the screen must not leave decoded JPEGs pinned in memory. */
  const held = useRef('')
  /** Which item is on screen right now. An upload runs across awaits, and the
   *  item can change under it — its photo must not land on the next one. */
  const showing = useRef('')
  showing.current = `${kind}:${id}`

  const show = (next: string) => {
    if (held.current !== '') URL.revokeObjectURL(held.current)
    held.current = next
    setUrl(next === '' ? null : next)
  }

  useEffect(() => {
    let live = true
    show('')
    setTrouble('')
    /* signed out there is no Drive to ask, and the button alone is the truth */
    if (token() === '') return
    void photoUrl(itemPhotoPath(kind, id)).then((ready) => {
      if (ready === null) return
      if (live) show(ready)
      else URL.revokeObjectURL(ready)
    })
    return () => {
      live = false
    }
  }, [kind, id])

  useEffect(() => () => show(''), [])

  /** The body module's press, with the opposite policy: this one is compressed
   *  hard on the way in (§10.2), because a picture of a machine is a reminder
   *  and a picture of a body is a measurement. Straight to Drive either way,
   *  and shown from the very bytes that went up rather than fetched back.
   *  Offline this is the one press on the screen that cannot work, and saying
   *  so beats doing nothing visibly. Fed by the picker and by a drop alike. */
  const add = async (file: Blob) => {
    setTrouble('')
    const item = showing.current
    try {
      const small = await shrinkItemPhoto(file)
      await putBinary(itemPhotoPath(kind, id), small)
      if (showing.current === item) show(URL.createObjectURL(small))
    } catch {
      if (showing.current === item) {
        setTrouble('the photo did not reach drive — it is the one thing here that needs a signal.')
      }
    }
  }

  const picked = (picker: HTMLInputElement) => {
    const file = picker.files?.[0]
    /* cleared so choosing the same file again is still a change event */
    picker.value = ''
    if (file !== undefined) void add(file)
  }

  /** §10.2's "adding an image is a file drop", taken literally on the screen
   *  itself. The whole block is the target — the picture to replace it, the
   *  press to add one — and the press stays, because a phone has nowhere to
   *  drag a file from. Anything that is not an image is left where it was. */
  const carrying = (e: DragEvent) => (e.dataTransfer?.types ?? []).includes('Files')

  const dropped = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    const file = Array.from(e.dataTransfer?.files ?? []).find((one) =>
      one.type.startsWith('image/'),
    )
    if (file !== undefined) void add(file)
  }

  return (
    <div
      class={over ? 'item-photo item-photo-over' : 'item-photo'}
      onDragOver={(e) => {
        if (!carrying(e)) return
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={(e) => {
        /* into a child of the block fires this too, and is not leaving */
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        setOver(false)
      }}
      onDrop={dropped}
    >
      {url !== null && <img class="item-photo-shot" src={url} alt={name} loading="lazy" />}
      {/* a label over a hidden input is the file picker — no ref, no synthetic
          click, and the whole control is the hit area */}
      <label class="item-photo-add hit">
        <input
          type="file"
          accept="image/*"
          hidden
          aria-label={`photo for this ${kind}`}
          onChange={(e) => picked(e.currentTarget)}
        />
        {url === null ? `+ add a photo for this ${kind}` : 'replace the photo'}
      </label>
      {trouble !== '' && <p class="item-photo-trouble">{trouble}</p>}
    </div>
  )
}

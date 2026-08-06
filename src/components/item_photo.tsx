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
   *  so beats doing nothing visibly. */
  const add = async (picker: HTMLInputElement) => {
    const file = picker.files?.[0]
    /* cleared so choosing the same file again is still a change event */
    picker.value = ''
    if (file === undefined) return
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

  return (
    <div class="item-photo">
      {url !== null && <img class="item-photo-shot" src={url} alt={name} loading="lazy" />}
      {/* a label over a hidden input is the file picker — no ref, no synthetic
          click, and the whole control is the hit area */}
      <label class="item-photo-add hit">
        <input
          type="file"
          accept="image/*"
          hidden
          aria-label={`photo for this ${kind}`}
          onChange={(e) => void add(e.currentTarget)}
        />
        {url === null ? `+ add a photo for this ${kind}` : 'replace the photo'}
      </label>
      {trouble !== '' && <p class="item-photo-trouble">{trouble}</p>}
    </div>
  )
}

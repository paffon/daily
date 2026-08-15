import { useState } from 'preact/hooks'
import type { VNode } from 'preact'

/** One press, one file. Every document the app hands out leaves through here:
 *  the report from home's footer, and a library sheet from the foot of the
 *  screen its library is edited on (`DESIGN.md` §10.3).
 *
 *  A control, never a link — the file leaves and the screen stays. Building
 *  fetches every picture from Drive, so the press can take a moment, and the
 *  button says so rather than sitting silent under a second press that would
 *  build the thing twice.
 *
 *  The class is the caller's, because each screen dresses its own footer and
 *  a shared look here would be one screen's look imposed on the others. */
export function DownloadButton({
  class: dressed,
  label,
  building: busyLabel,
  name,
  build,
}: {
  class: string
  label: string
  building: string
  /** Read at the press rather than at the render: a screen left open past
   *  midnight would otherwise hand over a file named yesterday. */
  name: () => string
  build: () => Promise<string>
}): VNode {
  const [busy, setBusy] = useState(false)

  const download = async () => {
    setBusy(true)
    try {
      const html = await build()
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
      const link = document.createElement('a')
      link.href = url
      link.download = name()
      link.click()
      /* on a tick, not inline — the click starts the download, and revoking
         in the same task can pull the blob out from under a browser that has
         not yet opened it */
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      class={`${dressed} hit`}
      disabled={busy}
      onClick={() => void download()}
    >
      {busy ? busyLabel : label}
    </button>
  )
}

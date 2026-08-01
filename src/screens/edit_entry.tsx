import { useState } from 'preact/hooks'
import type { VNode } from 'preact'
import type { Entry, Module } from '../data/entry'
import { deleteEntry, getEntry, readJson, updateEntry } from '../data/store'
import { Danger, Timestamp, clockOf } from '../components/fields'
import appSeed from '../seed/app.json'
import './edit_entry.css'

/** Frame 4h — the one screen that edits every module's entries. The date and
 *  the time are ordinary fields at the top of it rather than a repair tool
 *  behind a long-press: moving an entry to when it actually happened is the
 *  common reason for opening this screen. */

type Payload = Entry['payload']

export type EditorRenderer = (payload: Payload, onChange: (next: Payload) => void) => VNode

const editors: Partial<Record<Module, EditorRenderer>> = {}

/** Called once at module scope by each module's screen, so importing the
 *  screen registers it. That single call is a module phase's only edit here. */
export function registerEditor(module: Module, renderer: EditorRenderer): void {
  editors[module] = renderer
}

/** `changed once`, from `rev - 1`. Quiet, and never framed as a correction. */
function provenance(entry: Entry, locale: string): string {
  const changes = entry.rev - 1
  const changed =
    changes === 0 ? 'unchanged since' : changes === 1 ? 'changed once' : `changed ${changes} times`
  return `recorded ${clockOf(entry.recorded_at, locale)} · ${changed}`
}

export function EditEntry({ id }: { id: string }): VNode {
  const stored = getEntry(id)
  const [ts, setTs] = useState(stored?.ts ?? '')
  const [payload, setPayload] = useState<Payload>(stored?.payload ?? {})

  const locale = readJson('config/app.json', appSeed).locale
  const home = () => {
    location.hash = '#/'
  }

  if (stored === null) {
    return (
      <main class="edit">
        <header class="edit-strip">
          <a class="edit-back hit" href="#/">
            ← &nbsp;recent
          </a>
        </header>
        <div class="edit-body">
          <h1 class="edit-title">nothing here</h1>
          <p class="edit-line">no entry is stored under that id.</p>
        </div>
      </main>
    )
  }

  const editor = editors[stored.module]

  return (
    <main class="edit">
      <header class="edit-strip">
        <a class="edit-back hit" href="#/">
          ← &nbsp;recent
        </a>
        <span>editing</span>
      </header>

      <div class="edit-body">
        <h1 class="edit-title">{stored.module}</h1>

        <div class="edit-field">
          <span class="edit-label">when</span>
          <Timestamp value={ts} onChange={setTs} locale={locale} variant="expanded" />
        </div>

        {editor === undefined ? (
          <div class="edit-field">
            <pre class="edit-payload">{JSON.stringify(payload, null, 2)}</pre>
            <p class="edit-line">{`the ${stored.module} editor is not built yet.`}</p>
          </div>
        ) : (
          <div class="edit-field">{editor(payload, setPayload)}</div>
        )}

        <div class="edit-actions">
          <button
            type="button"
            class="edit-save hit"
            onClick={() => {
              updateEntry({ ...stored, ts, payload })
              home()
            }}
          >
            save changes
          </button>
          <button type="button" class="edit-discard hit" onClick={home}>
            discard
          </button>
          <Danger
            label="delete this entry"
            onClick={() => {
              deleteEntry(stored.id)
              home()
            }}
          />
        </div>

        <p class="edit-provenance">{provenance(stored, locale)}</p>
      </div>
    </main>
  )
}

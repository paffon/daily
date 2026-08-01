import { render } from 'preact'
import type { VNode } from 'preact'
import './styles/tokens.css'
import { MODULES } from './data/entry'
import { ensureSeeded } from './data/store'
import { Home } from './screens/home'
import { Body } from './screens/body'

/** Every route but home renders one of these until its phase builds it. */
function Stub({ name }: { name: string }): VNode {
  return (
    <main style="padding:clamp(24px,7vw,96px);display:flex;flex-direction:column;gap:14px">
      <h1
        class="serif"
        style="margin:0;font-weight:200;font-size:clamp(38px,5vw,42px);line-height:1.1;color:var(--ink)"
      >
        {name}
      </h1>
      <p class="mono" style="margin:0;font-size:11px;letter-spacing:0.12em;color:var(--mono-faint)">
        not built yet
      </p>
    </main>
  )
}

const ROUTES: Record<string, () => VNode> = {}
for (const module of MODULES) ROUTES[`#/${module}`] = () => <Stub name={module} />
Object.assign(ROUTES, {
  '#/': () => <Home />,
  '#/objectives': () => <Stub name="objectives" />,
  '#/body': () => <Body />,
})

/** Hash to screen. An id-carrying route is matched before the table;
 *  anything unrecognised falls back to home. */
function screen(hash: string): VNode {
  const entry = /^#\/entry\/(.+)$/.exec(hash)
  if (entry) return <Stub name={`entry ${entry[1]}`} />
  const route = ROUTES[hash]
  return route ? route() : <Home />
}

ensureSeeded()

const mount = document.getElementById('app')!
const paint = () => render(screen(location.hash || '#/'), mount)
addEventListener('hashchange', paint)
paint()

import { render } from 'preact'
import type { JSX, VNode } from 'preact'
import './styles/tokens.css'
import { Home, MODULES } from './screens/home'

const shell: JSX.CSSProperties = {
  padding: 'clamp(24px, 6vw, 96px)',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
}

const title: JSX.CSSProperties = {
  font: '200 clamp(38px, 5vw, 42px)/1.1 var(--family-serif)',
  color: 'var(--ink)',
  margin: 0,
}

const note: JSX.CSSProperties = {
  font: '400 11px/1 var(--family-mono)',
  letterSpacing: '0.12em',
  color: 'var(--mono-faint)',
  margin: 0,
}

/** Every route but home renders one of these until its phase builds it. */
function Stub({ name }: { name: string }): VNode {
  return (
    <main style={shell}>
      <h1 style={title}>{name}</h1>
      <p style={note}>not built yet</p>
    </main>
  )
}

const ROUTES: Record<string, () => VNode> = {
  '#/': () => <Home />,
  '#/objectives': () => <Stub name="objectives" />,
}
for (const module of MODULES) ROUTES[`#/${module}`] = () => <Stub name={module} />

/** Hash to screen. An id-carrying route is matched before the table;
 *  anything unrecognised falls back to home. */
export function screen(hash: string): VNode {
  const entry = /^#\/entry\/(.+)$/.exec(hash)
  if (entry) return <Stub name={`entry ${entry[1]}`} />
  const route = ROUTES[hash]
  return route ? route() : <Home />
}

const mount = document.getElementById('app')
if (mount) {
  const paint = () => render(screen(location.hash || '#/'), mount)
  addEventListener('hashchange', paint)
  paint()
}

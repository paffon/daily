import { render } from 'preact'
import type { VNode } from 'preact'
import './styles/tokens.css'
import { MODULES } from './data/entry'
import { ensureSeeded, readText } from './data/store'
import { syncNow } from './data/sync'
import { Home } from './screens/home'
import { Body } from './screens/body'
import { SignIn } from './screens/signin'

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

const mount = document.getElementById('app')!
const paint = () => render(screen(location.hash || '#/'), mount)

/** Nothing renders until there is a token: every read goes through the store,
 *  and the mirror is not populated before sign-in. Every page load starts
 *  here — the token is memory-only and a token request needs a user gesture,
 *  so there is no boot path that skips the press. */
async function start(): Promise<void> {
  /* Seeding before the first pull would write defaults over a config this
     browser has simply never seen, and then push them up over the real one.
     So an empty mirror waits for Drive — it has nothing to paint anyway —
     while one that already holds a copy paints from it and syncs behind. */
  let heard = true
  if (readText('config/app.json') === null) heard = await syncNow()
  else void syncNow().then(paint)

  /* Only seed once Drive has actually answered. A pass that failed cannot be
     told apart from an empty Drive, and seeding on a failure is the same
     clobber by a slower route. Nothing is lost by waiting: every screen reads
     config through `readJson`, which falls back to the seed in memory, so an
     unseeded boot renders identically — it just writes nothing. */
  if (heard) ensureSeeded()

  addEventListener('hashchange', paint)
  addEventListener('online', syncNow)
  paint()
}

render(<SignIn onDone={start} />, mount)

import { render } from 'preact'
import type { VNode } from 'preact'
import './styles/tokens.css'
import { MODULES } from './data/entry'
import { token } from './data/drive'
import { ensureSeeded } from './data/store'
import { onPass, syncNow } from './data/sync'
import { Home } from './screens/home'
import { Body } from './screens/body'
import { Workout } from './screens/workout'
import { Nutrition } from './screens/nutrition'
import { Movement } from './screens/movement'
import { Dance } from './screens/dance'
import { Objectives } from './screens/objectives'
import { EditEntry } from './screens/edit_entry'
import { AccountBand, SignIn } from './screens/signin'

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
  '#/objectives': () => <Objectives />,
  '#/body': () => <Body />,
  '#/workout': () => <Workout />,
  '#/nutrition': () => <Nutrition />,
  '#/movement': () => <Movement />,
  '#/dance': () => <Dance />,
})

/** Hash to screen. An id-carrying route is matched before the table;
 *  anything unrecognised falls back to home. */
function screen(hash: string): VNode {
  /* keyed, so moving between two entry hashes builds a new screen rather than
     leaving the previous entry's timestamp and payload in the fields */
  const entry = /^#\/entry\/(.+)$/.exec(hash)
  if (entry) return <EditEntry key={entry[1]} id={entry[1]!} />
  const route = ROUTES[hash]
  return route ? route() : <Home />
}

const mount = document.getElementById('app')!

/** No token, no app — not the modules, not the mirror, not one entry. The
 *  sign-in screen is the whole of what a signed-out browser shows, and it is
 *  what every page load starts on, since the token lives in memory and GIS
 *  cannot hand one back without a press.
 *
 *  A 401 mid-session lands here too, which is the same statement made late:
 *  the token that dropped was the one holding the app open. Nothing is lost
 *  by it — every write is already in the mirror, and the next sign-in carries
 *  the dirty set up.
 *
 *  Signed in, the band sits above whatever screen is showing, so whose log
 *  this is stays visible from wherever the app was opened rather than only on
 *  the way in. */
function paint(): void {
  if (token() === '') {
    render(<SignIn onDone={entered} />, mount)
    return
  }
  render(
    <>
      <AccountBand />
      {screen(location.hash || '#/')}
    </>,
    mount,
  )
}

/** A pass, and then the seeds — but only once Drive has actually answered. A
 *  pass that failed cannot be told apart from an empty Drive, and seeding on a
 *  failure writes this browser's defaults over the real config by the slower
 *  route. Nothing is lost by waiting: every screen reads config through
 *  `readJson`, which falls back to the seed in memory, so an unseeded boot
 *  renders identically — it just writes nothing. */
async function catchUp(): Promise<void> {
  if (await syncNow()) ensureSeeded()
  paint()
}

/** The token has landed. Open the app on it straight away — the mirror is
 *  already the truth every screen reads, and waiting for the pass would put a
 *  round trip between the press and the first thing loggable. The pass runs
 *  behind it and repaints if it brought anything down. */
function entered(): void {
  paint()
  void catchUp()
}

addEventListener('hashchange', paint)
addEventListener('online', () => {
  paint()
  void catchUp()
})
addEventListener('offline', paint)
onPass(paint)

/* Always the sign-in screen: the token is memory-only, so at boot there has
   never been one. `catchUp` runs from the press, not from here. */
paint()

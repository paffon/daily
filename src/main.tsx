import { render } from 'preact'
import type { VNode } from 'preact'
import './styles/tokens.css'
import { token } from './data/drive'
import { ensureSeeded } from './data/store'
import { onPass, syncNow } from './data/sync'
import { Home } from './screens/home'
import { Body } from './screens/body'
import { Workout } from './screens/workout'
import { Nutrition } from './screens/nutrition'
import { Movement } from './screens/movement'
import { Dance } from './screens/dance'
import { Exercises } from './screens/exercises'
import { Foods } from './screens/foods'
import { Profiles } from './screens/profiles'
import { EditEntry } from './screens/edit_entry'
import { AccountBand, SignIn } from './screens/signin'

/** Every module is built, so there is no stub behind these and no module
 *  without a route — the table used to be seeded with a `not built yet`
 *  placeholder per module and then overwrite all five of them. */
const ROUTES: Record<string, () => VNode> = {
  '#/': () => <Home />,
  '#/profiles': () => <Profiles />,
  '#/body': () => <Body />,
  '#/workout': () => <Workout />,
  /* the exercise library's own door — opened from the workout module's list
     rather than from home, because it is that module's catalog (§7) */
  '#/exercises': () => <Exercises />,
  '#/nutrition': () => <Nutrition />,
  /* the food library's door, opened from the nutrition module's list for the
     same reason exercises' is opened from workout's (§7) */
  '#/foods': () => <Foods />,
  '#/movement': () => <Movement />,
  '#/dance': () => <Dance />,
}

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
 *  sign-in screen is the whole of what a signed-out browser shows.
 *
 *  It is no longer what every page load starts on, which is the point of the
 *  change that put the token on disk: `drive.ts` restores one that has not run
 *  out of hour, so a reload inside that hour arrives here already holding a
 *  token and goes straight past. Only a browser that has never signed in, or
 *  one whose hour is up, sees the door.
 *
 *  The gate stays, and it is worth writing down why, because removing it looks
 *  free and is not. Every writer in the app is a read-modify-write over the
 *  mirror with the seed as its fallback, `push` uploads whole files and runs
 *  before `pull`, and `pull` skips dirty paths. So an entry logged on a
 *  browser whose mirror has never been filled writes a one-line month file,
 *  and the first pass after it puts that single line over the month Drive
 *  holds — and then records the upload's own `modifiedTime`, so the pull that
 *  follows skips it and there is nothing left anywhere to restore from. The
 *  gate is what makes that unreachable: nothing can be typed until a token
 *  exists, and a token means a pass has filled the mirror.
 *
 *  What that costs is that a browser whose hour is up cannot get in without a
 *  signal. What it does not cost is the basement gym: the token is on disk, so
 *  inside the hour this branch is skipped with no network at all, and the
 *  mirror behind it has been pulled. `OPEN.md` carries the rest.
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

/** A deployed build reaches an already-open browser only when the worker
 *  serving the old one steps aside. The generated worker does step aside on
 *  its own — `skipWaiting` and `clientsClaim` — but taking charge does not
 *  re-render a page whose HTML and script were handed over by the old cache
 *  before it happened. Without this line a new build lands one reload late and
 *  nothing asks for that reload, which is indistinguishable from a deploy that
 *  never happened.
 *
 *  Only where a worker was already in charge: the first visit of all installs
 *  one and claims immediately, and reloading there would be a reload for
 *  nothing. Once per page either way — a worker that claimed twice would
 *  otherwise loop.
 *
 *  It fires within a moment of load, before there is anything typed to lose. */
if ('serviceWorker' in navigator && navigator.serviceWorker.controller !== null) {
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    location.reload()
  })
}

addEventListener('hashchange', paint)
addEventListener('online', () => {
  paint()
  void catchUp()
})
addEventListener('offline', paint)
onPass(paint)

/* The pass runs from here as well as from the press, which it did not used to:
   the token can now be on disk already, and a restored one has to be spent or
   a reload would open the app on a mirror nothing is refreshing. `syncNow`
   answers false at once when there is no token, so a boot that landed on the
   door costs nothing and — the part that matters — never reaches
   `ensureSeeded`, so this browser's defaults are not written over a Drive
   nobody has heard from. */
paint()
void catchUp()

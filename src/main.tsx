import { render } from 'preact'
import type { VNode } from 'preact'
import './styles/tokens.css'
import { signedOut, token } from './data/drive'
import { ensureSeeded } from './data/store'
import { filled, onPass, syncNow } from './data/sync'
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

/** The gate, and it is a gate on the mirror rather than on the token since
 *  2026-08-09. A browser gets in if it holds the log — `filled` is Drive
 *  having been heard from here at least once — and stays out otherwise. A
 *  token is a second way in, for the first sign-in of all, when nothing has
 *  been pulled yet.
 *
 *  Why the token stopped being the condition: Google caps a browser-only token
 *  at an hour and there is no refresh token to be had by a page with no server
 *  (`OPEN.md`), so *no token, no app* meant a press every morning for an app
 *  whose whole job is being faster to open than a notebook. The hour is still
 *  the ceiling on reaching Drive. It is no longer the ceiling on logging.
 *
 *  What the gate was really standing in for is the hazard `OPEN.md` calls *a
 *  push can put a thin mirror over a full Drive*: every writer is a
 *  read-modify-write over the mirror with the seed as its fallback, `push`
 *  uploads whole files and runs before `pull`, and `pull` skips dirty paths —
 *  so an entry logged on a browser whose mirror has never been filled puts a
 *  one-line month file over the month Drive holds, and the pull that follows
 *  skips it. That is a hazard of an *empty* mirror, not of an absent token,
 *  and `filled` names it directly. A browser that has never synced still
 *  cannot type a character.
 *
 *  What it widens is the window on the conflict policy, which is unchanged and
 *  is last-writer-wins: entries logged here over days go up whole on the next
 *  pass and beat whatever another browser wrote to the same month meanwhile.
 *  One person, usually one browser — and `OPEN.md` carries the merge that
 *  would end the argument.
 *
 *  `signedOut` is the deliberate exception and outranks both: the door is what
 *  the sign-out button is for, and without it that button would drop a token
 *  and leave the log on screen.
 *
 *  A 401 mid-session no longer lands here. The band says nothing is reaching
 *  Drive and the app stays open — every write is already in the mirror, and
 *  the next sign-in carries the dirty set up.
 *
 *  Inside, the band sits above whatever screen is showing, so whose log this
 *  is — or that it is going nowhere — stays visible from wherever the app was
 *  opened rather than only on the way in. */
function enterable(): boolean {
  return !signedOut() && (token() !== '' || filled())
}

function paint(): void {
  if (!enterable()) {
    render(<SignIn onDone={entered} />, mount)
    return
  }
  render(
    <>
      {/* the press repaints through `entered`, so a sign-in from the band
          starts a pass exactly as one from the door does; the sign-out has
          nothing to sync and only has to redraw, which lands on the door */}
      <AccountBand onSignIn={entered} onSignOut={paint} />
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

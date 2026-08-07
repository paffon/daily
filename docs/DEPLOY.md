# Deploy

What it takes for a change to be visible in the app at
`https://omrinardiniri-daily.web.app`. `adr/0005-a-merge-into-master-is-the-deploy.md`
says why the pipeline is shaped this way and is the decision; this file is the
sequence, and the list of things that have actually stopped it.

The short version: **merge into master, then look at the live bundle.** A merged
pull request is not a deployed one, and neither is a green workflow.

## The path a change takes

| step | what happens |
| :- | :- |
| merge into `master` | the push triggers `.github/workflows/deploy.yml`. Nothing else deploys |
| `npm ci` | refuses outright if `package-lock.json` and `package.json` disagree |
| `npm run typecheck`, `npm test` | the same two gates a change passes locally, in the same order |
| `npm run build` | with `VITE_GOOGLE_CLIENT_ID` from repository secrets |
| refuse a build that cannot sign in | greps `dist/assets` for the client id and fails the deploy if it is absent |
| Firebase Hosting | project `omrinardiniri`, site `omrinardiniri-daily`, channel `live` |

About three minutes end to end. A failure anywhere stops it, so what is live is
always a commit on master that passed every gate.

A pull request into master runs every row of that table except the last one, so
a green check on the pull request means the merge will reach the site. A red one
means it will not, and the cheap moment to find that out is before the merge
rather than after.

`workflow_dispatch` runs the identical job on a button, for redeploying what is
already on master with no new commit behind it:

```bash
gh workflow run deploy.yml --ref master
```

## Four things that must be true

Each of these has stopped a deploy, and none of them announce themselves.

**The lockfile is in sync.** `npm ci` is not `npm install` — it fails rather
than reconciling. Installing on Windows can leave the Linux-only optional
dependencies out of `package-lock.json`, and the runner then refuses to install
anything at all. This is what broke the first real deploy on 2026-08-06. The
repair has to happen on Linux — WSL is enough — because npm on Windows looks at
the same lockfile and sees nothing wrong with it:

```bash
npm install --package-lock-only
```

**Both repository secrets exist.** `VITE_GOOGLE_CLIENT_ID` and
`FIREBASE_SERVICE_ACCOUNT_OMRINARDINIRI`. See ADR 0005 — a missing client id
produces a bundle that builds cleanly and cannot sign in, which is why the
pipeline greps for it rather than trusting the exit code.

**GitHub Actions is actually running jobs.** A run can be accepted, listed, and
never handed a machine. It sits at `queued` or `pending` with zero steps, which
looks identical to "building" in `gh run watch`. On 2026-08-06 three runs stuck
this way during a GitHub partial outage. The tell is the step list:

```bash
gh api repos/paffon/daily/actions/runs/<id>/jobs --jq '.jobs[] | {status, steps: (.steps | length)}'
```

Zero steps means no runner took it. Check `https://www.githubstatus.com` before
looking for a cause in the repository.

**`firebase.json` keeps its `site` key.** It pins `omrinardiniri-daily`. Without
it, `firebase deploy --only hosting` targets the Firebase project's *default*
site, which is a different site belonging to something else. That has overwritten
the wrong thing before.

## Verifying — the live bundle, never the source

"It doesn't work" is a statement about a running artifact. The only answer that
counts comes from fetching what the browser fetches:

```bash
curl -s https://omrinardiniri-daily.web.app/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'
```

Then grep that file for something the change introduced — a class name, a string
— and grep it for `apps.googleusercontent.com` to confirm sign-in survived. If
the asset hash is the same one that was live before, nothing shipped, whatever
the run said.

## The reload a browser needs

A service worker precaches the app, so an already-open browser is not guaranteed
to see a new build on an ordinary refresh. Three things arrange for it:

- `index.html`, `sw.js` and `registerSW.js` are served `no-cache`, and everything
  under `/assets` is immutable with a content hash in its name.
- `vite.config.ts` sets `registerType: 'autoUpdate'`, so the generated worker
  takes charge without waiting to be asked.
- `main.tsx` reloads the page once when a new worker takes charge, because taking
  charge does not re-render a page whose HTML the old cache already handed over.

That covers the normal case within a moment of the next load. When a result must
be certain — checking whether a deploy landed — use a hard reload
(`Ctrl + Shift + R`) rather than trusting it.

## When the pipeline cannot run

The fallback is a laptop build, and it is a fallback rather than a habit: it
skips the typecheck and test gates unless they are run by hand, and it is exactly
the practice ADR 0005 replaced. Used on 2026-08-06 during the Actions outage.

It has one prerequisite that the runner gets from a secret and a laptop does not:
**`.env.local` must be present in the directory being built.** It is gitignored,
so a fresh clone and every worktree lacks it, and a build without it succeeds and
produces an app that cannot sign in.

In PowerShell, from the directory holding the commit to be deployed:

```powershell
Copy-Item "C:\Users\paffo\Documents\Projects\Daily\.env.local" .; npm run typecheck; npm test; npm run build; if (Select-String -Path dist\assets\*.js -SimpleMatch (Select-String -Path .env.local -Pattern '[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com').Matches[0].Value -Quiet) { firebase deploy --only hosting } else { Write-Host "client id absent from the bundle - not deploying" }
```

Two things to be careful of, both learned rather than imagined:

- **Deploy the directory holding the change.** A stale worktree from earlier work
  builds and deploys perfectly, and publishes older code over the live site.
- **A copied `.env.local` stays behind.** It cannot be committed, but it is a real
  credential sitting in a scratch directory; deleting the worktree is what
  removes it.

Afterwards, verify against the live bundle as above — a local deploy has no run
to be green, so the fetch is the only evidence there is.

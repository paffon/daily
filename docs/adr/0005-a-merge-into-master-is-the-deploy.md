# A merge into master is the deploy

Until 2026-08-06 the live site moved only when someone built `origin/master` on
a laptop and ran `firebase deploy`. Nothing enforced that, and nothing showed
it had not happened: a merged pull request looked finished from every angle
except the only one that counts. The profiles feature sat merged and invisible
for exactly this reason, and it was not the first time.

So the merge is the deploy. `.github/workflows/deploy.yml` runs on every push
to `master`: install, typecheck, test, build, then Firebase Hosting. A failure
anywhere stops it, so what is live is always a commit on master that passed the
same two gates a change passes locally.

**The build asserts it can sign in before it ships.** `.env.local` holds the
Google client id and is gitignored, so a build without it exits 0 and produces
a bundle that looks correct and cannot sign in — the failure is invisible until
someone presses the button on the live site. Vite inlines the id at build time,
so the workflow greps the built asset for it and fails the deploy if it is
absent. This is the one check in the pipeline that exists because of something
that already happened rather than something that might.

## Consequences

**Two repository secrets are load-bearing.** `VITE_GOOGLE_CLIENT_ID`, and
`FIREBASE_SERVICE_ACCOUNT_OMRINARDINIRI` holding a service-account key with
Firebase Hosting rights. Missing either one fails the run loudly rather than
deploying something broken. The client id is not really a secret — it ships in
the bundle to every visitor — it is kept out of the repository, not out of
sight.

**`DESIGN.md` §10's "no server of ours" is unaffected.** A runner that builds
static files for ninety seconds and forgets them is not a server holding user
data. Nothing in this pipeline can see a single entry: the data is in the
user's Drive and the app talks to Google from the browser.

**A deploy can still be forced without a commit** — `workflow_dispatch`, the
same job on a button — because "redeploy exactly what is on master" is
otherwise a thing only a laptop with the right `.env.local` can do.

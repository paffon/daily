# Profiles share the catalog and own their records

One Drive, more than one log (2026-08-06). A **profile** is a row in
`config/profiles.json` — an id and a name. Which profile a device is reading
as lives in `localStorage` (`daily:profile`), beside the mirror rather than in
it: device state, not data, so each device is on whatever it was last switched
to and switching never syncs.

What is one copy and what is one per profile:

| shared — one copy | owned — one per profile |
| :- | :- |
| `library/` — exercises, foods, segments | `entries/` — every module's log |
| `photos/exercise-<id>.jpg`, `photos/food-<id>.jpg` | `photos/<date>.jpg` — the body's photos |
| `config/app.json`, `levels.json`, `profiles.json` | `config/objectives.json` |

The original profile — `main` in the registry — keeps the bare paths every
existing file already has, so adding profiles moved and rewrote nothing; the
threat model in `DESIGN.md` §10.1 is losing history to the app's own cleverness,
and a rename pass over years of month files is exactly that. A created profile
writes the same names under a `<id>~` filename prefix:

```txt
entries/4fd1a2b3~workout-2026-08.jsonl
config/4fd1a2b3~objectives.json
photos/4fd1a2b3~2026-08-06.jpg
```

A **filename prefix rather than a folder per profile**, because the
`{prefix}/{name}` two-segment path shape is load-bearing in `src/data/drive.ts`
— folder creation, upload, and the listing that maps a file's parent back to a
prefix — and a flat name leaves all of it, the mirror keys and the pull loop
untouched. `~` is the fence because no legacy filename contains one, which is
what lets the original profile's unprefixed listings tell its own files from
everyone else's. Ids are minted (`crypto.randomUUID().slice(0, 8)`) rather than
derived from the name: names are the user's to repeat or change, a filename
prefix has to be neither.

## Consequences

**Everything still mirrors.** The pull pass already brings every profile's
entry files down, so switching works offline once a pass has run, and a
profile created on one device appears on the others the way any file does.

**The scope is applied at three chokepoints** — `own()` in `src/data/store.ts`
for entries, `path()` in `src/data/objectives.ts`, `putPhoto` in
`src/data/photos.ts` — and nowhere else. Screens never build paths, so they
never learned profiles exist; a switch is a `localStorage` write and a
navigation to home, and the remount reads the newly scoped paths.

**A profile cannot be renamed or deleted.** Creating and switching is the
whole surface. Deleting would want the `delete` the `Adapter` still does not
have — `docs/OPEN.md` carries both.

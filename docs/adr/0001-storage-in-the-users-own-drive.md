# Storage is files in a visible folder in the user's own Drive

There is no server we own, so the durable store is the user's Google Drive.
The files live in a **visible** `daily/` folder rather than in the Drive API's
`appDataFolder`. The hidden folder is the obvious choice for application state
and was rejected deliberately: it cannot be opened, read, copied or backed up
without the app, and the log outliving the app is the point of keeping it in
the user's own account rather than ours.

```txt
daily/
  entries/{module}-YYYY-MM.jsonl    one JSON object per line
  library/exercises.json  foods.json  segments.json
  config/app.json  levels.json  objectives.json
  photos/YYYY-MM-DD.jpg
```

Entries are JSONL, one file per module per month, because a month of one
person's logging is a few kilobytes and a whole-file rewrite is therefore
cheap. Every file is read-modify-written in full — one user, tiny files, and
Drive has no append API to reach for.

## Consequences

**Reads never hit the network.** `localStorage` mirrors every Drive file, keyed
by the Drive path; a write goes to the mirror and marks the path dirty, and a
sync pass pushes dirty paths when online. `src/data/sync.ts` owns the mirror,
the dirty set and the pass; `src/data/drive.ts` owns auth and the REST calls.

That mirror is a few megabytes and holds every entry ever logged, which is why
`pull` skips the `photos/` prefix. A JPEG fetched with `.text()` and written
into the mirror lands as replacement characters and costs the same space as
the picture; a handful of them fills the quota, and `setItem` then throws
inside `putEntry` — which is recording stopping.

Whole-file rewrites are also why a delete has to be a tombstone rather than a
removed line; see [0002](./0002-one-entry-shape-for-every-module.md).

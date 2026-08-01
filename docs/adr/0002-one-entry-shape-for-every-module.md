# One entry shape for every module

All five modules — workout, nutrition, movement, dance, body — record the same
object and narrow only `payload`. A module is not a schema; it is a value in a
field. This is what lets the edit screen, the sync pass, the home `recent` list
and the objectives arithmetic each be written once instead of five times.

```json
{"id":"<uuid>","module":"body","ts":"2026-08-01T07:35:00+03:00","rev":1,
 "recorded_at":"2026-08-01T19:44:00+03:00","deleted":false,"payload":{}}
```

`ts` is the entry's own editable timestamp **and** decides which month file
holds the entry, so editing it can move the line between files. It carries a
local offset rather than being UTC: `toISOString()` would move a late-evening
entry into the next day. `recorded_at` is when the line was written and never
moves, which is what keeps a backdated entry honest about being backdated.

`rev` increments on every edit and a merge is last-write-wins on the higher
`rev` — so an edit that leaves `rev` alone is an edit another device can
quietly win.

**A delete is a tombstone (`deleted: true`), never a removed line.** Devices
sync by whole-file overwrite, so a line taken out of a file is indistinguishable
from a mirror that has not caught up; removing it would let the other device
resurrect the entry. Reads drop tombstones, so the cost is invisible.

## Consequences

Moving an entry between month files is two writes, and each syncs
independently. The destination is written before the source line is dropped:
if the second write is the one that never reaches Drive, a duplicated entry is
recoverable and a vanished one is not. A tombstone that crosses a month
boundary is the one line that never leaves its old file, for the reason above.

Where a second entry type is needed inside one module it is a field in the
payload, not a sixth module: movement holds both `{type: 'segment', …}` and
`{type: 'posture', …}`, told apart by `payload.type` rather than by which
fields happen to be present, which is what lets one editor registration serve
both.

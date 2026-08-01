# daily

A single-user body-recomposition log, read by a coach that speaks only when it
has something worth saying. Built for one person. Not a product.

**Recording is the product.** Four modules — workout, nutrition, movement,
dance — plus the body. The coach is a layer above them and is absent on most
opens. If a decision trades logging speed for anything else, logging speed wins.

**Read `docs/DESIGN.md` before writing any code.** Then read the rest of `docs/`.

| document | what it is |
| :- | :- |
| `docs/DESIGN.md` | the spec — what the app is, who it is for, and why |
| `docs/COACH.md` | the utterance layer — what the coach says, when, and how |
| `docs/RULES.md` | the short list of rules that are easy to break by accident |
| `docs/CONTEXT.md` | glossary — the project's canonical vocabulary |

The design was reversed on 2026-08-01. `DESIGN.md` §3 and the *Reversals* table
in `RULES.md` list what changed; `CONTEXT.md` ends with the vocabulary that went
with it. Check those before reintroducing anything that sounds familiar.

If you are making a small change and are confident you already know the shape of
the project, `docs/RULES.md` is the minimum. You are probably still wrong about
the voice; `docs/COACH.md` §2 takes ninety seconds.

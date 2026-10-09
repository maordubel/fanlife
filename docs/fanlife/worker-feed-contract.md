# FAN LIFE ↔ THE WORKER — who feeds whom (2026-10-09)

Principle: **configuration, data and presentation are three different things, and each system owns its own presentation and personal features.**

| Layer | Lives in | Owned by |
|---|---|---|
| Configuration (colours, cast, skin, anchors, timeline year) | `club-packs/<id>/…` | the club pack — same files for every club |
| Data (matches, line-ups, kits, goals, players) | masters → **feed** → `ClubData` | THE WORKER for Hapoel Tel Aviv's archive; research desk for other clubs |
| Presentation (LIFE, hub, cards) | `components/…`, `app/…`, `lib/life/universal` | FAN LIFE only |

## Direction 1 — THE WORKER → FAN LIFE (archive, data only)
- The single reader is `lib/clubs/feeds/worker-masters.ts` (+ `adapters/hapoel*.ts`). It turns Match / Line-up / Kit / goal-replay masters into neutral club facts, each with its own source, labelled legacy carry-forward.
- Nothing else reads a Worker master. `tests/clubs/hapoel-life-parity.test.ts` fails if a presentation module (components/clubs, lib/life/universal, lib/clubs/life) imports one.
- Hapoel's LIFE is then composed by the **universal engine** from that data plus `club-packs/hapoel-tel-aviv/life/*` — exactly like every other club. No `native` entry, no `/life` door, no "hand-authored original" link.

## Direction 2 — FAN LIFE → THE WORKER (the person)
- One shared closet and one market (`worker_collector_item`, delta 6): shirts marked "I have it" in either app appear in both; shirts built in the game arrive tagged "built in the game" and cannot be sold.
- Worker keeps its own personal features (the original hand-authored LIFE at `/life`, the game, builds, away days); FAN LIFE keeps its own (club shells, clubs' LIFE, passport).

## Rule for the next club
Add `club-packs/<id>/life/*` and a data provider — never an entry-rule branch. A club needs no code in `lib/clubs/life/entry.ts`.

# Collected research → the clubs (12.10.2026)

Owner, chat, 12.10.2026: *"להצמיד את המחקרים שכן נאספו למועדונים, לשפר את מאגרי המידע שלנו, הכל מאושר"* — attach the research
that was collected, improve the databases, everything is approved. That quote is the `approvedBy` of every record this pass
approved. Rule 11 still decides what an approval can touch: only a real extracted record with a checked source; never an
empty candidate, never a recorded disagreement, never a transcription its reader flagged uncertain.

Measure it yourself: `npm run research:census` prints, per club, what the COMPILED data holds and every gate's readiness.

## What was stranded, and where it went

| Material | Where it sat | What happened |
| --- | --- | --- |
| 175 single-publisher league/cup elevens (365Scores; LiveScore had no match) | `club-packs/*/wave-league-lineups-2026-10-10.json`, status `review` | **Approved** (`scripts/club-research/approve-owner-2026-10-12.py`). 2 Petah Tikva sheets where LiveScore's eleven *differs* stay in review. |
| 25 Olympiacos catalogue kits (colours-of-football) | `club-packs/olympiacos/wave-kits-cof-2026-10-09.json`, `review`, confidence 1 | **Approved** at confidence 2. 7 drawings the reader flagged *uncertain* stay in review. |
| 155 Panathinaikos team sheets (pao.gr) | `research-staging/panathinaikos/lineups.json` — the 10-08 import took the matches, not the sheets | **77 attached** as `club-packs/panathinaikos/wave-pao-lineups-2026-10-12.json`, filled into the day's match by `lib/clubs/euro-wave.ts` with same-source decoys. Held: 39 opponent sheets (not ours), 8 partial listings, 29 sheets with < 8 same-season decoys (the roster's full names would give the club's surnames away), 1 duplicate day, 1 unreadable side. |
| DFB squad registrations, St. Pauli (1,273 rows, 451 players with birth date, position, shirt number) | `research-staging/st-pauli/` | **80 Blind Cow mysteries** (`club-packs/st-pauli/wave-mysteries-dfb-2026-10-12.json`): Position · Born · First squad · Last squad · Shirt number, every clue a DFB row. Gate 10 was LOCKED (St. Pauli plays no UEFA football). |
| 78 St. Pauli men (DFB) and 6 Zrinjski men (National Football Teams) the clubs do not hold | same | **Ready, not wired** — `research-staging/<club>/players-ready-2026-10-12.json`. See "Still stranded". 22 more St. Pauli names were held because a man with the same surname and overlapping years is already in the pack (Andrij/Andriy Polunin, Leon (Maximilian) Flach …): one man under two spellings, a person decides. |
| The scheduled UEFA pull (`club-ingest/auto` branch, 12.10) | never merged — the pull request could not be opened | Not taken: it would have **replaced** 269 AEK matches with 80 (and Celtic 400 → 80). The bug is fixed (below); the branch held no new match. |

## Per club — compiled data before → after

| Club | Pack | Collected (where) | Attached now | Gates that moved | Still stranded, and why |
| --- | --- | --- | --- | --- | --- |
| Hapoel Tel Aviv | The Worker | league elevens 40 (365Scores × LiveScore) | 25 approved in the file | — | The 40 elevens never reach the club: Hapoel plays only The Worker's player master (rule 104 §7), and none of the 40 resolves 11/11 to it (Falcão, Alkukin, Boateng, Dappa… are not in it). |
| Zrinjski Mostar | yes | NFT directory 70 people, club tabs (captains, coaches, records 315, euro claims 54) | — (attached on 9.10) | — | 6 NFT men ready, held for the Rumble ladder. 54 European claims have no date (kept as claims). |
| Hapoel Petah Tikva | yes | league elevens 41 | 26 approved | matches 49 → 71 · elevens 32 → 54 · trivia 365 → 449 · gate 3 31 → 53 | 2 elevens where the second publisher differs. Blind Cow 16/30: no further sourced clue set. |
| Panathinaikos | yes | pao.gr package (917 matches, 155 sheets, 295 goal claims, 930 archive people, 121 coach spells) | 21 league elevens + 77 club sheets | matches 1081 → 1082 · elevens 349 → 375 · gate 3 349 → 375 · sources 1287 → 1304 | 295 goal claims: the source leaves the credited side unresolved. 930 archive people are written in Greek only and the club's records are English — attaching them would duplicate men (ΔΟΜΑΖΟΣ vs Mimis Domazos) without a reviewed transliteration (rule 7). Blind Cow 28/30. |
| AEK Athens | yes | league elevens 35; AEKpedia (collector) 80 documents → 18 candidates | 20 elevens | elevens 272 → 292 · gate 3 272 → 292 | AEKpedia: 8 of the 12 players are men AEK already holds (same Greek name); 4 are a Greek name with no years, and the English roster may hold them — held. 6 coaches: no game deals a coach. |
| Celtic | yes | league elevens 47; Celtic Wiki 152 documents (catalogue only) | 33 elevens | matches 507 → 540 · elevens 396 → 429 · trivia 4608 → 4765 · gate 3 396 → 429 | Celtic Wiki: no parser yet (`NEEDS_PARSER`), nothing extracted. |
| FC St. Pauli | yes | DFB package; MillernTon + Museum 155 documents (catalogue only) | 2 elevens · 80 mysteries | elevens 36 → 38 · **Blind Cow LOCKED 0 → READY 80/30** | 78 DFB men held for the ladder; 22 held as possible duplicates. MillernTon/Museum: no parser. |
| Olympiacos | yes | league elevens 37; catalogue kits 32 | 23 elevens · 25 kits | matches 455 → 478 · elevens 399 → 422 · kits 83 → 108 · gates 4/5 67 → 90 | 7 uncertain kit drawings. Blind Cow 29/30. |
| Dinamo Zagreb | no | collector 93 documents (Bad Blue Boys; official 403) | — | — | No parser for any of the three sources; the official site refused (403, side unknown). |
| Hajduk Split | no | collector 117 documents (Torcida; official 403) | — | — | No parser; official refused. |
| Partizan Belgrade | no | collector 9 documents (Partizanopedia; Crno-bela Nostalgija 403) | — | — | No parser; one source refused. |
| 1. FC Union Berlin | no | collector 7 documents (Immer Unioner, official season archive) | — | — | No parser. |
| Maccabi Haifa, PAOK, Dortmund, Leicester, Atalanta | no | nothing: no research profile, no staging, no pack | — | — | Nothing was collected. |

(Gates not listed were READY before and after. Goal (gate 8) stays LOCKED for every club but Olympiacos, Zrinjski and Hapoel: a
scorer list is not a move, and no source in hand describes the touches.)

## Still stranded — what it would take

1. **New men (St. Pauli 78, Zrinjski 6).** The economy-v2 ladder is a percentage of the club's size and
   `tests/clubs/rumble-xi.test.ts` holds it exactly. `rumble:prices -- migrate` puts new men at €1M; to keep the ladder some men
   already priced must move up a rung, which rule 103 says a new man must not cause. The owner decides; then it is one line in
   `lib/clubs/resolver.ts` (`mergeWave(…, people)`) and `rumble:prices -- migrate` followed by the ladder restore.
2. **Archive collector output** (AEKpedia aside): every source needs a parser with fixtures before a single record is read
   (rule 93 §1). Next per `docs/fanlife/38-historical-archives.md`: Celtic Wiki, Paopedia, Partizanopedia, Immer Unioner.
3. **Panathinaikos goal claims** need the credited side; **Greek-only archive people** need a reviewed transliteration.

## The jobs — do they do their job?

| Job | Last runs | State | What was wrong / done |
| --- | --- | --- | --- |
| **Archive collect** (`.github/workflows/archive-collect.yml`) | one run, 7.10 (manual), green | Works; commits `research-data/` only | Weekly was too slow — AEKpedia alone is 751 posts at 12 requests a run. Now **Tuesday and Friday**. Paopedia's post listing answered rows without id/link (`SOURCE_SCHEMA_CHANGED`, retried every run); cannot be checked from this sandbox. |
| **Requested club research** (`research.yml`, every 15 min → `/api/master/cron`) | red 9.10–12.10 01:59, **green since 12.10 08:24** | Works | The failures were the store: `Vercel Blob … 403` (rule 105). Supabase answers since. |
| **club-ingest** (`club-ingest.yml`, Mondays) | 12.10 red | The pull works; the pull request step fails | Two real bugs fixed: the run **overwrote** `wave-auto.json` with the newest 80 matches (now merged: `mergeAutoWave`), and a UEFA match that a second publisher also confirmed **lost its eleven** (now kept — rule 102). The red step is a repository setting (below). |
| **Backup** | 12.10 green (3 manual) | Works | — |
| **Gate documentation** (`lib/master/automation.ts` → `lib/goals-auto/pipeline`, research adapters) | runs inside the 15-minute job | Works | Research, archive and master suites green (`tests/research`, `tests/master`, `tests/club-research.test.ts`). |

### Click-only steps for the owner
1. GitHub → **Settings → Actions → General → Workflow permissions** → tick **"Allow GitHub Actions to create and approve pull
   requests"** → Save. Without it, club-ingest fails every Monday at the pull-request step.
2. Optional, to send the collector the sources saved in the control room: GitHub → Settings → Secrets and variables → Actions →
   variable `FAN_LIFE_RESEARCH_URL` + secret `FAN_LIFE_CRON_SECRET` (the research job already has them — the archive job reads the same two).

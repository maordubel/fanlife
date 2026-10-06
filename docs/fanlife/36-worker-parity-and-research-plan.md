# The Worker → Fan Life parity, and the research plan per club (6 Oct 2026)

## What changed

1. **Upstream sync.** Fan Life pinned The Worker at `0adf546`; it is now at `edaa80b` (26 commits: LIFE stage A map intro,
   season documentary, h.264 transition clips for iOS, mini-game dressing, Royal Rumble presentation, gate 8 pitch).
   Two conflicts resolved (Rumble captain comment; `asset-provenance.json` record union). Native golden re-captured —
   the question/memory content advanced upstream, the engine did not.
2. **Hapoel Tel Aviv is the model club: 13 of 13 gates READY in the hub** (was 8). The adapter feeds the shared engines
   from The Worker's own masters — nothing re-researched:
   - Line-up Master → gate 3 (the playable XIs, with the source's own same-season decoys first).
   - Kit Master → gates 4 and 5 (35 kits: season, variant, maker, sponsor, pattern, colours).
   - Match Master → gate 11 (3,173 dated matches; the rivalry wall reads every Hapoel–Maccabi meeting).
   - Goal replay archive → gate 8 (every eligible, unheld goal).
   - Rival = Maccabi Tel Aviv only (Worker rule 13).
3. **Gate 8 for every club.** `lib/clubs/goal.ts` + `GoalBoard`: rebuild a goal touch by touch — who, verb (seven), zone
   (twenty). Server-graded; cast, verbs, order and count never reach the client before the whistle. Four points a
   touch (man, verb, zone exact 2 / next zone 1). Paid hint: the touch count.
4. **Gate 11 rivalry wall for every club.** W-D-L scoreboard, goals, biggest win, decade bars, every meeting. Reads a
   club's structured match rows (home, away, goals, side) plus archive titles; Hebrew archive names map to registry
   clubs through `HEBREW_NAMES` (exact spellings only).
5. **Research waves (two publishers, automated cross-source approval — the compiler's own rules).**
   `club-packs/<club>/wave-parity-2026-10-06.json`. Records whose sources disagreed were left out and are listed in
   each file's `skipped` array.

## Gate board after this delta

| Club | READY | Not yet READY |
|---|---|---|
| Hapoel Tel Aviv | 13 | — |
| Olympiacos | 13 | — |
| Hapoel Petah Tikva | 9 | 4 Kit builder · 5 Shirts · 8 Goal · 10 Blind Cow (15/30) |
| Zrinjski Mostar | 7 | 2 Trivia (59/60) · 4 Kit builder (2/5) · 5 Shirts (2/8) · 8 Goal (1/6) · 9 Rumble (thin) · 10 Blind Cow (0/30) |
| Panathinaikos | 7 | 2 Trivia (42/60) · 3 Line-up (1/5) · 4 Kit builder · 5 Shirts · 8 Goal · 10 Blind Cow (6/30) |

The control room (`/master/admin#gaps`) now shows, under every gap, the method, the source pairs that work, what
refused us, and the next concrete step (`lib/club-research/plan.ts`).

## Research plan — how each remaining gap closes

**Method (proved this round).** One researcher per club, fetched pages only, two independent publishers per record,
every field agreed or dropped, paraphrase only. Output in the pack envelope with `approvedBy: automated:cross-source-review-<club>-…`;
the compiler then applies its own approval rules (two publishers, confidence 3, high certainty, conflict-free,
non-sensitive). Anything it rejects stays out.

| Gap | What to collect | Pairs that work | Watch |
|---|---|---|---|
| Kits (4, 5) | season + maker + design | Football Kit Archive + club shop/news or press photo captions | Footy Headlines copies FKA — not a second publisher |
| Line-ups (3) | identical XI in two sources | UEFA line-up PDF + Wikipedia final; RSSSF report + FA report | Wikipedia diagrams unreadable; worldfootball/11v11 robots |
| Goals (8) | build-up described touch by touch | UEFA report + ESPN/Sky/national press | A scorer list is not a move |
| Blind Cow (10) | 4–5 clues per player, each two publishers | Wikipedia + club history / newspaper profile | Drop totals that differ |
| Trivia/timeline (2, 13) | exact-date events | UEFA + RSSSF; club museum + RSSSF | Wikipedia season pages often wrong |

### Per club — next steps
- **Hapoel Petah Tikva.** Kits: FKA lists makers 1986/87–2026/27; needs a design source. Line-ups: hpt.co.il has the
  1957/1959/1961 cup-final XIs — needs contemporary press or RSSSF match reports. Goals need a narrative report.
- **Panathinaikos.** RSSSF holds the 1982/1984/1989/2004 cup-final XIs — needs a second publisher. UEFA describes
  Warzycha in Amsterdam (1996) and Basinas v Barcelona — needs a second report. The staged package (917 matches,
  155 line-ups, 295 goal claims) is still review-only.
- **Zrinjski Mostar.** 57 Football Kit Archive kits are held as single-publisher. One more eligible event completes trivia.
  2023 European line-ups (AZ, Aston Villa, Breidablik): NFSBiH complete, UEFA feed truncated.
- **Clubs in the registry with no pack yet** (Maccabi Haifa, AEK, PAOK …): same pipeline — `research:stage` →
  `research:pack` → parity wave.

## Waiting on the owner (cannot be done without him)

1. **Single-publisher records held in review.** Many core records (Hapoel PT 7 events / 20 players / 6 mysteries;
   Olympiacos 8 events; Zrinjski 6 events / 22 players; Zrinjski 57 FKA kits) are held only because one publisher
   carries them. An owner approval, given explicitly, would open Zrinjski gates 4 and 5 and deepen Blind Cow for
   Hapoel PT. Records held because two sources CONFLICT stay held either way — an approval does not choose a date.
2. **Panathinaikos staged package** — owner review in the research console before any of it reaches a game.
3. **Hebrew archive spellings** of further registry clubs, if their Hapoel meetings should show on their walls.

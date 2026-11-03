# FAN LIFE promo series — Royal Rumble + Legends Manager (owner, 3.11.2026)

A film and six Shorts per game, one item a day at 13:00 Athens, 4–17 Nov 2026. FAN LIFE branding, the series narrator.

| file | what |
|---|---|
| `campaign.json` | every item: beats, words, YouTube title / description / tags / publish slot. **Written by `build-campaign.py`** — edit there, run it, commit both. |
| `capture.py` | films the live games on a phone (stills @3x + screen recordings); every step logs what was on screen. Actions → *promo capture* (runs when `capture-trigger.txt` changes; line 2 = games, line 3 = clubs). |
| `promo.py` | renders one item on the studio engine. Actions → *promo render* (runs when `render-trigger.txt` changes; line 2 = comma-separated ids, empty = all). Output → branch `promo-publish`. |
| `../art-library/` | the owner's illustrations for any FAN LIFE video, with `library.json` (clubs, subject, notes, zones). Illustrations, never photographs; artistic crests are not the official badges. |

Facts on screen come from the live pages (capture logs): Rumble 5v5 €15M / 11v11 about €35M, three cards a slot, three rerolls a draft;
Legends 17 picks (GK2 DF6 MF6 FW3), budget drawn by the board's lever €50–52M, +€8M on registering, two windows, up to three
touchline stops. Olympiacos 1–4 / 6–1 a.e.t. (agg. 7–5), March 2024: UEFA match report (`art-library/clubs/olympiacos/README-2024-maccabi.md`).
The promo art says "Manager of Legends"; the game is **Legends Manager** — those titles are kept out of shot (crops / camera).

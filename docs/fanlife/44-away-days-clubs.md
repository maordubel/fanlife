# AWAY DAYS for the clubs (10.10.2026)

Each club's UEFA team id lives in `club-packs/<club>/ingest.json` (`uefaTeamId`). `npm run away-days:club -- <club>` reads it and builds `content/generated/away-days-<club>.json` from UEFA's public match API (every finished European match with ground, coordinates, round, leg, scorers, attendance).

| club | UEFA id | matches | abroad |
|---|---|---|---|
| AEK Athens | 50129 | 268 | 134 |
| Celtic | 50050 | 438 | 221 |
| Olympiacos | 2610 | 377 | 187 |
| Panathinaikos | 50084 | 336 | 169 |
| HŠK Zrinjski | 73390 | 97 | 49 |
| Hapoel Petah Tikva | 57478 | 12 | 6 |

Not built: **St. Pauli** (no European matches in UEFA's records), **Hapoel Tel Aviv** (has the Worker's own AWAY DAYS at `/away-days`).
Rules: "abroad" is the ground's physical country, never who was drawn at home; the club's home ground is where it last played a drawn-home match in its own country; a match UEFA gives no ground for is counted and stated, never placed.
A new club: add its id to `ingest.json`, run the builder, add the JSON import in `lib/away-days/club.ts`.

# Historical goal reconstruction — 19 October 2026

The five compiled clubs without a playable goal reconstruction receive checked
sequences in the existing Gate 8 engine. Zrinjski receives four further goals.
The delivery adds 25 goals; it does not add clubs, roster entries, fixtures,
prices, a second game engine, or new scoring rules.

| Club | Before | Added | After | Game |
|---|---:|---:|---:|---|
| Hapoel Petah Tikva | 0 | 4 | 4 | Playable; partial catalogue |
| Panathinaikos | 0 | 4 | 4 | Playable; partial catalogue |
| AEK Athens | 0 | 3 | 3 | Playable; partial catalogue |
| Celtic | 0 | 6 | 6 | Ready |
| FC St. Pauli | 0 | 4 | 4 | Playable; partial catalogue |
| Zrinjski Mostar | 1 | 4 | 5 | Playable; partial catalogue |
| Olympiacos | 6 | 0 | 6 | Ready |
| Hapoel Tel Aviv | 21 | 0 | 21 | Ready |

All eight compiled clubs can now offer the game. The existing target remains six
goals per club; ten additional verified reconstructions would fill the five
partial catalogues. Availability must not be confused with exhaustive coverage.
Standing owner authorization permits direct integration of checked research;
the fact metadata identifies agent source review under that authorization,
without claiming individual human review of every sequence.

## Evidence and replay scope

The authoritative review ledger is
`research-data/goal-recovery-2026-10-19/reviewed.json`. It holds source URLs,
publishers, access/check dates, passage locators, each sequence, source decisions
and withheld candidates. Sources include UEFA reports, the Hapoel Petah Tikva
Museum, club reports, NFSBiH, contemporary match reporting and event commentary.
Article text and photographs are not copied into the delivery.

Each replay contains the final contiguous two to five documented contacts. A
preceding corner, pass or clearance without an established origin stays outside
that replay. A post/crossbar is not a player contact. A goalkeeper who misses
the ball is not credited with a save. No action outside the game's seven verbs
is silently converted to a pass.

Regions describe coarse areas, not measured coordinates or historical flight
paths. The renderer's existing zone centres remain schematic. A missing flank
is never supplied for a corner. In particular, the Ben Yishai/Kakon opening goal
against Hapoel Tel Aviv is held because the earlier shot cannot be located.

The Madrid fixture is **20 March 2002**, checked against UEFA's dated report.
For Celtic–Anderlecht and Panathinaikos–Anderlecht, disagreeing minute labels
are omitted. UEFA and the archived BBC report agree on Hartson's headed touch
before Miller's finish; their account takes precedence over a conflicting live
clockwatch. Zrinjski–Urartu retains the **2–3 after extra time** match score;
the separate winning penalty shootout is not substituted for it.

## Candidates retained for further research

Six candidate groups remain outside the game: AEK's Gacinovic goal at Brighton
(an intermediate contact needs resolving); HPT's two goals at Haifa on 16 May
1997 (supplier/substitution conflict); Zrinjski's first two comeback goals
against AZ (only the final kicks are described); Larsson's second equaliser in
Seville (corner origin missing); Panathinaikos's third goal against Anderlecht
(positions missing); and the Ben Yishai/Kakon sequence described above.

## Delivery and verification

`python3 scripts/club-research/build-goals-2026-10-19.py --check` validates the
ledger and checks that all six generated wave files are current. The waves
merge after earlier pack deliveries, preserve earlier approvals on collisions,
and pass through the existing source/approval compiler. The build's ordinary
precompilation includes them. Launch defaults add Gate 8 for the five newly
playable clubs, while the existing paused-club access policy still applies.

`tests/clubs/goal-recovery.test.ts` exercises all 25 new replays through the real
server grader, verifies answer-free deals and source links, keeps held records
out, checks the corrected date and unnamed defender, and confirms tenant,
version, gate and paused-club restrictions. Existing Hapoel Tel Aviv and
Olympiacos goal counts and Zrinjski's earlier AZ winner must survive unchanged.

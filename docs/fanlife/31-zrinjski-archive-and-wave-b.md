# Zrinjski archive and the next shared gates

## Restored verification baseline

PR #7 fixes mobile tap targets and synchronizes browser assertions with App Router navigation. GitHub CI run 36849497547 passed all 4,959 tests, lint, typecheck, production build, repository/asset/identity checks and full browser flows. Browser evidence includes completed Timeline/trivia/memory runs for all three clubs, archive evidence and filters, XI save/reload, local activity, mobile/RTL and tenant isolation. No browser errors or live Supabase requests occurred. The earlier wave was merged before these flows ran; the repaired baseline is now verified.

## Zrinjski research actually consumed by the application

The active `core.json` now contains 15 historical facts, 27 reviewed player identities and 22 source-ledger records. Compiled gameplay has 14 distinct exact dates. The archive projects all eligible historical facts plus the 27 compiled player identities: 42 searchable records. Imported legacy research remains in the review console and is not silently promoted.

New history covers the remaining three Conference League group games, the two Breidablik and two LASK qualifiers, the Slovan home win in August 2022, the 2023 and 2024 Cup wins, the May 2025 league-clinching match and the 2021/22 championship. The latter has year precision only. It is visible in the archive, without a manufactured calendar day or Timeline card.

Source scope is recorded per fact. UEFA and NFSBiH independently corroborate the three new group-stage results. For the four 2023 Europa League qualifiers, NFSBiH supplies exact match-day reports and the club season ledger independently corroborates the competition, pairing and score. Cup 2024 and the 2025 title match have two independent primary match reports. The Cup 2023 day/result comes from the federation final report and the trophy year is corroborated by the club ledger. The 2022 title is supported by the federation annual history and club trophy history.

Player identity envelopes refer to the UEFA AZ matchday squad and independent federation rosters, or to the two primary 2024 Cup final lineups. A matchday observation is not a full career range. All 27 career ranges and positions remain null/empty. These people are usable in free-choice XI; position coverage remains PARTIAL. No ratings, cultural claims, supporter groups, rivalry claims, ownership permissions or cleared assets have been inferred.

### Material conflicts retained for later research

- The Croatian club history has updated title totals alongside stale narrative totals; the English translation also contains older totals. Individual concordant trophy years are used instead of broad current-total assertions.
- The club European season ledger lists inconsistent Urartu and Slovan 2023 second-leg results. Those rows are not approved or used to supply game facts.
- The two primary 2025 Igman reports differ on goal minutes (39/40 and 85/86). Minutes are omitted.
- Ćuže name variants and Ćorluka spelling variants are not silently added as aliases. Identity observations retain the spelling corroborated by their cited reports.
- New primary source checks are dated 2026-10-01. Earlier three core facts retain their original provenance. A challenge or unavailable URL in another language is not evidence of a new successful access check.

## Archive independence

Archive eligibility no longer inherits Timeline's one-card-per-date and hidden-year-title rules. Same-day facts and year-only facts stay searchable, with their true precision and source links. Players have separate evidence entries. Drafts, rejected/low-confidence facts, quarantined conflicts and unavailable sources remain excluded. The Hapoel adapter carries existing curated archive/player eligibility forward and explicitly makes no new source-access or owner-approval claim.

## Wave B: gates 7 and 10

Terrace vote uses the existing debate rotation algorithm with club-owned options. Three historical opinion prompts are available to all three clubs; three player opinion prompts also open for clubs with eligible rosters. Choices are stored on the device per club and revalidated against the current options on reload. There are no fabricated community tallies or profile registrations.

Blind Cow uses the extracted existing solo state machine and scoring rules. The original Hapoel engine wraps the same transitions, keeping its existing behavior. The shared Hapoel adapter only carries eligible solo questions with at least four clues, confidence >=2 and a unique final candidate. Zrinjski and Olympiacos have no placeholder clue banks and stay locked in this gate. The shared adapter does not migrate duels, daily leaderboards or competitive modes.

Mystery runs are sealed in an HttpOnly cookie and bound to club, data version and run ID. Each action independently checks the host/path tenant and gate/pause controls. The client receives only opened clue values; target IDs, question IDs and unopened clues remain server-side until the run closes. Repeated reveals and repeated wrong guesses preserve the existing idempotency rules. A result links its evidence and archive search; extra clues add 15 seconds, distinct wrong guesses add 5 seconds.

## Verification scope

New tests cover archive precision and source revocation, published Zrinjski counts, club-owned poll choices, unchanged original debate rotation, mystery answer isolation/scoring/transitions and sealed action boundaries (tampering, stale version, wrong run ID, wrong club, revoked gate and pause). Browser verification now also completes Zrinjski's ten-card Timeline and six-pair Memory, saves/reloads its XI, persists polls across all three clubs, finds the year-only trophy and player evidence in the archive, and solves/resumes/gives up a Hapoel mystery. It retains the full Wave A and host/RTL/color checks.

Remaining content dependencies are reported in gate readiness. In particular, Zrinjski's full archive history, documented player positions/career spans and distinctive sourced mystery clues still need further research. Royal Rumble requires sourced attribute coverage; this milestone does not invent ratings to open it.

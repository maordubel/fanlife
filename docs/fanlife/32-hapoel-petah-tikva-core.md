# Hapoel Petah Tikva — sourced shared core

Adds `hapoel-petah-tikva` to the existing compiler/resolver and identity catalogue. The registered `hapoelpetahtikva` host, shared engines, actions, locale handling and device storage supply the club experience; no parallel game implementation is introduced.

## Evidence scope (checked 2026-10-02)

| Data | Approved scope | Gameplay |
| --- | --- | --- |
| 11 completed matches | Concordant exact dates, named team pairing and final totals, from 2025-05-19 to 2026-09-18 | Full ten-placement chronology; 11 date-check trivia questions and event/date memory candidates |
| 13 senior honours | Six championships, two State Cups, five Toto Cups; documented season end year only | Archive entries; never chronology, trivia date questions or memory dates |
| 21 observed senior squad identities | Hebrew names independently present in museum and club squad; six corroborated broad positions | Searchable archive and free-choice XI; unknown roles and career years remain empty |
| 24 source records | Museum plus IFA match/title pages or official club fixtures/squad | Each active assertion carries two publisher references |

The searchable archive contains 45 records (24 historical facts and 21 player identities). Timeline, memory and archive meet their shared count targets. Trivia and XI remain PARTIAL: eleven date-check questions are not a complete trivia bank, and the observed squad does not provide complete documented formation coverage. Shared opinion polls use eligible choices; mysteries and authored LIFE remain unavailable.

Primary entry points: [HPT seasons](https://www.hpt.co.il/?AllSeasons=1), [IFA senior honours](https://www.football.org.il/clubs/club-titles/?club_id=2173), [club completed fixtures](https://www.hapoelpt.com/fixtures), [club squad](https://www.hapoelpt.com/team), [HPT observed 2026/27 squad](https://www.hpt.co.il/?ShowSeason=2026/2027&show=details). Exact match URLs and approval scope are recorded in `club-packs/hapoel-petah-tikva/core.json`.

## Research boundaries

Read final team totals explicitly: Hebrew inline score ordering is ambiguous. Exclude disputed round numbers, venues, kick-off times and goal minutes. The official history page credits museum material and has a conflicting title-year sequence; it is not the independent corroborator used for trophies. One museum match returned a database connection error and stays outside approved gameplay.

Conflicting Noam Cohen role labels are preserved as an unknown position. Name variants requiring profile corroboration are not merged. The current squad is not a historical greatest-players collection. Full career ranges, historical players, kits/rights, rivalry policy, mystery clues, ratings, goal geometry and authored LIFE remain in `research-gaps.json`.

Identity uses the registry's blue and a readable light blue surface. Rival color restrictions remain pending owner evidence; no media asset is added.

## Regression coverage

The dedicated pack tests check year precision, unknown player fields, gate states, host isolation and removal of all dependent gameplay when museum corroboration is blocked. Existing parameterized shared-engine tests now include this club. The production browser smoke covers complete chronology/trivia/memory runs, archive evidence and year-only search, XI save/reload, polls persistence, Hebrew RTL hubs and registered-host isolation across six gates. CI retains native golden captures and the full repository checks.

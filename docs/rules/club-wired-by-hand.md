# A club wired by hand is finished with `promote.ts --complete`

**Lesson, 24.11.2026 (a red main for 16 hours).** Fenerbahce and Partizan were pushed straight to `main` on 23.11.2026 with a pack, a provider line and a resolver id — and nothing else of an opening. Seventeen guards went red: no frozen Rumble prices, no English name list, no LIFE cast or town, no wave, a trivia deck that cannot fill Standard.

- The regular way in is the research desk (`scripts/clubs/promote.ts`, rule 143). A club that came in any other way is finished with `npm run clubs:promote -- --club <id> --complete --wired <date>`: LIFE cast and timeline (proposed), the daily pull's wave, spellings, the social tag — then `npm run rumble:prices -- freeze`, `validate`, `npm run rumble:names`, and the club's town in `lib/life/flowArtSpec.ts` + `scripts/life/flow/life-library.ts`.
- The pack's `note` says how the club came in ("Wired by hand on …, outside the research desk"). The script approves nothing and never writes that anyone approved anything.
- `rumble:names` rewrites every club's list; when finishing one club keep the other clubs' entries as they were (their `how` labels — owner-curated, editor-override — are provenance).
- Whether the club is open to the public is the owner's switch in the control room, not this script.
- Never push a club to `main` without the suite: a red main hides every later failure.

# Player Master (v2, 21.9.2026) and the Match / Moment Master

`content/generated/player-master.json` is the canonical generated index of the football
people the archive knows. Rebuild with `npm run players:master`. Consumers import
`lib/archive/player-master.ts` (server-only) — never the JSON, never their own parsing.

## Identity

- Every person has a permanent `p_` + 10 hex id, minted once into
  `content/manual/player-ids.json` by `npm run canon:ids -- --write-ids` (Maor's OK,
  21.9.2026). The registry is append-only: a slug fix or a merge moves `slug` /
  `slugAliases` / `nameAliases`, never the id.
- The people are `people.json` ∪ `players-roster.json` (merged by slug), minus every
  Ussishkin association name (rules 14, 17). Nobody is created from a shirt-number
  spelling, a scorer string or a lineup name: such a spelling resolves to a person or is
  listed in `unresolved` (with mechanical candidates that are never applied).
- Two spellings are one person only through `content/manual/player-aliases.json` —
  reviewed merges, name aliases and classifications, each with the archive evidence that
  proves it (rule 7). `fold` is the only normaliser; a spelling two people share
  resolves to nobody.
- `kind` is `player | coach | public | unknown`; only `player` is pickable.

## Source rules (unchanged, now per person)

- ויקיפועל's "שחקנים זרים (כדורגל)" category is `foreignSlot`, **not nationality**.
  Nationality is `declaredNationality` / `nationalityClaims` (squad sheet, Hebrew
  Wikipedia), never inferred. `origin` keeps the pickers' legacy facet as
  `lib/game/roster-facets.ts` always decided it.
- `shirt-numbers.json` keeps season-bound numbers; ויקיפועל's `מספר בהפועל` is
  `clubNumbersUndated` and never a season claim (rule 37).
- Match-scorer rows give `archiveGoals` / `spells[].documentedGoals`, flagged
  `complete: false` — never a career total.
- Spells are runs of squad seasons; `kitSeason` follows `lib/kit/playerKit.ts`'s rule and
  `tests/player-master.test.ts` holds the two to the same answer.
- `inputsSha` fingerprints every input; the test fails when the committed file is stale.

## Matches and moments

`content/manual/match-ids.json` holds one `m_` + 12 hex id per match (both sports), with
every key dialect a file uses (`events`, `scorers`, `lineup`, `conflict`, `timeline`,
`euro-leg`). `npm run matches:master` builds `content/generated/match-master.json`;
consumers import `lib/archive/match-master.ts`. Moments are `goal:<goalId>` and
`moment:<slug>`; `usable.{replay,trivia,archive}` is the contract a surface respects.
Disagreements stay in `fact-conflicts.json` and surface as `claims` / `conflictRefs`.

Order of rebuilds after an archive change: `canon:ids -- --write-ids` → `players:master`
→ `matches:master`.

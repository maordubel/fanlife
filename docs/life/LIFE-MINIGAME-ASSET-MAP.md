# LIFE mini-games — scene dressing asset map (30.9.2026)

Scope: Penalties (`components/life/PenaltyCard.tsx`) and Hoops (`components/life/HoopsCard.tsx`). Gameplay, scoring, physics, camera and keeper are untouched. Dressing lives in `lib/life/runtime/sceneDressing.ts` (one helper) and `lib/life/content/minigameScenes.ts` (scene config as data).

| Asset | Source path | Era | Scene | Usage | Layer | Crop needed | Notes |
|---|---|---|---|---|---|---|---|
| life-scene-penalties-backdrop-01 | `public/life/art/alley.webp` (crop 0.22,0,0.74,0.74) | 1986 | Penalties | Jaffa-alley backdrop, 3 tiles (outer two mirrored) | background, parallax 0.08 | yes — derivative | de-yellowed, yellow 0; built by `scripts/life/cut-minigame-scenes-2026-09-30.py` |
| life-scene-hoops-backdrop-01 | `public/life/art/hoop-building.webp` (crop 0,0.03,1,0.5) | 1991 | Hoops | schoolyard wall + fence backdrop | background, parallax 0.08 | yes — derivative | top 3% dropped (dark roof strip); yellow 0 |
| ofir-side / keren-side / amit-side | `public/life/art/` | 1986–91 | both | NPC billboards, feet-anchored | mid, parallax 0.40 | no | canonical bodies, no redraw |
| efi-side | `public/life/art/` | 1991 | Hoops | primary Hoops NPC | mid | no | mobile: x −0.82, left of the pole |
| propBin | `public/life/art/` | — | both | foreground occluder | fg, parallax 0.70 | no | tablet and up only |
| hoop-court / hoop-board / hoop-ring--net / hoop-ball | `public/life/art/` | 1991 | Hoops | unchanged gameplay assets | — | no | not touched |
| pen-kids / pen-goal | `public/life/art/` | 1986 | Penalties | unchanged keeper and goal | — | no | not touched |

Sources are never edited in place. The two derivatives are the only new files.

## Remaining real art gaps
- No era-specific kid poses (cheering, mocking): reactions are transform-only on the existing side-on stills.
- No dedicated foreground crate or fence post for Hoops; only the shared bin prop.
- No front-facing kids; all NPCs are side-on.

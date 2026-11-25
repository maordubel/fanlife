## life-one-engine-hood · LIFE is one engine: RUSH becomes the open neighbourhood (23.11.2026)

Owner decision, 23.11.2026: LIFE is to be "the GTA of the football supporter" — one engine, an open continuous neighbourhood you roam freely with direct control, for every club. The diorama engine (TOWN, the "GO" auto-walk) is being retired; RUSH is the base of the new world.
1. **The player performs every action himself.** Nothing walks him anywhere and nothing is done for him: a GPS marker and the minimap arrow show where a job points, and that is all.
2. **A job starts from a person in the world** (walk up, press talk), never from a card. A job is a short ordered list of RUSH's own step kinds; it has no clock and no fail state, a talk never locks him, and finishing returns to roaming with the job marked done. Free roam never ends.
3. **Reuse, do not fork.** The hood is a RUSH `Level` (`lib/life/hood`, `Level.hood`) played by `stepSim`; the picture is `createStage` + `dressCity` + `figure` plus `rush-render/hood.ts`. Club-agnostic: names come from the club's cast, colours from its skin through the colour policy (`rush-render/colour.ts`).
4. M1 ships one job ("Before kick-off") and `/qa/life-world`; the TOWN / LifeGame flow is untouched until a later round retires it.

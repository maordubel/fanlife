# Hub polish — status, 8.10.2026

- Roll split: OPEN clubs (a gate is really enterable outside preview) in colour with a glow; clubs IN THE WORKSHOP in grey, dashed, with "Vote to open" and their rank. The LIFE strip under club names is gone.
- VOTE: "Which club opens next?" — 33 seeded votes (DEMO, `lib/home/vote.ts`), Maccabi Haifa leads; one vote per device, kept in localStorage; "Leading now" block; replace the seed with a real store before launch (`DEMO_VOTES`, test keeps the label).
- Dock under the hub nav: continue at last club, My file (with rounds played on this device), My stand, Market, Vote, Sources.
- Aura: soft club-colour glow behind the roll (off under reduced motion); open tiles glow in their own colour.
- Gate: eslint only pre-existing errors (scripts/life/export-universal-story2.ts parse, wiki-corpus), 6 vitest shards green, next build OK, shots 360/390/1440 no overflow.

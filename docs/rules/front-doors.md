# The three doors: play solo, challenge friends, open the archive

**Owner spec, 22.11.2026.** On the first screen a fan must understand: he can play alone or challenge friends, and he can open the football archive the games are built from.

- **The front page opens with three fixed actions** under the masthead (`components/home/FrontDoors.tsx`): Play solo, Challenge friends, Open the archive. Behind the switch `frontDoors` (Settings → Features); off = owner preview only.
- **Every game card says in advance how it plays**: Solo, Friends, or both (`lib/home/doors.ts → GATE_MODE`, shown by `components/home/PlayIndex.tsx` on OUR GAMES).
- **"Friends" is a capability, not a wish.** A game is marked for friends only when a friend can really be invited today (Blind Cow's challenge and live room; Legends Manager when Friendlies is on). A new challenge flow changes `GATE_MODE` in the same pull request.
- **The archive is a door, not a game.** It opens the club chooser, because every club has its own archive.
- **The pictures are the owner's** (pack of 22.11.2026): masters in `brand/source/front-doors-2026-11-22/` as WebP (the PNGs stay out of git — the repository is over 6 GB), cut by `scripts/brand/front-doors.py` to `public/brand/fanlife/doors/`.
- A finished film nobody uploaded keeps its big files **three** days, not seven (`lib/stories/trim.ts`): the bucket is 1 GB and held 1.45 GB on 22.11.2026.

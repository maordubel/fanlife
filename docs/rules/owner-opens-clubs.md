# Only the owner opens a club to the public (14.11.2026)

**Owner, 14.11.2026:** "I did not ask to open any club to the public — only to update the archive and complete its information. Close them and let me decide when to open them."

- Research, archive work, waves, promotion (`scripts/clubs/promote.ts`) and the launch-defaults script never make a club public. Adding a club to the archive is not opening it.
- `lib/master/launch-defaults.json` lists only clubs the owner opened; `scripts/master/launch-defaults.ts` refreshes their gates and never adds a club.
- `lib/master/owner-hold.json`: a held club is closed (status review, no gates) on every read, the public fallback included, until the owner opens it himself in the control room ("Open playable" or "Save" as live), which stamps `ownerOpenedAt`.
- A request like "add club X" or "fill the archive" means archive data only. Ask before anything that changes what the public sees.

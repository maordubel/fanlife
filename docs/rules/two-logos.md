# Two logos, never mixed (18.11.2026)

**Decision (owner):** FAN LIFE's mark is its colour roundel — the ball, "FAN LIFE", "FOOTBALL. FOREVER." — in `public/brand/fanlife/`. It goes on every FAN LIFE surface: the hub, every club, every game, THE ALBUM and its stickers, films, share cards, marketing. THE WORKER's badge (the worker with the hammer, "הפועל") in `public/brand/logo*` belongs to THE WORKER edition only: Hapoel Tel Aviv's own host.

**Why:** the two files sat one folder apart with the same names (`logo-512.png`), and a sticker frame shipped with THE WORKER's badge. Shared components (the `Badge` in every `Screen`, the share-card renderer) printed it on FAN LIFE pages too.

**How:**
- A mark is taken from `lib/brand/logos.ts` (`FANLIFE_LOGO`, `WORKER_BADGE`, `markFor(host)`), never typed as a path. Python and build scripts use `public/brand/fanlife/…`.
- `<html data-edition>` is set by the root layout from the host; `components/ui/Badge.tsx` ships both marks and CSS shows the edition's one.
- `tests/brand/two-logos.test.ts` fails on any `brand/logo-*` path outside `lib/brand/logos.ts` and the listed THE WORKER-only files. Adding a file to that list needs a reason in the test.
- Club pages that ban a colour the roundel carries use `logo-mono.webp` (rule 95).

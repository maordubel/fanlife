# Gate upgrade playbook (8.10.2026)

Source of truth for scope: `39-gate-audit-vs-worker.md` (the owner's audit). Reference implementation: **gate 1** — `components/clubs/gates/xi/*`, `lib/clubs/xi-model.ts`, `tests/clubs/xi-model.test.ts`.

## The owner's brief (Maor)
Upgrade every gate to an international, mobile-game-grade experience; every gate, every button, every link. Take the Worker's models (structure, inspiration, visuals, motion, experience), adapt them to the FAN LIFE brand, and make them GENERIC for every club (Hapoel is a hub club like any other). Mobile is critical and UX must be perfect. Stop and ask only if truly blocked.

## Architecture you must respect
- **One gate = one view file** `components/clubs/gates/views/<gate>.tsx` (server component; receives `{club,locale,copy,round,gameKey,searchParams,state}`) mounting ONE client presenter in `components/clubs/gates/<gate>/`. Put presenter CSS in a CSS module there (tokens only: `--mag-*`, `--club-primary`, `--club-on-primary`; never raw hex, never `rgb()` with a hue, never `left`/`right` classes or properties — use logical ones; modals `z-[60]`).
- **Copy**: new strings ONLY in `messages/games/gates/<gate>.{en,he}.json` (both files, identical key sets, keys unique across all catalogs incl. `messages/games/{en,he}.json`). Read with `tr(copy,key,vars)` from `components/clubs/rumble/shared`. English UI must never show Worker Hebrew strings — pass labels (see `PickRail` `labels`).
- **Completion**: report a finished attempt with `completeRun(club,gate,runId,score)` from `lib/clubs/completion` (once per attempt). Optional progress: `markStep(n)` from `lib/analytics/meter`.
- **Layout mode** is in `lib/clubs/layout-mode.ts` (`arena`/`game`/`studio`/`reading`). Play modes get the compact `PlayHeader`; the stage should fill `100dvh` on a phone (see `.stage` in `xi.module.css`) and be its own design from 901px up.
- **Shirts**: `ClubShirt` (`components/clubs/stage/ClubShirt.tsx`) + `rumbleWardrobe(kitViews(club), hex=>forbiddenColor(club.theme,hex))`. Never an empty box, never a rival colour (rule 95).
- **Reusable stage kit**: `PickRail`+`flyShirt`, `SlideSheet`, `FitBox`, `useDragSource`/`dropZone` (always keep a tap path — WCAG 2.5.7), `firePickFx(At)`. Do not edit these shared files except for small additive, backwards-compatible props; do not edit `app/magazine.css` beyond appending a clearly marked block if unavoidable.
- **Data honesty** (rule 11): no invented facts, no fabricated counts; unknown stays unknown. Answers never reach the client before grading (keep server actions where they are).
- **Mobile contract**: 360×640, 390×844, 430×932, tablet, 1366×768, landscape and 200% zoom; no horizontal page scroll; tap targets ≥44px; safe-area aware; `prefers-reduced-motion` stops all motion; RTL (`?lang=he`) works; keyboard + screen reader path exists.

## Required checks before you finish
`npx tsc --noEmit -p tsconfig.all.json` · `npm run repo:hygiene` · `npx eslint <your files>` · `npx vitest run tests/clubs tests/brand.test.ts tests/guards.test.ts tests/i18n.test.ts` (add your own tests: pure model logic + copy parity is already enforced) · a real browser pass with Playwright (`/opt/pw-browsers/chromium`) at phone + desktop + `?lang=he`, playing the gate end to end, zero page errors, zero overflow. The existing smoke script `scripts/master/core-browser-smoke.mjs` references gate hooks (`data-testid`s) — keep or update them.

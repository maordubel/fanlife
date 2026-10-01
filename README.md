# FAN LIFE — integrated evaluation release

A neutral master and open admin around the actual **The Worker** source, imported at `0adf5464d00122a1dc310367f46e99e8dd9d74f2`. The original game engines, 13 gates, LIFE, content, assets, ingestion scripts and database migrations are included. The original home lives at `/ground`.

**Release status:** the master and admin are English; much of the native Hapoel experience remains Hebrew. Hapoel has the native gates and LIFE. Shared chronological Timeline also works for Zrinjski and Olympiacos with explicitly partial, two-placement rounds. Other games still need club-specific reviewed content and migration to the shared contract. This is a working integrated evaluation release, not the completed all-English, fully automatic multi-club product.

## Start locally

1. Install **Node.js 22 LTS** and clone this repository.
2. Windows: double-click `START-WINDOWS.cmd`. macOS/Linux: run `bash START-MAC-LINUX.command` from this folder.
3. Wait for the server's Ready message, then open **http://localhost:3000**. Keep the terminal open.

The first launch installs packages and needs internet. Allow several minutes for the first compilation. Use a machine with at least 8 GB of RAM. Alternatively:

```sh
npm ci
npm run dev
```

There is **no registration and no active Supabase connection** in default evaluation mode. Every browser gets a local tester identity with admin access. Use a private window or another browser for a second multiplayer identity; both must reach the same running server.

| Page | Address |
| --- | --- |
| Neutral master | `/` |
| Master admin, research and updates | `/master/admin` |
| All gates, features and original QA rooms | `/master/test-lab` |
| Original Hapoel home | `/ground` |
| Hapoel club hub | `/clubs/hapoel-tel-aviv` |
| Original collector admin | `/kits/admin` |
| Original statistics | `/qa/stats` |

Server records and photos persist under `.fan-life`. Stop the server before backing up that folder. LIFE also saves progress in the browser. Clearing cookies creates a new tester identity. Admin export exports master state; it is not a full database/photo backup. Do not place evaluation mode on a public host where everyone would have admin access.

## Upload your own GitHub repository

This project is maintained in [maordubel/fanlife](https://github.com/maordubel/fanlife). Pull the latest `main` with GitHub Desktop, or fork the repository if you need your own copy. Keep the existing folder structure, including `.github`, `.devcontainer` and `.env.example`. Do not upload `node_modules`, `.next`, `.fan-life` or private environment files. Do not overwrite The Worker's original repository.

For a browser-only trial, open a GitHub Codespace. The included configuration installs dependencies, starts the development server and forwards port 3000. Keep the forwarded port private. Codespaces availability and charges depend on your GitHub account. The recipe is supplied but has not been tested on a hosted Codespace.

GitHub stores the code and runs checks; **GitHub Pages cannot run this Node application**. For a persistent server, use `npm run build` followed by `npm start`, or the supplied `docker compose up --build` recipe (Docker recipe not exercised here). This evaluation architecture needs one server and persistent disk. Set `NEXT_PUBLIC_SITE_URL` to the actual origin before building for another address.

## Upstream changes

The admin's Updates action checks the actual GitHub revision against `upstream.lock.json`. The `The Worker updates` workflow is now **manual dispatch only**. It validates an isolated candidate and proposes a **draft PR** for review. Conflicts stop the update, and Fan Life-specific adapters must be preserved. Scheduled integration and automatic merge are disabled under the canonical project Bible.

Enable Actions and **Allow GitHub Actions to create and approve pull requests** to use that PR flow. A merged update needs a deployment rebuild, or a local pull and restart.

CLI: `npm run master:upstream` checks only. `npm run master:upstream -- --apply` integrates into a **clean, disposable branch**; inspect the report and run CI before merging. The actual integration test detected 21 commits and 153 changed paths. See `docs/master/UPDATE.md` and the retained detection report.

## New club research

Create a club in Admin → Clubs, queue a Wikipedia title or search phrase under Research, then run the queue. The server retrieves Wikipedia/Wikidata evidence and retains it for review, with retry handling. Approve sources before approving facts. Research does not fabricate match history or automatically produce a complete playable adapter.

For unattended queued work, configure a running server with a random `CRON_SECRET` of at least 32 characters, the same value as GitHub secret `FAN_LIFE_CRON_SECRET`, and repository variable `FAN_LIFE_RESEARCH_URL` containing the server's base URL. The included workflow processes requests every 15 minutes. The immediate admin action needs no cron configuration.

## Validation and source structure

```sh
npm run repo:hygiene
npm run assets:provenance
npm run lint
npm run typecheck
npm test -- --maxWorkers=2 --minWorkers=1
npm run master:local-db
npm run build
```

For browser verification after a successful build, run `npx playwright install chromium` then `npm run master:browser`. It starts an isolated server and writes screenshots and a report to `test-results/release`.

The M1 merge passed 4,922 tests, production build, typecheck, local SQL checks and the real three-club Timeline browser flow in [CI](https://github.com/maordubel/fanlife/actions/runs/36826215373). See `docs/master/UPDATE.md` for scope and remaining warnings. `docs/master/ARCHITECTURE.md` explains the local database adapter and limitations; `docs/UPSTREAM-README.md` retains the original documentation. Asset provenance gaps remain explicitly marked unknown; inclusion is not an assertion of new usage rights.

## M1 shared club core

Chronological Timeline now uses one engine and board for Hapoel, Zrinjski and Olympiacos. Open `/master/core` for evidence; `/clubs/<club-id>/timeline` for play. Small packs have labelled short rounds. Default evaluation needs no Supabase credentials or registration.

[Canonical direction](docs/fanlife/26-canonical-bible-2026-09-30.md) · [Contract](docs/fanlife/27-club-data-contract.md) · [Migration and verification](docs/fanlife/28-m1-migration-report.md). Other gates and production storage remain separate milestones.

## M2 shared identity

Small `club-packs/<club-id>/identity.json` manifests define background, surface, text, accent, fonts and patterns. The same identity renders on the portal card, club hub and shared Timeline. Three core clubs have complete manifests; the remaining registry clubs have neutral fallbacks with their registry colors.

English is the shared UI default. `?lang=he` selects Hebrew and RTL independently of the content language. Unavailable languages show an English fallback notice. Greek/other translations remain M5 work. Native Hapoel routes retain their existing typography and game presentation.

`npm run master:identity` validates palettes, text contrast and token use. `npm run master:core-browser` completes three rounds and checks theme tokens, mobile/RTL hubs, portal cards, unsupported-language fallback and forbidden pixels on screenshots. It requires a production build and installed Playwright Chromium.

Rivalry policies for Zrinjski and Olympiacos remain pending owner review. The existing Hapoel restriction is carried forward with a legacy label. Historical color exemptions need an exact asset, source, context, rights and dated human approval; none are newly granted by M2. Identity manifests currently govern compiled shared themes; legacy admin color inputs do not edit these manifests.

See [M2 identity contract and review](docs/fanlife/29-m2-identity-and-theme.md).

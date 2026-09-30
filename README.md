# FAN LIFE — integrated evaluation release

A neutral master and open admin around the actual **The Worker** source, imported at `0adf5464d00122a1dc310367f46e99e8dd9d74f2`. The original game engines, 13 gates, LIFE, content, assets, ingestion scripts and database migrations are included. The original home lives at `/ground`.

**Release status:** the master and admin are English; much of the native Hapoel experience remains Hebrew. Hapoel is the native playable club. Zrinjski has an imported research pack; other clubs require reviewed datasets and native adapters before they can become playable. This is a working integrated evaluation release, not the completed all-English, fully automatic multi-club product.

## Start locally

1. Install **Node.js 22 LTS** and extract the whole ZIP.
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

Extract the archive and use GitHub Desktop to add this folder; if it is not a repository yet, choose **create a repository here**. Commit the files, including `.github`, `.devcontainer` and `.env.example`, and publish to a new repository under your account. Do not upload `node_modules`, `.next`, `.fan-life` or private environment files. Do not overwrite The Worker's original repository.

For a browser-only trial, open a GitHub Codespace. The included configuration installs dependencies, starts the development server and forwards port 3000. Keep the forwarded port private. Codespaces availability and charges depend on your GitHub account. The recipe is supplied but has not been tested on a hosted Codespace.

GitHub stores the code and runs checks; **GitHub Pages cannot run this Node application**. For a persistent server, use `npm run build` followed by `npm start`, or the supplied `docker compose up --build` recipe (Docker recipe not exercised here). This evaluation architecture needs one server and persistent disk. Set `NEXT_PUBLIC_SITE_URL` to the actual origin before building for another address.

## Upstream changes

The admin's Updates action checks the actual GitHub revision against `upstream.lock.json`. The included `The Worker updates` workflow checks every six hours and can also be run manually from Actions. It applies changes in an isolated checkout, preserves the master home, runs validation and proposes an integration PR. Conflicts stop the update; sensitive changes create a draft PR for review.

After uploading, enable Actions and **Allow GitHub Actions to create and approve pull requests** in your repository settings. The workflow files in this ZIP have not been activated in your account. Optional automatic merge also requires GitHub auto-merge enabled, strict branch protection with the `doctor` check, and repository variable `FAN_LIFE_AUTO_MERGE=true`. A merged update still needs your deployment to rebuild, or a local pull and restart.

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

The integrated core passed 4,894 tests across 224 files, production build, typecheck, local SQL checks and 29-route browser verification. See `docs/master/UPDATE.md` for scope and remaining warnings. `docs/master/ARCHITECTURE.md` explains the local database adapter and limitations; `docs/UPSTREAM-README.md` retains the original documentation. Asset provenance gaps remain explicitly marked unknown; inclusion is not an assertion of new usage rights.

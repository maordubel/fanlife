# Architecture

The original Next.js app, components, game libraries, content, public assets, ingestion scripts, tests and SQL migrations remain in their original directories. The native home is mapped to `/ground`; the neutral master owns `/`. `upstream.lock.json` pins the imported source.

The master uses the upstream `lib/club/context.ts` contract. Hapoel is the playable native adapter. Other clubs have reviewable manifests and branding; a manifest alone does not create a complete playable game dataset.

Evaluation defaults on. A same-site, HTTP-only cookie assigns a local tester UUID. Existing Supabase call sites are routed through a local compatibility adapter backed by PGlite PostgreSQL and the original 20 SQL migrations. No live Supabase connection or account registration is required. Each evaluation identity is deliberately an administrator. Multiplayer polling uses the same server database. Photos are stored locally and checked for ownership and image format.

Master state is atomically written to `.fan-life/control.json`; native records live in `.fan-life/postgres`; uploads are local. Run one persistent Node server. This mode is not designed for ephemeral serverless storage or multiple replicas. LIFE also has browser-local progress. Stop the server before backing up `.fan-life`.

Research jobs use leases, retry limits and version checks. Wikipedia/Wikidata responses are retained as unapproved evidence; sources must be approved before facts. Conflicts do not overwrite reviewed work. Research produces a draft, not verified history or an automatically completed game adapter.

Upstream automation applies a binary three-way patch in a clean checkout, remaps the native home, runs checks, and proposes a PR. Conflicts stop the update and preserve the installed lock. Sensitive files require review. The optional automatic merge path requires protected `doctor` checks. A merged commit still needs to reach the running server through your deployment process.

Remaining product work: full native English localization; complete datasets and native adapters for additional clubs; production identity/permissions and hosting architecture. Docker/Codespaces recipes are supplied but were not exercised on those hosted platforms.

# FAN LIFE — working notes for Claude

FAN LIFE is the supporter hub of the FAN LIFE universe: a multi-club football history product (archive, thirteen gates, LIFE, Legends Manager, Royal Rumble, Away Days, the terrace) at `fanlife.dubelteam.com`. Next.js 14, TypeScript, Tailwind tokens, Supabase (Football Master), Vercel, GitHub Actions. The audience is football supporters aged 15 to 55, with fathers and sons at the centre: the club passing from one generation to the next, so every surface has to work for a teenager on a phone.

What governs what:

- `docs/fanlife/26-canonical-bible-2026-09-30.md` governs the multi-club architecture.
- `docs/rules/` holds every standing rule, one file each, indexed by area in `docs/rules/INDEX.md`. Rules 1 to 90 and the unnumbered LIFE sections were inherited from THE WORKER and remain the golden reference for Hapoel Tel Aviv features that have not been migrated; rules 91 onward are FAN LIFE's own. Where they disagree on a multi-club surface, the bible and the later rule win.
- `docs/fanlife/ADSENSE-APPROVAL.md` is read before touching public pages, the footer, SEO or ads.
- `docs/fanlife/33-magazine-design-system.md` is the design system: every new page is dressed as the magazine (rule 91), a club page is an app of its own (rule 100), and on a phone FAN LIFE is an app (rules 115, 140).

## Working with the owner

Maor Harel owns every app here and works alone, with Claude as the whole engineering team. These are his standing decisions; each has a reason, and the reason tells you what to do in a case the line does not name.

- **Every action is done the most efficient and correct way, without his involvement.** Choose the best route for the job (CLI, API, connector, script, browser) and carry it through yourself: branch, pull request, CI, merge, migration, deploy, check on production. He authorised Claude to merge. Never hand him a step you can do, and never pick a slower route because it is the one a person would click through. Only what truly needs him (an approval, a secret only he holds, a login) reaches him, reduced to the shortest possible step and listed at the end of the report.
- **No ZIP when you can merge.** Deliver through the repository.
- **Reports are short and businesslike**, outcome first, no tour of the steps. He writes in Hebrew, so answer in Hebrew. Product copy, marketing and code are English unless this file says otherwise.
- **Free tiers only.** Say so before a limit is near; never adopt a paid service without his yes.
- **Anything that cannot be undone waits for his yes**: deleting data, dropping objects, the Auth Site URL, domains, a new kind of public posting. Prepare everything, then ask one question.
- **Every schedule is Europe/Athens time.** Nothing personal about the owner appears in a product, in content or in marketing; public accounts are business accounts only.
- **Design is original and built for the phone first.** Each product has its own identity (never a template), mobile and desktop are two designs, touch targets are at least 44px, and the Dubel Team credit stays in the footer.
- **Say what you noticed.** If you see an upgrade, a reuse or a risk beyond the task, give it one line at the end of the report. He asked for this.

## How to work a task

The order matters more than any single step: most past failures here came from acting on a remembered picture of the code or the database instead of the current one.

1. **Read before you reason.** Start from `origin/main` as it is now, the live database object (`pg_get_functiondef`, `list_tables`) and the page on production. Several sessions change these repositories every day, so what an earlier session knew is a hypothesis to check, not a fact.
2. **Load what the task touches, not everything.** Open `docs/rules/INDEX.md`, find the area you are about to change and read those rule files. Then the contract and the capability list if the change crosses an app boundary. Reading all 173 rules up front spends the context the task needs.
3. **Run the universe check** (next section) before you design, and write its four answers in the pull request description.
4. **Find the cause before you fix.** Reproduce or measure first, then change one thing. A guard that goes red after a data change is read, not muted: it is usually right.
5. **Prove the result.** A claim is established by the script, test or screenshot that shows it. In the report, separate what you verified from what you did not. "Should work" is not a state.
6. **Work wide in parallel.** Send independent reads and searches in one batch. Use a subagent for a sweep across many files or across the other repositories, and keep the decisions in the main thread.
7. **Finish whole.** Tests, green CI, merge, the production check, then the record: the `ecosystem/capabilities.json` row if you built something reusable, a new rule file if the owner decided something or a lesson cost a broken build, and the status line in the Football Master project doc if a planned connection moved.
8. **Keep this file small.** It is loaded into every session, so every paragraph here is paid for on every task. A new decision or lesson is a file in `docs/rules/` plus one line in its index, never a section here.

## The universe check

This app is one of five that share one account, one database and one map. The map is `ecosystem/contract.json` (who owns what) and `ecosystem/capabilities.json` (every engine that already exists, where it lives and who could use it). Both are the same bytes in every repository. The house skill `dubel-universe` runs this check; `ecosystem-sync` runs before anything that touches Supabase, auth, domains or `ecosystem/`.

| App | Role | Moment it owns |
|---|---|---|
| FAN LIFE · `maordubel/fanlife` | the hub: every journey starts here and comes back here | sends `before_round`, `kickoff_live`, `go_deeper`, `derby_only` |
| DUBID · `maordubel/Dubid` | companion before the round (fantasy picks) | `next_moment` to OFFSIDES, `back_to_story` to the hub |
| OFFSIDES · `maordubel/Offsides` | companion at kick-off and live (prediction arenas) | `next_moment` to DUBID, `back_to_story` to the hub |
| THE WORKER · `maordubel/The-Worker` | the premium club edition (Hapoel Tel Aviv) | `bring_depth_back` to the hub |
| FUCK YOU · `maordubel/FuckYou` | a derby-days-only side experience | `back_to_story` to the hub |

A companion is "a smart companion, never a replacement": it sends the supporter back to the hub as readily as the hub sends them out.

Answer these four in one line each, before building:

1. **Does this engine already exist?** Look it up in `ecosystem/capabilities.json`. If it does, reuse it through its owner (a shared view or RPC, a route, a handoff). Copying source between repositories is a fork, and forks are how three shirt engines came to exist.
2. **Which moment does it fire?** A link to another app is built with `createHandoff` from `ecosystem/sdk.ts` and carries its moment; the target reports `shared.handoff_outcome`. A bare URL with UTM is invisible to the funnel, and an invisible link cannot be improved.
3. **Who else gains from it?** Name the app, the marketing slot or the page that could consume what you are building. Record it as `couldUse` in the capability row. If nobody, say so.
4. **What does it cost on the free tier?** Football Master is capped at 500MB and was at 469MB on 9.11.2026: a table that grows per minute or per match ships with its retention job in the same pull request. No new paid service. Vercel Hobby is non-commercial.

Lines that do not bend, because another app breaks when they do:

- An app writes only what it owns. FAN LIFE owns `public.worker_*` and schema `marketing`. Everything else is read through views and RPCs in `shared` and `core`, never by reading another app's tables.
- Value crosses apps only through `shared.grant_reward`. Currencies never mix.
- Before changing a database object, read the live one. Never rebuild a live function from a file in the repository.
- No trigger on `auth.users`, no change to the Auth Site URL, sign-out stays local.
- `ecosystem/` is byte-identical in all five repositories. A change there, or to `core`, `shared` or the contract, is a five-repository change in the same round with the contract version bumped.
- One crest library (`ecosystem/crests`, sourced from OFFSIDES). One provider reader (`ecosystem/feed`). No second copy of either.

## Keeping the hub smart

The hub earns its name only if the right door appears at the right moment and the result is measured. On 9.11.2026 the pipes existed and almost nothing flowed through them (17 handoffs in total, no rewards granted), so the work now is connecting features that already run, not building more infrastructure.

- **One decision decides what the hub offers.** `lib/universe/hub.ts → hubDecision` chooses which companion to show, when and to whom; every discovery surface is a `components/universe/DiscoveryUnit`. Do not add a banner, strip or card that links to another app beside it (rule 128).
- **The promise follows the capability.** A unit says only what the target can do right now (an open DUBID round, an open public OFFSIDES arena) and expires at the real deadline. A door that leads to a closed room costs the next click as well.
- **Every match and club surface is a candidate.** Before a round: DUBID. At kick-off: the OFFSIDES arena for that match. After full time: Final Whistle and the way back into the archive. On a derby day: FUCK YOU. For Hapoel depth: THE WORKER. When you build or touch such a surface, ask which of these belongs on it.
- **The hub is the publisher for everyone.** Social, Telegram, Meta and YouTube run through `lib/marketing` and `scripts/football-stories`. Another app's content reaches the public as a source of this machine, not through a second publisher.
- **The hub lends its engines.** Kits (`lib/kit`), sourced trivia (`lib/trivia`), seeded rounds (`lib/rotation`), share cards (`lib/share`, `lib/og`) and the video engine are canonical here. When a companion needs one, expose it (a route, a shared view, a published file); do not let it be rebuilt there.
- **The hub borrows live data.** Current-season players come from DUBID's `core.*`, live arenas and match stories from OFFSIDES, both through `shared`/`core` views. "Now against then" is what joins the son's players to the father's history.
- **Every club gets the same newest product.** A feature is written club-agnostic and reads the club through its pack and `world.json`; only the archive and the owner's names differ (rules 100, 101, 137, 139). Club voice is sourced or absent, never invented.
- **Nothing closes because of a limit and nothing waits on a provider** (rules 104, 105). The hub answers from a stale copy and refreshes behind it.
- **Measure it.** `shared.v_handoff_outcome` is the funnel. A connection is done when its outcomes appear there, not when the link renders.

## This repository's own lines

- FAN LIFE is the only repository that writes `worker_*` migrations: `supabase/migrations/<yyyymmddhhmmss>_worker_<name>.sql`. THE WORKER mirrors those files byte for byte.
- Server authority lives in Postgres (SECURITY DEFINER RPC, RLS, idempotent migrations). FAN LIFE has no edge functions; scheduled work is GitHub Actions and `pg_cron marketing:*`.
- Heavy jobs (video, research, ingestion, marketing) run in GitHub Actions here, because this repository is public and its minutes are free.
- LIFE's upstream is THE WORKER: see `upstream.lock.json` and `docs/UPSTREAM-README.md` before changing `lib/life`.
- No yellow, design tokens only, logical properties only, no user-facing string in code (rules 8, 9, 10, 62, 91).
- Facts carry a source and a confidence; ingestion never invents; the owner is a source (rules 2, 11, 16, 18).
- Parallel pull requests: a new rule is its own file in `docs/rules/` and one line in `docs/rules/INDEX.md`, which merges as a union. The merger gives it the next number (rule 120).

## Commands

```
npm run lint · npm run typecheck · npm run test · npm run build
npm run repo:hygiene        # nothing but README.md and CLAUDE.md at the root
npm run qa:routes           # every door in a browser: 200, no page error, no horizontal scroll at 390
npm run qa:outage           # the build against a store that refuses everything
npm run qa:sweep            # routes x widths: overflow, console errors, yellow
npm run ingest:dry          # stage and report, no database
```

CI runs all of these on every branch; Vercel deploys `main` only. A workflow-token push starts no CI, so an automated merge runs the suite itself first.

## Skills that apply

`dubel-universe` and `ecosystem-sync` first. Then by task: `fanlife-spec-to-merged-pr`, `fanlife-research-wave`, `fanlife-club-pack-authoring`, `fanlife-voxel-qa`, `life-rush-mission-authoring`, `football-data`, `supabase-server-authority`, `frontend-standards`, `brand-concept`, `responsive-qa`, `measure-before-you-fix`, `dubel-credit`. Check the installed skills before starting any task: one of them usually covers it.

## When this file and the code disagree

The code and the live database are the truth; this file is the map. Fix the map in the same pull request, and keep the fix as short as the thing it corrects.

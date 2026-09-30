# ADR-fanlife-0001: Two separate projects; Fan Life is one repo, one Vercel project, multi-tenant

## Status
Proposed (owner direction 30.9.2026)

## Date
2026-09-30

## Context
Owner decision: **The Worker stays a separate product in its own repo/Vercel, developed on its own, and is not touched by this programme.** Fan Life is a separate project that, in the end, takes everything built for Hapoel and translates it to every club. One GitHub repo, one Vercel project, clubs on subdomains.

## Decision
1. **Two projects.** The Worker (Hapoel) — untouched. Fan Life (`maordubel/fanlife`) — own engine, own repo, own Vercel project, wildcard `*.fanlife.game`.
2. **Fan Life is multi-tenant at runtime.** The club is resolved from the host (middleware, closed registry). One deployment serves all clubs.
3. **Club data is not in the bundle.** A `ClubData` provider loads a club's pack at request time (server-side, cached) from Postgres (`club_id`) and object storage; gates receive data as props/API responses. Hapoel is one club in this system, fed by an *import* of Worker content, not a live link.
4. **The Worker → Fan Life is a deliberate translation, not a sync.** Engine improvements are ported on the owner's request (import tool + review), never by a scheduled 6-hour cron. The automatic upstream cron is disabled.
5. **Control plane and product live in the same repo** but as separate route groups: `app/(portal)`, `app/master` (admin), `app/(club)` (games).

## Alternatives
- Per-club deployments (rejected by owner: one Vercel, one GitHub).
- Monorepo with The Worker inside (rejected: separation).
- Continued automatic sync (rejected: drift/conflicts).

## Consequences
+ One place to operate; The Worker is safe. − The engine's ~100 static content imports must become provider reads inside Fan Life (its own refactor, no risk to Hapoel); client bundles must carry no club data; needs caching and a size budget; more tests for tenant isolation.

## Dependencies
Depends on: none. Enables: 0002–0007. Blocks: M1.

## Validation
Two clubs served by one deployment from different hosts with no cross-club data; Hapoel game in Fan Life matches The Worker's behaviour on the same import; The Worker repo has no commits from this programme after 30.9.

# ADR-fanlife-0009: An experience is not a club

## Status
Accepted (owner roadmap 12.10.2026)

## Context
ALL FOOTBALL plays the shared gates over approved records from every club. The quick route — a fake row in
`lib/master/registry.ts` — would make every consumer of the registry (hub roll, research planner, control room,
subdomains, colour policy, fixtures) believe a club exists with a city, rivals and a squad. None of it is true.

## Decision
1. `lib/experiences/registry.ts` holds `ExperienceDefinition` rows (`kind:'aggregate'`, `id:'all-football'`). The club
   registry is untouched; `clubFromHost` and `resolveClubId` never see an experience id.
2. Routes live under `/all-football/**`, not `/clubs/[slug]/**`.
3. Access: `experienceAccess()` = feature switch (`lib/features.ts`) AND per-gate readiness of the derived pool. It never
   calls `gateAccess` with an invented club. Owner sessions may preview while the switch is off.
4. Branding is FAN LIFE's own, neutral: no club colour dominates; a question or card shows the club it came from.

## Consequences
+ Nothing that reads the registry can be fooled. − The gate actions need cores that do not resolve a slug (ADR-0010).

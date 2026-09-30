import { GATES } from '@/lib/gates'

import type { GateStat, Profile } from './store'

/**
 * מזהה שער — what a round is filed under, and which plate on the wall it lights.
 *
 * An id is a gate's route (`gateId(href)`), optionally followed by ONE variant segment:
 * `/trivia/europe`, `/royal-rumble/live`. That shape is what `worker_gate_run.gate` already
 * promises in its own column comment (`/trivia/general`) and what its check constraint
 * accepts (`gate like '/%'`), so per-topic strengths need no migration at all.
 *
 * The wall does not read ids; it reads PLATES. `wallGate(id)` resolves an id to the
 * longest gate route that is a whole-segment prefix of it, and `wallStat()` folds every
 * child id of a plate into one line: plays, correct and asked are summed, best and
 * bestRate take the max, lastOn the later. Summing is right here — and only here —
 * because the children are DISJOINT: one round is filed under exactly one id, so a
 * trivia round in Europe is never also a round in "players".
 *
 * **The Royal Rumble aliases.** Until 21.9.2026 gate 9 reported under `royal-rumble` and
 * `royal-rumble-live` — no leading slash — so `worker_gate_run`'s check refused every row
 * silently and `/tik`, which reads `/royal-rumble`, never lit plate 9. The wall topped out
 * at 11 of 12 and "what's next" suggested gate 9 for ever. The fix is two-sided: new
 * rounds are normalised on the way IN (`canonicalGate`), and devices that already hold
 * the old ids are mapped on the way OUT, when read — no migration of anybody's storage.
 */

export const GATE_ALIASES: Readonly<Record<string, string>> = {
  'royal-rumble': '/royal-rumble',
  'royal-rumble-live': '/royal-rumble/live',
  '/royal-rumble-live': '/royal-rumble/live',
}

/**
 * The id a gate reports under. Derived from the route so a gate cannot be recorded
 * under two names — which is how `/trivia` and `/trivia/general` would have drifted.
 */
export function gateId(href: string): string {
  const path = (href.split('?')[0] ?? href).replace(/\/$/, '')
  return path === '' ? '/' : path
}

/** A variant is one lowercase slug segment — a topic, a mode. Anything else is dropped. */
export function cleanVariant(variant: string | null | undefined): string | null {
  if (typeof variant !== 'string') return null
  const slug = variant.trim().toLowerCase()
  return /^[a-z0-9][a-z0-9-]{0,31}$/.test(slug) ? slug : null
}

/**
 * The id a round is FILED under: aliases resolved, query stripped, leading slash
 * guaranteed, and the variant (if any, and if well-formed) appended as one segment.
 * A gate id that already ends in the variant is not doubled.
 */
export function canonicalGate(gate: string, variant?: string | null): string {
  const raw = (gate ?? '').trim()
  const aliased = GATE_ALIASES[raw] ?? raw
  const slashed = aliased.startsWith('/') ? aliased : `/${aliased}`
  const base = GATE_ALIASES[gateId(slashed)] ?? gateId(slashed)
  const slug = cleanVariant(variant)
  if (slug === null || base.endsWith(`/${slug}`)) return base
  return `${base}/${slug}`
}

/** Every open gate's route, longest first, so the first prefix match is the longest. */
const ROUTES: readonly string[] = GATES.filter((gate) => gate.href !== null)
  .map((gate) => gateId(gate.href as string))
  .sort((a, b) => b.length - a.length)

/**
 * The plate an id lights, as that plate's route — or null for an id no plate owns.
 *
 * Whole segments only: `/kits/build/x` belongs to gate 4 (`/kits/build`), `/kits/studio`
 * to gate 5 (`/kits`), and `/kitsch` to nobody.
 */
export function wallGate(id: string): string | null {
  const canonical = canonicalGate(id)
  for (const route of ROUTES) {
    if (canonical === route || canonical.startsWith(`${route}/`)) return route
  }
  return null
}

/** The gate NUMBER an id lights, or null. */
export function wallNumber(id: string): number | null {
  const route = wallGate(id)
  if (route === null) return null
  return GATES.find((gate) => gate.href !== null && gateId(gate.href) === route)?.number ?? null
}

/**
 * The variant part of an id under its plate: `/trivia/europe` → `europe`,
 * `/trivia` → null. Used for per-topic strengths.
 */
export function variantOf(id: string): string | null {
  const route = wallGate(id)
  if (route === null) return null
  const canonical = canonicalGate(id)
  if (canonical === route) return null
  const rest = canonical.slice(route.length + 1)
  return rest === '' ? null : rest
}

function blank(): GateStat {
  return { plays: 0, best: 0, bestRate: 0, lastOn: '', correct: 0, asked: 0 }
}

/**
 * One plate's line: every id that rolls up to `href`, folded. See the header for why
 * the sum is honest here.
 */
export function wallStat(profile: Pick<Profile, 'gates'>, href: string): GateStat {
  const route = gateId(href)
  const out = blank()
  for (const [id, stat] of Object.entries(profile.gates ?? {})) {
    if (!stat || wallGate(id) !== route) continue
    out.plays += stat.plays ?? 0
    out.correct += stat.correct ?? 0
    out.asked += stat.asked ?? 0
    out.best = Math.max(out.best, stat.best ?? 0)
    out.bestRate = Math.max(out.bestRate, stat.bestRate ?? 0)
    if ((stat.lastOn ?? '') > out.lastOn) out.lastOn = stat.lastOn
  }
  return out
}

/** Every variant of a plate with its own folded stat — the per-topic strengths. */
export function variantStats(
  profile: Pick<Profile, 'gates'>,
  href: string,
): Array<{ variant: string; stat: GateStat }> {
  const route = gateId(href)
  const byVariant = new Map<string, GateStat>()
  for (const [id, stat] of Object.entries(profile.gates ?? {})) {
    if (!stat || wallGate(id) !== route) continue
    const variant = variantOf(id)
    if (variant === null) continue
    const prior = byVariant.get(variant) ?? blank()
    byVariant.set(variant, {
      plays: prior.plays + (stat.plays ?? 0),
      correct: prior.correct + (stat.correct ?? 0),
      asked: prior.asked + (stat.asked ?? 0),
      best: Math.max(prior.best, stat.best ?? 0),
      bestRate: Math.max(prior.bestRate, stat.bestRate ?? 0),
      lastOn: (stat.lastOn ?? '') > prior.lastOn ? stat.lastOn : prior.lastOn,
    })
  }
  return [...byVariant.entries()]
    .map(([variant, stat]) => ({ variant, stat }))
    .sort((a, b) => a.variant.localeCompare(b.variant))
}

import { isActive, routeAtLeast, type RouteId } from './routes'
import { flagOn, type LifeState, type ProfessionId, type WorkState } from './types'

/**
 * עבודה כהקשר (MASTER §24–§27) — a minimal `WorkState` and three DERIVED readings.
 *
 * Nothing here is an XP counter. `resolveWorkProfile` says what the job does to the day
 * (stability, flexibility, pressure, an income band, what it gives access to);
 * `resolveCareerSeeds` reads the EVIDENCE already in the proof ledger and the activity record —
 * `distributed_papers`, `helped_archive`, `verified_report`, `wrote_article`, `ran_shop_shift`,
 * `coordinated_people` — as facts, and groups them into the six areas a career can grow from;
 * `careerEntry` says how a route would be entered from here: organic (the past already leads
 * there), assisted (somebody hands over the chance), late (a change of life), or not yet.
 *
 * An old save has no `work` at all and folds to `{}`; every reading below infers from routes
 * and evidence, so nothing is rewritten and nothing is invented (MASTER §90).
 */

export type Band = 'low' | 'medium' | 'high'

export type WorkProfile = {
  profession: ProfessionId
  mode: NonNullable<WorkState['mode']>
  responsibility: NonNullable<WorkState['responsibility']>
  stability: Band
  flexibility: Band
  pressure: Band
  incomeBand: Band
  /** what the job opens — rooms, people, information — as tags the resolver and scenes read */
  access: readonly string[]
}

const ROUTE_PROFESSION: Partial<Record<RouteId, ProfessionId>> = {
  JOURNALIST: 'media',
  OWNER: 'business',
  CREATOR: 'creative',
  USSISHKIN_FOUNDER: 'organization',
  TRAVELLER: 'international',
  ULTRAS: 'organization',
}

/** the profession he holds, stated or inferred from the highest active route */
export function professionOf(state: LifeState): ProfessionId {
  const stated = state.work?.profession
  if (stated) return stated
  for (const route of ['JOURNALIST', 'OWNER', 'CREATOR', 'USSISHKIN_FOUNDER', 'TRAVELLER'] as const) {
    if (isActive(state, route) && routeAtLeast(state, route, 'practice')) return ROUTE_PROFESSION[route] ?? 'general'
  }
  return 'general'
}

const ACCESS: Record<ProfessionId, readonly string[]> = {
  media: ['newsroom', 'archive', 'sources', 'press-box'],
  organization: ['people', 'equipment', 'hall'],
  business: ['shop', 'suppliers', 'till'],
  creative: ['workshop', 'commissions'],
  technical: ['workshop', 'tools'],
  international: ['abroad', 'contacts'],
  general: [],
}

/** derived, never stored (MASTER §25) */
export function resolveWorkProfile(state: LifeState): WorkProfile {
  const work = state.work ?? {}
  const profession = professionOf(state)
  const mode = work.mode ?? (state.age < 18 ? 'betweenJobs' : 'regular')
  const responsibility = work.responsibility ?? 'help'
  const stability: Band = mode === 'regular' ? 'high' : mode === 'freelance' || mode === 'selfEmployed' ? 'medium' : 'low'
  const flexibility: Band = mode === 'freelance' ? 'high' : mode === 'selfEmployed' ? 'medium' : mode === 'regular' ? 'low' : 'high'
  const pressure: Band =
    responsibility === 'lead' || responsibility === 'coordinate' ? 'high' : mode === 'selfEmployed' ? 'medium' : mode === 'betweenJobs' ? 'low' : 'medium'
  const incomeBand: Band =
    mode === 'betweenJobs' ? 'low' : responsibility === 'lead' || mode === 'selfEmployed' ? 'high' : responsibility === 'help' ? 'low' : 'medium'
  return { profession, mode, responsibility, stability, flexibility, pressure, incomeBand, access: ACCESS[profession] }
}

// ------------------------------------------------------------------ career seeds ---

export type CareerArea = 'media' | 'organization' | 'business' | 'creative' | 'technical' | 'international'

/** one fact, in the evidence vocabulary of MASTER §26 — never a number */
export type CareerSeed = { area: CareerArea; fact: string }

const PROOF_SEEDS: Record<string, { area: CareerArea; fact: string }> = {
  verified_report: { area: 'media', fact: 'verified_report' },
  written_account: { area: 'media', fact: 'wrote_article' },
  journalism_proof: { area: 'media', fact: 'wrote_article' },
  group_delivered: { area: 'organization', fact: 'coordinated_people' },
  leadership_proof: { area: 'organization', fact: 'coordinated_people' },
  founding_proof: { area: 'organization', fact: 'completed_local_project' },
  community_help: { area: 'organization', fact: 'helped_community' },
  adult_shift: { area: 'business', fact: 'ran_shop_shift' },
  balanced_budget: { area: 'business', fact: 'balanced_budget' },
  business_proof: { area: 'business', fact: 'closed_supplier' },
  debt_settled: { area: 'business', fact: 'closed_supplier' },
  creative_work: { area: 'creative', fact: 'made_original_work' },
  creation_proof: { area: 'creative', fact: 'work_used_in_world' },
  travel_proof: { area: 'international', fact: 'led_journey' },
  route_plan: { area: 'international', fact: 'planned_route' },
  repair_done: { area: 'technical', fact: 'fixed_something' },
}

/**
 * The evidence, read where it already sits: the proof ledger, the activity record, the
 * outputs kept, the standing abroad. Distinct by fact, so ten shifts are one `ran_shop_shift`
 * (MASTER §69: no grind), and ordered stably.
 */
export function resolveCareerSeeds(state: LifeState): CareerSeed[] {
  const seen = new Set<string>()
  const out: CareerSeed[] = []
  const add = (area: CareerArea, fact: string) => {
    const key = `${area}:${fact}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ area, fact })
  }
  for (const proof of state.proofs) {
    const seed = PROOF_SEEDS[proof.kind]
    if (seed) add(seed.area, seed.fact)
  }
  const runs = (id: string) => state.activities[id]?.runs ?? 0
  if (runs('papers') > 0) add('media', 'distributed_papers')
  if (runs('kitchen-archive') > 0) add('media', 'helped_archive')
  if (runs('cafe-shift') > 0 || runs('shop-order') > 0) add('business', 'ran_shop_shift')
  if (runs('shop-order') > 0) add('creative', 'built_a_shirt_to_order')
  if (runs('tifo-night') > 0) add('organization', 'coordinated_people')
  if (runs('ussishkin-help') > 0) add('organization', 'helped_community')
  for (const output of Object.values(state.outputs ?? {})) {
    if (output.data.surface === 'shirt' || output.data.surface === 'sticker') add('creative', 'made_original_work')
    if (output.data.surface === 'banner' || output.data.surface === 'wall') add('creative', 'painted_for_the_stand')
  }
  if (state.reputation.standing.international > 0) add('international', 'known_abroad')
  if (Object.values(state.presence).includes('travelling')) add('international', 'travelled_for_it')
  if (flagOn(state, 'life:workshop') || state.work?.profession === 'technical') add('technical', 'fixed_something')
  return out
}

/** the area with the most facts, or null when nothing has been done yet */
export function leadingArea(state: LifeState): CareerArea | null {
  const counts = new Map<CareerArea, number>()
  for (const seed of resolveCareerSeeds(state)) counts.set(seed.area, (counts.get(seed.area) ?? 0) + 1)
  let best: CareerArea | null = null
  let most = 0
  for (const area of ['media', 'organization', 'business', 'creative', 'technical', 'international'] as const) {
    const count = counts.get(area) ?? 0
    if (count > most) {
      most = count
      best = area
    }
  }
  return best
}

// ---------------------------------------------------------------- career entry ---

export type CareerEntry = 'organic' | 'assisted' | 'late'

const ROUTE_AREA: Partial<Record<RouteId, CareerArea>> = {
  JOURNALIST: 'media',
  OWNER: 'business',
  CREATOR: 'creative',
  USSISHKIN_FOUNDER: 'organization',
  ULTRAS: 'organization',
  TRAVELLER: 'international',
}

/** the age from which a route can be entered at all — the registry's own floor (MASTER §27: no class selection) */
const ENTRY_AGE = 18
/** a change of life — MASTER §27 "LATE ENTRY" */
const LATE_AGE = 30

/**
 * How he would enter this route from where he stands (MASTER §27, §83): ORGANIC when the past
 * already leads there (two or more facts in the route's area — *"אתה ממילא כל הזמן מתקן
 * אותנו. תכתוב."*), ASSISTED when somebody would have to hand over the chance (*"צריך שני
 * טורים. רוצה לנסות?"*), LATE when it is a change of life at thirty with nothing behind it,
 * and null before the age any route opens.
 */
export function careerEntry(state: LifeState, route: RouteId): CareerEntry | null {
  if (state.age < ENTRY_AGE) return null
  const area = ROUTE_AREA[route]
  if (!area) return null
  const facts = resolveCareerSeeds(state).filter((seed) => seed.area === area).length
  if (facts >= 2) return 'organic'
  if (facts === 1 || state.age < LATE_AGE) return 'assisted'
  return 'late'
}

/**
 * npm run rumble:audit [-- --seeds 10000 --matches 1500 --window 1993]
 *
 * The Monte Carlo audit of Royal Rumble V2 (spec §60–§67): the pool and its prices, ten
 * thousand boards and what they are made of, the shuffle's distance, who keeps turning
 * up, the formation split, and the opponent measured against three yardsticks — a random
 * legal five, the strongest legal five, and the dearest legal five on the same board.
 * Never against what a supporter actually picked (§66).
 *
 * Offline only (§75): this reads hidden ratings through `royalRumbleAuditView()`, the one
 * door in the engine that opens for a script and never for a page.
 *
 * `server-only` is a bundler guard with no Node entry; the stub the tests use stands in
 * for it here, before anything that imports it is loaded (the pattern of `trivia:master`).
 */
import Module from 'node:module'
import { join } from 'node:path'

type Resolver = (request: string, ...rest: unknown[]) => string
const loader = Module as unknown as { _resolveFilename: Resolver }
const resolve = loader._resolveFilename
loader._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  if (request === 'server-only') return join(process.cwd(), 'tests/stubs/server-only.ts')
  return resolve.call(this, request, ...rest)
}

import { reportOf, type AuditPlayer } from '../../lib/game/royal-rumble-audit'
import type { RoyalRumbleSelection } from '../../lib/game/royal-rumble-public'

type Stat = { avg: number; p10: number; p50: number; p90: number; min: number; max: number }

function stat(values: readonly number[]): Stat {
  if (values.length === 0) return { avg: 0, p10: 0, p50: 0, p90: 0, min: 0, max: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0
  return {
    avg: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
    p10: at(0.1),
    p50: at(0.5),
    p90: at(0.9),
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
  }
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function row(name: string, s: Stat): string {
  return `${name.padEnd(16)} avg ${fmt(s.avg).padStart(7)}  p10 ${fmt(s.p10).padStart(6)}  p50 ${fmt(s.p50).padStart(6)}  p90 ${fmt(s.p90).padStart(6)}  min ${fmt(s.min).padStart(5)}  max ${fmt(s.max).padStart(5)}`
}

function pct(n: number, of: number): string {
  return of === 0 ? '0.0%' : `${((100 * n) / of).toFixed(1)}%`
}

function arg(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`)
  const value = index >= 0 ? Number(process.argv[index + 1]) : Number.NaN
  return Number.isFinite(value) ? value : fallback
}

async function main() {
  const seeds = arg('seeds', 10_000)
  const matches = arg('matches', Math.min(1500, seeds))
  const before = arg('window', 0)
  const window = before > 0 ? { before } : undefined

  const engine = await import('../../lib/game/royal-rumble')
  const view = engine.royalRumbleAuditView()
  const players = view.players
  const rating = new Map(players.map((player) => [player.slug, player.rating]))

  /* ---------------------------------------------------------------- pool (§61) */
  console.log(`ROYAL RUMBLE V${engine.ROYAL_RUMBLE_BALANCE_VERSION} AUDIT · seeds ${seeds} · matches ${matches}${window ? ` · window before ${before}` : ''}`)
  console.log('\n== POOL ==')
  console.log(`players ${players.length} · multi-position ${players.filter((p) => p.positions.length > 1).length} · overrides ${players.filter((p) => p.overridden).length}`)
  const positions = ['GK', 'DF', 'MF', 'FW'] as const
  console.log('by position (primary):', positions.map((pos) => `${pos} ${players.filter((p) => p.position === pos).length}`).join(' · '))
  console.log('by position (any):    ', positions.map((pos) => `${pos} ${players.filter((p) => p.positions.includes(pos)).length}`).join(' · '))
  for (const stage of ['suggested', 'calibrated', 'price'] as const) {
    const counts = [1, 2, 3, 4, 5].map((tier) => players.filter((p) => p[stage] === tier).length)
    console.log(`${stage.padEnd(10)} ` + counts.map((n, i) => `€${i + 1} ${String(n).padStart(3)} (${pct(n, players.length)})`).join(' · '))
  }
  console.log('price by position (final):')
  for (const pos of positions) {
    const inPos = players.filter((p) => p.positions.includes(pos))
    const counts = [1, 2, 3, 4, 5].map((tier) => inPos.filter((p) => p.price === tier).length)
    console.log(`  ${pos}  ` + counts.map((n, i) => `€${i + 1} ${String(n).padStart(3)} (${pct(n, inPos.length)})`).join(' · '))
  }
  console.log('rating by price (min / avg / max):')
  for (const tier of [1, 2, 3, 4, 5]) {
    const ratings = players.filter((p) => p.price === tier).map((p) => p.rating)
    const s = stat(ratings)
    console.log(`  €${tier}  ${s.min} / ${fmt(s.avg)} / ${s.max}`)
  }
  console.log('top of each tier (by rating):')
  for (const tier of [5, 4, 3, 2, 1]) {
    const top = players.filter((p) => p.price === tier).sort((a, b) => b.rating - a.rating)
    console.log(`  €${tier} ↑ ${top.slice(0, 8).map((p) => `${p.nameHe}(${p.position}${p.overridden ? '*' : ''})`).join(' · ')}`)
    console.log(`  €${tier} ↓ ${top.slice(-5).map((p) => `${p.nameHe}(${p.position}${p.overridden ? '*' : ''})`).join(' · ')}`)
  }

  /* ---------------------------------------------------------------- rating & price review (V3) */
  const review = reportOf(players as unknown as AuditPlayer[])
  const line = (p: AuditPlayer) =>
    `${p.nameHe.padEnd(18)} ${p.position} ${String(p.fromYear ?? '----').padEnd(5)} rating ${String(p.rating).padStart(2)} · €${p.price} (suggested €${p.suggested}) · ${p.confidence}` +
    ` · peak ${p.factors.peak.toFixed(2)} long ${p.factors.longevity.toFixed(2)} out ${p.factors.output.toFixed(2)} hon ${p.factors.honours.toFixed(2)} big ${p.factors.bigGames.toFixed(2)} leg ${p.factors.legacy.toFixed(2)}` +
    (p.overrideReasonHe ? ` · ${p.overrideReasonHe}` : '')
  console.log('\n== RATING & PRICE REVIEW ==')
  console.log('-- top 30 by rating')
  for (const p of review.top30) console.log('  ' + line(p))
  console.log(`-- the €5 (exactly ${review.fives.length})`)
  for (const p of review.fives) console.log('  ' + line(p))
  for (const tier of [4, 3, 2, 1] as const) {
    console.log(`-- highest-rated €${tier}`)
    for (const p of review.highestByTier[tier]) console.log('  ' + line(p))
  }
  console.log('-- lowest-rated €4/€5')
  for (const p of review.lowestElite) console.log('  ' + line(p))
  console.log('-- per position (count · average rating · €1..€5)')
  for (const [pos, r] of Object.entries(review.positions)) console.log(`  ${pos} ${r.count} · ${r.averageRating.toFixed(1)} · ${r.tiers.join(' / ')}`)
  console.log('-- per era (count · €1..€5 · premium share)')
  for (const [era, r] of Object.entries(review.eras)) console.log(`  ${era.padEnd(8)} ${r.count} · ${r.tiers.join(' / ')} · ${(100 * r.premiumShare).toFixed(0)}%`)
  console.log('-- evidence confidence: ' + (['high', 'medium', 'low'] as const).map((c) => `${c} ${players.filter((p) => p.confidence === c).length}`).join(' · '))
  console.log(`-- suspected anomalies (${review.anomalies.length})`)
  for (const a of review.anomalies) console.log(`  [${a.kind}] ${a.nameHe} — ${a.detail}`)

  /* ---------------------------------------------------------------- boards (§62) */
  console.log('\n== BOARDS ==')
  const metrics: Record<string, number[]> = {}
  const push = (name: string, value: number) => (metrics[name] ??= []).push(value)
  const moods: Record<string, number> = {}
  const appearances = new Map<string, number>()
  let failed = 0
  const started = Date.now()
  for (let seed = 0; seed < seeds; seed += 1) {
    const { slots, quality, mood, attempt } = view.compose(seed, window)
    if (attempt < 0 || slots.length !== 5) {
      failed += 1
      continue
    }
    moods[mood] = (moods[mood] ?? 0) + 1
    for (const [name, value] of Object.entries(quality)) push(name, value)
    push('attempt', attempt)
    for (const slot of slots) {
      for (const offer of slot.offers) {
        appearances.set(offer.player.slug, (appearances.get(offer.player.slug) ?? 0) + 1)
      }
    }
  }
  console.log(`composed ${seeds - failed} · failed ${failed} · ${((Date.now() - started) / 1000).toFixed(1)}s`)
  console.log('moods:', Object.entries(moods).map(([mood, n]) => `${mood} ${pct(n, seeds - failed)}`).join(' · '))
  for (const name of ['legalLineups', 'legalRatio', 'cheapest', 'dearest', 'premiumCards', 'valueCards', 'fiveCards', 'samePriceSlots', 'deadPrefixes', 'openShare', 'score', 'attempt']) {
    console.log(row(name, stat(metrics[name] ?? [])))
  }
  const inBand = (metrics.legalRatio ?? []).filter((v) => v >= 0.3 && v <= 0.65).length
  console.log(`legal ratio in 30–65%: ${pct(inBand, seeds - failed)} · dead prefixes = 0: ${pct((metrics.deadPrefixes ?? []).filter((v) => v === 0).length, seeds - failed)}`)

  console.log('by mood (held), 300 seeds each — first-rung acceptance and what the boards look like:')
  for (const mood of ['balanced', 'star-heavy', 'value', 'tight', 'wild'] as const) {
    const rows: { strict: boolean; ratio: number; fives: number; score: number }[] = []
    for (let seed = 0; seed < 300; seed += 1) {
      const { quality, attempt } = view.compose(seed, window, mood)
      rows.push({ strict: attempt < 40 && quality.legalRatio >= 0.3 && quality.legalRatio <= 0.65, ratio: quality.legalRatio, fives: quality.fiveCards, score: quality.score })
    }
    console.log(`  ${mood.padEnd(10)} strict ${pct(rows.filter((r) => r.strict).length, rows.length)} · legal ratio ${fmt(stat(rows.map((r) => r.ratio)).avg)} · €5 cards ${fmt(stat(rows.map((r) => r.fives)).avg)} · score ${fmt(stat(rows.map((r) => r.score)).avg)}`)
  }

  /* ---------------------------------------------------------------- formation split (§65) */
  console.log('\n== FORMATION ==')

  /* ---------------------------------------------------------------- appearances (§64) */
  console.log('\n== APPEARANCES ==')
  const dealtCards = [...appearances.values()].reduce((sum, n) => sum + n, 0)
  const expected = dealtCards / players.length
  const sorted = [...appearances.entries()].sort((a, b) => b[1] - a[1])
  const byName = new Map(players.map((p) => [p.slug, p]))
  console.log(`distinct men dealt ${appearances.size} of ${players.length} · mean ${fmt(expected)} per man`)
  console.log('most frequent:', sorted.slice(0, 12).map(([slug, n]) => `${byName.get(slug)?.nameHe ?? slug} (${byName.get(slug)?.position}·€${byName.get(slug)?.price}) ${n}`).join(' · '))
  const never = players.filter((p) => !appearances.has(p.slug))
  console.log(`never dealt: ${never.length}${never.length > 0 ? ' — ' + never.slice(0, 10).map((p) => `${p.nameHe}(${p.position}·€${p.price})`).join(' · ') : ''}`)
  for (const pos of positions) {
    const inPos = players.filter((p) => p.position === pos)
    const s = stat(inPos.map((p) => appearances.get(p.slug) ?? 0))
    console.log(`  ${pos} appearances per man: ${row('', s).trim()}`)
  }
  const multi = players.filter((p) => p.positions.length > 1)
  const single = players.filter((p) => p.positions.length === 1)
  console.log(`multi-position advantage: multi ${fmt(stat(multi.map((p) => appearances.get(p.slug) ?? 0)).avg)} vs single ${fmt(stat(single.map((p) => appearances.get(p.slug) ?? 0)).avg)} per man`)

  /* ---------------------------------------------------------------- shuffle (§63) */
  console.log('\n== SHUFFLE ==')
  const shuffleSeeds = Math.min(seeds, 2000)
  const distances: number[] = []
  const perSlot: number[] = []
  const profileOverlap: number[] = []
  const qualityDiff: number[] = []
  for (let seed = 0; seed < shuffleSeeds; seed += 1) {
    const { draft, shuffleDraft } = engine.pairedRoyalRumbleDrafts(seed, window)
    const distance = engine.draftDistance(draft, shuffleDraft)
    distances.push(distance.cards)
    perSlot.push(distance.perSlot)
    const profile = (slot: (typeof draft.slots)[number]) => slot.offers.map((o) => o.player.price).sort().join('')
    profileOverlap.push(draft.slots.filter((slot, i) => profile(slot) === profile(shuffleDraft.slots[i]!)).length)
    qualityDiff.push(engine.evaluateRoyalRumbleBoard(shuffleDraft.slots).score - engine.evaluateRoyalRumbleBoard(draft.slots).score)
  }
  console.log(row('cards new /15', stat(distances)))
  console.log(row('min per slot /3', stat(perSlot)))
  console.log(row('same profiles', stat(profileOverlap)))
  console.log(row('quality diff', stat(qualityDiff)))
  console.log(`≥10/15: ${pct(distances.filter((d) => d >= 10).length, shuffleSeeds)} · ≥12/15: ${pct(distances.filter((d) => d >= 12).length, shuffleSeeds)} · every slot ≥2/3: ${pct(perSlot.filter((d) => d >= 2).length, shuffleSeeds)}`)

  /* ---------------------------------------------------------------- opponent (§66) */
  console.log('\n== OPPONENT ==')
  const oppCost: number[] = []
  const oppPower: number[] = []
  const oppPercentile: number[] = []
  const oppFormation: Record<string, number> = {}
  const wins = { random: 0, strong: 0, dearest: 0, cheapest: 0 }
  const draws = { random: 0, strong: 0, dearest: 0, cheapest: 0 }
  const played = { random: 0, strong: 0, dearest: 0, cheapest: 0 }
  const usPower = { random: [] as number[], strong: [] as number[], dearest: [] as number[], cheapest: [] as number[] }
  const seedsModule = await import('../../lib/game/royal-rumble-seeds')
  for (let seed = 0; seed < matches; seed += 1) {
    const draft = engine.dealRoyalRumbleDraft(seed, window)
    if (draft.slots.length !== 5) continue
    const opponent = engine.auditOpponent(seedsModule.royalRumbleMatchSeed(seed), window)
    oppCost.push(opponent.cost)
    oppPower.push(opponent.power)
    if (opponent.formation) oppFormation[opponent.formation] = (oppFormation[opponent.formation] ?? 0) + 1
    const below = opponent.candidatePowers.filter((p) => p < opponent.power).length
    oppPercentile.push(opponent.candidatePowers.length ? below / opponent.candidatePowers.length : 0)

    // the 243 lineups of this board, the legal ones, and three yardsticks
    type Lineup = { picks: RoyalRumbleSelection[]; cost: number; power: number }
    const lineups: Lineup[] = []
    const walk = (index: number, picks: RoyalRumbleSelection[], cost: number, power: number) => {
      if (index === 5) {
        if (cost <= draft.budget) lineups.push({ picks, cost, power })
        return
      }
      for (const offer of draft.slots[index]!.offers) {
        walk(index + 1, [...picks, { slug: offer.player.slug, offeredAs: offer.offeredAs }], cost + offer.player.price, power + (rating.get(offer.player.slug) ?? 0))
      }
    }
    walk(0, [], 0, 0)
    if (lineups.length === 0) continue
    const random = lineups[Math.floor(((seed * 2654435761) >>> 0) / 4294967296 * lineups.length)]!
    const strong = [...lineups].sort((a, b) => b.power - a.power)[0]!
    const dearest = [...lineups].sort((a, b) => b.cost - a.cost || b.power - a.power)[0]!
    const cheapest = [...lineups].sort((a, b) => a.cost - b.cost || b.power - a.power)[0]!
    for (const [name, lineup] of [['random', random], ['strong', strong], ['dearest', dearest], ['cheapest', cheapest]] as const) {
      const result = engine.playRoyalRumble(seed, lineup.picks, window)
      if (!result) continue
      played[name] += 1
      usPower[name].push(lineup.power)
      if (result.winner === 'us') wins[name] += 1
      if (result.winner === 'draw') draws[name] += 1
    }
  }
  console.log(row('cost', stat(oppCost)))
  console.log(row('hidden power', stat(oppPower)))
  console.log(row('pctl of cands', stat(oppPercentile)))
  console.log('formation:', Object.entries(oppFormation).map(([f, n]) => `${f} ${pct(n, oppCost.length)}`).join(' · '))
  for (const name of ['random', 'strong', 'dearest', 'cheapest'] as const) {
    console.log(`vs ${name.padEnd(8)} legal five: W ${pct(wins[name], played[name])} · D ${pct(draws[name], played[name])} · L ${pct(played[name] - wins[name] - draws[name], played[name])} · our power avg ${fmt(stat(usPower[name]).avg)} (n=${played[name]})`)
  }
}

void main()

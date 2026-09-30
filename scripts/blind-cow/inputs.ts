/**
 * The builder's inputs, read the same way by `build-bank.ts`, `validate-bank.ts` and the
 * tests — so "the file is what a fresh build makes" is a comparison of like with like.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import Module from 'node:module'
import { join } from 'node:path'

import type { BuildInput } from '@/lib/game/blind-cow/build'
import type { BlindCowBank } from '@/lib/game/blind-cow/types'
import { buildRecognition } from '@/lib/game/blind-cow/recognition'

export const ROOT = join(__dirname, '..', '..')

// `server-only` is a bundler guard with no Node entry; the stub the tests use stands in for it
type Resolver = (request: string, ...rest: unknown[]) => string
const loader = Module as unknown as { _resolveFilename: Resolver }
const resolveOriginal = loader._resolveFilename
loader._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  if (request === 'server-only') return join(ROOT, 'tests/stubs/server-only.ts')
  return resolveOriginal.call(this, request, ...rest)
}
export const BANK_PATH = join(ROOT, 'content/generated/blind-cow-bank.json')
export const SQL_PATH = join(ROOT, 'supabase/migrations/20260924090000_worker_blind_cow.sql')

const sha = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 16)

export function readInputs(previous: BlindCowBank | null = readBank()): BuildInput {
  const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')
  const pmText = read('content/generated/player-master.json')
  const mmText = read('content/generated/match-master.json')
  const pm = JSON.parse(pmText)
  const mm = JSON.parse(mmText)
  const graph = JSON.parse(read('content/generated/entity-graph.json'))
  const comps = JSON.parse(read('content/manual/competitions.json'))
  const teamNames = new Map<string, string>()
  for (const e of graph.entities as { id: string; type: string; titleHe: string; confidence: number }[]) {
    if (e.type === 'team' && e.id.startsWith('team:football:') && e.confidence >= 2) {
      teamNames.set(e.id.slice('team:football:'.length), e.titleHe)
    }
  }
  const prices = new Map(Object.entries(JSON.parse(read('content/generated/player-prices.json')).prices as Record<string, number>))
  // Two documented counts, each a lower bound of the real career total: the infobox `הופעות`
  // and the wiki's league-appearance table. The larger is the better lower bound.
  const appearances = new Map<string, number>()
  const lift = (id: string, n: number) => appearances.set(id, Math.max(appearances.get(id) ?? 0, n))
  for (const r of JSON.parse(read('content/manual/player-appearances.json')).records as { playerId: string; appearances: number }[]) lift(r.playerId, r.appearances)
  for (const r of JSON.parse(read('content/manual/player-league-appearances.json')).records as { playerId: string; leagueAppearances: number }[]) lift(r.playerId, r.leagueAppearances)
  const recognition = buildRecognition(
    (pm.players as { id: string; slug: string; kind: string }[])
      .filter((p) => p.kind === 'player' && prices.has(p.slug))
      .map((p) => ({ playerId: p.id, price: prices.get(p.slug) as 1 | 2 | 3 | 4 | 5, appearances: appearances.get(p.id) ?? null })),
  )
  const songTunes = new Map(
    (JSON.parse(read('content/manual/player-song-tunes.json')).records as { playerId: string; tuneHe: string }[]).map((r) => [r.playerId, r.tuneHe]),
  )
  const careerClubs = new Map(
    (JSON.parse(read('content/manual/player-career-clubs.json')).records as { playerId: string; clubs: string[] }[]).filter((r) => r.clubs.length).map((r) => [r.playerId, r.clubs] as const),
  )
  return {
    players: pm.players,
    recognition,
    songTunes,
    careerClubs,
    matches: mm.matches,
    moments: mm.moments,
    teamNames,
    competitionNames: new Map((comps.records as { slug: string; nameHe: string }[]).map((r) => [r.slug, r.nameHe])),
    playerMasterSha: sha(pmText),
    matchMasterSha: sha(mmText),
    previous,
  }
}

export function readBank(): BlindCowBank | null {
  return existsSync(BANK_PATH) ? (JSON.parse(readFileSync(BANK_PATH, 'utf8')) as BlindCowBank) : null
}

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import {
  MATCH_ID_PREFIX,
  type CanonicalMatchId,
  type MatchIdEntry,
  type MatchNaturalKey,
  idForNaturalKey,
} from '@/lib/canon/matchId'

/**
 * The mint. The ONLY thing allowed to create a `CanonicalMatchId`.
 *
 * An id is derived from the natural key the first time that match is seen, and then the
 * derivation never runs again for it — the registry is the authority from that moment.
 * That distinction is the whole design: deriving on every read would make the id a
 * function of the record, which is precisely what a stable id must not be.
 *
 * The registry is append-only in the sense that matters: an entry's `id` and `mintedOn`
 * are never rewritten. `naturalKey` moves forward on a correction and the superseded key
 * joins `aliases`, so re-importing an uncorrected source resolves to the same match
 * instead of minting a duplicate.
 *
 * Collision handling is not decoration. A 48-bit prefix over a few thousand matches has
 * a birthday probability around one in a billion — small, and not zero, and a collision
 * would silently merge two matches into one memory in somebody's saved life. So a
 * collision is detected and the mint walks a counter until it is unique.
 */

export const MATCH_ID_REGISTRY = 'content/manual/match-ids.json'

type RegistryFile = {
  note: string
  records: MatchIdEntry[]
}

const NOTE =
  'Append-only. An id is minted once and never changes; a corrected natural key moves ' +
  'to `naturalKey` and the old one joins `aliases`. Never hand-edit an `id`.'

export function loadRegistry(root: string): MatchIdEntry[] {
  const path = join(root, MATCH_ID_REGISTRY)
  if (!existsSync(path)) return []
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<RegistryFile>
    return Array.isArray(parsed.records) ? parsed.records : []
  } catch {
    // A corrupt registry must not be silently replaced — that would re-mint every id
    // and orphan every saved life. Fail loudly instead.
    throw new Error(`${MATCH_ID_REGISTRY} is unreadable — refusing to mint over it`)
  }
}

/** The exact bytes `saveRegistry` writes — exported so a test can compare without writing. */
export function serialiseRegistry(records: readonly MatchIdEntry[]): string {
  const sorted = [...records].sort((a, b) => a.id.localeCompare(b.id))
  return `${JSON.stringify({ note: NOTE, records: sorted }, null, 2)}\n`
}

export function saveRegistry(root: string, records: readonly MatchIdEntry[]): void {
  const path = join(root, MATCH_ID_REGISTRY)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, serialiseRegistry(records), 'utf8')
}

function derive(key: MatchNaturalKey, salt: number): CanonicalMatchId {
  const seed = salt === 0 ? key : `${key}#${salt}`
  return `${MATCH_ID_PREFIX}${createHash('sha256').update(seed).digest('hex').slice(0, 12)}` as CanonicalMatchId
}

export type MintResult = { id: CanonicalMatchId; minted: boolean }

/**
 * The id for a natural key, minting one if this match has never been seen.
 *
 * `registry` is mutated in place so a whole import can share one list and write it once.
 */
export function mintMatchId(
  registry: MatchIdEntry[],
  key: MatchNaturalKey,
  sport: MatchIdEntry['sport'],
  now = new Date().toISOString().slice(0, 10),
): MintResult {
  const existing = idForNaturalKey(registry, key)
  if (existing) return { id: existing, minted: false }

  let salt = 0
  let id = derive(key, salt)
  while (registry.some((entry) => entry.id === id)) {
    salt += 1
    id = derive(key, salt)
  }

  registry.push({ id, sport, naturalKey: key, aliases: [], mintedOn: now })
  return { id, minted: true }
}

/**
 * Record that a match's natural key has changed.
 *
 * The id stays. The old key becomes an alias so the superseded source still resolves.
 * Returns false when the id is unknown — a correction to a match nobody minted is a
 * data error, not something to invent an entry for.
 */
export function recordKeyCorrection(
  registry: MatchIdEntry[],
  id: CanonicalMatchId,
  nextKey: MatchNaturalKey,
): boolean {
  const entry = registry.find((row) => row.id === id)
  if (!entry) return false
  if (entry.naturalKey === nextKey) return true
  if (!entry.aliases.includes(entry.naturalKey)) entry.aliases.push(entry.naturalKey)
  entry.naturalKey = nextKey
  return true
}

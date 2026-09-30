'use client'

/**
 * האוסף — the shirts this device has built in Gate 4, shaped like `lib/polls/store.ts`.
 *
 * A shirt enters at ANY score (rule 24): gate 4 is the act, gate 5 is what the act leaves behind.
 * Since 21.9.2026 an entry also keeps the server's unlock token (`lib/kit/unlock.ts`) — the proof
 * Gate 5 asks for before it will draw the shirt or open its DNA. An entry written before the token
 * existed keeps working: Gate 5 accepts its key once and hands back a token (`app/kits/actions.ts`).
 */

import { todayInIsrael } from '@/lib/date/israel'

const KEY = 'worker.kits.v1'

export type BuiltKit = {
  seasonLabel: string
  variant: 'home' | 'away' | 'third'
  firstBuiltOn: string
  lastBuiltOn: string
  /** Gate 4 steps right on the best attempt, 0–5 */
  bestParts: number
  /** kept for entries written by the eight-category versions; new entries mirror bestParts */
  bestCategories: number
  bestScore: number
  fewestHints: number
  times: number
  /** server-signed unlock (`kit-<season>-<variant>.<dna>.<sig>`) — absent on legacy entries */
  token?: string
  /** the shirt's DNA opened in the studio (base score ≥ 75 on some attempt) */
  dna?: boolean
}
export type Collection = Record<string, BuiltKit>
export type CollectionEntry = {
  seasonLabel: string
  variant: BuiltKit['variant']
  parts: number
  score?: number
  hintsUsed?: number
  token?: string
  dna?: boolean
}

export function kitKey(seasonLabel: string, variant: string): string {
  return `${seasonLabel}|${variant}`
}

export interface CollectionStore {
  readonly remote: boolean
  read(): Promise<Collection>
  record(entry: CollectionEntry): Promise<void>
  /** store the tokens Gate 5 minted for legacy entries */
  adopt(tokens: Record<string, { token: string; dna: boolean }>): Promise<void>
  clear(): Promise<void>
}

function parse(raw: string | null): Collection {
  if (!raw) return {}
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null) return {}
  const out: Collection = {}
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    const row = value as Partial<BuiltKit>
    if (typeof row?.seasonLabel !== 'string') continue
    const first = row.firstBuiltOn ?? ''
    const parts = typeof row.bestParts === 'number' ? row.bestParts : 0
    out[key] = {
      seasonLabel: row.seasonLabel,
      variant: (row.variant ?? 'home') as BuiltKit['variant'],
      firstBuiltOn: first,
      lastBuiltOn: row.lastBuiltOn ?? first,
      bestParts: parts,
      bestCategories: typeof row.bestCategories === 'number' ? row.bestCategories : parts,
      bestScore: typeof row.bestScore === 'number' ? row.bestScore : 0,
      fewestHints: typeof row.fewestHints === 'number' ? row.fewestHints : 99,
      times: typeof row.times === 'number' ? row.times : 1,
      ...(typeof row.token === 'string' ? { token: row.token } : {}),
      ...(row.dna === true ? { dna: true } : {}),
    }
  }
  return out
}

/** a token that opened the DNA outranks one that did not — never downgrade a shirt */
function better(current: BuiltKit | undefined, token: string | undefined, dna: boolean | undefined) {
  if (!token) return { token: current?.token, dna: current?.dna }
  if (current?.dna && !dna) return { token: current.token, dna: true }
  return { token, dna: Boolean(dna) }
}

export class LocalCollectionStore implements CollectionStore {
  readonly remote = false

  async read(): Promise<Collection> {
    try {
      return parse(window.localStorage.getItem(KEY))
    } catch {
      return {}
    }
  }

  async record(entry: CollectionEntry): Promise<void> {
    try {
      const current = await this.read()
      const key = kitKey(entry.seasonLabel, entry.variant)
      const existing = current[key]
      const today = todayInIsrael()
      const parts = Math.max(0, Math.min(5, Math.floor(entry.parts)))
      const score = entry.score ?? 0
      const hints = entry.hintsUsed ?? 99
      const proof = better(existing, entry.token, entry.dna)
      const next: BuiltKit = existing
        ? {
            ...existing,
            lastBuiltOn: today,
            bestParts: Math.max(existing.bestParts, parts),
            bestCategories: Math.max(existing.bestCategories, parts),
            bestScore: Math.max(existing.bestScore, score),
            fewestHints: Math.min(existing.fewestHints, hints),
            times: existing.times + 1,
          }
        : {
            seasonLabel: entry.seasonLabel,
            variant: entry.variant,
            firstBuiltOn: today,
            lastBuiltOn: today,
            bestParts: parts,
            bestCategories: parts,
            bestScore: score,
            fewestHints: hints,
            times: 1,
          }
      if (proof.token) next.token = proof.token
      if (proof.dna) next.dna = true
      window.localStorage.setItem(KEY, JSON.stringify({ ...current, [key]: next }))
    } catch {
      // a browser that refuses storage keeps playing; the shirt simply is not remembered
    }
  }

  async adopt(tokens: Record<string, { token: string; dna: boolean }>): Promise<void> {
    try {
      const current = await this.read()
      let changed = false
      for (const [key, proof] of Object.entries(tokens)) {
        const row = current[key]
        if (!row || row.token) continue
        current[key] = { ...row, token: proof.token, ...(proof.dna ? { dna: true } : {}) }
        changed = true
      }
      if (changed) window.localStorage.setItem(KEY, JSON.stringify(current))
    } catch {
      // nothing to adopt into
    }
  }

  async clear(): Promise<void> {
    try {
      window.localStorage.removeItem(KEY)
    } catch {
      // already gone
    }
  }
}

export function activeCollection(): CollectionStore {
  return new LocalCollectionStore()
}

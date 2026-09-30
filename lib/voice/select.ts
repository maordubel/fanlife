import { t } from '@/lib/i18n'

import { TIER_FALLBACK } from './contexts'
import { hashSeed } from './hash'
import { SHARE_KEY, VOICES } from './messages'
import { songFor } from './songs'
import type { GateNo, MicroLine, ResultTier, VoiceLine, VoiceOut, VoiceRequest } from './types'

/**
 * הבחירה — deterministic. The same run gets the same line: a pool is indexed by a hash of
 * the seed and a salt naming the moment, never by `Math.random()`. A shared `?seed=` link
 * therefore opens on the same words the sender read, and a reload does not re-roll them.
 */

export { hashSeed }

/** One item of a pool, chosen by seed and salt. An empty pool answers null. */
export function pick<T>(pool: readonly T[], seed: number | string | undefined, salt: string): T | null {
  if (pool.length === 0) return null
  if (pool.length === 1) return pool[0] as T
  return pool[hashSeed(`${seed ?? 0}|${salt}`) % pool.length] as T
}

function resolveLine(line: VoiceLine, vars: Record<string, string> | undefined): Omit<VoiceOut, 'ctaShare'> {
  const out: Omit<VoiceOut, 'ctaShare'> = { title: t(line.title, vars) }
  if (line.eyebrow) out.eyebrow = t(line.eyebrow, vars)
  if (line.body) out.body = t(line.body, vars)
  if (line.ctaPrimary) out.ctaPrimary = t(line.ctaPrimary, vars)
  return out
}

/** The pool a result tier answers from, walking `TIER_FALLBACK` down. */
export function resultPool(gate: GateNo, tier: ResultTier): readonly VoiceLine[] {
  const result = VOICES[gate].result
  for (const step of TIER_FALLBACK[tier]) {
    const pool = result[step]
    if (pool && pool.length) return pool
  }
  return []
}

/**
 * `voice({ gate, moment, result, seed })` — the whole voice in one call (§4).
 *
 *   intro   → the gate's opening line
 *   result  → the line for the tier (defaults to `done`)
 *   correct / wrong → the micro-feedback line as the title, its small line as the body
 *
 * `ctaShare` is always "שלח ליציע". `song` appears only when the caller names a mood (or
 * asks with `mood` on a result) and the registry holds a song for that mood and surface —
 * its title and attribution, never a verse.
 */
export function voice(request: VoiceRequest): VoiceOut {
  const { gate, moment, seed, vars } = request
  const ctaShare = t(SHARE_KEY)
  const g = VOICES[gate]
  let chosen: Omit<VoiceOut, 'ctaShare'>
  if (moment === 'intro') {
    const line = pick(g.intro, seed, `g${gate}:intro`)
    chosen = line ? resolveLine(line, vars) : { title: '' }
  } else if (moment === 'result') {
    const tier = request.result ?? 'done'
    const line = pick(resultPool(gate, tier), seed, `g${gate}:result:${tier}`)
    chosen = line ? resolveLine(line, vars) : { title: '' }
  } else {
    const m = microFeedback(gate, moment, seed, 0, vars)
    chosen = m ? { title: m.line, ...(m.sub ? { body: m.sub } : {}) } : { title: '' }
  }
  const out: VoiceOut = { ...chosen, ctaShare }
  if (request.mood) {
    const song = songFor({ mood: request.mood, surface: moment === 'result' ? 'result' : 'home', seed })
    if (song) out.song = { title: song.title, sourceUrl: song.sourceUrl }
  }
  return out
}

/**
 * The micro-feedback between questions. `index` is the question's place in the run, so
 * the twelve answers of one run walk the pool rather than repeat one line — and the
 * same run always walks it the same way.
 */
export function microFeedback(
  gate: GateNo,
  kind: 'correct' | 'wrong',
  seed: number | string | undefined,
  index: number,
  vars?: Record<string, string>,
): { line: string; sub?: string } | null {
  const pool: readonly MicroLine[] = VOICES[gate][kind]
  if (pool.length === 0) return null
  const start = hashSeed(`${seed ?? 0}|g${gate}:${kind}`) % pool.length
  const m = pool[(start + Math.max(0, Math.trunc(index))) % pool.length] as MicroLine
  return m.sub ? { line: t(m.line, vars), sub: t(m.sub, vars) } : { line: t(m.line, vars) }
}

/** A named single line of a gate ("מי פתח בשער?"), or null when the gate has none by that name. */
export function voiceAction(gate: GateNo, name: string, vars?: Record<string, string>): string | null {
  const key = VOICES[gate].actions[name]
  return key ? t(key, vars) : null
}

/** §29 — the gate's WhatsApp line, short and human. */
export function whatsappLine(gate: GateNo, vars?: Record<string, string>): string {
  return t(VOICES[gate].whatsapp, vars)
}

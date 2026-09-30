import type { MessageKey } from '@/lib/i18n'

/**
 * RED VOICE — the types (master plan §2–§4, 28.9.2026).
 *
 * The voice is a system, not copy scattered through components: a gate asks
 * `voice({ gate, moment, result, seed })` and gets its lines back. Every line is a
 * MESSAGE KEY here (rule 10 — the words live in `messages/he.voice.json`) and a resolved
 * string only on the way out of `select.ts`. Client-safe: no data, no server imports.
 */

/** Bloomfield's gate numbers as the wall prints them (`lib/gates.ts`, rule 24). */
export type GateNo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13

export const GATE_NUMBERS: readonly GateNo[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

/**
 * Where in a run a line is spoken. `intro` opens a gate, `result` closes a run,
 * `correct`/`wrong` are the micro-feedback between. Named single lines ("מי פתח בשער?")
 * are `actions`, read with `voiceAction`.
 */
export type Moment = 'intro' | 'result' | 'correct' | 'wrong'

/**
 * How a run went, in the terrace's words rather than a percentage. `done` is the tier of
 * a creation gate (XI, the wardrobe, the ballot, the wall) — nothing there is graded.
 */
export type ResultTier = 'perfect' | 'near' | 'high' | 'mid' | 'low' | 'done'

export const RESULT_TIERS: readonly ResultTier[] = ['perfect', 'near', 'high', 'mid', 'low', 'done']

/** §3.1 — the moods a song or a line can carry. */
export type Mood =
  | 'love'
  | 'belonging'
  | 'nostalgia'
  | 'goal'
  | 'entrance'
  | 'pain'
  | 'away'
  | 'hope'
  | 'memory'
  | 'identity'

/** One authored line: at least a title, keyed. */
export type VoiceLine = {
  eyebrow?: MessageKey
  title: MessageKey
  body?: MessageKey
  ctaPrimary?: MessageKey
}

/** One micro-feedback beat: a line, and optionally the smaller line under it. */
export type MicroLine = { line: MessageKey; sub?: MessageKey }

/** Everything a gate can say. Pools are chosen from by seed, never at random. */
export type GateVoice = {
  intro: readonly VoiceLine[]
  result: Partial<Record<ResultTier, readonly VoiceLine[]>>
  correct: readonly MicroLine[]
  wrong: readonly MicroLine[]
  /** named single lines — prompts, labels, the gate's own CTAs */
  actions: Readonly<Record<string, MessageKey>>
  /** §29: the short, human WhatsApp line for this gate's share */
  whatsapp: MessageKey
}

export type VoiceRequest = {
  gate: GateNo
  moment: Moment
  mood?: Mood
  result?: ResultTier
  /** '1980s', '1990s' … reserved for era-aware lines; no gate authors one yet */
  era?: string
  /** the run's seed — same run, same line (select.ts) */
  seed?: number | string
  /** placeholders the chosen line may carry: {n}, {total}, {x}, {name} */
  vars?: Record<string, string>
}

/** What a screen draws. Strings, already through t(). */
export type VoiceOut = {
  eyebrow?: string
  title: string
  body?: string
  ctaPrimary?: string
  /** always "שלח ליציע" (§2.1) — the one share label */
  ctaShare: string
  /** a song the moment can name — title and attribution only, never a verse (rule 12) */
  song?: { title: string; sourceUrl: string }
}

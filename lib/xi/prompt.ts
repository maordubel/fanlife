import { positionOf } from '@/lib/rotation/deck'
import { hashSeed } from '@/lib/voice/hash'

import type { ChallengeId } from './challenge'

/**
 * המאמן אומר — the Manager Prompt of gate 1 (ONE RED WORLD §10, "replay / novelty").
 *
 * Not a random XI: a new QUESTION to the same eleven. Optional — the sheet is complete
 * without one — and every prompt that narrows the pool is a rule `lib/xi/challenge.ts`
 * ENFORCES from sourced rows, never a label on the poster:
 *
 *   · `until1990`  — the chosen spell began before 1990/91 (the squad table's years)
 *   · `noForeign`  — the club's own foreign-slot record says israeli (`challenge: 'israeli'`);
 *                    a man with no record is out, and counted on screen, as the picker does
 *   · `the2000s`   — the chosen spell touches 2000/01–2009/10
 *   · `cups`       — the chosen spell holds a season the club lifted a CUP with him in the
 *                    squad: Player Master `spells[].titles`, cup competitions only
 *   · `fresh5`     — five this device picked before are out: the first five of the saved
 *                    sheet, in pitch order, frozen the moment the prompt is accepted
 *   · `tomorrow`   — "XI אם יש משחק אחד מחר". It narrows nothing, so it enforces nothing: it
 *                    changes the question, not the pool. There is no data to fake here.
 *
 * A prompt whose rule cannot be computed on this device is SKIPPED, not faked: `fresh5` needs
 * five earlier picks, `cups` needs the cup seasons the server sends. The walk moves to the next
 * prompt in the deck.
 *
 * **Rotation (rule 31, §49):** a deck of the six, shuffled per cycle by the seed, walked by the
 * cursor — so no prompt repeats before all six were offered, the same seed+cursor is the same
 * prompt, and the link `/xi?prompt=<seed>&r=<cursor>` hands over the PROMPT, never the picks.
 */
export type PromptId = 'until1990' | 'noForeign' | 'the2000s' | 'cups' | 'tomorrow' | 'fresh5'

export const PROMPTS: readonly PromptId[] = ['until1990', 'noForeign', 'the2000s', 'cups', 'tomorrow', 'fresh5']

/** The rule each prompt sets on the sheet. `tomorrow` sets none (`free`). */
export const PROMPT_RULE: Readonly<Record<PromptId, ChallengeId>> = {
  until1990: 'pre1990',
  noForeign: 'israeli',
  the2000s: 'the2000s',
  cups: 'cups',
  tomorrow: 'free',
  fresh5: 'fresh',
}

/**
 * The seed gate 1's opening is spoken with. The plan names the line — "תן את ההפועל שלך." (§10) —
 * and the voice's pool also holds a second line in the same voice; the gate opens on the owner's.
 * `tests/one-red-world-gates-a.test.ts` fails if this seed stops answering with his line.
 */
export const XI_OPENING = 'xi'

/** How many earlier picks `fresh5` forbids. */
export const FRESH_COUNT = 5

/** A deterministic shuffle of the six for one cycle of the deck. */
function deckFor(seed: number): PromptId[] {
  let state = hashSeed(`xi-prompt|${seed}`) || 1
  const next = () => {
    // xorshift32 — small, stable, client-safe
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 0x100000000
  }
  const out = [...PROMPTS]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    const a = out[i] as PromptId
    out[i] = out[j] as PromptId
    out[j] = a
  }
  return out
}

/** The prompt at one place in the deck. */
export function promptAt(seed: number, cursor: number): PromptId {
  const at = positionOf(seed, cursor, PROMPTS.length, 1)
  return deckFor(at.seed)[at.slot] as PromptId
}

/**
 * The first prompt this device CAN be handed, walking forward from `cursor`. Answers the
 * cursor it landed on, so "another" steps on from there. Null only when none of the six can
 * be computed, which cannot happen while `tomorrow` exists — it is kept honest anyway.
 */
export function dealPrompt(
  seed: number,
  cursor: number,
  can: (id: PromptId) => boolean,
): { id: PromptId; cursor: number } | null {
  for (let step = 0; step < PROMPTS.length; step++) {
    const id = promptAt(seed, cursor + step)
    if (can(id)) return { id, cursor: cursor + step }
  }
  return null
}

/** "חמישה שכבר בחרת" — the first five of a saved sheet, in pitch order, ids only. */
export function forbiddenFive(picks: Readonly<Record<string, string>>, slotOrder: readonly string[]): string[] {
  const out: string[] = []
  for (const slot of slotOrder) {
    const id = picks[slot]
    if (id && !out.includes(id)) out.push(id)
    if (out.length === FRESH_COUNT) break
  }
  return out
}

/** The link that hands the prompt over — the prompt, never the picks. */
export function promptQuery(seed: number, cursor: number): string {
  return cursor > 0 ? `prompt=${seed}&r=${cursor}` : `prompt=${seed}`
}

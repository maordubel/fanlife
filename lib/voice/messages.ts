import type { MessageKey } from '@/lib/i18n'

import type { GateNo, GateVoice, MicroLine, ResultTier, VoiceLine } from './types'

/**
 * המילים של כל שער — the registry of every line `messages/he.voice.json` holds, by gate.
 *
 * The keys follow one grammar, so a pool is a count rather than a list somebody has to
 * keep in step with the JSON by hand:
 *
 *   voice.g<N>.intro.<i>.{title,body,cta}
 *   voice.g<N>.<tier>.<i>.{eyebrow,title,body}      tier ∈ perfect near high mid low done
 *   voice.g<N>.correct.<i>[.sub]   voice.g<N>.wrong.<i>[.sub]
 *   voice.g<N>.act.<name>          voice.g<N>.cta.<name>        voice.g<N>.whatsapp
 *
 * `tests/voice.test.ts` resolves every key this file can produce against the catalogue,
 * so a count that runs past the JSON fails the build instead of printing a key.
 *
 * Sources for the words: master plan §10–§22 (the owner's lines, verbatim where he wrote
 * one), widened in the same voice where he gave a single line (§2.2).
 */

type Parts = { eyebrow?: boolean; body?: boolean; cta?: boolean }

const k = (key: string) => key as MessageKey

function lines(gate: GateNo, section: string, count: number, parts: Parts = { body: true }): VoiceLine[] {
  return Array.from({ length: count }, (_, i) => {
    const base = `voice.g${gate}.${section}.${i}`
    const out: VoiceLine = { title: k(`${base}.title`) }
    if (parts.eyebrow) out.eyebrow = k(`${base}.eyebrow`)
    if (parts.body) out.body = k(`${base}.body`)
    if (parts.cta) out.ctaPrimary = k(`${base}.cta`)
    return out
  })
}

function micro(gate: GateNo, kind: 'correct' | 'wrong', count: number, sub = false): MicroLine[] {
  return Array.from({ length: count }, (_, i) => {
    const line = k(`voice.g${gate}.${kind}.${i}`)
    return sub ? { line, sub: k(`voice.g${gate}.${kind}.${i}.sub`) } : { line }
  })
}

function acts(gate: GateNo, names: readonly string[], prefix = 'act'): Record<string, MessageKey> {
  return Object.fromEntries(names.map((name) => [name, k(`voice.g${gate}.${prefix}.${name}`)]))
}

type Tiers = Partial<Record<ResultTier, readonly VoiceLine[]>>

export const VOICES: Readonly<Record<GateNo, GateVoice>> = {
  1: {
    intro: lines(1, 'intro', 2, { body: true, cta: true }),
    result: { done: lines(1, 'done', 2, { eyebrow: true, body: true }) } satisfies Tiers,
    correct: [],
    wrong: [],
    actions: acts(1, [
      'slot',
      'picked',
      'version',
      'captain',
      'twelfth',
      'lastCut',
      // the Manager Prompt (§10, lib/xi/prompt.ts) — one line per prompt, and its controls
      'prompt.title',
      'prompt.link',
      'prompt.accept',
      'prompt.other',
      'prompt.drop',
      'prompt.until1990',
      'prompt.noForeign',
      'prompt.the2000s',
      'prompt.cups',
      'prompt.tomorrow',
      'prompt.fresh5',
    ]),
    whatsapp: k('voice.g1.whatsapp'),
  },
  2: {
    intro: lines(2, 'intro', 2),
    result: {
      perfect: lines(2, 'perfect', 1, { eyebrow: true, body: true }),
      high: lines(2, 'high', 2, { eyebrow: true, body: true }),
      mid: lines(2, 'mid', 1, { eyebrow: true, body: true }),
      low: lines(2, 'low', 2, { eyebrow: true, body: true }),
    },
    correct: micro(2, 'correct', 4, true),
    wrong: micro(2, 'wrong', 4, true),
    actions: acts(2, ['again', 'other', 'revenge'], 'cta'),
    whatsapp: k('voice.g2.whatsapp'),
  },
  3: {
    intro: lines(3, 'intro', 1),
    result: {
      perfect: lines(3, 'perfect', 1),
      high: lines(3, 'high', 1),
      mid: lines(3, 'mid', 1),
      low: lines(3, 'low', 1),
    },
    correct: micro(3, 'correct', 2),
    wrong: micro(3, 'wrong', 2),
    actions: acts(3, ['gk', 'defence', 'midfield', 'attack', 'lock', 'hint', 'missed', 'wrongIn', 'noneMissed', 'noneWrong']),
    whatsapp: k('voice.g3.whatsapp'),
  },
  4: {
    intro: lines(4, 'intro', 1),
    result: {
      perfect: lines(4, 'perfect', 1),
      near: lines(4, 'near', 1),
      high: lines(4, 'high', 1),
      mid: lines(4, 'mid', 1),
      low: lines(4, 'low', 1),
    },
    correct: micro(4, 'correct', 2),
    wrong: micro(4, 'wrong', 2),
    actions: {
      ...acts(4, ['body', 'construction', 'crest', 'maker', 'sponsor', 'review']),
      // Full (5) or Quick (3) — §13
      ...acts(4, ['mode.full', 'mode.full.body', 'mode.quick', 'mode.quick.body']),
      nearSponsor: k('voice.g4.near.sponsor.title'),
    },
    whatsapp: k('voice.g4.whatsapp'),
  },
  5: {
    intro: lines(5, 'intro', 1),
    result: { done: lines(5, 'done', 2) },
    correct: [],
    wrong: [],
    actions: acts(5, ['locked', 'oneLeft', 'objective.many', 'objective.done', 'prov.gate4', 'prov.life', 'prov.photo']),
    whatsapp: k('voice.g5.whatsapp'),
  },
  6: {
    intro: lines(6, 'intro', 1),
    result: {
      perfect: lines(6, 'perfect', 1),
      high: lines(6, 'high', 1),
      mid: lines(6, 'mid', 1),
      low: lines(6, 'low', 1),
    },
    correct: micro(6, 'correct', 2),
    wrong: micro(6, 'wrong', 2),
    actions: acts(6, ['flash', 'souvenir']),
    whatsapp: k('voice.g6.whatsapp'),
  },
  7: {
    intro: lines(7, 'intro', 1),
    result: { done: lines(7, 'done', 2) },
    correct: [],
    wrong: [],
    actions: acts(7, ['voted', 'seeTerrace', 'why.saw', 'why.dad', 'why.him', 'why.moment', 'debateDone']),
    whatsapp: k('voice.g7.whatsapp'),
  },
  8: {
    intro: lines(8, 'intro', 2),
    result: {
      perfect: lines(8, 'perfect', 2),
      near: lines(8, 'near', 2),
      high: lines(8, 'high', 2),
      mid: lines(8, 'mid', 1),
      low: lines(8, 'low', 1),
    },
    correct: micro(8, 'correct', 3),
    wrong: micro(8, 'wrong', 3),
    actions: {},
    whatsapp: k('voice.g8.whatsapp'),
  },
  9: {
    intro: lines(9, 'intro', 2),
    result: { done: lines(9, 'done', 2), high: lines(9, 'high', 2), low: lines(9, 'low', 2) },
    correct: [],
    wrong: [],
    actions: acts(9, ['opponent', 'kickoff', 'sameCards']),
    whatsapp: k('voice.g9.whatsapp'),
  },
  10: {
    intro: lines(10, 'intro', 1),
    result: {
      perfect: lines(10, 'perfect', 1, { eyebrow: true, body: true }),
      high: lines(10, 'high', 1, { eyebrow: true, body: true }),
      mid: lines(10, 'mid', 1, { eyebrow: true, body: true }),
      low: lines(10, 'low', 2),
    },
    correct: micro(10, 'correct', 2),
    wrong: micro(10, 'wrong', 3),
    actions: acts(10, ['daily', 'noSpoil']),
    whatsapp: k('voice.g10.whatsapp'),
  },
  11: {
    intro: lines(11, 'intro', 1),
    result: { done: lines(11, 'done', 2) },
    correct: micro(11, 'correct', 3),
    wrong: micro(11, 'wrong', 3),
    actions: acts(11, ['opinion']),
    whatsapp: k('voice.g11.whatsapp'),
  },
  12: {
    intro: lines(12, 'intro', 2),
    result: { done: lines(12, 'done', 1) },
    correct: [],
    wrong: [],
    actions: { ...acts(12, ['today', 'dig', 'rabbit', 'trail', 'mine', 'empty']), open: k('voice.g12.cta.open') },
    whatsapp: k('voice.g12.whatsapp'),
  },
  13: {
    intro: lines(13, 'intro', 1),
    result: {
      perfect: lines(13, 'perfect', 2),
      high: lines(13, 'high', 1),
      mid: lines(13, 'mid', 1),
      low: lines(13, 'low', 1),
    },
    correct: micro(13, 'correct', 3),
    wrong: micro(13, 'wrong', 3),
    actions: acts(13, ['orderIntro', 'where', 'ordered', 'orderedBody']),
    whatsapp: k('voice.g13.whatsapp'),
  },
}

/** The shared share label (§2.1: "שלח ליציע", never "Share Result"). */
export const SHARE_KEY: MessageKey = k('voice.share')

/** Every key the registry can hand out — the test resolves each one. */
export function allVoiceKeys(): MessageKey[] {
  const out: MessageKey[] = [SHARE_KEY]
  for (const voice of Object.values(VOICES)) {
    const pushLine = (line: VoiceLine) => {
      out.push(line.title)
      if (line.eyebrow) out.push(line.eyebrow)
      if (line.body) out.push(line.body)
      if (line.ctaPrimary) out.push(line.ctaPrimary)
    }
    voice.intro.forEach(pushLine)
    for (const pool of Object.values(voice.result)) pool?.forEach(pushLine)
    for (const m of [...voice.correct, ...voice.wrong]) {
      out.push(m.line)
      if (m.sub) out.push(m.sub)
    }
    out.push(...Object.values(voice.actions), voice.whatsapp)
  }
  return out
}

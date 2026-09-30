import { t } from '@/lib/i18n'
import type { KitSpec } from '@/lib/kit/spec'
import { whatsappLine } from '@/lib/voice/select'

import type { StoryCard } from './story'

/**
 * THE ARTEFACTS — one card builder per gate (ONE RED WORLD §28). Client-safe.
 *
 * A gate hands over DATA — its marks, its slots, its route — and gets back a whole
 * `StoryCard` whose every string is already worded (rule 10): the kicker, the title (the
 * artefact itself), the personal statement and the dare from the gate's own voice line
 * (§29), and the line that says what the link hands over. `lib/share/story.ts` draws it;
 * `app/qa/story` measures it with the worst strings the archive holds.
 *
 * What a builder is never given, it cannot print: the programme takes ROLES and ticks
 * (never the eleven's names), the clue card takes counts (never the man), the freeze
 * frame takes a route (never the scorer). That is §27.6, by construction.
 */

const SAME_ROUND = () => t('share.sameRound')

/** Gate 2 — the score slip. */
export function slipCard(args: { topic: string; marks: readonly boolean[] }): StoryCard {
  const right = args.marks.filter(Boolean).length
  const figure = `${right}/${args.marks.length}`
  return {
    template: 'slip',
    kicker: 'GATE 2 · SCORE SLIP',
    label: t('artefact.slip.title'),
    eyebrow: args.topic,
    hero: t('artefact.slip.title'),
    stats: [],
    cta: whatsappLine(2, { n: String(right) }),
    challenge: SAME_ROUND(),
    artefact: { kind: 'slip', topic: args.topic, figure, figureLabel: t('artefact.slip.remembered'), marks: [...args.marks] },
  }
}

/** Gate 3 — the match programme. Roles and ticks only: the eleven are the answer. */
export function programmeCard(args: { match: string; date: string; slots: ReadonlyArray<{ role: string; found: boolean }> }): StoryCard {
  const found = args.slots.filter((slot) => slot.found).length
  return {
    template: 'programme',
    kicker: 'GATE 3 · MATCH PROGRAMME',
    label: t('artefact.programme.title'),
    eyebrow: args.match,
    hero: t('artefact.programme.title'),
    stats: [],
    cta: whatsappLine(3, { n: String(found) }),
    challenge: SAME_ROUND(),
    artefact: {
      kind: 'programme',
      match: args.match,
      date: args.date,
      found: t('artefact.programme.found', { n: String(found), total: String(args.slots.length) }),
      slots: args.slots.map((slot) => ({ role: slot.role, found: slot.found })),
    },
  }
}

/** Gate 4 — the collector card: the shirt as the player built it. */
export function collectorCard(args: { season: string; serial: number; kit: KitSpec; right: number; total: number }): StoryCard {
  return {
    template: 'collector',
    kicker: 'GATE 4 · COLLECTOR CARD',
    label: t('artefact.collector.title'),
    eyebrow: args.season,
    hero: t('artefact.collector.title'),
    stats: [],
    cta: whatsappLine(4),
    challenge: SAME_ROUND(),
    artefact: {
      kind: 'collector',
      season: args.season,
      serial: `#${String(args.serial).padStart(2, '0')}`,
      kit: args.kit,
      figure: `${args.right}/${args.total}`,
      figureLabel: t('artefact.collector.parts'),
    },
  }
}

/** Gate 6 — the contact sheet: every frame of the wall. */
export function contactCard(args: { moves: number; frames: ReadonlyArray<{ label: string; hit: boolean }> }): StoryCard {
  return {
    template: 'contact',
    kicker: 'GATE 6 · CONTACT SHEET',
    label: t('artefact.contact.title'),
    eyebrow: t('artefact.contact.title'),
    hero: t('artefact.contact.title'),
    stats: [],
    cta: whatsappLine(6),
    challenge: SAME_ROUND(),
    artefact: { kind: 'contact', figure: String(args.moves), figureLabel: t('artefact.contact.moves'), frames: args.frames.map((f) => ({ ...f })) },
  }
}

/** Gate 7 — the debate sticker: "אני לקחתי את X. מה אתה אומר?" */
export function debateCard(args: { question: string; pick: string }): StoryCard {
  return {
    template: 'debate',
    kicker: 'GATE 7 · THE TERRACE',
    label: args.question,
    eyebrow: args.question,
    hero: args.question,
    stats: [],
    cta: whatsappLine(7, { x: args.pick }),
    challenge: t('artefact.debate.challenge'),
    artefact: { kind: 'debate', took: t('artefact.debate.took'), pick: args.pick, ask: t('artefact.debate.ask') },
  }
}

/** Gate 8 — the broadcast freeze frame. The match line and the route, never the scorer. */
export function freezeCard(args: { match: string; route: ReadonlyArray<{ x: number; y: number }>; accuracy: number; clock: string }): StoryCard {
  return {
    template: 'freeze',
    kicker: 'GATE 8 · REPLAY',
    label: args.match,
    eyebrow: args.match,
    hero: args.match,
    stats: [],
    cta: whatsappLine(8),
    challenge: SAME_ROUND(),
    artefact: {
      kind: 'freeze',
      bug: 'REPLAY',
      clock: args.clock,
      route: args.route.map((p) => ({ x: p.x, y: p.y })),
      figure: `${Math.round(args.accuracy)}%`,
      figureLabel: t('artefact.freeze.accuracy'),
    },
  }
}

/** Gate 9 — the five-player poster. */
export function posterCard(args: { rows: ReadonlyArray<{ role: string; name: string }> }): StoryCard {
  return {
    template: 'poster',
    kicker: 'GATE 9 · ROYAL RUMBLE',
    label: t('artefact.poster.title'),
    eyebrow: t('artefact.poster.title'),
    hero: t('artefact.poster.title'),
    stats: [],
    cta: whatsappLine(9),
    challenge: SAME_ROUND(),
    artefact: { kind: 'poster', rows: args.rows.map((row) => ({ ...row })) },
  }
}

/** Gate 10 — the clue card: how many clues, never who. */
export function clueCard(args: { hints: number; total: number; solved: boolean }): StoryCard {
  return {
    template: 'clue',
    kicker: 'GATE 10 · BLIND COW',
    label: t('artefact.clue.title'),
    eyebrow: t('artefact.clue.title'),
    hero: t('artefact.clue.title'),
    stats: [],
    cta: args.solved ? whatsappLine(10, { n: String(args.hints) }) : t('challenge.invite.bcAway', { n: String(args.hints) }),
    challenge: t('voice.g10.act.noSpoil'),
    artefact: {
      kind: 'clue',
      used: args.hints,
      total: args.total,
      figure: String(args.hints),
      figureLabel: t(args.solved ? 'artefact.clue.caught' : 'artefact.clue.away'),
    },
  }
}

/** Gate 11 — the black poster. */
export function blackCard(args: { rows: ReadonlyArray<{ name: string; out: boolean }> }): StoryCard {
  return {
    template: 'black',
    kicker: 'GATE 11 · THE BLACK WALL',
    label: t('artefact.black.title'),
    eyebrow: t('artefact.black.title'),
    hero: t('artefact.black.title'),
    stats: [],
    cta: whatsappLine(11),
    challenge: SAME_ROUND(),
    artefact: { kind: 'black', rows: args.rows.map((row) => ({ ...row })) },
  }
}

/** Gate 12 — the press clipping. */
export function clippingCard(args: { date: string; headline: string; caption: string; label: string }): StoryCard {
  return {
    template: 'clipping',
    kicker: 'GATE 12 · THE ARCHIVE',
    label: args.headline,
    eyebrow: args.date,
    hero: t('artefact.clipping.title'),
    stats: [],
    cta: whatsappLine(12),
    challenge: t('voice.g12.cta.open'),
    artefact: { kind: 'clipping', masthead: t('artefact.clipping.masthead'), date: args.date, headline: args.headline, caption: args.caption, label: args.label },
  }
}

/** Gate 13 — the paper strip. The thread counts steps; the order counts places. */
export function stripCard(args: { variant: 'thread' | 'order'; rows: ReadonlyArray<{ text: string; ok: boolean }>; steps?: number }): StoryCard {
  const right = args.rows.filter((row) => row.ok).length
  const thread = args.variant === 'thread'
  const steps = args.steps ?? args.rows.length
  return {
    template: 'strip',
    kicker: thread ? 'GATE 13 · RED THREAD' : 'GATE 13 · TIMELINE',
    label: t('artefact.strip.title'),
    eyebrow: t('artefact.strip.title'),
    hero: t('artefact.strip.title'),
    stats: [],
    cta: thread ? whatsappLine(13, { n: String(steps) }) : t('challenge.invite.order', { n: String(right), total: String(args.rows.length) }),
    challenge: SAME_ROUND(),
    artefact: {
      kind: 'strip',
      figure: thread ? String(steps) : `${right}/${args.rows.length}`,
      figureLabel: t(thread ? 'artefact.strip.steps' : 'artefact.strip.placed'),
      rows: args.rows.map((row) => ({ ...row })),
    },
  }
}

/** THE WORKER LIFE — the ticket. Fiction stays fiction: the strings come from the chapter. */
export function ticketCard(args: { year: string; place: string; line: string; serial: string }): StoryCard {
  return {
    template: 'ticket',
    kicker: 'THE WORKER LIFE · TICKET',
    label: t('artefact.ticket.title'),
    eyebrow: args.year,
    hero: t('artefact.ticket.title'),
    stats: [],
    cta: t('artefact.ticket.cta', { year: args.year }),
    challenge: t('artefact.ticket.challenge'),
    artefact: { kind: 'ticket', title: t('artefact.ticket.title'), year: args.year, place: args.place, line: args.line, stub: t('artefact.ticket.stub'), serial: args.serial },
  }
}

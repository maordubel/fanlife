import 'server-only'

import vikipoel from '@/content/manual/player-facts-vikipoel.json'
import { allPlayers, type PlayerMasterRecord } from '@/lib/archive/player-master'

import { shuffle } from '../../archive'
import { fact, hash, seeded, type Draft, type Template } from '../draft'
import type { SourceRef } from '../types'
import { CLUB } from '@/lib/club/context'

/**
 * השחקנים — from the Player Master, and only what it can stand behind.
 *
 *  · **A position only where there is ONE** (rule 74). `תפקיד` is a list; 38 players carry
 *    two and one carries three, and asking which of them a man "played" has two right
 *    answers. Those are left out of every position question.
 *  · **Never goal totals.** The master holds documented scorer rows, not careers, and
 *    says so on every record — a question built on it would print a floor as a total.
 *  · **Known players only.** A decade or an order question about a man who spent one
 *    season on the bench is a lottery, not a question; the set is the players with a
 *    recorded span of four seasons or more, three or more shirt numbers, or fifteen
 *    documented goals (the count decides who is ASKED about, it is never asked).
 */

const SOURCE: SourceRef = {
  title: (vikipoel as { source: { title: string } }).source.title,
  url: (vikipoel as { source: { url?: string } }).source.url ?? null,
  confidence: 2,
}

export const POSITION_HE: Record<string, string> = {
  GK: 'שוער',
  DF: 'שחקן הגנה',
  MF: 'קשר',
  FW: 'חלוץ',
}

type Known = {
  record: PlayerMasterRecord
  name: string
  from: number
  to: number
  position: string | null
}

function spanOf(record: PlayerMasterRecord): { from: number; to: number } | null {
  const years = (record as { years?: { from?: number; to?: number } }).years
  if (!years || typeof years.from !== 'number') return null
  return { from: years.from, to: typeof years.to === 'number' ? years.to : years.from }
}

export function knownPlayers(): Known[] {
  const out: Known[] = []
  for (const record of allPlayers()) {
    const span = spanOf(record)
    if (!span) continue
    const goals = (record as { archiveGoals?: { documentedGoals?: number } }).archiveGoals?.documentedGoals ?? 0
    const shirts = (record.shirtNumbers ?? []).length
    if (span.to - span.from < 4 && goals < 15 && shirts < 3) continue
    // Player Master v2: `positions` is `{codes, from}` — the codes are the list rule 74 asks for
    if (record.kind !== 'player') continue
    const positions = (record.positions?.codes ?? []).filter((code) => POSITION_HE[code])
    out.push({
      record,
      name: record.displayName,
      from: span.from,
      to: span.to,
      position: positions.length === 1 ? (POSITION_HE[positions[0] as string] as string) : null,
    })
  }
  return out.sort((a, b) => a.from - b.from || a.name.localeCompare(b.name, 'he'))
}

function decadeLabel(year: number): string {
  const decade = Math.floor(year / 10) * 10
  return decade >= 2000 ? `שנות ה־${decade}` : `שנות ה־${String(decade).slice(2)}`
}

export function positionFact(player: Known) {
  return fact({
    kind: 'player-position',
    key: player.record.id,
    subject: player.name,
    subjectId: player.record.id,
    value: player.position ?? '',
    valueType: 'text',
    when: String(player.from),
    topics: ['players'],
    entityIds: [player.record.id],
    source: SOURCE,
  })
}

export function spanFact(player: Known) {
  return fact({
    kind: 'player-span',
    key: player.record.id,
    subject: player.name,
    subjectId: player.record.id,
    value: `${player.from}–${player.to}`,
    valueType: 'text',
    when: String(player.from),
    topics: ['players'],
    entityIds: [player.record.id],
    source: SOURCE,
  })
}

const LABELS = Object.values(POSITION_HE)

export const PLAYER_TEMPLATES: Template[] = [
  {
    slug: 'player-position',
    base: 3,
    build: () =>
      knownPlayers()
        .filter((player) => player.position !== null)
        .map(
          (player): Draft => ({
            key: `player-position:${player.record.id}`,
            template: 'player-position',
            type: 'mcq',
            prompt: `באיזה תפקיד שיחק ${player.name} ב${CLUB.names.he}?`,
            answer: player.position as string,
            pool: LABELS,
            source: SOURCE,
            explanation: `${player.name} · ${player.position} · ${player.from}–${player.to}`,
            when: player.from,
            topics: ['players'],
            facts: [positionFact(player)],
          }),
        ),
  },
  {
    slug: 'player-decade',
    base: 4,
    build: () => {
      const decades = [...new Set(knownPlayers().map((player) => decadeLabel(player.from)))]
      return knownPlayers().map(
        (player): Draft => ({
          key: `player-decade:${player.record.id}`,
          template: 'player-decade',
          type: 'mcq',
          prompt: `באיזה עשור התחיל ${player.name} לשחק ב${CLUB.names.he}?`,
          answer: decadeLabel(player.from),
          pool: decades,
          source: SOURCE,
          explanation: `${player.name} · ${player.from}–${player.to}`,
          // the answer IS a decade, so this never sits behind an era chip
          when: null,
          topics: ['players'],
          hint: player.position ? { kind: 'context', he: player.position } : { kind: 'strike' },
          facts: [spanFact(player)],
        }),
      )
    },
  },
  {
    slug: 'player-position-tf',
    base: 3,
    build: () =>
      knownPlayers()
        .filter((player) => player.position !== null)
        .map((player): Draft => {
          const truth = parseInt(hash(`tf:${player.record.id}`, 2), 16) % 2 === 0
          const random = seeded(`player-position-tf:${player.record.id}`)
          const claimed = truth
            ? (player.position as string)
            : (shuffle(LABELS.filter((label) => label !== player.position), random)[0] as string)
          return {
            key: `player-position-tf:${player.record.id}`,
            template: 'player-position-tf',
            type: 'tf',
            prompt: `${player.name} שיחק ב${CLUB.names.he} בתפקיד ${claimed}.`,
            answer: truth ? 'true' : 'false',
            source: SOURCE,
            explanation: `${player.name} · ${player.position} · ${player.from}–${player.to}`,
            when: player.from,
            topics: ['players'],
            hint: { kind: 'decade' },
            facts: [positionFact(player)],
          }
        }),
  },
  {
    /** סדרו לפי העונה הראשונה — three players at least two years apart */
    slug: 'player-order',
    base: 4,
    build: () => {
      const players = knownPlayers()
      const out: Draft[] = []
      const seen = new Set<string>()
      players.forEach((anchor, index) => {
        const random = seeded(`player-order:${anchor.record.id}`)
        const others = shuffle(
          players.filter((other, at) => at !== index && Math.abs(other.from - anchor.from) >= 2),
          random,
        )
        const picked = [anchor]
        for (const other of others) {
          if (picked.every((member) => Math.abs(member.from - other.from) >= 2)) picked.push(other)
          if (picked.length === 3) break
        }
        if (picked.length < 3) return
        const ordered = [...picked].sort((a, b) => a.from - b.from)
        const key = ordered.map((member) => member.record.id).join('|')
        if (seen.has(key)) return
        seen.add(key)
        out.push({
          key: `player-order:${key}`,
          template: 'player-order',
          type: 'order',
          prompt: 'סדרו לפי השנה שבה התחילו לשחק בהפועל תל אביב — מהמוקדם למאוחר.',
          answer: ordered.map((member) => member.name),
          source: SOURCE,
          explanation: ordered.map((member) => `${member.name} ${member.from}`).join(' · '),
          topics: ['players'],
          facts: ordered.map(spanFact),
        })
      })
      return out
    },
  },
  {
    /** התאימו שחקן לתפקיד — three single-position players, three different positions */
    slug: 'player-match',
    base: 3,
    build: () => {
      const players = knownPlayers().filter((player) => player.position !== null)
      const out: Draft[] = []
      const seen = new Set<string>()
      players.forEach((anchor, index) => {
        const random = seeded(`player-match:${anchor.record.id}`)
        const picked = [anchor]
        for (const other of shuffle(players.filter((_, at) => at !== index), random)) {
          if (picked.every((member) => member.position !== other.position)) picked.push(other)
          if (picked.length === 3) break
        }
        if (picked.length < 3) return
        const key = picked.map((member) => member.record.id).sort().join('|')
        if (seen.has(key)) return
        seen.add(key)
        out.push({
          key: `player-match:${key}`,
          template: 'player-match',
          type: 'match',
          prompt: 'התאימו כל שחקן לתפקיד שלו בהפועל תל אביב.',
          left: picked.map((member) => member.name),
          answer: picked.map((member) => member.position as string),
          source: SOURCE,
          explanation: picked.map((member) => `${member.name} — ${member.position}`).join(' · '),
          topics: ['players'],
          facts: picked.map(positionFact),
        })
      })
      return out
    },
  },
]

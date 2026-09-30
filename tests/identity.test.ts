import { describe, expect, it } from 'vitest'

import { dealQueue } from '@/lib/game/hate'
import { dealRun } from '@/lib/game/goal'
import { buildBoard } from '@/lib/game/memory'
import { dealKitChallenge } from '@/lib/game/kitChallenge'
import { dealChallenge } from '@/lib/game/lineup'
import { ROUND_LENGTH, deal } from '@/lib/game/trivia'
import { TOPICS } from '@/lib/game/topics'

/**
 * זהות — no two things a run deals may share an id.
 *
 * This file exists because of one bug and the honest conclusion drawn from it. The
 * timeline keyed a match card on `season:awayClub`, which looked unique and was not:
 * Hapoel appears as the away side four times in 2001/02 and the Salzburg tie has two
 * legs, so nine cards collapsed onto three ids. One consequence was cosmetic (two React
 * children with the same key); the other was that a run dealt a card SHORT and could
 * never be finished. It only showed on seeds where the shuffle drew both halves of a
 * collision — seed 95 of the first three hundred.
 *
 * The right response to that is not to fix the one key. Every mode in this app builds
 * ids by concatenating fields it assumes are unique together, and the assumption is
 * only ever checked by whether anything happened to look wrong. So it is checked here,
 * for all of them, across the seed space rather than at an example.
 */
const SEEDS = Array.from({ length: 120 }, (_, index) => index + 1)

function unique(ids: string[], where: string) {
  const seen = new Map<string, number>()
  for (const id of ids) seen.set(id, (seen.get(id) ?? 0) + 1)
  const dupes = [...seen.entries()].filter(([, count]) => count > 1)
  expect(dupes, `${where}: ${dupes.map(([id, n]) => `${id}×${n}`).join(', ')}`).toHaveLength(0)
}

describe('כל מה שמחולק — ids are unique', () => {
  it('משחק השנאה — one plate per man, and the order names men that exist', () => {
    for (const seed of SEEDS) {
      const { enemies, order } = dealQueue(seed)
      unique(enemies.map((enemy) => enemy.slug), `hate seed ${seed}`)
      unique(order, `hate order seed ${seed}`)
      const slugs = new Set(enemies.map((enemy) => enemy.slug))
      for (const slug of order) {
        expect(slugs.has(slug), `hate seed ${seed}: order names ${slug}, not dealt`).toBe(true)
      }
    }
  })

  it('שחזור שער — one challenge per goal in a run', () => {
    for (const seed of SEEDS) {
      const run = dealRun(seed)
      expect(run.length, `goal seed ${seed}`).toBeGreaterThan(0)
      unique(run.map((challenge) => challenge.goalId), `goal seed ${seed}`)
    }
  })

  it('משחק הזיכרון — every tile distinct, and every pair exactly two tiles', () => {
    for (const seed of SEEDS) {
      const tiles = buildBoard(seed)
      unique(tiles.map((tile) => tile.id), `memory seed ${seed}`)
      const perPair = new Map<string, number>()
      for (const tile of tiles) perPair.set(tile.pair, (perPair.get(tile.pair) ?? 0) + 1)
      for (const [pair, count] of perPair) {
        // A pair with one tile can never be matched and the board cannot be cleared.
        expect(count, `memory seed ${seed}: pair ${pair} has ${count} tiles`).toBe(2)
      }
    }
  })

  it('חידון המדים — the makers and sponsors offered are each distinct', () => {
    for (const seed of SEEDS) {
      const challenge = dealKitChallenge(seed)
      if (!challenge) continue
      // A repeated option is two identical buttons, one of which scores as wrong.
      unique(challenge.makers, `kit makers seed ${seed}`)
      unique(challenge.sponsors, `kit sponsors seed ${seed}`)
    }
  })

  it('חידון ההרכב — every slot and every name in the bank appears once', () => {
    for (const seed of SEEDS) {
      const challenge = dealChallenge(seed)
      if (!challenge) continue
      // The bank is the list of men to place. The same man twice means one copy can
      // never be right, and the two are indistinguishable on screen — by id AND by name.
      unique(challenge.bank.map((locker) => locker.id), `lineup bank ids seed ${seed}`)
      unique(challenge.bank.map((locker) => locker.nameHe), `lineup bank names seed ${seed}`)
    }
  })

  it('הטריוויה — a round never asks the same question twice', () => {
    // Two cards with one id would grade against each other's answer; two identical
    // questions in one round is the same defect a player can actually see.
    // `TOPICS` is the list of slugs itself — `Topic` is a string union, and the spec
    // objects live in `TOPIC_SPECS` keyed by it. This read `topic.id` back when the
    // topics were a list of records, which typechecked at the time and has been a
    // property access on a string ever since.
    for (const topic of TOPICS) {
      for (const seed of SEEDS.slice(0, 40)) {
        const round = []
        for (let index = 0; index < ROUND_LENGTH; index += 1) {
          const question = deal(seed, index, topic)
          if (question) round.push(question)
        }
        unique(round.map((question) => question.id), `trivia ${topic} seed ${seed}`)
        unique(round.map((question) => question.prompt), `trivia prompts ${topic} seed ${seed}`)
      }
    }
  })
})

import { describe, expect, it } from 'vitest'

import { boardAfter, dealTimelineRun, gradeInsert, timelinePoolSize } from '@/lib/game/timeline'
import { TIMELINE_LENGTH } from '@/lib/game/timeline-run'

/**
 * ציר הזמן — the invariants, over the whole seed space rather than a few examples.
 *
 * The existing timeline tests check four or five hand-picked seeds, which is how the
 * date-in-the-id leak survived: it was there on every seed, and it was only found by
 * looking at one. A run is cheap to simulate — deal it, play it perfectly, assert the
 * board is a truthful chronology at every step — so it is simulated three hundred times
 * and every claim the mode makes is checked on all of them.
 */
const SEEDS = Array.from({ length: 300 }, (_, index) => index + 1)

describe('ציר הזמן — every seed, not a sample', () => {
  it('draws on a pool far deeper than one run', () => {
    expect(timelinePoolSize()).toBeGreaterThan(60)
  })

  it('deals a full, unique, dateless hand on every seed', () => {
    for (const seed of SEEDS) {
      const deal = dealTimelineRun(seed)
      expect(deal.queue, `seed ${seed}`).toHaveLength(TIMELINE_LENGTH)

      const blob = JSON.stringify(deal.queue)
      expect(blob, `seed ${seed}: an ISO date reached the client`).not.toMatch(/\d{4}-\d{2}-\d{2}/)
      expect(blob, `seed ${seed}: a year reached the client`).not.toMatch(/\b(1[89]|20)\d{2}\b/)
      expect(blob, `seed ${seed}`).not.toContain('"on"')

      // The anchor is dealt face up and must never come back around as a card to place.
      const ids = [deal.anchor.id, ...deal.queue.map((card) => card.id)]
      expect(new Set(ids).size, `seed ${seed}: a card is dealt twice`).toBe(ids.length)
    }
  })

  it('is deterministic — the same seed is the same run', () => {
    for (const seed of SEEDS) {
      expect(JSON.stringify(dealTimelineRun(seed)), `seed ${seed}`).toBe(
        JSON.stringify(dealTimelineRun(seed)),
      )
    }
  })

  it('keeps the board a truthful chronology at every step of every run', () => {
    for (const seed of SEEDS) {
      for (let placed = 0; placed <= TIMELINE_LENGTH; placed += 1) {
        const board = boardAfter(seed, placed)
        expect(board, `seed ${seed} after ${placed}`).toHaveLength(placed + 1)
        for (let index = 1; index < board.length; index += 1) {
          expect(
            board[index - 1]!.on.localeCompare(board[index]!.on),
            `seed ${seed}: board out of order after ${placed}`,
          ).toBeLessThanOrEqual(0)
        }
      }
    }
  })

  it('can be played perfectly — the true slot always grades correct', () => {
    // The card is inserted at its real position whether or not the player was right, so
    // the board a grade is measured against is a pure function of the seed. If that ever
    // stops holding, a run becomes unwinnable somewhere in the middle and nothing else
    // in the suite would notice.
    for (const seed of SEEDS) {
      for (let placed = 0; placed < TIMELINE_LENGTH; placed += 1) {
        const truth = gradeInsert(seed, placed, -1)
        expect(truth, `seed ${seed} at ${placed}`).not.toBeNull()
        expect(truth!.correct, `seed ${seed}: -1 was accepted as a slot`).toBe(false)
        expect(truth!.position).toBeGreaterThanOrEqual(0)
        expect(truth!.position).toBeLessThanOrEqual(placed + 1)

        const played = gradeInsert(seed, placed, truth!.position)
        expect(played!.correct, `seed ${seed}: the true slot graded wrong at ${placed}`).toBe(true)
        expect(played!.card.on).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(played!.done).toBe(placed + 1 >= TIMELINE_LENGTH)
      }
      expect(gradeInsert(seed, TIMELINE_LENGTH, 0), `seed ${seed}`).toBeNull()
    }
  })

  it('never deals two cards that share a date', () => {
    // Two cards on the same day have two "right" slots, and one of them scores as wrong.
    for (const seed of SEEDS) {
      const dates = boardAfter(seed, TIMELINE_LENGTH).map((card) => card.on)
      expect(new Set(dates).size, `seed ${seed}`).toBe(dates.length)
    }
  })

  /**
   * **The cursor bug (fixed 21.9.2026).** `PlayLink` raises the cursor on every visit, so
   * almost every real round is dealt at cursor ≥ 1 — and `gradeInsert` returned the board
   * of the cursor-0 deal. Across seeds 1–40 with cursors 1–3 all 120 boards were wrong;
   * the suite only ever graded cursor 0.
   */
  it('grades a rotated deal against its own board — cursors 1 to 3', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      for (const cursor of [1, 2, 3]) {
        const deal = dealTimelineRun(seed, cursor)
        const dealt = new Set([deal.anchor.id, ...deal.queue.map((card) => card.id)])
        for (let placed = 0; placed < TIMELINE_LENGTH; placed += 1) {
          const truth = gradeInsert(seed, placed, -1, cursor)!
          expect(truth.card.id, `seed ${seed} cursor ${cursor}`).toBe(deal.queue[placed]!.id)
          const played = gradeInsert(seed, placed, truth.position, cursor)!
          expect(played.correct).toBe(true)
          // the board that comes back is THIS deal's board, card for card
          expect(played.board.map((card) => card.id)).toEqual(boardAfter(seed, placed + 1, cursor).map((card) => card.id))
          for (const card of played.board) expect(dealt.has(card.id), `seed ${seed} cursor ${cursor}: a card from another deal`).toBe(true)
        }
      }
    }
  })
})

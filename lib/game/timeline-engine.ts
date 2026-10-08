import 'server-only'
import {positionOf,takeFrom} from '@/lib/rotation/deck'
import {rng,shuffle} from './random'
import {TIMELINE_LENGTH,type BlindCard,type DatedCard} from './timeline-run'
export type TimelineDeal = {
  anchor: DatedCard
  /** the ten to place, in the order they are dealt — dates stripped */
  queue: BlindCard[]
}
export type InsertVerdict = {
  correct: boolean
  /** the card that was in hand, with its date now shown */
  card: DatedCard
  /** the slot it actually belonged in, 0..board.length */
  position: number
  /** the board as it now stands */
  board: DatedCard[]
  /** true once every card has been placed */
  done: boolean
}

/** One algorithm; only compiled cards differ by club. */
export function createTimelineEngine(cardsPool:readonly DatedCard[]) {
 // TI-R01/R02: a run needs distinct DATES — a legacy pool may hold several cards for one day, so the length counts days
 const distinctDays=new Set(cardsPool.map(c=>c.on)).size
 const length=Math.max(0,Math.min(TIMELINE_LENGTH,cardsPool.length-1,distinctDays-1))
function runCards(seed: number, cursor: number): DatedCard[] {
  if (length < 2) return []
  const all = cardsPool
  // Eleven cards out of roughly 160, so a lap of the pool is about fourteen runs before
  // any card is seen twice — and the lap after that is a different shuffle.
  const at = positionOf(seed, cursor, all.length, length + 1)
  const shuffled = shuffle(all, rng(at.seed))
  const start = at.slot * (length + 1)
  const slice = takeFrom(shuffled, start, length + 1)
  // One card per date inside a run: a same-day repeat is replaced by the next unused date after the slice, in
  // shuffle order, so the repair is deterministic and a run without a collision is dealt exactly as before.
  const days = new Set<string>()
  const drawn: DatedCard[] = []
  let spare = start + length + 1
  for (const card of slice) {
    let pick = card
    for (let tries = 0; days.has(pick.on) && tries < shuffled.length; tries += 1) {
      pick = shuffled[spare % shuffled.length] as DatedCard
      spare += 1
    }
    days.add(pick.on)
    drawn.push(pick)
  }
  const byDate = [...drawn].sort((a, b) => a.on.localeCompare(b.on))
  const middle = byDate[Math.floor(byDate.length / 2)] as DatedCard

  // The anchor is removed by POSITION, not by matching its id. Filtering on equality
  // means one duplicate id removes two cards and the run is dealt a card short — which
  // is exactly what happened, and it is worth being immune to it here as well as
  // preventing it in `pool()`. Two defences, because a run that cannot be finished is
  // the worst failure this mode has.
  const anchorAt = drawn.indexOf(middle)
  const rest = drawn.filter((_, index) => index !== anchorAt)
  return [middle, ...rest]
}

function blind({ id, title, hint }: DatedCard): BlindCard {
  return { id, title, hint }
}



function dealTimelineRun(seed: number, cursor = 0): TimelineDeal {
  if (length < 2) throw new Error('TIMELINE_UNAVAILABLE')
  const cards = runCards(seed, cursor)
  const [anchor, ...queue] = cards
  return {
    anchor: anchor as DatedCard,
    queue: queue.slice(0, length).map(blind),
  }
}

/**
 * The board after `placed` cards have been resolved, oldest first, with their dates.
 *
 * Safe to send to the client: every card on it has already been played, and the one in
 * hand is never in it. This is derivable purely from the seed BECAUSE a card is inserted
 * at its true position whether or not the player was right — which is the design
 * decision that makes the run honest and the grading cheap at the same time.
 */
function boardAfter(seed: number, placed: number, cursor = 0): DatedCard[] {
  const cards = runCards(seed, cursor)
  if (!cards.length) return []
  const anchor = cards[0] as DatedCard
  const resolved = cards.slice(1, 1 + Math.max(0, Math.min(placed, length)))
  return [anchor, ...resolved].sort((a, b) => a.on.localeCompare(b.on))
}



/**
 * Grade one placement. `slot` is the gap index: 0 is before the first card on the
 * board, `board.length` is after the last.
 */
function gradeInsert(
  seed: number,
  placed: number,
  slot: number,
  cursor = 0,
): InsertVerdict | null {
  if (!Number.isSafeInteger(seed) || seed <= 0 || !Number.isSafeInteger(cursor) || cursor < 0 || !Number.isInteger(placed) || placed < 0 || placed >= length || !Number.isInteger(slot) || slot < -1 || slot > placed + 1) return null
  const cards = runCards(seed, cursor)
  const card = cards[placed + 1]
  if (!card) return null

  const board = boardAfter(seed, placed, cursor)
  // Where it belongs: the number of cards already on the board that are older than it.
  const position = board.filter((other) => other.on.localeCompare(card.on) < 0).length

  return {
    correct: slot === position,
    card,
    position,
    // with the cursor: grading a rotated deal against the cursor-0 board handed back a
    // board of cards the player had never been dealt (every seed, cursors 1–3, 21.9.2026)
    board: boardAfter(seed, placed + 1, cursor),
    done: placed + 1 >= length,
  }
}


return {length,distinctDays,available:length>=2,poolSize:cardsPool.length,dealTimelineRun,boardAfter,gradeInsert}
}

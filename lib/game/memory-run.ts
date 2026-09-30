import type { MemoryCard } from './memory'

/**
 * הריצה על הקיר — gate 6's run, as arithmetic.
 *
 * The board used to be a `useState` triple inside the component: open cards, done pairs
 * and a move counter, with the matching rule written inline in the click handler. That
 * was enough for a board that only matched; it is not enough for a board that also has
 * a flash, a streak, an echo and a morale line, because every one of those is a rule
 * about WHEN something happens and none of them can be checked by looking at a
 * screenshot.
 *
 * So the run lives here, pure: no React, no timers, no DOM. The component owns the
 * clock and the pixels; this owns what a flip MEANS. `tests/memory.test.ts` plays whole
 * runs through it — including the ones a human would have to be unlucky to reach, like
 * missing on the card that armed the echo.
 *
 * ## The four mechanics, and the rule each one turns out to be
 *
 *  · **MEMORY FLASH.** Every card is open for a fixed beat at the start, and once more
 *    per run on demand. It is gameplay rather than a transition (the brief's own
 *    distinction), so it is allowed to take time — and it is skippable, because a
 *    player who has already photographed the wall should not be made to wait for the
 *    rest of the beat.
 *  · **PAIR FUSION.** A matched pair is not silently removed; it becomes one memory.
 *    The run records the pair and whether it was found with no miss since the last one
 *    — `perfect` — which is the only thing "PERFECT RECALL" can honestly mean here.
 *  · **MEMORY ECHO.** Three pairs in a row arms one hint; the next card you open makes
 *    its mate blink. It never opens a card and never answers: an echo on a card whose
 *    mate is already matched would be a hint about nothing, so `echoMate` answers
 *    `null` there and the charge is not spent.
 *  · **MORALE.** How lit the wall is — pairs found over pairs dealt. It is a fraction
 *    of a count, not a mood somebody typed, which is what makes it safe to print.
 */

/** three pairs in a row is what arms the echo */
export const ECHO_STREAK = 3

/** how long the opening flash holds, in ms. Skippable — see `MemoryBoard`. */
export const FLASH_MS = 3000

/** the second flash, on demand: shorter, because by then you know what you are looking for */
export const RE_FLASH_MS = 1300

/** how long a fused pair holds the screen before the board comes back. Skippable. */
export const FUSION_MS = 1150

/** how long the echoed card blinks */
export const ECHO_MS = 1400

export type EchoState = 'idle' | 'armed' | 'spent'

export type MemoryRun = {
  /** card ids currently face up and not yet resolved — never more than two */
  open: string[]
  /** pair ids matched, in the order they were found */
  done: string[]
  /** a move is the flip of a SECOND card: the only number worth boasting about */
  moves: number
  misses: number
  /** pairs found back-to-back with no miss between them */
  streak: number
  bestStreak: number
  /** misses since the last pair was closed — zero means the next pair is a perfect recall */
  missesSincePair: number
  /** pair ids found with no miss since the previous pair */
  perfect: string[]
  flashUsed: boolean
  echo: EchoState
}

export function startRun(): MemoryRun {
  return {
    open: [],
    done: [],
    moves: 0,
    misses: 0,
    streak: 0,
    bestStreak: 0,
    missesSincePair: 0,
    perfect: [],
    flashUsed: false,
    echo: 'idle',
  }
}

/**
 * What a flip turned out to be.
 *
 * `ignored` is its own answer rather than a null: a tap on a matched pair, on a card
 * already face up, or while two are resolving is a real thing a player does constantly,
 * and the screen has to know that nothing happened rather than guess it from an
 * unchanged object.
 */
export type FlipOutcome =
  | { kind: 'ignored'; run: MemoryRun }
  /** one card is up and the board is waiting for its partner */
  | { kind: 'open'; run: MemoryRun }
  | { kind: 'pair'; run: MemoryRun; pair: string; perfect: boolean }
  /** two cards are up and they do not belong together — the screen shows them, then clears */
  | { kind: 'miss'; run: MemoryRun }

export function flip(run: MemoryRun, cards: readonly MemoryCard[], id: string): FlipOutcome {
  const card = cards.find((item) => item.id === id)
  if (!card) return { kind: 'ignored', run }
  if (run.open.length >= 2) return { kind: 'ignored', run }
  if (run.open.includes(id)) return { kind: 'ignored', run }
  if (run.done.includes(card.pair)) return { kind: 'ignored', run }

  const open = [...run.open, id]
  if (open.length < 2) return { kind: 'open', run: { ...run, open } }

  const first = cards.find((item) => item.id === open[0])
  const moves = run.moves + 1

  if (first && first.pair === card.pair) {
    const perfect = run.missesSincePair === 0
    const streak = run.streak + 1
    return {
      kind: 'pair',
      pair: card.pair,
      perfect,
      run: {
        ...run,
        open: [],
        done: [...run.done, card.pair],
        moves,
        streak,
        bestStreak: Math.max(run.bestStreak, streak),
        missesSincePair: 0,
        perfect: perfect ? [...run.perfect, card.pair] : run.perfect,
        // Three in a row arms one echo per run, and only if the run has not already
        // spent it. A streak of six does not stockpile two.
        echo: run.echo === 'idle' && streak >= ECHO_STREAK ? 'armed' : run.echo,
      },
    }
  }

  return {
    kind: 'miss',
    run: {
      ...run,
      open,
      moves,
      misses: run.misses + 1,
      missesSincePair: run.missesSincePair + 1,
      streak: 0,
    },
  }
}

/** Both cards of a failed move go back down. The board, not the clock, decides when. */
export function closeOpen(run: MemoryRun): MemoryRun {
  return run.open.length === 0 ? run : { ...run, open: [] }
}

/**
 * The echo's target, or `null`.
 *
 * Called with the card the player has just turned over. It answers the id of that
 * card's partner — and only when the charge is armed and the partner is still in play.
 * An echo pointing at a card that is already part of a matched pair is a hint about
 * something the player has finished with, and spending the one charge of the run on it
 * would be worse than not having the mechanic.
 */
export function echoMate(
  run: MemoryRun,
  cards: readonly MemoryCard[],
  justOpened: string,
): string | null {
  if (run.echo !== 'armed') return null
  // Only on the FIRST card of a move. Opening the second card of a pair would make
  // `echoMate` point at the card already face up on the board — a hint about something
  // the player is looking at, and the run's one charge spent on it.
  if (run.open.length !== 0) return null
  const card = cards.find((item) => item.id === justOpened)
  if (!card || run.done.includes(card.pair)) return null
  const mate = cards.find((item) => item.pair === card.pair && item.id !== justOpened)
  return mate?.id ?? null
}

export function spendEcho(run: MemoryRun): MemoryRun {
  return run.echo === 'armed' ? { ...run, echo: 'spent' } : run
}

/**
 * Spend the one extra flash.
 *
 * Named `spendFlash` and not `useFlash`: a `use*` function that is not a hook is a
 * loaded gun pointed at the rules-of-hooks lint, and this one is called from inside an
 * event handler and passed to `setState` as an updater.
 */
export function spendFlash(run: MemoryRun): MemoryRun {
  return run.flashUsed ? run : { ...run, flashUsed: true }
}

/**
 * מוראל — how lit the wall is, 0 to 1.
 *
 * Pairs closed over pairs dealt, and nothing else. The prototype calls the same number
 * "MEMORY WALL %" and turns the room redder past half; this keeps the number and the
 * threshold and refuses to let either become a mood. A morale that counted misses or
 * speed would be a judgement of the player, and this gate does not grade anybody — it
 * is the wall lighting up as it fills, which is a fact about the board.
 */
export function morale(run: MemoryRun, pairs: number): number {
  if (pairs <= 0) return 0
  return Math.min(1, run.done.length / pairs)
}

/** past half the wall is lit, and the room knows it */
export const MORALE_LIT = 0.5

export function wallLit(run: MemoryRun, pairs: number): boolean {
  return morale(run, pairs) >= MORALE_LIT
}

export function finished(run: MemoryRun, pairs: number): boolean {
  return pairs > 0 && run.done.length >= pairs
}

/**
 * The closing line's key — chosen from what the run actually did.
 *
 * Four verdicts, in the order they are tested, and every one of them is a statement
 * about a counter rather than praise: no miss at all, no move wasted beyond the pairs
 * themselves, few misses, and everything else. The message catalogue holds the words.
 */
export type MemoryVerdict = 'flawless' | 'sharp' | 'solid' | 'lit'

export function verdict(run: MemoryRun, pairs: number): MemoryVerdict {
  if (run.misses === 0) return 'flawless'
  // A perfect board is `pairs` moves. Two wasted moves over six pairs is still sharp.
  if (run.moves <= pairs + 2) return 'sharp'
  if (run.misses <= pairs) return 'solid'
  return 'lit'
}

/**
 * Is this face a pure figure — a season, a year, a span — and nothing else?
 *
 * It decides whether the card prints it inside `<Num>` (`<bdi dir="ltr">`), and it is a
 * bug report before it is a helper. `יצרן ותקופה` deals spans like `2017/18–2021/22`,
 * and in an RTL line the en dash between two numbers is a NEUTRAL: the bidi algorithm
 * resolves it to the paragraph's own direction and prints it on the wrong side of the
 * pair. On a 390px card that came out as `–2017/18` on one line and `2021/22` on the
 * next — a range printed as two dates and a stray dash, on the board this project uses
 * to teach the archive's own periods. Seen in a browser, at 390, on seed 7.
 *
 * `<Num>` is the fix the repo already has (`components/ui/Num.tsx`), and the predicate is
 * deliberately narrow for the reason rule 69 §7 gives: isolating a DIGIT is right,
 * isolating a SENTENCE moves the words inside it. `1994/95` yes; `210 קולות` no — that
 * one is Hebrew with a number in it and the bidi algorithm already sets it correctly.
 */
export function numericFace(face: string): boolean {
  return /^[0-9/\u2013\u2014.\- ]+$/.test(face) && /[0-9]/.test(face)
}


/* -------------------------------------------------------------- pair threads */

/**
 * החוטים — one line between the two cards of every locked pair.
 *
 * v3 measured the DOM on every resize (`getBoundingClientRect` per card) to draw them.
 * The board is a grid whose geometry is already known from the card's INDEX: column
 * `i % cols`, row `⌊i / cols⌋`. So the line is computed in grid units — the centre of a
 * cell is (col + ½, row + ½) — and the SVG scales with the grid by its viewBox. Nothing
 * measures, nothing listens to resize, and the function is testable (brief §26).
 *
 * Physical coordinates are right HERE (rule 9's exception for SVG geometry): the grid
 * flows right-to-left, so column 0 sits at the right edge — `rtl` mirrors x.
 */
export type Thread = { pair: string; x1: number; y1: number; x2: number; y2: number }

export function threadGeometry(
  cards: readonly Pick<MemoryCard, 'id' | 'pair'>[],
  done: readonly string[],
  cols: number,
  rtl = true,
): Thread[] {
  const centre = (index: number) => {
    const col = index % cols
    const row = Math.floor(index / cols)
    return { x: (rtl ? cols - 1 - col : col) + 0.5, y: row + 0.5 }
  }
  const out: Thread[] = []
  for (const pair of done) {
    const at = cards.flatMap((card, index) => (card.pair === pair ? [index] : []))
    if (at.length !== 2) continue
    const a = centre(at[0] as number)
    const b = centre(at[1] as number)
    out.push({ pair, x1: a.x, y1: a.y, x2: b.x, y2: b.y })
  }
  return out
}

/** the flash countdown — 3·2·1 over the beat, whole seconds, never below 1 */
export function countdownAt(elapsedMs: number, totalMs: number = FLASH_MS): number {
  return Math.max(1, Math.ceil((totalMs - elapsedMs) / 1000))
}

import { GATES, gateFor, type Gate } from '@/lib/gates'
import type { MessageKey } from '@/lib/i18n'

/**
 * עזרה בשער — three short answers, per gate, for the visitor standing in front of a
 * closed door.
 *
 * The problem this fixes: a brand-new player sees a wall of thirteen numbered plates
 * and nothing on any of them says what happens on the other side. `HelpChip` (rendered
 * once, in `components/ui/Screen.tsx`) opens a small sheet with exactly three lines —
 * **מה עושים כאן** (one sentence), **איך שופטים** (or the honest "no score" where that
 * is the truth — rule 24 names gates 1, 5, 7 and 10 as deliberately ungraded toys), and
 * **כמה זמן זה לוקח**. Nothing here states a result or a fact from the archive; it only
 * describes the SHAPE of the gate, the way `lib/life/help.ts` describes the shape of a
 * day without ever giving away what happens in it.
 *
 * **Every entry is written from that gate's own screen**, not templated — a memory
 * gate, a ballot and a king-of-the-hill duel are not the same shape of thing, and a
 * help sheet that reads the same with the noun swapped would be exactly the kind of
 * copy this project does not ship (rule 16 applies to game copy as much as it does to
 * research: read the thing, then describe the thing).
 *
 * **This is keyed by gate NUMBER, not by route**, because `lib/gates.ts` already
 * carries the number-to-route map (`gateFor`) and a second map would drift from it the
 * first time a href changed. A gate with no ROUTE (9, under refurbishment) can never
 * reach this — `helpForRoute` is asked by a pathname and gate 9 has none — and a route
 * with no gate at all (the ground, Ussishkin, the black file) simply gets no chip:
 * `helpForRoute` returns `undefined` and `HelpChip` renders nothing.
 */
export type GateHelp = {
  gateNumber: number
  /** one sentence: what a player actually does on this screen */
  whatKey: MessageKey
  /** how the round is scored — or the plain "no score, it's a toy" sentence */
  scoreKey: MessageKey
  /** how long a round takes, spoken the way you'd say it at the gate */
  timeKey: MessageKey
}

const GATE_HELP: readonly GateHelp[] = [
  {
    gateNumber: 1, // /xi — הרכב כל הזמנים
    whatKey: 'help.xi.what',
    scoreKey: 'help.xi.score',
    timeKey: 'help.xi.time',
  },
  {
    gateNumber: 2, // /trivia — אגף הטריוויות
    whatKey: 'help.trivia.what',
    scoreKey: 'help.trivia.score',
    timeKey: 'help.trivia.time',
  },
  {
    gateNumber: 3, // /lineup — חידון ההרכב
    whatKey: 'help.lineup.what',
    scoreKey: 'help.lineup.score',
    timeKey: 'help.lineup.time',
  },
  {
    gateNumber: 4, // /kits/build — חידון המדים
    whatKey: 'help.kitgame.what',
    scoreKey: 'help.kitgame.score',
    timeKey: 'help.kitgame.time',
  },
  {
    gateNumber: 5, // /kits — אגף המדים (האוסף + המעצב)
    whatKey: 'help.kits.what',
    scoreKey: 'help.kits.score',
    timeKey: 'help.kits.time',
  },
  {
    gateNumber: 6, // /memory — משחק הזיכרון
    whatKey: 'help.memory.what',
    scoreKey: 'help.memory.score',
    timeKey: 'help.memory.time',
  },
  {
    gateNumber: 7, // /polls — אגף הסקרים
    whatKey: 'help.polls.what',
    scoreKey: 'help.polls.score',
    timeKey: 'help.polls.time',
  },
  {
    gateNumber: 8, // /goal — שחזור שער
    whatKey: 'help.goal.what',
    scoreKey: 'help.goal.score',
    timeKey: 'help.goal.time',
  },
  {
    gateNumber: 12, // /archive — הארכיון החי (v10, 21.9.2026)
    whatKey: 'help.archive.dock.what',
    scoreKey: 'help.archive.dock.score',
    timeKey: 'help.archive.dock.time',
  },
  {
    gateNumber: 10, // /blind-cow — פרה עיוורת (24.9.2026; the member book /tik is off the wall)
    whatKey: 'help.blindcow.what',
    scoreKey: 'help.blindcow.score',
    timeKey: 'help.blindcow.time',
  },
  {
    gateNumber: 11, // /derby — משחק השנאה
    whatKey: 'help.derby.what',
    scoreKey: 'help.derby.score',
    timeKey: 'help.derby.time',
  },
  {
    gateNumber: 13, // /timeline — החוט האדום (the chronology is /timeline/order)
    whatKey: 'help.thread.what',
    scoreKey: 'help.thread.score',
    timeKey: 'help.thread.time',
  },
]

/** The gate a pathname belongs to, and its help — or nothing, for a route with no gate. */
export function helpForRoute(pathname: string): { gate: Gate; help: GateHelp } | undefined {
  const gate = gateFor(pathname)
  if (!gate) return undefined
  const help = GATE_HELP.find((row) => row.gateNumber === gate.number)
  if (!help) return undefined
  return { gate, help }
}

/** Exported for the one test that walks every hung gate and asserts none is missing help. */
export function allGates(): readonly Gate[] {
  return GATES
}

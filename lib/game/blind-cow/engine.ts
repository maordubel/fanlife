import 'server-only'

import { playerById } from '@/lib/archive/player-master'
import { playerShirt } from '@/lib/kit/playerShirt'
import { blindCowLinks, matchOfClue } from '@/lib/links'
import { recommend } from '@/lib/results/context'
import type { ResultContext } from '@/lib/results/types'

import { BANK, openClues, questionById, yearsHe, type Filter } from './bank'
import { weightedTimeMs } from './scoring'
import type { OpenClue, RunResult, RunView } from './types'

/**
 * The solo / daily run — a small state machine the actions drive and a sealed cookie
 * carries. Pure given `now`: every transition takes the server's clock as an argument,
 * so a test can play a whole run at chosen milliseconds.
 *
 *   · the clock starts when the first clue is dealt (the same response that shows it);
 *   · `reveal(have)` opens clue have+1 only if the screen really holds `have` — a double
 *     tap, a retried request or a second tab cannot open two;
 *   · a guess is a Player Master id; the same wrong id twice is one mistake;
 *   · after the whistle nothing moves: guess, reveal and give-up return the same result.
 */
export {newRun,giveUp} from './solo-engine'
export type {RunState} from './solo-engine'
import {createSoloEngine,type RunState} from './solo-engine'
const solo=createSoloEngine({questionById,isPlayerId:id=>/^p_[0-9a-f]{10}$/.test(id)})
export const reveal=solo.reveal,guess=solo.guess

export function resultOf(
  target: { playerId: string; fallbackNameHe: string; allClues: OpenClue[] },
  run: { hintsUsed: number; wrongGuesses: number; rawElapsedMs: number; caughtBy: number | null; scoringVersion: number },
): RunResult {
  const player = playerById(target.playerId)
  const shirt = playerShirt(player ?? target.playerId)
  const links = blindCowLinks(target.playerId, target.allClues)
  const matchIds = [...new Set(target.allClues.map((clue) => matchOfClue(target.playerId, clue)).filter((m): m is string => Boolean(m)))]
  const context: ResultContext = {
    gateId: 10,
    playerIds: [target.playerId],
    matchIds,
    score: run.hintsUsed,
  }
  return {
    playerId: target.playerId,
    nameHe: player?.displayName ?? target.fallbackNameHe,
    yearsHe: yearsHe(target.playerId),
    hintsUsed: run.hintsUsed,
    wrongGuesses: run.wrongGuesses,
    rawElapsedMs: run.rawElapsedMs,
    weightedTimeMs: weightedTimeMs(run, run.scoringVersion),
    scoringVersion: run.scoringVersion,
    caughtBy: run.caughtBy,
    allClues: target.allClues,
    archiveHref: `/archive?at=${encodeURIComponent(target.playerId)}`,
    links,
    context,
    next: recommend(context, { exclude: links.map((link) => link.href) }),
    shirt,
    shirtTitle: shirt.seasonLabel,
  }
}

/** What the screen may see. The answer is in it only once the run is over. */
export function viewOf(state: RunState): RunView | null {
  const q = questionById(state.qid)
  if (!q) return null
  const view: RunView = {
    mode: state.mode,
    status: state.status,
    clues: openClues(q, state.shown),
    total: q.clueIds.length,
    wrong: state.wrong,
    startedAt: state.started,
    finishedAt: state.finished,
    serverNow: Date.now(),
    tried: state.tried,
    day: state.day,
  }
  if (state.status !== 'playing' && state.finished !== null) {
    view.result = resultOf({ playerId: q.targetPlayerId, fallbackNameHe: q.targetDisplayNameHe, allClues: openClues(q, q.clueIds.length) }, {
      hintsUsed: state.shown,
      wrongGuesses: state.wrong,
      rawElapsedMs: state.finished - state.started,
      caughtBy: state.caught,
      scoringVersion: state.sv,
    })
  }
  return view
}

export { BANK }

/**
 * הבמאי — runs a match script against a scene.
 *
 * The scene hands over five things and gets them back at the whistle: the bus (board,
 * toasts, sounds), the engine (the clock, flags, events), the dialogue runtime (the
 * player's hands), a way to wait, and a handful of camera verbs. The director owns no
 * Phaser object and imports none: it can be driven by a test with fake timers, which is
 * how `tests/life-match.test.ts` proves a match takes a minute and a goal comes after the
 * kickoff and before the whistle.
 *
 * The board is built from the anchor and the script's running score, never typed in.
 * The crowd is a state the director names; how it sounds is `audio.ts`'s business.
 */
import type { HistoricalAnchor } from '../anchors'
import type { LifeEvent } from '../events'
import { US_HE } from '../match'
import type { MatchScript, MatchStep } from '../content/matchScripts'
import type { LifeBusEvents } from './bus'
import type { CrowdState } from './audio'

export type MatchBoard = NonNullable<LifeBusEvents['match']>

export type MatchHost = {
  emit: <K extends keyof LifeBusEvents>(name: K, value: LifeBusEvents[K]) => void
  dispatch: (...events: LifeEvent[]) => void
  /** the day's minute, for `clock` steps that only ever move it forward */
  minute: () => number
  talk: (conversation: string, done: () => void) => boolean
  /** a timer the scene owns; the handle removes it */
  after: (ms: number, fn: () => void) => { remove: () => void }
  /** the world stops moving under the sequence; false again for a prompt */
  setPaused: (on: boolean) => void
  /** a goal the scene stages itself (film / authored minute); calls back when the picture is back */
  onAuthoredGoal?: (step: MatchStep, done: () => void) => void
  /** the picture reacting to a goal: a flash, a shake, the paper */
  onGoal?: (side: 'for' | 'against') => void
  onEnd: (script: MatchScript) => void
  /** every step has run (a trailing prompt included): the beat may continue */
  onFinished?: () => void
}

export class MatchDirector {
  private index = 0
  private timer: { remove: () => void } | null = null
  private board = { for: 0, against: 0 }
  private minuteLabel = ''
  private over = false
  private stopped = false
  private lastSignature = ''
  /** every step that ran, with the director's own clock — for the tests and the probe */
  readonly log: { id: string; at: number }[] = []
  private clock = 0

  constructor(
    private host: MatchHost,
    readonly script: MatchScript,
    private anchor: HistoricalAnchor,
  ) {}

  get active() {
    return !this.stopped && !this.over
  }

  start() {
    this.host.setPaused(true)
    /**
     * דרבי — the one fixture that gets the chant over the constant bed (Maor, 6.9.2026).
     *
     * Read off the archive's own opponent name rather than typed per chapter, so a derby
     * is a derby in every year the archive holds one, and a season the archive cannot name
     * an opponent for is simply not one. Nothing here decides history; it decides which
     * recording is playing while the boy watches it.
     */
    this.host.emit('sound', { kind: 'derby', on: isDerby(this.anchor.match?.opponentHe ?? null) })
    this.next()
  }

  /** the scene is going away: no timer may fire into a room that no longer exists */
  stop() {
    this.stopped = true
    this.timer?.remove()
    this.timer = null
  }

  private next() {
    if (this.stopped) return
    const step = this.script.steps[this.index]
    if (!step) {
      this.host.onFinished?.()
      return
    }
    this.index += 1
    this.clock += step.wait
    this.timer = this.host.after(step.wait, () => {
      this.timer = null
      this.run(step)
    })
  }

  private run(step: MatchStep) {
    if (this.stopped) return
    this.log.push({ id: step.id ?? `step-${this.index}`, at: this.clock })
    if (step.clock !== undefined && step.clock > this.host.minute()) {
      this.host.dispatch({ t: 'clock.advanced', minutes: step.clock - this.host.minute() })
    }
    if (step.flag) this.host.dispatch({ t: 'flag.raised', flag: step.flag })
    if (step.events && step.events.length > 0) this.host.dispatch(...step.events)
    if (step.crowd) this.crowd(step.crowd)
    if (step.listen !== undefined) this.host.emit('sound', { kind: 'listen', weight: step.listen })
    if (step.whistle) this.host.emit('sound', { kind: 'whistle', blasts: step.whistle })
    if (step.sfx) this.host.emit('sound', { kind: 'sample', key: step.sfx, ...(step.level !== undefined ? { level: step.level } : {}) })
    if (step.text) this.host.emit('toast', { text: step.text, tone: step.tone ?? 'plain' })
    if (step.board) this.board = { ...step.board }
    // the minute only from the archive; a phase word is always allowed
    if (step.minute !== undefined) this.minuteLabel = `${step.minute}'`
    if (step.phaseHe) this.minuteLabel = step.phaseHe
    if (step.end) this.over = true

    const afterGoal = () => {
      this.pushBoard()
      if (step.end) {
        this.host.emit('controls', { visible: true })
        this.host.setPaused(false)
        this.host.onEnd(this.script)
      }
      if (step.talk) {
        this.host.setPaused(false)
        const started = this.host.talk(step.talk, () => {
          if (this.stopped) return
          if (!this.over) this.host.setPaused(true)
          this.next()
        })
        if (!started) this.next()
        return
      }
      this.next()
    }

    if (step.goal) {
      if (step.goal === 'for') this.board = { ...this.board, for: this.board.for + 1 }
      else this.board = { ...this.board, against: this.board.against + 1 }
      if (step.authored && this.host.onAuthoredGoal) {
        // the scene stages it (film or the authored minute); the board is pushed when it is back
        this.host.onAuthoredGoal(step, afterGoal)
        return
      }
      this.host.onGoal?.(step.goal)
      afterGoal()
      return
    }
    afterGoal()
  }

  private crowd(state: CrowdState) {
    this.host.emit('sound', { kind: 'crowd', state })
  }

  /** the board as the strip draws it, from the anchor's names and the script's running score */
  boardNow(): MatchBoard | null {
    const match = this.anchor.match
    const scored = this.script.scored && match !== null
    const atHome = this.script.atHome ?? match?.atHome ?? true
    const homeHe = atHome ? US_HE : (match?.opponentHe ?? '')
    const awayHe = atHome ? (match?.opponentHe ?? '') : US_HE
    const home = atHome ? this.board.for : this.board.against
    const away = atHome ? this.board.against : this.board.for
    return {
      homeHe,
      awayHe,
      homeScore: scored ? home : null,
      awayScore: scored ? away : null,
      labelHe: this.minuteLabel,
      scored: scored && (this.board.for > 0 || this.board.against > 0),
      over: this.over,
    }
  }

  pushBoard() {
    const board = this.boardNow()
    if (!board) return
    const signature = `${board.labelHe}|${board.homeScore}|${board.awayScore}|${board.over}`
    if (signature === this.lastSignature) return
    this.lastSignature = signature
    this.host.emit('match', board)
  }
}

/**
 * מכבי תל אביב, וזהו — the only opponent whose name turns a match into a derby.
 *
 * A substring test on the archive's own Hebrew club name, deliberately narrow: Maccabi
 * Haifa and Maccabi Netanya are not derbies and must not get the chant.
 */
export function isDerby(opponentHe: string | null): boolean {
  if (!opponentHe) return false
  const name = opponentHe.replace(/[\u0591-\u05C7"'׳״]/g, '').trim()
  return name.includes('מכבי תל אביב') || name.includes('מכבי ת"א') || name.includes('מכבי תא')
}

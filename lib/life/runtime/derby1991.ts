import type Phaser from 'phaser'

import type { HistoricalAnchor } from '../anchors'
import type { LifeEvent } from '../events'
import { US_HE } from '../match'
import type { Say } from '../content/script'

import type { LifeContext } from './context'

/**
 * ליל אוסישקין — the derby of 11.3.1991 as a NIGHT IN A STAND (brief §38–§42).
 *
 * The 1990 director was an information game: a child moving between radios to find out
 * whether we were up. This one is the opposite in every way, and it has to be, or the
 * two evenings are the same evening with different art. Here there is nothing to find
 * out. The game is thirty feet away, everybody can see it, and what the child is
 * managing is his BODY and his TIME: a place on a step that people keep taking, a song
 * he does not know the words to, a friend who wants something, a vendor, and a clock on
 * the wall that his mother set.
 *
 * **The one discipline this file exists to keep.** The archive holds the final score of
 * 11.3.1991 and holds NOTHING about how it got there — no quarters, no runs, no scorers.
 * So this director never puts a number on the screen while the game is alive. The
 * scoreboard strip stays empty; the crowd is the only instrument; and at the horn the
 * board is filled ONCE, from the anchor, exactly as `TransistorNet.finalBoard` does.
 * Every sentence below is about a room full of people, and not one of them is about a
 * basket. That is not a limitation the game is working around — it is what a thirteen-
 * year-old in the fourth row actually experienced, which is why the brief asked for the
 * crowd and not for a simulation.
 *
 * Time: the day clock is frozen by the scene (as in 1990) and this director moves it in
 * steps at each phase change, because the curfew has to be READABLE on the HUD. Half
 * past nine arrives on the clock in the corner while the hall is still shaking, and the
 * choice the whole chapter is built around is then made with the player's own legs.
 */

export type DerbyPhase = 'warmup' | 'q1' | 'q2' | 'half' | 'q3' | 'q4' | 'over'

export type DerbyMood = 'tense' | 'loud' | 'eruption' | 'nervous' | 'chant' | 'chaos' | 'victory'

export type DerbyHooks = {
  /** the strip: null while the game is alive, the canonical final at the horn */
  onBoard: (board: DerbyBoard | null) => void
  /** the hall's mood changed — the scene grades the room and shakes the roof */
  onMood: (mood: DerbyMood) => void
  /** the horn, and everything that follows it */
  onOver: () => void
  /** half past nine, while the game is still alive */
  onCurfew: () => void
  /** where the boy is standing, in backdrop fractions — for the step he promised to hold */
  playerAt: () => { x: number; y: number } | null
  /** where the step is */
  spotAt: () => { x: number; y: number } | null
}

export type DerbyBoard = {
  homeHe: string
  awayHe: string
  homeScore: number
  awayScore: number
  labelHe: string
  scored: boolean
  over?: boolean
}

/** game minutes per real second — forty minutes of basketball in a little over two */
const PACE = 0.3
const QUARTER = 10
const HALF_AT = 20
const FULL = 40

/** what the clock in the corner says at each phase change, in day-minutes */
const CLOCK_AT: Record<DerbyPhase, number> = {
  warmup: 20 * 60,
  q1: 20 * 60 + 5,
  q2: 20 * 60 + 32,
  half: 20 * 60 + 55,
  q3: 21 * 60 + 8,
  q4: 21 * 60 + 30,
  over: 21 * 60 + 55,
}

/**
 * הרעש — what the hall does, minute by minute, without ever saying what happened.
 *
 * A mood is a fact about eight hundred people in a tin shed and is therefore ours to
 * author; a basket is a fact about a game and is not. Read the list as a night: it
 * starts tight, it goes up, it goes quiet in the way a home crowd goes quiet, and it
 * comes back.
 */
const BEATS: Array<{ minute: number; mood: DerbyMood; textHe: string; big?: number }> = [
  { minute: 1, mood: 'tense', textHe: 'הכול קם בבת אחת. אתה לא רואה כלום חוץ מגבות, ואז נפתח חלון בין שתי כתפיים.' },
  { minute: 4, mood: 'loud', textHe: 'הגג עושה רעש. באמת — הפח מעל הראש מרעיד את האור.' },
  { minute: 8, mood: 'eruption', textHe: 'האולם מתפוצץ. מישהו מאחוריך תופס לך את הכתף ומנער אותה, ולא מכיר אותך.', big: 1.3 },
  { minute: 13, mood: 'chant', textHe: 'משהו מתחיל בצד שלכם. קודם שניים, אחר כך כולם.' },
  { minute: 18, mood: 'nervous', textHe: 'שקט מוזר. שמונה מאות אנשים נושמים באותו קצב.' },
  { minute: 21, mood: 'loud', textHe: 'המחצית נגמרה מהר מדי. כולם מדברים בבת אחת ואף אחד לא מקשיב.' },
  { minute: 25, mood: 'chaos', textHe: 'צעקות מהיציע ממול. מישהו זורק כובע. הסדרן מרים אותו ומחזיר.' },
  { minute: 29, mood: 'nervous', textHe: 'האיש שלידך מפסיק לצעוק ומתחיל למלמל. זה הרבה יותר מפחיד.' },
  { minute: 33, mood: 'eruption', textHe: 'האולם קם שוב, וגם אתה, ואתה אפילו לא יודע על מה.', big: 1.35 },
  { minute: 37, mood: 'chaos', textHe: 'כל האולם על הרגליים. אף אחד לא יושב יותר הערב.', big: 1.2 },
]

/** 1..20 in words, for the one number this chapter is allowed to say out loud */
const NUMERAL_HE = [
  'אפס', 'אחד', 'שניים', 'שלושה', 'ארבעה', 'חמישה', 'שישה', 'שבעה', 'שמונה', 'תשעה', 'עשר',
  'אחד עשר', 'שנים עשר', 'שלושה עשר', 'ארבעה עשר', 'חמישה עשר', 'שישה עשר', 'שבעה עשר',
  'שמונה עשר', 'תשעה עשר', 'עשרים',
]

/**
 * ההפרש — the margin, in a word, read off the anchor and nowhere else.
 *
 * It is spoken exactly once in the whole chapter: a boy whispers it across a classroom
 * the next morning (§46). That is why it is computed here, beside the board, instead of
 * being typed into a line of dialogue — the sentence in `chapter1991.ts` is built from
 * this, and if the archive ever stops holding the match, the whisper changes rather than
 * lies.
 */
export function derbyMarginHe(anchor: HistoricalAnchor): string | null {
  const match = anchor.match
  if (!match) return null
  const margin = Math.abs(match.scoredFor - match.scoredAgainst)
  if (margin <= 0) return null
  return NUMERAL_HE[margin] ?? String(margin)
}

export function derbyFinalBoard(anchor: HistoricalAnchor): DerbyBoard | null {
  const match = anchor.match
  if (!match) return null
  return {
    homeHe: match.atHome ? US_HE : match.opponentHe,
    awayHe: match.atHome ? match.opponentHe : US_HE,
    homeScore: match.atHome ? match.scoredFor : match.scoredAgainst,
    awayScore: match.atHome ? match.scoredAgainst : match.scoredFor,
    labelHe: 'סיום',
    scored: true,
    over: true,
  }
}

export class DerbyNight {
  private minute = 0
  private acc = 0
  private phase: DerbyPhase = 'warmup'
  private beat = 0
  private saidCurfew = false
  private chanted = false
  private checkedSpot = false

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ctx: LifeContext,
    private readonly anchor: HistoricalAnchor,
    private readonly hooks: DerbyHooks,
  ) {}

  /**
   * הטיפ-אוף — and the first thing it does is decide whether the step was held.
   *
   * The promise Amit extracted before the doors opened (`spot:asked`) is settled by
   * WHERE THE BOY IS STANDING when the whistle goes, not by a dialogue choice: a place
   * you say you will hold and then wander off from is a place you did not hold. That is
   * the physical version of the brief's §36, and it is the only failure in this chapter
   * that the player produces with his feet.
   */
  start() {
    const state = this.ctx.engine.state
    this.phase = 'q1'
    this.settleSpot()
    // 11.3.1991 is a derby, and the derby is the one night the chant goes over the bed
    this.ctx.bus.emit('sound', { kind: 'derby', on: true })
    this.ctx.bus.emit('sound', { kind: 'whistle', blasts: 1 })
    this.ctx.bus.emit('toast', {
      text: state.flags['missed:tipoff']
        ? 'מהמסדרון: רעש אחד גדול. התחילו בלעדיך.'
        : 'טיפ־אוף. האולם הזה קטן בהרבה ממה שזכרת, וזה בדיוק העניין.',
      tone: 'red',
    })
    this.hooks.onMood('tense')
    // No board. There is nothing to put on it that the archive holds.
    this.hooks.onBoard(null)
  }

  private settleSpot() {
    if (this.checkedSpot) return
    this.checkedSpot = true
    const state = this.ctx.engine.state
    if (!state.flags['spot:asked'] || state.flags['spot:held'] || state.flags['spot:lost']) return
    const boy = this.hooks.playerAt()
    const spot = this.hooks.spotAt()
    if (!boy || !spot) return
    const near = Math.abs(boy.x - spot.x) < 0.09
    this.ctx.engine.dispatch({ t: 'flag.raised', flag: near ? 'spot:held' : 'spot:lost' })
    this.ctx.bus.emit('toast', {
      text: near
        ? 'עמית חוזר ומוצא אותך בדיוק איפה שהשאיר אותך. הוא לא אומר תודה. הוא נדחף פנימה לידך.'
        : 'עמית חוזר, ובמקום שלכם עומדים שני אנשים גדולים ממנו. הוא מסתכל עליך. לא אומר כלום.',
      tone: 'plain',
    })
  }

  tick(delta: number) {
    if (this.phase === 'over') return
    this.acc += (delta / 1000) * PACE
    while (this.acc >= 1) {
      this.acc -= 1
      this.advance()
    }
  }

  private advance() {
    this.minute += 1

    if (this.phase === 'q1' && this.minute >= QUARTER) this.toPhase('q2')
    else if (this.phase === 'q2' && this.minute >= HALF_AT) this.toPhase('half')
    else if (this.phase === 'half' && this.minute >= HALF_AT + 4) this.toPhase('q3')
    else if (this.phase === 'q3' && this.minute >= HALF_AT + 4 + QUARTER) this.toPhase('q4')
    else if (this.phase === 'q4' && this.minute >= FULL + 4) {
      this.horn()
      return
    }

    const next = BEATS[this.beat]
    if (next && this.minute >= next.minute) {
      this.beat += 1
      this.hooks.onMood(next.mood)
      this.ctx.bus.emit('toast', { text: next.textHe, tone: next.mood === 'nervous' ? 'plain' : 'red' })
      if (next.mood === 'eruption' || next.mood === 'chaos') {
        this.ctx.bus.emit('sound', { kind: 'roar', big: next.big ?? 1 })
        this.scene.cameras.main.shake(520, 0.005)
      }
      if (next.mood === 'chant' && !this.chanted) {
        this.chanted = true
        this.scene.time.delayedCall(900, () => this.ctx.dialogue.start('derby:chant'))
      }
    }
  }

  private toPhase(phase: DerbyPhase) {
    this.phase = phase
    const state = this.ctx.engine.state
    const wanted = CLOCK_AT[phase]
    if (wanted > state.minute) this.ctx.engine.dispatch({ t: 'clock.advanced', minutes: wanted - state.minute })

    if (phase === 'half') {
      this.ctx.bus.emit('sound', { kind: 'whistle', blasts: 2 })
      this.ctx.bus.emit('toast', { text: 'מחצית. חצי אולם יוצא לעשן, חצי אולם נשאר לריב על מה שקרה.', tone: 'plain' })
      this.hooks.onMood('loud')
      return
    }
    if (phase === 'q4') {
      this.curfew()
      return
    }
    this.ctx.bus.emit('sound', { kind: 'whistle', blasts: 1 })
  }

  /**
   * תשע וחצי — the middle of the chapter, and it is a clock and not a menu.
   *
   * Nothing is asked and nothing is offered. The hour Rachel named arrives on the HUD,
   * the flag goes up, one short beat plays, and the door is where it always was. Staying
   * is a choice made by not walking; leaving is a choice made by walking. The scene reads
   * the flag when the boy goes through the door (`curfew:kept`) and this director reads it
   * at the horn (`curfew:broken`) — and neither of them ever prints a consequence.
   */
  private curfew() {
    if (this.saidCurfew) return
    this.saidCurfew = true
    const state = this.ctx.engine.state
    // A boy nobody set a time for cannot break one. The permission route and the sneak
    // route both set it; the "never asked" route does not.
    if (!state.flags['permission:yes'] && !state.flags['sneak:ready']) {
      this.ctx.bus.emit('sound', { kind: 'whistle', blasts: 1 })
      return
    }
    this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'curfew:now' })
    this.ctx.bus.emit('sound', { kind: 'whistle', blasts: 1 })
    this.hooks.onCurfew()
    this.scene.time.delayedCall(600, () => this.ctx.dialogue.start('derby:curfew'))
  }

  /** the horn — the ONE moment a number appears, and it comes off the archive */
  private horn() {
    this.phase = 'over'
    const state = this.ctx.engine.state
    this.ctx.bus.emit('sound', { kind: 'whistle', blasts: 3 })
    this.ctx.bus.emit('sound', { kind: 'roar', big: 1.5 })
    this.hooks.onMood('victory')
    this.hooks.onBoard(derbyFinalBoard(this.anchor))
    const events: LifeEvent[] = [
      { t: 'flag.raised', flag: 'derby:over' },
      { t: 'anchor.attended', anchorId: this.anchor.id },
      { t: 'redheart.changed', key: 'basketballLove', delta: 14 },
      { t: 'redheart.changed', key: 'community', delta: 8 },
    ]
    if (state.flags['curfew:now'] && !state.flags['curfew:kept']) {
      events.push({ t: 'flag.raised', flag: 'curfew:broken' })
    }
    this.ctx.engine.dispatch(...events)
    this.hooks.onOver()
  }

  /** the boy walked out while it was still going — the rest happens without him */
  leaveEarly() {
    if (this.phase === 'over') return
    this.phase = 'over'
    this.ctx.engine.dispatch(
      { t: 'flag.raised', flag: 'curfew:kept' },
      { t: 'flag.raised', flag: 'heard:wall' },
      { t: 'relationship.changed', who: 'rachel', axis: 'trust', delta: 6 },
    )
  }

  /** what the wall said, for the scene that is standing outside it */
  static wallLines(): Say[] {
    return [
      { who: null, text: 'הרחוב. האוויר קר אחרי האולם, והחולצה שלך רטובה מבפנים.' },
      { who: null, text: 'ואז הקיר רועד. גל אחד, ארוך, עולה ולא נגמר — ואחריו עוד אחד.' },
      { who: null, text: 'אתה עומד באמצע המדרכה ומקשיב לזה עד הסוף, כמו שמקשיבים לרדיו.' },
    ]
  }

  /** the truth, for the tests and for nobody in the hall */
  debugState() {
    return { minute: this.minute, phase: this.phase, beat: this.beat, curfew: this.saidCurfew }
  }
}

/**
 * הערב מרחוק — §31, and it is not a lesser version of the night.
 *
 * A player who was refused, or who chose the homework, or who simply did not go, still
 * spends this evening inside the same history. He hears it the way a house hears it: a
 * radio in the kitchen, a neighbour's window, the noise of a whole building reacting one
 * second before the radio does. The same anchor resolves it; the same flag ends it; the
 * Red Box keeps a clipping instead of a piece of paper from a stand.
 */
export class DerbyFromAfar {
  private step = 0

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ctx: LifeContext,
    private readonly anchor: HistoricalAnchor,
    private readonly onOver: () => void,
  ) {}

  private static readonly BEATS: Array<{ afterMs: number; textHe: string; roar?: number }> = [
    { afterMs: 4000, textHe: 'מהמטבח: רדיו. הקול של הקריין עולה בחצי טון ואז חוזר.' },
    { afterMs: 18000, textHe: 'מהבניין ממול, מישהו צועק מהחלון. ואז עוד מישהו, קומה מעל.', roar: 0.8 },
    { afterMs: 34000, textHe: 'שקט ארוך ברדיו. אתה מסתכל על המכשיר כאילו זה יעזור.' },
    { afterMs: 48000, textHe: 'כל הבניין. באמת כל הבניין, בבת אחת.', roar: 1.3 },
  ]

  start() {
    this.ctx.bus.emit('sound', { kind: 'radio', on: true })
    for (const beat of DerbyFromAfar.BEATS) {
      this.scene.time.delayedCall(beat.afterMs, () => {
        this.ctx.bus.emit('toast', { text: beat.textHe, tone: beat.roar ? 'red' : 'plain' })
        if (beat.roar) this.ctx.bus.emit('sound', { kind: 'roar', big: beat.roar })
        this.step += 1
      })
    }
    this.scene.time.delayedCall(58000, () => {
      this.ctx.bus.emit('sound', { kind: 'radio', on: false })
      this.ctx.engine.dispatch(
        { t: 'flag.raised', flag: 'derby:over' },
        { t: 'anchor.missed', anchorId: this.anchor.id },
        { t: 'redheart.changed', key: 'basketballLove', delta: 4 },
        { t: 'wellbeing.changed', key: 'regret', delta: 8 },
      )
      this.onOver()
    })
  }

  debugState() {
    return { step: this.step }
  }
}

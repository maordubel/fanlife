import type Phaser from 'phaser'

import type { HistoricalAnchor } from '../anchors'
import { rollerFor } from '../rng'
import { US_HE } from '../match'
import type { Say } from '../content/script'
import { ParallelHistoricalDirector, PRESET_1990 } from '../history'
import { checkpointOf, onceIn, resume } from '../checkpoint'
import type { HistoricalMatchEvent } from '../history'

import type { LifeContext } from './context'

/**
 * רשת הטרנזיסטורים — the match of 12.5.1990 as an information game (brief §15–§20).
 *
 * The child does not control Hapoel. The historical match is fixed, and the only number
 * this file ever puts on a scoreboard is read off the anchor — six for us, none for
 * them, from `content/manual/matches.json` with its source attached. What the child
 * controls is what he KNOWS, and when: there is a second match forty kilometres away,
 * and whether we are going up at any given moment depends on it.
 *
 * Three states, kept apart on purpose (brief §15):
 *   · canonical — what is true, now read off `lib/life/history` rather than off a table
 *     in this file. Never shown directly.
 *   · known — what the child has actually heard, from whom, and how stale it is.
 *   · rumour — what the kids are saying, which may be right by accident.
 *
 * ── 7.9.2026: this file stopped owning history ──────────────────────────────────────
 *
 * It used to hold `GOAL_AT = [12, 29, 44, 58, 71, 84]` and a three-word model of Yavne,
 * and Maor's audit said the true thing about both: internal pacing is not the historical
 * record, and a mission about documentary information cannot keep its documents in a
 * const. Everything factual now lives in `lib/life/history/days.ts` with a source id and
 * a confidence on every claim, and everything about clocks, latency, rumour, crowd
 * knowledge and endings lives in `ParallelHistoricalDirector`, which 2.5.1998 uses too.
 *
 * What is left in this file is the only thing that was ever really 1990's: the terrace.
 * Kobi, the man who is certain and wrong, the kids, the radio that falls at the fourth
 * goal, and a boy who can arrive at his father holding news the father's radio has not
 * played yet. The pacing numbers moved to `PRESET_1990` unchanged, to the game-minute, so
 * a save from before the extraction plays exactly the chapter it always played.
 *
 * Rule 11, as it applies here: nobody on this terrace ever says a Yavne scorer or a Yavne
 * score, because no source holds either. What they say is an IMPRESSION of the race —
 * "יבנה מובילה" — which is a fallible man's sentence, not an archive claim, and the
 * archive's own note about that ground ("התוצאה במשחק יבנה לא אומתה במקור") is why it
 * has to stay that way. The director enforces the line: identifying particulars — a name,
 * a printed minute, a scoreline — reach the player only from an event marked `speakable`.
 */

export type NetBoard = {
  homeHe: string
  awayHe: string
  homeScore: number
  awayScore: number
  labelHe: string
  scored: boolean
  over?: boolean
}

export type NetHooks = {
  onBoard: (board: NetBoard | null) => void
  onOver: () => void
  onDrop: (dropped: boolean) => void
  radioAt: () => { x: number; y: number } | null
}

type Known = {
  hapoel: number
  /** how many they have scored there, as far as he has been told — -1 for "nothing yet" */
  yavne: number
  /** the game-minute the Yavne news was last refreshed, for staleness */
  yavneAt: number
  /** which source told him last */
  from: string | null
}

const YAVNE_UNKNOWN = 'לא יודעים כלום על יבנה.'
const US = 'הפועל-תל-אביב'
const THEM = 'מכבי-יבנה'
const HOME = 'bloomfield'
const AWAY = 'yavne'
const CHAPTER = '1990'
const DAY_ID = '1990-05-12'

/** real seconds the dropped radio waits on the concrete */
const DROP_WINDOW_MS = 42000

export class TransistorNet {
  private readonly director = new ParallelHistoricalDirector(PRESET_1990)
  private goals = 0
  private known: Known = { hapoel: 0, yavne: -1, yavneAt: -1, from: null }
  private lastBoard = ''
  private dropAt: number | null = null
  private dropClock = 0
  private saidSix = false
  private halfSaid = false
  private over = false

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ctx: LifeContext,
    private readonly anchor: HistoricalAnchor,
    private readonly hooks: NetHooks,
  ) {}

  static finalBoard(anchor: HistoricalAnchor): NetBoard | null {
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

  /**
   * `dayMinute` is the day clock at the moment the boy reaches the terrace. Before
   * kickoff the match starts from nothing; after it, the network picks up mid-match —
   * the goals already scored are on the board, the phase is where the clock says — so a
   * boy the stewards let in at half-time (the old Israeli mercy: the gates open for the
   * second half) walks into a match that has been happening without him, which is the
   * brief's whole point about history not waiting.
   */
  start(dayMinute = 0, kickoff = 0) {
    /**
     * הרצה מחדש באמצע — a reload in the eighty-first minute used to replay the fourth
     * goal, and with it the roar, the falling radio and two points of football love the
     * boy had already been given. The checkpoint puts the needle back instead; if it is
     * stale, or from another chapter, or from a life that has since moved on, it is
     * refused and the day starts from the day clock exactly as it always did.
     */
    if (resume(this.director, this.ctx.engine.marked(), CHAPTER, this.ctx.engine.log().length)) {
      this.goals = Math.min(this.anchor.match?.scoredFor ?? 0, this.director.goalsFor(HOME, US))
      this.halfSaid = this.director.playedMinute() >= 45
      this.known = { ...this.known, hapoel: this.goals, from: this.goals ? 'הרחוב' : null }
      this.ctx.bus.emit('toast', { text: 'המשחק ממשיך מאיפה שהיה.', tone: 'plain' })
      this.ctx.bus.emit('sound', { kind: 'radio', on: true })
      this.pushBoard()
      return
    }
    const elapsed = Math.max(0, Math.min(99, dayMinute - kickoff))
    if (elapsed > 0) {
      this.director.seek(elapsed)
      const total = this.anchor.match?.scoredFor ?? 0
      this.goals = Math.min(total, this.director.goalsFor(HOME, US))
      this.halfSaid = this.director.playedMinute() >= 45
      // What he knows is what he heard on the way in: the score, from nobody in particular.
      this.known = { ...this.known, hapoel: this.goals, from: this.goals ? 'הרחוב' : null }
      const half = this.director.phaseOf(HOME) === 'half'
      this.ctx.bus.emit('toast', { text: half ? 'מחצית. באת באמצע.' : 'באת באמצע. הרעש אמר לך את הרוב.', tone: 'red' })
    } else {
      this.ctx.bus.emit('toast', { text: 'המשחק מתחיל. הרדיו של אבא מדבר.', tone: 'red' })
      this.ctx.bus.emit('sound', { kind: 'whistle', blasts: 1 })
    }
    this.ctx.bus.emit('sound', { kind: 'radio', on: true })
    this.pushBoard()
  }

  /** Called every frame by the scene, with real milliseconds. */
  tick(delta: number) {
    if (this.over) return
    for (const signal of this.director.advance(delta)) {
      if (signal.k === 'phase') {
        if (signal.phase === 'half') {
          this.ctx.bus.emit('sound', { kind: 'whistle', blasts: 2 })
          this.halftime()
        } else if (signal.phase === 'second') {
          this.ctx.bus.emit('sound', { kind: 'whistle', blasts: 1 })
          this.ctx.bus.emit('toast', { text: 'מחצית שנייה.', tone: 'plain' })
        } else if (signal.phase === 'over') {
          this.finish()
          return
        }
        this.mark()
      }
      if (signal.k === 'event' && signal.event.venueId === HOME && signal.event.type === 'goal') {
        const total = this.anchor.match?.scoredFor ?? 0
        if (this.goals < total) {
          this.goals += 1
          this.ctx.bus.emit('sound', { kind: 'roar' })
          this.goal()
        }
      }
    }
    this.pushBoard()
    if (this.dropAt !== null) {
      this.dropClock += delta
      if (this.dropClock > DROP_WINDOW_MS) this.loseRadio()
    }
  }

  /** stash the needle — on goals and on whistles, not on frames */
  private mark() {
    this.ctx.engine.mark(checkpointOf(CHAPTER, DAY_ID, this.director, this.ctx.engine.log().length))
  }

  private finish() {
    this.over = true
    this.ctx.engine.mark(null)
    this.ctx.bus.emit('sound', { kind: 'whistle', blasts: 3 })
    this.ctx.bus.emit('sound', { kind: 'roar', big: 1.4 })
    this.ctx.bus.emit('sound', { kind: 'radio', on: false })
    this.hooks.onBoard(TransistorNet.finalBoard(this.anchor))
    this.hooks.onOver()
  }

  /** how many they have scored at the other ground — the truth, and only the tests see it */
  private yavneNow(): number {
    return this.director.goalsFor(AWAY, THEM)
  }

  /** what a given channel is able to say about the other ground right now */
  private yavneOn(channelId: string): { margin: number; lineHe: string; event: HistoricalMatchEvent | null } {
    const rows = this.director.heardOn(channelId, AWAY)
    const margin = rows.filter((e) => e.type === 'goal' && e.teamSlug === THEM).length
    const spoken = [...rows].reverse().find((e) => e.lineHe)
    return { margin, lineHe: spoken?.lineHe ?? YAVNE_UNKNOWN, event: spoken ?? null }
  }

  /** the one question, answered from CANONICAL state — the child never sees this directly */
  private promotedNow(): boolean {
    return this.goals > this.yavneNow()
  }

  /** …and from what he KNOWS, which is what he shouts */
  private promotedKnown(): boolean | null {
    if (this.known.yavne < 0) return null
    return this.known.hapoel > this.known.yavne
  }

  private goal() {
    const state = this.ctx.engine.state
    this.known.hapoel = this.goals
    this.scene.cameras.main.flash(420, 255, 252, 246)
    this.scene.cameras.main.shake(500, 0.006)
    this.ctx.bus.emit('toast', { text: this.goals === 1 ? 'שער! היציע קופץ.' : 'עוד אחד!', tone: 'red' })
    // exactly once in a life, whatever a reload does to the needle
    const love = onceIn(state, `1990:goal:${this.goals}`, [{ t: 'redheart.changed', key: 'footballLove', delta: 2 }])
    if (love.length) this.ctx.engine.dispatch(...love)
    this.mark()

    // The child who did the arithmetic wrong celebrates too early (brief §16).
    if (this.goals === 1 && state.flags['math:wrong'] && !state.flags['net:tooEarly']) {
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'net:tooEarly' })
      this.say([
        { who: 'פוגי', text: 'עלינו!' },
        { who: 'אוהד', text: 'עוד לא!' },
        { who: null, text: 'הוא לא מסתכל עליך. הוא מסתכל על הרדיו של מישהו אחר.' },
      ])
    }
    // The fourth is the one the radio does not survive (brief §19).
    if (this.goals === 4 && !state.flags['radio:lost'] && !state.flags['radio:saved']) {
      this.dropRadio()
    }
    // The sixth is the release — and the callback (brief §20).
    if (this.goals === 6 && state.flags['math:six'] && !this.saidSix) {
      this.saidSix = true
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'net:six' })
      // §24: at 6:0 the radio is worth nothing and the ground is worth everything
      this.ctx.bus.emit('sound', { kind: 'listen', weight: 1 })
      this.scene.time.delayedCall(1400, () =>
        this.say([
          { who: null, text: 'שש. הוא מסתובב אליך לאט.' },
          { who: 'קובי', text: 'אל תגיד כלום.' },
          { who: null, text: 'אתה מחייך. לא אומר כלום.' },
        ]),
      )
    }
  }

  private halftime() {
    if (this.halfSaid) return
    this.halfSaid = true
    this.ctx.bus.emit('toast', { text: 'מחצית. כולם מחשבים. אף אחד לא מסכים.', tone: 'plain' })
    /**
     * הפתק (implementation pass 27.9.2026, B1 S3). Half-time is the fifteen minutes the
     * terrace does arithmetic, and the boy has a pencil and the margin of a newspaper. The
     * box offers the note; the note itself is `board:notebook-1990` over the paused ground,
     * and whatever is on it is read by Kobi, by the whistle and by a phone after it.
     */
    if (!this.ctx.engine.state.flags['net:noted']) this.ctx.dialogue.start('net-half-1990')
  }

  private dropRadio() {
    if (!this.hooks.radioAt()) return
    this.dropAt = this.director.playedMinute()
    this.dropClock = 0
    this.hooks.onDrop(true)
    this.say([
      { who: null, text: 'בקפיצה של השער הרביעי משהו נופל. שחור, קטן. הרדיו של אבא, בין הרגליים, בין הניירות.' },
      { who: 'קובי', text: 'הרדיו! פוגי — הרדיו!' },
    ])
  }

  private loseRadio() {
    this.dropAt = null
    this.hooks.onDrop(false)
    this.ctx.engine.dispatch(
      { t: 'flag.raised', flag: 'radio:lost' },
      { t: 'relationship.changed', who: 'kobi', axis: 'tension', delta: 2 },
    )
    this.say([
      { who: null, text: 'מישהו דרך עליו. ואז עוד מישהו. כשהגעת, נשארה רק האנטנה.' },
      { who: 'קובי', text: 'עזוב. תשאל אנשים. היום כולם רדיו.' },
    ])
  }

  /** the hotspot on the concrete was tapped */
  private saveRadio() {
    if (this.dropAt === null) return
    const quick = this.dropClock < DROP_WINDOW_MS * 0.45
    this.dropAt = null
    this.hooks.onDrop(false)
    this.ctx.engine.dispatch(
      { t: 'flag.raised', flag: 'radio:saved' },
      { t: 'item.gained', item: 'transistor' },
      { t: 'redheart.changed', key: 'familyTradition', delta: 4 },
    )
    this.say(
      quick
        ? [
            { who: null, text: 'האנטנה עוד יותר מכופפת. הוא עובד.' },
            { who: 'קובי', text: 'יופי. תחזיק אותו אתה. יש לך ידיים יותר טובות.' },
          ]
        : [
            { who: null, text: 'מצאת אותו מתחת לנעל של מישהו. הוא עובד. בערך. בין רעש לרעש.' },
            { who: 'קובי', text: 'תחזיק חזק. ותקרב לאוזן.' },
          ],
    )
  }

  /**
   * מה הוא אמר? — a source, spoken to. Everything here is generated from the three
   * states above and from the channel's latency; nothing is a line about a number the
   * archive does not hold.
   */
  talk(id: string) {
    const state = this.ctx.engine.state
    const roll = rollerFor(state)
    if (id === 'net:floor') {
      this.saveRadio()
      return
    }
    if (this.over) return

    if (id === 'net:kobi') {
      const lost = Boolean(state.flags['radio:lost'])
      // a rescued transistor — or one handed over because the boy's note was clean — is at the ear
      const held = Boolean(state.flags['radio:saved']) || Boolean(state.flags['net:handed'])
      const mine = this.yavneOn('radio')
      const fresh = this.known.from === 'radio' && this.known.yavneAt > this.director.playedMinute() - 4 && this.known.yavne !== this.yavneOn('kobi').margin
      if (fresh && !state.flags['net:toldKobi']) {
        // He knows something his father's radio has not played yet (brief §17).
        this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'net:toldKobi' })
        this.say([
          { who: 'פוגי', text: `אבא — ${mine.lineHe}` },
          { who: 'קובי', text: 'מאיפה אתה יודע?' },
          { who: 'פוגי', text: 'הרדיו של ההוא.' },
          { who: null, text: 'הוא מסתכל עליך שנייה יותר מדי. ואז מקרב את הרדיו שלו לאוזן, לבדוק.' },
        ])
        return
      }
      if (lost) {
        this.say([{ who: 'קובי', text: 'אין רדיו. תלך תשמע ותחזור. אתה הרדיו שלי עכשיו.' }])
        return
      }
      // a rescued transistor is a transistor held to the ear: no lag left in it at all
      const heard = held ? this.yavneOn('kobi-held') : this.yavneOn('kobi')
      this.learn(heard, 'kobi')
      const answer = this.promotedKnown()
      this.say([
        { who: 'קובי', text: heard.lineHe },
        { who: 'קובי', text: answer === null ? 'אז עוד לא יודעים.' : answer ? 'אז כרגע — עולים. כרגע.' : 'אז כרגע — לא. צריך עוד.' },
      ])
      return
    }
    if (id === 'net:radio') {
      // Crowd noise: sometimes you hear nothing, and you stand closer and try again.
      if (roll.chance(0.25)) {
        this.ctx.engine.dispatch({ t: 'rng.consumed', count: roll.consumed })
        this.say([{ who: null, text: 'הרדיו שלו מתחת לרעש. שומעים "…יבנה…" ולא יותר. תתקרב, תנסה שוב.' }])
        return
      }
      this.ctx.engine.dispatch({ t: 'rng.consumed', count: roll.consumed })
      const heard = this.yavneOn('radio')
      this.learn(heard, 'radio')
      this.say([
        { who: null, text: 'אתה מקרב את הראש לרדיו שלו. הוא לא זז. ככה זה היום.' },
        { who: 'אוהד עם רדיו', text: heard.lineHe },
      ])
      return
    }
    if (id === 'net:brain') {
      // he is repeating the slow radio and does not know it — `repeats: 'radio'` in the preset
      if (!state.flags['net:src:brain']) this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'net:src:brain' })
      const heard = this.yavneOn('brain')
      const up = this.goals > heard.margin
      this.say([
        { who: 'אוהד שיודע', text: up ? 'לפי החשבון שלי — עולים. אבל החשבון שלי לפי הרדיו של ההוא, והרדיו של ההוא איטי.' : 'לפי החשבון שלי — עוד לא. צריך עוד אחד לפחות. אולי שניים.' },
        { who: null, text: 'הוא בטוח. הוא תמיד בטוח. זה לא אומר שהוא צודק.' },
      ])
      return
    }
    if (id === 'net:kids' || id === 'net:ofir') {
      const truth = this.yavneOn('kids')
      const wrong = roll.chance(0.5)
      this.ctx.engine.dispatch({ t: 'rng.consumed', count: roll.consumed })
      const text = wrong
        ? roll.pick(['יבנה מפסידה! שמעתי!', 'נתניה השוותה, אח שלי אמר!', 'ביבנה עצרו את המשחק!']) ?? 'יבנה מפסידה!'
        : truth.lineHe
      this.ctx.engine.dispatch({ t: 'flag.set', flag: 'rumor:last', value: text })
      if (truth.event) this.director.learn(truth.event, 'kids', wrong)
      const who = id === 'net:ofir' ? 'אופיר' : 'ילד'
      this.say([
        { who, text },
        { who: null, text: wrong ? 'הוא שמע את זה ממישהו ששמע את זה ממישהו.' : 'הוא צודק, במקרה. גם הוא לא יודע את זה.' },
      ])
      return
    }
  }

  private learn(heard: { margin: number; lineHe: string; event: HistoricalMatchEvent | null }, from: string) {
    this.known.yavne = heard.margin
    this.known.yavneAt = this.director.playedMinute()
    this.known.from = from
    if (heard.event) this.director.learn(heard.event, from)
    /**
     * המיקס מתהפך — Mission 01 §24, and the cheapest drama in the chapter.
     *
     * The instant somebody is actually listening to the other match, Bloomfield drops to
     * a third of itself and comes back over the next few seconds. Nothing is said about it
     * and nothing on the glass changes; the ears do the work. Late on — when a single
     * result is the whole question — the ground drops almost to silence instead.
     */
    const late = this.director.playedMinute() >= 80
    this.ctx.bus.emit('sound', { kind: 'listen', weight: late ? 0.08 : 0.3 })
    this.scene.time.delayedCall(late ? 5200 : 3000, () => {
      if (!this.over) this.ctx.bus.emit('sound', { kind: 'listen', weight: 1 })
    })
    // The banner on the glass reads one fact — "has he heard anything yet" — and every
    // source in this chapter passes through here, so it is raised in one place.
    if (!this.ctx.engine.state.flags['net:heard']) {
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'net:heard' })
    }
    this.ctx.engine.dispatch({ t: 'flag.set', flag: 'net:known', value: heard.lineHe }, { t: 'flag.set', flag: 'net:known:from', value: from })
  }

  private say(lines: Say[]) {
    this.ctx.dialogue.startLines(lines)
  }

  pushBoard() {
    const match = this.anchor.match
    if (!match) return
    const phase = this.director.phaseOf(HOME)
    const label = phase === 'first' || phase === 'before' ? 'מחצית ראשונה' : phase === 'half' ? 'מחצית' : phase === 'second' ? 'מחצית שנייה' : 'סיום'
    const board: NetBoard = {
      homeHe: match.atHome ? US_HE : match.opponentHe,
      awayHe: match.atHome ? match.opponentHe : US_HE,
      homeScore: match.atHome ? this.goals : 0,
      awayScore: match.atHome ? 0 : this.goals,
      labelHe: label,
      scored: this.goals > 0,
      over: this.over,
    }
    const signature = `${label}|${this.goals}`
    if (signature === this.lastBoard) return
    this.lastBoard = signature
    this.hooks.onBoard(board)
  }

  /** the truth, for the tests and for nobody on the terrace */
  debugState() {
    return {
      minute: this.director.playedMinute(),
      phase: this.director.phaseOf(HOME),
      goals: this.goals,
      yavne: this.yavneNow(),
      promoted: this.promotedNow(),
      known: { ...this.known },
      history: this.director.debug(),
    }
  }
}

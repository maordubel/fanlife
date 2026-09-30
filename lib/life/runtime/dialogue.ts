import { resolveSpeaker } from '../partner'
import { DEFAULT_IDENTITY, ITEM_ART } from '../content/chapter1986'
import type { HistoricalAnchor } from '../anchors'
import { bookFor, bookPageFlag } from '../books'
import { DIALOGUE } from '../content/dialogue'
import { anchorFor, eraFor, type AnchorSet } from '../content/era'
import type { Branch, ChoiceDef, Conversation, ConversationShot, Effect, Say } from '../content/script'
import type { LifeEngine } from '../engine'
import type { LifeEvent } from '../events'
import { acceptEvents, isAvailable, resolveOutcome } from '../opportunities'
import { keepEvents, pickRedBoxItem } from '../redbox'
import { meets } from '../world/types'
import { resolveFollowUp, speakerOf, type FollowUpPick } from '../world/followUp'
import type { LifeState } from '../types'
import { BACKDROP, DOC } from './art'

import type { DialogueChoice, LifeBus } from './bus'
import { describeMoneyChange } from '../money'
import { cardForName, metFlag } from '../castCards'
import { knownBy, ownedShirts, shirtById, shirtFlag } from '../shirts'
import {
  haveOf,
  holderOf,
  duplicates,
  missingOn,
  keptOnClose,
  setSoldIn,
  stickerFlag,
  stickerFor,
  ALBUM_SEEN,
  closesPage,
  purchasePacket,
} from '../stickers'
import { CONSEQUENCE_KICKER_HE, scheduleLater } from '../consequence'
import { characterName, portraitFor } from '../characters'
import { flagOn } from '../types'
import { ACTIVITY, CROWD_FLAG, isActivityId, isStageA, payShekels, pickContent, seedFor, windowFor, type MechanicRequest } from '../activities'
import { EMPTY_CATALOG, type MechanicCatalog } from '../../mechanics/types'
import type { CharacterId } from '../types'
import {
  acceptEvents as acceptRouteStage,
  conflictEvents,
  leaveEvents as leaveRoute,
  type RouteId,
} from '../routes'

/**
 * *"תקרת אירוע מוניטין חיובי +5 ושלילי −8."* Both live here rather than in the content,
 * because a cap a content file is trusted to respect is a cap that is one delta away
 * from being widened by somebody who never read the sentence it came from.
 */
const POSITIVE_REPUTATION_CAP = 5
const NEGATIVE_REPUTATION_CAP = 8

/**
 * מנהל השיחה — reads the content, writes to the life, and stops there.
 *
 * A conversation is data (`content/dialogue.ts`); this walks it. The separation is what
 * keeps rule 7 of the brief enforceable: dialogue can hand out money, an item, a flag or
 * twenty minutes, and it CANNOT do anything else — there is no effect in the vocabulary
 * that moves the player, opens a door or wins the chapter without the world agreeing.
 *
 * Effects that leave the conversation (`travel`, `minigame`, `ending`) are not applied
 * here at all: they are handed to the scene through hooks, because a text box has no
 * business changing scene and a runtime that lets it will eventually do it mid-line.
 */

export type DialogueHooks = {
  travel(to: string, spawn: string): void
  minigame(id: string): void
  ending(id: string): void
  /** the scene stops the world while this is true */
  onOpen(open: boolean): void
  /**
   * מי שמדבר ואינו בחדר — ואינו בטלפון, ואין לשיחה מקום אחר (`Conversation.where`). הסצנה
   * מכניסה אותו לצד פוגי לאורך השיחה, אם יש לו גוף בשנים האלה (`world/castFigures.ts`).
   */
  cast?(names: readonly string[]): void
  /** how this beat is framed; the scene owns the camera, the content owns the shot */
  shot?(shot: ConversationShot | null): void
  /**
   * Where this speaker is standing, as a fraction of the camera's view, or null.
   *
   * A runner cannot know: it holds words and effects and has never heard of a camera.
   * The scene can, and it is the only thing that can, so this is a hook like every other
   * question about the world (`travel`, `shot`) rather than a field on a line.
   */
  anchorFor?(who: string | null): number | null
  /** turn the camera to this speaker if he is standing outside the shot (21.9.2026) */
  meet?(who: string | null): void
}

/** the people a boy does not "meet": his parents, the friends from the alley, the neighbour, the kiosk */
const KNOWN_FROM_HOME: ReadonlySet<string> = new Set(['kobi', 'rachel', 'ofir', 'amit', 'efi', 'keren', 'ilan', 'rafi'])

/**
 * שנייה, שלישית — "dialogue that already happened must not repeat", Maor, 6.9.2026.
 *
 * A conversation is data with one branch and no `when`, most of the time — a boy examines
 * a poster, a friend says the same line every Saturday, forever, because nothing in the
 * content ever said otherwise. `own:heard:<id>:<branch>` remembers which exact branch of
 * which exact conversation was already sat through to its end, and `start()` below checks
 * it before opening the box a second time.
 *
 * It only ever swaps the WORDS, never the outcome: a branch is only a candidate for this
 * at all when it has no `choices` (nothing interactive to lose) and its `then` opens
 * nothing the player must be free to redo (a shop, a gig, a minigame, a door) — those
 * always play in full, because closing them early would close the thing they open. Every
 * `then` effect still fires exactly as authored either way; only what is SHOWN changes.
 */
const heardFlag = (id: string, branch: number) => `own:heard:${id}:${branch}`

/** effects that open or move something the player must be free to redo in full every time */
const KEEPS_SCENE_LIVE: ReadonlySet<Effect['e']> = new Set([
  'shop', 'toto', 'coin', 'penalty', 'hoops', 'pitch', 'goto', 'travel', 'minigame', 'ending', 'doc', 'mechanic',
])

/**
 * קנייה היא לא חזרה (delta 90, §21 / §24.1) — a branch that is a TRADE plays in full every
 * time: a Supergoal envelope (`packet`), bottles handed over for the deposit (`take`), a
 * paper paid for (money going OUT). Shortening those to a follow-up line kept the money and
 * the goods apart — the second "מעטפת סופרגול. 1 ₪." at Rafi's said a nice sentence and sold
 * nothing, the second bag of bottles stayed in the bag. A gift (money IN, no goods back) is
 * still paid once, exactly as `REPEAT_KEEPS` says.
 */
const isTrade = (effect: Effect) =>
  effect.e === 'packet' || effect.e === 'take' || (effect.e === 'money' && effect.agorot < 0)

function opensSomething(effects: readonly Effect[] | undefined): boolean {
  return (effects ?? []).some((effect) => KEEPS_SCENE_LIVE.has(effect.e) || isTrade(effect))
}

/**
 * What a shortened repeat may still DO (§20.8: "repeated interaction cannot reopen consumed
 * rewards"). The flags a branch raises are idempotent and the world may be waiting on them,
 * so they fire again exactly as authored; a bond, a trait, a shekel, twenty minutes or a
 * toast about any of those were paid the first time and are not paid twice for pressing
 * the same button — before 25.9.2026 every re-read of "גמרת שיעורים?" was another +2 with
 * Ofir, forever.
 */
const REPEAT_KEEPS: ReadonlySet<Effect['e']> = new Set([
  'flag', 'flagValue', 'attend', 'missed', 'presence', 'gate', 'armyRoute', 'sinai', 'laces', 'route', 'conflict', 'seize',
])

export const repeatEffects = (effects: readonly Effect[] | undefined): Effect[] =>
  (effects ?? []).filter((effect) => REPEAT_KEEPS.has(effect.e))

/**
 * What opening this conversation would put on screen right now — pure over the state, so
 * the matrix fixture, the tests and `start()` all ask the same question.
 *
 * `repeat` is true when the branch was already heard to its end and nothing in it needs to
 * stay open; then `lines` are the follow-up resolver's answer (`world/followUp.ts`) instead
 * of the authored scene, and `pick` says which follow-up and which class.
 */
export type Spoken = {
  branchIndex: number
  branch: Branch
  repeat: boolean
  pick: FollowUpPick | null
  lines: readonly Say[]
}

export function spokenNow(state: LifeState, id: string): Spoken | null {
  const conversation = DIALOGUE[id]
  if (!conversation) return null
  const branchIndex = conversation.branches.findIndex((candidate) => meets(state, candidate.when))
  if (branchIndex < 0) return null
  const branch = conversation.branches[branchIndex] as Branch
  const heard = flagOn(state, heardFlag(id, branchIndex))
  const repeat = heard && !branch.choices && !opensSomething(branch.then)
  if (!repeat) return { branchIndex, branch, repeat, pick: null, lines: branch.lines }
  const who = speakerOf(branch.lines, conversation.nameHe ?? null)
  const pick = resolveFollowUp(state, eraFor(state.chapter), id, who)
  return { branchIndex, branch, repeat, pick, lines: pick.lines }
}

export class DialogueRunner {
  private conversation: Conversation | null = null
  private branchIndex = -1
  private lines: Say[] = []
  private index = 0
  private pendingChoices: ChoiceDef[] | null = null
  private pendingThen: Effect[] = []
  private onDone: (() => void) | null = null
  /** the follow-up this box is showing instead of a heard branch, if it is */
  private followUp: FollowUpPick | null = null

  constructor(
    private readonly engine: LifeEngine,
    private readonly bus: LifeBus,
    private hooks: DialogueHooks,
    private readonly fallbackAnchor: HistoricalAnchor,
    private readonly anchors: AnchorSet = {},
    /** what the archive holds before each year, with no answer in it — resolved on the server (`app/life/mechanicCatalog.ts`) */
    private readonly catalog: MechanicCatalog = EMPTY_CATALOG,
  ) {}

  /** the plates of the chapter being played — the boy's face is four years older in 1990 */
  private get portraits(): Record<string, string> {
    return eraFor(this.engine.state.chapter).portraits
  }

  /** the anchor of the chapter being played — `{anchor}` in a 1990 line is the 1990 fact */
  private get anchor(): HistoricalAnchor {
    return anchorFor(this.anchors, eraFor(this.engine.state.chapter), this.fallbackAnchor)
  }

  setHooks(hooks: DialogueHooks) {
    this.hooks = hooks
  }

  get open(): boolean {
    return this.conversation !== null
  }

  /**
   * An ad-hoc sequence with no conversation behind it — the prologue, and one day a
   * cutscene. It shares the box, the pacing and the advance button with everything else,
   * because a second way to show a line is a second way for a line to look wrong.
   */
  startLines(lines: readonly Say[], done?: () => void): void {
    this.conversation = { id: '__lines__', branches: [] }
    this.followUp = null
    this.lines = lines.map((line) => ({ ...line, text: this.fill(line.text) }))
    this.index = 0
    this.pendingChoices = null
    this.pendingThen = []
    this.onDone = done ?? null
    this.hooks.onOpen(true)
    this.show()
  }

  /**
   * Returns false when the conversation id does not exist — a missing prop talks about
   * nothing. `done` runs when the conversation closes however it closes (a beat waits
   * on it); a `goto` inside the conversation keeps the same `done`.
   */
  start(id: string, done?: () => void): boolean {
    const conversation = DIALOGUE[id]
    if (!conversation) return false
    const spoken = spokenNow(this.engine.state, id)
    if (!spoken) return false
    const { branchIndex, branch } = spoken

    // The first time you meet somebody, you meet them: the card plays over the top of the
    // conversation that opened it, and the conversation is still there when it closes.
    const card = cardForName(conversation.nameHe)
    if (card && !this.engine.state.flags[metFlag(card.id)]) {
      this.engine.dispatch({ t: 'flag.raised', flag: metFlag(card.id) })
      this.bus.emit('cast', {
        nameHe: conversation.nameHe ?? '',
        roleHe: card.roleHe,
        art: card.art,
        linesHe: card.linesHe,
        sinceHe: card.sinceHe,
      })
    }

    // Second visit to the exact same branch, and nothing here needs to stay open for a
    // choice or a door: the person answers what is going on NOW (`world/followUp.ts`) —
    // the step the live graph is on, what changed, the clock — instead of the whole scene
    // again, and only when none of that applies, a short closing line.
    const lines = spoken.lines
    this.followUp = spoken.pick

    if (done) this.onDone = done
    this.conversation = conversation
    this.branchIndex = branchIndex
    this.lines = lines.map((line) => ({ ...line, text: this.fill(line.text) }))
    this.index = 0
    this.pendingChoices = branch.choices ?? null
    this.pendingThen = spoken.repeat ? repeatEffects(branch.then) : (branch.then ?? [])
    this.hooks.onOpen(true)
    this.hooks.shot?.(branch.shot ?? null)
    if (!conversation.where) {
      const names = new Set<string>()
      for (const line of lines) {
        if (!line.who || conversation.remote?.[line.who]) continue
        const who = resolveSpeaker(line.who, this.engine.state.flags)
        if (who && who !== DEFAULT_IDENTITY.name) names.add(who)
      }
      if (names.size) this.hooks.cast?.([...names])
    }
    this.show()
    return true
  }

  /** The only substitution the content layer gets, and it is a canonical fact. */
  private fill(text: string): string {
    const filled = text.replaceAll('{anchor}', this.anchor.headlineHe)
    if (!filled.includes('{crowd')) return filled
    // the parliament's names — this chapter's crowd, rolled once when the room was built
    const names = String(this.engine.state.flags[CROWD_FLAG] ?? '').split('|').filter(Boolean)
    return filled.replace(/\{crowd(\d)\}/g, (_, n: string) => names[Number(n) - 1] ?? names[0] ?? 'אחד מהם')
  }

  advance() {
    if (!this.conversation) return
    if (this.index < this.lines.length - 1) {
      this.index += 1
      this.show()
      return
    }
    if (this.pendingChoices) {
      this.showChoices()
      return
    }
    this.finish(this.pendingThen)
  }

  choose(id: string) {
    const choice = this.pendingChoices?.find((candidate) => candidate.id === id)
    if (!choice) return
    if (!meets(this.engine.state, choice.when)) return
    this.pendingChoices = null
    // The log is a biography, so what was CHOSEN is a row in it — separately from what
    // the choice did. Nothing derives state from this; it is what makes a second
    // playthrough legible in the debug panel and to any future telemetry.
    this.engine.dispatch({
      t: 'dialogue.choice_made',
      conversation: this.conversation?.id ?? '',
      choice: choice.id,
    })
    this.finish(choice.then)
  }

  /**
   * ללכת באמצע — the player walked away, and the game let them.
   *
   * A conversation you cannot leave is the oldest trap in the genre, and this build had
   * it: talk to somebody twice, land on a branch whose choices you no longer qualify for,
   * and the box stays on screen with nothing you can press. It was reported by the person
   * who owns this game, in those words, and the fix is not a better branch — it is that
   * leaving is always allowed, on every line, in every conversation.
   *
   * Leaving applies NOTHING. No `then`, no chained node, no time. Nobody gives a child
   * anything for walking off mid-sentence, so the state after this call is exactly the
   * state before the box opened — which also means the conversation can simply be started
   * again, from its first line, by pressing the button once more.
   */
  leave() {
    if (!this.conversation) return
    this.close()
  }

  close() {
    const done = this.onDone
    this.onDone = null
    this.conversation = null
    this.followUp = null
    this.lines = []
    this.pendingChoices = null
    this.pendingThen = []
    this.bus.emit('dialogue', null)
    this.hooks.shot?.(null)
    this.hooks.onOpen(false)
    if (done) done()
  }

  private show() {
    const line = this.lines[this.index]
    if (!line) {
      this.finish(this.pendingThen)
      return
    }
    const last = this.index === this.lines.length - 1
    // `PARTNER` is resolved HERE and nowhere else, so the nameplate, the portrait and the
    // tail anchor can never disagree about who is speaking (see `lib/life/partner.ts`).
    const who = resolveSpeaker(line.who, this.engine.state.flags)
    // מי שמדבר מהטלפון אינו בחדר: אין זנב שמחפש אותו בין האנשים, יש סמל ליד השם — אלא
    // אם הוא דווקא עומד כאן, ואז הוא פשוט מדבר.
    const { anchor, via } = this.placeSpeaker(line.who, who)
    this.bus.emit('dialogue', {
      lines: [{ who, text: line.text, ...(line.closeUp ? { closeUp: line.closeUp } : {}), ...(via ? { via } : {}) }],
      portrait: who ? portraitFor(who, this.portraits) : null,
      anchor,
      where: this.conversation?.where ?? null,
      choices: last && this.pendingChoices ? this.renderChoices(this.pendingChoices) : undefined,
    })
  }

  private showChoices() {
    const line = this.lines[this.lines.length - 1]
    const who = resolveSpeaker(line?.who ?? null, this.engine.state.flags)
    const { anchor, via } = this.placeSpeaker(line?.who ?? null, who)
    this.bus.emit('dialogue', {
      lines: line ? [{ ...line, who, ...(via ? { via } : {}) }] : [],
      portrait: who ? portraitFor(who, this.portraits) : null,
      anchor,
      where: this.conversation?.where ?? null,
      choices: this.renderChoices(this.pendingChoices ?? []),
    })
  }

  /**
   * איפה הדובר — בחדר (זנב), בטלפון (סמל), או במקום אחר (`where`: אף אחד מהשניים).
   * `written` הוא ה-`who` כפי שהוא כתוב בשורה, כי `remote` נכתב בשפת התוכן (`PARTNER`).
   */
  private placeSpeaker(written: string | null, who: string | null): { anchor: number | null; via?: 'phone' | 'video' } {
    if (this.conversation?.where) return { anchor: null }
    if (!(written && this.conversation?.remote?.[written])) this.hooks.meet?.(who)
    const anchor = this.hooks.anchorFor?.(who) ?? null
    const remote = written ? this.conversation?.remote?.[written] : undefined
    return remote && anchor === null ? { anchor: null, via: remote } : { anchor }
  }

  private renderChoices(choices: readonly ChoiceDef[]): DialogueChoice[] {
    return choices.flatMap((choice) => {
      const enabled = meets(this.engine.state, choice.when)
      if (!enabled && choice.hidden) return []
      return {
        id: choice.id,
        text: choice.text,
        enabled,
        ...(enabled ? {} : { noteHe: choice.noteHe ?? '' }),
      }
    })
  }

  /** Apply, then either chain into another node or shut the box. */
  /**
   * דוכן הסופרגול בחנות — one packet, bought at the fan shop's counter.
   *
   * It goes through `finish` and deliberately NOT through `applyEffects`: `finishOutcome`
   * carries a reduced vocabulary with no `packet` case in it at all, so the obvious call
   * would have been a silent no-op — the same class of bug as the three `break`s above.
   * Routed here, the counter in the shop and Rafi at the kiosk run the identical
   * transaction, down to the seeded roll, so a packet cannot be worth more in one of them.
   *
   * Safe with no conversation open: `finish` guards its heard-flag on `this.conversation`,
   * sets no `goto`, and `close()` is a no-op when nothing is up.
   */
  buyPacket() {
    this.finish([{ e: 'packet' }])
  }

  private finish(effects: readonly Effect[]) {
    const events: LifeEvent[] = []
    // Captured before any `goto` below replaces `this.conversation` — this branch, of this
    // conversation, was just sat through to its end, so its repeat is now free to shorten.
    if (this.conversation && this.conversation.id !== '__lines__') {
      events.push({ t: 'flag.raised', flag: heardFlag(this.conversation.id, this.branchIndex) })
      // a follow-up read to its end is known now: a reaction is old news, a handoff was given
      if (this.followUp?.flag) events.push({ t: 'flag.raised', flag: this.followUp.flag })
    }
    this.followUp = null
    let goto: string | null = null
    const after: Array<() => void> = []
    /** effects an opportunity's own outcome contributed, applied in the same pass */
    const extra: Effect[] = []

    /** the last thing handed over in this list — a toast that follows it shows it */
    let handed: string | null = null
    let kept: string | null = null
    /** shekels in or out of the pocket in this list; said once at the end unless a toast already says it */
    let moneyDelta = 0
    let saidIt = false
    /** the first person this list touched who was not yet met, and the first who will remember it */
    let met: CharacterId | null = null
    let remembered: CharacterId | null = null
    const touch = (who: CharacterId) => {
      if (KNOWN_FROM_HOME.has(who)) return
      if (met === null && !this.engine.state.flags[`life:met:${who}`]) met = who
    }
    for (const effect of effects) {
      switch (effect.e) {
        case 'flag':
          events.push({ t: 'flag.raised', flag: effect.flag })
          break
        case 'money':
          events.push({ t: 'money.changed', agorot: effect.agorot, why: effect.why })
          moneyDelta += effect.agorot
          break
        case 'give':
          events.push({ t: 'item.gained', item: effect.item, count: effect.count ?? 1 })
          handed = ITEM_ART[effect.item] ?? null
          break
        case 'take':
          events.push({ t: 'item.lost', item: effect.item, count: effect.count ?? 1 })
          break
        case 'bond':
          events.push({ t: 'bond.shifted', who: effect.who, delta: effect.delta })
          break
        case 'trait':
          events.push({ t: 'trait.shifted', trait: effect.trait, delta: effect.delta })
          break
        case 'time':
          events.push({ t: 'clock.advanced', minutes: effect.minutes })
          break
        case 'memory':
          events.push({
            t: 'memory.kept',
            memory: {
              id: effect.id,
              item: effect.item,
              atMinute: this.engine.state.minute,
              year: this.engine.state.year,
              anchorId: this.anchor.id,
            },
          })
          events.push({ t: 'flag.raised', flag: 'memory:first' })
          kept = ITEM_ART[effect.item] ?? null
          break
        case 'attend':
          events.push({ t: 'anchor.attended', anchorId: this.anchor.id })
          break
        case 'missed':
          events.push({ t: 'anchor.missed', anchorId: this.anchor.id })
          break
        case 'sfx':
          after.push(() => this.bus.emit('sound', { kind: 'sample', key: effect.key, ...(effect.level !== undefined ? { level: effect.level } : {}), ...(effect.delayMs !== undefined ? { delayMs: effect.delayMs } : {}) }))
          break
        case 'plate': {
          // a dialogue may cut to a painted place, never to an arbitrary file: the key must be a backdrop
          if ((BACKDROP as readonly string[]).includes(effect.art)) {
            const { art, titleHe, ms } = effect
            const subHe = effect.subHe ?? null
            after.push(() => this.bus.emit('card', { titleHe, subHe, ms: ms ?? 2600, art }))
          }
          break
        }
        case 'consequence': {
          const text = effect.text
          after.push(() => this.bus.emit('toast', { text, tone: 'red', kickerHe: CONSEQUENCE_KICKER_HE }))
          if (effect.laterText) events.push(...scheduleLater(this.engine.state, effect.id, effect.laterText, effect.afterMinutes ?? 60))
          break
        }
        case 'toast': {
          const art = kept ?? handed
          const kickerHe = kept ? 'לקופסה האדומה' : handed ? 'קיבלת' : undefined
          saidIt = true
          after.push(() =>
            this.bus.emit('toast', {
              text: effect.text,
              tone: effect.tone ?? 'plain',
              ...(art ? { art } : {}),
              ...(kickerHe ? { kickerHe } : {}),
            }),
          )
          break
        }
        case 'book': {
          // a booklet in the registry, opened where it was last put down
          const book = bookFor(effect.id)
          if (book) {
            const at = Number(this.engine.state.flags[bookPageFlag(book.id)] ?? 0)
            // the world may notice a thing has been picked up at least once
            if (!this.engine.state.flags[book.seenFlag]) {
              this.engine.dispatch({ t: 'flag.raised', flag: book.seenFlag })
            }
            after.push(() => this.bus.emit('book', { id: book.id, page: Number.isFinite(at) ? at : 0 }))
          }
          break
        }
        case 'box':
          after.push(() => this.bus.emit('box', true))
          break

        case 'doc':
          // Only a key the art layer actually declares. A dialogue file may hold up a
          // document; it may not name an arbitrary URL and it may not name a sprite.
          if (DOC.includes(effect.art as (typeof DOC)[number])) {
            const art = effect.art
            const captionHe = effect.captionHe ?? null
            after.push(() => this.bus.emit('doc', { art, captionHe }))
          }
          break
        /**
         * A shirt is filed, and then it is HELD UP. The flag is `own:`, so it outlives
         * the day, the year and the decade; the card is the only purchase in this game
         * that stops the world for two seconds, and the first one says what it is.
         */
        case 'shirt': {
          const shirt = shirtById(effect.id)
          if (!shirt) break
          const had = ownedShirts(this.engine.state).length
          events.push({ t: 'flag.raised', flag: shirtFlag(shirt.id) })
          after.push(() =>
            this.bus.emit('shirt', {
              kind: 'bought' as const,
              art: shirt.art,
              titleHe: effect.giftHe ?? (had === 0 ? 'קנית את חולצת הפועל הראשונה שלך!' : 'עוד אחת לארון.'),
              nameHe: shirt.nameHe,
              sponsorHe: shirt.sponsorHe,
              yearsHe: shirt.yearsHe,
              noteHe: shirt.noteHe,
              have: had + 1,
              /**
               * The denominator is what EXISTS by now, not the whole archive. "1 / 40" in
               * 1985 is a promise about 2025 and reads as a mountain; "1 / 3" is the rail
               * in front of him and reads as a collection with a gap in it.
               */
              total: knownBy(this.engine.state.chapter).length,
              spec: shirt.spec ?? null,
              seasonHe: shirt.seasonLabel ?? null,
              sourceHe: shirt.sourceHe ?? null,
            }),
          )
          break
        }
        /** the rail, as a screen: everything that exists by this chapter, drawn */
        case 'shop':
          after.push(() => this.bus.emit('shop', { chapter: this.engine.state.chapter }))
          break
        /**
         * שליחת טוטו — the slip is filled in, and the questions are the site's own.
         *
         * Nothing is paid here: the card pays what was earned when it closes, because a
         * Toto slip that pays on the handshake is not a Toto slip. The seed is the day
         * and the minute, so the same afternoon does not deal the same five questions
         * twice and a save reloaded does not re-deal a round already answered.
         */
        /**
         * פעילות — the runtime decides WHAT the room deals (`pickContent`: a lineup, a goal,
         * a shirt from before this year; a pooled round only once the archive holds one),
         * and the shell opens the gate's own board over the paused room. With nothing to
         * deal, the room offers the ordinary afternoon (`fallback`) or says why not.
         */
        case 'mechanic': {
          if (!isActivityId(effect.activity)) break
          const state = this.engine.state
          const def = ACTIVITY[effect.activity]
          if (def.kind === 'myBag') {
            after.push(() => this.bus.emit('bag', true))
            break
          }
          const pick = pickContent(state, def.id, this.catalog)
          if (!pick) {
            const fallback = def.fallback
            if (fallback) after.push(() => this.hooks.minigame(fallback))
            else if (def.emptyHe) {
              const text = def.emptyHe
              after.push(() => this.bus.emit('toast', { text, tone: 'plain' }))
            }
            break
          }
          const request: MechanicRequest = {
            activity: def.id,
            kind: def.kind,
            chapter: state.chapter,
            seed: seedFor(state, def.id),
            window: pick.window,
            contentId: pick.contentId,
            titleHe: def.titleHe,
            hostHe: def.hostHe,
            runs: state.activities[def.id]?.runs ?? 0,
            crowd: String(state.flags[CROWD_FLAG] ?? '').split('|').filter(Boolean),
          }
          after.push(() => this.bus.emit('mechanic', request))
          break
        }
        case 'toto': {
          const state = this.engine.state
          const seed = state.year * 100000 + state.weekday * 1440 + state.minute
          // 1984–86: the slip Maor priced, unchanged. From 1990: questions from before the
          // year only, at the boy's age, paid as a share of that decade's hour (`activities.ts`)
          const slip = ACTIVITY['kiosk-trivia']
          const window = isStageA(state.chapter) ? null : windowFor(state, slip)
          const perAnswerHe = window ? `עד ${payShekels(slip, state.chapter, 1)} ₪ לטופס מלא` : '2 ₪ לכל תשובה נכונה'
          const top = window ? payShekels(slip, state.chapter, 1) : null
          after.push(() => this.bus.emit('toto', { seed, perAnswerHe, window, top }))
          break
        }
        /**
         * מעטפת סופרגול — bought, torn, and counted in, in that order.
         *
         * The money leaves here and not in the card, unlike the coin and the two
         * contests: those are wagers whose outcome decides what is owed, and this is a
         * purchase. You have paid the moment רפי hands it over, and what is inside is
         * not a result — it is what was inside.
         *
         * The set is the one that decade's kiosk sells (`setSoldIn`). A chapter whose
         * decade nobody printed an album for sells nothing, and the effect does nothing
         * rather than inventing a page.
         */
        case 'packet': {
          /**
           * ONE transaction (delta 90, §21) — the same `purchasePacket` the shop counter and
           * `runtime.buyPacket()` call. Every refusal (no album this decade, not enough in the
           * pocket, an empty box) is known and SAID before a shekel moves; a packet already
           * paid for and not yet shown (a reload mid-tear, a double tap) is shown again and
           * never charged twice. The money, the cards and the pending mark are pushed into this
           * branch's own events, so they land in the one dispatch the conversation makes.
           */
          const bought = purchasePacket(this.engine.state)
          events.push(...bought.events)
          const { reveal, fullHe, kept } = bought
          const say = bought.quote.sayHe
          if (reveal) after.push(() => this.bus.emit('packet', reveal))
          else if (say) after.push(() => this.bus.emit('toast', { text: say, tone: 'plain' }))
          if (fullHe) after.push(() => this.bus.emit('toast', { text: fullHe, tone: 'red' }))
          if (kept.length > 0) after.push(() => this.bus.emit('kept', { ids: kept }))
          break
        }
        /**
         * מדבקה אחת — handed over, or handed back.
         *
         * A negative `count` is a trade going the other way: this is the only way a
         * sticker ever LEAVES the album, and it leaves because the player agreed to give
         * it to somebody, which is the entire social half of the feature.
         */
        case 'sticker': {
          const sticker = stickerFor(effect.id)
          if (!sticker) break
          const now = haveOf(this.engine.state, effect.id)
          const next = Math.max(0, now + (effect.count ?? 1))
          events.push({ t: 'flag.set', flag: stickerFlag(effect.id), value: next })
          if (next > now) events.push({ t: 'flag.raised', flag: ALBUM_SEEN })
          break
        }
        case 'album':
          after.push(() => this.bus.emit('album', { open: true }))
          break
        /**
         * החלפה — one spare for the one that is missing, if this is the child who has it.
         *
         * Everything that could be a lie is computed here rather than written into a
         * line: which sticker, who holds it, and what he takes for it. If this child is
         * not the holder he names the one who is, which is both true and the fastest
         * possible way to teach the player the rule the feature runs on.
         */
        case 'swap': {
          const state = this.engine.state
          const set = setSoldIn(state)
          const missing = set ? missingOn(state, set) : null
          const spare = duplicates(state)[0] ?? null
          if (!missing || !spare) {
            after.push(() =>
              this.bus.emit('toast', { text: 'אין לך כפולים להחליף בהם.', tone: 'plain' }),
            )
            break
          }
          const holder = holderOf(state, missing.id)
          if (holder !== effect.who) {
            const name = holder ? characterName(holder) : null
            after.push(() =>
              this.bus.emit('toast', {
                text: name ? `"אין לי את ${missing.nameHe}. תשאל את ${name}."` : `"אין לי את ${missing.nameHe}."`,
                tone: 'plain',
              }),
            )
            break
          }
          events.push({ t: 'flag.set', flag: stickerFlag(spare.id), value: haveOf(state, spare.id) - 1 })
          events.push({ t: 'flag.set', flag: stickerFlag(missing.id), value: haveOf(state, missing.id) + 1 })
          events.push({ t: 'bond.shifted', who: effect.who, delta: 4 })
          const closed = set ? closesPage(state, set, [missing.id]) : false
          const fromBox = closed && set ? keptOnClose(state, set, [missing.id]) : []
          for (const card of fromBox) events.push({ t: 'flag.set', flag: stickerFlag(card.id), value: 1 })
          after.push(() =>
            this.bus.emit('toast', {
              text: closed
                ? `${spare.nameHe} תמורת ${missing.nameHe}. הדף מלא.`
                : `${spare.nameHe} תמורת ${missing.nameHe}.`,
              tone: 'red',
            }),
          )
          if (fromBox.length > 0) {
            const boxIds = fromBox.map((card) => card.id)
            after.push(() => this.bus.emit('kept', { ids: boxIds }))
          }
          break
        }
        /** עץ או פלי — the stake leaves the pocket in the card, with the flip. */
        case 'coin':
          after.push(() => this.bus.emit('coin', { stake: 1, prize: 5 }))
          break
        /**
         * פנדלים / חיובים — two real contests, in three dimensions (Maor, 6.9.2026).
         *
         * Nothing is paid here, same reasoning as the coin: the card pays what was
         * actually scored when it closes. `attempts` and `perGoal`/`perBasket` were
         * computed once in `gigConversations()` from that chapter's own wage table, so
         * a kick in 1986 and a kick in 1999 are not worth the same shekel.
         */
        case 'penalty':
          after.push(() => this.bus.emit('penalty', { attempts: effect.attempts, perGoal: effect.perGoal }))
          break
        case 'hoops':
          after.push(() => this.bus.emit('hoops', { attempts: effect.attempts, perBasket: effect.perBasket }))
          break
        /**
         * המגרש — the 3D match. The effect carries the whole intent, so this line does not
         * grow when a historical window is added: only the payload does.
         */
        case 'pitch':
          after.push(() => this.bus.emit('pitch', effect.intent))
          break
        case 'goto':
          goto = effect.node
          break
        case 'travel':
          after.push(() => this.hooks.travel(effect.to, effect.spawn))
          break
        case 'minigame':
          after.push(() => this.hooks.minigame(effect.id))
          break
        case 'ending':
          after.push(() => this.hooks.ending(effect.id))
          break

        // --- the systems pass ---------------------------------------------------
        case 'wellbeing':
          events.push({ t: 'wellbeing.changed', key: effect.key, delta: effect.delta })
          break
        case 'personality':
          events.push({ t: 'personality.shifted', key: effect.key, delta: effect.delta })
          break
        case 'redheart':
          events.push({ t: 'redheart.changed', key: effect.key, delta: effect.delta })
          break
        case 'rel':
          events.push({ t: 'relationship.changed', who: effect.who, axis: effect.axis, delta: effect.delta })
          if (effect.delta > 0) touch(effect.who)
          break
        case 'remember':
          events.push({
            t: 'relationship.memory_added',
            memory: {
              characterId: effect.who,
              eventId: effect.eventId,
              significance: effect.significance ?? 'notable',
              year: this.engine.state.year,
              atMinute: this.engine.state.minute,
            },
          })
          touch(effect.who)
          if ((effect.significance ?? 'notable') === 'major' && remembered === null) remembered = effect.who
          break
        case 'flagValue':
          events.push({ t: 'flag.set', flag: effect.flag, value: effect.value })
          break
        case 'save':
          // Out of the pocket and into the tin in one beat, so a scene cannot create money
          // by saving what it never took.
          events.push(
            { t: 'money.changed', agorot: -Math.abs(effect.agorot), why: effect.why },
            { t: 'savings.changed', agorot: Math.abs(effect.agorot), why: effect.why },
          )
          break
        case 'withdraw':
          events.push(
            { t: 'savings.changed', agorot: -Math.abs(effect.agorot), why: effect.why },
            { t: 'money.changed', agorot: Math.abs(effect.agorot), why: effect.why },
          )
          break
        case 'own':
          events.push({ t: 'clothing.gained', item: effect.item }, { t: 'flag.raised', flag: `own:${effect.item}` })
          break
        case 'energy':
          events.push({ t: 'energy.changed', delta: effect.delta })
          break
        case 'gate':
          events.push({ t: 'gate.moved', to: effect.to, reason: effect.reason, year: this.engine.state.year })
          break
        case 'armyRoute':
          events.push({ t: 'army.route', route: effect.route })
          break
        case 'army':
          events.push({ t: 'army.changed', key: effect.key, delta: effect.delta })
          break
        case 'sinai':
          events.push({ t: 'institution.sinai', stance: effect.stance })
          break
        case 'institution':
          events.push({ t: 'institution.changed', key: effect.key, delta: effect.delta })
          break
        case 'presence':
          events.push({ t: 'presence.recorded', anchorId: this.anchor.id, mode: effect.mode })
          break
        case 'laces':
          events.push({ t: 'laces.marked', response: effect.response })
          break

        // --- שבעת המסלולים ---------------------------------------------------------
        case 'skill':
        case 'proof':
        case 'heard':
        case 'repLoss':
        case 'debt':
        case 'route':
        case 'conflict':
          events.push(...this.routeEvents(effect))
          break

        /**
         * לקחת הזדמנות — a conversation may CLOSE a window, and only that.
         *
         * The window itself is defined in the opportunity file with its cost and its
         * outcomes; the line of dialogue names it. That is what stops the same afternoon
         * being balanced in two places, and it is why a choice cannot quietly give
         * itself a cheaper price than the window it belongs to.
         */
        case 'seize': {
          const opportunity = eraFor(this.engine.state.chapter).opportunities.find((entry) => entry.id === effect.opportunity)
          if (!opportunity) break
          if (!isAvailable(this.engine.state, opportunity)) break
          for (const event of acceptEvents(opportunity)) events.push(event)
          const outcome = resolveOutcome(this.engine.state, opportunity)
          if (outcome) extra.push(...outcome.effects)
          break
        }

        /**
         * מה נשאר — the red box roll, off the seed, out of what the day actually gave
         * the player. Two saves that ended the same way can still keep different things.
         */
        case 'keep': {
          const { item, consumed } = pickRedBoxItem(this.engine.state)
          for (const event of keepEvents(item, consumed)) events.push(event)
          break
        }

        default:
          break
      }
    }

    // the pocket changed and nobody said so: one line, the shared words, no agorot
    if (moneyDelta !== 0 && !saidIt) {
      const said = describeMoneyChange(moneyDelta)
      if (said) after.push(() => this.bus.emit('toast', { text: said, tone: 'plain', kickerHe: moneyDelta > 0 ? 'קיבלת' : 'שילמת' }))
    }
    // the reward the brief asked for: a person met, a person who will remember — one line, live
    if (met !== null) {
      const who = met
      events.push({ t: 'flag.raised', flag: `life:met:${who}` })
      after.push(() => this.bus.emit('toast', { text: `הכרת את ${characterName(who)}.`, tone: 'plain', kickerHe: 'הכרת' }))
    }
    if (remembered !== null) {
      const who = remembered
      after.push(() => this.bus.emit('toast', { text: `${characterName(who)} יזכור את זה.`, tone: 'plain', kickerHe: 'יזכור' }))
    }

    if (events.length > 0) this.engine.dispatch(...events)
    // An outcome cannot itself open a window, so one level of recursion is the whole
    // depth this can ever reach — and a cycle is therefore impossible by construction.
    if (extra.length > 0) this.finishOutcome(extra)

    if (goto) {
      this.conversation = null
      const started = this.start(goto)
      if (!started) this.close()
    } else {
      this.close()
    }

    for (const run of after) run()
  }

  /**
   * Apply a list of effects with no conversation around them — a random encounter's
   * consequence, after its line has been read. It deliberately cannot travel, chain or
   * end the chapter: those belong to the scene, and an encounter that could end a
   * chapter would be a lottery rather than a life.
   */
  applyEffects(effects: readonly Effect[]) {
    this.finishOutcome(effects)
  }

  /** An opportunity outcome's effects: the same vocabulary, minus the ones that leave. */
  private finishOutcome(effects: readonly Effect[]) {
    const safe = effects.filter(
      (effect) => effect.e !== 'goto' && effect.e !== 'travel' && effect.e !== 'ending' && effect.e !== 'seize',
    )
    const events: LifeEvent[] = []
    for (const effect of safe) {
      switch (effect.e) {
        case 'flag':
          events.push({ t: 'flag.raised', flag: effect.flag })
          break
        // a value, not a boolean — a gesture remembers HOW it went (`content/gestures.ts`)
        case 'flagValue':
          events.push({ t: 'flag.set', flag: effect.flag, value: effect.value })
          break
        case 'money':
          events.push({ t: 'money.changed', agorot: effect.agorot, why: effect.why })
          break
        case 'give':
          events.push({ t: 'item.gained', item: effect.item, count: effect.count ?? 1 })
          break
        case 'take':
          events.push({ t: 'item.lost', item: effect.item, count: effect.count ?? 1 })
          break
        case 'bond':
          events.push({ t: 'bond.shifted', who: effect.who, delta: effect.delta })
          break
        case 'trait':
          events.push({ t: 'trait.shifted', trait: effect.trait, delta: effect.delta })
          break
        case 'time':
          events.push({ t: 'clock.advanced', minutes: effect.minutes })
          break
        case 'wellbeing':
          events.push({ t: 'wellbeing.changed', key: effect.key, delta: effect.delta })
          break
        case 'personality':
          events.push({ t: 'personality.shifted', key: effect.key, delta: effect.delta })
          break
        case 'redheart':
          events.push({ t: 'redheart.changed', key: effect.key, delta: effect.delta })
          break
        case 'rel':
          events.push({ t: 'relationship.changed', who: effect.who, axis: effect.axis, delta: effect.delta })
          break
        case 'remember':
          events.push({
            t: 'relationship.memory_added',
            memory: {
              characterId: effect.who,
              eventId: effect.eventId,
              significance: effect.significance ?? 'notable',
              year: this.engine.state.year,
              atMinute: this.engine.state.minute,
            },
          })
          break
        case 'save':
          events.push(
            { t: 'money.changed', agorot: -Math.abs(effect.agorot), why: effect.why },
            { t: 'savings.changed', agorot: Math.abs(effect.agorot), why: effect.why },
          )
          break
        case 'withdraw':
          events.push(
            { t: 'savings.changed', agorot: -Math.abs(effect.agorot), why: effect.why },
            { t: 'money.changed', agorot: Math.abs(effect.agorot), why: effect.why },
          )
          break
        case 'own':
          events.push({ t: 'clothing.gained', item: effect.item }, { t: 'flag.raised', flag: `own:${effect.item}` })
          break
        case 'energy':
          events.push({ t: 'energy.changed', delta: effect.delta })
          break
        case 'gate':
          events.push({ t: 'gate.moved', to: effect.to, reason: effect.reason, year: this.engine.state.year })
          break
        case 'armyRoute':
          events.push({ t: 'army.route', route: effect.route })
          break
        case 'army':
          events.push({ t: 'army.changed', key: effect.key, delta: effect.delta })
          break
        case 'sinai':
          events.push({ t: 'institution.sinai', stance: effect.stance })
          break
        case 'institution':
          events.push({ t: 'institution.changed', key: effect.key, delta: effect.delta })
          break
        case 'presence':
          events.push({ t: 'presence.recorded', anchorId: this.anchor.id, mode: effect.mode })
          break
        case 'laces':
          events.push({ t: 'laces.marked', response: effect.response })
          break
        /**
         * An encounter or an opportunity outcome may leave evidence and may cost a
         * standing. It may NOT hand over a route stage or settle a conflict of interest:
         * those are decisions a person takes in a scene, out loud, and a random encounter
         * that promoted somebody would be the exact "no jumping through titles" breach
         * the model is shaped to prevent. `route` and `conflict` are therefore absent
         * here on purpose, and fall to `default`.
         */
        case 'skill':
        case 'proof':
        case 'heard':
        case 'repLoss':
        case 'debt':
          events.push(...this.routeEvents(effect))
          break
        default:
          break
      }
    }
    if (events.length > 0) this.engine.dispatch(...events)
  }

  // -------------------------------------------------------------------------------
  // שבעת המסלולים — the route verbs, in one place, called from both effect walks
  // -------------------------------------------------------------------------------

  /**
   * `{chapter}` בתוך מזהה ראיה — resolved here and nowhere else.
   *
   * A proof is idempotent on its id, and a route's apex asks for four of them *"בפרקים
   * שונים"*. Both hold at once only when the id carries the chapter: one authored mission
   * then cannot be farmed twice in one year and CAN be earned again in the next, which is
   * what the requirement actually describes. The content writes the placeholder and never
   * a chapter id, so re-ordering the chapter registry moves nothing.
   */
  private proofId(raw: string): string {
    return raw.replace('{chapter}', this.engine.state.chapter)
  }

  private routeEvents(effect: Effect): LifeEvent[] {
    const events: LifeEvent[] = []
    const state = this.engine.state
    switch (effect.e) {
      case 'skill':
        // A capability moves the moment the thing is done, with nobody watching. That is
        // the difference between a skill and a standing, and it is the whole system.
        events.push({ t: 'skill.changed', skill: effect.skill, delta: effect.delta, why: effect.why })
        break

      case 'proof': {
        const proofId = this.proofId(effect.proofId)
        events.push({
          t: 'proof.recorded',
          proof: {
            kind: effect.kind,
            proofId,
            chapter: state.chapter,
            year: state.year,
            ...(effect.subjectHe ? { subjectHe: effect.subjectHe } : {}),
            ...(effect.noteHe ? { noteHe: effect.noteHe } : {}),
          },
        })
        if (effect.audience && effect.delta) {
          /**
           * *"תקרת אירוע מוניטין חיובי +5"* — capped in the RUNTIME rather than trusted to
           * the content, because a cap that lives in a comment is a cap somebody widens in
           * a delta. Note what this does NOT do: it queues the claim and moves no
           * standing. Only a `heard` moves a standing upward, ever.
           */
          const delta = Math.min(POSITIVE_REPUTATION_CAP, Math.max(0, Math.round(effect.delta)))
          if (delta > 0) {
            events.push({ t: 'reputation.earned', proofId, audience: effect.audience, delta, why: effect.kind })
          }
        }
        break
      }

      case 'heard':
        // The audience found out. `apply` pays the claim once and drops it from `pending`,
        // so a conversation replayed in the same chapter cannot pay the same deed twice.
        events.push({ t: 'reputation.heard', proofId: this.proofId(effect.proofId) })
        break

      case 'repLoss':
        /**
         * הכיוון היחיד שאינו ממתין לעד.
         *
         * `reputation.changed` is reachable from content through this verb and only this
         * verb, and the sign is forced here: whatever a content file writes, this cannot
         * raise a standing. A breach that came out is known by definition and has nobody
         * to wait for; a good deed always does. *"תקרת אירוע … שלילי −8."*
         */
        events.push({
          t: 'reputation.changed',
          audience: effect.audience,
          delta: -Math.min(NEGATIVE_REPUTATION_CAP, Math.abs(Math.round(effect.delta))),
          why: effect.why,
        })
        break

      case 'debt':
        events.push({ t: 'debt.changed', agorot: effect.agorot, why: effect.why })
        break

      case 'route': {
        const id = effect.route as RouteId
        // `accept` is checked against the same eligibility the offer was made on, so a
        // branch cannot hand out a title merely by being reached. `decline` writes
        // nothing at all — a refused invitation did not happen and can be made again.
        if (effect.act === 'accept') events.push(...acceptRouteStage(state, id, effect.stage))
        if (effect.act === 'leave') events.push(...leaveRoute(state, id))
        break
      }

      case 'conflict':
        events.push(...conflictEvents(effect.choice))
        break

      default:
        break
    }
    return events
  }
}

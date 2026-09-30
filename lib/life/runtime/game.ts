import Phaser from 'phaser'

import type { HistoricalAnchor } from '../anchors'
import { OPENING_FLAG } from '../opening'
import { diffGauges, hapoelLove } from '../gauges'
import { newlyRevealed, revealFlagOf } from '../map'
import { castFor } from '../characters'
import { eraFor, type AnchorSet } from '../content/era'
import type { LifeEngine } from '../engine'
import { missedIn, takenIn } from '../opportunities'
import { buildProfile, type LifeProfile } from '../profile'
import { packetClosed, purchasePacket } from '../stickers'
import type { LifeState } from '../types'
import type { MechanicCatalog } from '../../mechanics/types'

import type { LifeBus } from './bus'
import { CONTEXT_KEY, type LifeContext } from './context'
import { DialogueRunner } from './dialogue'
import { InputState } from './input'
import { LIFE_PALETTE } from './palette'
import { BootScene } from './scenes/BootScene'
import { ChoreScene } from './scenes/ChoreScene'
import { FootballScene } from './scenes/FootballScene'
import { PassageScene } from './scenes/PassageScene'
import { PrologueScene } from './scenes/PrologueScene'
import { WorldScene } from './scenes/WorldScene'
import type { MasterCheckpoint } from '../checkpoint'

/**
 * ההרכבה — the only file that both React and Phaser touch, and the reason neither knows
 * about the other.
 *
 * The shell mounts this and gets back four methods. It never imports a scene, never sees
 * a game object, and never reads game state except through the bus. That boundary is what
 * brief §28 is protecting: the React tree can be rebuilt, and the game keeps playing.
 *
 * `Scale.NONE` — not `FIT`, and no longer `RESIZE`. `FIT` letterboxes a 16:9 design into
 * a portrait phone and wastes a third of the screen. `RESIZE` gave the canvas whatever box
 * the layout handed it, which was right — but it also **forces** the drawing buffer to the
 * parent's size in CSS pixels and ignores `zoom` while doing it (`updateScale`, the RESIZE
 * branch). On a phone that reports three device pixels per CSS pixel, that meant a buffer
 * of 390×842 stretched by the browser across 1170×2526: the whole game, every painting,
 * every face and every letter Phaser draws, magnified threefold before it reached the eye.
 * Measured on 11.9.2026, and it was true of every room without exception.
 *
 * `NONE` hands the size over completely, which is what the shell already wanted: React
 * measures the box, `resize` below turns it into device pixels for the buffer and back
 * into CSS pixels for the element. The scenes are untouched — they work in world units and
 * a camera zoom, and both grow together.
 */

/**
 * מה שמסך יכול לשאול — the shell's whole view of the life.
 *
 * Deliberately a snapshot rather than a live object: React must never hold the engine,
 * or the day arrives when a re-render writes to it. Everything a card needs is already
 * translated into words by `lib/life/profile.ts`; the raw state comes along only for the
 * developer panel, which is the one screen allowed to see numbers.
 */
export type LifeSnapshot = {
  profile: LifeProfile
  /** what the afternoon actually offered, and what it took away again */
  taken: string[]
  missed: string[]
  /** developer-only: the whole truth, never rendered in production */
  state: LifeState
  events: number
  /** the needle's position inside a directed master event, when one is open */
  checkpoint: MasterCheckpoint | null
}

/**
 * כמה פיקסלים אמיתיים יש בפיקסל CSS אחד — חסום בשלוש.
 *
 * הטלפונים של היום מדווחים 2 או 3, ומעל זה כבר משלמים ברביעיית שטח על הבדל שאי אפשר
 * לראות. על שרת (אין `window`) התשובה היא אחד, וכך הבנייה הסטטית לא נופלת.
 */
const pixels = (): number =>
  typeof window === 'undefined' ? 1 : Math.min(Math.max(window.devicePixelRatio || 1, 1), 3)

export type MapPlace = {
  id: string
  titleHe: string
  here: boolean
  /** how many game minutes the walk costs */
  minutes: number
  /** the shut door on the way, by its own label — null when the way is open */
  lockedHe: string | null
}

export type LifeRuntime = {
  input: InputState
  /** the shell owns the box; Phaser's own listener only fires on a window resize */
  resize(width: number, height: number): void
  advance(): void
  choose(id: string): void
  /** walk away mid-conversation: nothing is applied, the box just closes */
  leave(): void
  /**
   * buy one Supergoal packet at a counter — `purchasePacket` in `stickers.ts`, the ONE
   * transaction (delta 90, §21). Refusals are said (toast) before any money moves; a
   * packet already paid for and not yet shown is shown again, never charged twice.
   */
  buyPacket(): import('../stickers').PacketStatus
  /** the reveal was put down (album or back to the room) — clears the pending packet */
  closePacket(): void
  /** the pre-match wardrobe's choice — a shirt id or `'plain'`; false when refused */
  wear(choice: string): boolean
  dismissEnding(): void
  /** the end-of-stage celebration's own button — the ending card no longer goes home */
  dismissFinale(): void
  /** the opening film has played for this life — written into the log, once */
  markOpening: () => void
  /** the coda card was closed — back to the last room, the life stays where it is */
  dismissCoda: () => void
  /** every chapter this life has entered, in the order the log holds them */
  livedChapters: () => string[]
  /** the reveal moment was closed — the world runs again */
  closeReveal: () => void
  /**
   * הסרט נגמר — the shell reporting how a historical cutscene ended.
   *
   * The only method on this facade that carries information INTO the game rather than a
   * command, and it is one enum: watched, skipped, or the film could not be played. The
   * scene decides what each of those means; the shell has no idea, which is the whole
   * point of the boundary. Safe to call more than once and safe to call for a cutscene
   * nobody started — both are no-ops.
   */
  endCutscene(outcome: import('../cutscenes').CutsceneOutcome): void
  /**
   * הצבעה מהמעטפת — a tap the DOM caught before the canvas could, handed back.
   *
   * The control deck's drag zone lies over the lower half of the painting so a thumb that
   * lands there can steer. That makes it the only thing that sees a tap there, and a tap
   * there means "go to that place". Client coordinates, because that is what a DOM event
   * carries; the scene converts.
   */
  pointAtScreen(clientX: number, clientY: number): void
  skipIntro(): void
  /** the profile screen: everything the shell may know, as words */
  snapshot(): LifeSnapshot
  /** the world stops while a card is open over it */
  pause(on: boolean): void
  /**
   * המפה — the places the child knows, from where he stands.
   *
   * Every entry is a room the neighbourhood's doors connect to this one, with how many
   * game minutes the walk would cost and whether a door on the way is still shut. The
   * shell draws the list; the scene decides what is on it, because only the scene knows
   * which doors are open right now.
   */
  places(): MapPlace[]
  /** speak to something by conversation id — the panorama's marks use this */
  talk(id: string): void
  /** the panorama was closed by the player; the world resumes */
  closePano(): void
  /** the boy stepped out of the first-person tunnel */
  finishTunnel(): void
  /** how far down the tunnel he is, 0..1 — the shell's sound follows it */
  tunnelProgress(p: number): void
  /** walk there — the minutes are charged to the clock like any journey; refused if locked */
  goTo(id: string): boolean
  /**
   * זמן פנוי — the plan as it stands right now, recalculated (the planner reads this on
   * open, never a copy it kept), and the one way the shell may ask for time to pass: by
   * plan id. The world re-plans at the tap, refuses a stale plan, and moves itself.
   */
  freeTime(): import('../world/timeAdvance').TimeAdvancePlan | null
  advanceTime(planId: string): import('../world/timeAdvance').AdvanceResult
  /** cut the log back to the start of the chapter; false when there is none */
  restartDay(): boolean
  /**
   * לוח הפיתוח — the only door into the life that is not a decision.
   *
   * Every one of these writes a real event through the engine, so a debugged life is
   * still a valid log and still reloads. It is exposed on the runtime rather than reached
   * for through a global, and the shell only renders the panel outside production
   * (`NODE_ENV`), which is what keeps rule 44 — never in production — a build fact rather
   * than a promise.
   */
  debug: {
    jump(minutes: number): void
    money(agorot: number): void
    energy(delta: number): void
    goTo(location: string): void
    bond(who: string, delta: number): void
    raise(flag: string): void
    reseed(seed: string): void
    bodies(): unknown[]
    /** everything a thumb could press in this room right now — for the dead-end probe */
    targets(): Array<{ kind: 'talk' | 'act' | 'exit'; id: string; labelHe: string }>
    /** the flow watchdog: quiet minutes, what is blocking, and whether an offer is up */
    flow(): { quietFor: number; busy: boolean; reachable: number; gate: unknown; offering: string | null } | null
    /** the sentence the room would say to somebody who has stopped moving */
    hint(): string | null
    /** every beat of this chapter, whether it fired, and what it is still waiting for */
    pending(): Array<{ id: string; ends: boolean; fired: boolean; needs: string[]; waitingHe: string | null }>
    /** what the balloon's tail is told about a speaker, and the state behind that answer */
    anchor(who: string | null): { anchor: number | null; speaking: string | null; view: number; names: string[] } | null
    where(): unknown
    /** the framing on the glass — camera, painting, child, doors — in canvas pixels (screens probe) */
    view(): unknown
    /** the last free-time landing report (§33) — null before any advance */
    landing(): unknown
  }
  destroy(): void
}

export type LifeGameOptions = {
  parent: HTMLElement
  engine: LifeEngine
  bus: LifeBus
  anchor: HistoricalAnchor
  prologueAnchor: HistoricalAnchor
  /** every chapter's anchor, by `Era.anchorKey` — 1986 and 1990 today */
  anchors: AnchorSet
  /** what the archive holds before each year, for the activities (`app/life/mechanicCatalog.ts`) */
  catalog?: MechanicCatalog
}

export function createLifeGame(options: LifeGameOptions): LifeRuntime {
  const input = new InputState()

  const noop = {
    travel: () => undefined,
    minigame: () => undefined,
    ending: () => undefined,
    onOpen: () => undefined,
  }

  const dialogue = new DialogueRunner(options.engine, options.bus, noop, options.anchor, options.anchors, options.catalog)

  /**
   * המדדים החיים — every dispatch is diffed against the state before it, and what moved
   * is put on the bus as one beat. The love meter is emitted separately, always, so the
   * badge on the glass never waits for a change to know its number.
   */
  let before = options.engine.state
  let bumps = 0
  options.bus.emit('love', { value: hapoelLove(before), bump: 0 })
  const offGauges = options.engine.subscribe((after) => {
    if (after === before) return
    const changes = diffGauges(before, after)
    const revealed = newlyRevealed(before, after)
    before = after
    if (revealed.length > 0) {
      // Written as a person-flag so the map remembers across every year; dispatched on a
      // microtask so a listener never dispatches from inside a dispatch.
      queueMicrotask(() => {
        options.engine.dispatch(...revealed.map((place) => ({ t: 'flag.raised', flag: revealFlagOf(place.id) }) as const))
        const moment = revealed.find((place) => place.revealHe)
        if (moment) options.bus.emit('reveal', { place: moment })
      })
    }
    const love = hapoelLove(after)
    if (changes.some((c) => c.id === 'love')) bumps += 1
    options.bus.emit('love', { value: love, bump: bumps })
    /**
     * לא באמצע הזיכרון הראשון — the meters move during the prologue and they do not
     * announce themselves while they do.
     *
     * 1.6.1983 is a five-year-old on his father's shoulders in a crowd he does not
     * understand, and on 6.9.2026 it was also "אהבה להפועל +1 · 15%" sliding across the
     * frame every time he looked at something. A number over a memory is the fastest way
     * to turn a film back into a game. The gauges still change — the whole point of the
     * prologue is that it decides who the boy is — they simply do it quietly, and the
     * player meets them for the first time in 1984, in a room, where a read-out belongs.
     */
    if (changes.length > 0 && after.chapter !== 'prologue') options.bus.emit('gauge', changes)
  })

  // The probes run in a headless browser whose WebGL is a software rasteriser; a frame
  // there costs a second and every timed beat drifts. Under the probe flag the game draws
  // with the 2D canvas instead — same scenes, same code, a renderer that keeps up.
  let probing = false
  try {
    probing = window.localStorage.getItem('the-worker:life:probe') === '1'
  } catch {
    probing = false
  }

  const context: LifeContext = {
    engine: options.engine,
    bus: options.bus,
    input,
    dialogue,
    anchor: options.anchor,
    prologueAnchor: options.prologueAnchor,
    anchors: options.anchors,
    probing,
  }

  // הקופסה שהפריסה כבר נתנה לאלמנט. בלי זה `NONE` נפתח על ברירת המחדל של פייזר
  // (1024×768) לפריים אחד, והדבר הראשון שרואים הוא חדר בגודל הלא נכון.
  const box = options.parent.getBoundingClientRect()

  const game = new Phaser.Game({
    type: probing ? Phaser.CANVAS : Phaser.AUTO,
    parent: options.parent,
    backgroundColor: LIFE_PALETTE.ink,
    // 5.9.2026: the art is painted and photographic now, not pixel — nearest-neighbour
    // sampling turned every scaled figure into a jagged cut-out and every slow pan into a
    // shimmer. Linear filtering, like the film it is trying to be.
    pixelArt: false,
    antialias: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      // החוצץ בפיקסלי מכשיר, האלמנט בפיקסלי CSS: פייזר קובע ‎canvas.width = width‎ ואת
      // רוחב ה-CSS ל-‎width × zoom‎, ולכן מוסרים לו מידה מוכפלת ו-zoom הפוך.
      zoom: 1 / pixels(),
      width: Math.round(box.width * pixels()) || 390,
      height: Math.round(box.height * pixels()) || 844,
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    // The canvas must never eat a two-finger page gesture on a phone.
    input: { activePointers: 3 },
    scene: [BootScene, PrologueScene, WorldScene, FootballScene, ChoreScene, PassageScene],
  })

  game.registry.set(CONTEXT_KEY, context)

  const worldScene = () => game.scene.getScene(WorldScene.KEY) as unknown as WorldScene | null

  const snapshot = (): LifeSnapshot => {
    const state = options.engine.state
    const cast = castFor(state.chapter).map((entry) => entry.id)
    const era = eraFor(state.chapter)
    return {
      profile: buildProfile(state, options.engine.log(), cast, ''),
      taken: takenIn(state, era.opportunities).map((entry) => entry.titleHe),
      missed: missedIn(state, era.opportunities).map((entry) => entry.titleHe),
      state,
      events: options.engine.log().length,
      checkpoint: options.engine.marked(),
    }
  }

  const facade: LifeRuntime = {
    input,
    resize: (width: number, height: number) => {
      // הקליפה מודדת ב-CSS ולא צריכה לדעת על צפיפות פיקסלים; התרגום קורה כאן, במקום
      // היחיד שנוגע בפייזר ממילא.
      if (width > 0 && height > 0) {
        const r = pixels()
        game.scale.setZoom(1 / r)
        game.scale.resize(width * r, height * r)
      }
    },
    advance: () => dialogue.advance(),
    choose: (id: string) => dialogue.choose(id),
    leave: () => dialogue.leave(),
    buyPacket: () => {
      const engine = options.engine
      const bought = purchasePacket(engine.state)
      if (bought.events.length > 0) {
        engine.dispatch(...bought.events)
        void engine.save()
      }
      if (bought.reveal) options.bus.emit('packet', bought.reveal)
      else if (bought.quote.sayHe) options.bus.emit('toast', { text: bought.quote.sayHe, tone: 'plain' })
      if (bought.fullHe) options.bus.emit('toast', { text: bought.fullHe, tone: 'red' })
      if (bought.kept.length > 0) options.bus.emit('kept', { ids: bought.kept })
      return bought.quote.status
    },
    closePacket: () => {
      const events = packetClosed(options.engine.state)
      if (events.length === 0) return
      options.engine.dispatch(...events)
      void options.engine.save()
    },
    wear: (choice: string) => (game.scene.isActive(WorldScene.KEY) ? worldScene()?.wear(choice) ?? false : false),
    dismissEnding: () => worldScene()?.goHome(),
    dismissFinale: () => worldScene()?.dismissFinale(),
    markOpening: () => {
      if (!options.engine.state.flags[OPENING_FLAG]) options.engine.dispatch({ t: 'flag.raised', flag: OPENING_FLAG })
    },
    dismissCoda: () => worldScene()?.dismissCoda(),
    closeReveal: () => {
      options.bus.emit('reveal', null)
      worldScene()?.setPaused(false)
    },
    livedChapters: () => {
      const seen = new Set<string>()
      for (const event of options.engine.log()) if (event.t === 'chapter.entered') seen.add(event.chapter)
      return [...seen]
    },
    endCutscene: (outcome) => worldScene()?.endCutscene(outcome),
    pointAtScreen: (x, y) => {
      const passage = game.scene.getScene(PassageScene.KEY) as unknown as PassageScene | null
      if (passage && game.scene.isActive(PassageScene.KEY)) passage.pointAtScreen(x, y)
      else worldScene()?.pointAtScreen(x, y)
    },
    snapshot,
    pause: (on: boolean) => worldScene()?.setPaused(on),
    // The map is a map of the WORLD: during the passage (or any other scene) the world
    // scene still exists but is not running, and a door pressed on it would restart it
    // underneath whatever is playing.
    places: () => (game.scene.isActive(WorldScene.KEY) ? worldScene()?.places() ?? [] : []),
    talk: (id: string) => worldScene()?.talk(id),
    closePano: () => worldScene()?.closePano(),
    finishTunnel: () => worldScene()?.finishTunnel(),
    tunnelProgress: () => undefined,
    goTo: (id: string) => (game.scene.isActive(WorldScene.KEY) ? worldScene()?.goTo(id) ?? false : false),
    freeTime: () => (game.scene.isActive(WorldScene.KEY) ? worldScene()?.freeTime() ?? null : null),
    advanceTime: (planId: string) =>
      game.scene.isActive(WorldScene.KEY) ? worldScene()?.advanceTime(planId) ?? { ok: false, reason: 'no-world' } : { ok: false, reason: 'no-world' },
    restartDay: () => options.engine.restartDay(),
    debug: {
      jump: (minutes: number) => options.engine.dispatch({ t: 'clock.advanced', minutes }),
      money: (agorot: number) => options.engine.dispatch({ t: 'money.changed', agorot, why: 'debug' }),
      energy: (delta: number) => options.engine.dispatch({ t: 'energy.changed', delta }),
      goTo: (location: string) => worldScene()?.debugTravel(location),
      bond: (who: string, delta: number) => options.engine.dispatch({ t: 'bond.shifted', who, delta }),
      raise: (flag: string) => options.engine.dispatch({ t: 'flag.raised', flag }),
      reseed: (seed: string) => options.engine.dispatch({ t: 'rng.seeded', seed }),
      /** every body the room is drawing, with its height in metres — for the scale probe */
      bodies: () => (game.scene.isActive(WorldScene.KEY) ? worldScene()?.bodies() ?? [] : []),
      /** everything a thumb could press in this room right now — for the dead-end probe */
      targets: () => (game.scene.isActive(WorldScene.KEY) ? worldScene()?.targets() ?? [] : []),
      // why the day cannot move, in numbers (dev only — see `WorldScene.flow`)
      flow: () => (game.scene.isActive(WorldScene.KEY) ? worldScene()?.flow() ?? null : null),
      /** the sentence the room would say to somebody who has stopped moving */
      hint: () => (game.scene.isActive(WorldScene.KEY) ? worldScene()?.debugHint() ?? null : null),
      /** every beat of this chapter, whether it fired, and what it is still waiting for */
      pending: () => (game.scene.isActive(WorldScene.KEY) ? worldScene()?.pending() ?? [] : []),
      /** what the balloon's tail is told about a speaker, and why — see `anchorFor` */
      anchor: (who: string | null) =>
        game.scene.isActive(WorldScene.KEY) ? worldScene()?.anchorDebug(who) ?? null : null,
      landing: () => (game.scene.isActive(WorldScene.KEY) ? worldScene()?.lastLanding ?? null : null),
      view: () => (game.scene.isActive(WorldScene.KEY) ? worldScene()?.view() ?? null : null),
      where: () => {
        const passage = game.scene.getScene(PassageScene.KEY) as unknown as PassageScene | null
        if (passage && game.scene.isActive(PassageScene.KEY)) return passage.where()
        return game.scene.isActive(WorldScene.KEY) ? worldScene()?.where() ?? null : null
      },
    },
    skipIntro: () => {
      const prologue = game.scene.getScene(PrologueScene.KEY) as unknown as PrologueScene | null
      if (prologue && game.scene.isActive(PrologueScene.KEY)) prologue.skip()
    },
    destroy: () => {
      offGauges()
      void options.engine.save()
      game.destroy(true)
    },
  }
  // The probes read the runtime through the glass. Opt-in per browser, never by default:
  // a game object on `window` is a debug surface, and rule 44 keeps those off the page.
  try {
    if (window.localStorage.getItem('the-worker:life:probe') === '1') {
      ;(window as unknown as { __life?: LifeRuntime }).__life = facade
    }
  } catch {
    // storage may be unavailable; the probes are the only reader
  }
  return facade
}

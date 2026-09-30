import Phaser from 'phaser'

import { eligibleFor, offerConversationFor, offeredFlag } from '../../routes'
import { hintFor } from '../../help'
import type { EndingCard } from '../../content/chapter1986'
import { clockLabel } from '../../clock'
import type { AmbientActor } from '../../content/ambient1986'
import { SCHOOL_MORNING_1990, TABLE_1990 } from '../../content/chapter1990'
import { CLASSROOM_1991, closing1991, CURFEW, HOME_NIGHT_1991, SCHOOL_STARTS, TIP_OFF } from '../../content/chapter1991'
import { anchorFor, ERA_1991, eraFor, type Era } from '../../content/era'
import { chapterFor, nextPlayable, playableChapters, type ChapterDef } from '../../content/chapters'
import { arrivedBetween, onSale, ownedShirts, wearingAt, wornFlag, SHIRT_NEW_HE } from '../../shirts'
import { albumNewsFlag, setsArrivedBetween, SET_NEW_HE } from '../../stickers'
import { holdsSeason, seasonOnSaleIn, subNewsFlag } from '../../subscription'
import { beatFlag, beatsAt, type ActorCue, type Beat, type BeatAction } from '../../content/beats'
import type { ConversationShot } from '../../content/script'
import { crowdSpeaker } from '../../crowd'
import { encounterEvents, rollEncounter } from '../../encounters'
import { tickOpportunities } from '../../opportunities'
import { placementsAt } from '../../schedules'
import type { LifeState, LocationId } from '../../types'
import { autoCutsceneFor, cutsceneCard, longDateHe, type CutsceneOutcome, type HistoricalCutscene } from '../../cutscenes'
import { decidingMinute, matchClock, matchPace, scoreboardAt } from '../../match'
import type { Condition } from '../../world/types'
import { cutFor, eraOfYear, filmFlag } from '../../world/transitions'
import { bodySize, heightOf } from '../../world/heights'
import { castFigure } from '../../world/castFigures'
import { yearOfChapter } from '../../world/homes'
import { LivingWorld } from '../living'
import { GIGS, isPaid, offerFlag, offeredIn } from '../../gigs'
import { AFTER_FLAG, CROWD_FLAG, ERA_FLAG, NEIGHBOUR_OFFER, eraOf, neighbourAsks, parliamentOf } from '../../activities'

/**
 * הערבים שבהם יש כדורסל באוסישקין — the chapters whose evening happens inside the hall.
 * `uss:arrived` means "there is a game here tonight" and every hall conversation reads it.
 */
const HALL_NIGHTS: readonly string[] = ['1991', '1993-cup', '1997-basket', '1999-basket']

import { plateFor } from '../../plates'
import { ALL_SCENES, arrivalFor, artFor, blockedFor, needsFor, exitInEra, FULL_TIME, inEra, KICKOFF, KOBI_LEAVES, sceneFor, sceneIn, stuckFor, TICKET_OFFICE, whenFor } from '../../world/scenes'
import { compose as composeHint, holds as hintHolds } from '../../world/hints'
import { unmet } from '../../world/why'
import { forcedEnding, isStalled, LAST_RESORT_MINUTES, waitingForTheClock } from '../../world/lastResort'
import { QUIET_MINUTES, flowMove, nextTimeGate, type TimeGate } from '../../world/flow'
import { placesFrom, travelPlan } from '../../world/travel'
import { EARLY_SUFFIX, LET_PASS_SUFFIX, advanceSteps, freeTimePlan, preflight, verifyLanding, type AdvanceResult, type LandingReport, type TimeAdvancePlan } from '../../world/timeAdvance'
import { adDirector } from '../../monetization'
import { reconcile } from '../../world/milestones'
import { nextStep } from '../../world/route'
import { aimForGoal, type GoalAim } from '../../world/reach'
import { whereIs } from '../../schedules'
import type { ActorDef, ExitDef, HotspotDef, LayerDef, SceneDef, Verb } from '../../world/scenes'
import type { PanoSpot } from '../bus'
import { PANO_SPOTS } from '../../content/panoramas'
import { KOBI_LEAVES_LATE, KOBI_SAYS_LEAVING } from '../../content/schedules1990'
import type { HistoricalAnchor } from '../../anchors'
import { buildFinale } from '../../finale'
import { retryFor } from '../../content/retry1986'
import { TransistorNet } from '../match1990'
import { BOARD_PREFIX, boardView, settleWith } from '../../noteBoards'
import { NOTE_BOARDS } from '../../content/noteBoards'
import { MatchDirector } from '../matchDirector'
import { directiveFor, storyHoldsTheMoment, type MainStoryDirective } from '../../storyDirector'
import { wearEvents } from '../../matchRitual'
import { sceneAlive } from '../../world/placeLifecycle'
import { CONSEQUENCE_KICKER_HE, dueConsequences, shownEvent } from '../../consequence'
import { matchScriptFor, type MatchScript } from '../../content/matchScripts'
import { DerbyFromAfar, DerbyNight, derbyMarginHe, type DerbyMood } from '../derby1991'
import { PassageScene } from './PassageScene'
import { meets } from '../../world/types'
import { artUrl, extensionKeys, facesLeft, PARALLAX, parallaxKeys, parallaxPlane, WALK_AWAY, type ParallaxPlane } from '../art'
import { CONTEXT_KEY, type LifeContext } from '../context'
import type { MapPlace } from '../game'
import { LIFE_PALETTE } from '../palette'
import {
  arrivalEase,
  clampToBand,
  DEPTH,
  groundDistance,
  nextWaypoint,
  strideAdvance,
  type Blocker,
  type Bounds,
} from '../walk'

/**
 * הסצנה — one painted place, the strip of floor you may stand on, and the rule that you
 * are never allowed to wonder how to leave it.
 *
 * The first version of this scene could be played by the person who wrote it. A playtest
 * found the real problem in ninety seconds: the player stayed inside the house because
 * leaving was not obvious, and the clock took his father to the match while he was still
 * working out the controls. That is not difficulty, it is a broken interface charging
 * the player for its own faults. Five things here exist to make sure it cannot happen
 * again, and they are the substance of this file:
 *
 *  · **Every door has a light on it.** Not a trigger volume — a warm glow painted over
 *    the doorway in the picture, visible from anywhere in the room, breathing slowly.
 *    The way out of the flat gets DAYLIGHT, which no interior door has, so the front
 *    door does not look like the bedroom door.
 *  · **Everything interactive says what it is and what will happen.** `לגעת` told the
 *    player nothing. `דבר עם קובי`, `צא לרחוב`, `קח את הבקבוקים` tell them everything,
 *    and the same button does all of it.
 *  · **Walking into a door works, and so does the button.** A player who has just
 *    learned to walk should not also have to learn which doors need a keypress. A short
 *    dwell stops a passing step from throwing you into another room.
 *  · **The clock does not start until the child is in the street.** Time is the
 *    chapter's antagonist and it stays that way — but it may not bill the player for
 *    learning which key moves. There is no "tutorial paused" sign; the day simply
 *    begins when the day begins.
 *  · **The room notices when you are lost.** Thirty seconds without progress brightens
 *    the doors; fifty puts a sentence in somebody's mouth; seventy points at the way
 *    out. It backs off the moment you move.
 */

type Actor = {
  def: ActorDef
  image: Phaser.GameObjects.Image
  shadow: Phaser.GameObjects.Ellipse
  baseX: number
  phase: number
}

type Hotspot = { def: HotspotDef; x: number; y: number; w: number; prop?: Phaser.GameObjects.Image }

/** Somebody crossing the picture who is not there for the player. */
type Ambient = {
  def: AmbientActor
  image: Phaser.GameObjects.Image
  shadow: Phaser.GameObjects.Ellipse
  /** ms into this actor's own cycle */
  clock: number
}

type Target =
  | { kind: 'act'; act: string; verb: Verb; label: string; x: number; y: number; priority: number }
  | {
      kind: 'exit'
      exit: ExitDef
      verb: Verb
      label: string
      /** shown, named and refused — never silent */
      locked: boolean
      x: number
      y: number
      priority: number
    }

const WALK = 1.5
const RUN = 2.5
const STUCK_HINT = 30000
const STUCK_VOICE = 50000
const STUCK_POINT = 70000

/**
 * How fast the afternoon runs while the child is simply walking.
 *
 * One game minute per real second made the whole day five real minutes long, which meant
 * the opportunity windows closed faster than a player could read the street they were
 * standing in. Slowing the base rate does not make the chapter longer by making walking
 * slower (brief §41 forbids exactly that) — it makes the CHOICES legible, because every
 * real cost in this chapter is paid in explicit minutes by conversations and journeys,
 * and those are what should dominate the clock rather than the walk between them.
 */
const BASE_TIME = 0.72

/** How often the world offers to surprise you, and how likely it is when it does. */
/**
 * הסרט של הפרק — comes from the era now (`Era.cutscene`); `cutsceneFor` returning null is
 * still a legitimate state, and 1990 has no film by design (media not rights-cleared).
 */

const ENCOUNTER_EVERY = 22000
const ENCOUNTER_CHANCE: Partial<Record<LocationId, number>> = {
  street: 0.42,
  route: 0.5,
  kiosk: 0.3,
  pitch: 0.28,
  'bloomfield-outside': 0.45,
}

export class WorldScene extends Phaser.Scene {
  static readonly KEY = 'life-world'

  private ctx!: LifeContext
  private def!: SceneDef
  /** the chapter this room is being played in — every 1986/1990 difference reads from here */
  private era!: Era
  /** the doors that exist in this era; `def.exits` filtered once, used everywhere */
  private exits: ExitDef[] = []
  /** the painting under this room in this era — `bedroom` in 1986, `bedroom90` in 1990 */
  private art = ''
  /** the walk frame last drawn, so a footstep sounds once per contact */
  private lastFrame = -1
  private spawnName = 'start'
  /** 1990: the match as an information game, or null in any other year */
  private net: TransistorNet | null = null
  /** 11.3.1991: the hall, and the same evening heard from a living-room floor */
  private derby: DerbyNight | null = null
  private afar: DerbyFromAfar | null = null

  private W = 1
  private H = 1

  private player!: Phaser.GameObjects.Image
  private shadow!: Phaser.GameObjects.Ellipse
  private vx = 0
  private vy = 0
  private facing = 1

  /**
   * לאיזה צד מסתכל הציור — every profile in this game faces RIGHT.
   *
   * This constant was born on 4.9.2026 with the wrong sign, and it is the whole of Maor's
   * "he walks with his back to the direction he is walking". The claim in the old comment
   * — that the art faces left — was made from a screen recording rather than from the
   * files. The files say otherwise, and they were opened one by one on 5.9.2026: `pogi`,
   * `pogi-side`, `pogi-w1…w8`, `hero80-side` and its eight, `hero90-side`, `teen-side`,
   * `soldier-side`, `soldier-march`, `kobi-side`, `rachel-side`, `efi-side`, `ofir-side`,
   * `tikva-side`, `sinai-side`, `gershon-side`, `oldMan-side` — every one of them has the
   * nose on the right of the head and the leading foot to the right of the body. The
   * ingest scripts say so too, in writing: 09c mirrored both walk sheets on the way in
   * *because* `pogi-side` and `hero80-side` face right.
   *
   * So `-1` mirrored a right-facing boy every time he walked right: he travelled right
   * with his back leading. `PassageScene` and `FootballScene` never used the constant and
   * were therefore never wrong — `setFlipX(facing < 0)` is exactly `ART_FACES = 1`, and
   * their being right while this scene was wrong is the last piece of the proof.
   *
   * Six files in the folder disagreed with the other seventy-six and were mirrored back
   * on disk the same day (`scripts/life/face-right-2026-09-05.py`), so the rule now has
   * no exceptions: one constant, one direction, and `scripts/life/facing-check.py` fails
   * if a new sheet arrives facing the other way.
   * `flip: true` in scene data is untouched — that is a raw mirror an author set by eye.
   */
  private static readonly ART_FACES = 1

  private lastDir: 'down' | 'up' | 'side' = 'down'
  private stride = 0

  private actors: Actor[] = []
  /** מלווים — people a conversation brought into the room, and only for it (`summonSpeakers`) */
  private companions: Actor[] = []
  private companionsLeave: Phaser.Time.TimerEvent | null = null
  /** the conversation the room currently has open — see `anchorFor` */
  private speaking: string | null = null
  private ambient: Ambient[] = []
  /** birds, a cat, dust off his own shoes, light that breathes — `runtime/living.ts` */
  private living: LivingWorld | null = null
  /** dressing that can appear mid-scene, and the two that bounce */
  private layers: Array<{ def: LayerDef; image: Phaser.GameObjects.Image; baseY: number }> = []
  private hotspots: Hotspot[] = []
  private doorLights: Array<{ exit: ExitDef; image: Phaser.GameObjects.Image; base: number }> = []
  private mark!: Phaser.GameObjects.Triangle
  private pointer!: Phaser.GameObjects.Triangle
  private target: Target | null = null
  private focused: Phaser.GameObjects.Image | null = null

  /**
   * המקום שהצבעת עליו — where the player pointed, and what to do on arrival.
   *
   * This is the whole point-and-click layer in one field. `then` is null for "just walk
   * over there" and carries a `Target` for "walk over there and talk to him", which is the
   * grammar every LucasArts adventure used and the only grammar that works with a thumb.
   */
  private goal: { x: number; y: number; then: Target | null; run: boolean } | null = null
  /** the best ground distance this walk has managed, and how long since it improved */
  private goalBest = Infinity
  private goalStalled = 0
  /** timestamp of the last tap, for the double-tap-to-run every game of this era had */
  private lastTapAt = 0
  private goalMark!: Phaser.GameObjects.Ellipse
  /** the interactable the pointer is currently over, for the hover ring */
  private hovering: Target | null = null
  private hoverRing!: Phaser.GameObjects.Ellipse

  private paused = false
  /**
   * The story director's directive for this room (plan §1) — recomputed with the HUD.
   * `ritualOpen` keeps the pre-match wardrobe from being offered twice in one room.
   */
  private directive: MainStoryDirective | null = null
  private ritualOpen = false
  /** the doors that lead to a DILEMMA's destinations — lit equally, never one arrow */
  private dilemmaExits = new Set<string>()
  private minuteAcc = 0
  private timeScale = 1
  /** the engine's flag version as of the last refresh — see `LifeEngine.flagVersion` */
  private flagCount = -1
  private matchPhase: 'none' | 'archive' | 'watching' | 'goal' | 'celebrating' | 'over' = 'none'
  /** the film currently on screen, and the reason the world is stopped */
  private cutscene: HistoricalCutscene | null = null
  /** the ~60-second match, when one is running — see `matchDirector.ts` */
  private director: MatchDirector | null = null
  /** the director's goal step, waiting for the film or the authored minute to come back */
  private afterGoal: (() => void) | null = null
  private filmWatched = false
  private goalMinute: number | null = null
  /** the one line before the goal, said once — its OWN latch, never `flagCount` */
  private saidTense = false
  private lastMatchLabel = ''
  private streamers: Phaser.GameObjects.Rectangle[] = []

  private dwell = 0
  private dwellExit: ExitDef | null = null
  /** where we came from, and whether the child has stepped clear of that doorway yet */
  private cameFrom: LocationId | null = null
  private clearedReturn = false
  /** ms in this room, for the doorway you came through (see `checkExits`) */
  private sinceArrival = 0
  /** where the child was on the previous door check — a wall is not a walk */
  private lastX = 0
  private lastY = 0
  /** how far outside a doorway counts as "behind you", as a fraction of the painting */
  private static readonly RETURN_CLEARANCE = 0.055
  /** ms since the room was entered — no door may swallow the player on arrival */
  private since = 0
  /**
   * Where the feet actually are. The drawn sprite bobs above this while walking, and for
   * one pass the bob was written back into `player.y` and read out again next frame as
   * the ground — so every side-on walk crept toward the horizon, a third of a per cent a
   * frame, until the child stood on the far edge of the band with every door he walked
   * through missing him by a hair. The ground is a number the bob never touches.
   */
  private groundY = 0
  private travelled = 0
  private idleFor = 0
  private stuckLevel = 0
  private breathe = 0
  private bobbing = 0
  private lastMinute = -1
  private sinceEncounter = 0
  /** who from the reusable pool has already spoken in this room, this visit */
  private metCrowd: string[] = []
  private baseZoom = 1
  private shotting = false
  /** how far the painted world continues above and below the painting (see `buildExtensions`) */
  private ext = 0

  constructor() {
    super(WorldScene.KEY)
  }

  /** `scene.restart()` reuses the instance; every mutable field is reset by hand. */
  init(data: { mapId?: LocationId; spawn?: string; from?: LocationId }) {
    this.panLeft = null
    // the room as it stands THIS chapter — a rebuilt ground brings its own floor (`Repaint`)
    const chapter = (this.registry.get(CONTEXT_KEY) as LifeContext | undefined)?.engine.state.chapter
    const room = sceneFor(data.mapId ?? 'bedroom')
    this.def = chapter ? sceneIn(room, chapter) : room
    this.spawnName = data.spawn ?? 'start'
    this.cameFrom = data.from ?? null
    this.clearedReturn = false
    this.sinceArrival = 0
    this.lastX = 0
    this.lastY = 0
    this.since = 0
    this.vx = 0
    this.vy = 0
    this.facing = 1
    this.lastDir = 'down'
    this.stride = 0
    this.paused = false
    this.directive = null
    this.ritualOpen = false
    this.dilemmaExits = new Set()
    this.minuteAcc = 0
    this.timeScale = 1
    this.flagCount = 0
    this.matchPhase = 'none'
    // a match cannot outlive its room: the director's timers die with the scene
    this.director?.stop()
    this.director = null
    this.afterGoal = null
    this.filmWatched = false
    this.derby = null
    this.afar = null
    this.cutscene = null
    this.goalMinute = null
    this.saidTense = false
    this.lastMatchLabel = ''
    this.streamers = []
    this.actors = []
    this.ambient = []
    this.layers = []
    this.hotspots = []
    this.doorLights = []
    this.target = null
    this.focused = null
    this.goal = null
    this.goalBest = Infinity
    this.goalStalled = 0
    this.hovering = null
    this.lastTapAt = 0
    this.dwell = 0
    this.dwellExit = null
    this.travelled = 0
    this.idleFor = 0
    this.stuckLevel = 0
    this.breathe = 0
    this.bobbing = 0
    this.lastMinute = -1
    this.sinceEncounter = 0
    this.metCrowd = []
    this.baseZoom = 1
    this.shotting = false
    this.ext = 0
    this.repaintGrade = null
    // A beat that was mid-sentence when the room changed is over: the room it spoke in
    // is gone, and a `beatBusy` left true here silences every beat in the next one.
    this.beatBusy = false
    this.beatPending = false
    // actor cues are presentation: a room change ends every one of them (delta 93)
    this.cued = new Set()
    this.cueGone = new Set()
    this.initiated = new Set()
    this.pendingCue = null
    this.restoreHud()
  }

  preload() {
    const ctx = this.registry.get(CONTEXT_KEY) as LifeContext
    const era = eraFor(ctx.engine.state.chapter)
    this.art = artFor(this.def, era.chapter)
    const need = new Set<string>([this.art, ...Object.values(era.player.pose), ...era.player.walk])
    const ext = extensionKeys(this.art)
    need.add(ext.sky)
    need.add(ext.ground)
    if ((PARALLAX as readonly string[]).includes(this.art)) {
      const planes = parallaxKeys(this.art)
      need.add(planes.far)
      need.add(planes.mid)
      need.add(planes.near)
    }
    const arrival = arrivalFor(this.def, era.chapter)
    if (arrival) need.add(arrival.art)
    for (const actor of this.def.actors) if (inEra(actor, era.chapter)) need.add(actor.figure)
    for (const actor of era.ambient) if (actor.location === this.def.id) need.add(actor.figure)
    for (const spot of this.def.hotspots) if (inEra(spot, era.chapter) && spot.prop) need.add(spot.prop.key)
    for (const layer of this.def.layers ?? []) if (inEra(layer, era.chapter)) need.add(layer.art)
    for (const key of need) {
      if (!this.textures.exists(`art-${key}`)) this.load.image(`art-${key}`, artUrl(key))
    }
  }

  /** the anchor of the chapter being played — never the 1986 one by habit */
  private get anchor(): HistoricalAnchor {
    return anchorFor(this.ctx.anchors, this.era, this.ctx.anchor)
  }

  private get chapter(): string {
    return this.era.chapter
  }

  create() {
    this.ctx = this.registry.get(CONTEXT_KEY) as LifeContext
    // read out of the log, because a scene is rebuilt on every doorway and a counter that
    // starts at zero in `create` is one the player resets by walking into the kitchen
    this.livedFor = this.countLived()
    const state = this.ctx.engine.state
    this.era = eraFor(state.chapter)
    // a master event holds the advertising lock for its whole length (see MASTER_EVENTS)
    if (WorldScene.MASTER_EVENTS.includes(state.chapter)) adDirector().lock()
    else adDirector().unlock()
    this.exits = this.def.exits.filter((exit) => exitInEra(exit, this.era.chapter))
    this.net = null
    this.derby = null
    this.afar = null

    this.cameras.main.setBackgroundColor(LIFE_PALETTE.night)
    const backdrop = this.add.image(0, 0, `art-${this.art}`).setOrigin(0, 0).setDepth(-1000)
    this.W = backdrop.width
    this.H = backdrop.height
    this.buildExtensions()
    this.buildParallax(backdrop)

    this.buildLights()
    this.buildLayers()
    this.buildActors(state)
    this.buildAmbient(state)
    this.rollWorkOffers(state)
    this.buildHotspots(state)
    this.buildPlayer()
    this.buildAir()
    this.buildLiving()
    this.buildGrade()

    /**
     * המקום שהצבעת עליו — a ring on the floor, and it is not decoration.
     *
     * Every point-and-click game of the era drew one, because a click that produces no
     * visible acknowledgement for the third of a second before the character starts moving
     * reads as a click that did not register — and the player clicks again, and again.
     * It sits at the destination, at the destination's own scale, and fades as he arrives.
     */
    this.goalMark = this.add
      .ellipse(0, 0, 26, 26 * DEPTH, LIFE_PALETTE.red, 0)
      .setStrokeStyle(2, LIFE_PALETTE.red, 0.85)
      .setDepth(1)
      .setVisible(false)

    /** …and the same ring under whatever the pointer is hovering, which is the sentence line's other half. */
    this.hoverRing = this.add
      .ellipse(0, 0, 30, 30 * DEPTH, LIFE_PALETTE.sheet, 0)
      .setStrokeStyle(2, LIFE_PALETTE.sheet, 0.5)
      .setDepth(2)
      .setVisible(false)

    this.mark = this.add
      .triangle(0, 0, 0, 0, 14, 0, 7, 11, LIFE_PALETTE.red)
      .setDepth(9500)
      .setVisible(false)
    this.pointer = this.add
      .triangle(0, 0, 0, 0, 22, 9, 0, 18, LIFE_PALETTE.red)
      .setScrollFactor(0)
      .setDepth(9600)
      .setVisible(false)

    this.frameWorld()
    // The grade is built BEFORE the camera is framed, so it sized its wash and its
    // vignette to a viewport that does not exist yet — which on a tall phone painted a
    // pale rectangle across two thirds of the picture and left the rest ungraded. One
    // repaint, once the viewport is real. (It was invisible on the older, softer art and
    // obvious the moment a clean sky arrived.)
    this.repaintGrade?.()
    this.boundCamera()
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09)
    this.followPlayer()
    /**
     * הכניסה — a settle, not a cut.
     *
     * Every door used to land on a still frame. The camera now arrives a hair tighter
     * than it will rest and eases out over the fade-in: the room is entered in movement,
     * which is the fourth of the five tricks in the roadmap's grammar of entering a scene
     * (establish → cross the threshold → settle). Small — 4% — so it is felt, not watched.
     */
    this.cameras.main.setZoom(this.baseZoom * 1.04)
    this.tweens.add({ targets: this.cameras.main, zoom: this.baseZoom, duration: 760, ease: 'Sine.easeOut' })
    this.cameras.main.fadeIn(300, 0, 0, 0)
    this.scale.on('resize', this.onResize, this)

    /**
     * הצבעה — the control scheme this game should always have had.
     *
     * Phaser gives world coordinates on the pointer, so a tap is a place: the same handler
     * serves a mouse, a trackpad and a thumb, and no code below this line knows which one
     * it was. Movement keys still work and still win — `movePlayer` drops the goal the
     * instant an axis moves — because the two schemes are not rivals. Full Throttle shipped
     * both as well.
     */
    /**
     * The two pointer listeners are removed on shutdown, like the resize listener above.
     *
     * This scene is restarted on every doorway in the game — several thousand times in a
     * full playthrough — and these were registered fresh each time with no `.off()`,
     * trusting Phaser's input plugin to clear them. It does today. The `resize` listener
     * four lines up is unregistered explicitly, which is the pattern; this is the same
     * pattern, applied. If the framework assumption ever changes, the alternative is every
     * tap firing N times for the rest of the session. (Code audit, 6.9.2026.)
     */
    const onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (this.paused || this.matchPhase === 'archive') return
      if (!this.onPicture(pointer.x, pointer.y)) return
      this.pointAt(pointer.worldX, pointer.worldY)
    }
    const onPointerMove = (pointer: Phaser.Input.Pointer) => {
      if (this.paused) return
      // Hover is a mouse idea. A finger dragging across the glass is a drag, not a hover,
      // and lighting up every object it passes over is noise.
      if (pointer.isDown || pointer.wasTouch) return
      this.hovering = this.onPicture(pointer.x, pointer.y) ? this.pickAt(pointer.worldX, pointer.worldY) : null
    }
    this.input.on('pointerdown', onPointerDown)
    this.input.on('pointermove', onPointerMove)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', onPointerDown)
      this.input.off('pointermove', onPointerMove)
      // a HUD a beat turned off never outlives the room it was turned off in
      this.restoreHud()
    })

    this.ctx.dialogue.setHooks({
      travel: (to, spawn) => this.travel(to as LocationId, spawn),
      minigame: (id: string) => this.startMinigame(id),
      ending: (id) => this.finishChapter(id),
      shot: (shot) => this.frameShot(shot),
      anchorFor: (who) => this.anchorFor(who),
      meet: (who) => this.meetSpeaker(who),
      cast: (names) => {
        this.summonSpeakers(names)
        // a breath, so a companion who had to load is standing before the camera looks
        this.time.delayedCall(80, () => this.frameSpeakers(names))
      },
      onOpen: (open) => {
        this.paused = open
        if (!open) this.speaking = null
        if (!open) this.releaseCompanions()
        if (open) {
          this.vx = 0
          this.vy = 0
          this.clearGoal()
          this.ctx.bus.emit('prompt', null)
        } else {
          this.progress()
        }
      },
    })

    this.ctx.engine.dispatch({ t: 'moved', to: this.def.id })
    this.freeTimeKey = ''
    // The timetable applies the MOMENT the room is drawn, not on the next minute tick.
    // Building the scene from the definition and then correcting it a second later is
    // how a player sees somebody who is not supposed to be there — and it is how the
    // playthrough harness found Amit standing in the kiosk doorway twenty minutes
    // before he arrives.
    this.applySchedule()
    this.ctx.bus.emit('place', { id: this.def.id, title: this.def.titleHe, ambience: this.def.ambience })
    // The first time in a room, ever, is a fact of the life (`life:been:*` survives every
    // year) — and it is what puts a place on the city map (`lib/life/map.ts`).
    if (!this.ctx.engine.state.flags[`life:been:${this.def.id}`]) {
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: `life:been:${this.def.id}` })
      /**
       * לראות את המגרש זה לראות את המגרש — however you got there.
       *
       * `saw:road` is the flag that puts Bloomfield on the map, and it was raised by ONE
       * thing: the arrival plate on the road east, the first sight of the floodlights over
       * the rooftops. That is the right moment and it is not the only one — 28.9.1985 puts
       * a seven-year-old in his father's car and sets him down outside the ground, and a
       * boy who has stood at Gate 7 with his father and then cannot find Bloomfield on his
       * own map is being told he was never there. (Map audit, 6.9.2026.)
       */
      if (this.def.id === 'bloomfield-outside' && !this.ctx.engine.state.flags['saw:road']) {
        this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'saw:road' })
      }
    }
    this.flagCount = this.ctx.engine.flagVersion
    this.pushHud()
    // The board belongs to the terrace. Walk out through the tunnel after the whistle and
    // the strip used to follow the boy into the street, over the HUD, all the way home.
    if (this.def.id !== 'bloomfield-inside') this.ctx.bus.emit('match', null)
    this.teach()
    // The deck is part of the room (5.9.2026). A chapter cut (`enterChapter`) hides it
    // for its card and restarts the scene, and nothing on this side ever said "back":
    // from 1993 on the joystick was simply gone for the whole chapter, and a thumb could
    // not move the boy. Every room now shows it on arrival; an arrival card, a film or
    // the match director hide it again themselves for exactly as long as they run.
    this.ctx.bus.emit('controls', { visible: true })

    const arrival = arrivalFor(this.def, this.chapter)
    if (arrival && !state.flags[arrival.flag]) this.playArrival()
    else {
      this.beginMatch()
      this.beginNight()
    }

    // a free-time walk that just landed here: the room must have something in it (§33)
    const landed = WorldScene.landing
    if (landed) {
      WorldScene.landing = null
      this.time.delayedCall(600, () => this.checkLanding(landed.plan, landed.early))
    }

    /**
     * ערב שיש בו משחק — in any year, not only in 1991.
     *
     * `uss:arrived` was raised in exactly one place: the 1991 derby. Every conversation in
     * `dialogueUssishkin.ts` reads it to decide whether the hall is full tonight or empty,
     * so on the promotion evening of 1997 and both relegation nights the steward greeted a
     * grown man with "אין היום כלום, חביבי" while the hall behind him was packed. The flag
     * is a fact about the ROOM — is there basketball here tonight — so it is raised
     * wherever the room is the hall and the chapter is one of the hall's own.
     */
    if (this.def.id === 'ussishkin-hall' && HALL_NIGHTS.includes(this.chapter) && !state.flags['uss:arrived']) {
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'uss:arrived' })
    }

    // …and if a season turned on the way into this room, the rail has something new on it
    this.announceNewShirts()
    this.announceNewAlbums()
    this.announceSeasonTicket()
    this.offerRoute()
    this.playActivityReaction()

    this.openChapterBeat(state)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.onResize, this))
  }

  // ---------------------------------------------------------------------- build ---

  /**
   * שמיים ומדרכה — the painting continued, so a tall screen has something to show.
   *
   * Both strips are the same width as the painting and sit flush against it, sky above
   * (bottom edge at y = 0) and ground below (top edge at y = H). If either failed to load
   * the world simply ends at the painting, as it always did, and the camera bounds say so.
   */
  /**
   * עומק — three planes where the painter gave us three (4.9.2026).
   *
   * The flat painting stays exactly where it was — it is what the extension strips,
   * the doors and every fraction in the scene file are measured against — and it is
   * hidden under the planes. FAR scrolls at 0.86 of the camera, so the sky and the far
   * facades slide slower than the wall; MID is the wall and the ground at 1.0, pixel-
   * aligned with the flat painting, so nothing the player touches has moved; NEAR is a
   * lamp post, a car bonnet, a branch at 1.16, drawn OVER the child and scaled up by
   * the same amount so it reads as nearer, with a breath of blur where the renderer
   * can afford one. That last plane is the whole reason a phone can feel like a
   * diorama: something passes between you and the boy.
   *
   * Only X scrolls. Vertically the camera roams the extension strips, and a far plane
   * that lagged vertically would peel off the strips; a near plane is mostly empty and
   * needs no vertical coverage at all.
   */
  private buildParallax(flat: Phaser.GameObjects.Image) {
    if (!(PARALLAX as readonly string[]).includes(this.art)) return
    const keys = parallaxKeys(this.art)
    if (!this.textures.exists(`art-${keys.far}`) || !this.textures.exists(`art-${keys.mid}`)) return
    flat.setVisible(false)
    /**
     * A PLANE IS SIZED TO THE WORLD, NEVER TO ITS OWN FILE (16.9.2026).
     *
     * `add.image` draws a texture at its own pixel size and every plane on disk is smaller
     * than the backdrop it stands in for, so MID — this comment's own "pixel-aligned with
     * the flat painting" — covered the top-left 58% of gate seven and the world was black
     * under it. `parallaxPlane` holds the geometry and `tests/life-parallax.test.ts` holds
     * `parallaxPlane`; the full story is written where the arithmetic is.
     */
    const place = (plane: ParallaxPlane, key: string, depth: number) => {
      const box = parallaxPlane(plane, this.W, this.H)
      const image = this.add.image(box.x, box.y, `art-${key}`).setOrigin(0, 0).setDepth(depth)
      image.setDisplaySize(box.width, box.height)
      image.setScrollFactor(box.scroll, 1)
      return image
    }
    place('far', keys.far, -999)
    place('mid', keys.mid, -998)
    if (this.textures.exists(`art-${keys.near}`)) {
      const near = place('near', keys.near, 7000)
      // No blur: a post-FX pass on a full-screen plane halved the frame rate on the
      // software renderer and would do the same on a 2019 phone. The scale and the
      // speed are the depth; the alpha is the air between.
      near.setAlpha(0.9)
    }
  }

  private buildExtensions() {
    const keys = extensionKeys(this.art)
    if (!this.textures.exists(`art-${keys.sky}`) || !this.textures.exists(`art-${keys.ground}`)) return
    const sky = this.add.image(0, 0, `art-${keys.sky}`).setOrigin(0, 1).setDepth(-1001)
    const ground = this.add.image(0, this.H, `art-${keys.ground}`).setOrigin(0, 0).setDepth(-1001)
    sky.setDisplaySize(this.W, sky.height * (this.W / sky.width))
    ground.setDisplaySize(this.W, ground.height * (this.W / ground.width))
    this.ext = Math.min(sky.displayHeight, ground.displayHeight)
  }

  private fit(image: Phaser.GameObjects.Image, height: number) {
    const source = this.textures.get(image.texture.key).getSourceImage()
    image.setDisplaySize(height * ((source.width || 1) / (source.height || 1)), height)
  }

  /**
   * אור בפתח — the single highest-value thing in this pass.
   *
   * A doorway painted into a picture is not a door until something says so. Each exit
   * gets a soft glow over its own opening, always on, breathing at a rate slow enough to
   * be felt rather than watched. `daylight` is warmer and stronger and is reserved for
   * the way OUT of a building — it is how a front door stops looking like a bedroom door.
   */
  private buildLights() {
    for (const exit of this.exits) {
      if (!exit.light) continue
      const image = this.add
        .image(exit.light.x * this.W, exit.light.y * this.H, 'life-glow')
        .setOrigin(0, 0)
        .setDisplaySize(exit.light.w * this.W, exit.light.h * this.H)
        .setDepth(-900)
      const daylight = exit.light.tone === 'daylight'
      image.setTint(daylight ? LIFE_PALETTE.sheet : LIFE_PALETTE.lamp)
      const base = daylight ? 0.4 : 0.24
      image.setAlpha(base)
      this.doorLights.push({ exit, image, base })
    }
  }

  /**
   * הרחוב מתלבש — layers, which since the living pass means dressing as well as occlusion.
   *
   * Two things happen here that did not before. A layer may be CONDITIONAL, so the road
   * to the ground can be empty at noon and have a supporters' coach parked on it at four
   * without a second scene or a line of code; and a layer may be anchored by its FOOT,
   * which is the only honest way to stand a car on a pavement that recedes — the top-left
   * of a car plate is a point in the sky and means nothing.
   *
   * Conditions are read once, at `create`, against the state the player walked in with.
   * That is deliberate: dressing that pops in while you are looking at it reads as a bug,
   * and every condition used here turns over on a door, not on a tick.
   */
  /**
   * Every layer is BUILT, and `when` decides whether it is visible rather than whether it
   * exists.
   *
   * It used to `continue` past a layer whose condition was unmet, which was correct for
   * every piece of dressing this game had: a car that is gone by four o'clock is gone
   * because the player crossed the street again and the scene was rebuilt. The terrace is
   * the first dressing whose condition turns TRUE while the player is standing in the
   * room — the crowd appears at full time, in a scene nobody leaves — and a layer that was
   * skipped at `create` can never come back. So they are all built, hidden, and toggled by
   * `refresh` exactly as the actors are.
   */
  private buildLayers() {
    const state = this.ctx.engine.state
    for (const layer of this.def.layers ?? []) {
      if (!inEra(layer, this.chapter)) continue
      const image = this.add.image(layer.x * this.W, layer.y * this.H, `art-${layer.art}`)
      const source = this.textures.get(image.texture.key).getSourceImage()
      const width = layer.w * this.W
      const height = width * ((source.height || 1) / (source.width || 1))
      image.setOrigin(layer.foot ? 0.5 : 0, layer.foot ? 1 : 0)
      image.setDisplaySize(width, height)
      image.setDepth(layer.depth * this.H)
      if (layer.flip) image.setFlipX(true)
      if (layer.alpha !== undefined) image.setAlpha(layer.alpha)
      if (layer.tint !== undefined) image.setTint(layer.tint)
      image.setVisible(meets(state, layer.when))
      this.layers.push({ def: layer, image, baseY: image.y })
    }
  }

  /**
   * היציע קופץ — the only moving dressing in the game, and it costs one sine.
   *
   * Phase comes from the layer's own x, so thirty people on a terrace are never in step
   * with each other; `Math.abs` makes it a bounce rather than a float, because a crowd
   * that celebrates by hovering is a crowd of ghosts.
   */
  private bobLayers(delta: number) {
    // Its OWN accumulator. `this.breathe` is in seconds and drives the pointer, the door
    // lights and the player's own bob; borrowing a clock is how a fix to one of those
    // silently changes the speed of a crowd.
    this.bobbing += delta / 1000
    const gust = this.living?.gustNow() ?? 0
    for (const entry of this.layers) {
      const amount = entry.def.bob
      const phase = entry.def.x * 37
      if (amount && entry.image.visible) {
        entry.image.y = entry.baseY - Math.abs(Math.sin(this.bobbing * 5.2 + phase)) * amount * this.H
      }
      /**
       * הרוח עוברת בחדר — every piece of dressing leans, not only the ones that bounce.
       *
       * A gust crosses the room every ten seconds or so (`runtime/living.ts`) and this is
       * where it lands: a fifth of a per cent of the frame, sheared by the object's own
       * phase so a washing line and a poster four metres away do not move together. It is
       * the difference between air and no air. Objects standing on the floor lean less
       * than things hanging on a wall, which is why the amount is scaled by depth.
       */
      if (gust > 0.01 && entry.image.visible) {
        const lean = entry.def.foot ? 0.15 : 1
        entry.image.rotation = Math.sin(this.bobbing * 3.1 + phase) * gust * 0.02 * lean
      } else if (entry.image.rotation !== 0) {
        entry.image.rotation *= 0.9
      }
    }
  }

  private buildPlayer() {
    const spawn = this.def.spawns[this.spawnName] ?? Object.values(this.def.spawns)[0] ?? { x: 0.5, y: 0.9 }
    const x = spawn.x * this.W
    const y = Phaser.Math.Clamp(spawn.y, this.band().far, this.band().near) * this.H
    this.facing = spawn.facing === 'left' ? -1 : 1
    this.shadow = this.add.ellipse(x, y, 40, 12, LIFE_PALETTE.ink, 0.3).setDepth(y - 1)
    this.player = this.add.image(x, y, `art-${this.era.player.pose.down}`).setOrigin(0.5, 1).setDepth(y)
    this.groundY = y
    this.applyScale(this.player, this.shadow, y, this.playerSize())
  }

  /**
   * כמה גבוה הילד — and it is the same height in every room, which it was not.
   *
   * Delta 30 moved every BODY off the hand-typed `def.size` and onto `heights.ts`, and
   * the comment under `bodySizeAt` says so: *"Not `def.size` any more."* The boy was never
   * moved with them. He kept reading the room's own `size` band — a number typed per room,
   * for framing — so he arrived at a different height in each one while everybody around
   * him was measured in metres.
   *
   * Measured on 15.9.2026 with `scripts/life/actor-sizes.ts` once that script was fixed to
   * report what the engine draws: in 1986 the eight-year-old is **1.20m on the dirt pitch
   * and 1.41m at gate five** — he grows twenty-one centimetres by walking, and `heights.ts`
   * says `pogi` is 1.30m. Ten rooms disagreed with the registry by more than five.
   *
   * Now he is sized the way the people beside him are: the room says what a metre is,
   * `heights.ts` says how tall he is, and `player.scale` carries the only thing the room
   * cannot know — how old he is this chapter (1.0 at eight, 1.26 at twenty-two). The
   * room's `size` band survives as the PERSPECTIVE taper, which is what it is good at and
   * the one thing `heights.ts` cannot supply.
   */
  private playerSize(): { far: number; near: number } {
    const k = this.era.player.scale ?? 1
    const taper = this.def.size.far / Math.max(1e-6, this.def.size.near)
    // `pogi` is the anchor by the type's own words: `PlayerFigure.scale` is documented as
    // "how tall this year's boy stands against the room's band, which was measured for the
    // eight-year-old". So the child height is the base and `scale` carries the ageing —
    // reading the era's own walk figure here would count the growth twice.
    const near = this.def.metre * heightOf('pogi') * k
    return { far: near * taper, near }
  }

  private applyScale(
    image: Phaser.GameObjects.Image,
    shadow: Phaser.GameObjects.Ellipse,
    y: number,
    size: { far: number; near: number },
  ) {
    const band = this.band()
    const t = Phaser.Math.Clamp((y / this.H - band.far) / Math.max(0.0001, band.near - band.far), 0, 1)
    const height = Phaser.Math.Linear(size.far, size.near, t) * this.H
    this.fit(image, height)
    shadow.setSize(image.displayWidth * 0.6, image.displayWidth * 0.19)
    shadow.setPosition(image.x, y + 1)
    shadow.setDepth(y - 1)
    image.setDepth(y)
  }

  /**
   * כמה גבוה מישהו כאן — the only place a body's drawn size is decided.
   *
   * Not `def.size` any more. A size typed by hand, per actor, per room, is a number that
   * is right on its own and wrong beside the man next to it — measured off the running
   * game on 6.9.2026 it had produced a 0.87-metre customer in the kiosk, a 0.89-metre
   * steward on the gate at Bloomfield and two basketball players under seventy centimetres
   * on the parquet at Ussishkin. Thirty-four bodies in all.
   *
   * Now: the room says what a metre is, `heights.ts` says how tall this person is, and the
   * depth down the walk band applies the room's own perspective. A body cannot be the
   * wrong size unless the room's metre is wrong, and the room's metre is one number that
   * one test checks.
   */
  private bodySizeAt(figure: string, y: number): number {
    const band = this.band()
    const depth = Phaser.Math.Clamp((y / this.H - band.far) / Math.max(1e-6, band.near - band.far), 0, 1)
    const taper = this.def.size.far / Math.max(1e-6, this.def.size.near)
    return bodySize(figure, this.def.metre, depth, taper, yearOfChapter(this.chapter))
  }

  private buildActors(state: LifeState) {
    for (const def of this.def.actors) {
      if (!inEra(def, this.chapter)) continue
      const x = def.x * this.W
      const y = def.y * this.H
      const shadow = this.add.ellipse(x, y, 40, 12, LIFE_PALETTE.ink, 0.26)
      const image = this.add.image(x, y, `art-${def.figure}`).setOrigin(0.5, 1)
      image.setFlipX(def.flip === true)
      const size = this.bodySizeAt(def.figure, y)
      this.applyScale(image, shadow, y, { far: size, near: size })
      const visible = meets(state, def.when)
      image.setVisible(visible)
      shadow.setVisible(visible)
      this.actors.push({ def, image, shadow, baseX: x, phase: Math.random() * Math.PI * 2 })
    }
  }

  /**
   * הרקע החי — people crossing the picture, on their own clocks, for nobody.
   *
   * Each one is a single image that walks its own line, waits, and starts again. There is
   * no pathfinding and no schedule to keep: an ambient actor is not a person, it is the
   * evidence that people exist. They are drawn WITHOUT interaction — no name, no prompt,
   * no reach — so a player never walks up to one and finds out the street is scenery.
   *
   * The one thing they carry is the chapter's argument. Before ten past three the street
   * has two people going about a Saturday; after it, the same street has supporters, all
   * walking east, more of them every twenty minutes. Nobody says which way Bloomfield is.
   */
  private buildAmbient(state: LifeState) {
    for (const def of this.era.ambient) {
      if (def.location !== this.def.id) continue
      const y = def.y * this.H
      const shadow = this.add.ellipse(0, y, 40, 12, LIFE_PALETTE.ink, 0.2)
      const image = this.add.image(def.from * this.W, y, `art-${def.figure}`).setOrigin(0.5, 1)
      this.fit(image, this.bodySizeAt(def.figure, y) * this.H)
      // walking the way he faces — a body drawn walking left (`facesLeft`) is not flipped to go left
      image.setFlipX((def.to > def.from === (WorldScene.ART_FACES < 0)) !== facesLeft(def.figure))
      shadow.setSize(image.displayWidth * 0.55, image.displayWidth * 0.16)
      const visible = meets(state, def.when)
      image.setVisible(visible)
      shadow.setVisible(visible)
      this.ambient.push({ def, image, shadow, clock: def.offsetMs ?? 0 })
    }
  }

  private moveAmbient(delta: number) {
    const state = this.ctx.engine.state
    for (const entry of this.ambient) {
      const { def } = entry
      const on = meets(state, def.when)
      entry.clock += delta
      const cycle = def.ms + def.everyMs + (def.pauseMs ?? 0)
      if (entry.clock > cycle) entry.clock -= cycle
      if (!on || entry.clock < 0 || entry.clock > def.ms + (def.pauseMs ?? 0)) {
        entry.image.setVisible(false)
        entry.shadow.setVisible(false)
        continue
      }

      // A pause partway across, because nobody walks a street at a constant speed and a
      // figure that does reads as a sprite on a conveyor belt.
      let progress: number
      const pauseStart = (def.pauseAt ?? 2) * def.ms
      if (def.pauseMs && entry.clock > pauseStart && entry.clock <= pauseStart + def.pauseMs) {
        progress = pauseStart / def.ms
      } else if (def.pauseMs && entry.clock > pauseStart + def.pauseMs) {
        progress = (entry.clock - def.pauseMs) / def.ms
      } else {
        progress = entry.clock / def.ms
      }

      const x = Phaser.Math.Linear(def.from, def.to, Phaser.Math.Clamp(progress, 0, 1)) * this.W
      const bob = Math.abs(Math.sin((entry.clock / 1000) * 5)) * this.H * 0.004
      entry.image.setPosition(x, def.y * this.H - bob)
      entry.shadow.setPosition(x, def.y * this.H + 1)
      entry.image.setDepth(def.y * this.H)
      entry.shadow.setDepth(def.y * this.H - 1)
      entry.image.setVisible(true)
      entry.shadow.setVisible(true)
    }
  }

  private buildHotspots(state: LifeState) {
    for (const def of this.def.hotspots) {
      if (!inEra(def, this.chapter)) continue
      const x = def.x * this.W
      const y = def.y * this.H
      const spot: Hotspot = { def, x, y, w: (def.w ?? 0.06) * this.W }
      if (def.prop) {
        const at = def.prop.at ?? def
        const image = this.add.image(at.x * this.W, at.y * this.H, `art-${def.prop.key}`).setOrigin(0.5, 1)
        this.fit(image, def.prop.size * this.H)
        // Drawn above the floor (on a table, a shelf): it sits behind whoever stands in
        // front of it, so its depth is the stand-point's, not the tabletop's.
        image.setDepth(Math.min(y, at.y * this.H) - 2)
        image.setVisible(meets(state, def.when))
        spot.prop = image
      }
      this.hotspots.push(spot)
    }
  }

  private buildAir() {
    const air: Record<string, { n: number; tint: number; speed: number; alpha: number; scale: number }> = {
      interior: { n: 26, tint: LIFE_PALETTE.lamp, speed: 7, alpha: 0.22, scale: 0.8 },
      kitchen: { n: 20, tint: LIFE_PALETTE.lamp, speed: 6, alpha: 0.2, scale: 0.7 },
      day: { n: 22, tint: LIFE_PALETTE.sheet, speed: 14, alpha: 0.16, scale: 1.0 },
      dusk: { n: 34, tint: LIFE_PALETTE.sheet, speed: 18, alpha: 0.2, scale: 1.2 },
      tunnel: { n: 14, tint: LIFE_PALETTE.lamp, speed: 5, alpha: 0.16, scale: 0.7 },
      stadium: { n: 46, tint: LIFE_PALETTE.sheet, speed: 26, alpha: 0.5, scale: 1.6 },
      // a low hall under a tin roof: warm dust in the window light, slower than a terrace
      hall: { n: 30, tint: LIFE_PALETTE.lamp, speed: 9, alpha: 0.3, scale: 1.1 },
    }
    const cfg = air[this.def.air ?? this.def.ambience] ?? air['day']
    if (!cfg) return
    this.add
      .particles(0, 0, 'life-dot', {
        x: { min: 0, max: this.W },
        y: { min: 0, max: this.H * 0.95 },
        quantity: 1,
        frequency: Math.max(40, 1600 / cfg.n),
        lifespan: 9000,
        speedX: { min: -cfg.speed, max: cfg.speed },
        speedY: { min: -cfg.speed * 0.6, max: cfg.speed * 0.35 },
        scale: { start: cfg.scale, end: cfg.scale * 0.4 },
        alpha: { start: cfg.alpha, end: 0 },
        tint: cfg.tint,
        blendMode: 'NORMAL',
      })
      .setDepth(4000)
  }

  /**
   * מה מוצע לעבוד השבוע — the rotation, written once per chapter and then left alone.
   *
   * `offeredIn` is pure: the same save and the same chapter always choose the same jobs,
   * so this can be re-run on every room build without the street changing under the boy's
   * feet. It is written as flags rather than computed in the hotspot filter because flags
   * are what a `Condition` can read, what a save persists and what a probe can print.
   */
  private rollWorkOffers(state: LifeState) {
    const offered = offeredIn(this.chapter, state.rng.seed)
    for (const gig of GIGS) {
      if (!isPaid(gig)) continue
      const flag = offerFlag(gig)
      if (!offered.has(gig.id) || state.flags[flag]) continue
      this.ctx.engine.dispatch({ t: 'flag.raised', flag })
    }
    /**
     * הרחוב של הפעילויות (21.9.2026) — written once a chapter, like the rotation above and
     * for its reasons: flags are what a `Condition` reads, what a save keeps and what a
     * probe prints. The neighbour stands in the street in about every other chapter; the
     * parliament by the fence is two to four of this chapter's crowd, off the save's seed.
     */
    if (neighbourAsks(this.chapter, state.rng.seed) && !state.flags[NEIGHBOUR_OFFER]) {
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: NEIGHBOUR_OFFER })
    }
    const moneyEra = eraOf(this.chapter)
    if (state.flags[ERA_FLAG] !== moneyEra) this.ctx.engine.dispatch({ t: 'flag.set', flag: ERA_FLAG, value: moneyEra })
    if (!state.flags[CROWD_FLAG]) {
      const names = parliamentOf(state, this.chapter)
      if (names.length > 0) this.ctx.engine.dispatch({ t: 'flag.set', flag: CROWD_FLAG, value: names.join('|') })
    }
  }

  /**
   * התגובה בחדר — a chore returns through a scene restart, so the person who asked for it
   * speaks when the room is built again (`act:after`, written by the chore scene). An
   * activity played in a sheet over the paused room is answered by the shell instead.
   */
  private playActivityReaction() {
    const pending = this.ctx.engine.state.flags[AFTER_FLAG]
    if (typeof pending !== 'string' || pending === '') return
    this.ctx.engine.dispatch({ t: 'flag.set', flag: AFTER_FLAG, value: '' })
    this.time.delayedCall(520, () => {
      if (this.paused || this.ctx.dialogue.open) return
      this.ctx.dialogue.start(pending)
    })
  }

  /**
   * העולם החי — built last of the world objects, so it can measure the room it lives in.
   *
   * Everything it draws is procedural (`runtime/living.ts`), so this costs no art and
   * runs in every room including the ones nobody has painted dressing for yet.
   */
  private buildLiving() {
    this.living = new LivingWorld({
      scene: this,
      W: this.W,
      H: this.H,
      ambience: this.def.ambience,
      band: this.band(),
      player: () =>
        this.player
          ? { x: this.player.x, y: this.groundY, moving: Math.abs(this.vx) > 4 || Math.abs(this.vy) > 4 }
          : null,
    })
    this.living.build()
  }

  /**
   * מישהו שם לב שנכנסת — the cheapest thing in this whole pass, and the one that changes
   * the most.
   *
   * A room whose people face the same way whatever you do is a diorama. When the boy
   * comes within about a metre and a half of somebody, that person turns towards him;
   * when he walks away, they go back to whatever they were facing. Nothing is said, no
   * bubble opens, no state is written — they just turn, which is what people do.
   *
   * Actors that were authored flipped keep their own default, so a man drawn looking at a
   * wall goes back to looking at the wall.
   */
  private noticePlayer() {
    if (!this.player) return
    const reach = this.def.metre * 1.6 * this.W
    for (const actor of this.actors) {
      if (!actor.image.visible || this.cued.has(actor.def.id)) continue
      const dx = this.player.x - actor.image.x
      const dy = (this.groundY - actor.image.y) / DEPTH
      const near = Math.hypot(dx, dy) < reach
      if (near) {
        // face him. The art's own direction decides which flip means "towards" — and that is
        // the ART's direction, not the author's `flip`: `flip: true` on a body that faces
        // right means "looking left", and reading it as "this art faces left" turned every
        // such person AWAY from the man walking up to them (21.9.2026)
        actor.image.setFlipX(((dx < 0) === WorldScene.ART_FACES > 0) !== facesLeft(actor.def.figure))
      } else {
        actor.image.setFlipX(actor.def.flip === true)
      }
    }
  }

  /** the grade's own repaint, kept so it can be re-run once the camera is framed */
  private repaintGrade: (() => void) | null = null

  private buildGrade() {
    // Lighter than it was, on every outdoor state.
    //
    // The grade was tuned against paintings that were soft, warm and already low in
    // contrast. The September frames arrive with their own depth — real shadow on the
    // paving, a sky that goes somewhere — and the old wash sat on top of that like a
    // dirty window. Interiors keep their weight, because a room genuinely is darker
    // than a street at three in the afternoon.
    const grade: Record<string, { tint: number; alpha: number; vignette: number }> = {
      interior: { tint: LIFE_PALETTE.roof, alpha: 0.08, vignette: 0.42 },
      kitchen: { tint: LIFE_PALETTE.shutter, alpha: 0.07, vignette: 0.4 },
      day: { tint: LIFE_PALETTE.sky, alpha: 0.035, vignette: 0.22 },
      dusk: { tint: LIFE_PALETTE.redDeep, alpha: 0.06, vignette: 0.28 },
      tunnel: { tint: LIFE_PALETTE.night, alpha: 0.2, vignette: 0.72 },
      stadium: { tint: LIFE_PALETTE.red, alpha: 0.05, vignette: 0.3 },
      hall: { tint: LIFE_PALETTE.redDeep, alpha: 0.07, vignette: 0.46 },
    }
    const cfg = grade[this.def.ambience] ?? grade['day']
    if (!cfg) return
    const wash = this.add.rectangle(0, 0, 10, 10, cfg.tint, cfg.alpha).setOrigin(0, 0).setScrollFactor(0).setDepth(6000)
    const vignette = this.add.graphics().setScrollFactor(0).setDepth(6001)
    /**
     * `setScrollFactor(0)` pins a thing to the camera. It does NOT exempt it from zoom.
     *
     * Phaser places a scroll-locked object at `(p − half) × zoom + half`, so a rectangle
     * of `cam.width × cam.height` drawn at (0, 0) covers the glass only when the zoom is
     * exactly 1 — above it the wash overhangs harmlessly, and BELOW it the wash lands
     * inset on all four sides and the eye reads a pale rectangle sitting on the picture.
     * The street zooms past 1 on every viewport and looked perfect; gate seven zooms to
     * 0.9 and wore a visible box around two thirds of Bloomfield.
     *
     * So the overlay is sized in world units — `cam.width / zoom` — and offset by half
     * the difference, which is the exact inverse of the transform above. It now covers
     * the glass, edge to edge, at any zoom.
     */
    const paint = () => {
      const cam = this.cameras.main
      const zoom = cam.zoom || 1
      const w = cam.width / zoom
      const h = cam.height / zoom
      const left = (cam.width - w) / 2
      const top = (cam.height - h) / 2
      wash.setPosition(left, top)
      wash.setSize(w, h)
      vignette.clear()
      vignette.setPosition(left, top)
      const steps = 24
      const band = Math.max(w, h) * 0.4
      for (let i = 0; i < steps; i += 1) {
        const a = (cfg.vignette * (i + 1)) / steps / steps
        const inset = (band * (steps - i)) / steps
        vignette.fillStyle(LIFE_PALETTE.ink, a)
        vignette.fillRect(0, 0, w, inset * 0.5)
        vignette.fillRect(0, h - inset * 0.6, w, inset * 0.6)
        vignette.fillRect(0, 0, inset * 0.5, h)
        vignette.fillRect(w - inset * 0.5, 0, inset * 0.5, h)
      }
    }
    this.repaintGrade = paint
    paint()
    this.scale.on('resize', paint, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', paint, this))
  }

  /**
   * המסגור — full-bleed, camera-framed. The rule of the whole mobile pass, in one place.
   *
   * The painting covers the glass (see `fillCamera`); on a phone held upright that means
   * a tall slice of the room and the camera travelling along it with the child. `lift`
   * magnifies a touch past cover so a portrait screen has some vertical travel too —
   * enough for `followPlayer` to hold the floor band above a thumb resting on the bottom
   * of the glass, not enough to turn a room into a close-up.
   *
   * The shell is told `picture: 0` — "there is no frame; the picture is the glass" — and
   * lays its dialogue, deck and hairline out over the painting instead of under it.
   */
  /** how much dark margin may show above and below the painting, as a fraction of its height */
  private static readonly MARGIN = 0.06

  /** the viewport `frameWorld` last ran against — `keepFramed` re-runs it when it moves */
  private framedW = 0
  private framedH = 0

  private frameWorld() {
    const cam = this.cameras.main
    const view = this.scale.gameSize
    this.framedW = view.width
    this.framedH = view.height
    /**
     * 5.9.2026 — the painting owns the glass.
     *
     * The old rule showed 42% of a room's width on a phone and paid for it with a third
     * of the screen of stretched, blurred "ground" under the picture — the smear Maor
     * photographed. The rule now is the one every side-scroller uses: the picture is
     * scaled so its HEIGHT fills the glass (plus a thin dark margin, top and bottom, that
     * reads as the room standing in the dark), the camera follows the child sideways, and
     * what you cannot see of the street is off to the side where it belongs. A landscape
     * window simply covers.
     */
    const margin = this.H * WorldScene.MARGIN
    const frame = this.H + 2 * margin
    const byHeight = view.height / frame
    const byWidth = view.width / this.W
    const zoom = Number(Math.min(7, Math.max(byHeight, byWidth) * 1.005).toFixed(3))
    cam.setViewport(0, 0, view.width, view.height)
    cam.setZoom(zoom)
    this.baseZoom = cam.zoom
    this.ctx.bus.emit('frame', { picture: 0 })
  }

  /**
   * איפה הילד עומד על הזכוכית — low, but never under the thumb.
   *
   * With the picture covering the screen there is no band under it for the controls, so
   * they float over the floor. The camera therefore aims to keep the child's feet around
   * 68% of the way down the glass rather than at its centre: he stands in the lower third
   * where a walker belongs, and the strip of floor beneath him is the strip the deck
   * covers. The bounds clamp wins at the edges of the painting, which is fine — at the top
   * of a room there is nothing to lift.
   *
   * The deadzone is narrow on purpose. A wide one let him walk a third of the screen
   * before the camera moved, which on a phone is most of the visible street.
   */
  private followPlayer() {
    const cam = this.cameras.main
    cam.setDeadzone(cam.width * 0.14, cam.height * 0.1)
    this.aimCamera()
  }

  /**
   * המבט קדימה — the camera leans the way the child is facing.
   *
   * A camera locked to the character's spine shows as much of the street behind him as in
   * front, and on a phone that is half the screen spent on where he has already been.
   * Leaning a twelfth of the view toward his facing is what every side-scroller since the
   * 16-bit era did; the follow lerp turns the change of heading into a slow pan rather
   * than a snap. Vertical: feet at 68% of the glass (see `followPlayer`).
   */
  /**
   * המצלמה נושמת — the lead, plus a drift small enough that nobody can point at it.
   *
   * A camera locked to a walking sprite is the exact feeling Maor asked to get rid of
   * (6.9.2026): the boy moves, the picture does not, and the room reads as wallpaper
   * behind him. Two sines — one slow and horizontal, one slower and vertical, at a fifth
   * of a per cent of the view — put the frame permanently, invisibly in motion, the way a
   * shoulder-held camera is never quite still. It is felt in the shot and cannot be seen
   * in a screenshot, which is exactly the right size for it.
   */
  private aimCamera() {
    const cam = this.cameras.main
    const view = cam.height / cam.zoom
    const lead = (this.lastDir === 'side' ? this.facing : 0) * (cam.width / cam.zoom) * 0.08
    const driftX = Math.sin(this.breathe * 0.37) * (cam.width / cam.zoom) * 0.006
    const driftY = Math.sin(this.breathe * 0.23 + 1.4) * view * 0.005
    cam.setFollowOffset(-lead + driftX, (0.68 - 0.5) * view + driftY)
  }

  /**
   * עד לאן המצלמה רשאית לנדוד — the thin margin above and below the painting, and on a
   * phone held upright a little more of the ground.
   *
   * The margin is the diorama's dark edge: the extension strips exist for that edge case,
   * not as scenery. But with the painting's height filling the glass (`frameWorld`) the
   * world was exactly one screen tall, the camera could not move vertically at all, and
   * the 68% that `followPlayer` asks for was a number nothing could honour: a child on
   * the near line stood at 85–88% of the glass — under the deck, with the prompt strip
   * across his shins, on every phone (delta 91, measured by `screens-probe`). So in
   * portrait the bottom bound dips into the ground strip by up to 14% of the view: the
   * camera can lift him clear of the console, and what that reveals under his feet is
   * the strip the console covers anyway. Landscape and desktop keep the tight margin —
   * the legend there is a thin line, and the smear would show.
   */
  private boundCamera() {
    const cam = this.cameras.main
    const margin = Math.min(this.ext, this.H * WorldScene.MARGIN)
    const view = cam.height / (cam.zoom || 1)
    // ...and a phone turned sideways (a glass shorter than 0.6 of its width) is a
    // console over the floor as well; a laptop at 1280×800 is 0.625 and keeps the margin.
    const console = cam.height > cam.width || cam.height / cam.width < 0.6
    const dip = console ? Math.max(0, Math.min(this.ext - margin, view * 0.14)) : 0
    cam.setBounds(0, -margin, this.W, this.H + 2 * margin + dip)
  }

  private onResize() {
    this.frameWorld()
    this.boundCamera()
    this.followPlayer()
  }

  /**
   * החדר ממוסגר מחדש כשהזכוכית משנה גודל, ולא רק כשהוא נבנה.
   *
   * The camera is framed once, in `create`, off `this.scale.gameSize`, and after that only
   * `this.scale.on('resize')` can correct it. That is one event, from one emitter, in a
   * scale mode (`Scale.NONE` plus a manual `setZoom`) that the shell drives by hand — and
   * a number measured once and then trusted forever is the shape of rule 50. A phone
   * rotating, a keyboard opening, the browser's chrome bar sliding away and a first paint
   * that arrived before layout settled are four different bugs if the event is the only
   * correction and the same non-event if the scene simply checks.
   *
   * So it checks: one comparison per tick against the size it actually framed against.
   *
   * **Written after a wrong diagnosis, and kept on its own merits.** It was added because
   * a phone screenshot showed the street two fifths tall with the child standing below the
   * painting on the camera's background — and that screenshot turned out to be the
   * PROLOGUE, which is a dark drifting shot by design and has its own framing entirely.
   * The probe reported `location: 'prologue'` when finally asked. Nothing in `frameWorld`
   * was broken. This stays because re-framing on a size change is correct anyway, and the
   * note stays because the next person to read a screenshot should ask which scene it is
   * before they measure it.
   */
  private keepFramed() {
    const view = this.scale.gameSize
    if (view.width === this.framedW && view.height === this.framedH) return
    if (view.width <= 0 || view.height <= 0) return
    this.frameWorld()
    this.boundCamera()
    this.followPlayer()
  }

  // --------------------------------------------------------------------- update ---

  override update(_time: number, delta: number) {
    this.ctx.input.beginFrame()
    this.keepFramed()
    this.breathe += delta / 1000
    this.pulseLights()
    // BEFORE the pause check. A crowd that freezes the moment a dialogue box opens is a
    // painted crowd, and the one place this runs is the terrace at full time — which is
    // exactly where the player stops to talk to somebody.
    this.bobLayers(delta)
    if (this.paused) return

    this.since += delta
    if (this.beatPending) this.runBeats('enter')
    this.movePlayer(delta)
    if (!this.shotting) this.aimCamera()
    this.moveActors(delta)
    this.moveAmbient(delta)
    this.living?.update(delta)
    this.noticePlayer()
    this.maybeInitiative()
    this.tickClock(delta)
    this.net?.tick(delta)
    this.derby?.tick(delta)
    this.tickEncounters(delta)
    // `aim` picks what the ACTION BUTTON would do, from proximity. It must not overwrite a
    // target the player pointed at and is still walking towards, or the sentence line
    // flickers between "talk to Kobi" and whatever he happens to be passing.
    if (!this.goal?.then) this.aim()
    this.paintHover()
    if (this.ctx.input.actionPressed) this.act()
    this.autoExits(delta)
    this.tickStuck(delta)

    // any flag write, not just a new key — a `flag.set` on an existing flag used to leave
    // the room showing whoever the old value said was there (code audit, 6.9.2026)
    if (this.ctx.engine.flagVersion !== this.flagCount) this.refresh()
  }

  /**
   * The keyboard is read by the shell (`app/life/LifeStage.tsx`) and written into
   * `ctx.input`, because a scene restart forgets which keys are held and the document
   * does not. The scene only ever reads.
   */

  // ------------------------------------------------------------- point and click ---

  /**
   * הרצפה — the rectangle the child may stand on, in pixels.
   *
   * Two percent of the width is kept at each edge because a figure is drawn from its feet
   * and a walker pressed flat against the frame has half of himself off it.
   */
  /**
   * רצועת ההליכה — the room's band, or the one this chapter overrides it with.
   *
   * Every reader of the band goes through here, so a night that narrows the floor
   * (`bandByEra`) narrows it for walking, for perspective, for body size and for what
   * counts as an obstacle, all at once — rather than in four places that drift apart.
   */
  private band(): { far: number; near: number } {
    return this.def.bandByEra?.[this.chapter] ?? this.def.band
  }

  private bounds(): Bounds {
    return {
      left: this.W * 0.02,
      right: this.W * 0.98,
      top: this.band().far * this.H,
      bottom: this.band().near * this.H,
    }
  }

  /**
   * מה עומד בדרך — everything standing on the floor that a walker has to go round.
   *
   * People and dressing, and nothing else: the backdrop has no collision because a painted
   * wall is above the band by construction. Radii come from the drawn object rather than
   * from a number in a scene file, so re-cutting a bin at a different size moves its
   * footprint with it. The vertical radius is squashed by `DEPTH` for the same reason the
   * whole band is: an object as deep as it is wide occupies about a third as much screen
   * height as screen width.
   */
  private blockers(): Blocker[] {
    const out: Blocker[] = []
    for (const actor of this.actors) {
      if (!actor.image.visible) continue
      const rx = actor.image.displayWidth * 0.34
      out.push({ x: actor.image.x, y: actor.image.y, rx, ry: rx * DEPTH })
    }
    for (const entry of this.layers) {
      const layer = entry.def
      if (!layer.foot || !entry.image.visible) continue
      if (layer.depth < this.band().far) continue
      const rx = entry.image.displayWidth * 0.36
      out.push({ x: entry.image.x, y: entry.baseY, rx, ry: rx * DEPTH })
    }
    return out
  }

  /**
   * מה יש שם — what is under a point on the painting, if anything.
   *
   * Hit boxes are DELIBERATELY bigger than the art. `docs` and the mobile directive both
   * say the same thing and it is the difference between a game and a test of finger
   * accuracy: the visible object stays small, the thing you have to hit does not. A person
   * is hit anywhere in their own silhouette plus a third; a hotspot gets a generous
   * ellipse; a door gets its whole declared rectangle. Priority breaks ties, so tapping
   * Kobi never opens the door behind him.
   */
  private pickAt(x: number, y: number): Target | null {
    const state = this.ctx.engine.state
    let best: Target | null = null
    let bestScore = -Infinity
    const take = (candidate: Target, near: number) => {
      const score = candidate.priority * 1000 - near
      if (score > bestScore) {
        bestScore = score
        best = candidate
      }
    }

    for (const actor of this.actors) {
      if (!actor.image.visible || !actor.def.talk) continue
      const rx = Math.max(actor.image.displayWidth * 0.7, this.W * 0.022)
      const ry = Math.max(actor.image.displayHeight * 0.55, this.H * 0.05)
      const dx = (x - actor.image.x) / rx
      const dy = (y - (actor.image.y - actor.image.displayHeight * 0.45)) / ry
      if (dx * dx + dy * dy > 1) continue
      take(
        {
          kind: 'act',
          act: actor.def.talk,
          verb: 'talk',
          label: actor.def.nameHe,
          x: actor.image.x,
          y: actor.image.y,
          priority: 4,
        },
        Math.hypot(dx, dy),
      )
    }

    for (const spot of this.hotspots) {
      if (!meets(state, spot.def.when)) continue
      const rx = Math.max(spot.w, this.W * 0.03)
      const ry = Math.max(this.H * 0.09, rx * 0.5)
      const dx = (x - spot.x) / rx
      const dy = (y - spot.y) / ry
      if (dx * dx + dy * dy > 1) continue
      take(
        {
          kind: 'act',
          act: spot.def.act,
          verb: spot.def.verb,
          label: spot.def.labelHe,
          x: spot.x,
          y: spot.y,
          priority: spot.def.priority ?? 1,
        },
        Math.hypot(dx, dy),
      )
    }

    for (const exit of this.exits) {
      if (!meets(state, whenFor(exit, this.chapter))) continue
      const left = exit.x * this.W
      const right = (exit.x + exit.w) * this.W
      const top = exit.y * this.H
      const bottom = (exit.y + exit.h) * this.H
      // A door is worth reaching for from a little outside itself, because its art is
      // usually a dark rectangle at the edge of the frame.
      const pad = this.W * 0.02
      if (x < left - pad || x > right + pad || y < top - pad || y > bottom + pad) continue
      take(
        {
          kind: 'exit',
          exit,
          verb: 'exit',
          label: exit.labelHe,
          locked: !meets(state, needsFor(exit, this.chapter)),
          x: (left + right) / 2,
          y: (top + bottom) / 2,
          priority: exit.priority ?? 2,
        },
        0,
      )
    }
    return best
  }

  /**
   * איפה עומדים כדי לעשות את זה — the spot a walker has to reach to use a thing.
   *
   * Never the thing's own position: standing inside a person is not talking to them, and
   * standing in the middle of a doorway is how the auto-exit swallows you before the
   * conversation opens. So the stand-point is on the walker's side of the target, one
   * body-width out, clamped into the band — which is exactly what those games did and why
   * their characters always stopped in a natural place.
   */
  private standPoint(target: Target): { x: number; y: number } {
    const bounds = this.bounds()
    const y = Math.min(bounds.bottom, Math.max(bounds.top, target.y))
    if (target.kind === 'exit') {
      // Doors are entered from the room, not from the frame edge.
      const inward = target.x < this.W * 0.5 ? 1 : -1
      return clampToBand({ x: target.x + inward * this.W * 0.03, y }, bounds)
    }
    // Wide enough to be BESIDE them rather than on top of them: the walker's own width
    // and the target's, so a conversation with a seated man in an armchair does not end
    // with a child standing in the armchair.
    const theirs = target.kind === 'act' ? this.actorWidth(target.act) : 0
    const gap = Math.max(this.player.displayWidth * 0.75 + theirs * 0.5, this.W * 0.03)
    const side = this.player.x <= target.x ? -1 : 1
    return clampToBand({ x: target.x + side * gap, y }, bounds)
  }

  /**
   * איפה הדובר עומד — the fraction of the camera's view the balloon's tail points at.
   *
   * Maor's references on 16.9.2026 all had the same thing in common and it is not a
   * layout: the words are attached to the PERSON. Ours had the tail pinned 36 pixels from
   * the balloon's edge, which points at the speaker's side of the screen and not at the
   * speaker — so with two people three metres apart it was right by accident and wrong
   * the rest of the time.
   *
   * `null` means "do not draw a tail at this position": narration, a voice on a radio, a
   * name nobody in the room answers to. The box falls back to its old fixed corner, which
   * is exactly what it should do when the scene genuinely does not know.
   *
   * The player is matched by the name the box prints for him rather than by an actor —
   * he is not in `this.actors`, he is `this.player`, and his own lines are a third of any
   * conversation.
   */
  /** the probe's way in — the same answer the balloon's tail is given, by name */
  anchorDebug(who: string | null): { anchor: number | null; speaking: string | null; view: number; names: string[] } {
    return {
      anchor: this.anchorFor(who),
      speaking: this.speaking,
      view: this.cameras.main?.worldView?.width ?? -1,
      names: this.actors.filter((a) => a.image.visible).map((a) => `${a.def.id}|${a.def.nameHe ?? ''}|${a.def.talk ?? ''}`),
    }
  }

  /**
   * המצלמה פוגשת את מי שמדבר, שורה-שורה (21.9.2026).
   *
   * `frameSpeakers` מכוון את המצלמה פעם אחת, בפתיחת השיחה. בשיחה של ארבעה אנשים בטלפון
   * זה לא מספיק: באולם האימונים של 2007 ענבל שואלת *"מי שומר את המפתח?"* מחוץ לתמונה, ובתיבה
   * יש פנים בלי אדם. כאן, לפני כל שורה, אם מי שמדבר עומד בחדר ומחוץ לצילום — המצלמה זזה
   * אליו (ואל פוגי, אם שניהם נכנסים), והזנב מחושב מול המקום שאליו היא זזה.
   */
  private panLeft: number | null = null

  private speakerX(who: string): number | null {
    if (this.player && who === this.ctx.engine.state.identity.name) return this.player.x
    const byTalk = this.speaking ? this.actors.find((entry) => entry.def.talk === this.speaking && entry.image.visible) : undefined
    if (byTalk && (byTalk.def.nameHe === who || !this.actors.some((e) => e.def.nameHe === who))) return byTalk.image.x
    const byName = this.actors.find((entry) => entry.def.nameHe === who && entry.image.visible)
    return byName ? byName.image.x : null
  }

  private meetSpeaker(who: string | null) {
    if (!who || !this.player) return
    const x = this.speakerX(who)
    if (x === null) return
    const cam = this.cameras.main
    const view = cam.worldView
    if (view.width <= 0) return
    const left = this.panLeft ?? view.x
    const margin = view.width * 0.08
    if (x >= left + margin && x <= left + view.width - margin) return
    const room = view.width - margin * 2
    let cx = Math.abs(x - this.player.x) <= room ? (x + this.player.x) / 2 : x
    const bounds = cam.getBounds()
    cx = Phaser.Math.Clamp(cx, bounds.x + view.width / 2, bounds.right - view.width / 2)
    this.shotting = true
    cam.stopFollow()
    cam.pan(cx, cam.midPoint.y, 420, 'Sine.easeInOut')
    this.panLeft = cx - view.width / 2
  }

  private anchorFor(who: string | null): number | null {
    if (!who) return null
    const view = this.cameras.main?.worldView
    if (!view || view.width <= 0) return null
    const viewLeft = this.panLeft ?? view.x
    const at = (worldX: number): number | null => {
      const fraction = (worldX - viewLeft) / view.width
      // a speaker who has walked off the edge of the shot gets no tail rather than a tail
      // clamped to the corner, which would be a lie about where he is
      return fraction < -0.05 || fraction > 1.05 ? null : Math.max(0, Math.min(1, fraction))
    }
    if (this.player && who === this.ctx.engine.state.identity.name) return at(this.player.x)
    /**
     * The CONVERSATION first, the name second — and the order is the whole fix.
     *
     * The first cut matched `def.nameHe === who` and a browser probe found it answering
     * null for a neighbour who was standing four metres away with his box open. A line's
     * `who` is free text the writer types (rule: `Say.who` is a display name, and the same
     * person is `קובי` in one scene and `אבא` in the next), so matching a person by the
     * string above their own words was only ever going to work for the people whose
     * writer happened to type their `nameHe`.
     *
     * `this.speaking` is the conversation the room opened, and `def.talk` is the actor it
     * belongs to — the same lookup `actorWidth` has used since the shot system landed.
     * That resolves the person for every line of theirs, whatever the writer calls them,
     * and the name match stays as the second try for a conversation somebody else joins.
     */
    const byTalk = this.speaking
      ? this.actors.find((entry) => entry.def.talk === this.speaking && entry.image.visible)
      : undefined
    if (byTalk && (byTalk.def.nameHe === who || !this.actors.some((e) => e.def.nameHe === who))) {
      return at(byTalk.image.x)
    }
    const byName = this.actors.find((entry) => entry.def.nameHe === who && entry.image.visible)
    return byName ? at(byName.image.x) : null
  }

  /**
   * ------------------------------------------------ מי שמדבר — נמצא (21.9.2026) ----
   *
   * שיחה של ביט-שעון נפתחת בכל חדר שבו פוגי עומד, והאנשים שמדברים בה לא הוצבו בו — הם
   * לא ידעו שהוא יהיה שם. עד היום זה נראה כמו מה שזה היה: ארבעה אנשים מדברים, והחדר ריק.
   * עכשיו מי שמדבר ואינו עומד בחדר, אינו בטלפון (`Conversation.remote`) ואין לשיחה מקום
   * אחר (`Conversation.where`), **נכנס** — מהצד, לידו, פונה אליו — ויוצא כשהשיחה נגמרת.
   *
   * רק בחיים הבוגרים (2000 והלאה), כי שם הטבלה של הגופים (`world/castFigures.ts`) יודעת
   * איך כל אחד נראה בשנים האלה; בשנות השמונים והתשעים כל מי שמדבר כבר עומד בחדר, והמנגנון
   * לא נוגע בהם. מי שאין לו גוף — קול, מקהלה, אדם שלא צויר — לא נכנס, ונשאר שם בתיבה בלבד.
   */
  private summonSpeakers(names: readonly string[]) {
    if (yearOfChapter(this.chapter) < 2000 || !this.player) return
    this.companionsLeave?.remove(false)
    this.companionsLeave = null
    const band = this.band()
    const py = Phaser.Math.Clamp(this.player.y / this.H, band.far, band.near)
    const px = this.player.x / this.W
    let slot = 0
    for (const who of names) {
      if (this.actors.some((actor) => actor.image.visible && actor.def.nameHe === who)) continue
      const body = castFigure(who, yearOfChapter(this.chapter))
      if (!body) continue
      const n = slot++
      // right of him first, then left, then a step further out on each side
      const side = n % 2 === 0 ? 1 : -1
      const reach = 0.12 + Math.floor(n / 2) * 0.085
      let x = px + side * reach
      if (x > 0.95 || x < 0.05) x = px - side * reach
      x = Phaser.Math.Clamp(x, 0.05, 0.95)
      const y = Phaser.Math.Clamp(py + (n % 2 === 0 ? -0.018 : 0.012), band.far, band.near)
      const key = `art-${body.figure}`
      const place = () => this.placeCompanion(who, body.figure, x, y)
      if (this.textures.exists(key)) place()
      else {
        this.load.image(key, artUrl(body.figure))
        this.load.once(Phaser.Loader.Events.COMPLETE, place)
        this.load.start()
      }
    }
  }

  /**
   * המצלמה פוגשת את מי שמדבר (21.9.2026).
   *
   * בטלפון המצלמה מראה כ-42% מרוחב החדר, ממורכזת על פוגי (`frameWorld`). באלנבי של 2012
   * הוא נכנס משמאל, החבורה עומדת מול בית הקפה מימין — והשיחה נפתחה עם זנב שמצביע אל מחוץ
   * לזכוכית ושלושה אנשים שאף אחד לא רואה. שיחה שהתוכן כתב לה `shot` מקבלת את הצילום שלה;
   * כל שיחה אחרת בחיים הבוגרים, אם מישהו מהדוברים מחוץ לתמונה, מזיזה את המצלמה אל
   * האמצע שבינו לבין הקבוצה — ו-`frameShot(null)` בסוף השיחה מחזיר אותה אליו, כמו אחרי
   * כל צילום.
   */
  private frameSpeakers(names: readonly string[]) {
    if (yearOfChapter(this.chapter) < 2000 || this.shotting || !this.player || !this.ctx.dialogue.open) return
    const cam = this.cameras.main
    const xs = this.actors.filter((actor) => actor.image.visible && names.includes(actor.def.nameHe)).map((actor) => actor.baseX)
    if (!xs.length) return
    const view = cam.worldView
    const margin = view.width * 0.1
    const lo = Math.min(this.player.x, ...xs)
    const hi = Math.max(this.player.x, ...xs)
    if (lo >= view.x + margin && hi <= view.right - margin) return
    // everyone if they fit; else him and the nearest of them; else the people talking — he
    // is the one listening, and a frame of the pavement between them shows nobody
    const room = view.width - margin * 2
    const nearest = xs.reduce((best, x) => (Math.abs(x - this.player.x) < Math.abs(best - this.player.x) ? x : best))
    const cx =
      hi - lo <= room
        ? (lo + hi) / 2
        : Math.abs(nearest - this.player.x) <= room
          ? (nearest + this.player.x) / 2
          : (Math.min(...xs) + Math.max(...xs)) / 2
    this.shotting = true
    cam.stopFollow()
    cam.pan(cx, cam.midPoint.y, 560, 'Sine.easeInOut')
    this.panLeft = cx - view.width / 2
  }

  private placeCompanion(who: string, figure: string, x: number, y: number) {
    if (!this.sys.isActive() || !this.textures.exists(`art-${figure}`)) return
    if (this.actors.some((actor) => actor.image.visible && actor.def.nameHe === who)) return
    const X = x * this.W
    const Y = y * this.H
    const shadow = this.add.ellipse(X, Y, 40, 12, LIFE_PALETTE.ink, 0.26)
    const image = this.add.image(X, Y, `art-${figure}`).setOrigin(0.5, 1)
    const size = this.bodySizeAt(figure, Y)
    this.applyScale(image, shadow, Y, { far: size, near: size })
    // he is the one they came to talk to
    const faceLeft = X > this.player.x
    image.setFlipX((faceLeft === WorldScene.ART_FACES > 0) !== facesLeft(figure))
    const from = X + (faceLeft ? 1 : -1) * this.W * 0.035
    image.x = from
    shadow.x = from
    image.setAlpha(0)
    shadow.setAlpha(0)
    this.tweens.add({ targets: [image, shadow], alpha: 1, x: X, duration: 420, ease: 'Sine.easeOut' })
    const def: ActorDef = { id: `companion-${who}`, figure, x, y, nameHe: who }
    const actor: Actor = { def, image, shadow, baseX: X, phase: 0 }
    this.actors.push(actor)
    this.companions.push(actor)
  }

  /** after the last line, a breath, and then they go the way they came */
  private releaseCompanions() {
    if (!this.companions.length) return
    this.companionsLeave?.remove(false)
    this.companionsLeave = this.time.delayedCall(1600, () => {
      const leaving = this.companions
      this.companions = []
      this.companionsLeave = null
      this.actors = this.actors.filter((actor) => !leaving.includes(actor))
      for (const actor of leaving) {
        this.tweens.add({
          targets: [actor.image, actor.shadow],
          alpha: 0,
          duration: 380,
          onComplete: () => {
            actor.image.destroy()
            actor.shadow.destroy()
          },
        })
      }
    })
  }

  /** How wide the person behind this conversation is drawn, or 0 if it is not a person. */
  private actorWidth(act: string): number {
    const actor = this.actors.find((entry) => entry.def.talk === act && entry.image.visible)
    return actor ? actor.image.displayWidth : 0
  }

  /**
   * הצבעת. עכשיו הוא הולך.
   *
   * The one thing this must never do is teleport him, and the second thing is refuse. A tap
   * on a wall is not an error — it is a player saying "over there", and the honest answer
   * is to walk as far in that direction as the floor allows.
   */
  private pointAt(x: number, y: number) {
    // Double-tap to run, which is what every game on Maor's list did and what makes a long
    // walk across the yard a decision rather than a wait. The second tap does not have to
    // land in the same place — a player who taps twice is a player saying "hurry".
    const now = this.time.now
    const run = now - this.lastTapAt < 420
    this.lastTapAt = now

    const target = this.pickAt(x, y)
    const bounds = this.bounds()
    if (target) {
      const stand = this.standPoint(target)
      this.goal = { x: stand.x, y: stand.y, then: target, run }
      this.goalBest = Infinity
      this.goalStalled = 0
      this.showGoalMark(target.x, target.y)
      // Show what is about to happen before it happens, which is the sentence line.
      this.target = target
      this.pushPrompt(target)
      return
    }
    const spot = clampToBand({ x, y }, bounds)
    this.goal = { x: spot.x, y: spot.y, then: null, run }
    this.goalBest = Infinity
    this.goalStalled = 0
    this.showGoalMark(spot.x, spot.y)
  }

  /** True when this walk has stopped getting closer for long enough to call it stuck. */
  private stalled(left: number, delta: number, reach: number): boolean {
    if (left < this.goalBest - reach * 0.12) {
      this.goalBest = left
      this.goalStalled = 0
      return false
    }
    this.goalStalled += delta
    return this.goalStalled > 1500
  }

  /**
   * Is this canvas point ON THE PAINTING?
   *
   * הקנבס גדול מהתמונה. On a phone held upright the camera's viewport shrinks to the
   * picture and keeps its composition (rule 40) — but the CANVAS is still the whole box,
   * so there is a strip of live canvas under the picture where the dialogue box and the
   * console live. Phaser computes `worldX` from the main camera for a pointer anywhere on
   * that canvas, so a thumb landing on the console band came back as a perfectly
   * plausible place in the room and the child walked to it. A tap on a button is not a
   * tap on the floor, and this is the line that says so.
   */
  private onPicture(canvasX: number, canvasY: number): boolean {
    const cam = this.cameras.main
    return (
      canvasX >= cam.x &&
      canvasY >= cam.y &&
      canvasX <= cam.x + cam.width &&
      canvasY <= cam.y + cam.height
    )
  }

  /**
   * A tap the shell caught, in CLIENT pixels, turned into a place in the painting.
   *
   * The obvious version of this — scale the client offset by `cam.width / rect.width` —
   * is right on a desktop and WRONG ON EVERY PHONE, which is exactly where it was needed.
   * `rect` is the canvas; `cam.width × cam.height` is the framed picture inside it, and
   * on a tall screen those are different rectangles. Scaling one onto the other squashed
   * the whole world into the top of the glass: a thumb on the boy's feet arrived at his
   * chest, a thumb near the bottom of the picture arrived in the middle of the room, and
   * the further down you touched the wronger it got.
   *
   * So the conversion goes through the canvas's own coordinate space — `scale.width`,
   * which is what `rect` actually maps to — and only then subtracts the camera's viewport
   * origin. A point outside the picture is not a place, and is refused rather than
   * clamped: clamping would walk the child to the nearest floor tile every time somebody
   * pressed a button.
   */
  pointAtScreen(clientX: number, clientY: number) {
    if (this.paused || this.matchPhase === 'archive') return
    const canvas = this.game.canvas
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const canvasX = ((clientX - rect.left) / rect.width) * this.scale.width
    const canvasY = ((clientY - rect.top) / rect.height) * this.scale.height
    if (!this.onPicture(canvasX, canvasY)) return
    const cam = this.cameras.main
    this.pointAt(cam.scrollX + (canvasX - cam.x) / cam.zoom, cam.scrollY + (canvasY - cam.y) / cam.zoom)
  }

  private showGoalMark(x: number, y: number) {
    const size = Math.max(18, this.player.displayHeight * 0.34)
    this.goalMark.setPosition(x, y).setSize(size, size * DEPTH).setVisible(true).setAlpha(1)
    this.goalMark.setDisplaySize(size, size * DEPTH)
    this.tweens.killTweensOf(this.goalMark)
    this.tweens.add({ targets: this.goalMark, alpha: 0.15, duration: 620, yoyo: true, repeat: -1 })
  }

  private clearGoal() {
    this.goal = null
    this.goalBest = Infinity
    this.goalStalled = 0
    this.tweens.killTweensOf(this.goalMark)
    this.goalMark.setVisible(false)
  }

  /** The ring under whatever the mouse is over, sized to it. Touch never sees this. */
  private paintHover() {
    const target = this.hovering
    if (!target) {
      this.hoverRing.setVisible(false)
      return
    }
    const size = Math.max(22, this.player.displayHeight * 0.4)
    this.hoverRing.setPosition(target.x, target.y).setDisplaySize(size, size * DEPTH).setVisible(true)
  }

  private pushPrompt(target: Target | null) {
    if (!target) {
      this.ctx.bus.emit('prompt', null)
      return
    }
    this.ctx.bus.emit('prompt', {
      verb: target.verb,
      label: target.label,
      locked: target.kind === 'exit' && target.locked,
    })
  }

  private movePlayer(delta: number) {
    const input = this.ctx.input
    const bounds = this.bounds()

    /**
     * שני מקורות תנועה, ואחד מהם תמיד מנצח.
     *
     * A stick or an arrow key is a person taking the wheel, so it cancels wherever they had
     * pointed — instantly, before any of the arithmetic below. Anything else and the child
     * fights the player for the last half-second of a walk, which is the single most
     * irritating bug a point-and-click game can have.
     */
    const manual = Math.abs(input.x) + Math.abs(input.y) > 0.08
    if (manual && this.goal) this.clearGoal()

    let ax = input.x
    let ay = input.y
    let arrived: Target | null | undefined

    if (!manual && this.goal) {
      const here = { x: this.player.x, y: this.player.y }
      const way = nextWaypoint(here, this.goal, this.blockers(), this.player.displayWidth * 0.28)
      const left = groundDistance(here, this.goal)
      // Close enough is a body-width, measured on the GROUND — the same tolerance at both
      // ends of a band, where a pixel radius would be generous up close and impossible far
      // away.
      const reach = Math.max(this.player.displayWidth * 0.5, this.W * 0.012)
      if (left <= reach) {
        arrived = this.goal.then
        this.clearGoal()
      } else if (this.stalled(left, delta, reach)) {
        /**
         * הליכה שלא מתקדמת נעצרת. תמיד.
         *
         * Nothing in a point-and-click game may leave the player watching a character
         * shuffle against something forever, and a steering behaviour CAN — a destination
         * in a corner behind two obstacles, an actor who moved into the last gap. So the
         * walk is watched: if a second and a half passes without getting meaningfully
         * closer, it ends. If we got close enough to be useful the thing still happens;
         * otherwise control simply comes back, and the player can point again.
         */
        arrived = left <= reach * 2.6 ? this.goal.then : null
        this.clearGoal()
      } else {
        const dx = way.x - here.x
        const dy = (way.y - here.y) / DEPTH
        const len = Math.hypot(dx, dy) || 1
        const ease = arrivalEase(left, reach * 3.2)
        ax = (dx / len) * ease
        ay = (dy / len) * ease
      }
    }

    const running = (input.run || this.goal?.run === true) && this.ctx.engine.state.energy > 6
    const speed = (running ? RUN : WALK) * this.player.displayHeight
    const ease = 1 - Math.pow(0.0015, delta / 1000)

    this.vx = Phaser.Math.Linear(this.vx, ax * speed, ease)
    this.vy = Phaser.Math.Linear(this.vy, ay * speed * DEPTH, ease)

    const step = delta / 1000
    const nx = Phaser.Math.Clamp(this.player.x + this.vx * step, bounds.left, bounds.right)
    const ny = Phaser.Math.Clamp(this.groundY + this.vy * step, bounds.top, bounds.bottom)
    const movedX = nx - this.player.x
    const movedY = ny - this.groundY
    this.travelled += Math.abs(movedX) + Math.abs(movedY)
    this.groundY = ny
    this.player.setPosition(nx, ny)

    const moving = Math.abs(ax) + Math.abs(ay) > 0.08
    if (moving) {
      if (Math.abs(ax) > Math.abs(ay) * 0.8) {
        this.lastDir = 'side'
        this.facing = ax < 0 ? -1 : 1
      } else {
        this.lastDir = ay < 0 ? 'up' : 'down'
      }
    }

    /**
     * איזה מחזור שייך לכיוון הזה — and it is decided here, above everything that uses it,
     * because `strideAdvance` divides by the number of frames in the cycle it is feeding.
     *
     * This used to be one branch — `moving && lastDir === 'side'` — over one list, with a
     * comment saying the child's cycle "only exists side-on". On 16.9.2026 the eight files
     * that list held were looked at: `pogi-w1…w8` have no face and no badge on the shirt.
     * They are BACK views. So side-on had been playing a boy walking away from the camera
     * while sliding along the street, and the heading those frames belong to — into the
     * picture — had no animation at all. Both halves of that are fixed by asking the art
     * registry which cycle each heading owns and accepting that a heading may own none:
     * `down` never has, and an era with no away sheet keeps the standing pose and the bob.
     */
    const cycle =
      this.lastDir === 'side'
        ? this.era.player.walk
        : this.lastDir === 'up'
          ? WALK_AWAY[this.era.player.pose.up] ?? null
          : null

    if (moving) {
      /**
       * הרגליים לא מחליקות יותר.
       *
       * This was `(delta / 1000) * 7.5` — frames per second, regardless of speed, size or
       * distance — and it is why Maor said the movement fakes it. A walk cycle belongs to
       * the FLOOR: the planted foot must stay planted, so the cycle advances by ground
       * covered divided by the length of a stride, and a stride is a fraction of a body.
       * At the far end of the pitch the child is half the size and covers half the ground,
       * and his legs now move half as fast to match, which is the whole illusion.
       */
      this.stride += strideAdvance(
        Math.hypot(movedX, movedY / DEPTH),
        this.player.displayHeight,
        (cycle ?? this.era.player.walk).length,
      )
      this.idleFor = 0
    }

    // The child is the one character with a real walk cycle, and he now has two: a
    // side-on pair in profile and eight frames of his back, each on the heading it was
    // drawn for. Facing the camera — the one heading nobody drew a cycle for — a bob
    // does the work, as it did for all three before.
    if (moving && cycle) {
      const index = Math.floor(this.stride) % cycle.length
      const frame = cycle[index] ?? cycle[0]
      this.player.setTexture(`art-${frame}`)
      // A foot lands on the contact frames (the first of each half of the cycle) — and
      // on a two-frame stand-in, on every frame change.
      if (index !== this.lastFrame) {
        this.lastFrame = index
        if (cycle.length < 6 || index % Math.floor(cycle.length / 2) === 0) {
          const surface = this.def.ambience === 'stadium' ? 'terrace' : this.def.ambience === 'day' || this.def.ambience === 'dusk' ? 'street' : 'floor'
          this.ctx.bus.emit('sound', { kind: 'step', surface })
        }
      }
    } else {
      const poses = this.era.player.pose
      const pose = this.lastDir === 'up' ? poses.up : this.lastDir === 'side' ? poses.side : poses.down
      this.player.setTexture(`art-${pose}`)
    }
    this.player.setFlipX(this.facing !== WorldScene.ART_FACES)

    this.applyScale(this.player, this.shadow, ny, this.playerSize())
    if (moving) {
      // The bob runs on EVERY heading now, side-on included.
      //
      // It used to be the substitute for an animation and was therefore suppressed
      // exactly where the animation existed. Pogi's side-on pair holds two strides rather
      // than eight, so the bob is no longer a substitute — it is half the walk, and the
      // two frames read as steps because the body rises between them. The amount is
      // decided by whether a cycle is playing rather than by the heading's name: where a
      // real leg is already moving it is small, and where nothing is drawn it is the
      // whole animation and has to be seen.
      const lift = cycle ? 0.0032 : 0.005
      this.player.y = ny - Math.abs(Math.sin(this.stride)) * this.H * lift
    }

    if (running) this.ctx.engine.dispatch({ t: 'energy.changed', delta: -delta / 2400 })
    if (this.travelled > this.W * 0.06) this.progress()

    // …and if this frame ended a walk that was going somewhere for a reason, do the thing.
    // After the move, so the child is standing where he will be seen to be standing.
    if (arrived) {
      this.turnTo(arrived)
      this.target = arrived
      this.act()
    }
  }

  /**
   * מסתובבים אל מי שבאת לדבר איתו.
   *
   * A child who walks across the room to his father and then delivers the conversation
   * with his back to him is the tell that the arrival was a distance check rather than a
   * meeting — and it is the single frame the player looks at for the whole conversation,
   * because the box that opens next freezes the world. Every game on Maor's list turns the
   * character before the first line. Side-on gets the flip; a target that is mostly above
   * or below gets the matching standing pose, so a hotspot on the floor is looked DOWN at.
   */
  private turnTo(target: Target) {
    const dx = target.x - this.player.x
    const dy = (target.y - this.player.y) / DEPTH
    if (Math.abs(dx) > Math.abs(dy) * 0.8) {
      this.lastDir = 'side'
      this.facing = dx < 0 ? -1 : 1
      this.player.setTexture(`art-${this.era.player.pose.side}`)
    } else {
      this.lastDir = dy < 0 ? 'up' : 'down'
      this.player.setTexture(`art-${this.lastDir === 'up' ? this.era.player.pose.up : this.era.player.pose.down}`)
    }
    this.player.setFlipX(this.facing !== WorldScene.ART_FACES)
  }

  private moveActors(delta: number) {
    for (const actor of this.actors) {
      if (!actor.def.sway || !actor.image.visible || this.cued.has(actor.def.id)) continue
      actor.phase += (delta / 1000) * 1.1
      actor.image.x = actor.baseX + Math.sin(actor.phase) * actor.def.sway * this.W
      actor.shadow.x = actor.image.x
    }
  }

  /**
   * הזמן — real, and not charged to the player while they are still learning to walk.
   *
   * The clock is the chapter's antagonist (brief §17) and nothing about that changes.
   * What changes is when it starts: not when the game loads, but when the child is out of
   * the front door. Missing the newspaper because you stayed with Ofir is a life; missing
   * your father because you could not find a door is a bug with a stopwatch.
   */
  /**
   * האם השעון עומד — and the bug that froze an entire chapter.
   *
   * Maor, 6.9.2026: *"במשימה של רשות מאמא התחלתי את היום מחדש, אמא בכלל לא מגיעה, אני לא
   * מוצא אותה באף מקום באף שעה. השלב הזה לא זורם."*
   *
   * He was describing a stopped clock without knowing it. `onboard:street` is the 1986
   * tutorial guard — the clock does not run while an eight-year-old is still learning to
   * open his own front door — and it is raised in exactly one place: walking into the
   * STREET. 11.3.1991 starts in a classroom and its day runs school → home → hall, a route
   * that never touches the street. So the clock sat at ten past eight for ever: Rachel is
   * scheduled home from three, Kobi from twenty to six, tip-off is at eight in the evening,
   * and not one of those hours could ever arrive. Every actor in the chapter was waiting
   * for a minute that was never going to come.
   *
   * The guard now applies only where it was meant to: a chapter that begins in the flat,
   * before the boy has been outside. Any chapter that starts anywhere else runs its clock
   * from the first frame, which is what "the world does not wait for you" has always meant
   * everywhere else in this game.
   */
  private clockWaiting(): boolean {
    if (this.ctx.engine.state.flags['onboard:street']) return false
    const start = chapterFor(this.chapter)?.start.location
    return start === 'home' || start === 'bedroom' || start === 'kitchen'
  }

  private tickClock(delta: number) {
    if (this.clockWaiting()) return
    this.minuteAcc += (delta / 1000) * this.timeScale * BASE_TIME
    if (this.minuteAcc < 1) return
    const minutes = Math.floor(this.minuteAcc)
    this.minuteAcc -= minutes
    this.ctx.engine.dispatch({ t: 'clock.advanced', minutes })
    // counted here rather than per tick, because a minute is a minute whether it arrived
    // one at a time or twenty-six at a time during a time-lapse
    this.livedFor += minutes
    // the only number the advertising policy is ever given: how much was actually played
    adDirector().played(minutes)
    this.timeTriggers()
    this.onMinute()
    this.pushHud()
  }

  /**
   * הדקה — everything that is allowed to notice that time passed.
   *
   * One place, once a minute, in a fixed order: the timetable moves people, then the
   * windows open and close. Spreading either of those through the update loop is how a
   * scene ends up with two clocks that disagree.
   */
  /**
   * Everything that is allowed to notice a minute passed — and nothing during a fast-
   * forward, which is what made the fast-forward slow.
   *
   * At twenty-six times speed the clock produces about twenty game minutes a second, and
   * each one was folding the whole event log, re-running the NPC timetable and ticking
   * every opportunity window. The frame budget went, Phaser clamped `delta` to stop the
   * loop spiralling, and the "time-lapse" then ran at roughly ONE times speed — a
   * ninety-minute match at real speed, from a number that says 26.
   *
   * Neither job means anything inside a stadium: no scheduled NPC stands in this scene
   * and no window is open in it. So during the match the minute is just a number, which
   * is exactly what a scoreboard wants.
   */
  private onMinute() {
    const state = this.ctx.engine.state
    if (state.minute === this.lastMinute) return
    const minutes = Math.max(1, state.minute - this.lastMinute)
    this.lastMinute = state.minute
    if (this.matchPhase === 'watching' || this.matchPhase === 'goal') return
    this.applySchedule()
    this.tickWindows()
    this.tickLater()
    /*
     * Order matters here, and it cost a chapter to learn why (7.9.2026).
     *
     * `repair` can raise the very milestone a closing beat is waiting for — and in the
     * same minute `lastResort` may decide the day has stalled and close it with the
     * backstop instead. The robot found exactly that: `a3-seen` reported "the condition
     * holds, the beat simply did not run", because the rescue got there first and the
     * evening ended without its own written sentence. So a minute that repaired something
     * gives the chapter's own beats their chance immediately, and the backstop waits for
     * the next minute — a day that ends on what somebody wrote always beats a day that
     * ends because time ran out.
     */
    const repaired = this.repair()
    if (repaired) this.runBeats('clock')
    this.quiet(minutes)
    if (!repaired) this.lastResort()
    this.pushFreeTime()
  }

  /**
   * תיקון מצב — the world proves an experience happened; the flag catches up.
   *
   * Run every minute and on entering a room rather than only on load, because the state
   * that proves a milestone is reached DURING a scene: the conversation that shows the boy
   * the hall is the same minute the milestone becomes true. It raises flags and nothing
   * else — no item, no bond, no memory (audit §7: repair technical state, never grant a
   * consequence the player did not earn).
   */
  private repair(): boolean {
    const raised = reconcile(this.ctx.engine.state)
    for (const flag of raised) this.ctx.engine.dispatch({ t: 'flag.raised', flag })
    return raised.length > 0
  }

  /**
   * להציע לדלג — when the only thing left is the clock.
   *
   * Maor's flow document, 7.9.2026: *"Do not make the player walk in circles for 80 virtual
   * minutes."* The quiet counter is the evidence: minutes in which the state did not change
   * at all — no flag, no item, no room, no money. Any of those resets it, so a player who
   * is doing anything is never interrupted. When the day's next beat is waiting for nothing
   * but a time, the game says so and offers the jump; the card always has a "stay" on it,
   * because optional content is still content.
   */
  /** count the minutes in which nothing this chapter cares about changed */
  private quiet(minutes: number) {
    if (this.closing) return
    const state = this.ctx.engine.state
    /*
     * What counts as PROGRESS, and therefore resets the quiet counter.
     *
     * Not the room: walking street → kiosk → street is the behaviour the offer exists to
     * end ("walk in circles for 80 virtual minutes"). And not any flag either — looking at
     * a poster raises `saw:poster` and moves the day exactly nowhere. What moves a day is
     * what the day itself is waiting for: its objective changing, one of its beats firing,
     * money, or an object. Everything else is a player passing the time, which is the
     * state this card is for.
     */
    const beats = Object.keys(state.flags).filter((flag) => flag.startsWith('beat:')).length
    // (delta 90) and the objective line itself — the comment above always said so, and a
    // chapter without beats (1991) moves ONLY by its objective, so a gate declined at noon
    // could never be offered again in the evening
    const print = `${beats}|${state.agorot}|${Object.keys(state.inventory).length}|${state.chapterDone ? 1 : 0}|${this.objective(state) ?? ''}`
    if (print !== this.quietPrint) {
      this.quietPrint = print
      this.quietFor = 0
      this.passOffered = null
      return
    }
    this.quietFor += minutes
  }

  /**
   * להציע לדלג — offered from inside the backstop, where the counter that works lives.
   *
   * The first attempt counted its own quiet minutes and never got past zero: something in
   * a live room changes every minute and the counter kept resetting, which is exactly the
   * kind of heuristic that looks right and does nothing. `stalledFor` is the counter this
   * scene has ALWAYS used to notice a day that has stopped wanting anything — it is what
   * fires the rescue at ninety minutes — so the offer hangs off the same signal at a
   * third of the distance. A day that would have been rescued silently now gets the
   * player a card first, and the rescue stays where it was as the floor.
   */
  private offerPass(): boolean {
    if (this.closing || this.passOffered) return false
    const state = this.ctx.engine.state
    const busy =
      Boolean(this.director?.active) ||
      this.matchPhase !== 'none' ||
      this.beatBusy ||
      this.beatPending ||
      this.ctx.dialogue.open
    const move = flowMove({
      state,
      era: this.era,
      objectiveHe: this.objective(state),
      quietFor: Math.max(this.quietFor, this.stalledFor),
      busy,
      reachable: this.targetCount(),
    })
    if (!move) return false
    if (move.kind === 'pass') {
      // the offer itself is the free-time chip (`pushFreeTime`, every minute); here it only
      // keeps the backstop from closing a day that is merely early
      this.passOffered = move.gate.beatId
      return true
    }
    /**
     * דחיפה, לא דילוג — the two chapters the robot kept closing through the safety net
     * (a2-alley, a3-hall) have no beat waiting on a clock, so there was never a jump to
     * offer and the card could not have fired however long the room stayed quiet. What
     * they have is something to do, so the room says what is in it — the composed hint,
     * generated from the cast and the doors, which is the one sentence here that cannot
     * be wrong about a room.
     */
    const nudge = this.hintNow()
    if (!nudge) return false
    this.passOffered = 'nudge'
    this.ctx.bus.emit('toast', { text: nudge, tone: 'plain' })
    return true
  }

  /** how many things this room currently offers a thumb — people, hotspots and doors */
  private targetCount(): number {
    try {
      return this.targets().length
    } catch {
      return 1
    }
  }

  /** the state fingerprint the quiet counter compares against, and the count itself */
  private quietPrint = ''
  private quietFor = 0
  private passOffered: string | null = null

  /**
   * שאף יום לא יישאר פתוח — the day ends, whatever happened in it.
   *
   * Every chapter is closed by its own beats, and every one of those beats has a `when`.
   * A `when` is a claim about which states can reach it, and on 6.9.2026 a robot that
   * plays each chapter to the end found the claim was wrong in the very first one: play
   * football in the alley in 1984 and `a2:played` goes up; the only beat that closes the
   * day after that fires on ENTERING the pitch — the room the boy is already standing in
   * — and the night ending excludes `a2:played` by name. The afternoon then runs to
   * midnight and past it, with nothing left to press. That is the shape of every dead end
   * Maor has hit: not a missing room, a missing WAY OUT of a state somebody did not
   * think of.
   *
   * A backstop cannot be another `when`, because the bug is that a `when` was wrong. So
   * it is unconditional: an hour past the last minute anything in this chapter is
   * scheduled for, the day closes on the ending that best fits what actually happened —
   * and the chapter's own beats keep their first chance at it, because a day that ends
   * with its own written sentence is always better than one that ends because time ran
   * out. This is the floor, not the plan.
   */
  private lastResort() {
    if (this.paused || this.closing) return
    const state = this.ctx.engine.state
    const busy =
      Boolean(this.director?.active) ||
      this.matchPhase === 'watching' ||
      this.matchPhase === 'goal' ||
      this.beatBusy ||
      this.beatPending ||
      this.ctx.dialogue.open
    const input = {
      state,
      era: this.era,
      objectiveHe: this.objective(state),
      livedFor: this.livedFor,
      stalledFor: this.stalledFor,
      busy,
    }
    this.stalledFor = isStalled(input) ? this.stalledFor + 1 : 0
    // before the floor, the offer: a day waiting for a clock is a card, not a rescue
    if (this.offerPass()) return
    const id = forcedEnding({ ...input, stalledFor: this.stalledFor })
    if (!id) {
      if (this.livedFor >= LAST_RESORT_MINUTES && !busy && process.env.NODE_ENV !== 'production') {
        console.warn(`[life] ${this.chapter} has no endings; the day cannot close`)
      }
      return
    }
    this.closing = true
    // a chapter that had to be closed from here is a chapter with a hole in it; the flag
    // is what `scripts/life/finish-audit.mjs` reads to tell a written ending from a rescue
    this.ctx.engine.dispatch({ t: 'flag.raised', flag: `life:lastResort:${this.chapter}` })
    this.finishChapter(id)
  }

  /**
   * האם יש ביט שפשוט עוד לא הגיע הזמן שלו.
   *
   * The stall detector closes a day that has stopped wanting anything. It was closing days
   * that were merely EARLY: 1984 ends at half past five and the boy has nothing to want
   * from four o'clock, so ninety idle minutes ran out before the chapter's own ending was
   * due and the backstop stole it. A rescue that beats the written scene is worse than the
   * bug it was built for.
   *
   * So a beat whose ONLY unmet clause is a time that has not arrived yet counts as
   * something the chapter is still doing. Any other unmet clause — a flag, an item, a
   * place — is not a wait, it is a requirement, and a requirement in a chapter that wants
   * nothing is the dead end this whole mechanism exists to catch.
   */

  /** set the moment `lastResort` fires, so it cannot fire twice on consecutive minutes */
  private closing = false
  /** game-minutes this chapter has wanted nothing and had nothing pending */
  private stalledFor = 0
  /**
   * game-minutes since the CHAPTER started — not since this room did.
   *
   * A scene is rebuilt on every doorway, so a counter that starts at zero in `create` is a
   * counter that a player resets by walking into the kitchen. It is read out of the event
   * log instead: every minute this chapter has ever spent is a `clock.advanced` after the
   * last `chapter.entered`, and that is exactly the span `restartDay()` keeps.
   */
  private livedFor = 0

  private countLived(): number {
    const log = this.ctx.engine.log()
    let total = 0
    for (let i = log.length - 1; i >= 0; i -= 1) {
      const event = log[i]
      if (event?.t === 'chapter.entered') break
      if (event?.t === 'clock.advanced') total += event.minutes
    }
    return total
  }

  /** a price booked earlier comes due: one red line, once, on the minute it was owed */
  private tickLater() {
    if (this.paused) return
    const due = dueConsequences(this.ctx.engine.state)[0]
    if (!due) return
    this.ctx.engine.dispatch(shownEvent(due.flag))
    this.ctx.bus.emit('toast', { text: due.text, tone: 'red', kickerHe: CONSEQUENCE_KICKER_HE })
  }

  /**
   * מי פה עכשיו — the timetable, applied to the people standing in this painting.
   *
   * A scheduled actor is moved and shown or hidden; an actor nobody scheduled keeps
   * exactly the position the scene gave them. The scene's own `when` still applies on
   * top, so "Ofir is at the ground after twenty to four" and "and only if he likes you"
   * are two separate statements that compose instead of one that has to be rewritten.
   */
  private applySchedule() {
    const state = this.ctx.engine.state
    const placements = placementsAt(state, this.era.schedule, this.def.id)
    for (const actor of this.actors) {
      const placement = placements.get(actor.def.id)
      if (!placement) continue
      const visible = placement.visible && meets(state, actor.def.when)
      actor.image.setVisible(visible)
      actor.shadow.setVisible(visible)
      if (!visible) continue
      if (placement.x !== undefined) {
        actor.baseX = placement.x * this.W
        actor.image.x = actor.baseX
        actor.shadow.x = actor.baseX
      }
      if (placement.y !== undefined) {
        const y = placement.y * this.H
        const size = this.bodySizeAt(actor.def.figure, y)
        this.applyScale(actor.image, actor.shadow, y, { far: size, near: size })
        actor.image.y = y
      }
      if (placement.facing) actor.image.setFlipX(((placement.facing === 'left') === (WorldScene.ART_FACES > 0)) !== facesLeft(actor.def.figure))
    }
  }

  /**
   * החלונות — an opportunity that has just become real, and one the afternoon just took.
   *
   * The notice is one quiet sentence about the WORLD ("somebody is kicking a ball down
   * the alley"), never an objective and never a name with a marker on it. A window that
   * closes says nothing at all: the player finds out by going to look and finding an
   * empty step, which is the only version of that information worth having.
   */
  private tickWindows() {
    const { events, opened, closed } = tickOpportunities(this.ctx.engine.state, this.era.opportunities)
    if (events.length === 0) return
    this.ctx.engine.dispatch(...events)
    // A window that CLOSES speaks first, because that is the one the player paid for.
    const gone = closed.find((entry) => entry.goneHe)
    if (gone?.goneHe) {
      this.ctx.bus.emit('toast', { text: gone.goneHe, tone: 'plain' })
      this.refresh()
      return
    }
    const notice = opened.find((entry) => entry.noticeHe)
    if (notice?.noticeHe) this.ctx.bus.emit('toast', { text: notice.noticeHe, tone: 'plain' })
  }

  /**
   * המקריות — rolled off the save's own seed, on a timer, only where a place is busy.
   *
   * It never fires while a conversation is open, never in the first seconds of a room,
   * and never indoors: a coin in the gutter of your own kitchen is not a surprise, it is
   * a slot machine. Everything it can produce is in `content/encounters1986.ts`, so the
   * question "what can happen to me on this street" has a file for an answer.
   */
  private tickEncounters(delta: number) {
    const chance = ENCOUNTER_CHANCE[this.def.id]
    if (!chance) return
    if (this.clockWaiting()) return
    if (this.since < 2500) return
    this.sinceEncounter += delta
    if (this.sinceEncounter < ENCOUNTER_EVERY) return
    this.sinceEncounter = 0

    const state = this.ctx.engine.state
    const { picked, consumed } = rollEncounter(state, this.era.encounters, this.chapter, this.def.id, chance)
    this.ctx.engine.dispatch(...encounterEvents(picked, consumed))
    if (!picked) return
    /**
     * `@crowd` — the reusable ensemble, speaking (character bible §10, §13).
     *
     * An encounter may name its speaker or leave it to the neighbourhood. When it asks
     * for the crowd, one person is drawn off the save's own seed from the twelve
     * supporters the production table marks as reusable, filtered to this chapter, and
     * the same person cannot be drawn twice in one visit to a room. Nobody the story owns
     * is in that hat — a memorial character may not be set dressing.
     */
    let who = picked.who ?? null
    if (who === '@crowd') {
      const { people, consumed: used } = crowdSpeaker(state, this.chapter, this.metCrowd)
      const person = people[0] ?? null
      this.ctx.engine.dispatch({ t: 'rng.consumed', count: used })
      if (person) this.metCrowd.push(person.id)
      who = person?.displayNameHe ?? null
    }
    this.ctx.dialogue.startLines([{ who, text: picked.lineHe }], () => this.applyEncounter(picked.id))
  }

  private applyEncounter(id: string) {
    const found = this.era.encounters.find((entry) => entry.id === id)
    if (!found) return
    this.ctx.dialogue.applyEffects(found.effects)
    this.refresh()
  }

  private timeTriggers() {
    const engine = this.ctx.engine
    const state = engine.state

    if (this.era.beats) {
      this.runBeats('clock')
      return
    }

    /**
     * 1991 has one time trigger and it is the whole evening: eight o'clock happens
     * whether or not the boy is in the building (§14, and §36's "history does not wait").
     * Everything else this method does belongs to two Saturdays with a father in them.
     */
    if (this.chapter === '1991') {
      if (state.minute >= TIP_OFF && !state.flags['tipoff:1991']) {
        engine.dispatch({ t: 'flag.raised', flag: 'tipoff:1991' })
        if (this.def.id === 'ussishkin-hall') {
          this.startDerby()
        } else {
          if (state.flags['uss:arrived']) engine.dispatch({ t: 'flag.raised', flag: 'missed:tipoff' })
          this.ctx.bus.emit('toast', {
            text: state.flags['uss:arrived']
              ? 'מהאולם, דרך הקיר: רעש אחד גדול. התחילו.'
              : 'איפשהו מזרחה מכאן, אולם קטן מתחיל לרעוד.',
            tone: 'plain',
          })
          this.beginNight()
        }
        this.refresh()
      } else if (state.flags['tipoff:1991'] && !state.flags['derby:over'] && !state.chapterDone) {
        /**
         * הערב חייב להיגמר — Maor, 6.9.2026, and it is the most serious kind of bug there
         * is: *"אני אחרי הדרבי, אבל ללא רשות מאמא, לכן לא יכול להתקדם… אסור שאף מתמודד
         * יגיע לרגע שאין לו דרך להתקדם במשחק."*
         *
         * The evening used to start on ONE tick — the minute the clock passed eight — and
         * only in the room the boy happened to be standing in. Stand in the street at
         * eight because your mother said no, walk home at a quarter past, and nothing was
         * ever going to happen again: no derby, no radio, no `derby:over`, so no ending,
         * so no chapter. The night was unreachable and the day could not be finished.
         *
         * Two guards, and between them there is no gap:
         *   · the night is offered EVERY minute until it has been resolved, so walking
         *     into a room that can play it — the hall, or home — plays it, however late;
         *   · and half an hour after the curfew, wherever he is standing, the night ends
         *     by itself. He hears the end of it from a street, which is a real way to
         *     experience a derby and a legitimate biography — not a failure state.
         */
        this.beginNight()
        if (state.minute >= CURFEW + 30 && !this.afar) this.resolveNightFromWherever()
      }
      return
    }

    if (this.chapter === '1990') {
      // 1990: he says he is leaving, and then he waits — for a while.
      if (state.minute >= KOBI_SAYS_LEAVING && !state.flags['kobi:leaving'] && !state.flags['kobi:left']) {
        engine.dispatch({ t: 'flag.raised', flag: 'kobi:leaving' })
        this.ctx.bus.emit('toast', {
          text: this.def.id === 'kitchen' ? 'אבא מקפל את העיתון. "יוצאים."' : 'מהמטבח: "יוצאים!"',
          tone: 'red',
        })
        this.refresh()
      }
      const leavesAt = state.flags['asked:five'] ? KOBI_LEAVES_LATE : KOBI_LEAVES
      if (state.minute >= leavesAt && !state.flags['kobi:left']) {
        engine.dispatch({ t: 'flag.raised', flag: 'kobi:left' })
        this.ctx.bus.emit('toast', { text: 'הדלת נסגרת. אבא הלך. אמר שער 7.', tone: 'red', kickerHe: CONSEQUENCE_KICKER_HE })
        this.refresh()
      }
    } else if (state.minute >= KOBI_LEAVES && !state.flags['kobi:left']) {
      engine.dispatch({ t: 'flag.raised', flag: 'kobi:left' })
      this.ctx.bus.emit('toast', { text: 'הדלת נטרקת. אבא יצא.', tone: 'red', kickerHe: CONSEQUENCE_KICKER_HE })
      this.refresh()
    }
    if (state.minute >= KICKOFF && !state.flags['match:started']) {
      engine.dispatch({ t: 'flag.raised', flag: 'match:started' })
      if (this.def.id !== 'bloomfield-inside') {
        this.ctx.bus.emit('toast', { text: 'רעש רחוק, מכיוון מזרח. המשחק התחיל בלעדיך.', tone: 'red', kickerHe: CONSEQUENCE_KICKER_HE })
      }
    }
    if (state.minute >= FULL_TIME && !state.flags['match:over'] && !this.net) {
      engine.dispatch({ t: 'flag.raised', flag: 'match:over' })
      if (this.def.id !== 'bloomfield-inside') {
        engine.dispatch({ t: 'flag.raised', flag: 'arrived:late' })
        this.ctx.bus.emit('toast', { text: 'שריקה, מרחוק. נגמר. לא היית שם.', tone: 'red', kickerHe: CONSEQUENCE_KICKER_HE })
      }
      this.refresh()
    }
  }

  private refresh() {
    const state = this.ctx.engine.state
    for (const entry of this.layers) {
      entry.image.setVisible(meets(state, entry.def.when))
    }
    for (const actor of this.actors) {
      const visible = meets(state, actor.def.when) && !this.cueGone.has(actor.def.id)
      actor.image.setVisible(visible)
      actor.shadow.setVisible(visible)
    }
    for (const spot of this.hotspots) {
      if (spot.prop) spot.prop.setVisible(meets(state, spot.def.when))
    }
    for (const light of this.doorLights) {
      light.image.setVisible(meets(state, whenFor(light.exit, this.chapter)))
      // A locked door still shows, dimmer: you can see where it goes and you can see it
      // is not for you yet.
      light.base = meets(state, needsFor(light.exit, this.chapter))
        ? light.exit.light?.tone === 'daylight'
          ? 0.4
          : 0.24
        : 0.1
    }
    this.flagCount = this.ctx.engine.flagVersion
    this.pushHud()
  }

  /** Stage B: the chapter names its own days; the anchor's date is one of many */
  private chapterDate(): string | null {
    const def = chapterFor(this.chapter)
    if (!def) return null
    if (def.hudDateHe) return def.hudDateHe
    // 1986, 1990 and 1991 hang on one match and its date is the day; every other chapter names its own
    return def.stage !== 'A' && !['1990', '1991'].includes(def.id) ? def.dateHe : null
  }

  private pushHud() {
    const state = this.ctx.engine.state
    this.directive = directiveFor({
      state,
      scene: this.def.id as LocationId,
      era: this.era,
      matchOver: this.matchPhase === 'over' || Boolean(state.flags['match:over']),
    })
    this.dilemmaExits = new Set(
      this.directive?.mode === 'DILEMMA'
        ? (this.directive.destinations ?? [])
            .map((d) => (d.to === this.def.id ? null : nextStep(state, this.chapter, this.def.id as LocationId, d.to)?.exitId ?? null))
            .filter((id): id is string => Boolean(id))
        : [],
    )
    this.maybeOpenRitual()
    const dilemma = this.directive?.mode === 'DILEMMA' ? this.directive : null
    this.ctx.bus.emit('hud', {
      clock: clockLabel(state.weekday, state.minute),
      date: state.dateHe ?? this.chapterDate() ?? longDateHe(this.anchor.match?.playedOn) ?? String(state.year),
      agorot: state.agorot,
      showMoney: state.agorot > 0,
      energy: Math.round(state.energy),
      // מופיע כשהיום כבר עלה במשהו — מד שתמיד על המסך נקרא כמו קישוט
      showEnergy: state.energy < 92,
      place: this.def.titleHe,
      objective: this.objective(state),
      year: state.year,
      scene: this.def.id,
      /**
       * מה לעשות עכשיו — live, not a table.
       *
       * `hintFor` is a hard-coded sentence per chapter and room, which is the same shape as
       * the bug that sent Maor looking for a father who was not in the chair: a line
       * written once for one state, shown in every state. The "?" sheet is where a confused
       * player goes, so it is the last place that should be guessing. `hintNow()` reads the
       * room — who is in it, which doors are open, where the chapter is sending him — and
       * the table is the floor under it for a room that has nothing to say.
       */
      hint: this.hintNow() ?? hintFor(state, this.def.id),
      /** and what the DAY is waiting for, when the room itself is finished */
      waitingOn: this.waitingOn(),
      waitingHe: this.waitingFor(state),
      pendingCue: this.pendingCue,
      director: dilemma
        ? {
            id: dilemma.id,
            mode: 'DILEMMA',
            titleHe: dilemma.objectiveHe,
            footHe: dilemma.reasonHe ?? null,
            destinations: (dilemma.destinations ?? []).map((d) => ({ labelHe: d.labelHe, reasonHe: d.reasonHe, here: d.to === this.def.id })),
          }
        : null,
    })
  }

  /**
   * לפני שיוצאים — the pre-match wardrobe (plan §4). Opened by the world, once per room,
   * when the director says the match needs a shirt and nothing else is holding the glass.
   * The world waits while it is open; `wear()` is the only way it closes.
   */
  private maybeOpenRitual() {
    const directive = this.directive
    if (!directive || directive.mode !== 'PRE_MATCH' || !directive.ritual) return
    if (this.ritualOpen || this.busyNow() || this.closing) return
    this.ritualOpen = true
    this.paused = true
    const ritual = directive.ritual
    this.time.delayedCall(450, () => {
      this.ctx.bus.emit('ritual', { chapter: this.chapter, eventId: ritual.eventId, allowPlain: ritual.allowPlain })
    })
  }

  /** the choice from the wardrobe — one event, then the world runs again */
  wear(choice: string): boolean {
    const events = wearEvents(this.ctx.engine.state, this.chapter, choice)
    if (events.length === 0) return false
    this.ctx.engine.dispatch(...events)
    void this.ctx.engine.save()
    this.ctx.bus.emit('ritual', null)
    this.ritualOpen = false
    this.paused = false
    this.pushHud()
    return true
  }

  /**
   * ממתין ל… — the sentence that says nothing is broken.
   *
   * There are stretches of this game where the correct move is to stand still: a match
   * running on the terrace, a father who has not come back yet, a clock that has to reach
   * a number before the next thing can happen. To a player that is indistinguishable from
   * a bug, and Maor said so: "למנוע חשד של המתמודד שמשהו נתקע במשחק".
   *
   * So: if a directed match is running, the banner says what the child's job is DURING it,
   * because in 1990 he has one and it is not obvious. Otherwise, if a clock beat in this
   * room is waiting on nothing but the time, the banner says what is coming and at what
   * hour. Anything else returns null — a banner that is always up is wallpaper.
   */
  private waitingFor(state: LifeState): string | null {
    if (this.net && !state.flags['match:over']) return this.netJobHe()
    const beats = beatsAt(this.era.beats, 'clock', this.def.id)
    for (const beat of beats) {
      if (state.flags[beatFlag(beat.id)]) continue
      if (!beat.waitingHe) continue
      const at = beat.when?.afterMinute
      if (typeof at !== 'number' || state.minute >= at) continue
      // every OTHER condition has to already hold, or the player is not waiting on a
      // clock — he is waiting on himself, and that is what the objective line is for.
      const rest: Condition = { ...beat.when, afterMinute: undefined }
      if (!meets(state, rest)) continue
      /**
       * ספירה לאחור, לא שעון — the last hour before something is a countdown.
       *
       * "ממתין: המשחק מתחיל · שבת 20:00" is a timetable. Twelve minutes before kickoff a
       * person does not think in times of day, he thinks in how long, and the difference
       * between those two sentences is the difference between a schedule and tension. Over
       * an hour out it stays a clock, because "בעוד 214 דקות" is not a thing anybody feels.
       */
      const left = at - state.minute
      if (left <= 60) return `${beat.waitingHe} · בעוד ${left} ${left === 1 ? 'דקה' : 'דקות'}`
      return `${beat.waitingHe} · ${clockLabel(state.weekday, at)}`
    }
    return null
  }

  /**
   * מה התפקיד שלך במשחק הזה — the 1990 terrace, in one line, permanently.
   *
   * Maor: "לא ברור מה תפקידו של פוגי, העובדה שהוא צריך פשוט להמתין לא ברורה". He is right,
   * and the chapter's whole design was invisible because of it: the child is not watching
   * a match, he is CARRYING NEWS between two radios about a match forty kilometres away
   * that decides whether Hapoel go up. The line changes with what he has heard, so it is
   * a job rather than a caption.
   */
  private netJobHe(): string {
    const state = this.ctx.engine.state
    if (!state.flags['net:heard']) return 'רדיו אצל אבא, רדיו אצל הסדרן. תשמע מה קורה ביבנה'
    if (!state.flags['net:toldKobi']) return 'שמעת משהו על יבנה — תחזור לאבא ותגיד לו'
    return 'תמשיך לרוץ בין הרדיו של אבא לרדיו של הסדרן. המשחק ההוא הוא זה שקובע'
  }

  /**
   * המטרה — one short line that follows the actual chain of locks.
   *
   * It never says where to click. It says what the day is about right now, and it changes
   * only when the state that produced it changes: find the key, talk to your father, then
   * the door east means something, then get in, then find him.
   */
  private objective(state: LifeState): string | null {
    return this.era.objective(state, this.def.id, this.matchPhase === 'over' || Boolean(state.flags['match:over']))
  }

  // ------------------------------------------------------------------ onboarding --

  /** The one line of teaching the game does, and it goes away for good once obeyed. */
  private teach() {
    const state = this.ctx.engine.state
    if (!state.flags['onboard:moved']) {
      this.ctx.bus.emit('teach', { id: 'move' })
      return
    }
    if (!state.flags['onboard:acted']) {
      this.ctx.bus.emit('teach', { id: 'act' })
      return
    }
    this.ctx.bus.emit('teach', null)
  }

  private progress() {
    this.idleFor = 0
    if (this.stuckLevel !== 0) {
      this.stuckLevel = 0
      this.pointer.setVisible(false)
    }
    if (this.travelled > this.W * 0.06 && !this.ctx.engine.state.flags['onboard:moved']) {
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'onboard:moved' })
      this.teach()
    }
  }

  /**
   * תקוע — escalation, and it starts with the world rather than with an arrow.
   */
  private tickStuck(delta: number) {
    this.idleFor += delta
    const level = this.idleFor > STUCK_POINT ? 3 : this.idleFor > STUCK_VOICE ? 2 : this.idleFor > STUCK_HINT ? 1 : 0
    if (level === this.stuckLevel) {
      if (level >= 3) this.aimPointer()
      return
    }
    this.stuckLevel = level
    if (level === 2) {
      const hint = this.hintNow()
      if (hint) this.ctx.bus.emit('toast', { text: hint, tone: 'plain' })
    }
    if (level < 3) this.pointer.setVisible(false)
    else this.aimPointer()
  }

  /** Level three: a small mark at the edge of the glass, pointing at the best way out. */
  private aimPointer() {
    const exit = this.bestExit()
    if (!exit) {
      this.pointer.setVisible(false)
      return
    }
    const cam = this.cameras.main
    const worldX = (exit.x + exit.w / 2) * this.W
    const screenX = (worldX - cam.scrollX) * cam.zoom
    const edge = screenX < cam.width / 2 ? 18 : cam.width - 18
    this.pointer.setVisible(true)
    this.pointer.setPosition(edge, cam.height * 0.5 + Math.sin(this.breathe * 3) * 6)
    this.pointer.setRotation(screenX < cam.width / 2 ? Math.PI : 0)
  }

  /**
   * מה שאפשר להגיד עכשיו, בלי לשקר — the hint, checked against the room it describes.
   *
   * The authored line in `scenes.ts` is a good line and it is used whenever it is TRUE:
   * every person it names has to be standing here, in this chapter, at this minute. When
   * it is not — 1984's living room, whose authored line sends the player to a father who
   * will not be born into that chapter for two years — the room composes its own out of
   * the cast and the doors it is actually rendering, so the sentence and the picture can
   * never disagree. (6.9.2026, after a new game led Maor to a chair with nobody in it.)
   */
  private hintNow(): string | null {
    const state = this.ctx.engine.state
    // a dilemma is said as it is: two reasons, the same weight, and the clock (plan §2.2)
    if (this.directive?.mode === 'DILEMMA') {
      const ways = (this.directive.destinations ?? []).map((d) => `${d.labelHe} — ${d.reasonHe}`)
      return [this.directive.objectiveHe + ':', ways.join(' '), this.directive.reasonHe].filter(Boolean).join(' ')
    }
    // who is standing here AND can be spoken to AND is currently drawn
    const people = this.actors
      .filter((actor) => actor.image.visible && actor.def.talk && actor.def.nameHe)
      .map((actor) => actor.def.nameHe as string)
    /**
     * הדלת הבאה בדרך — when the chapter has somewhere it wants the player, that comes
     * first and it comes by NAME. An authored line is atmosphere; a door label is the
     * thing a thumb can act on, and «אחרי הקיר, ימינה» taught us which of the two a
     * player standing still actually needs.
     */
    const aim = this.aim2goal()
    const step = aim ? nextStep(state, this.chapter, this.def.id as LocationId, aim.to) : null
    if (step) {
      /**
       * שלוש אמירות שונות, כי שלוש בעיות שונות.
       *
       *  · הדרך פתוחה — «בדרך: <שם הדלת>».
       *  · הדרך נעולה — «הדרך: <שם הדלת> — עדיין סגורה», וזה נכון כשיש מה לפתוח.
       *  · **הוא לא יודע את הדרך** — וזאת אמירה שלישית לגמרי, שעד 17.9.2026 נאמרה
       *    בטעות במילים של השנייה. "עדיין סגורה" שולח לחפש מפתח שאינו קיים; "מישהו
       *    צריך לקחת אותך" שולח לחפש בן אדם, והמשחק כבר מציב אותו ברחוב.
       */
      const way = aim?.guide
        ? `בדרך: ${step.labelHe}.`
        : step.locked
          ? `הדרך: ${step.labelHe} — עדיין סגורה.`
          : `בדרך: ${step.labelHe}.`
      const objective = this.objective(state)
      const why = aim && !aim.reach.reachable ? aim.reach.whyHe : null
      return [objective, why, way].filter(Boolean).join(' ')
    }
    const authored = stuckFor(this.def, this.chapter)
    if (authored && hintHolds(authored, people)) return authored
    const doors = this.exits
      .filter((exit) => meets(state, whenFor(exit, this.chapter)))
      .sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1))
      .map((exit) => exit.labelHe)
      .filter((label): label is string => Boolean(label))
    const things = this.hotspots
      .filter((spot) => !spot.prop || spot.prop.visible)
      .map((spot) => spot.def.labelHe)
      .filter((label): label is string => Boolean(label))
    return composeHint({
      people: [...new Set(people)],
      doors: [...new Set(doors)],
      things: [...new Set(things)],
      objectiveHe: this.objective(state),
    })
  }

  /**
   * The next door towards wherever the chapter currently wants the player, or null when
   * the chapter has no opinion or he is already there. `world/route.ts` does the walking.
   */
  private stepToGoal() {
    const aim = this.aim2goal()
    if (!aim) return null
    return nextStep(this.ctx.engine.state, this.chapter, this.def.id as LocationId, aim.to)
  }

  /**
   * לאן היום רוצה אותו — ואם אי אפשר לשם, אל מי.
   *
   * זה `stepToGoal` שלב אחד קודם, והשלב הזה הוא כל ההבדל בין משימה שאפשר להתקדם בה
   * לבין מה שמאור פגש ב-11.3.1991: חץ שמצביע על דלת שאיננה מצוירת, ומשפט שאומר
   * "עדיין סגורה" על משהו שאין לו מפתח. `aimForGoal` שואל את `canPlayerReach` — שידעה
   * את התשובה כל הזמן הזה — ומחזיר את **המדריך** כיעד זמני כשהחסם הוא ידע ולא מנעול.
   */
  private aim2goal(): GoalAim | null {
    const state = this.ctx.engine.state
    // a DILEMMA has two destinations at the same weight: pointing at one would be the game
    // choosing for him (plan §2.2) — both doors are lit instead (`pulseLights`)
    if (this.directive?.mode === 'DILEMMA') return null
    const want = this.era.goal?.(state) ?? null
    if (!want || want === this.def.id) return null
    // never at a place that is gone (World Lifecycle, plan §9.5)
    if (!sceneAlive(state, want)) return null
    const aim = aimForGoal(state, this.chapter, this.def.id as LocationId, want, (who) =>
      whereIs(state, this.era.schedule, who),
    )
    return aim.to === this.def.id ? null : aim
  }

  private bestExit(): ExitDef | null {
    const state = this.ctx.engine.state
    const open = this.exits.filter((exit) => meets(state, whenFor(exit, this.chapter)))
    if (open.length === 0) return null
    // a dilemma is never pointed: both of its doors glow, and that is the whole hint
    if (this.directive?.mode === 'DILEMMA') return null
    // The arrow at the edge of the glass points at the way to the chapter's own
    // destination when it has one, and at the widest door only when it does not. Pointing
    // confidently at the wrong door is worse than not pointing.
    const step = this.stepToGoal()
    const onTheWay = step ? open.find((exit) => exit.id === step.exitId) : null
    if (onTheWay) return onTheWay
    return open.sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1))[0] ?? null
  }

  private pulseLights() {
    const boost = this.stuckLevel > 0 ? 0.22 : 0
    for (const light of this.doorLights) {
      const near =
        (this.target?.kind === 'exit' && this.target.exit.id === light.exit.id ? 0.26 : 0) +
        // the two ways a dilemma can go, marked in the world at the same strength
        (this.dilemmaExits.has(light.exit.id) ? 0.16 : 0)
      const wave = 0.06 * Math.sin(this.breathe * 1.5 + light.exit.x * 8)
      light.image.setAlpha(light.base + wave + boost + near)
    }
  }

  // ---------------------------------------------------------------- interaction ---

  private aim() {
    const state = this.ctx.engine.state
    const px = this.player.x
    const py = this.player.y
    let best: Target | null = null
    let bestScore = -Infinity

    const consider = (x: number, y: number, reach: number, make: () => Target) => {
      const dx = Math.abs(px - x)
      const dy = Math.abs(py - y)
      if (dx > reach || dy > this.H * 0.18) return
      const candidate = make()
      const score = candidate.priority * 1000 - (dx + dy * 0.5)
      if (score > bestScore) {
        bestScore = score
        best = candidate
      }
    }

    for (const spot of this.hotspots) {
      if (!meets(state, spot.def.when)) continue
      consider(spot.x, spot.y, spot.w + this.W * 0.025, () => ({
        kind: 'act',
        act: spot.def.act,
        verb: spot.def.verb,
        label: spot.def.labelHe,
        x: spot.x,
        y: spot.y,
        priority: spot.def.priority ?? 1,
      }))
    }
    for (const actor of this.actors) {
      if (!actor.image.visible || !actor.def.talk) continue
      // People are easier to address than objects: a person you can see should be a
      // person you can talk to, without hunting for a pixel.
      consider(actor.image.x, actor.image.y, Math.max(actor.image.displayWidth * 1.1, this.W * 0.03), () => ({
        kind: 'act',
        act: actor.def.talk as string,
        verb: 'talk',
        label: actor.def.nameHe,
        x: actor.image.x,
        y: actor.image.y,
        priority: 4,
      }))
    }
    for (const exit of this.exits) {
      if (!meets(state, whenFor(exit, this.chapter))) continue
      const cx = (exit.x + exit.w / 2) * this.W
      const cy = (exit.y + exit.h / 2) * this.H
      consider(cx, cy, (exit.w / 2 + 0.035) * this.W, () => ({
        kind: 'exit',
        exit,
        verb: 'exit',
        label: exit.labelHe,
        locked: !meets(state, needsFor(exit, this.chapter)),
        x: cx,
        y: cy,
        priority: exit.priority ?? 2,
      }))
    }

    this.target = best
    this.focus(best)
    this.pushPrompt(best as Target | null)
  }

  /** The mark over what you are about to touch, and a lift on the thing itself. */
  private focus(target: Target | null) {
    if (this.focused) {
      this.focused.clearTint()
      this.focused = null
    }
    if (!target) {
      this.mark.setVisible(false)
      return
    }
    this.mark.setVisible(true)
    const lift = Math.sin(this.breathe * 4) * this.H * 0.006
    this.mark.setPosition(target.x - 7, target.y - this.H * 0.06 + lift)
    if (target.kind === 'act') {
      const actor = this.actors.find((entry) => entry.def.talk === target.act && entry.image.visible)
      if (actor) {
        actor.image.setTint(LIFE_PALETTE.lamp)
        this.focused = actor.image
      }
    }
  }

  private act() {
    const target = this.target
    if (!target) return
    // Whatever the player pointed at, this is it happening. A goal that survives its own
    // arrival sends the child walking again the moment the dialogue closes.
    if (this.goal) this.clearGoal()
    if (!this.ctx.engine.state.flags['onboard:acted']) {
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'onboard:acted' })
      this.teach()
    }
    this.progress()
    if (target.kind === 'exit') {
      if (target.locked) {
        this.ctx.bus.emit('toast', {
          text: blockedFor(target.exit, this.chapter) ?? 'עוד לא.',
          tone: 'plain',
        })
        return
      }
      this.travel(target.exit.to, target.exit.spawn)
      return
    }
    if (target.act.startsWith('net:') && this.net) {
      this.net.talk(target.act)
      return
    }
    if (target.act.startsWith('pano:')) {
      const key = target.act.slice(5)
      const look = PANO_SPOTS[key]
      if (look) this.openPano(key, look.titleHe, look.spots, undefined, look.startYaw ?? 0)
      return
    }
    // the room remembers which conversation it opened, so the balloon's tail can find
    // the person it belongs to (`anchorFor`)
    this.speaking = target.act
    if (!this.ctx.dialogue.start(target.act)) this.ctx.bus.emit('prompt', null)
  }

  /**
   * הפתיחה של הפרק — the one beat a room plays by itself, once.
   *
   * 1990 opens at the kitchen table with the exchange from the brief (§6): the age is
   * established by a father saying "you are twelve" and nothing else. And it closes, after
   * the finale, with a school morning in the bedroom — history made small again (§25).
   */
  private openChapterBeat(state: LifeState) {
    // Chapters written as data: their beats are rows, and this is the only hook they get.
    if (this.era.beats) {
      this.runBeats('enter')
      return
    }
    if (this.chapter === '1991') {
      this.openBeat1991(state)
      return
    }
    if (this.chapter !== '1990') return
    if (this.def.id === 'kitchen' && !state.flags['saw:table']) {
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'saw:table' })
      this.time.delayedCall(700, () => {
        this.ctx.dialogue.startLines(TABLE_1990, () => this.refresh())
      })
      return
    }
    if (this.def.id === 'bedroom' && state.chapterDone && !state.flags['saw:morning']) {
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'saw:morning' })
      this.time.delayedCall(900, () => {
        this.ctx.dialogue.startLines(SCHOOL_MORNING_1990, () => {
          // Sitting up in bed: the morning after, from his own eyes — then the card.
          const look = PANO_SPOTS['panoBedroomMorning90']
          /**
           * הגשר — ten months, in the length of one card (brief §26).
           *
           * The brief is explicit that the road from May 1990 to March 1991 must NOT be a
           * montage or a second historical finale: a few compact fragments and a world
           * that has moved. The fragment is the one already playing — a school morning
           * with a scarf hidden in a bag and a friend asking about Ussishkin — and this
           * is the cut at the end of it. `year.entered` clears the afternoon (its flags,
           * its pockets) and keeps what belongs to the person; `chapter.entered` puts the
           * boy in 1991 and clears `chapterDone`, and the save is written before the room
           * changes, so the bridge cannot be crossed twice.
           */
          const card = () => {
            this.ctx.bus.emit('card', { titleHe: 'מרץ', subHe: 'אוסישקין', ms: 2400 })
            this.time.delayedCall(2500, () => {
              this.ctx.engine.dispatch(
                { t: 'year.entered', year: ERA_1991.year, weekday: 1, minute: SCHOOL_STARTS },
                { t: 'chapter.entered', chapter: ERA_1991.chapter },
                { t: 'flag.raised', flag: 'life:bridge-1991' },
              )
              void this.ctx.engine.save()
              this.fadeThen(500, () => {
                this.scene.restart({ mapId: 'classroom', spawn: 'start', from: 'bedroom' })
              })
            })
          }
          if (look) this.openPano('panoBedroomMorning90', look.titleHe, look.spots, card, look.startYaw ?? 0)
          else card()
        })
      })
    }
  }

  /**
   * 11.3.1991 — the beats the rooms of this chapter play by themselves.
   *
   * Two of them, at the two ends of the same classroom. The morning one is the whole
   * conflict in nine lines and a folded piece of paper (§27); the other is the last thing
   * that happens in Stage B, and it is a whisper, a question from a teacher, and a boy
   * failing to keep a straight face (§46). Between them is everything the player did.
   */
  private openBeat1991(state: LifeState) {
    if (this.def.id !== 'classroom') return

    if (!state.chapterDone && !state.flags['saw:class1991']) {
      this.ctx.engine.dispatch(
        { t: 'flag.raised', flag: 'saw:class1991' },
        // The beat IS him opening it under the desk, so the note is read and in his hand
        // when it ends: walking up to the desk afterwards offers the answer, not the
        // discovery. (A player who somehow never sees the beat still finds it there.)
        { t: 'flag.raised', flag: 'note:read' },
        { t: 'item.gained', item: 'school-note' },
        // Pocket money, because `year.entered` empties the pockets and a thirteen-year-old
        // with nothing in them cannot buy anything at a hall kiosk. One coin, once.
        { t: 'money.changed', agorot: 500, why: 'דמי כיס' },
      )
      this.time.delayedCall(700, () => {
        this.ctx.dialogue.startLines(CLASSROOM_1991, () => this.refresh())
      })
      return
    }

    if (state.chapterDone && !state.flags['saw:closing1991']) {
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'saw:closing1991' })
      this.time.delayedCall(900, () => {
        this.ctx.dialogue.startLines(closing1991(derbyMarginHe(this.anchor)), () => {
          /**
           * The whisper in the classroom was the last thing in Stage B for a year, then it
           * became a straight cut to April 1993 — two years crossed in a fade. Stage B §7
           * B2 asks for a season bridge, because the point of 1991 is that a boy started
           * GOING, and one Monday followed by silence says the opposite. It hands over to
           * the same four-object bedroom 1986 uses, with 1993's objects in it.
           */
          this.fadeThen(600, () => {
            void this.ctx.engine.save()
            this.scene.start(PassageScene.KEY, { passage: '1993' })
          })
        })
      })
    }
  }

  /**
   * הערב — one method, three places it can happen, and the same history in all of them.
   *
   * In the hall it starts the director. At home it starts the radio. Outside, with the
   * boy who left when he said he would, it plays the wall. Nothing here decides anything
   * about the night: it only asks WHERE the player is when it arrives, which is the only
   * question this chapter has ever been asking.
   */
  private beginNight() {
    if (this.chapter !== '1991') return
    const state = this.ctx.engine.state
    if (state.chapterDone) return

    if (this.def.id === 'ussishkin-hall') {
      if (!state.flags['uss:arrived']) this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'uss:arrived' })
      if (state.flags['derby:over']) return
      if (state.minute >= TIP_OFF) this.startDerby()
      return
    }

    // He walked out at half past nine and the wall finished the game for him (§41).
    if (state.flags['heard:wall'] && !state.flags['derby:over']) {
      this.wallBeat()
      return
    }

    // §31 — the route that must exist: the evening from a living-room floor.
    const atHome = this.def.id === 'home' || this.def.id === 'kitchen' || this.def.id === 'bedroom'
    if (atHome && !state.flags['derby:over'] && !this.afar && state.minute >= TIP_OFF) {
      this.paused = true
      this.ctx.dialogue.startLines(HOME_NIGHT_1991, () => {
        this.paused = false
        this.afar = new DerbyFromAfar(this, this.ctx, this.anchor, () => {
          this.afar = null
          this.ctx.bus.emit('toast', { text: 'נגמר. הבית שקט, והרחוב בחוץ — לא.', tone: 'plain' })
          this.refresh()
        })
        this.afar.start()
      })
    }
  }

  /**
   * סוף הערב, בכל מקום שהוא — the last-resort close of 11.3.1991.
   *
   * Nothing about this is a punishment and nothing about it is a menu: the horn reaches a
   * street, a stairwell or a kiosk the way it actually did, the archive records that he
   * was not there, and the chapter can be finished by going home and talking to his
   * mother like every other version of this night. It exists so that the answer to "what
   * do I do now" is never "nothing".
   */
  private resolveNightFromWherever() {
    const state = this.ctx.engine.state
    if (state.flags['derby:over'] || state.chapterDone) return
    this.ctx.engine.dispatch(
      { t: 'flag.raised', flag: 'derby:over' },
      { t: 'flag.raised', flag: 'heard:street' },
      { t: 'anchor.missed', anchorId: this.anchor.id },
      { t: 'redheart.changed', key: 'basketballLove', delta: 3 },
      { t: 'wellbeing.changed', key: 'regret', delta: 10 },
    )
    this.ctx.bus.emit('sound', { kind: 'roar', big: 0.6 })
    this.ctx.bus.emit('toast', {
      text: 'מאיפשהו מזרחה, דרך הרחוב: רעש אחד ארוך, ואז כלום. נגמר, ולא היית שם.',
      tone: 'plain',
      kickerHe: CONSEQUENCE_KICKER_HE,
    })
    this.refresh()
  }

  /** the horn heard through concrete, and then the night is over for him too */
  private wallBeat() {
    this.paused = true
    this.ctx.bus.emit('controls', { visible: false })
    this.time.delayedCall(600, () => {
      this.ctx.dialogue.startLines(DerbyNight.wallLines(), () => {
        this.ctx.engine.dispatch(
          { t: 'flag.raised', flag: 'derby:over' },
          { t: 'anchor.attended', anchorId: this.anchor.id },
          { t: 'redheart.changed', key: 'basketballLove', delta: 8 },
          { t: 'redheart.changed', key: 'loyaltyReturn', delta: 6 },
        )
        this.paused = false
        this.ctx.bus.emit('controls', { visible: true })
        this.refresh()
      })
    })
  }

  /**
   * הטיפ-אוף — and from here the director owns the clock, exactly as 1990's does.
   *
   * `timeScale = 0` for the same reason: the day clock cannot be allowed to run past the
   * curfew on its own while forty minutes of basketball are being played in real seconds.
   * The director moves the HUD clock itself, in steps, so half past nine ARRIVES rather
   * than being announced.
   */
  private startDerby() {
    if (this.derby || this.def.id !== 'ussishkin-hall') return
    if (this.ctx.engine.state.flags['derby:over']) return
    this.timeScale = 0
    this.derby = new DerbyNight(this, this.ctx, this.anchor, {
      onBoard: (board) => this.ctx.bus.emit('match', board),
      onMood: (mood) => this.moodShift(mood),
      onOver: () => this.endDerby(),
      onCurfew: () => {
        this.refresh()
        this.pushHud()
      },
      playerAt: () => ({ x: this.player.x / this.W, y: this.groundY / this.H }),
      spotAt: () => {
        const spot = this.hotspots.find((entry) => entry.def.id === 'the-spot')
        return spot ? { x: spot.x / this.W, y: spot.y / this.H } : null
      },
    })
    this.derby.start()
  }

  /** what the room does when eight hundred people do something at once */
  private moodShift(mood: DerbyMood) {
    const cam = this.cameras.main
    if (mood === 'eruption' || mood === 'chaos') {
      this.tweens.add({ targets: cam, zoom: this.baseZoom * 1.03, duration: 260, yoyo: true, ease: 'Sine.easeOut' })
      return
    }
    if (mood === 'nervous') {
      this.tweens.add({ targets: cam, zoom: this.baseZoom * 0.99, duration: 900, yoyo: true, ease: 'Sine.easeInOut' })
    }
  }

  /** הצופר — the world comes back, with paper in the air and somewhere to be */
  private endDerby() {
    this.derby = null
    this.timeScale = 1
    this.paused = false
    this.startCarnival()
    this.cameras.main.shake(900, 0.006)
    this.ctx.bus.emit('controls', { visible: true })
    this.refresh()
    this.time.delayedCall(1800, () => this.ctx.bus.emit('anchor', { anchor: this.anchor, showing: true }))
    this.time.delayedCall(4200, () => {
      if (this.ctx.engine.state.flags['walked:home']) return
      this.ctx.bus.emit('toast', { text: 'הרחוב בחוץ מלא. וגם השעה מלאה. הביתה.', tone: 'plain' })
    })
  }

  /** 1990: the whistle. The director has already written the score; this hands the terrace back. */
  private endNet() {
    this.net = null
    this.timeScale = 1
    this.paused = false
    this.matchPhase = 'over'
    const state = this.ctx.engine.state
    // The afternoon catches up with the match: an EVENT, like 1986's `returnFromArchive`.
    if (state.minute < FULL_TIME) this.ctx.engine.dispatch({ t: 'clock.advanced', minutes: FULL_TIME - state.minute })
    if (!state.flags['match:over']) {
      this.ctx.engine.dispatch(
        { t: 'flag.raised', flag: 'match:over' },
        { t: 'flag.raised', flag: 'saw:goal' },
        { t: 'anchor.attended', anchorId: this.anchor.id },
        { t: 'redheart.changed', key: 'footballLove', delta: 12 },
        { t: 'redheart.changed', key: 'community', delta: 8 },
        {
          t: 'memory.kept',
          memory: {
            id: `${this.era.memoryPrefix}-promotion`,
            item: 'promotion-table',
            atMinute: state.minute,
            year: state.year,
            anchorId: this.anchor.id,
          },
        },
      )
    }
    this.startCarnival()
    this.cameras.main.shake(900, 0.006)
    this.ctx.bus.emit('controls', { visible: true })
    this.refresh()
    this.pushMatch()
    this.time.delayedCall(2600, () => {
      if (this.ctx.engine.state.flags['found:kobi']) return
      this.ctx.bus.emit('toast', { text: 'הוא איפשהו כאן. ליד העמוד, אמרו. תמצא אותו.', tone: 'plain' })
    })
    /**
     * B1 S4 (27.9.2026) — the crowd understands before or after him by the quality of what
     * he heard. A boy whose note was honest and whose ear was on the radio knew a breath
     * before the roar, and the one thing to do with being first is to tell somebody.
     */
    const knewFirst = state.flags['life:1990:notebook'] === 'clean' || Boolean(state.flags['net:handed']) || Boolean(state.flags['net:toldKobi'])
    this.time.delayedCall(5600, () => {
      if (this.ctx.engine.state.flags['life:1990:called']) return
      this.ctx.bus.emit('toast', {
        text: knewFirst ? 'ידעת רגע לפני הרעש. בכיס יש אסימון, ומתחת ליציע — טלפון על עמוד.' : 'היציע הבין לפניך. מישהו כבר רץ לטלפון מתחת ליציע.',
        tone: knewFirst ? 'red' : 'plain',
      })
    })
  }

  /**
   * Walking into a door works too — after a beat, so passing through does not fire it.
   *
   * And the door you just came through does not take you back until you have stepped off
   * it. Holding a direction through a doorway leaves the key down while the next scene
   * builds, so without this the child walks in the front door, keeps walking, and is
   * returned to the room they just left — which reads as the game refusing to let them
   * out. The block lifts the moment they are clear of the zone.
   */
  private autoExits(delta: number) {
    // Nothing swallows the player in the first moments of a room. Arriving somewhere and
    // being taken straight out again is the worst thing a door can do.
    if (this.since < 700) return
    const state = this.ctx.engine.state
    const x = this.player.x / this.W
    const y = this.groundY / this.H
    // A hair of tolerance on every edge: a zone drawn to the band's far line and feet
    // clamped to that same line are the same number twice, rounded two different ways.
    const eps = 0.004
    const within = (exit: ExitDef) =>
      x >= exit.x - eps && x <= exit.x + exit.w + eps && y >= exit.y - eps && y <= exit.y + exit.h + eps

    /**
     * הדלת שיצאת ממנה — shut until you have actually walked away from it.
     *
     * This used to clear the moment the child stood outside the doorway's rectangle,
     * which is always true at the spawn (a test fails the build on a spawn placed inside
     * its own exit). So it cleared on frame one and guarded nothing: step out of the
     * flat, lean left for a third of a second, and you are back in the flat — and then
     * out, and then in. Maor reported it as "the house and the kiosk are too close to
     * walk between", and the robot that plays a fresh life reproduced it as a loop
     * between the living room and the pavement that never reached the kiosk, so the
     * first day never ended and nothing after it — the key, the father — ever happened.
     *
     * A door is now behind you when you are a real distance from it, or when a couple of
     * seconds have passed. Neither blocks INTENT: pressing the button on a doorway
     * travels immediately, as it always did. What is blocked is the accidental dwell.
     */
    if (!this.clearedReturn) {
      const back = this.exits.filter((exit) => exit.to === this.cameFrom)
      const away = (exit: ExitDef) =>
        x < exit.x - WorldScene.RETURN_CLEARANCE ||
        x > exit.x + exit.w + WorldScene.RETURN_CLEARANCE ||
        y < exit.y - WorldScene.RETURN_CLEARANCE ||
        y > exit.y + exit.h + WorldScene.RETURN_CLEARANCE
      this.sinceArrival += delta
      if (back.length === 0 || back.every(away) || this.sinceArrival > 2400) this.clearedReturn = true
    }

    let inside: ExitDef | null = null
    for (const exit of this.exits) {
      if (!meets(state, whenFor(exit, this.chapter))) continue
      if (!within(exit)) continue
      if (!meets(state, needsFor(exit, this.chapter))) continue
      if (!this.clearedReturn && exit.to === this.cameFrom) continue
      inside = exit
      break
    }
    if (!inside) {
      this.dwellExit = null
      this.dwell = 0
      return
    }
    if (this.dwellExit !== inside) {
      this.dwellExit = inside
      this.dwell = 0
    }

    /**
     * A door pulls you in while you are WALKING, and lets go when you stop.
     *
     * Standing still inside a doorway used to count, and that is the difference between
     * a door and a drain: stop beside the kiosk to read who is in front of you and, nine
     * hundred milliseconds later, you are inside the kiosk with the clock still running.
     *
     * The dwell therefore counts WALKING time inside the zone, and stopping PAUSES it
     * rather than clearing it. Both halves matter, and each was a separate bug on the
     * way here: clearing it on every pause meant one unbroken hold was required, so a
     * player who taps a direction rather than leaning on it could never leave the
     * bedroom; counting while stationary meant a player who stopped to read got pulled
     * through the nearest door. Leaving the zone still clears it, which is what makes
     * "walk past a shop" and "walk into a shop" different actions.
     */
    const input = this.ctx.input
    if (Math.abs(input.x) + Math.abs(input.y) < 0.08) return
    /**
     * ...and WALKING means moving, not merely holding a direction.
     *
     * The last door on a street is against a wall, and a child held against that wall is
     * pressing a direction while going nowhere — which the old test counted as walking,
     * so the doorway in the corner drained anybody who leaned that way. On this street
     * that is the front door, and it turned "walk to the kiosk" into a loop between the
     * pavement and the living room that a fresh save could never escape: the first day
     * never ended, so the key was never taken and the father was never found (5.9.2026).
     */
    const moved = Math.abs(this.player.x - this.lastX) + Math.abs(this.player.y - this.lastY)
    this.lastX = this.player.x
    this.lastY = this.player.y
    if (moved < this.W * 0.0008) return

    this.dwell += delta
    if (this.dwell >= (inside.dwellMs ?? 320)) this.travel(inside.to, inside.spawn)
  }

  /** where the tunnel walk is taking him, while it plays */
  private tunnelTo: { to: LocationId; spawn: string } | null = null

  private travel(to: LocationId, spawn: string) {
    if (this.paused) return
    /**
     * לצאת באמצע — the curfew, made with the legs and not with a menu (§41).
     *
     * There is no dialogue here and no confirmation. Half past nine has arrived, the
     * door is where it always was, and walking through it IS the answer: the director is
     * told the boy left, the rest of the night happens without him, and the street
     * outside plays what a concrete wall lets through.
     */
    if (this.derby && this.def.id === 'ussishkin-hall' && !this.ctx.engine.state.flags['derby:over']) {
      this.derby.leaveEarly()
      this.derby = null
      this.timeScale = 1
      this.ctx.bus.emit('match', null)
    }
    // 1986, the first time under the stand: the corridor is walked in first person
    // (`TunnelWalk`), and the tunnel room itself is skipped — the walk IS the tunnel.
    if (to === 'bloomfield-tunnel' && this.chapter === '1986' && !this.ctx.engine.state.flags['saw:tunnelWalk']) {
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'saw:tunnelWalk' })
      this.paused = true
      this.tunnelTo = { to: 'bloomfield-inside', spawn: 'start' }
      this.ctx.bus.emit('prompt', null)
      this.ctx.bus.emit('controls', { visible: false })
      this.ctx.bus.emit('sound', { kind: 'door' })
      this.ctx.bus.emit('tunnel', { ...this.tunnelTo, variant: 'bloomfield' })
      return
    }

    /**
     * 11.3.1991 — הכניסה לאוסישקין, ובגוף ראשון (§34).
     *
     * The brief asks for the opposite of the Bloomfield reveal in every particular: not a
     * wide shot of a bowl but a narrow door, a squeeze, a wall of backs and a sound that
     * arrives before the picture. That is the same corridor renderer with a shorter map,
     * slower people and a warmer light at the end — so the boy spends fifteen seconds
     * stuck behind somebody's shoulders, and the hall opens on him rather than under him.
     * Once, on the way in, on the night of the derby.
     */
    if (
      to === 'ussishkin-hall' &&
      this.chapter === '1991' &&
      this.def.id === 'ussishkin-outside' &&
      !this.ctx.engine.state.flags['saw:ussTunnel']
    ) {
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'saw:ussTunnel' })
      this.paused = true
      this.tunnelTo = { to: 'ussishkin-hall', spawn }
      this.ctx.bus.emit('prompt', null)
      this.ctx.bus.emit('controls', { visible: false })
      this.ctx.bus.emit('sound', { kind: 'door' })
      this.ctx.bus.emit('tunnel', { ...this.tunnelTo, variant: 'ussishkin' })
      return
    }
    this.paused = true
    this.ctx.bus.emit('prompt', null)
    if (!this.ctx.engine.state.flags['onboard:street'] && (to === 'street' || this.def.id !== chapterFor(this.chapter)?.start.location)) {
      // the day has begun: he is out of the room he woke up in, whichever room that was
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'onboard:street' })
      if (to === 'street') this.ctx.bus.emit('teach', null)
    }
    this.ctx.bus.emit('sound', { kind: 'door' })

    /**
     * מעברון — four seconds of Tel Aviv, 1989, between here and there.
     *
     * Nine clips were cut out of Maor's own film and then sat unplayed. This is where they
     * play: on the journeys that mean something (`world/transitions.ts`), once per chapter
     * per clip, over the black between two rooms. The scene restarts underneath it while
     * it runs, so the film is not a wait — the room is already built when the picture
     * fades.
     */
    const cut = cutFor(
      this.def.id,
      to,
      this.ctx.engine.state.minute,
      this.chapter,
      this.ctx.engine.state.flags,
      eraOfYear(this.ctx.engine.state.year),
    )
    if (cut) this.ctx.engine.dispatch({ t: 'flag.raised', flag: filmFlag(cut.clip, this.chapter) })

    this.leak()
    this.fadeThen(300, () => {
      void this.ctx.engine.save()
      if (cut) this.ctx.bus.emit('film', { clip: cut.clip, captionHe: cut.cut.captionHe })
      this.scene.restart({ mapId: to, spawn, from: this.def.id })
    })
  }

  /**
   * דלף אור — the light that crosses the frame as one room becomes another.
   *
   * A hard fade to black between two paintings is a slideshow, and a slideshow is the
   * other half of the feeling Maor named: a character on backgrounds. Film does not cut
   * to black, it blooms — the gate opens, the frame washes warm from one side, and by the
   * time the picture returns you are somewhere else. This is a warm bar swept across the
   * screen at low alpha under the fade, on the screen layer so it does not care where the
   * camera happens to be pointing. 300ms, once, then it destroys itself.
   */
  private leak() {
    const cam = this.cameras.main
    const w = cam.width
    const h = cam.height
    const bar = this.add
      .rectangle(-w * 0.45, h / 2, w * 0.5, h * 1.4, LIFE_PALETTE.lamp, 0.5)
      .setScrollFactor(0)
      .setDepth(7200)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAngle(-8)
    this.tweens.add({
      targets: bar,
      x: w * 1.4,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => bar.destroy(),
    })
    this.tweens.add({ targets: bar, alpha: 0.16, duration: 300, ease: 'Sine.easeIn' })
  }

  /**
   * למשחק — the pitch, or a job.
   *
   * `football` is the two-a-side and returns to the pitch; `chore:<gig>` is one of the
   * jobs, played in the room it belongs to and returning to the room the player was
   * standing in, which is the same room. The spawn is the one the scene came in on, so a
   * boy who finishes carrying crates is standing where he was when he agreed to.
   */
  /**
   * להחשיך ואז לעבור — every scene change in this room, through one guarded door.
   *
   * `this.cameras.main` is undefined once Phaser has shut a scene down, and a conversation
   * can outlive the room it started in: the player answers, one effect travels or ends the
   * chapter, and the NEXT effect in the same list asks a dead scene to fade. It threw, and
   * because effects are applied in a list, every effect after the throw — a flag, a
   * memory, the thing that lets the day close — never ran. A dead end made by an
   * exception. Found by the robot playing 1985 and the winter of 1986, 6.9.2026.
   *
   * So the transition happens either way: with a fade when there is a camera to fade, and
   * immediately when there is not.
   */
  private fadeThen(ms: number, then: () => void, red = 0, green = 0, blue = 0) {
    const camera = this.cameras?.main
    if (!camera || !this.scene.isActive()) {
      then()
      return
    }
    camera.fadeOut(ms, red, green, blue)
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, then)
  }

  private startMinigame(id: string) {
    /**
     * הפתק (`lib/life/noteBoards.ts`) — not a scene: a sheet over the paused room. A board
     * with nothing on the table does not open at all (a boy who asked nobody has nothing to
     * sort), and the world simply goes on.
     */
    if (id.startsWith(BOARD_PREFIX)) {
      const def = NOTE_BOARDS[id.slice(BOARD_PREFIX.length)]
      if (!def) return
      const view = boardView(def, this.ctx.engine.state)
      if (view) {
        this.ctx.bus.emit('board', view)
        return
      }
      // too little on the table to sort: the note is folded empty at once, and the story goes
      // on — a choice that opens nothing and stays on offer is a loop, not a decision
      const outcome = settleWith(def, {}, this.ctx.engine.state)
      this.ctx.engine.dispatch(...outcome.events)
      this.ctx.bus.emit('toast', { text: outcome.verdictHe, tone: 'plain' })
      if (outcome.after) this.talk(outcome.after)
      return
    }
    this.paused = true
    const chore = id.startsWith('chore:') ? id.slice(6) : null
    const go = () => {
      void this.ctx.engine.save()
      // (Director V3 §9) a ride — the road itself, played in `PassageScene` (`content/passages.ts`)
      if (id.startsWith('ride:')) {
        this.scene.start(PassageScene.KEY, { passage: id })
        return
      }
      if (chore) {
        this.scene.start('life-chore', { gig: chore, returnTo: this.def.id, spawn: this.spawnName })
        return
      }
      this.scene.start('life-football', { returnTo: this.def.id, spawn: 'fromStreet' })
    }
    this.fadeThen(240, go)
  }

  // -------------------------------------------------------------- the camera ------

  /**
   * הבמאי — one controller, every conversation in the game.
   *
   * The content says who the camera is on and how close (`ConversationShot`); this
   * executes it and, crucially, puts the camera back. Writing this per conversation
   * would mean eleven implementations of "return to the world camera", and the tenth one
   * would be the one that forgets.
   *
   * It is restrained on purpose. A push-in of a few per cent and a slow pan onto a face
   * reads as attention; a hard cut to a close-up in a game with no facial animation reads
   * as a bug. On a phone the picture is already framed to a band, so the zoom is scaled
   * down again — a big push on a small viewport just loses the speaker off the edge.
   */
  private frameShot(shot: ConversationShot | null) {
    const cam = this.cameras.main
    if (!shot) {
      this.panLeft = null
      if (!this.shotting) return
      this.shotting = false
      cam.stopFollow()
      this.tweens.add({ targets: cam, zoom: this.baseZoom, duration: 420, ease: 'Sine.easeInOut' })
      cam.startFollow(this.player, true, 0.09, 0.09)
      this.followPlayer()
      return
    }

    const subject =
      shot.focus === 'player'
        ? this.player
        : (this.actors.find((actor) => actor.def.id === shot.focus || actor.def.nameHe === shot.focus)
            ?.image ?? null)

    this.panLeft = null
    const push = { close: 1.16, ots: 1.1, medium: 1.05, wide: 0.96 }[shot.framing]
    const narrow = cam.width < 520 ? 0.55 : 1
    this.shotting = true
    cam.stopFollow()

    const targetX = subject ? (subject.x + this.player.x) / 2 : this.player.x
    const targetY = subject ? (subject.y + this.player.y) / 2 - this.H * 0.06 : this.player.y

    this.tweens.add({
      targets: cam,
      zoom: this.baseZoom * (1 + (push - 1) * narrow),
      duration: shot.duration ?? 520,
      ease: 'Sine.easeInOut',
    })
    cam.pan(targetX, targetY, shot.duration ?? 520, 'Sine.easeInOut')
  }

  // ------------------------------------------------------------------- the wow ----

  private playArrival() {
    const arrival = arrivalFor(this.def, this.chapter)
    if (!arrival) return
    this.paused = true
    this.ctx.bus.emit('controls', { visible: false })
    this.ctx.bus.emit('prompt', null)

    const cam = this.cameras.main
    const card = this.add.image(0, 0, `art-${arrival.art}`).setScrollFactor(0).setDepth(8000)
    const source = this.textures.get(card.texture.key).getSourceImage()
    const scale = Math.max(cam.width / source.width, cam.height / source.height)
    card.setPosition(cam.width / 2, cam.height / 2)
    card.setScale(scale * 1.22).setAlpha(0)

    this.tweens.add({ targets: card, alpha: 1, duration: 700, ease: 'Sine.easeOut' })
    this.tweens.add({
      targets: card,
      scale,
      duration: arrival.ms,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.tweens.add({
          targets: card,
          alpha: 0,
          duration: 900,
          onComplete: () => {
            card.destroy()
            this.paused = false
            this.idleFor = 0
            this.ctx.bus.emit('controls', { visible: true })
            this.ctx.engine.dispatch({ t: 'flag.raised', flag: arrival.flag })
            /**
             * רק בפנים. An arrival card used to exist for one room — the terrace — and
             * everything below was written as if that were the only place a card could
             * play. Then the street outside the ground and the Ussishkin hall got cards
             * of their own, and every one of them raised `went:alone`, opened the 1986
             * anchor card and started the match. Walking up to the OUTSIDE of Bloomfield
             * is not arriving at the final. The card is direction; these are consequences,
             * and they belong to the one room whose consequences they are.
             */
            // 11.3.1991: the card is `ussLow`, the floor at a child's height, and what
            // follows it is a hall that is already full and a night that has a clock in it.
            if (this.chapter === '1991') {
              this.beginNight()
              return
            }
            if (this.def.id !== 'bloomfield-inside') return
            // 1986, the first time: before the day goes on, the boy is allowed to LOOK.
            // The panorama is his eyes at the mouth of the tunnel; the consequences of
            // arriving wait until he has turned round in it.
            const look = PANO_SPOTS['panoReveal']
            if (this.chapter === '1986' && look && !this.ctx.engine.state.flags['saw:panoReveal']) {
              this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'saw:panoReveal' })
              this.openPano('panoReveal', look.titleHe, look.spots, () => this.arrivedInside(), look.startYaw ?? 0)
              return
            }
            this.arrivedInside()
          },
        })
      },
    })
  }

  /** the consequences of being inside the ground — after the card, after the look */
  private arrivedInside() {
    this.time.delayedCall(2200, () => this.ctx.bus.emit('anchor', { anchor: this.anchor, showing: true }))
    // הגעת לבד — the single fact Stage A is really about, recorded once, at the only
    // moment it is unambiguously true: the child is inside the ground and his father
    // did not bring him.
    if (!this.ctx.engine.state.flags['went:alone']) {
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'went:alone' })
    }
    if (this.ctx.engine.state.flags['match:over']) {
      this.matchPhase = 'over'
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'arrived:late' })
      this.refresh()
    } else {
      this.beginMatch()
    }
  }

  /**
   * The final starts when the child is INSIDE, not when a transition finishes playing.
   *
   * `watchMatch` used to be called from one place: the completion of the reveal card. A
   * player who had already seen that card — a second run, a save reloaded inside the
   * ground, the QA tour — walked into Bloomfield and stood in a stadium where no match
   * ever kicked off. It did not show while the match was a time-lapse the clock drove by
   * itself; the moment the ninety minutes became a scene, it became the whole chapter
   * silently not happening.
   *
   * So the condition is a fact about the world — this is the ground, the match is not
   * over, and nothing is already running — and both entry paths ask it.
   */
  private beginMatch() {
    if (this.def.id !== 'bloomfield-inside') return
    if (this.matchPhase !== 'none') return
    if (this.ctx.engine.state.flags['match:over']) {
      this.matchPhase = 'over'
      // Walking in after the whistle, in 1990, is its own ending ("אחרי השריקה"): the
      // fact is recorded the moment he is inside, so the walk home can read it.
      if (this.chapter === '1990' && !this.ctx.engine.state.flags['saw:goal'] && !this.ctx.engine.state.flags['entry:late']) {
        this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'entry:late' })
      }
      this.pushMatch()
      return
    }
    if (this.chapter === '1990') {
      this.matchPhase = 'watching'
      // The director owns time now: the day clock stops, so the old full-time trigger
      // cannot end a match that is being played minute by minute in real seconds.
      this.timeScale = 0
      this.net = new TransistorNet(this, this.ctx, this.anchor, {
        onBoard: (board) => this.ctx.bus.emit('match', board),
        onOver: () => this.endNet(),
        onDrop: (dropped) => {
          this.ctx.engine.dispatch(dropped ? { t: 'flag.raised', flag: 'radio:dropped' } : { t: 'flag.set', flag: 'radio:dropped', value: false })
          this.refresh()
        },
        radioAt: () => {
          const kobi = this.actors.find((entry) => entry.def.id === 'net-kobi')
          return kobi ? { x: kobi.image.x / this.W, y: kobi.image.y / this.H } : null
        },
      })
      this.net.start(this.ctx.engine.state.minute, KICKOFF)
      return
    }
    // 5.9.2026: the final is a DIRECTED sequence (`final-86`) — the board, the minute,
    // the boy's hands twice, the terrace answering — and the archive film, when it has
    // not been seen, plays at the goal step inside it. See `runMatch`.
    if (this.chapter === '1986' && matchScriptFor('final-86')) {
      this.runMatch('final-86', () => undefined)
      return
    }
    // every later match is a beat's `{ a: 'match' }` in its own chapter; nothing to start here
    if (this.chapter !== '1986') return
    // The archive first, and the simulation as its fallback — see `playCutscene`.
    const film = autoCutsceneFor(this.era.cutscene) // §23.6: only a verified payoff opens by itself
    if (film && !this.ctx.engine.state.flags[film.completionFlag]) {
      this.playCutscene(film)
      return
    }
    this.watchMatch()
  }

  /**
   * ~60 שניות — a match as the brief asks for it: directed, fast, the player's hands in
   * it two or three times, the crowd answering, the archive's result on the board and
   * nothing invented on it. The script is data (`content/matchScripts.ts`); the runner
   * is `MatchDirector`; this method is the bridge to the scene's clock, camera and
   * dialogue. `done` is the beat's continuation, called once the last step has run.
   */
  private runMatch(scriptId: string, done: () => void) {
    const script = matchScriptFor(scriptId)
    if (!script) {
      done()
      return
    }
    this.director?.stop()
    const isFinal = script.id === 'final-86'
    if (isFinal) {
      this.matchPhase = 'watching'
      this.timeScale = 0
      this.goalMinute = decidingMinute(this.anchor)
    }
    this.ctx.bus.emit('controls', { visible: false })
    this.ctx.bus.emit('prompt', null)
    /**
     * כרטיס לפני המשחק — the fixture, held for a moment, before the first whistle.
     *
     * Every match in this game used to begin with the scoreboard simply appearing. A match
     * is the biggest thing that happens in a chapter and it deserves the beat a broadcast
     * gives it: the two names and the date, from the ARCHIVE — never typed — and then the
     * game. Where the archive cannot answer there is no card, because a card that says
     * "משחק" is a card about nothing.
     */
    const fixture = this.anchor.match
    if (fixture) {
      const us = 'הפועל תל אביב'
      const home = fixture.atHome ? us : fixture.opponentHe
      const away = fixture.atHome ? fixture.opponentHe : us
      this.ctx.bus.emit('card', {
        titleHe: `${home} — ${away}`,
        subHe: longDateHe(fixture.playedOn) ?? null,
        ms: 2200,
      })
    }
    const director = new MatchDirector(
      {
        emit: (name, value) => this.ctx.bus.emit(name, value),
        dispatch: (...events) => this.ctx.engine.dispatch(...events),
        minute: () => this.ctx.engine.state.minute,
        talk: (conversation, then) => {
          this.speaking = conversation
          return this.ctx.dialogue.start(conversation, then)
        },
        after: (ms, fn) => {
          // the probes run the minute at a quarter of its length; a person gets the whole minute
          const event = this.time.delayedCall(Math.round(ms * (this.ctx.probing ? 0.25 : 1)), fn)
          return { remove: () => event.remove(false) }
        },
        setPaused: (on) => {
          this.paused = on
          if (on) this.ctx.bus.emit('prompt', null)
        },
        onAuthoredGoal: (_step, then) => this.stageGoal(then),
        onGoal: (side) => this.reactToGoal(side),
        onEnd: (finished) => this.closeMatch(finished),
        onFinished: () => {
          if (this.director === director) this.director = null
          done()
        },
      },
      script,
      this.anchor,
    )
    this.director = director
    director.start()
  }

  /** the picture answers a goal: ours is a flash and a shake; theirs is a dip */
  private reactToGoal(side: 'for' | 'against') {
    const camera = this.cameras.main
    if (side === 'for') {
      const flash = this.add
        .rectangle(0, 0, camera.width * 3, camera.height * 3, LIFE_PALETTE.sheet, 0.85)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(9800)
      this.tweens.add({ targets: flash, alpha: 0, duration: 700, onComplete: () => flash.destroy() })
      camera.shake(900, 0.007)
      this.ctx.engine.dispatch({ t: 'redheart.changed', key: 'footballLove', delta: 3 }, { t: 'wellbeing.changed', key: 'happiness', delta: 6 })
      this.startCarnival()
    } else {
      camera.shake(400, 0.003)
      this.ctx.engine.dispatch({ t: 'wellbeing.changed', key: 'stress', delta: 4 })
    }
  }

  /**
   * The 1986 goal step: the archive film if it has not been seen (tension built before
   * it by the script, the boy's own eyes straight after — brief §13), else the authored
   * eighty-sixth minute. Both hand the director back through `afterGoal`; a film that
   * cannot play falls through to the authored minute and never blocks.
   */
  private stageGoal(then: () => void) {
    const film = autoCutsceneFor(this.era.cutscene) // §23.6: only a verified payoff opens by itself
    if (film && !this.ctx.engine.state.flags[film.completionFlag]) {
      this.afterGoal = then
      this.playCutscene(film)
      return
    }
    this.scoreGoal(then)
  }

  /** the director's last step: the 1986 final closes as before; a Stage B match hands the night back */
  private closeMatch(script: MatchScript) {
    if (script.id === 'final-86') {
      this.endMatch(!this.filmWatched)
      return
    }
    this.paused = false
    this.ctx.bus.emit('controls', { visible: true })
    this.refresh()
  }

  /**
   * הזיכרון נפתח אל מה שבאמת קרה — the film, and everything the game stops doing for it.
   *
   * Up to here the chapter has been a child's afternoon reconstructed from an archive of
   * rows. This is the archive itself: the broadcast summary of 24.5.1986, played inside
   * the game because an eight-year-old on that terrace did not watch a clip of the
   * eighty-sixth minute — he watched an afternoon, and so does the player.
   *
   * Everything stops. Not paused-with-a-card-over-it, which is what `doc` and the profile
   * do: the clock stops, the schedule stops, the thumb pad goes, the prompt goes, no
   * dialogue can start, and the world does not tick. For these minutes the player is not
   * IN 1986 as a child; they are watching what a child watched, and the game has nothing
   * to say over it.
   *
   * The shell owns the screen from here and reports back through `endCutscene`.
   */
  private playCutscene(film: HistoricalCutscene) {
    this.matchPhase = 'archive'
    this.cutscene = film
    this.paused = true
    this.timeScale = 0
    this.ctx.bus.emit('controls', { visible: false })
    this.ctx.bus.emit('prompt', null)
    this.ctx.bus.emit('toast', null)
    this.ctx.bus.emit('cutscene', { scene: film, card: cutsceneCard(film, this.anchor) })
  }

  /**
   * הסרט נגמר — and the chapter continues, whichever of the three ways it ended.
   *
   * The completion flag is raised in ALL of them, because the flag records that this
   * cutscene is behind the player and not that they enjoyed it; a player who skipped is
   * not shown the same film again on the next visit. Only `watched` raises the second
   * flag, and the only thing that turns on is which memory the Red Box keeps.
   *
   * The fallback for `unavailable` is the best one this game will ever have, and it is
   * not a card apologising: it is the ninety minutes the engine was already able to play
   * by itself, scoreboard, held breath, eighty-sixth minute and all. YouTube being down
   * costs the player the footage and nothing else. A player who chose `דלג`, on the other
   * hand, has said they do not want to sit through the match — dropping them into a
   * simulated one would be answering "skip" with "here is a longer version".
   */
  endCutscene(outcome: CutsceneOutcome) {
    // a film a BEAT opened: no match phase, no terrace to return to — just the next action
    if (this.afterCutscene) {
      const then = this.afterCutscene
      const beatFilm = this.cutscene
      this.afterCutscene = null
      this.cutscene = null
      this.ctx.bus.emit('cutscene', null)
      this.paused = false
      this.ctx.bus.emit('controls', { visible: true })
      // (§23.3) the registry's own flags, on every outcome — and `watched` only on a watch
      if (beatFilm) this.ctx.engine.dispatch({ t: 'flag.raised', flag: beatFilm.completionFlag })
      if (outcome === 'watched') {
        if (beatFilm) this.ctx.engine.dispatch({ t: 'flag.raised', flag: beatFilm.watchedFlag })
        this.ctx.engine.dispatch({ t: 'flag.raised', flag: `cutscene:watched:${this.chapter}` })
      }
      then()
      return
    }
    const film = this.cutscene
    if (this.matchPhase !== 'archive' || !film) return
    this.cutscene = null
    this.ctx.bus.emit('cutscene', null)
    this.matchPhase = 'none'
    this.paused = false
    this.timeScale = 1
    this.ctx.engine.dispatch({ t: 'flag.raised', flag: film.completionFlag })

    // the director opened the film at its goal step: it gets the goal back, either way
    const afterGoal = this.afterGoal
    if (afterGoal) {
      this.afterGoal = null
      this.matchPhase = 'watching'
      this.paused = true
      this.timeScale = 0
      if (outcome === 'unavailable') {
        this.ctx.bus.emit('toast', { text: film.fallbackHe, tone: 'plain' })
        this.scoreGoal(afterGoal)
        return
      }
      if (outcome === 'watched') {
        this.filmWatched = true
        this.ctx.engine.dispatch({ t: 'flag.raised', flag: film.watchedFlag })
      }
      this.returnFromArchive(afterGoal)
      return
    }

    if (outcome === 'unavailable') {
      this.ctx.bus.emit('toast', { text: film.fallbackHe, tone: 'plain' })
      this.watchMatch()
      return
    }
    if (outcome === 'watched') {
      this.ctx.engine.dispatch({ t: 'flag.raised', flag: film.watchedFlag })
    }
    this.returnFromArchive()
  }

  /**
   * חזרה אל היציע — out of the film and into the celebration, at full time.
   *
   * The dramatic principle Maor set for this ending is that the historical climax and the
   * emotional one must stay apart: the goal is something the player WATCHES, and finding
   * his father is something the player has to do. So this method does the first half
   * completely and the second half not at all. It jumps the clock, records the goal, sets
   * paper falling and hands the controls back — and then the chapter's objective is one
   * line, `למצוא את אבא`, and Kobi is somewhere on a terrace of eight thousand people.
   * Nothing teleports anybody.
   *
   * The clock jump is an EVENT, not an assignment. `clock.advanced` goes in the log like
   * every other minute of this afternoon, so a save written here folds back to a life in
   * which the match happened, rather than to one that skipped an hour (rule 45).
   *
   * The goal's own events are the same three the simulated path dispatches, deliberately:
   * a player who watched the film and a player who watched the simulation must end the
   * chapter holding the same object in the same box, or the Red Box is a record of which
   * code path ran.
   */
  private returnFromArchive(then?: () => void) {
    const state = this.ctx.engine.state
    // under the director the clock is the script's; alone, the film was the whole match
    if (!then && state.minute < FULL_TIME) {
      this.ctx.engine.dispatch({ t: 'clock.advanced', minutes: FULL_TIME - state.minute })
    }
    this.goalMinute = decidingMinute(this.anchor)
    this.matchPhase = 'celebrating'
    if (!state.flags['saw:goal']) {
      this.ctx.engine.dispatch(
        { t: 'flag.raised', flag: 'saw:goal' },
        { t: 'redheart.changed', key: 'footballLove', delta: 14 },
        { t: 'redheart.changed', key: 'community', delta: 10 },
        {
          t: 'memory.kept',
          memory: {
            id: `${this.era.memoryPrefix}-the-goal`,
            item: 'ticket-stub',
            atMinute: this.ctx.engine.state.minute,
            year: this.ctx.engine.state.year,
            anchorId: this.anchor.id,
          },
        },
      )
    }
    this.startCarnival()
    this.cameras.main.flash(700, 255, 252, 246)
    if (then) {
      this.ctx.bus.emit('sound', { kind: 'roar', big: 2 })
      this.time.delayedCall(1800, then)
    } else this.endMatch(false)
    const goal = this.anchor.match?.decidedBy ?? null
    if (goal) {
      this.ctx.bus.emit('toast', { text: `${goal.scorerHe}. דקה ${goal.minute}.`, tone: 'red' })
    }
    // …and then the only thing left in Stage A that is his to do.
    this.time.delayedCall(then ? 7000 : 2600, () => {
      if (this.ctx.engine.state.flags['found:kobi']) return
      this.ctx.bus.emit('toast', { text: 'הוא איפשהו כאן. תמצא אותו.', tone: 'plain' })
    })
  }

  /**
   * תשעים דקות — the final, and the only scene in this game that takes the controls away.
   *
   * Everything before this point in the chapter is a child deciding things. This is the
   * one stretch where he decides nothing, because that is what being eight in a crowd at
   * a title decider actually is: you are carried. So the match runs itself, and the whole
   * design problem is PACING — eighty minutes of nothing, six minutes of held breath, and
   * one minute that the entire chapter has been walking towards.
   *
   * `matchPace` in `lib/life/match.ts` owns the four numbers that do that, and this
   * method owns none of them. It asks what minute it is, sets the speed it is told, and
   * watches for one number: the minute the archive says the goal went in. Not a constant
   * — the eighty-sixth minute is a sourced row in `content/manual/match-events.json`, and
   * if that row ever changed the scene would hold its breath somewhere else without a
   * line here changing.
   */
  private watchMatch() {
    this.matchPhase = 'watching'
    this.goalMinute = decidingMinute(this.anchor)
    this.timeScale = 26
    this.ctx.bus.emit('toast', { text: 'המשחק מתחיל.', tone: 'red' })
    this.ctx.bus.emit('sound', { kind: 'whistle', blasts: 1 })
    this.pushMatch()

    const check = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        if (this.matchPhase !== 'watching') return
        const clock = matchClock(this.ctx.engine.state.minute, KICKOFF)
        this.timeScale = this.goalMinute === null ? 26 : matchPace(clock.minute, this.goalMinute)
        this.pushMatch()

        // …the six minutes before it. One line, once, and then nothing until the ball.
        if (this.goalMinute !== null && clock.minute >= this.goalMinute - 5 && !this.saidTense) {
          this.saidTense = true
          this.ctx.bus.emit('toast', { text: 'היציע כבר לא שר. כולם רק מסתכלים.', tone: 'plain' })
        }

        if (this.goalMinute !== null && clock.minute >= this.goalMinute) {
          check.remove()
          this.scoreGoal()
          return
        }
        if (this.ctx.engine.state.minute >= FULL_TIME) {
          check.remove()
          this.endMatch()
        }
      },
    })
  }

  /**
   * דקה 86 — a chip, a lob, and a stadium.
   *
   * The one moment in the chapter that is authored frame by frame rather than simulated,
   * because it is the one moment every person who was there can still describe. The clock
   * stops. The picture pushes in and everything drains out of it but the pitch. Then a
   * beat of nothing — long enough to be uncomfortable, which is the point — and then the
   * whole thing comes back at once: white, a shake, the terrace, and paper in the air.
   *
   * The names are read off the anchor. `משה סיני` and `גילי לנדאו` are not written in this
   * file and could not be: they are two `personSlug` fields in the archive, resolved by
   * `anchor-server.ts`. A game that may not invent a fact (rule 11) can still stop time
   * for one, and this is what that looks like.
   */
  private scoreGoal(then?: () => void) {
    this.matchPhase = 'goal'
    this.timeScale = 0
    this.paused = true
    const goal = this.anchor.match?.decidedBy ?? null
    this.ctx.bus.emit('controls', { visible: false })
    this.ctx.bus.emit('prompt', null)

    const camera = this.cameras.main
    const holdZoom = Math.min(7, this.baseZoom * 1.16)
    this.tweens.add({ targets: camera, zoom: holdZoom, duration: 1400, ease: 'Sine.easeInOut' })
    if (goal?.assistHe) {
      this.ctx.bus.emit('toast', { text: `${goal.assistHe} מרים את הראש.`, tone: 'plain' })
    }

    this.time.delayedCall(1500, () => {
      // the beat of nothing
      this.ctx.bus.emit('toast', null)
    })

    this.time.delayedCall(2600, () => {
      const flash = this.add
        .rectangle(0, 0, camera.width * 3, camera.height * 3, LIFE_PALETTE.sheet, 0.92)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(9800)
      this.tweens.add({ targets: flash, alpha: 0, duration: 900, onComplete: () => flash.destroy() })
      camera.shake(1200, 0.009)
      this.tweens.add({ targets: camera, zoom: this.baseZoom, duration: 1600, ease: 'Back.easeOut' })

      this.ctx.engine.dispatch(
        { t: 'flag.raised', flag: 'saw:goal' },
        { t: 'redheart.changed', key: 'footballLove', delta: 14 },
        { t: 'redheart.changed', key: 'community', delta: 10 },
        {
          t: 'memory.kept',
          memory: {
            id: `${this.era.memoryPrefix}-the-goal`,
            item: 'ticket-stub',
            atMinute: this.ctx.engine.state.minute,
            year: this.ctx.engine.state.year,
            anchorId: this.anchor.id,
          },
        },
      )
      if (goal) {
        this.ctx.bus.emit('toast', { text: `${goal.scorerHe}. דקה ${goal.minute}.`, tone: 'red' })
      }
      this.ctx.bus.emit('sound', { kind: 'roar', big: 1.5 })
      this.matchPhase = 'celebrating'
      this.pushMatch()
      this.startCarnival()
      this.refresh()
    })

    // …and then the last few minutes, which nobody who was there remembers.
    this.time.delayedCall(7200, () => {
      if (this.matchPhase !== 'celebrating') return
      // under the director the script plays those minutes; the picture stays held
      if (then) {
        then()
        return
      }
      this.paused = false
      this.timeScale = 8
      this.ctx.bus.emit('controls', { visible: true })
      const rest = this.time.addEvent({
        delay: 250,
        loop: true,
        callback: () => {
          this.pushMatch()
          if (this.ctx.engine.state.minute < FULL_TIME) return
          rest.remove()
          this.endMatch()
        },
      })
    })
  }

  /**
   * נייר באוויר — the carnival, which is thirty rectangles and a lot of gravity.
   *
   * Real streamers were in the props delivery and were deliberately not used: a photograph
   * of a paper roll lying on a floor is an object, and what a terrace needs is MOTION —
   * hundreds of strips of red and white coming down through the light for a minute and a
   * half. Thirty tumbling rectangles in the club's own two colours read as that at a
   * fraction of the cost, and they are the only thing in this game drawn as a primitive
   * rather than as art, because they are the only thing that is not a thing.
   */
  private startCarnival() {
    const camera = this.cameras.main
    for (let i = 0; i < 34; i += 1) {
      const red = i % 3 !== 0
      const strip = this.add
        .rectangle(
          Phaser.Math.Between(0, Math.round(camera.width)),
          Phaser.Math.Between(-260, -20),
          Phaser.Math.Between(3, 6),
          Phaser.Math.Between(14, 30),
          red ? LIFE_PALETTE.red : LIFE_PALETTE.sheet,
          0.92,
        )
        .setScrollFactor(0)
        .setDepth(7200)
      this.streamers.push(strip)
      this.tweens.add({
        targets: strip,
        y: camera.height + 60,
        duration: Phaser.Math.Between(3200, 7000),
        delay: Phaser.Math.Between(0, 2600),
        repeat: -1,
        ease: 'Sine.easeIn',
        onRepeat: () => strip.setX(Phaser.Math.Between(0, Math.round(camera.width))),
      })
      this.tweens.add({
        targets: strip,
        angle: Phaser.Math.Between(-220, 220),
        duration: Phaser.Math.Between(1400, 3000),
        repeat: -1,
        yoyo: true,
      })
    }
  }

  /**
   * `showCard` is false on the way back from the archival film, and only there.
   *
   * The anchor card is this game's way of saying "that was real, here is where it is
   * written down". After two minutes of the actual broadcast it would be a footnote to a
   * primary source — so the film gets the last word, and the card is what the simulated
   * path shows instead.
   */
  private endMatch(showCard = true) {
    this.timeScale = 1
    this.paused = false
    this.matchPhase = 'over'
    if (!this.ctx.engine.state.flags['match:over']) {
      this.ctx.engine.dispatch(
        { t: 'flag.raised', flag: 'match:over' },
        { t: 'anchor.attended', anchorId: this.anchor.id },
      )
    }
    this.ctx.bus.emit('controls', { visible: true })
    this.pushMatch()
    this.refresh()
    if (showCard) this.ctx.bus.emit('anchor', { anchor: this.anchor, showing: true })
    this.cameras.main.shake(700, 0.004)
  }

  /** The scoreboard, pushed only when it changes — a strip that rerenders is a strip. */
  private pushMatch() {
    if (this.def.id !== 'bloomfield-inside' || this.matchPhase === 'none') {
      this.ctx.bus.emit('match', null)
      return
    }
    if (this.chapter === '1990') {
      if (this.net) this.net.pushBoard()
      else this.ctx.bus.emit('match', TransistorNet.finalBoard(this.anchor))
      return
    }
    const scored = this.matchPhase === 'goal' || this.matchPhase === 'celebrating' || this.matchPhase === 'over'
    const board = scoreboardAt(this.anchor, scored)
    if (!board) return
    const clock = matchClock(this.ctx.engine.state.minute, KICKOFF)
    // Once it goes in, the board holds the minute it went in — the archive's minute, not
    // whichever tick the loop happened to be on when the check fired. A scoreboard that
    // says 87 for a goal history records at 86 is a small lie in the one place this
    // chapter has spent three passes earning the right not to tell one.
    const scoredLabel = this.goalMinute !== null ? `${this.goalMinute}'` : clock.labelHe
    const label =
      this.matchPhase === 'over'
        ? 'סיום'
        : this.matchPhase === 'goal' || this.matchPhase === 'celebrating'
          ? scoredLabel
          : clock.labelHe
    const signature = `${label}|${board.homeScore}|${board.awayScore}`
    if (signature === this.lastMatchLabel) return
    this.lastMatchLabel = signature
    this.ctx.bus.emit('match', { ...board, labelHe: label, scored, over: this.matchPhase === 'over' })
  }

  /**
   * אירועי־אב — the days no advertisement may go anywhere near.
   *
   * The lock is held from the moment the chapter opens until its ending has been written
   * into the log, so it covers the aftermath as well as the event: on 2.5.1998 that means
   * the false celebration, the transistor, Pisont and the walk out of the gate are all
   * inside it. The plan calls this `masterEventAdvertisingLock`; here it is simply the
   * chapter list, because in this game the master event IS the chapter.
   */
  private static readonly MASTER_EVENTS: readonly string[] = [
    '1986', '1990', '1998-laces', '1999-cup', '2000-title', '2000-double',
    /**
     * שלב ג׳ (21.9.2026) — שני ימים, ושניהם ימים שפרסומת בהם היא עלבון.
     *
     * `2002-europe` נגמר בהדחה בסן סירו, ו-`2007-registered` מכיל את **יום ההריסה של
     * אוסישקין**. כלל 28 אוסר פרסומת במהלך ריצה, והרשימה הזאת היא הדרך שבה המשחק יודע
     * איזה פרק הוא אירוע־אב; פרק שנכתב ולא נוסף כאן היה מקבל פרסומת בזמן שאפי אומר
     * *"אל תמצא לי עכשיו משפט יפה"*.
     */
    '2002-europe', '2007-registered',
    // ...ושני ימי 2010: הגמר והמחזור האחרון
    '2010-cup', '2010-teddy',
  ]

  private finishChapter(endingId: string) {
    this.restoreHud()
    const state = this.ctx.engine.state
    const key = state.flags['arrived:late'] && endingId === 'home' ? 'late' : endingId

    /**
     * 24.5.1986 is not optional any more (Stage A brief §14).
     *
     * A 1986 Saturday that ends without the boy ever getting inside used to close the
     * chapter and hand the player 1990 — a life in which the day this whole game is built
     * on simply did not happen to him. It now gives the morning back instead: the failure
     * is told in the shape it had, the joke is played once, and the log is cut to the
     * start of the chapter, keeping the life before it. Nothing is completed and nothing
     * is written to the Red Box, because nothing happened.
     *
     * Only 1986, and only `missed`. 1990's "you heard it from the street" and 1991's "you
     * were not at the derby" are endings the briefs ask for by name — history happening
     * without you is that game's whole thesis. It is this ONE day that is the spine.
     */
    if (this.chapter === '1986' && key === 'missed') {
      this.paused = true
      this.ctx.bus.emit('controls', { visible: false })
      this.ctx.bus.emit('prompt', null)
      this.ctx.bus.emit('retry', retryFor(state, this.def.id))
      return
    }

    const card = this.era.endings[key] ?? this.era.endings['missed']
    if (!card) return
    this.ctx.engine.dispatch(
      {
        t: 'memory.kept',
        // Same prefix as the goal memory above, and the year the chapter is actually set
        // in. This is FORWARD-ONLY and deliberately not migrated: the prefix is part of a
        // PERSISTED id, and a readable save (version 2 or 3) written before this fix can
        // hold `1980-home`. Memories are idempotent on id, so such a save keeps its old
        // row and a replay adds the correctly-named one beside it — one duplicated ending
        // memory in a save that has already finished the chapter. Rewriting an id inside
        // somebody's log to tidy that up would be editing a record of what happened,
        // which is the one thing an append-only save may never do (rule 45, rule 35).
        memory: {
          id: `${this.era.memoryPrefix}-${card.id}`,
          item: card.memoryItem,
          atMinute: state.minute,
          year: state.year,
          anchorId: this.anchor.id,
        },
      },
      { t: 'flag.raised', flag: 'memory:first' },
      card.presence
        ? { t: 'presence.recorded', anchorId: this.anchor.id, mode: card.presence }
        : state.flags['match:started'] && state.flags['entry:granted']
          ? { t: 'anchor.attended', anchorId: this.anchor.id }
          : { t: 'anchor.missed', anchorId: this.anchor.id },
      // The chapter's own year, and it is not cosmetic: `chapter.entered` and this event
      // are the only things that set `state.chapter`, and `lib/life/redbox.ts` stamps
      // every kept object `sourceEventId: chapter:${state.chapter}`. While this said the
      // pre-rebase year, every object in a 1986 player's Red Box was filed under a
      // chapter that does not exist.
      { t: 'chapter.completed', chapter: this.chapter },
    )
    void this.ctx.engine.save()
    this.paused = true
    /*
     * הרגע היחיד שמותר בו — the chapter's own ending has been written into the log and the
     * card is about to be shown. The lock comes off here rather than on the next chapter's
     * entry, because the aftermath is part of the event; and the safe point is REPORTED,
     * never awaited. `AdDirector` decides, and with advertising switched off (the default)
     * this line does nothing at all — which is the point of it being one line.
     */
    adDirector().unlock()
    void adDirector().safePoint('chapter_completed')
    this.lastEnding = card
    this.ctx.bus.emit('ending', {
      titleHe: card.titleHe,
      bodyHe: card.bodyHe,
      memoryHe: card.memoryHe,
      memory: { id: `${this.era.memoryPrefix}-${card.id}`, item: card.memoryItem, endingId: card.id, year: state.year },
      chapter: this.chapter,
      ...(card.after ? { after: card.after } : {}),
      // Where he was, straight off the card the chapter chose. The shell holds up the
      // night's real ticket only for `inside` and `late`; see `keepsakeFor`.
      ...(card.presence ? { presence: card.presence } : {}),
    })
  }

  /** the card the day just closed on — the finale of a data chapter is built from it */
  private lastEnding: EndingCard | null = null

  /**
   * A card is open over the world, so the world stops — and the clock with it.
   *
   * Reading your own profile may not cost you the afternoon. That is not generosity: a
   * screen that charges the player for looking at it is a screen they stop opening, and
   * a life simulation whose life screen is a trap has built the wrong thing.
   */
  // ------------------------------------------------------------------- the map ----

  /**
   * המפה — every room the doors lead to from here, by the quickest way through them.
   *
   * The walk and its minutes are `world/travel.ts` — the ONE walk-length in the game, the
   * same the free-time planner plans with (SMART FREE TIME §15). A door that `needs`
   * something the child does not have is still on the map, and the place behind it is
   * listed with that door's name as the reason it is shut. Nothing is teleported: choosing
   * a place charges the walk's minutes and plays the same fade every door plays.
   */
  places(): MapPlace[] {
    return placesFrom(this.ctx.engine.state, this.chapter, this.def.id, this.spawnName).map((place) => ({
      id: place.id,
      titleHe: place.titleHe,
      here: place.here,
      minutes: place.minutes,
      lockedHe: place.lockedHe,
    }))
  }

  goTo(id: string): boolean {
    const place = placesFrom(this.ctx.engine.state, this.chapter, this.def.id, this.spawnName).find((entry) => entry.id === id)
    if (!place || place.here || place.lockedHe) return false
    this.paused = false
    this.ctx.engine.dispatch({ t: 'clock.advanced', minutes: place.minutes })
    this.travel(id as LocationId, place.spawn)
    return true
  }

  // ---------------------------------------------------------------- free time ---

  /** what the chip was last told, so a quiet minute does not re-render the shell */
  private freeTimeKey = ''

  private busyNow(): boolean {
    return (
      Boolean(this.director?.active) ||
      this.matchPhase !== 'none' ||
      this.beatBusy ||
      this.beatPending ||
      this.ctx.dialogue.open ||
      Boolean(this.derby) ||
      Boolean(this.afar) ||
      this.closing
    )
  }

  /** the plan as it stands this minute — null when the day is not waiting on the clock */
  freeTime(): TimeAdvancePlan | null {
    const plan = freeTimePlan(this.ctx.engine.state, this.era, { busy: this.busyNow() })
    if (!plan) return null
    const state = this.ctx.engine.state
    const here = this.def.id as LocationId
    const walkable = (to: LocationId) => travelPlan(state, this.chapter, here, to).reachable
    return storyHoldsTheMoment(this.directive, plan, here, walkable) ? null : plan
  }

  /**
   * זמן פנוי — detected at once, told to the shell every minute it changes (§30). The shell
   * decides when the chip appears (real seconds, not world minutes) and never moves the
   * clock itself: it asks `advanceTime`.
   */
  private pushFreeTime() {
    const plan = this.paused ? null : this.freeTime()
    const key = plan ? `${plan.id}|${plan.fromMinute}|${plan.optionalActions.map((row) => `${row.id}:${row.tier}`).join(',')}` : ''
    if (key === this.freeTimeKey) return
    this.freeTimeKey = key
    this.ctx.bus.emit('freeTime', plan)
  }

  /**
   * להעביר זמן — the world moves itself (§18). The shell hands a plan id; the plan is
   * recalculated NOW (§19 — a plan opened at 17:04 is not trusted at 17:12), preflighted
   * (§16), and then lived: the clock through every minute the world has an opinion about,
   * with the timetable, the windows, the debts and the beats reconciled at each (§20), then
   * the walk. The advance stops the moment something authored starts playing (§35 I).
   */
  advanceTime(planId: string): AdvanceResult {
    const early = planId.endsWith(EARLY_SUFFIX)
    const letPass = planId.endsWith(LET_PASS_SUFFIX)
    const id = early ? planId.slice(0, -EARLY_SUFFIX.length) : letPass ? planId.slice(0, -LET_PASS_SUFFIX.length) : planId
    if (this.busyNow()) return { ok: false, reason: 'busy' }
    const plan = freeTimePlan(this.ctx.engine.state, this.era, { busy: false })
    if (!plan || plan.id !== id) return { ok: false, reason: 'changed' }
    const check = preflight(plan, { early, letPass })
    if (!check.ok) return { ok: false, reason: check.reason }

    const fromMinute = this.ctx.engine.state.minute
    const fromHe = this.def.titleHe
    this.setPaused(false)
    let stopped = false
    let walked: { to: LocationId; placeHe: string } | null = null
    for (const step of advanceSteps(plan, this.ctx.engine.state, this.era, { early })) {
      if (step.kind === 'travel') {
        if (step.minutes > 0) this.ctx.engine.dispatch({ t: 'clock.advanced', minutes: step.minutes })
        this.livedFor += step.minutes
        walked = { to: step.to, placeHe: step.placeHe }
        WorldScene.landing = { plan, early }
        this.travel(step.to, step.spawn)
        break
      }
      if (step.minutes <= 0) continue
      this.ctx.engine.dispatch({ t: 'clock.advanced', minutes: step.minutes })
      this.livedFor += step.minutes
      this.timeTriggers()
      this.onMinute()
      this.pushHud()
      if (this.busyNow()) {
        stopped = true
        break
      }
    }
    void this.ctx.engine.save()
    if (!walked) {
      this.refresh()
      this.checkLanding(plan, early)
    }
    this.freeTimeKey = ''
    this.pushFreeTime()
    return {
      ok: true,
      fromMinute,
      toMinute: this.ctx.engine.state.minute,
      fromHe,
      toHe: walked?.placeHe ?? this.def.titleHe,
      walked: Boolean(walked),
      stopped,
    }
  }

  /** a plan in flight across a scene restart — the walk lands in a NEW room */
  private static landing: { plan: TimeAdvancePlan; early: boolean } | null = null
  /** the last landing report, for the probes (`debug.landing()`) */
  lastLanding: LandingReport | null = null

  /** §33 — after the advance, the room must offer something: the event, a named wait, or an action */
  private checkLanding(plan: TimeAdvancePlan, early: boolean) {
    const actorsHere = this.actors.filter((actor) => actor.image.visible && actor.def.talk).map((actor) => actor.def.id)
    const report = verifyLanding(this.ctx.engine.state, this.era, plan, { actorsHere, busy: this.busyNow(), early })
    this.lastLanding = report
    if (!report.ok && process.env.NODE_ENV !== 'production') {
      console.warn(`[life] free-time landing in ${this.chapter}/${this.def.id}: ${report.issues.join(', ')}`)
    }
  }

  setPaused(on: boolean) {
    this.paused = on
    if (on) {
      this.vx = 0
      this.vy = 0
      this.ctx.bus.emit('prompt', null)
    } else {
      this.idleFor = 0
    }
  }

  // ------------------------------------------------------------------- the look ---

  /** what to do when the player closes the panorama */
  private afterPano: (() => void) | null = null

  /**
   * מבט — hand the glass to the boy's eyes. The world pauses; the shell draws the
   * panorama; the marks in it start conversations through `talk`; `closePano` gives
   * the world back and runs whatever was waiting (the anchor card, the kickoff).
   */
  openPano(key: string, titleHe: string, hotspots: PanoSpot[], after?: () => void, startYaw = 0) {
    this.paused = true
    this.afterPano = after ?? null
    this.ctx.bus.emit('prompt', null)
    this.ctx.bus.emit('controls', { visible: false })
    this.ctx.bus.emit('pano', { key, titleHe, startYaw, hotspots })
  }

  /** out of the corridor and into the light: the terrace, with its card and its look */
  finishTunnel() {
    const target = this.tunnelTo
    this.tunnelTo = null
    this.ctx.bus.emit('tunnel', null)
    if (!target) {
      this.paused = false
      return
    }
    // Out of a corridor and into whatever it opened onto: a sky over Jaffa, or the lamps
    // under a tin roof. The flash is the light of the room the boy just walked into.
    const hall = target.to === 'ussishkin-hall'
    this.fadeThen(200, () => {
      void this.ctx.engine.save()
      this.scene.restart({
        mapId: target.to,
        spawn: target.spawn,
        from: hall ? 'ussishkin-outside' : 'bloomfield-tunnel',
      })
    }, hall ? 226 : 237, hall ? 196 : 230, hall ? 168 : 216)
  }

  closePano() {
    this.ctx.bus.emit('pano', null)
    this.ctx.bus.emit('controls', { visible: true })
    this.paused = false
    const after = this.afterPano
    this.afterPano = null
    after?.()
  }

  /** a conversation by id, from anywhere the shell can point — the panorama's marks */
  talk(id: string) {
    if (id.startsWith('net:') && this.net) {
      this.net.talk(id)
      return
    }
    this.speaking = id
    this.ctx.dialogue.start(id)
  }

  /**
   * הסרגל, חי — every body the room is actually drawing, with the height it is drawn at.
   *
   * Proportion faults are invisible in the data and obvious in the picture, which is the
   * worst combination: every `size` in `scenes.ts` can be correct in isolation while the
   * screen shows a grown man at a child's height. This reports what is ON THE GLASS —
   * texture, foot line, drawn height as a fraction of the frame, and what that height
   * means in metres against the room's own metre — so the fault can be measured instead
   * of argued about.
   */
  bodies() {
    const band = this.band()
    const taper = this.def.size.far / Math.max(1e-6, this.def.size.near)
    const rows: Array<{ who: string; art: string; y: number; h: number; metres: number }> = []
    const push = (who: string, art: string, y: number, h: number) => {
      /**
       * The height is reported CORRECTED FOR DEPTH, so the number means "how tall is this
       * person" and not "how many pixels of him are on the screen". A man at the back of a
       * room is drawn smaller and is not a smaller man; an audit that cannot tell those
       * apart reports perspective as a fault and buries the real ones.
       */
      const depth = Phaser.Math.Clamp((y / this.H - band.far) / Math.max(1e-6, band.near - band.far), 0, 1)
      const metre = this.def.metre * (taper + (1 - taper) * depth)
      rows.push({
        who,
        art,
        y: Number((y / this.H).toFixed(3)),
        h: Number((h / this.H).toFixed(3)),
        metres: Number((h / this.H / metre).toFixed(2)),
      })
    }
    push('player', this.player.texture.key.replace('art-', ''), this.groundY, this.player.displayHeight)
    for (const actor of this.actors) {
      push(actor.def.id, actor.image.texture.key.replace('art-', ''), actor.image.y, actor.image.displayHeight)
    }
    for (const walker of this.ambient) {
      if (!walker.image.visible) continue
      push(`~${walker.def.id}`, walker.image.texture.key.replace('art-', ''), walker.image.y, walker.image.displayHeight)
    }
    return rows.sort((a, b) => b.h - a.h)
  }

  /**
   * מה הזכוכית מראה — the framing, measured (delta 91, the screens pass).
   *
   * Every number here is in CANVAS pixels (the drawing buffer, `scale.gameSize`), and the
   * probe divides by `canvas.width / canvas.clientWidth` to get CSS pixels. The painting's
   * rectangle is the ORIGINAL painting, not its sky/ground strips, so "the strip is showing"
   * and "the ink is showing" can be told apart: above `painting.top` there is sky strip for
   * `strip.sky` more pixels and ink beyond that. The child's rectangle is his display box
   * with `feet` at `groundY`. Doors are their zones, on the glass, so a probe can ask
   * whether the deck is lying on one.
   */
  view() {
    const cam = this.cameras.main
    const zoom = cam.zoom || 1
    const half = { x: cam.width / 2, y: cam.height / 2 }
    const sx = (x: number) => (x - cam.scrollX - half.x) * zoom + half.x + cam.x
    const sy = (y: number) => (y - cam.scrollY - half.y) * zoom + half.y + cam.y
    const sky = this.textures.exists(`art-${extensionKeys(this.art).sky}`) ? this.textures.get(`art-${extensionKeys(this.art).sky}`).getSourceImage() : null
    const ground = this.textures.exists(`art-${extensionKeys(this.art).ground}`) ? this.textures.get(`art-${extensionKeys(this.art).ground}`).getSourceImage() : null
    const skyH = sky && typeof sky.height === 'number' ? (sky.height / Math.max(1, sky.width)) * this.W : 0
    const groundH = ground && typeof ground.height === 'number' ? (ground.height / Math.max(1, ground.width)) * this.W : 0
    const band = this.band()
    const rect = (x: number, y: number, w: number, h: number) => ({
      x: Number(sx(x).toFixed(1)),
      y: Number(sy(y).toFixed(1)),
      w: Number((w * zoom).toFixed(1)),
      h: Number((h * zoom).toFixed(1)),
    })
    return {
      art: this.art,
      world: { w: this.W, h: this.H },
      canvas: { w: cam.width, h: cam.height },
      zoom: Number(zoom.toFixed(4)),
      scroll: { x: Number(cam.scrollX.toFixed(1)), y: Number(cam.scrollY.toFixed(1)) },
      painting: rect(0, 0, this.W, this.H),
      /** the strips continue the painting above and below, in canvas pixels */
      strip: { sky: Number((skyH * zoom).toFixed(1)), ground: Number((groundH * zoom).toFixed(1)) },
      floor: { far: Number(sy(band.far * this.H).toFixed(1)), near: Number(sy(band.near * this.H).toFixed(1)) },
      player: {
        ...rect(this.player.x - this.player.displayWidth / 2, this.groundY - this.player.displayHeight, this.player.displayWidth, this.player.displayHeight),
        feet: Number(sy(this.groundY).toFixed(1)),
        visible: this.player.visible,
      },
      doors: this.exits.map((exit) => ({ id: exit.id, ...rect(exit.x * this.W, exit.y * this.H, exit.w * this.W, exit.h * this.H) })),
      people: this.actors.filter((actor) => actor.image.visible).map((actor) => ({
        id: actor.def.id,
        ...rect(actor.image.x - actor.image.displayWidth / 2, actor.image.y - actor.image.displayHeight, actor.image.displayWidth, actor.image.displayHeight),
      })),
    }
  }

  /** Developer-only: where the child is, as the doors see him — for the probes. */
  where() {
    const state = this.ctx.engine.state
    return {
      minute: state.minute,
      chapter: this.chapter,
      scene: this.def.id,
      x: Number((this.player.x / this.W).toFixed(3)),
      y: Number((this.groundY / this.H).toFixed(3)),
      paused: this.paused,
      exits: this.exits.map((exit) => `${exit.id}${meets(state, whenFor(exit, this.chapter)) ? '' : '(shut)'}`),
      // 11.3.1991: how far into the night the hall is, for the derby probe
      derby: this.derby?.debugState() ?? null,
      // the match director, for the probes: which script, how far, is it over
      match: this.director ? { script: this.director.script.id, steps: this.director.log.length, over: !this.director.active } : null,
      // the beat runner, for the chapter probes
      beat: { busy: this.beatBusy, pending: this.beatPending, since: Math.round(this.since), due: beatsAt(this.era.beats, 'enter', this.def.id).filter((b) => !state.flags[beatFlag(b.id)] && meets(state, b.when)).map((b) => b.id) },
    }
  }

  /**
   * מה אפשר לעשות פה עכשיו — everything actionable in the room, as a list.
   *
   * The probes used to guess: talk to a conversation id somebody had typed into a script
   * by hand, and hope the person was standing there this year. That is how a chapter can
   * be "tested" and still be unfinishable. This answers what a PLAYER can see — the people
   * currently drawn, the hotspots currently shown, the doors currently open — so a robot
   * can play a chapter the way a thumb would, and a chapter with nothing to do in it
   * reports an empty list instead of a passing test.
   */
  /**
   * למה אי אפשר להתקדם — the flow watchdog, readable from outside.
   *
   * Maor's audit asks for exactly this (§20): in development, a blocked mission should be
   * able to SAY what is blocking it rather than leaving somebody to guess. It is on the
   * debug facade, which only exists when `the-worker:life:probe` is set, so it never
   * reaches a player.
   */
  flow(): { quietFor: number; busy: boolean; reachable: number; gate: TimeGate | null; offering: string | null } {
    const state = this.ctx.engine.state
    const busy =
      Boolean(this.director?.active) ||
      this.matchPhase !== 'none' ||
      this.beatBusy ||
      this.beatPending ||
      this.ctx.dialogue.open
    return {
      quietFor: this.quietFor,
      busy,
      reachable: this.targetCount(),
      gate: nextTimeGate(state, this.era),
      offering: this.passOffered,
    }
  }

  targets(): Array<{ kind: 'talk' | 'act' | 'exit'; id: string; labelHe: string }> {
    const state = this.ctx.engine.state
    const out: Array<{ kind: 'talk' | 'act' | 'exit'; id: string; labelHe: string }> = []
    for (const actor of this.actors) {
      if (!actor.image.visible || !actor.def.talk) continue
      out.push({ kind: 'talk', id: actor.def.talk, labelHe: actor.def.nameHe ?? actor.def.id })
    }
    for (const spot of this.hotspots) {
      if (!meets(state, spot.def.when)) continue
      if (spot.prop && !spot.prop.visible) continue
      const act = (spot.def as { act?: string }).act
      if (act) out.push({ kind: 'act', id: act, labelHe: spot.def.labelHe ?? spot.def.id })
    }
    for (const exit of this.exits) {
      if (!meets(state, whenFor(exit, this.chapter))) continue
      out.push({ kind: 'exit', id: exit.to, labelHe: exit.labelHe ?? exit.id })
    }
    return out
  }

  /**
   * מה הפרק מחכה לו, במשפט — the first unfired beat that can end the day, and what it
   * needs, in the words `world/why.ts` puts on a condition.
   *
   * A player who has done everything in the room and is still standing there is either
   * waiting for a time (which is fine, and the game should say so) or missing something
   * (which is not, and the game should say that too). Before this the "?" sheet answered
   * both with the same sentence written months earlier.
   */
  private waitingOn(): string | null {
    const state = this.ctx.engine.state
    if (state.chapterDone) return null
    for (const beat of this.pending()) {
      if (beat.fired || !beat.ends) continue
      if (beat.waitingHe) return beat.waitingHe
      if (beat.needs.length) return `ממתין: ${beat.needs.slice(0, 2).join(' · ')}`
      return null
    }
    return null
  }

  /** The hint the room would give right now — the probes read it to catch a lying room. */
  debugHint(): string | null {
    return this.hintNow()
  }

  /**
   * מה הפרק מחכה לו — every beat of this chapter that has not fired, and what it needs.
   *
   * The chapter's own writing is a list of beats and each one is gated by a condition. When
   * a chapter will not end, exactly one of two things is true: no beat can end it (a hole
   * in the writing), or one can and the player has not satisfied it (a hole in the
   * signposting). From inside the room those look identical, which is why every report of
   * this bug has arrived as the same unhelpful sentence. This tells them apart.
   *
   * Sorted so the beats that END the chapter come first, because when a day will not close
   * those are the only ones anybody is asking about.
   */
  pending(): Array<{ id: string; ends: boolean; fired: boolean; needs: string[]; waitingHe: string | null }> {
    const state = this.ctx.engine.state
    return (this.era.beats ?? [])
      .map((beat) => ({
        id: beat.id,
        ends: beat.do.some((action) => action.a === 'ending' || action.a === 'talk'),
        fired: Boolean(state.flags[beatFlag(beat.id)]),
        needs: unmet(state, beat.when),
        waitingHe: beat.waitingHe ?? null,
      }))
      .sort((a, b) => Number(b.ends) - Number(a.ends))
  }

  /** Developer-only: put the child somewhere, with no door in between. */
  debugTravel(location: string) {
    this.paused = false
    this.travel(location as LocationId, 'start')
  }

  /**
   * Closing the ending card does not go home any more. It opens the end of the STAGE.
   *
   * Two screens, in this order, because they answer different questions. `EndingCard`
   * closes a Saturday: what happened when you walked back through your own front door.
   * `StageFinale` closes a chapter of a life: what happened in the world, whether you
   * were there for it, what it made of you, and where the next one starts.
   *
   * Collapsing them into one card was tried and it does not work — the private ending and
   * the public celebration undercut each other, and the player ends up reading a
   * scoreline over a sentence about their father's hand.
   */
  goHome() {
    this.ctx.bus.emit('ending', null)
    this.rememberWhatYouWore()
    const def = chapterFor(this.chapter)
    // A day before the Saturday ends on its card and cuts to the next day. The finale —
    // the sheet with the archive on it — is for a chapter that hangs on history.
    if (def && def.stage === 'A' && this.chapter !== '1986') {
      this.advanceChapter()
      return
    }
    const card =
      this.chapter === '1986' || this.chapter === '1990' || !this.lastEnding
        ? buildFinale(this.ctx.engine.state, this.ctx.engine.log(), this.chapter)
        : {
            titleHe: this.lastEnding.titleHe,
            bodyHe: this.lastEnding.bodyHe,
            becameHe: this.lastEnding.memoryHe,
            keptTicket: (this.ctx.engine.state.inventory['ticket-stub'] ?? 0) > 0,
          }
    this.ctx.bus.emit('finale', {
      anchor: this.anchor,
      chapter: this.chapter,
      titleHe: card.titleHe,
      bodyHe: card.bodyHe,
      becameHe: card.becameHe,
      keptTicket: card.keptTicket,
      nextYear: nextPlayable(this.chapter, this.ctx.engine.state.flags)?.year ?? null,
    })
  }

  /**
   * מה לבשת באותו יום — stamped once, at the end of the chapter, forever.
   *
   * The collection was a list of forty shirts with prices on them. This is what makes it a
   * life: the shirt you owned on the day of the cup final now carries the date of the cup
   * final, and says so on its own card, in 2000 and in every year after.
   *
   * It is recorded at the END of the chapter rather than the start, because what you wore
   * is only interesting once the day has happened. Nothing is asked of the player and
   * nothing can be got wrong — you wore the newest shirt you had, which is what everybody
   * does.
   */
  private rememberWhatYouWore() {
    const state = this.ctx.engine.state
    const shirt = wearingAt(state, this.ctx.engine.log(), this.chapter)
    if (!shirt) return
    const flag = wornFlag(shirt.id, this.chapter)
    if (state.flags[flag]) return
    this.ctx.engine.dispatch({ t: 'flag.raised', flag })
  }

  /** …and the finale's own button is what actually goes home. */
  /**
   * …and the finale's own button is what actually goes on. In 1986 that is the passage —
   * four years, played (`PassageScene`) — which is the bug the roadmap named: this used to
   * `travel('bedroom')` and put the player back in the Saturday he had just finished. In
   * 1990 the day ends in the bedroom the next morning, and the school line plays there.
   */
  dismissFinale() {
    this.paused = false
    this.ctx.bus.emit('finale', null)
    this.ctx.bus.emit('match', null)
    /**
     * שני גשרים — the two chapters that hand over through time rather than through a door.
     *
     * 1986 → 1990 was the only one until 6.9.2026, and 1991 → 1993 was a two-year jump the
     * Stage B brief specifically forbids (§7 B2 asks for a season bridge, so that the hall
     * reads as a habit rather than as one Monday). Both now play the same four-object
     * bedroom; which one is a parameter.
     */
    if (this.chapter === '1986') {
      this.fadeThen(600, () => {
        void this.ctx.engine.save()
        this.scene.start(PassageScene.KEY, { passage: '1990' })
      })
      return
    }
    // 1991 ends where it started, the next morning, in the same classroom (§46) — and the
    // classroom hands over to the bridge when the morning is done (`closing1991`).
    if (this.chapter === '1991') {
      this.travel('classroom', 'start')
      return
    }
    /**
     * Every other chapter ends the way the registry says: the next one, or the coda.
     *
     * `&& this.chapter !== '1990'` stood here until 5.9.2026 and it is the whole of "after
     * the promotion mission it does not move to the next mission". 1990 was the last
     * chapter that existed when this line was written, so it ended by putting the boy to
     * bed — and it kept doing that after 1991, 1993 and everything to 2000 were built.
     * The card behind it had been promising the opposite for weeks, in Hebrew, on the
     * button: "מחר בית ספר. ואוסישקין מחכה — 1990/91."
     *
     * There is no chapter-specific case left except the two that genuinely are special:
     * 1986 hands over to `PassageScene`, and 1991 ends in the room it started in.
     */
    if (chapterFor(this.chapter)) {
      this.advanceChapter()
      return
    }
    this.travel('bedroom', 'start')
  }

  /**
   * הקאט — from the end of one chapter to the first room of the next, by the registry.
   *
   * One method for every transition after 1991, so a chapter is data (`chapters.ts`) and
   * not a branch in this file. The card is the bridge the NEXT chapter declares, the
   * events are the two that every year-jump in this game has always dispatched plus the
   * chapter's own `entry` (pocket money, a thing in a pocket — never history), and the
   * save is written before the room changes so the cut cannot be crossed twice.
   *
   * When there is no next chapter with rooms behind it, the life as built is over, and
   * the shell is told so (`coda`) instead of being shown a card that promises a chapter.
   */
  private advanceChapter() {
    const next = nextPlayable(this.chapter, this.ctx.engine.state.flags)
    if (!next) {
      this.paused = true
      this.ctx.bus.emit('controls', { visible: false })
      this.ctx.bus.emit('prompt', null)
      this.ctx.bus.emit('coda', { chapter: this.chapter })
      return
    }
    this.enterChapter(next)
  }

  // ------------------------------------------------------------------ the beats ----

  /** a beat is running: nothing else may start one until its last action is done */
  private beatBusy = false
  /** a beat opened the archive film; this is what runs when it closes */
  private afterCutscene: (() => void) | null = null

  /**
   * מריץ הביטים — the one hook every data chapter gets.
   *
   * On `enter` and on every clock tick the chapter's rows are filtered to this room and
   * this trigger, their conditions checked, and the FIRST one that has not fired is run:
   * its flag is raised before its first action so a reload cannot replay it, and its
   * actions run one after another, each waiting for the one before (a conversation
   * waits for its last line, a card for its hold). One beat at a time; a second row that
   * is also due fires on the next tick, which is the next frame.
   */
  // ------------------------------------------------------------ actor cues (delta 93) --

  /** actors whose position a cue owns right now — the sway and the head-turn leave them be */
  private cued = new Set<string>()
  /** actors a `leave` cue walked out; `refresh` keeps them out until the room changes */
  private cueGone = new Set<string>()
  /** the cue waiting for the glass to clear — what the debug overlay prints */
  pendingCue: string | null = null
  /** a beat turned the HUD off; every exit path turns it back on */
  private hudHidden = false

  private restoreHud() {
    if (!this.hudHidden) return
    this.hudHidden = false
    this.ctx?.bus.emit('hudVisible', { visible: true })
  }

  /**
   * A cue waits for the glass: a conversation, a film, the wardrobe, an ending card. It is
   * retried, never dropped — an initiative that fires into an open dialogue is the bug the
   * brief (§37) names — and a scene that is no longer running lets it go.
   */
  private whenFree(run: () => void, tries = 0) {
    if (!this.sys.isActive()) return
    const blocked = this.ctx.dialogue.open || Boolean(this.cutscene) || this.ritualOpen || this.closing
    if (!blocked || tries > 240) {
      run()
      return
    }
    this.time.delayedCall(250, () => this.whenFree(run, tries + 1))
  }

  /**
   * יוזמה — a person takes the first step (brief §9–§12, §21).
   *
   * Four moves and no AI: come in from the edge, walk up to him, turn to him, go. The
   * position is the room's own (the actor's `x`), so a cue never invents a place in the
   * painting; `approach` stops a short step from the boy on the side the man came from.
   * An actor the room does not have is a no-op — the conversation that follows still
   * plays, so a missing figure is a missing picture and never a stuck chapter.
   */
  private actorCue(cue: ActorCue, then: () => void) {
    const actor = this.actors.find((entry) => entry.def.id === cue.actorId)
    if (!actor || !this.sys.isActive()) {
      this.pendingCue = null
      then()
      return
    }
    this.pendingCue = `${cue.actorId}:${cue.cue}`
    const done = () => {
      this.pendingCue = null
      then()
    }
    const face = (towardX: number) => {
      const left = towardX < actor.image.x
      actor.image.setFlipX((left === WorldScene.ART_FACES > 0) !== facesLeft(actor.def.figure))
    }
    const targetX = (target: 'player' | string): number | null => {
      if (target === 'player') return this.player?.x ?? null
      const other = this.actors.find((entry) => entry.def.id === target && entry.image.visible)
      return other ? other.image.x : null
    }
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const ms = (value: number | undefined, fallback: number) => (reduced ? 1 : Math.max(1, value ?? fallback))
    this.cued.add(actor.def.id)
    switch (cue.cue) {
      case 'enter': {
        this.cueGone.delete(actor.def.id)
        actor.image.setVisible(true)
        actor.shadow.setVisible(true)
        const side = cue.from ?? (actor.baseX > (this.player?.x ?? this.W / 2) ? 'right' : 'left')
        // "right" is the painting's right: the far edge in the reading direction's mirror
        const from = actor.baseX + (side === 'right' ? 1 : -1) * this.W * 0.1
        actor.image.x = from
        actor.shadow.x = from
        actor.image.setAlpha(0)
        actor.shadow.setAlpha(0)
        face(actor.baseX)
        this.tweens.add({ targets: [actor.image, actor.shadow], alpha: 1, x: actor.baseX, duration: ms(cue.durationMs, 760), ease: 'Sine.easeOut', onComplete: done })
        return
      }
      case 'approach': {
        const toward = targetX(cue.target)
        if (toward === null) {
          done()
          return
        }
        const gap = this.def.metre * 0.4 * this.W
        const stop = toward + (actor.image.x > toward ? gap : -gap)
        face(toward)
        actor.baseX = stop
        this.tweens.add({ targets: [actor.image, actor.shadow], x: stop, duration: ms(cue.durationMs, 900), ease: 'Sine.easeInOut', onComplete: () => {
          if (this.player && cue.target === 'player') this.faceBoyTo(actor.image.x)
          done()
        } })
        return
      }
      case 'turn': {
        const toward = targetX(cue.target)
        if (toward !== null) face(toward)
        if (this.player && cue.target === 'player') this.faceBoyTo(actor.image.x)
        done()
        return
      }
      case 'leave': {
        const side = cue.to ?? (actor.image.x > this.W / 2 ? 'right' : 'left')
        const to = actor.image.x + (side === 'right' ? 1 : -1) * this.W * 0.12
        face(to)
        this.tweens.add({ targets: [actor.image, actor.shadow], alpha: 0, x: to, duration: ms(cue.durationMs, 820), ease: 'Sine.easeIn', onComplete: () => {
          this.cueGone.add(actor.def.id)
          actor.image.setVisible(false)
          actor.shadow.setVisible(false)
          actor.image.setAlpha(1)
          actor.shadow.setAlpha(1)
          done()
        } })
        return
      }
      case 'gesture': {
        this.tweens.add({ targets: actor.image, y: actor.image.y - actor.image.displayHeight * 0.025, duration: ms(cue.durationMs, 220), yoyo: true, ease: 'Sine.easeOut', onComplete: done })
        return
      }
    }
  }

  /** people who already took their step in this room — once a visit */
  private initiated = new Set<string>()

  /**
   * הוא ניגש אליך (`ActorDef.initiative`) — the boy walked close; the man closes the gap
   * and speaks first. Never over an open box, a film, the wardrobe or a running beat, and
   * once per visit, so walking away from him is still a choice the room respects.
   */
  private maybeInitiative() {
    if (!this.player || this.busyNow() || this.ritualOpen || this.cutscene || this.closing) return
    const state = this.ctx.engine.state
    for (const actor of this.actors) {
      const initiative = actor.def.initiative
      const talk = actor.def.talk
      if (!initiative || !talk || !actor.image.visible || this.initiated.has(actor.def.id)) continue
      if (initiative.when && !meets(state, initiative.when)) continue
      const dx = this.player.x - actor.image.x
      const dy = (this.groundY - actor.image.y) / DEPTH
      if (Math.hypot(dx, dy) > this.def.metre * initiative.reachM * this.W) continue
      this.initiated.add(actor.def.id)
      if (this.goal) this.clearGoal()
      this.beatBusy = true
      this.actorCue({ a: 'actorCue', actorId: actor.def.id, cue: 'approach', target: 'player', durationMs: 700 }, () => {
        this.beatBusy = false
        if (!this.sys.isActive() || this.ctx.dialogue.open) return
        this.speaking = talk
        this.ctx.dialogue.start(talk)
      })
      return
    }
  }

  /** the boy turns to somebody who has walked up to him */
  private faceBoyTo(x: number) {
    if (!this.player) return
    this.lastDir = 'side'
    this.facing = x < this.player.x ? -1 : 1
    this.player.setTexture(`art-${this.era.player.pose.side}`)
    this.player.setFlipX(this.facing !== WorldScene.ART_FACES)
  }

  private runBeats(trigger: Beat['trigger']) {
    if (this.beatBusy) return
    // (delta 93) a person's initiative waits for the conversation the player is in; it is
    // tried again on the next tick, never dropped
    if (this.ctx.dialogue.open) {
      if (trigger === 'enter') this.beatPending = true
      return
    }
    // An arrival shot, a reveal or a sheet has the room paused: an `enter` beat waits at
    // the door instead of being dropped, and `update` knocks again once the room runs.
    if (this.paused) {
      if (trigger === 'enter') this.beatPending = true
      return
    }
    const state = this.ctx.engine.state
    const due = beatsAt(this.era.beats, trigger, this.def.id).find(
      (beat) => !state.flags[beatFlag(beat.id)] && meets(state, beat.when),
    )
    if (!due) return
    // A breath first: the room is seen before it speaks. The beat is found again on the
    // next tick until the breath is over — the flag is raised only when it actually
    // starts, so a scene restart in that gap cannot swallow it.
    if (due.delayMs && this.since < due.delayMs) {
      this.beatPending = true
      return
    }
    this.beatPending = false
    this.ctx.engine.dispatch({ t: 'flag.raised', flag: beatFlag(due.id) })
    this.beatBusy = true
    this.runActions([...due.do], () => {
      this.beatBusy = false
      this.restoreHud()
      /**
       * ביט שקרה ולא קרה — a beat the player walked out of has not happened.
       *
       * The flag is raised BEFORE the actions run, so a scene restart in the middle cannot
       * swallow a beat. The cost of that is the opposite failure, and it is the one that
       * cost Maor a chapter: `a6-end` fires at ten to five, opens the conversation that
       * ends the winter of 1986 — and the conversation can be left. The flag is already up,
       * so the beat never comes back, `a6:heard` is never raised, and the day runs to
       * midnight, past it, and round again with an objective it can no longer satisfy.
       *
       * The rule is small and it closes the whole class: if the beat's own condition is
       * STILL true after it finished, nothing it was supposed to do actually happened, so
       * it is armed again. A beat that did its job stops matching its own `when` — that is
       * what a `when` is — so this cannot loop; and `delayMs` gives the room its breath
       * back before the second attempt.
       */
      if (this.scene.isActive() && meets(this.ctx.engine.state, due.when)) {
        this.ctx.engine.dispatch({ t: 'flag.set', flag: beatFlag(due.id), value: false })
        this.since = 0
      }
      this.refresh()
    })
  }

  /** an `enter` beat is waiting out its breath; `update` asks again each frame */
  private beatPending = false

  private runActions(actions: BeatAction[], done: () => void) {
    const next = actions.shift()
    if (!next) {
      done()
      return
    }
    const then = () => this.runActions(actions, done)
    switch (next.a) {
      case 'lines':
        this.ctx.dialogue.startLines(next.lines, then)
        return
      case 'talk':
        this.speaking = next.conversation
        if (!this.ctx.dialogue.start(next.conversation, then)) then()
        return
      case 'card': {
        const ms = next.ms ?? 2400
        this.ctx.bus.emit('card', { titleHe: next.titleHe, subHe: next.subHe ?? null, ms, ...(next.art ? { art: next.art } : {}) })
        this.time.delayedCall(ms + 80, then)
        return
      }
      case 'toast':
        this.ctx.bus.emit('toast', { text: next.text, tone: next.tone ?? 'plain' })
        then()
        return
      case 'flag':
        this.ctx.engine.dispatch({ t: 'flag.raised', flag: next.flag })
        then()
        return
      case 'events':
        this.ctx.engine.dispatch(...next.events)
        then()
        return
      case 'derive': {
        const events = next.events(this.ctx.engine.state)
        if (events.length > 0) this.ctx.engine.dispatch(...events)
        then()
        return
      }
      case 'travel':
        // the room changes under us; the beat is over by definition
        this.beatBusy = false
        this.travel(next.to, next.spawn)
        return
      case 'ending':
        this.beatBusy = false
        this.finishChapter(next.id)
        return
      case 'pano': {
        const look = PANO_SPOTS[next.key]
        if (look) this.openPano(next.key, look.titleHe, look.spots, then, look.startYaw ?? 0)
        else then()
        return
      }
      case 'wait':
        this.time.delayedCall(next.ms, then)
        return
      case 'sound':
        if (next.kind === 'roar') this.ctx.bus.emit('sound', { kind: 'roar', big: next.big ?? 1 })
        else if (next.kind === 'whistle') this.ctx.bus.emit('sound', { kind: 'whistle', blasts: next.blasts ?? 1 })
        else if (next.kind === 'radio') this.ctx.bus.emit('sound', { kind: 'radio', on: next.on ?? true })
        else this.ctx.bus.emit('sound', { kind: 'door' })
        then()
        return
      case 'sfx':
        this.ctx.bus.emit('sound', { kind: 'sample', key: next.key, ...(next.level !== undefined ? { level: next.level } : {}), ...(next.delayMs !== undefined ? { delayMs: next.delayMs } : {}) })
        then()
        return
      case 'crowd':
        this.ctx.bus.emit('sound', { kind: 'crowd', state: next.state })
        then()
        return
      case 'match':
        this.runMatch(next.script, then)
        return
      case 'presence':
        this.ctx.engine.dispatch({ t: 'presence.recorded', anchorId: this.anchor.id, mode: next.mode })
        then()
        return
      case 'actorCue':
        this.whenFree(() => this.actorCue(next, then))
        return
      case 'hud':
        this.hudHidden = !next.visible
        this.ctx.bus.emit('hudVisible', { visible: next.visible })
        then()
        return
      case 'cutscene': {
        // §23.6: a beat may name any film; only a verified payoff interrupts play
        const scene = autoCutsceneFor(next.id)
        if (!scene) {
          then()
          return
        }
        this.cutscene = scene
        this.afterCutscene = then
        this.paused = true
        this.ctx.bus.emit('controls', { visible: false })
        this.ctx.bus.emit('cutscene', { scene, card: cutsceneCard(scene, this.anchor) })
        return
      }
      default:
        then()
    }
  }

  /** The coda closed: the world is handed back, in the last room, and the life waits. */
  dismissCoda() {
    this.paused = false
    this.ctx.bus.emit('coda', null)
    this.ctx.bus.emit('controls', { visible: true })
    this.refresh()
  }

  /** The cut itself. Public so the shell's coda can hand the life to a chapter too. */
  /**
   * חולצה חדשה בחנות — announced once, on the first room of the chapter that has it.
   *
   * Maor asked for both halves of this on 5.9.2026: a kit must not appear on the rail
   * before the season it was worn in (that was already true — `onSale` gates on the
   * season), and the player must be TOLD when one arrives. So the first room of a new
   * chapter compares its rail with the previous chapter's and holds up whatever is new.
   *
   * The flag carries the `own:` prefix on purpose: it is one of the six that survive a new
   * day and a new decade, so the card cannot come back tomorrow for the same shirt.
   */
  private announceNewShirts() {
    const state = this.ctx.engine.state
    const flag = `own:shopnews:${this.chapter}`
    if (state.flags[flag]) return
    const chapters = playableChapters()
    const at = chapters.findIndex((row) => row.id === this.chapter)
    const previous = at > 0 ? chapters[at - 1]?.id ?? null : null
    const fresh = arrivedBetween(previous, this.chapter)
    this.ctx.engine.dispatch({ t: 'flag.raised', flag })
    const shirt = fresh[0]
    if (!shirt) return
    this.time.delayedCall(1400, () => {
      this.ctx.bus.emit('shirt', {
        kind: 'arrived',
        art: shirt.art,
        titleHe: SHIRT_NEW_HE,
        nameHe: shirt.nameHe,
        sponsorHe: shirt.sponsorHe,
        yearsHe: shirt.yearsHe,
        noteHe: shirt.noteHe,
        have: ownedShirts(this.ctx.engine.state).length,
        total: onSale(this.chapter).length,
        spec: shirt.spec ?? null,
        seasonHe: shirt.seasonLabel ?? null,
        sourceHe: shirt.sourceHe ?? null,
      })
    })
  }

  /**
   * ועונת סופרגול חדשה הגיעה לדלפק — the album's half of the same announcement.
   *
   * Maor, 16.9.2026: *"תעשה התראות על עונת סופרגול חדשה שנכנסה לחנות"*. Until that
   * sentence the shirts had the whole apparatus — `Shirt.from`, `arrivedBetween`,
   * `SHIRT_NEW_HE`, a once-per-chapter `own:shopnews:` flag — and the albums had none of
   * it: `StickerSet.soldIn` was a DECADE, so every eighties page was equally "current" in
   * every eighties chapter and no moment existed for one to arrive in.
   *
   * It fires in exactly four chapters — `a4-shirt`, `1990`, `1993-cup`, `1997-basket` —
   * and `tests/life-shop.test.ts` asserts those four by name, because an announcement
   * nothing can trigger is dead content (rule 66).
   *
   * Staggered 2200ms against the shirt's 1400ms so a chapter that turns over both does
   * not put two cards on the glass at once.
   */
  private announceNewAlbums() {
    const state = this.ctx.engine.state
    const flag = albumNewsFlag(this.chapter)
    if (state.flags[flag]) return
    const chapters = playableChapters()
    const at = chapters.findIndex((row) => row.id === this.chapter)
    const previous = at > 0 ? chapters[at - 1]?.id ?? null : null
    const fresh = setsArrivedBetween(previous, this.chapter)
    this.ctx.engine.dispatch({ t: 'flag.raised', flag })
    const set = fresh[0]
    if (!set) return
    this.time.delayedCall(2200, () => {
      this.ctx.bus.emit('toast', { text: `${SET_NEW_HE} — ${set.titleHe}`, tone: 'red' })
    })
  }

  /**
   * "המנוי יצא למכירה" — the third of these, and the only one that stops the chapter.
   *
   * Maor, 16.9.2026: *"תכניס ממש עצירה בין לבין עם פופ אפ של 'המנוי יצא למכירה'"*. The
   * shape is `announceNewShirts`'s to the letter, for the reason that made that one work:
   * the first room of a chapter is the only moment in this engine that is reliably
   * BETWEEN two stories, and a card shown there is read instead of dismissed.
   *
   * Two emissions, one channel, and the difference matters:
   * · the ANNOUNCEMENT fires once per season, wherever the chapter opens, and sells
   *   nothing. `own:subnews:<season>` carries the surviving prefix so a reload, a new day
   *   or a second run of the same room cannot show it twice — the same trick and the same
   *   reason as `own:shopnews:`.
   * · the COUNTER fires every time he walks into the office while the season is open and
   *   unheld, because that room has no other content: the window is the card (see the
   *   scene's own note). Once the card is in his pocket the room says nothing, which is
   *   how a shut window behaves.
   *
   * 1400ms and 2200ms are already taken by the shirt and the album; this waits 2800 so a
   * chapter that turns over all three does not stack them on one glass.
   */
  private announceSeasonTicket() {
    const state = this.ctx.engine.state
    const season = seasonOnSaleIn(this.chapter)
    if (!season) return
    if (holdsSeason(state, season.id)) return

    const flag = subNewsFlag(season.id)
    const told = Boolean(state.flags[flag])

    if (this.def.id === TICKET_OFFICE) {
      // Standing at the window IS being told. Without this, a player who walked straight
      // to the office would be announced the season on his way back out — a poster for a
      // thing he has just been offered over the counter.
      if (!told) this.ctx.engine.dispatch({ t: 'flag.raised', flag })
      this.time.delayedCall(600, () => this.ctx.bus.emit('season', { kind: 'counter', season: season.id }))
      return
    }

    if (told) return
    this.ctx.engine.dispatch({ t: 'flag.raised', flag })
    this.time.delayedCall(2800, () => this.ctx.bus.emit('season', { kind: 'onSale', season: season.id }))
  }

  /**
   * ההזמנה — מה שאתה כבר עושה יש לו שם.
   *
   * *"בדיקה נעשית בסיום פעולה רלוונטית ובכניסה לפרק, לא בכל תנועה"* — so this runs where
   * the other three announcers run, on the room a chapter opens in, and nowhere on the
   * tick. `eligibleFor` is pure and writes nothing, which is the line the whole routes
   * design is drawn on: reaching a threshold *"יוצרת הזמנה שניתן לדחות; אינה מבצעת
   * החלטה"*, so the state does not change until a person presses something.
   *
   * **One offer, and the first one.** The model hands back at most one stage per route,
   * but a man can cross two routes' thresholds in the same chapter, and two conversations
   * queued behind each other is a promotion ceremony. The rest keep their eligibility and
   * are offered by the next chapter that opens.
   *
   * 4200ms, after the shirt (1400), the album (2200) and the season (2800), for the same
   * reason those three are staggered: a chapter that turns over all four must not stack
   * them on one glass. And it refuses to open over a conversation or a paused world — an
   * offer that interrupts the scene it was earned in reads as a bug, not as a beat.
   */
  private offerRoute() {
    const offers = eligibleFor(this.ctx.engine.state)
    for (const offer of offers) {
      const flag = offeredFlag(offer.route.id, offer.stage)
      if (this.ctx.engine.state.flags[flag]) continue
      const conversation = offerConversationFor(offer.route.id, offer.stage)
      if (!conversation) continue
      this.ctx.engine.dispatch({ t: 'flag.raised', flag })
      this.time.delayedCall(4200, () => {
        if (this.paused || this.ctx.dialogue.open) return
        this.ctx.dialogue.start(conversation)
      })
      return
    }
  }

  enterChapter(next: ChapterDef) {
    const state = this.ctx.engine.state
    this.paused = true
    this.ctx.bus.emit('controls', { visible: false })
    this.ctx.bus.emit('prompt', null)
    this.ctx.bus.emit('card', {
      titleHe: next.bridge.titleHe,
      subHe: next.bridge.subHe,
      ms: next.bridge.ms,
      art: plateFor(next.id),
      fromYear: state.year,
      nameHe: next.titleHe,
    })
    this.time.delayedCall(next.bridge.ms + 100, () => {
      this.ctx.engine.dispatch(
        { t: 'year.entered', year: next.year, weekday: next.weekday, minute: next.minute },
        { t: 'chapter.entered', chapter: next.id },
        { t: 'flag.raised', flag: `life:bridge-${next.id}` },
        ...(next.entry ? next.entry(state) : []),
      )
      void this.ctx.engine.save()
      this.fadeThen(500, () => {
        this.scene.restart({ mapId: next.start.location, spawn: next.start.spawn, from: this.def.id })
      })
    })
  }
}

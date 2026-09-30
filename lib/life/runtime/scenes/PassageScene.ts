import Phaser from 'phaser'

import { PASSAGE_1990, PASSAGE_CARD_HE } from '../../content/chapter1990'
import { PASSAGE_1993, PASSAGE_CARD_1993_HE } from '../../content/chapter1993cup'
import { ERA_1986, ERA_1990, ERA_1993_CUP } from '../../content/era'
import { RIDES, RIDE_PREFIX, type Ride, type RideStop } from '../../content/passages'
import type { LocationId } from '../../types'
import { sceneFor } from '../../world/scenes'
import { artUrl, extensionKeys } from '../art'
import { fillCamera } from '../camera'
import { CONTEXT_KEY, type LifeContext } from '../context'
import { LIFE_PALETTE } from '../palette'
import { strideAdvance } from '../walk'

import { WorldScene } from './WorldScene'

/**
 * ארבע שנים בלי תפריט — the passage from 1986 to 1990, played, not loaded.
 *
 * Brief §4 is exact about what this must not be: a button labelled "1990", or a loading
 * screen counting years. The Red Box has just closed on a Saturday in 1986; the latch is
 * still in the player's ear. The same bedroom comes back and the boy is still in it, and
 * he can still be walked. Four things in the room can be looked at, and each look moves
 * time: the light goes, the school bag grows, the football goes, the wall fills up with
 * Hapoel, and — between the second and third look — he is drawn older. When the last
 * object has been seen the room goes dark, the kitchen radio starts talking before the
 * picture changes, and a small card says the month. Then the kitchen table, and control.
 *
 * It is its own scene rather than a WorldScene mode because it is the one place in the
 * game where the clock does not run, no schedule applies, no door works and nobody can
 * be spoken to — a WorldScene with all of that switched off is a scene pretending.
 *
 * מ-6.9.2026 זה גשר, ולא גשר אחד. The scene takes its objects, its card and its
 * destination from `init`, because the Stage B brief (§7 B2) asks for a second one: after
 * the derby of March 1991 the game jumped straight to April 1993, so the branch the whole
 * unit is about — a hall that became a habit — was a single evening followed by two silent
 * years. The bridge is what says otherwise, and it says it with four objects rather than
 * with a sentence.
 */

/** which bridge is being played — everything that differs between them, and nothing else */
type Passage = {
  objects: typeof PASSAGE_1990
  cardHe: string
  /** where each object sits along the room, by id */
  at: Record<string, number>
  /** the chapter this bridge lands in, and the room it lands in */
  into: { chapter: string; year: number; weekday: number; minute: number; mapId: string; spawn: string }
  /** the flag the arrival raises, so a save knows this bridge was walked */
  flag: string
  /** the line the kitchen says just before the picture changes */
  toastHe: string
}

const PASSAGES: Record<string, Passage> = {
  '1990': {
    objects: PASSAGE_1990,
    cardHe: PASSAGE_CARD_HE,
    at: { clipping: 0.72, notebook: 0.17, scarf: 0.89, photo: 0.47 },
    into: { chapter: ERA_1990.chapter, year: ERA_1990.year, weekday: 6, minute: 12 * 60 + 35, mapId: 'kitchen', spawn: 'fromHome' },
    flag: 'life:passage-1990',
    toastHe: 'מהמטבח: רדיו. מישהו מסובב את הכפתור.',
  },
  '1993': {
    objects: PASSAGE_1993,
    cardHe: PASSAGE_CARD_1993_HE,
    at: { stubs: 0.72, ledger: 0.17, laces: 0.89, radio: 0.47 },
    into: { chapter: ERA_1993_CUP.chapter, year: ERA_1993_CUP.year, weekday: 1, minute: 15 * 60 + 30, mapId: 'home', spawn: 'start' },
    flag: 'life:passage-1993',
    toastHe: 'מהסלון: הטלוויזיה. מישהו מדבר על גמר.',
  },
}

const ROOM = sceneFor('bedroom')

type Spot = { def: (typeof PASSAGE_1990)[number]; x: number; y: number; seen: boolean; mark: Phaser.GameObjects.Ellipse }

export class PassageScene extends Phaser.Scene {
  static readonly KEY = 'life-passage'

  private ctx!: LifeContext
  private W = 1
  private H = 1
  private player!: Phaser.GameObjects.Image
  private spots: Spot[] = []
  private seen = 0
  private busy = false
  private done = false
  private goal: { x: number; then: Spot | null } | null = null
  private facing = -1
  private stride = 0
  private dressing: Phaser.GameObjects.Image[] = []
  /** which bridge; defaults to the one this scene was written for */
  private passage: Passage = PASSAGES['1990']!
  /**
   * a ride (`content/passages.ts`) instead of a bridge — Director V3 §9, 24.9.2026.
   * Everything the ride does lives in the `ride*` methods at the bottom; the bridge above
   * is untouched by it.
   */
  private ride: Ride | null = null
  private rideStop = -1
  private rideTaps = 0
  private rideSince = 0
  private rideMark: Phaser.GameObjects.Ellipse | null = null
  private ridePicture: Phaser.GameObjects.Image | null = null
  private rideWaiting = false

  constructor() {
    super(PassageScene.KEY)
  }

  init(data?: { passage?: string }) {
    const key = data?.passage ?? '1990'
    this.ride = key.startsWith(RIDE_PREFIX) ? RIDES[key.slice(RIDE_PREFIX.length)] ?? null : null
    this.passage = PASSAGES[key] ?? PASSAGES['1990']!
  }

  preload() {
    if (this.ride) {
      const art = this.ride.art
      const ext = extensionKeys(art)
      for (const key of [art, ext.sky, ext.ground]) if (!this.textures.exists(`art-${key}`)) this.load.image(`art-${key}`, artUrl(key))
      return
    }
    const ext = extensionKeys(ROOM.art)
    const need = [
      ROOM.art,
      ext.sky,
      ext.ground,
      ...Object.values(ERA_1986.player.pose),
      ...ERA_1986.player.walk,
      ...Object.values(ERA_1990.player.pose),
      ...ERA_1990.player.walk,
      'propPack80',
      'propBall90',
      'propFlag',
      'propClipping90',
      'propSticker',
      'propScarfRed',
    ]
    for (const key of need) if (!this.textures.exists(`art-${key}`)) this.load.image(`art-${key}`, artUrl(key))
  }

  create() {
    this.ctx = this.registry.get(CONTEXT_KEY) as LifeContext
    if (this.ride) {
      this.createRide(this.ride)
      return
    }
    this.spots = []
    this.seen = 0
    this.busy = false
    this.done = false
    this.goal = null
    this.dressing = []

    this.cameras.main.setBackgroundColor(LIFE_PALETTE.night)
    const backdrop = this.add.image(0, 0, `art-${ROOM.art}`).setOrigin(0, 0).setDepth(-1000)
    this.W = backdrop.width
    this.H = backdrop.height
    const ext = extensionKeys(ROOM.art)
    let extra = 0
    if (this.textures.exists(`art-${ext.sky}`) && this.textures.exists(`art-${ext.ground}`)) {
      const sky = this.add.image(0, 0, `art-${ext.sky}`).setOrigin(0, 1).setDepth(-1001)
      const ground = this.add.image(0, this.H, `art-${ext.ground}`).setOrigin(0, 0).setDepth(-1001)
      sky.setDisplaySize(this.W, sky.height * (this.W / sky.width))
      ground.setDisplaySize(this.W, ground.height * (this.W / ground.width))
      extra = Math.min(sky.displayHeight, ground.displayHeight)
    }

    // The room as it was left in 1986: the ball in the corner, the bag by the bed, small.
    this.dress('propBall90', 0.62, 0.95, 0.05, 'ball')
    this.dress('propPack80', 0.12, 0.83, 0.05, 'bag')

    // The child, where the chapter always starts him.
    const y = 0.93 * this.H
    this.player = this.add.image(0.3 * this.W, y, `art-${ERA_1986.player.pose.down}`).setOrigin(0.5, 1).setDepth(y)
    this.sizePlayer(ROOM.size.near)

    for (const def of this.passage.objects) {
      const at = this.passage.at[def.id] ?? 0.5
      const mark = this.add
        .ellipse(at * this.W, 0.905 * this.H, 26, 26 * 0.32, LIFE_PALETTE.red, 0)
        .setStrokeStyle(2, LIFE_PALETTE.red, 0.7)
        .setDepth(1)
      this.tweens.add({ targets: mark, alpha: 0.35, duration: 900, yoyo: true, repeat: -1 })
      this.spots.push({ def, x: at * this.W, y: 0.92 * this.H, seen: false, mark })
    }

    const cam = this.cameras.main
    const view = this.scale.gameSize
    fillCamera(this, cam, this.W, this.H + 2 * extra, view.height > view.width ? 1 : 1.03)
    cam.setBounds(0, -extra, this.W, this.H + 2 * extra)
    cam.startFollow(this.player, true, 0.08, 0.08)
    cam.setFollowOffset(0, (0.68 - 0.5) * (cam.height / cam.zoom))
    cam.fadeIn(1200, 0, 0, 0)
    const onResize = () => {
      const v = this.scale.gameSize
      fillCamera(this, cam, this.W, this.H + 2 * extra, v.height > v.width ? 1 : 1.03)
      cam.setFollowOffset(0, (0.68 - 0.5) * (cam.height / cam.zoom))
    }
    this.scale.on('resize', onResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize, this))

    this.ctx.bus.emit('frame', { picture: 0 })
    this.ctx.bus.emit('place', { id: 'bedroom', title: ROOM.titleHe, ambience: 'interior' })
    this.ctx.bus.emit('controls', { visible: true })
    this.ctx.bus.emit('match', null)
    this.ctx.bus.emit('hud', {
      clock: '',
      date: '1986',
      agorot: 0,
      showMoney: false,
      energy: 100,
      showEnergy: false,
      place: ROOM.titleHe,
      objective: 'אם משהו בחדר מושך אותך — תסתכל. הזמן ימשיך גם בלעדיו.',
      year: this.ctx.engine.state.year,
      scene: 'bedroom',
      hint: 'בחר זיכרון אחד, או תן לזמן להמשיך.',
      waitingHe: null,
    })

    this.ctx.dialogue.setHooks({
      travel: () => undefined,
      minigame: () => undefined,
      ending: () => undefined,
      onOpen: (open) => {
        this.busy = open
      },
    })

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.pointAt(pointer.worldX))
  }

  pointAtScreen(clientX: number, clientY: number) {
    const canvas = this.game.canvas
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0) return
    const canvasX = ((clientX - rect.left) / rect.width) * this.scale.width
    const cam = this.cameras.main
    if (this.ride) {
      const canvasY = ((clientY - rect.top) / rect.height) * this.scale.height
      const world = cam.getWorldPoint(canvasX, canvasY)
      this.rideTap(world.x, world.y)
      return
    }
    this.pointAt(cam.scrollX + canvasX / cam.zoom)
  }

  private pointAt(worldX: number) {
    if (this.busy || this.done) return
    const near = this.spots.find((spot) => !spot.seen && Math.abs(spot.x - worldX) < this.W * 0.09)
    const x = Phaser.Math.Clamp(near ? near.x + (this.player.x < near.x ? -1 : 1) * this.W * 0.06 : worldX, this.W * 0.04, this.W * 0.96)
    this.goal = { x, then: near ?? null }
  }

  private dress(key: string, x: number, y: number, w: number, name: string) {
    const image = this.add.image(x * this.W, y * this.H, `art-${key}`).setOrigin(0.5, 1).setDepth(y * this.H)
    const source = this.textures.get(`art-${key}`).getSourceImage()
    const width = w * this.W
    image.setDisplaySize(width, width * ((source.height || 1) / (source.width || 1)))
    image.setName(name)
    this.dressing.push(image)
    return image
  }

  private sizePlayer(fraction: number) {
    const source = this.textures.get(this.player.texture.key).getSourceImage()
    const height = fraction * this.H
    this.player.setDisplaySize(height * ((source.width || 1) / (source.height || 1)), height)
  }

  override update(_time: number, delta: number) {
    this.ctx.input.beginFrame()
    if (this.ride) {
      this.updateRide(delta)
      return
    }
    if (this.busy || this.done) return
    const era = this.seen >= 2 ? ERA_1990 : ERA_1986
    const input = this.ctx.input
    let ax = input.x
    if (Math.abs(ax) > 0.08 && this.goal) this.goal = null
    let arrived: Spot | null = null
    if (this.goal && Math.abs(ax) <= 0.08) {
      const dx = this.goal.x - this.player.x
      if (Math.abs(dx) < this.W * 0.008) {
        arrived = this.goal.then
        this.goal = null
        ax = 0
      } else ax = Math.sign(dx) * Math.min(1, Math.abs(dx) / (this.W * 0.05))
    }
    const speed = 1.5 * this.player.displayHeight
    const moved = ax * speed * (delta / 1000)
    this.player.x = Phaser.Math.Clamp(this.player.x + moved, this.W * 0.04, this.W * 0.96)
    if (Math.abs(ax) > 0.08) {
      this.facing = ax < 0 ? -1 : 1
      this.stride += strideAdvance(Math.abs(moved), this.player.displayHeight, era.player.walk.length)
      const frame = era.player.walk[Math.floor(this.stride) % era.player.walk.length] ?? era.player.walk[0]
      this.player.setTexture(`art-${frame}`)
    } else {
      this.player.setTexture(`art-${era.player.pose.down}`)
    }
    this.player.setFlipX(this.facing < 0)
    this.sizePlayer(ROOM.size.near * (era.player.scale ?? 1))

    if (arrived) this.look(arrived)
    else if (input.actionPressed) {
      const near = this.spots.find((spot) => !spot.seen && Math.abs(spot.x - this.player.x) < this.W * 0.1)
      if (near) this.look(near)
    }

    const near = this.spots.find((spot) => !spot.seen && Math.abs(spot.x - this.player.x) < this.W * 0.1)
    this.ctx.bus.emit('prompt', near ? { verb: 'look', label: near.def.labelHe, locked: false } : null)
  }

  /** Developer-only: the boy and the four things left to look at, for the probes. */
  where() {
    if (this.ride) {
      const stop = this.ride.stops[this.rideStop]
      return { scene: 'ride', x: 0, y: 0, paused: this.busy, spots: [], stop: stop?.id ?? null, waiting: this.rideWaiting }
    }
    return {
      scene: 'passage',
      x: Number((this.player.x / this.W).toFixed(3)),
      y: 0,
      paused: this.busy,
      spots: this.spots.filter((spot) => !spot.seen).map((spot) => Number((spot.x / this.W).toFixed(3))),
    }
  }

  /** One look: what he sees, what changed — and the room moving on a year. */
  private look(spot: Spot) {
    if (spot.seen || this.busy) return
    spot.seen = true
    spot.mark.destroy()
    this.seen += 1
    this.ctx.bus.emit('prompt', null)
    const n = this.seen
    this.ctx.dialogue.startLines([{ who: null, text: spot.def.lookHe }], () => {
      this.passYear(n)
      this.time.delayedCall(900, () => {
        this.ctx.dialogue.startLines([{ who: null, text: spot.def.afterHe }], () => {
          if (this.seen >= 1) this.finish()
        })
      })
    })
  }

  /**
   * A year, visibly. The light warms and drops, the football goes, the bag grows, the
   * wall gains Hapoel; between the second and third look the boy is drawn older. None of
   * it is a card with a number on it.
   */
  private passYear(n: number) {
    const cam = this.cameras.main
    cam.flash(260, 21, 18, 14)
    // The one number this scene allows itself: the year in the corner, ticking over under
    // the flash. 1987, 1988, 1989 — and the fourth look is the cut to May 1990 itself.
    this.ctx.bus.emit('hud', {
      clock: '',
      date: String(1986 + Math.min(n, 3)),
      agorot: 0,
      showMoney: false,
      energy: 100,
      showEnergy: false,
      place: ROOM.titleHe,
      objective: n >= 1 ? '' : 'אם משהו בחדר מושך אותך — תסתכל.',
      year: this.ctx.engine.state.year,
      scene: 'bedroom',
      hint: 'זיכרון אחד מספיק. הזמן לא מחכה לקליק רביעי.',
      waitingHe: null,
    })
    const dark = 1 - n * 0.09
    for (const child of this.children.list) {
      if (child instanceof Phaser.GameObjects.Image && child.depth <= -1000) {
        this.tweens.add({ targets: child, alpha: dark, duration: 700 })
      }
    }
    if (n === 1) {
      const ball = this.dressing.find((image) => image.name === 'ball')
      if (ball) this.tweens.add({ targets: ball, alpha: 0, duration: 600, onComplete: () => ball.destroy() })
      this.dress('propSticker', 0.78, 0.6, 0.035, 'wall1')
    }
    if (n === 2) {
      const bag = this.dressing.find((image) => image.name === 'bag')
      if (bag) this.tweens.add({ targets: bag, displayWidth: bag.displayWidth * 1.5, displayHeight: bag.displayHeight * 1.5, duration: 700 })
      this.dress('propClipping90', 0.66, 0.66, 0.05, 'wall2')
      // …and he is older. The swap happens under the flash, which is where a cut belongs.
      this.player.setTexture(`art-${ERA_1990.player.pose.down}`)
      this.sizePlayer(ROOM.size.near * (ERA_1990.player.scale ?? 1))
    }
    if (n === 3) this.dress('propScarfRed', 0.9, 0.72, 0.06, 'wall3')
    // the wall fills: the club's flag, where the engraved fly-posters were (21.9.2026)
    if (n === 4) this.dress('propFlag', 0.36, 0.52, 0.08, 'wall4')
  }

  /**
   * The cut to 1990: sound first, then dark, then the month, then the kitchen. The
   * `year.entered` event is written HERE, once, and the chapter opens on the table.
   */
  private finish() {
    if (this.done) return
    this.done = true
    this.ctx.bus.emit('prompt', null)
    this.ctx.bus.emit('controls', { visible: false })
    this.ctx.bus.emit('toast', { text: this.passage.toastHe, tone: 'plain' })
    const cross = () => this.time.delayedCall(900, () => {
      this.cameras.main.fadeOut(900, 0, 0, 0)
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        const into = this.passage.into
        this.ctx.bus.emit('card', { titleHe: this.passage.cardHe, subHe: null, ms: 2200 })
        this.time.delayedCall(2400, () => {
          this.ctx.engine.dispatch(
            { t: 'year.entered', year: into.year, weekday: into.weekday, minute: into.minute },
            { t: 'chapter.entered', chapter: into.chapter },
            { t: 'flag.raised', flag: this.passage.flag },
          )
          void this.ctx.engine.save()
          this.ctx.bus.emit('controls', { visible: true })
          this.scene.start(WorldScene.KEY, { mapId: into.mapId, spawn: into.spawn })
        })
      })
    })

    if (this.passage.flag === 'life:passage-1990') {
      this.ctx.bus.emit('card', { titleHe: '1989', subHe: 'לראשונה: ירידה', ms: 2200 })
      this.time.delayedCall(2300, () => {
        this.ctx.dialogue.startLines([
          { who: null, text: 'שנה לפני העלייה, הייתה הירידה. בפעם הראשונה.' },
          { who: null, text: 'קובי קיפל את העיתון והשאיר אותו על השולחן. אף אחד בבית לא הפך את זה לנאום.' },
          { who: null, text: 'ב-1990, כששואלים כמה צריך, אתה כבר יודע למה המספר חשוב.' },
        ], cross)
      })
    } else cross()
  }

  // ------------------------------------------------------------------ the ride ----

  /**
   * The car at night: the painting fills the glass, the picture breathes the way a car
   * does on a long road, and the stops come up one after another. No walking — the road is
   * doing that — and no clock: a ride is a passage, and the day resumes where it lands.
   */
  private createRide(ride: Ride) {
    this.done = false
    this.busy = false
    this.rideStop = -1
    this.rideTaps = 0
    this.rideSince = 0
    this.rideWaiting = false
    this.cameras.main.setBackgroundColor(LIFE_PALETTE.night)
    const picture = this.add.image(0, 0, `art-${ride.art}`).setOrigin(0, 0).setDepth(-1000)
    this.ridePicture = picture
    this.W = picture.width
    this.H = picture.height
    const cam = this.cameras.main
    const view = this.scale.gameSize
    fillCamera(this, cam, this.W, this.H, view.height > view.width ? 1 : 1.03)
    cam.setBounds(0, 0, this.W, this.H)
    cam.centerOn(this.W / 2, this.H / 2)
    cam.fadeIn(900, 0, 0, 0)
    const onResize = () => {
      const v = this.scale.gameSize
      fillCamera(this, cam, this.W, this.H, v.height > v.width ? 1 : 1.03)
      cam.centerOn(this.W / 2, this.H / 2)
    }
    this.scale.on('resize', onResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', onResize, this))
    // the road under the wheels: a slow vertical breath, never a shake (transform only) —
    // unless the passage is a room that stands still (`Ride.still`)
    if (!ride.still) this.tweens.add({ targets: picture, y: -this.H * 0.004, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    this.ctx.bus.emit('frame', { picture: 0 })
    this.ctx.bus.emit('place', { id: ride.land.mapId as LocationId, title: ride.titleHe, ambience: 'dusk' })
    this.ctx.bus.emit('controls', { visible: true })
    this.ctx.bus.emit('match', null)
    this.rideHud(null)
    if (ride.radio !== false) this.ctx.bus.emit('sound', { kind: 'radio', on: true })
    this.ctx.dialogue.setHooks({
      travel: () => undefined,
      minigame: () => undefined,
      ending: () => undefined,
      onOpen: (open) => {
        this.busy = open
      },
    })
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.rideTap(pointer.worldX, pointer.worldY))
  }

  private rideHud(stop: RideStop | null) {
    const state = this.ctx.engine.state
    this.ctx.bus.emit('hud', {
      clock: '',
      date: String(state.year),
      agorot: state.agorot,
      showMoney: true,
      energy: state.energy,
      showEnergy: false,
      place: this.ride?.titleHe ?? '',
      objective: stop ? stop.labelHe : this.ride?.hintHe ?? '',
      year: state.year,
      scene: (this.ride?.land.mapId ?? 'kiosk') as LocationId,
      hint: this.ride?.hintHe ?? '',
      waitingHe: null,
    })
  }

  private updateRide(delta: number) {
    const ride = this.ride
    if (!ride || this.done || this.busy) return
    this.rideSince += delta
    const next = ride.stops[this.rideStop + 1]
    if (!this.rideWaiting) {
      if (!next) {
        this.finishRide()
        return
      }
      if (this.rideSince >= next.gapMs) this.raiseStop(next)
      return
    }
    const stop = ride.stops[this.rideStop]
    if (!stop) return
    if (this.ctx.input.actionPressed) {
      this.pressStop(stop)
      return
    }
    // a stop nobody touches plays by itself: the road does not strand a player who waits
    if (this.rideSince >= stop.autoMs) this.resolveStop(stop)
  }

  private raiseStop(stop: RideStop) {
    this.rideStop += 1
    this.rideTaps = 0
    this.rideSince = 0
    this.rideWaiting = true
    const x = stop.spot.x * this.W
    const y = stop.spot.y * this.H
    this.rideMark?.destroy()
    const mark = this.add.ellipse(x, y, this.W * 0.05, this.W * 0.05, LIFE_PALETTE.red, 0).setStrokeStyle(3, LIFE_PALETTE.red, 0.9).setDepth(10)
    this.tweens.add({ targets: mark, scale: 1.25, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.rideMark = mark
    this.ctx.bus.emit('prompt', { verb: stop.verb, label: stop.labelHe, locked: false })
    this.rideHud(stop)
  }

  private rideTap(worldX: number, worldY: number) {
    const ride = this.ride
    if (!ride || this.busy || this.done || !this.rideWaiting) return
    const stop = ride.stops[this.rideStop]
    if (!stop) return
    const dx = worldX - stop.spot.x * this.W
    const dy = worldY - stop.spot.y * this.H
    // a thumb is not a cursor: generous, about a tenth of the picture
    if (Math.hypot(dx, dy) > this.W * 0.1) return
    this.pressStop(stop)
  }

  private pressStop(stop: RideStop) {
    const taps = stop.taps ?? 1
    this.rideTaps += 1
    this.rideSince = 0
    if (this.rideTaps < taps) {
      if (this.rideMark) this.tweens.add({ targets: this.rideMark, angle: this.rideMark.angle + 40, duration: 180 })
      if (this.ride?.radio !== false) this.ctx.bus.emit('sound', { kind: 'radio', on: true })
      const text = stop.tapHe?.[this.rideTaps - 1]
      if (text) this.ctx.bus.emit('toast', { text, tone: 'plain' })
      return
    }
    this.resolveStop(stop)
  }

  private resolveStop(stop: RideStop) {
    this.rideWaiting = false
    this.rideSince = 0
    this.rideMark?.destroy()
    this.rideMark = null
    this.ctx.bus.emit('prompt', null)
    this.rideHud(null)
    const after = () => {
      this.rideSince = 0
    }
    if (stop.conversation) {
      if (!this.ctx.dialogue.start(stop.conversation, after)) after()
      return
    }
    if (stop.lines?.length) this.ctx.dialogue.startLines(stop.lines, after)
  }

  /** the ground, and back: the arrival is written once, and the world picks up where it lands */
  private finishRide() {
    const ride = this.ride
    if (!ride || this.done) return
    this.done = true
    this.ctx.bus.emit('prompt', null)
    this.ctx.bus.emit('sound', { kind: 'radio', on: false })
    for (const flag of ride.flags) this.ctx.engine.dispatch({ t: 'flag.raised', flag })
    void this.ctx.engine.save()
    this.cameras.main.fadeOut(800, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(WorldScene.KEY, { mapId: ride.land.mapId, spawn: ride.land.spawn })
    })
  }
}

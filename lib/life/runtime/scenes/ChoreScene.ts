import Phaser from 'phaser'

import { eraFor } from '../../content/era'
import { AFTER_FLAG, activityForGig, afterConversation, settleActivity } from '../../activities'
import { STORY_CHORES, STORY_CHORE_PREFIX, type StoryChore } from '../../content/storyChores'
import { CHORE_ORDER_FLAG, GIGS, gigFlag, gigPay, workDoneFlag, type Gig } from '../../gigs'
import { shekels } from '../../prices'
import type { LocationId } from '../../types'
import { SCENE, artFor, sceneIn } from '../../world/scenes'
import { artUrl } from '../art'
import { frameCamera } from '../camera'
import { CONTEXT_KEY, type LifeContext } from '../context'
import { LIFE_PALETTE } from '../palette'

import { WorldScene } from './WorldScene'

/**
 * העבודה עצמה — a gig you play, not a gig you agree to.
 *
 * Maor was asked how the seven jobs should feel and he chose in three words: "מיני־משחק
 * אמיתי לשחק בו". So this is the room the job happens in — its own painting, its own walk
 * band, the child at his own size — and four shapes of work on top of it, because a boy
 * collecting bottles and a boy selling scarves are not doing the same thing with their
 * hands:
 *
 *  · **collect** — bottles, balls: they are lying about, you walk into them, they go in
 *    the crate. The whole job is knowing which way to run first.
 *  · **carry** — crates, drinks, shopping: one at a time, from the pile to the door, and
 *    the walk back is the cost. Nothing to press.
 *  · **serve** — scarves and flags before a match: people arrive, wait a little, and go.
 *    Reach one and press before they go.
 *  · **sweep** — the parquet at Ussishkin: the floor is dirty in patches and you clean it
 *    by walking it, which is exactly what a broom is.
 *
 * The pay is the gig's pay, scaled by how much of it you did: half for turning up, the
 * rest for the work, and a fifth on top for finishing everything before the clock. It is
 * never zero — an hour is an hour, and a game that pays nothing teaches a player not to
 * play it again.
 *
 * The clock and the energy are charged on the way out, once, by the same events the
 * dialogue version dispatched — so a gig costs the afternoon whether it was played well
 * or badly.
 */

type Piece = {
  image: Phaser.GameObjects.Image | Phaser.GameObjects.Ellipse
  x: number
  y: number
  taken: boolean
  /** serve mode: when this customer gives up */
  leavesAt?: number
}

type Mode = 'collect' | 'carry' | 'serve' | 'sweep'

/**
 * `capacity` — a bag that holds this many, and is only worth something once it has been
 * emptied at the drop (the bottles after a match: keep collecting, or go and cash in before
 * the cleaners come). Absent: every piece counts the moment it is picked up.
 */
type Shape = { mode: Mode; art?: string; target: number; seconds: number; hintHe: string; capacity?: number }

/** which shape of work each gig is, and what it uses for a piece */
/**
 * The prop each job is done with. The bottle arrived on 5.9.2026 and the job is a bottle
 * job now rather than a wrapper job. Two stand-ins are left and they say so here: a
 * wooden CRATE and a cloth shopping BAG are still on the art list, and until they land the
 * crate job carries a cigarette pack and the shopping job carries a satchel. That is a
 * small lie and it is written down rather than hidden.
 */
const SHAPE: Record<string, Shape> = {
  'bottles-round': { mode: 'collect', art: 'propBottle', target: 8, seconds: 45, hintHe: 'תאסוף את הבקבוקים לפני שמישהו אחר יגיע.' },
  'crates-kiosk': { mode: 'carry', art: 'propPack80', target: 6, seconds: 60, hintHe: 'ארגז אחד כל פעם. מהערימה לדלת.' },
  'sweep-hall': { mode: 'sweep', target: 10, seconds: 55, hintHe: 'מהשורה העליונה למטה. תעבור על הכל.' },
  'papers-round': { mode: 'carry', art: 'propNewspaper', target: 7, seconds: 55, hintHe: 'עיתון לכל תיבה. אל תפספס בניין.' },
  'shopping-neighbour': { mode: 'carry', art: 'propBagStrap90', target: 4, seconds: 45, hintHe: 'שתי שקיות, שלוש קומות. תחזיק מלמטה.' },
  'drinks-hall': { mode: 'carry', art: 'propBottleFull', target: 6, seconds: 55, hintHe: 'לפני שפותחים את השערים.' },
  'wash-cars': { mode: 'sweep', target: 12, seconds: 60, hintHe: 'לעבור על כל הרכב. פינות גם.' },
  'errands-rafi': { mode: 'carry', art: 'propBagStrap90', target: 5, seconds: 55, hintHe: 'הזמנה לכל בניין. רפי סופר.' },
  'sell-scarves': { mode: 'serve', art: 'propScarfRed', target: 8, seconds: 55, hintHe: 'הם עוברים. תגיע אליהם ותלחץ.' },
  'balls-hall': { mode: 'collect', art: 'propBasketball', target: 9, seconds: 45, hintHe: 'כל הכדורים לעגלה, לפני שהאימון מתחיל.' },
  // אלנבי (6.9.2026): the market and the shopfront
  'crates-allenby': { mode: 'carry', art: 'propCrate', target: 7, seconds: 60, hintHe: 'ארגז אחד כל פעם, מהמדרכה פנימה.' },
  'sweep-allenby': { mode: 'sweep', target: 9, seconds: 45, hintHe: 'מהשולחנות עד אבן השפה. הכל.' },
  // 21.9.2026 — the two jobs that became activities and are still played with the hands
  'chairs-end': { mode: 'carry', art: 'propCrate', target: 7, seconds: 50, hintHe: 'אחד־אחד, לפי הסדר ששחור ביקש.' },
  'bottles-ground': { mode: 'collect', art: 'propBottle', target: 10, seconds: 50, capacity: 4, hintHe: 'ארבעה בשקית. לפדות ליד הארגז, ולחזור — לפני שהמנקים מגיעים.' },
}

/** what a gig with no shape declared plays as — never reached, but never undefined either */
const FALLBACK_SHAPE: Shape = { mode: 'collect', target: 8, seconds: 45, hintHe: 'תאסוף הכול.' }

export class ChoreScene extends Phaser.Scene {
  static readonly KEY = 'life-chore'

  private ctx!: LifeContext
  private gig!: Gig
  private shape: Shape = FALLBACK_SHAPE
  private returnTo: LocationId = 'street'
  private returnSpawn = 'start'

  private W = 1
  private H = 1
  private band = { far: 0.7, near: 0.95 }
  private size = { far: 0.12, near: 0.2 }

  private player!: Phaser.GameObjects.Image
  private shadow!: Phaser.GameObjects.Ellipse
  private pieces: Piece[] = []
  private carried: Phaser.GameObjects.Image | null = null
  private drop = { x: 0.88, y: 0.9 }
  private done = 0
  /** what is in the bag and not yet cashed in (capacity shapes only) */
  private bag = 0
  private endsAt = 0
  private finished = false
  private lockUntil = 0
  private nextSpawn = 0
  /** a story beat played with the hands (`content/storyChores.ts`), not a paid job */
  private story: StoryChore | null = null
  private startedAt = 0

  constructor() {
    super(ChoreScene.KEY)
  }

  init(data: { gig?: string; returnTo?: LocationId; spawn?: string }) {
    const story = data.gig?.startsWith(STORY_CHORE_PREFIX) ? STORY_CHORES[data.gig.slice(STORY_CHORE_PREFIX.length)] ?? null : null
    this.story = story
    if (story) {
      // a story chore borrows a job's shape and nothing else: no wage, no job slot, no pay line
      const { trait: _trait, rel: _rel, ...base } = GIGS[0] as Gig
      void _trait
      void _rel
      this.gig = { ...base, id: `${STORY_CHORE_PREFIX}${story.id}`, where: story.where, labelHe: story.labelHe, at: { x: story.drop.x, y: story.drop.y, w: 0.1 } }
      this.shape = { ...story.shape }
    } else {
      this.gig = GIGS.find((g) => g.id === data.gig) ?? (GIGS[0] as Gig)
      this.shape = SHAPE[this.gig.id] ?? FALLBACK_SHAPE
    }
    this.returnTo = data.returnTo ?? (this.gig.where as LocationId)
    this.returnSpawn = data.spawn ?? story?.returnSpawn ?? 'start'
    this.pieces = []
    this.carried = null
    this.done = 0
    this.bag = 0
    this.finished = false
    this.lockUntil = 0
    this.nextSpawn = 0
  }

  preload() {
    const chapter = this.ctxSafe()?.engine.state.chapter ?? '1986'
    const def = SCENE[this.gig.where as Exclude<LocationId, 'prologue-1972'>]
    const keys = [artFor(def, chapter), ...Object.values(eraFor(chapter).player.pose)]
    if (this.shape.art) keys.push(this.shape.art)
    for (const key of keys) {
      if (!this.textures.exists(`art-${key}`)) this.load.image(`art-${key}`, artUrl(key))
    }
  }

  private ctxSafe(): LifeContext | null {
    return (this.registry.get(CONTEXT_KEY) as LifeContext | undefined) ?? null
  }

  create() {
    this.ctx = this.registry.get(CONTEXT_KEY) as LifeContext
    const chapter = this.ctx.engine.state.chapter
    const def = sceneIn(SCENE[this.gig.where as Exclude<LocationId, 'prologue-1972'>], chapter)
    this.band = def.band
    this.size = def.size

    this.cameras.main.setBackgroundColor(LIFE_PALETTE.night)
    const backdrop = this.add.image(0, 0, `art-${artFor(def, chapter)}`).setOrigin(0, 0).setDepth(-1000)
    this.W = backdrop.width
    this.H = backdrop.height

    const pose = eraFor(chapter).player.pose.side
    this.shadow = this.add.ellipse(0, 0, 30, 10, LIFE_PALETTE.ink, 0.26)
    this.player = this.add.image(this.W * 0.12, this.H * this.band.near, `art-${pose}`).setOrigin(0.5, 1)
    this.placePlayer(this.W * 0.12, this.H * this.band.near)

    this.drop = { x: this.gig.at.x, y: Math.min(this.band.near, this.gig.at.y) }
    this.layPieces()
    // a bag is emptied somewhere you can see: the crate the deposit is counted into
    if (this.shape.capacity) {
      const x = this.drop.x * this.W
      const y = this.drop.y * this.H
      this.add.ellipse(x, y, this.W * 0.05, this.H * 0.022, LIFE_PALETTE.red, 0.5).setDepth(y - 3)
    }

    this.cameras.main.setBounds(0, 0, this.W, this.H)
    frameCamera(this, this.cameras.main, this.W, this.H, 0.8)
    this.ctx.bus.emit('frame', { picture: this.cameras.main.height })
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08)
    this.cameras.main.setDeadzone(this.cameras.main.width * 0.34, this.cameras.main.height * 0.4)
    this.cameras.main.fadeIn(300, 0, 0, 0)
    this.scale.on('resize', this.onResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.onResize, this))

    this.endsAt = this.time.now + this.shape.seconds * 1000
    this.startedAt = this.time.now
    this.ctx.bus.emit('place', { id: this.gig.where as LocationId, title: this.gig.labelHe, ambience: 'day' })
    this.ctx.bus.emit('toast', { text: this.shape.hintHe, tone: 'plain' })
    this.pushHud()
  }

  private onResize() {
    frameCamera(this, this.cameras.main, this.W, this.H, 0.8)
    this.ctx.bus.emit('frame', { picture: this.cameras.main.height })
  }

  private fit(image: Phaser.GameObjects.Image, height: number) {
    const source = this.textures.get(image.texture.key).getSourceImage()
    image.setDisplaySize(height * ((source.width || 1) / (source.height || 1)), height)
  }

  private placePlayer(x: number, y: number) {
    this.player.setPosition(x, y)
    const t = Phaser.Math.Clamp((y / this.H - this.band.far) / (this.band.near - this.band.far), 0, 1)
    this.fit(this.player, Phaser.Math.Linear(this.size.far, this.size.near, t) * this.H)
    this.player.setDepth(y)
    this.shadow.setSize(this.player.displayWidth * 0.55, this.player.displayWidth * 0.18)
    this.shadow.setPosition(x, y + 1).setDepth(y - 1)
  }

  /** where a piece may lie: the walk band, away from the very edges */
  private spot(i: number, n: number) {
    const x = this.W * (0.1 + 0.78 * ((i + 0.5) / n + (((i * 37) % 11) / 110)))
    const y = this.H * (this.band.far + (this.band.near - this.band.far) * (((i * 53) % 7) / 7))
    return { x: Phaser.Math.Clamp(x, this.W * 0.08, this.W * 0.92), y }
  }

  private layPieces() {
    const n = this.shape.target
    for (let i = 0; i < n; i += 1) {
      const { x, y } = this.spot(i, n)
      if (this.shape.mode === 'sweep') {
        const patch = this.add.ellipse(x, y, this.W * 0.06, this.H * 0.02, LIFE_PALETTE.ink, 0.34).setDepth(y - 2)
        this.pieces.push({ image: patch, x, y, taken: false })
        continue
      }
      if (this.shape.mode === 'serve') continue // customers arrive over time
      const key = `art-${this.shape.art}`
      const image = this.textures.exists(key)
        ? this.add.image(x, y, key).setOrigin(0.5, 1)
        : (this.add.ellipse(x, y, this.W * 0.018, this.H * 0.03, LIFE_PALETTE.red, 0.9) as unknown as Phaser.GameObjects.Image)
      if (this.textures.exists(key)) this.fit(image as Phaser.GameObjects.Image, this.H * 0.05)
      image.setDepth(y)
      this.pieces.push({ image, x, y, taken: false })
    }
  }

  /** serve mode: somebody walks up and waits */
  private arrive(time: number) {
    if (this.shape.mode !== 'serve') return
    if (time < this.nextSpawn) return
    this.nextSpawn = time + Phaser.Math.Between(1400, 2600)
    const live = this.pieces.filter((p) => !p.taken).length
    if (live >= 3) return
    const i = this.pieces.length
    const { x, y } = this.spot(i, 9)
    const dot = this.add.ellipse(x, y, this.W * 0.02, this.H * 0.055, LIFE_PALETTE.red, 0.85).setDepth(y)
    this.pieces.push({ image: dot, x, y, taken: false, leavesAt: time + 5200 })
  }

  override update(time: number, delta: number) {
    if (this.finished) return
    this.ctx.input.beginFrame()
    const step = delta / 1000

    const speed = this.player.displayHeight * 1.7
    const nx = Phaser.Math.Clamp(this.player.x + this.ctx.input.x * speed * step, this.W * 0.05, this.W * 0.95)
    const ny = Phaser.Math.Clamp(
      this.player.y + this.ctx.input.y * speed * 0.55 * step,
      this.band.far * this.H,
      this.band.near * this.H,
    )
    if (Math.abs(this.ctx.input.x) > 0.05) this.player.setFlipX(this.ctx.input.x < 0)
    this.placePlayer(nx, ny)
    if (this.carried) {
      this.carried.setPosition(nx, ny - this.player.displayHeight * 0.55).setDepth(ny + 1)
    }

    // (V3 §10) a story chore can be stopped halfway, and what was carried counts: the
    // button with empty hands, after a breath, puts the work down. A `serve` shape uses the
    // button to serve, so it stops only when the clock does.
    if (this.story && this.shape.mode !== 'serve' && !this.carried && this.ctx.input.actionPressed && time > this.startedAt + 900) {
      this.finish()
      return
    }

    this.arrive(time)
    const reach = this.player.displayWidth * 0.9

    for (const piece of this.pieces) {
      if (piece.taken) continue
      const near = Phaser.Math.Distance.Between(nx, ny, piece.x, piece.y) < reach
      if (piece.leavesAt && time > piece.leavesAt) {
        piece.taken = true
        piece.image.destroy()
        continue
      }
      if (!near) continue
      if (this.shape.mode === 'collect' && this.shape.capacity) {
        if (this.bag >= this.shape.capacity) continue // the bag is full: cash in first
        piece.taken = true
        piece.image.destroy()
        this.bag += 1
        this.ctx.bus.emit('sound', { kind: 'step', surface: 'floor' })
      } else if (this.shape.mode === 'collect' || this.shape.mode === 'sweep') {
        piece.taken = true
        piece.image.destroy()
        this.score()
      } else if (this.shape.mode === 'serve') {
        if (this.ctx.input.actionPressed && time > this.lockUntil) {
          this.lockUntil = time + 200
          piece.taken = true
          piece.image.destroy()
          this.score()
        }
      } else if (this.shape.mode === 'carry' && !this.carried) {
        piece.taken = true
        const image = piece.image as Phaser.GameObjects.Image
        this.carried = image
        this.ctx.bus.emit('sound', { kind: 'step', surface: 'floor' })
      }
    }

    if (this.shape.mode === 'carry' && this.carried) {
      const dx = Math.abs(nx / this.W - this.drop.x)
      const dy = Math.abs(ny / this.H - this.drop.y)
      if (dx < 0.07 && dy < 0.09) {
        this.carried.destroy()
        this.carried = null
        this.score()
      }
    }

    if (this.shape.capacity && this.bag > 0) {
      const dx = Math.abs(nx / this.W - this.drop.x)
      const dy = Math.abs(ny / this.H - this.drop.y)
      if (dx < 0.07 && dy < 0.09) {
        this.done += this.bag
        this.bag = 0
        this.ctx.bus.emit('sound', { kind: 'door' })
      }
    }

    this.pushHud()
    if (time > this.endsAt || this.done >= this.shape.target) this.finish()
  }

  private score() {
    this.done += 1
    this.ctx.bus.emit('sound', { kind: 'step', surface: 'floor' })
  }

  private pushHud() {
    const left = Math.max(0, Math.ceil((this.endsAt - this.time.now) / 1000))
    this.ctx.bus.emit('hud', {
      clock: this.shape.capacity
        ? `${this.done} / ${this.shape.target} · ${this.bag}/${this.shape.capacity}`
        : `${this.done} / ${this.shape.target}`,
      date: String(this.ctx.engine.state.year),
      agorot: left,
      showMoney: false,
      energy: 100,
      showEnergy: false,
      place: this.gig.labelHe,
      objective: null,
      year: this.ctx.engine.state.year,
      scene: this.gig.where as LocationId,
      hint: this.shape.hintHe,
      waitingHe: null,
    })
  }

  /**
   * מה מקבלים — half the wage for the hour, half for the work, a fifth for finishing.
   *
   * A gig that pays nothing when it goes badly is a gig a player does once. A gig that
   * pays the same either way is not a game. This is the middle: turning up is worth
   * something because the hour was spent, and doing it well is worth half as much again.
   */
  private finish() {
    if (this.finished) return
    this.finished = true
    const chapter = this.ctx.engine.state.chapter
    const ratio = Phaser.Math.Clamp(this.done / this.shape.target, 0, 1)
    const perfect = this.done >= this.shape.target

    if (this.story) {
      const events = this.story.finish(this.done, this.shape.target)
      if (events.length) this.ctx.engine.dispatch(...events)
      void this.ctx.engine.save()
      this.ctx.bus.emit('toast', { text: this.story.toastHe(this.done, this.shape.target), tone: perfect ? 'red' : 'plain' })
      this.leave()
      return
    }

    /**
     * פעילות — from its first chapter a job that became an activity is settled by the
     * activity (`lib/life/activities.ts`): its range of B, its slot, its once-a-chapter
     * rewards, and a person in the room who says how it went when the room is rebuilt.
     * Before that chapter, and for every job that is only a job, the lines below run as
     * they always did.
     */
    const act = activityForGig(this.gig.id, chapter)
    if (act) {
      const state = this.ctx.engine.state
      // Shachor's order is part of the job: the right one is worth a fifth more on the way out
      const order = state.flags[CHORE_ORDER_FLAG]
      const share = Math.min(1, (perfect ? 1 : ratio) + (act.id === 'ussishkin-help' && order === 'right' ? 0.2 : 0))
      const settled = settleActivity(state, act.id, { completed: true, score: share })
      this.ctx.engine.dispatch(...settled.events)
      const after = afterConversation(act.id)
      if (after) this.ctx.engine.dispatch({ t: 'flag.set', flag: AFTER_FLAG, value: after })
      if (this.gig.trait) {
        this.ctx.engine.dispatch({ t: 'personality.shifted', key: this.gig.trait.key, delta: this.gig.trait.delta })
      }
      void this.ctx.engine.save()
      const shekelsPaid = Math.round(settled.paid / 100)
      this.ctx.bus.emit('toast', {
        text: shekelsPaid > 0 ? `${this.done} מתוך ${this.shape.target}. ${shekelsPaid} ₪.` : `${this.done} מתוך ${this.shape.target}.`,
        tone: settled.tier === 'high' ? 'red' : 'plain',
      })
      this.leave()
      return
    }

    const base = gigPay(this.gig, chapter)
    const paid = Math.max(1, Math.round(base * (0.5 + 0.5 * ratio) * (perfect ? 1.2 : 1)))

    this.ctx.engine.dispatch(
      { t: 'flag.raised', flag: gigFlag(this.gig) },
      // one paid job per chapter (Maor, 6.9.2026) — the street says so in `gigs.ts`
      { t: 'flag.raised', flag: workDoneFlag(chapter) },
      { t: 'clock.advanced', minutes: this.gig.minutes },
      { t: 'energy.changed', delta: -this.gig.energy },
      { t: 'money.changed', agorot: shekels(paid), why: this.gig.labelHe },
    )
    if (this.gig.trait) {
      this.ctx.engine.dispatch({ t: 'personality.shifted', key: this.gig.trait.key, delta: this.gig.trait.delta })
    }
    void this.ctx.engine.save()

    this.ctx.bus.emit('toast', {
      text: perfect ? `${this.gig.doneHe} ${paid} ₪.` : `${this.done} מתוך ${this.shape.target}. ${paid} ₪.`,
      tone: perfect ? 'red' : 'plain',
    })
    this.leave()
  }

  /** back to the room the job was offered in, through the same fade every door plays */
  private leave() {
    this.cameras.main.fadeOut(380, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(WorldScene.KEY, { mapId: this.returnTo, spawn: this.returnSpawn })
    })
  }
}

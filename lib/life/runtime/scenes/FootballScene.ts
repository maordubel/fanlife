import Phaser from 'phaser'

import { longDateHe } from '../../cutscenes'
import type { LocationId } from '../../types'
import { artUrl } from '../art'
import { frameCamera } from '../camera'
import { CONTEXT_KEY, type LifeContext } from '../context'
import { LIFE_PALETTE } from '../palette'

import { heightOf } from '../../world/heights'

import { WorldScene } from './WorldScene'

/**
 * שניים על שניים — the neighbourhood game, played on the painted pitch.
 *
 * Brief §19 asks for one small football minigame that proves the life simulation can hold
 * real play, and §13 of the polish pass asks that it feel like children treating two
 * stones as a cup final. So: the same painting the pitch location uses, the four boys of
 * the alley — the same photographed bodies that stand in the world — and one button.
 *
 *  · **One button, three meanings.** Near the ball without it, a lunge that takes it. With
 *    it near the goal, a shot. With it anywhere else, a pass. A second button on a
 *    touchscreen is a button nobody presses.
 *  · **Possession is proximity.** Whoever is nearest inside a small radius carries the
 *    ball in front of them. No dribble state machine to fight at this scale.
 *  · **The camera follows the BALL.** On a portrait phone the pitch is wider than the
 *    glass, and a camera locked to the child loses the ball exactly when it matters.
 *
 * Two a side rather than three: the painting already has a dozen children in it, and six
 * more sprites on top turned a game into a crowd.
 */

const TO_WIN = 3
const LENGTH_MS = 100000

/**
 * פוגי במגרש הוא פוגי ברחוב (21.9.2026). The two-a-side put `kid` on the pitch — the
 * cartoon child of the first concept board, big head and all — while the street outside
 * walked the photographed boy of the 5.9 production (`pogi`). Maor: *"אתה מציג את פוגי
 * כילד כציור — זו טעות."* It is the same body in both places now, and every child is
 * drawn at his own height (`heights.ts`) rather than one height for four boys.
 */
const ME = 'pogi'

type Kid = {
  image: Phaser.GameObjects.Image
  shadow: Phaser.GameObjects.Ellipse
  team: 'red' | 'other'
  human: boolean
  lane: number
  lastX: number
  lastY: number
}

export class FootballScene extends Phaser.Scene {
  static readonly KEY = 'life-football'

  private ctx!: LifeContext
  private returnTo: LocationId = 'pitch'
  private returnSpawn = 'fromStreet'

  private W = 1
  private H = 1
  private band = { far: 0.62, near: 0.95 }

  private ball!: Phaser.GameObjects.Image
  private ballShadow!: Phaser.GameObjects.Ellipse
  private bvx = 0
  private bvy = 0

  private kids: Kid[] = []
  private me!: Kid
  private score = { red: 0, other: 0 }
  private endsAt = 0
  private finished = false
  private lockUntil = 0

  constructor() {
    super(FootballScene.KEY)
  }

  init(data: { returnTo?: LocationId; spawn?: string }) {
    this.returnTo = data.returnTo ?? 'pitch'
    this.returnSpawn = data.spawn ?? 'fromStreet'
    this.kids = []
    this.score = { red: 0, other: 0 }
    this.finished = false
    this.lockUntil = 0
    this.endsAt = 0
    this.bvx = 0
    this.bvy = 0
  }

  preload() {
    for (const key of ['pitch', ME, 'efi', 'ofir', 'amit', 'propFootball']) {
      if (!this.textures.exists(`art-${key}`)) this.load.image(`art-${key}`, artUrl(key))
    }
  }

  create() {
    this.ctx = this.registry.get(CONTEXT_KEY) as LifeContext
    this.cameras.main.setBackgroundColor(LIFE_PALETTE.night)
    const backdrop = this.add.image(0, 0, 'art-pitch').setOrigin(0, 0).setDepth(-1000)
    this.W = backdrop.width
    this.H = backdrop.height

    this.ballShadow = this.add.ellipse(0, 0, 18, 7, LIFE_PALETTE.ink, 0.3)
    this.ball = this.add.image(this.W * 0.5, this.H * 0.82, 'art-propFootball').setOrigin(0.5, 1)
    this.fit(this.ball, this.H * 0.055)

    this.me = this.spawn(ME, 0.26, 0.86, 'red', true, 1)
    this.spawn('efi', 0.18, 0.72, 'red', false, 0)
    this.spawn('ofir', 0.72, 0.74, 'other', false, 0)
    this.spawn('amit', 0.8, 0.9, 'other', false, 1)

    this.cameras.main.setBounds(0, 0, this.W, this.H)
    frameCamera(this, this.cameras.main, this.W, this.H, 0.8)
    this.ctx.bus.emit('frame', { picture: this.cameras.main.height })
    this.cameras.main.startFollow(this.ball, true, 0.07, 0.07)
    this.cameras.main.setDeadzone(this.cameras.main.width * 0.3, this.cameras.main.height * 0.35)
    this.cameras.main.fadeIn(320, 0, 0, 0)
    this.scale.on('resize', this.onResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.onResize, this))

    this.endsAt = this.time.now + LENGTH_MS
    this.ctx.bus.emit('place', { id: 'pitch', title: 'שניים על שניים', ambience: 'day' })
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

  private spawn(figure: string, fx: number, fy: number, team: 'red' | 'other', human: boolean, lane: number): Kid {
    const x = fx * this.W
    const y = fy * this.H
    const shadow = this.add.ellipse(x, y, 30, 10, LIFE_PALETTE.ink, 0.26)
    const image = this.add.image(x, y, `art-${figure}`).setOrigin(0.5, 1)
    const kid: Kid = { image, shadow, team, human, lane, lastX: x, lastY: y }
    this.kids.push(kid)
    this.scaleKid(kid)
    return kid
  }

  private scaleKid(kid: Kid) {
    const t = Phaser.Math.Clamp((kid.image.y / this.H - this.band.far) / (this.band.near - this.band.far), 0, 1)
    const tall = heightOf(kid.image.texture.key.replace(/^art-/, '')) / heightOf(ME)
    this.fit(kid.image, Phaser.Math.Linear(0.2, 0.3, t) * tall * this.H)
    kid.shadow.setSize(kid.image.displayWidth * 0.6, kid.image.displayWidth * 0.2)
    kid.shadow.setPosition(kid.image.x, kid.image.y + 1)
    kid.shadow.setDepth(kid.image.y - 1)
    kid.image.setDepth(kid.image.y)
  }

  override update(time: number, delta: number) {
    if (this.finished) return
    this.ctx.input.beginFrame()
    const step = delta / 1000
    const holder = this.holder()

    // --- the child -------------------------------------------------------------------
    const speed = this.me.image.displayHeight * 1.9
    this.moveKid(this.me, this.ctx.input.x * speed, this.ctx.input.y * speed * 0.6, step)

    if (this.ctx.input.actionPressed && time > this.lockUntil) {
      this.lockUntil = time + 220
      if (holder === this.me) this.kick()
      else this.lunge()
    }

    // --- the other three ---------------------------------------------------------------
    for (const kid of this.kids) {
      if (kid.human) continue
      this.think(kid, holder, step)
    }

    // --- the ball ---------------------------------------------------------------------
    if (holder) {
      const dx = holder.image.x - holder.lastX
      const dy = holder.image.y - holder.lastY
      const len = Math.hypot(dx, dy)
      const ux = len > 0.01 ? dx / len : holder.team === 'red' ? 1 : -1
      const uy = len > 0.01 ? dy / len : 0
      const tx = holder.image.x + ux * this.W * 0.03
      const ty = holder.image.y + uy * this.H * 0.02
      this.bvx = (tx - this.ball.x) * 7
      this.bvy = (ty - this.ball.y) * 7
    } else {
      this.bvx *= 0.965
      this.bvy *= 0.965
    }
    this.ball.x = Phaser.Math.Clamp(this.ball.x + this.bvx * step, this.W * 0.03, this.W * 0.97)
    this.ball.y = Phaser.Math.Clamp(this.ball.y + this.bvy * step, this.band.far * this.H, this.band.near * this.H)
    this.ball.setDepth(this.ball.y + 2)
    this.ballShadow.setPosition(this.ball.x, this.ball.y + 2)
    this.ballShadow.setDepth(this.ball.y + 1)

    for (const kid of this.kids) {
      kid.lastX = kid.image.x
      kid.lastY = kid.image.y
    }

    this.checkGoal()
    this.pushHud()
    if (time > this.endsAt) this.finish()
  }

  /**
   * The keyboard is read by the shell (`app/life/LifeStage.tsx`) and written into
   * `ctx.input`, because a scene restart forgets which keys are held and the document
   * does not. The scene only ever reads.
   */

  private moveKid(kid: Kid, vx: number, vy: number, step: number) {
    kid.image.x = Phaser.Math.Clamp(kid.image.x + vx * step, this.W * 0.04, this.W * 0.96)
    kid.image.y = Phaser.Math.Clamp(kid.image.y + vy * step, this.band.far * this.H, this.band.near * this.H)
    if (Math.abs(vx) > 1) kid.image.setFlipX(vx < 0)
    this.scaleKid(kid)
  }

  private holder(): Kid | null {
    let best: Kid | null = null
    let bestDistance = this.W * 0.035
    for (const kid of this.kids) {
      const d = Phaser.Math.Distance.Between(kid.image.x, kid.image.y, this.ball.x, this.ball.y)
      if (d < bestDistance) {
        bestDistance = d
        best = kid
      }
    }
    return best
  }

  private kick() {
    const toGoal = this.W * 0.97 - this.me.image.x
    if (toGoal < this.W * 0.3) {
      const targetY = this.H * Phaser.Math.FloatBetween(0.7, 0.9)
      const angle = Phaser.Math.Angle.Between(this.ball.x, this.ball.y, this.W, targetY)
      this.bvx = Math.cos(angle) * this.W * 0.85
      this.bvy = Math.sin(angle) * this.H * 0.4
      return
    }
    const mate = this.kids.find((kid) => kid.team === 'red' && !kid.human)
    const tx = mate ? mate.image.x : this.me.image.x + this.W * 0.2
    const ty = mate ? mate.image.y : this.me.image.y
    const angle = Phaser.Math.Angle.Between(this.ball.x, this.ball.y, tx, ty)
    this.bvx = Math.cos(angle) * this.W * 0.5
    this.bvy = Math.sin(angle) * this.H * 0.3
  }

  private lunge() {
    const d = Phaser.Math.Distance.Between(this.me.image.x, this.me.image.y, this.ball.x, this.ball.y)
    if (d > this.W * 0.12) return
    const angle = Phaser.Math.Angle.Between(this.me.image.x, this.me.image.y, this.ball.x, this.ball.y)
    this.moveKid(this.me, Math.cos(angle) * this.W * 0.5, Math.sin(angle) * this.H * 0.25, 0.1)
  }

  private think(kid: Kid, holder: Kid | null, step: number) {
    const chase = holder === null || holder.team !== kid.team
    const nearest =
      chase &&
      this.kids
        .filter((other) => other.team === kid.team)
        .sort(
          (a, b) =>
            Phaser.Math.Distance.Between(a.image.x, a.image.y, this.ball.x, this.ball.y) -
            Phaser.Math.Distance.Between(b.image.x, b.image.y, this.ball.x, this.ball.y),
        )[0] === kid

    let tx: number
    let ty: number
    if (chase && nearest) {
      tx = this.ball.x
      ty = this.ball.y
    } else if (holder === kid) {
      tx = kid.team === 'red' ? this.W * 0.96 : this.W * 0.04
      ty = this.H * 0.82
    } else {
      const forward = holder?.team === kid.team ? (kid.team === 'red' ? this.W * 0.2 : -this.W * 0.2) : 0
      tx = Phaser.Math.Clamp(this.ball.x + forward, this.W * 0.08, this.W * 0.92)
      ty = this.H * (kid.lane === 0 ? 0.72 : 0.9)
    }

    const angle = Phaser.Math.Angle.Between(kid.image.x, kid.image.y, tx, ty)
    const d = Phaser.Math.Distance.Between(kid.image.x, kid.image.y, tx, ty)
    const speed = d < this.W * 0.01 ? 0 : kid.image.displayHeight * (kid.team === 'other' ? 1.55 : 1.62)
    this.moveKid(kid, Math.cos(angle) * speed, Math.sin(angle) * speed * 0.6, step)

    if (holder === kid && Phaser.Math.Between(0, 100) > 96) {
      const goalX = kid.team === 'red' ? this.W : 0
      const angleToGoal = Phaser.Math.Angle.Between(this.ball.x, this.ball.y, goalX, this.H * 0.82)
      this.bvx = Math.cos(angleToGoal) * this.W * 0.7
      this.bvy = Math.sin(angleToGoal) * this.H * 0.3
    }
  }

  private checkGoal() {
    if (this.ball.x > this.W * 0.955) {
      this.score.red += 1
      this.restart()
    } else if (this.ball.x < this.W * 0.045) {
      this.score.other += 1
      this.restart()
    }
  }

  private restart() {
    this.ctx.bus.emit('toast', {
      text: `${this.score.red} — ${this.score.other}`,
      tone: this.score.red > this.score.other ? 'red' : 'plain',
    })
    this.cameras.main.shake(200, 0.005)
    this.ball.setPosition(this.W * 0.5, this.H * 0.82)
    this.bvx = 0
    this.bvy = 0
    this.me.image.setPosition(this.W * 0.3, this.H * 0.86)
    if (this.score.red >= TO_WIN || this.score.other >= TO_WIN) this.finish()
  }

  private pushHud() {
    const left = Math.max(0, Math.ceil((this.endsAt - this.time.now) / 1000))
    this.ctx.bus.emit('hud', {
      clock: `${this.score.red} — ${this.score.other}`,
      date: longDateHe(this.ctx.anchor.match?.playedOn) ?? String(this.ctx.engine.state.year),
      agorot: left,
      showMoney: false,
      energy: 100,
      showEnergy: false,
      place: 'שניים על שניים',
      objective: null,
      year: this.ctx.engine.state.year,
      scene: 'pitch',
      hint: 'שניים על שניים. תזוז, תמסור, תבעט.',
      waitingHe: null,
    })
  }

  private finish() {
    if (this.finished) return
    this.finished = true
    const won = this.score.red > this.score.other
    this.ctx.engine.dispatch(
      { t: 'clock.advanced', minutes: 25 },
      { t: 'energy.changed', delta: -16 },
      { t: 'flag.raised', flag: 'played:football' },
      { t: 'trait.shifted', trait: 'footballAffinity', delta: won ? 8 : 5 },
      { t: 'bond.shifted', who: 'ofir', delta: won ? 6 : 3 },
    )
    if (won) this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'won:football' })
    void this.ctx.engine.save()

    this.ctx.bus.emit('toast', { text: won ? 'ניצחתם.' : 'הפסדתם. יהיה מחר.', tone: won ? 'red' : 'plain' })
    this.cameras.main.fadeOut(420, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(WorldScene.KEY, { mapId: this.returnTo, spawn: this.returnSpawn })
    })
  }
}

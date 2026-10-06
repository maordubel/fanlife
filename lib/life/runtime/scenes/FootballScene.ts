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

const TO_WIN = 5
const LENGTH_MS = 120000
/** the goal mouth on the ground, as fractions of the painting's height */
const MOUTH = { top: 0.72, bottom: 0.9 }
/** the wall behind each goal, as a fraction of the painting's width */
const GOAL_X = 0.05
/** below this ball height a shot is still a shot; above it, it sails over */
const BAR = 0.075
const CHARGE_MS = 650
const TACKLE_COOLDOWN = 650

/**
 * פוגי במגרש הוא פוגי ברחוב (21.9.2026). The two-a-side put `kid` on the pitch — the
 * cartoon child of the first concept board, big head and all — while the street outside
 * walked the photographed boy of the 5.9 production (`pogi`). Maor: *"אתה מציג את פוגי
 * כילד כציור — זו טעות."* It is the same body in both places now, and every child is
 * drawn at his own height (`heights.ts`) rather than one height for four boys.
 *
 * **30.9.2026 — tightened.** Maor: *"זה סתם לזוז כרגע. להדק מאוד."* What was missing was
 * everything that makes moving into playing:
 *
 *  · **Real goals.** Posts, a bar and a net at both ends, a mouth you have to hit. A ball
 *    outside the mouth rebounds off the wall, over the bar sails high, and a post is a post.
 *  · **A ball with height.** It has a shadow on the ground and a body in the air; a
 *    over-hit shot skies it. Skill is timing the charge, not mashing.
 *  · **One button, held.** Tap to pass or tackle; hold to wind up a shot — the meter is drawn
 *    on the boy, sweet spot near the top, and past it the ball flies high.
 *  · **Four roles.** Pugi and Ofir go forward; Efi and Amit guard their own goals and save
 *    what is on target. Nobody just chases the ball.
 *  · **Goals are moments.** Freeze, roar, the camera pushes in, paper and dust burst from
 *    the net, the scorer jumps, and the side that conceded kicks off.
 *  · **Sudden death.** Level at the whistle and the next goal wins — a street game does not
 *    end in a draw.
 */
const ME = 'pogi'

type Role = 'forward' | 'keeper'

type Kid = {
  image: Phaser.GameObjects.Image
  shadow: Phaser.GameObjects.Ellipse
  team: 'red' | 'other'
  human: boolean
  role: Role
  /** the feet — a number the walk bob never touches (rule 55) */
  x: number
  gy: number
  lastX: number
  lastGy: number
  bob: number
  noTouchUntil: number
  tackleUntil: number
  dashUntil: number
  idleShotAt: number
  hop: number
}

export class FootballScene extends Phaser.Scene {
  static readonly KEY = 'life-football'

  private ctx!: LifeContext
  private returnTo: LocationId = 'pitch'
  private returnSpawn = 'fromStreet'

  private W = 1
  private H = 1
  private band = { far: 0.62, near: 0.95 }
  private baseZoom = 1

  private ball!: Phaser.GameObjects.Image
  private ballShadow!: Phaser.GameObjects.Ellipse
  private ballSize = 1
  private bx = 0
  private by = 0
  private bz = 0
  private bvx = 0
  private bvy = 0
  private bvz = 0
  private trail: Phaser.GameObjects.Ellipse[] = []
  private meter!: Phaser.GameObjects.Graphics

  private kids: Kid[] = []
  private me!: Kid
  private score = { red: 0, other: 0 }
  private endsAt = 0
  private finished = false
  private lockUntil = 0
  private chargeFrom = 0
  private charging = false
  private freezeUntil = 0
  private goalPending: (() => void) | null = null
  private overtime = false
  private lastCall = 0
  private lastToucher: Kid | null = null
  private started = false

  constructor() {
    super(FootballScene.KEY)
  }

  init(data: { returnTo?: LocationId; spawn?: string }) {
    this.returnTo = data.returnTo ?? 'pitch'
    this.returnSpawn = data.spawn ?? 'fromStreet'
    this.kids = []
    this.trail = []
    this.score = { red: 0, other: 0 }
    this.finished = false
    this.lockUntil = 0
    this.endsAt = 0
    this.bvx = this.bvy = this.bvz = this.bz = 0
    this.charging = false
    this.chargeFrom = 0
    this.freezeUntil = 0
    this.goalPending = null
    this.overtime = false
    this.lastCall = 0
    this.lastToucher = null
    this.started = false
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

    this.drawGoals()

    this.ballShadow = this.add.ellipse(0, 0, 18, 7, LIFE_PALETTE.ink, 0.3)
    this.ball = this.add.image(this.W * 0.5, this.H * 0.82, 'art-propFootball').setOrigin(0.5, 1)
    this.fit(this.ball, this.H * 0.055)
    this.ballSize = this.ball.displayHeight
    for (let i = 0; i < 5; i += 1) {
      this.trail.push(this.add.ellipse(0, 0, 8, 8, LIFE_PALETTE.sheet, 0).setDepth(3000))
    }
    this.meter = this.add.graphics().setDepth(5000)

    this.me = this.spawn(ME, 0.3, 0.86, 'red', true, 'forward')
    this.spawn('efi', 0.12, 0.81, 'red', false, 'keeper')
    this.spawn('ofir', 0.62, 0.76, 'other', false, 'forward')
    this.spawn('amit', 0.88, 0.81, 'other', false, 'keeper')
    this.kickoff('red')

    this.cameras.main.setBounds(0, 0, this.W, this.H)
    frameCamera(this, this.cameras.main, this.W, this.H, 0.8)
    this.baseZoom = this.cameras.main.zoom
    this.ctx.bus.emit('frame', { picture: this.cameras.main.height })
    this.cameras.main.startFollow(this.ball, true, 0.08, 0.08)
    this.cameras.main.setDeadzone(this.cameras.main.width * 0.24, this.cameras.main.height * 0.3)
    this.cameras.main.fadeIn(320, 0, 0, 0)
    this.scale.on('resize', this.onResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.onResize, this))

    this.ctx.bus.emit('place', { id: 'pitch', title: 'שניים על שניים', ambience: 'day' })
    this.ctx.bus.emit('toast', { text: 'עד חמישה. מי שמנצח — שלו הרחוב.', tone: 'plain' })
    // the kickoff whistle waits a beat, so the child has read what the game is
    this.freezeUntil = this.time.now + 1500
    this.time.delayedCall(1500, () => {
      this.started = true
      this.endsAt = this.time.now + LENGTH_MS
      this.ctx.bus.emit('sound', { kind: 'whistle', blasts: 1 })
    })
    this.pushHud()
  }

  private onResize() {
    frameCamera(this, this.cameras.main, this.W, this.H, 0.8)
    this.baseZoom = this.cameras.main.zoom
    this.ctx.bus.emit('frame', { picture: this.cameras.main.height })
  }

  private fit(image: Phaser.GameObjects.Image, height: number) {
    const source = this.textures.get(image.texture.key).getSourceImage()
    image.setDisplaySize(height * ((source.width || 1) / (source.height || 1)), height)
  }

  // ---- the goals ---------------------------------------------------------------------

  /** posts, a bar and a net at each end; chalk on the ground says where the mouth is */
  private drawGoals() {
    const g = this.add.graphics().setDepth(this.H * MOUTH.top - 2)
    const post = this.H * 0.095
    for (const side of [-1, 1] as const) {
      const gx = side < 0 ? this.W * GOAL_X : this.W * (1 - GOAL_X)
      const back = -side * this.W * 0.022
      const top = this.H * MOUTH.top
      const bot = this.H * MOUTH.bottom
      // the net: a slab behind the line, hatched
      g.fillStyle(LIFE_PALETTE.sheet, 0.13)
      g.fillPoints(
        [
          { x: gx, y: top - post },
          { x: gx + back, y: top - post * 0.86 },
          { x: gx + back, y: bot - post * 0.86 },
          { x: gx, y: bot - post },
        ],
        true,
      )
      g.lineStyle(1, LIFE_PALETTE.sheet, 0.32)
      for (let i = 1; i < 6; i += 1) {
        const y = Phaser.Math.Linear(top, bot, i / 6)
        g.lineBetween(gx, y - post, gx + back, y - post * 0.86)
        g.lineBetween(gx, y, gx + back, y - post * 0.86 + (bot - top) * 0)
      }
      // the chalk mouth on the ground
      g.lineStyle(3, LIFE_PALETTE.sheet, 0.55)
      g.lineBetween(gx, top, gx, bot)
      // bar and posts
      g.lineStyle(6, LIFE_PALETTE.sheet, 1)
      g.lineBetween(gx, top - post, gx, bot - post)
      g.lineBetween(gx, top, gx, top - post)
      g.lineBetween(gx, bot, gx, bot - post)
      g.lineStyle(2, LIFE_PALETTE.ink, 0.6)
      g.lineBetween(gx + 3, top - post, gx + 3, bot - post)
    }
  }

  private spawn(figure: string, fx: number, fy: number, team: 'red' | 'other', human: boolean, role: Role): Kid {
    const x = fx * this.W
    const gy = fy * this.H
    const shadow = this.add.ellipse(x, gy, 30, 10, LIFE_PALETTE.ink, 0.26)
    const image = this.add.image(x, gy, `art-${figure}`).setOrigin(0.5, 1)
    const kid: Kid = {
      image, shadow, team, human, role, x, gy, lastX: x, lastGy: gy, bob: 0,
      noTouchUntil: 0, tackleUntil: 0, dashUntil: 0, idleShotAt: 0, hop: 0,
    }
    this.kids.push(kid)
    this.render(kid)
    return kid
  }

  private render(kid: Kid) {
    const t = Phaser.Math.Clamp((kid.gy / this.H - this.band.far) / (this.band.near - this.band.far), 0, 1)
    const tall = heightOf(kid.image.texture.key.replace(/^art-/, '')) / heightOf(ME)
    this.fit(kid.image, Phaser.Math.Linear(0.2, 0.3, t) * tall * this.H)
    kid.image.setPosition(kid.x, kid.gy - kid.bob - kid.hop)
    kid.shadow.setSize(kid.image.displayWidth * 0.6, kid.image.displayWidth * 0.2)
    kid.shadow.setPosition(kid.x, kid.gy + 1)
    kid.shadow.setDepth(kid.gy - 1)
    kid.image.setDepth(kid.gy)
  }

  private kickoff(team: 'red' | 'other') {
    this.bx = this.W * 0.5
    this.by = this.H * 0.82
    this.bz = 0
    this.bvx = this.bvy = this.bvz = 0
    const place = (kid: Kid, fx: number, fy: number) => {
      kid.x = fx * this.W
      kid.gy = fy * this.H
      kid.lastX = kid.x
      kid.lastGy = kid.gy
      kid.noTouchUntil = 0
      this.render(kid)
    }
    for (const kid of this.kids) {
      if (kid.role === 'keeper') place(kid, kid.team === 'red' ? 0.12 : 0.88, 0.81)
      else place(kid, kid.team === 'red' ? (team === 'red' ? 0.46 : 0.3) : team === 'other' ? 0.54 : 0.68, kid.human ? 0.86 : 0.77)
    }
    this.lastToucher = null
    this.charging = false
  }

  // ---- the frame ---------------------------------------------------------------------

  override update(time: number, delta: number) {
    if (this.finished) return
    this.ctx.input.beginFrame()
    const step = Math.min(delta, 50) / 1000

    if (time < this.freezeUntil) {
      this.drawMeter(time)
      this.placeBall()
      return
    }
    if (this.goalPending) {
      const done = this.goalPending
      this.goalPending = null
      done()
      return
    }

    const holder = this.holder(time)

    // ---- the child ------------------------------------------------------------------
    const dashing = time < this.me.dashUntil
    const speed = this.me.image.displayHeight * (dashing ? 3.4 : this.charging ? 1.05 : 2.05)
    this.moveKid(this.me, this.ctx.input.x * speed, this.ctx.input.y * speed * 0.6, step)

    if (this.ctx.input.actionPressed && time > this.lockUntil) {
      if (holder === this.me) {
        this.charging = true
        this.chargeFrom = time
      } else {
        this.lockUntil = time + 240
        this.tackle(this.me, time)
      }
    }
    if (this.charging) {
      if (holder !== this.me) this.charging = false
      else {
        const p = Phaser.Math.Clamp((time - this.chargeFrom) / CHARGE_MS, 0, 1.15)
        if (!this.ctx.input.action || p >= 1.1) this.release(p, time)
      }
    }

    // ---- the other three -------------------------------------------------------------
    for (const kid of this.kids) if (!kid.human) this.think(kid, holder, step, time)

    // ---- the ball --------------------------------------------------------------------
    this.stepBall(holder, step)
    this.saves(holder, time)
    this.checkGoal(time)

    for (const kid of this.kids) {
      const moved = Math.hypot(kid.x - kid.lastX, kid.gy - kid.lastGy)
      kid.bob = moved > 0.4 ? Math.abs(Math.sin(time / 70 + kid.x * 0.01)) * kid.image.displayHeight * 0.05 : 0
      kid.hop = Math.max(0, kid.hop - step * 260)
      kid.lastX = kid.x
      kid.lastGy = kid.gy
      this.render(kid)
    }
    this.drawMeter(time)
    this.pushHud()

    if (this.started && time > this.endsAt) {
      if (this.score.red === this.score.other) {
        if (!this.overtime) {
          this.overtime = true
          this.ctx.bus.emit('toast', { text: 'שוויון. הגול הבא מנצח.', tone: 'red' })
          this.ctx.bus.emit('sound', { kind: 'roar' })
        }
      } else this.finish()
    }
  }

  private placeBall() {
    const lift = this.bz
    this.ball.setPosition(this.bx, this.by - lift)
    this.ball.setDepth(this.by + 2)
    this.ballShadow.setPosition(this.bx, this.by + 2)
    this.ballShadow.setSize(18 * (1 - Math.min(0.5, lift / (this.H * 0.4))), 7)
    this.ballShadow.setDepth(this.by + 1)
  }

  private stepBall(holder: Kid | null, step: number) {
    if (holder && this.bz < this.H * 0.02) {
      const dx = holder.x - holder.lastX
      const dy = holder.gy - holder.lastGy
      const len = Math.hypot(dx, dy)
      const ux = len > 0.01 ? dx / len : holder.team === 'red' ? 1 : -1
      const uy = len > 0.01 ? dy / len : 0
      const tx = holder.x + ux * this.W * 0.028
      const ty = holder.gy + uy * this.H * 0.018
      this.bvx = (tx - this.bx) * 9
      this.bvy = (ty - this.by) * 9
      this.bvz = 0
      this.bz = 0
      this.lastToucher = holder
    } else {
      // rolling on the ground bleeds speed quickly; in the air only a little
      const drag = this.bz > 0 ? Math.pow(0.7, step) : Math.pow(0.18, step)
      this.bvx *= drag
      this.bvy *= drag
      if (this.bz > 0 || this.bvz !== 0) {
        this.bvz -= this.H * 3.4 * step
        this.bz += this.bvz * step
        if (this.bz <= 0) {
          this.bz = 0
          if (Math.abs(this.bvz) > this.H * 0.25) {
            this.bvz = -this.bvz * 0.45
            this.ctx.bus.emit('sound', { kind: 'step', surface: 'street' })
          } else this.bvz = 0
        }
      }
    }
    this.bx += this.bvx * step
    this.by += this.bvy * step
    const far = this.band.far * this.H
    const near = this.band.near * this.H
    if (this.by < far) {
      this.by = far
      this.bvy = Math.abs(this.bvy) * 0.5
    } else if (this.by > near) {
      this.by = near
      this.bvy = -Math.abs(this.bvy) * 0.5
    }
    this.placeBall()
    // a fast ball leaves a trail, so a shot is seen
    const speed = Math.hypot(this.bvx, this.bvy)
    this.trail.forEach((dot, i) => {
      const k = (i + 1) / this.trail.length
      dot.setPosition(this.bx - this.bvx * 0.018 * (i + 1), this.by - this.bz - this.bvy * 0.018 * (i + 1) - this.ballSize * 0.5)
      dot.setSize(this.ballSize * 0.5 * (1 - k * 0.6), this.ballSize * 0.5 * (1 - k * 0.6))
      dot.setAlpha(speed > this.W * 0.5 ? 0.45 * (1 - k) : 0)
    })
  }

  private holder(time: number): Kid | null {
    if (this.bz > this.H * 0.03) return null
    let best: Kid | null = null
    let bestDistance = this.W * 0.036
    for (const kid of this.kids) {
      if (time < kid.noTouchUntil) continue
      const d = Phaser.Math.Distance.Between(kid.x, kid.gy, this.bx, this.by)
      if (d < bestDistance) {
        bestDistance = d
        best = kid
      }
    }
    return best
  }

  private moveKid(kid: Kid, vx: number, vy: number, step: number) {
    kid.x = Phaser.Math.Clamp(kid.x + vx * step, this.W * 0.07, this.W * 0.93)
    kid.gy = Phaser.Math.Clamp(kid.gy + vy * step, this.band.far * this.H, this.band.near * this.H)
    if (Math.abs(vx) > 1) kid.image.setFlipX(vx < 0)
  }

  // ---- kicking -----------------------------------------------------------------------

  private release(p: number, time: number) {
    this.charging = false
    this.lockUntil = time + 260
    const kid = this.me
    if (p < 0.24) return this.pass(kid, time)
    const aimY = Phaser.Math.Linear(MOUTH.top, MOUTH.bottom, 0.5 + this.ctx.input.y * 0.36) * this.H
    // past the sweet spot the ball rises: over-hitting is a mistake you can hear
    const over = Math.max(0, p - 0.86)
    this.shoot(kid, 1, aimY, Phaser.Math.Linear(0.65, 1.2, Math.min(1, p)), over * 4, time)
  }

  private pass(kid: Kid, time: number) {
    const dir = kid.team === 'red' ? 1 : -1
    const mate = this.kids.find((k) => k.team === kid.team && k !== kid)
    let tx = kid.x + dir * this.W * 0.2
    let ty = kid.gy
    if (mate && Math.abs(mate.x - kid.x) > this.W * 0.06) {
      // lead the pass a little, the way children do
      tx = mate.x + (mate.x - mate.lastX) * 6
      ty = mate.gy
    }
    const angle = Phaser.Math.Angle.Between(this.bx, this.by, tx, ty)
    const d = Phaser.Math.Distance.Between(this.bx, this.by, tx, ty)
    const v = Phaser.Math.Clamp(d * 3.2, this.W * 0.35, this.W * 0.75)
    this.bvx = Math.cos(angle) * v
    this.bvy = Math.sin(angle) * v * 0.6
    kid.noTouchUntil = time + 260
    this.kickFx()
  }

  private shoot(kid: Kid, dir: 1 | -1, aimY: number, power: number, lift: number, time: number) {
    const goalX = dir > 0 ? this.W * (1 - GOAL_X) : this.W * GOAL_X
    const angle = Phaser.Math.Angle.Between(this.bx, this.by, goalX, aimY)
    const v = this.W * 0.95 * power
    this.bvx = Math.cos(angle) * v
    this.bvy = Math.sin(angle) * v * 0.85
    this.bvz = this.H * 0.6 * lift
    if (lift > 0) this.bz = Math.max(this.bz, 1)
    kid.noTouchUntil = time + 300
    this.kickFx()
    kid.hop = kid.image.displayHeight * 0.08
    if (power > 0.9) this.cameras.main.shake(90, 0.002)
  }

  private kickFx() {
    this.ctx.bus.emit('sound', { kind: 'step', surface: 'street' })
  }

  private tackle(kid: Kid, time: number) {
    if (time < kid.tackleUntil) return
    kid.tackleUntil = time + TACKLE_COOLDOWN
    kid.dashUntil = time + 200
    // a dash you can also win the ball with: close enough at any point during it
    this.time.delayedCall(60, () => this.tryWin(kid))
    this.time.delayedCall(160, () => this.tryWin(kid))
  }

  private tryWin(kid: Kid) {
    const victim = this.holder(-1)
    if (!victim || victim.team === kid.team) return
    if (Phaser.Math.Distance.Between(kid.x, kid.gy, victim.x, victim.gy) > this.W * 0.085) return
    victim.noTouchUntil = this.time.now + 520
    const angle = Phaser.Math.Angle.Between(victim.x, victim.gy, kid.x, kid.gy)
    this.bvx = Math.cos(angle) * this.W * 0.3
    this.bvy = Math.sin(angle) * this.H * 0.12
    kid.noTouchUntil = 0
    if (kid.human) this.ctx.bus.emit('toast', { text: 'לקחת!', tone: 'red' })
  }

  // ---- the other three ---------------------------------------------------------------

  private think(kid: Kid, holder: Kid | null, step: number, time: number) {
    const own = kid.team === 'red' ? -1 : 1
    const goalDir: 1 | -1 = kid.team === 'red' ? 1 : -1
    const homeX = kid.team === 'red' ? this.W * 0.13 : this.W * 0.87
    let tx = this.bx
    let ty = this.by
    let speedK = kid.team === 'other' ? 1.62 : 1.7

    if (kid.role === 'keeper') {
      // stand on the line between the ball and the middle of the mouth, and step out when
      // the danger is close
      const danger = Math.abs(this.bx - homeX) < this.W * 0.3 && holder?.team !== kid.team
      const mid = ((MOUTH.top + MOUTH.bottom) / 2) * this.H
      tx = danger ? homeX + (this.bx - homeX) * 0.16 : homeX
      ty = Phaser.Math.Clamp(danger ? this.by : mid, MOUTH.top * this.H, MOUTH.bottom * this.H)
      speedK = danger ? 1.55 : 1
      if (holder === kid) {
        // clear it upfield to the forward, then get back
        const mate = this.kids.find((k) => k.team === kid.team && k.role === 'forward')
        if (mate && time > kid.idleShotAt) {
          kid.idleShotAt = time + 700
          const a = Phaser.Math.Angle.Between(this.bx, this.by, mate.x, mate.gy)
          this.bvx = Math.cos(a) * this.W * 0.6
          this.bvy = Math.sin(a) * this.H * 0.2
          kid.noTouchUntil = time + 350
        }
        return
      }
    } else if (holder === kid) {
      // dribble at goal, weave a little, and shoot from range
      const goalX = goalDir > 0 ? this.W * (1 - GOAL_X) : this.W * GOAL_X
      const weave = Math.sin(time / 380 + kid.x * 0.01) * this.H * 0.06
      tx = goalX
      ty = Phaser.Math.Clamp(this.H * 0.82 + weave, this.H * 0.66, this.H * 0.92)
      const range = Math.abs(goalX - kid.x)
      if (range < this.W * 0.3 && time > kid.idleShotAt) {
        kid.idleShotAt = time + 1400
        const aim = Phaser.Math.FloatBetween(0.1, 0.9)
        const lift = Phaser.Math.FloatBetween(0, 1) > 0.8 ? 0.4 : 0
        this.shoot(kid, goalDir, Phaser.Math.Linear(MOUTH.top, MOUTH.bottom, aim) * this.H, Phaser.Math.FloatBetween(0.62, 0.85), lift, time)
      }
      speedK = kid.team === 'other' ? 1.5 : 1.6
    } else if (holder && holder.team === kid.team) {
      // a team-mate has it: run into space ahead of him
      tx = Phaser.Math.Clamp(holder.x + goalDir * this.W * 0.2, this.W * 0.12, this.W * 0.88)
      ty = this.H * (kid.human ? 0.86 : 0.76)
    } else {
      // press: whoever is nearer of the two forwards is the only one that chases
      const chase = kid.role === 'forward' || Math.abs(this.bx - homeX) < this.W * 0.18
      if (!chase) {
        tx = homeX
        ty = this.H * 0.81
      }
      if (holder && holder.team !== kid.team && Phaser.Math.Distance.Between(kid.x, kid.gy, holder.x, holder.gy) < this.W * 0.07) {
        // the tackle: a throw of the dice a few times a second, never a sure thing
        if (time > kid.tackleUntil && Phaser.Math.FloatBetween(0, 1) < step * 1.6) {
          kid.tackleUntil = time + 900
          holder.noTouchUntil = time + 520
          const a = Phaser.Math.Angle.Between(holder.x, holder.gy, kid.x, kid.gy)
          this.bvx = Math.cos(a) * this.W * 0.25
          this.bvy = Math.sin(a) * this.H * 0.1
        }
      }
    }
    void own
    const angle = Phaser.Math.Angle.Between(kid.x, kid.gy, tx, ty)
    const d = Phaser.Math.Distance.Between(kid.x, kid.gy, tx, ty)
    const speed = d < this.W * 0.008 ? 0 : kid.image.displayHeight * speedK
    this.moveKid(kid, Math.cos(angle) * speed, Math.sin(angle) * speed * 0.6, step)
  }

  /** a keeper's body in the way of a low shot is a save, and it is said out loud */
  private saves(holder: Kid | null, time: number) {
    if (!holder || holder.role !== 'keeper' || this.lastToucher === holder) return
    const from = this.lastToucher
    if (!from || from.team === holder.team) return
    const hard = Math.hypot(this.bvx, this.bvy) > this.W * 0.3
    if (!hard || time - this.lastCall < 900) return
    this.lastCall = time
    this.bvx = (holder.team === 'red' ? 1 : -1) * this.W * 0.4
    this.bvy = Phaser.Math.FloatBetween(-0.1, 0.1) * this.H
    holder.noTouchUntil = time + 250
    holder.hop = holder.image.displayHeight * 0.12
    this.ctx.bus.emit('toast', { text: 'עצירה!', tone: holder.team === 'red' ? 'red' : 'plain' })
    this.ctx.bus.emit('sound', { kind: 'roar' })
  }

  // ---- goals and misses ----------------------------------------------------------------

  private checkGoal(time: number) {
    const left = this.W * GOAL_X
    const right = this.W * (1 - GOAL_X)
    const side = this.bx >= right ? 'right' : this.bx <= left ? 'left' : null
    if (!side) return
    const top = this.H * MOUTH.top
    const bottom = this.H * MOUTH.bottom
    const post = this.H * 0.02
    const inside = this.by > top && this.by < bottom
    const bar = this.H * BAR * 1.15
    if (inside && this.bz < bar) {
      // a goal: right goal is Pugi's, left goal is theirs
      const mine = side === 'right'
      if (mine) this.score.red += 1
      else this.score.other += 1
      this.goal(mine, time)
      return
    }
    // rebound off the wall; say why
    const hitPost = !inside && (Math.abs(this.by - top) < post || Math.abs(this.by - bottom) < post)
    const words = inside ? 'מעל!' : hitPost ? 'קורה!' : 'החוצה'
    if (time - this.lastCall > 700) {
      this.lastCall = time
      this.ctx.bus.emit('toast', { text: words, tone: 'plain' })
      this.ctx.bus.emit('sound', { kind: 'roar' })
      this.cameras.main.shake(70, 0.003)
    }
    this.bx = side === 'right' ? right - 2 : left + 2
    this.bvx = (side === 'right' ? -1 : 1) * Math.max(this.W * 0.22, Math.abs(this.bvx) * 0.4)
    this.bvz = 0
    this.bz = 0
  }

  private goal(mine: boolean, time: number) {
    const scorer = this.lastToucher
    const winning = this.score.red >= TO_WIN || this.score.other >= TO_WIN || this.overtime
    this.freezeUntil = time + (winning ? 1200 : 1500)
    this.charging = false
    this.bvx = this.bvy = this.bvz = 0
    this.ctx.bus.emit('sound', { kind: 'roar', big: mine ? 1 : 0.4 })
    this.ctx.bus.emit('toast', {
      text: mine ? `גוֹל! ${this.score.red} — ${this.score.other}` : `${this.score.red} — ${this.score.other}. הם קיבלו.`,
      tone: mine ? 'red' : 'plain',
    })
    // the camera pushes toward the net and bounces back
    const cam = this.cameras.main
    cam.shake(mine ? 260 : 160, mine ? 0.007 : 0.004)
    cam.zoomTo(this.baseZoom * (mine ? 1.1 : 1.04), 180, 'Sine.easeOut', true)
    this.time.delayedCall(700, () => cam.zoomTo(this.baseZoom, 400, 'Sine.easeInOut', true))
    if (mine) cam.flash(180, 233, 223, 199, false)
    // paper and dust from the net, in the plates' own colours
    const gx = mine ? this.W * (1 - GOAL_X) : this.W * GOAL_X
    const emitter = this.add.particles(gx, this.by - this.H * 0.04, 'life-dot', {
      speed: { min: 60, max: 220 },
      angle: { min: mine ? 150 : -30, max: mine ? 210 : 30 },
      gravityY: 320,
      lifespan: 1100,
      quantity: 26,
      scale: { start: 1.6, end: 0.3 },
      tint: mine ? [LIFE_PALETTE.red, LIFE_PALETTE.sheet, LIFE_PALETTE.ink] : [LIFE_PALETTE.sheet, LIFE_PALETTE.ink],
      emitting: false,
    })
    emitter.setDepth(4000)
    emitter.explode(26)
    this.time.delayedCall(1400, () => emitter.destroy())
    if (scorer) scorer.hop = scorer.image.displayHeight * 0.35
    // the side that conceded kicks off, unless that was the last goal
    this.goalPending = () => {
      if (winning && (this.score.red >= TO_WIN || this.score.other >= TO_WIN || this.overtime)) {
        this.finish()
        return
      }
      this.kickoff(mine ? 'other' : 'red')
      this.freezeUntil = this.time.now + 700
      this.ctx.bus.emit('sound', { kind: 'whistle', blasts: 1 })
    }
  }

  private drawMeter(time: number) {
    const g = this.meter
    g.clear()
    if (!this.charging) return
    const p = Phaser.Math.Clamp((time - this.chargeFrom) / CHARGE_MS, 0, 1)
    const w = 54
    const x = this.me.x - w / 2
    const y = this.me.gy - this.me.image.displayHeight - 16
    g.fillStyle(LIFE_PALETTE.ink, 0.8)
    g.fillRect(x - 2, y - 2, w + 4, 10)
    g.fillStyle(p > 0.86 ? LIFE_PALETTE.red : LIFE_PALETTE.sheet, 1)
    g.fillRect(x, y, w * p, 6)
    // the sweet spot: the last fifth before the ball starts to sail
    g.lineStyle(2, LIFE_PALETTE.red, 1)
    g.lineBetween(x + w * 0.86, y - 3, x + w * 0.86, y + 9)
  }

  private pushHud() {
    const left = this.started ? Math.max(0, Math.ceil((this.endsAt - this.time.now) / 1000)) : Math.ceil(LENGTH_MS / 1000)
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
      hint: this.overtime ? 'הגול הבא מנצח.' : 'לחיצה — מסירה או גלישה · החזק — בעיטה. אל תחזיק יותר מדי.',
      waitingHe: null,
    })
  }

  private finish() {
    if (this.finished) return
    this.finished = true
    this.meter.clear()
    const won = this.score.red > this.score.other
    const clean = won && this.score.other === 0
    this.ctx.engine.dispatch(
      { t: 'clock.advanced', minutes: 25 },
      { t: 'energy.changed', delta: -16 },
      { t: 'flag.raised', flag: 'played:football' },
      { t: 'trait.shifted', trait: 'footballAffinity', delta: won ? 8 : 5 },
      { t: 'bond.shifted', who: 'ofir', delta: won ? 6 : 3 },
    )
    if (won) this.ctx.engine.dispatch({ t: 'flag.raised', flag: 'won:football' })
    void this.ctx.engine.save()

    this.ctx.bus.emit('sound', { kind: 'whistle', blasts: 3 })
    this.ctx.bus.emit('toast', {
      text: clean ? 'ניצחתם, והם לא ראו כדור.' : won ? 'ניצחתם.' : 'הפסדתם. יהיה מחר.',
      tone: won ? 'red' : 'plain',
    })
    this.time.delayedCall(1100, () => {
      this.cameras.main.fadeOut(420, 0, 0, 0)
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(WorldScene.KEY, { mapId: this.returnTo, spawn: this.returnSpawn })
      })
    })
  }
}

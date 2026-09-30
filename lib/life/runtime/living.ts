import Phaser from 'phaser'

import { LIFE_PALETTE } from './palette'

/**
 * העולם זז בלי שביקשו ממנו — the layer that stops this being a boy sliding over a painting.
 *
 * Maor's note, 6.9.2026: *"להוסיף הרבה יותר micro-animation, תגובות סביבה ומעברים קולנועיים
 * כדי להעלים את התחושה של דמות שמסתובבת על רקעים."* The rooms already had dust, a graded
 * vignette, passers-by and a crowd that bounces. What they did not have is a world that
 * MOVES on its own and NOTICES him: nothing on screen changed because the boy was there.
 *
 * Everything here is drawn rather than loaded — a bird is three pixels of ink against the
 * sky, a shaft of light is a polygon at 5% alpha, dust is the particle texture the boot
 * scene already makes. That is a deliberate limit, not a shortcut: figurative things
 * (pigeons on the pavement, the street cats, the laundry) are already specified as real
 * art in `GRAPHICS-REQUESTS §4` and a procedural stand-in for a cat is a grey ellipse that
 * looks like a bug. The first pass of this file drew them anyway and they looked exactly
 * that bad, so they came out. What is left is what reads correctly at the size it is drawn:
 *
 *   · birds far away and high up, where a silhouette IS the bird;
 *   · light through a window, which has no shape of its own;
 *   · dust off his own shoes, which is a smudge by nature;
 *   · wind, which is only ever visible in what it moves.
 *
 * When `propPigeons` and `propCatTabby` arrive they belong in `world/scenes.ts` as dressing
 * with a `bob`, not here.
 */

export type LivingHost = {
  scene: Phaser.Scene
  /** the room's own pixel size, as the scene framed it */
  W: number
  H: number
  ambience: string
  /** the walk band, so nothing lives where the floor is not */
  band: { far: number; near: number }
  /** where the child is now, and whether he is moving */
  player: () => { x: number; y: number; moving: boolean } | null
}

type Bird = {
  wingA: Phaser.GameObjects.Rectangle
  wingB: Phaser.GameObjects.Rectangle
  x: number
  y: number
  vx: number
  phase: number
  size: number
}

/** rooms with a sky in them: birds, gusts, grit off the ground */
const OUTDOOR = new Set(['day', 'dusk', 'park', 'station', 'stadium'])
/** rooms with a roof and a window: shafts, slow air, no sky */
const INDOOR = new Set(['interior', 'kitchen', 'hall', 'tunnel', 'classroom'])

export class LivingWorld {
  private birds: Bird[] = []
  private shafts: Phaser.GameObjects.Polygon[] = []
  private flockClock = Phaser.Math.FloatBetween(4, 14)
  private gustClock = Phaser.Math.FloatBetween(2, 7)
  private gust = 0
  private dust: Phaser.GameObjects.Particles.ParticleEmitter | null = null
  private stepAcc = 0
  private lastPlayerX: number | null = null
  private clock = 0

  constructor(private host: LivingHost) {}

  private get scene() {
    return this.host.scene
  }

  build() {
    const { ambience } = this.host
    if (OUTDOOR.has(ambience)) this.flock(Phaser.Math.Between(3, 6))
    if (INDOOR.has(ambience)) this.buildShafts()
    this.buildFootDust()
  }

  // -------------------------------------------------------------------- birds ---

  /**
   * ציפורים רחוקות — the one figurative thing that survives being drawn with two rectangles.
   *
   * A bird a hundred metres up is a moving mark, and the eye supplies the rest; the trick
   * is that the mark must be small (a fifth of a per cent of the frame), high (the top
   * third, where the painting has sky rather than wall), and it must FLAP — two short bars
   * hinged at the middle, the angle running on a sine, each bird a beat out of step with
   * the next. They cross the frame in eight to twenty seconds and delete themselves at the
   * far edge, and another flock comes along a while later.
   *
   * This is the cheapest possible "the sky is not a photograph", and it is the only thing
   * in this file that a player will consciously notice.
   */
  private flock(n: number) {
    const { W, H } = this.host
    const dir = Math.random() < 0.5 ? 1 : -1
    const headY = H * Phaser.Math.FloatBetween(0.06, 0.3)
    const headX = dir > 0 ? -W * 0.06 : W * 1.06
    for (let i = 0; i < n; i += 1) {
      // a loose V: each bird behind and above or below the one in front
      const x = headX - dir * i * W * Phaser.Math.FloatBetween(0.02, 0.05)
      const y = headY + (i % 2 === 0 ? 1 : -1) * i * H * 0.012 + Phaser.Math.FloatBetween(-H * 0.01, H * 0.01)
      const size = H * Phaser.Math.FloatBetween(0.006, 0.011)
      const wingA = this.scene.add.rectangle(x, y, size, size * 0.22, LIFE_PALETTE.ink, 0.72).setDepth(3800)
      const wingB = this.scene.add.rectangle(x, y, size, size * 0.22, LIFE_PALETTE.ink, 0.72).setDepth(3800)
      wingA.setOrigin(0, 0.5)
      wingB.setOrigin(1, 0.5)
      this.birds.push({
        wingA,
        wingB,
        x,
        y,
        vx: dir * W * Phaser.Math.FloatBetween(0.035, 0.075),
        phase: Math.random() * Math.PI * 2,
        size,
      })
    }
  }

  private moveBirds(dt: number) {
    const { W } = this.host
    for (let i = this.birds.length - 1; i >= 0; i -= 1) {
      const bird = this.birds[i]
      if (!bird) continue
      bird.phase += dt * Phaser.Math.FloatBetween(7, 9)
      bird.x += bird.vx * dt
      bird.y += Math.sin(bird.phase * 0.22) * this.host.H * 0.0006
      const beat = Math.sin(bird.phase) * 0.6
      bird.wingA.setPosition(bird.x, bird.y).setRotation(-beat)
      bird.wingB.setPosition(bird.x, bird.y).setRotation(beat)
      if (bird.x < -W * 0.12 || bird.x > W * 1.12) {
        bird.wingA.destroy()
        bird.wingB.destroy()
        this.birds.splice(i, 1)
      }
    }
  }

  // ------------------------------------------------------------ light and air ---

  /**
   * אור מהחלון — two soft wedges that breathe.
   *
   * A room lit by one window is a room with a direction, and a shaft that holds perfectly
   * still is a painted shaft. These drift by a few per cent of their own alpha over eight
   * seconds: under the threshold where a person can see it move, above the one where the
   * room feels dead.
   */
  private buildShafts() {
    const { W, H } = this.host
    const warm = this.host.ambience === 'hall' ? LIFE_PALETTE.lamp : LIFE_PALETTE.sheet
    for (let i = 0; i < 2; i += 1) {
      const topX = W * (0.18 + i * 0.42)
      const width = W * 0.1
      const spread = W * 0.16
      const poly = this.scene.add
        .polygon(0, 0, [topX, 0, topX + width, 0, topX + width + spread, H * 0.92, topX - spread * 0.4, H * 0.92], warm, 0.05)
        .setOrigin(0, 0)
        .setDepth(3900)
        .setBlendMode(Phaser.BlendModes.ADD)
      this.shafts.push(poly)
    }
  }

  /**
   * אבק מתחת לנעליים — dust, only while he is actually moving, and only on dry ground.
   *
   * Emitted at the feet rather than at the sprite's centre, and off by default: a puff
   * that appears while the boy is standing still is the fastest way to make a walk look
   * wrong. One puff per stride, and the stride is measured in screen width so it is the
   * same walk in every room.
   */
  private buildFootDust() {
    if (!OUTDOOR.has(this.host.ambience)) return
    this.dust = this.scene.add
      .particles(0, 0, 'life-dot', {
        lifespan: 620,
        speedX: { min: -14, max: 14 },
        speedY: { min: -22, max: -6 },
        scale: { start: 1.1, end: 0.1 },
        alpha: { start: 0.26, end: 0 },
        tint: LIFE_PALETTE.sheet,
        frequency: -1,
        quantity: 2,
      })
      .setDepth(10)
  }

  // -------------------------------------------------------------------- update ---

  update(delta: number) {
    const dt = delta / 1000
    this.clock += dt
    const player = this.host.player()

    // ---- the gust: the room's own weather, every eight to sixteen seconds ----
    this.gustClock -= dt
    if (this.gustClock <= 0) {
      this.gustClock = Phaser.Math.FloatBetween(8, 16)
      this.gust = 1
    }
    this.gust = Math.max(0, this.gust - dt * 0.55)

    // ---- birds ----
    this.moveBirds(dt)
    if (OUTDOOR.has(this.host.ambience)) {
      this.flockClock -= dt
      if (this.flockClock <= 0 && this.birds.length === 0) {
        this.flockClock = Phaser.Math.FloatBetween(14, 34)
        this.flock(Phaser.Math.Between(3, 6))
      }
    }

    // ---- light shafts ----
    for (let i = 0; i < this.shafts.length; i += 1) {
      const shaft = this.shafts[i]
      if (!shaft) continue
      shaft.setAlpha(0.042 + Math.sin(this.clock * 0.28 + i * 1.7) * 0.016 + this.gust * 0.01)
    }

    // ---- his own feet ----
    if (this.dust && player) {
      if (player.moving && this.lastPlayerX !== null) {
        this.stepAcc += Math.abs(player.x - this.lastPlayerX)
        const stride = this.host.W * 0.05
        if (this.stepAcc > stride) {
          this.stepAcc = 0
          this.dust.emitParticleAt(player.x, player.y - 2, 2)
        }
      } else {
        this.stepAcc = 0
      }
      this.lastPlayerX = player.x
    }
  }

  /** how hard the wind is blowing right now, 0..1 — the scene leans its dressing by it */
  gustNow(): number {
    return this.gust
  }

  destroy() {
    for (const bird of this.birds) {
      bird.wingA.destroy()
      bird.wingB.destroy()
    }
    this.birds = []
    for (const shaft of this.shafts) shaft.destroy()
    this.shafts = []
    this.dust?.destroy()
    this.dust = null
  }
}

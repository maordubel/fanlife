import Phaser from 'phaser'

import { t } from '@/lib/i18n'

import { PROLOGUE } from '../../content/chapter1986'
import { GESTURES, GESTURE_PREFIX, type Gesture } from '../../content/gestures'
import { artUrl } from '../art'
import { CONTEXT_KEY, type LifeContext } from '../context'
import { LIFE_PALETTE } from '../palette'

import { CHAPTERS } from '../../content/chapters'
import { WorldScene } from './WorldScene'

/**
 * 1 ביוני 1983 — the first minute of this life the player actually owns.
 *
 * The new opening film tells the family story first. Then this scene gives the player one
 * tiny thing only film cannot give them: agency inside the memory. When that memory closes,
 * the supplied `cup83` film becomes the first archive reveal — history after experience,
 * never history instead of experience — and the first playable childhood day loads behind it.
 */
/** the terrace is seen before it is asked about */
const OPEN_AFTER_MS = 1600
/** a question left alone this long gets the terrace moving under it once */
const IDLE_SURGE_MS = 9000

export class PrologueScene extends Phaser.Scene {
  static readonly KEY = 'life-prologue'

  private ctx!: LifeContext
  private done = false
  private image: Phaser.GameObjects.Image | null = null
  /**
   * a gesture in the middle of the memory (`content/gestures.ts`, V3 §12): the box has
   * closed, a mark waits on the painting, and the next conversation opens when the hand
   * has done it — or when it has waited long enough by itself.
   */
  private gesture: Gesture | null = null
  private gestureTaps = 0
  private gestureSince = 0
  private gestureMark: Phaser.GameObjects.Ellipse | null = null
  private gestureShake: Phaser.Tweens.Tween | null = null

  constructor() {
    super(PrologueScene.KEY)
  }

  preload() {
    if (!this.textures.exists('art-cup83')) this.load.image('art-cup83', artUrl('cup83'))
  }

  create() {
    this.ctx = this.registry.get(CONTEXT_KEY) as LifeContext
    this.cameras.main.setBackgroundColor(LIFE_PALETTE.night)

    const cam = this.cameras.main
    const image = this.add.image(0, 0, 'art-cup83').setOrigin(0.5, 0.5).setScrollFactor(0)
    this.image = image
    const source = this.textures.get('art-cup83').getSourceImage()

    const place = () => {
      const scale = Math.max(cam.width / source.width, cam.height / source.height) * 1.18
      image.setPosition(cam.width / 2, cam.height / 2)
      image.setScale(scale)
      return scale
    }
    const scale = place()

    this.tweens.add({
      targets: image,
      scale: { from: scale, to: scale * 1.08 },
      duration: 30000,
      ease: 'Sine.easeInOut',
    })

    const dark = this.add.rectangle(0, 0, cam.width, cam.height, LIFE_PALETTE.night, 0.42).setOrigin(0, 0).setScrollFactor(0).setDepth(10)
    const resize = () => {
      place()
      dark.setSize(cam.width, cam.height)
    }
    this.scale.on('resize', resize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', resize, this))

    this.add
      .particles(0, 0, 'life-dot', {
        x: { min: 0, max: cam.width },
        y: { min: 0, max: cam.height },
        quantity: 1,
        frequency: 90,
        lifespan: 8000,
        speedY: { min: -14, max: -3 },
        speedX: { min: -6, max: 6 },
        scale: { start: 1.1, end: 0.2 },
        alpha: { start: 0.22, end: 0 },
        tint: LIFE_PALETTE.lamp,
        blendMode: 'NORMAL',
      })
      .setScrollFactor(0)
      .setDepth(20)

    this.reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    this.pov = { gx: 0, gy: 0, surge: 0 }
    this.clockMs = 0
    if (!this.reduced) cam.setZoom(1.04)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => cam.setAngle(0).setZoom(1))
    cam.fadeIn(1400, 0, 0, 0)

    this.ctx.dialogue.setHooks({
      travel: () => this.finish(),
      minigame: (id: string) => this.startGesture(id),
      ending: () => undefined,
      onOpen: () => undefined,
    })

    this.ctx.bus.emit('place', { id: 'prologue', title: t('life.place.prologue') })
    this.ctx.bus.emit('controls', { visible: false })
    this.input.on('pointerdown', () => {
      this.idleMs = 0
      this.pressGesture()
    })
    /*
     * (pass 28.9.2026, brief §1 S1) the eye first, then the box: the terrace fades in and
     * drifts for a breath before the first question covers the bottom of the glass — a
     * menu before the scene is seen is a form, not a memory.
     */
    this.time.delayedCall(OPEN_AFTER_MS, () => {
      if (this.done) return
      if (!this.ctx.dialogue.start('a1-1983', () => this.closed())) {
        this.ctx.dialogue.startLines(PROLOGUE, () => this.finish())
      }
    })
  }

  /**
   * (pass 28.9.2026, brief §1 S1 "after 8–10 s without input the crowd moves and Kobi shifts")
   * a child who does not answer is still on a terrace: the picture surges once under him
   * and the crowd roars, and then the question waits again. Transform only; never a timer
   * that decides for him.
   */
  private idleMs = 0
  /** a child's eyes: where the glance has carried the picture, and how long the terrace has been breathing */
  private pov = { gx: 0, gy: 0, surge: 0 }
  private clockMs = 0
  private glanceIn = 4200
  private ambientIn = 6500
  private povLine = 0
  private reduced = false
  private surge() {
    if (!this.image) return
    const cam = this.cameras.main
    this.tweens.add({ targets: this.pov, surge: -cam.height * 0.018, duration: 180, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', onComplete: () => { this.pov.surge = 0 } })
    this.ctx.bus.emit('sound', { kind: 'sample', key: 'crowd-swell', level: 0.45 })
  }

  /**
   * A conversation closed. When it closed because it handed the hand a gesture, the
   * gesture's hook runs right after this in the same call (`DialogueRunner.finish` closes
   * first, then runs what the effects opened), so the decision waits one tick.
   */
  private closed() {
    this.time.delayedCall(0, () => {
      if (!this.gesture && !this.ctx.dialogue.open) this.finish()
    })
  }

  private startGesture(id: string) {
    const gesture = id.startsWith(GESTURE_PREFIX) ? GESTURES[id.slice(GESTURE_PREFIX.length)] : undefined
    if (!gesture) return
    this.gesture = gesture
    this.gestureTaps = 0
    this.gestureSince = 0
    const cam = this.cameras.main
    const x = cam.width * gesture.spot.x
    const y = cam.height * gesture.spot.y
    this.gestureMark?.destroy()
    const size = Math.min(cam.width, cam.height) * 0.16
    const mark = this.add.ellipse(x, y, size, size, LIFE_PALETTE.red, 0).setStrokeStyle(4, LIFE_PALETTE.red, 0.95).setScrollFactor(0).setDepth(30)
    this.tweens.add({ targets: mark, scale: 1.25, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.gestureMark = mark
    // the terrace erupting under him: the picture jumps, transform only
    if (gesture.shake && this.image) {
      this.gestureShake = this.tweens.add({ targets: this.pov, surge: -cam.height * 0.012, duration: 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }
    this.ctx.bus.emit('controls', { visible: true })
    this.ctx.bus.emit('prompt', { verb: gesture.verb, label: gesture.labelHe, locked: false })
  }

  private pressGesture() {
    const gesture = this.gesture
    if (!gesture || this.ctx.dialogue.open) return
    this.gestureTaps += 1
    this.gestureSince = 0
    if (this.gestureMark) this.tweens.add({ targets: this.gestureMark, angle: this.gestureMark.angle + 45, duration: 160 })
    if (this.gestureTaps < gesture.taps) {
      const text = gesture.tapHe?.[this.gestureTaps - 1]
      if (text) this.ctx.bus.emit('toast', { text, tone: 'plain' })
      return
    }
    this.resolveGesture(true)
  }

  private resolveGesture(done: boolean) {
    const gesture = this.gesture
    if (!gesture) return
    this.gesture = null
    this.gestureMark?.destroy()
    this.gestureMark = null
    this.gestureShake?.stop()
    this.gestureShake = null
    this.pov.surge = 0
    this.ctx.bus.emit('prompt', null)
    this.ctx.bus.emit('controls', { visible: false })
    this.ctx.dialogue.applyEffects(done ? gesture.done : gesture.ignored)
    this.ctx.bus.emit('toast', { text: done ? gesture.doneHe : gesture.ignoredHe, tone: done ? 'red' : 'plain' })
    if (!this.ctx.dialogue.start(gesture.next, () => this.closed())) this.finish()
  }

  /**
   * (30.9.2026, Maor: "כל החוויה משעממת") a child's-eye life under every question: the head
   * sways, the picture breathes, the eyes wander to a new corner every few seconds, and the
   * terrace speaks on its own — a drum, a smell, a hand — whether or not he has answered.
   * Transform only; nothing here decides anything for him.
   */
  private live(delta: number) {
    if (this.done) return
    const cam = this.cameras.main
    this.clockMs += delta
    const now = this.clockMs
    if (this.image) {
      const drift = Math.sin(now / 15000) * cam.width * 0.05
      this.image.setPosition(cam.width / 2 + drift + this.pov.gx, cam.height / 2 + this.pov.gy + this.pov.surge)
    }
    if (this.reduced) return
    cam.setAngle(Math.sin(now / 2300) * 0.55)
    cam.setZoom(1.04 + Math.sin(now / 3100) * 0.012)
    this.glanceIn -= delta
    if (this.glanceIn <= 0) {
      this.glanceIn = 5200 + Math.random() * 3600
      const to = { gx: (Math.random() - 0.5) * cam.width * 0.11, gy: (Math.random() - 0.35) * cam.height * 0.05 }
      this.tweens.add({ targets: this.pov, ...to, duration: 1900, ease: 'Sine.easeInOut' })
    }
    this.ambientIn -= delta
    if (this.ambientIn <= 0) {
      this.ambientIn = 8000 + Math.random() * 4000
      this.surge()
      const lines = [t('life98a.pov.legs'), t('life98a.pov.smoke'), t('life98a.pov.drum'), t('life98a.pov.song'), t('life98a.pov.flag'), t('life98a.pov.hand')]
      const text = lines[this.povLine % lines.length]
      this.povLine += 1
      if (text) this.ctx.bus.emit('toast', { text, tone: 'plain' })
    }
  }

  override update(_time: number, delta: number) {
    this.live(delta)
    if (!this.gesture) {
      if (!this.ctx.dialogue.open || this.done) return
      this.idleMs += delta
      if (this.idleMs >= IDLE_SURGE_MS) {
        this.idleMs = 0
        this.surge()
      }
      return
    }
    this.ctx.input.beginFrame()
    if (this.ctx.input.actionPressed) {
      this.pressGesture()
      return
    }
    this.gestureSince += delta
    // a gesture nobody makes resolves by itself: a memory does not wait for the hand
    if (this.gestureSince >= this.gesture.autoMs) this.resolveGesture(false)
  }

  skip() {
    this.gesture = null
    this.ctx.dialogue.close()
    this.finish()
  }

  private finish() {
    if (this.done) return
    this.done = true

    const first = CHAPTERS.find((c) => c.playable) ?? CHAPTERS[0]!
    const state = this.ctx.engine.state
    this.ctx.engine.dispatch(
      { t: 'flag.raised', flag: 'prologue:done' },
      { t: 'flag.raised', flag: 'life:archive:cup83-offered' },
      { t: 'year.entered', year: first.year, weekday: first.weekday, minute: first.minute },
      { t: 'chapter.entered', chapter: first.id },
      { t: 'flag.raised', flag: `life:bridge-${first.id}` },
      ...(first.entry?.(state) ?? []),
    )

    // The first documentary reveal: Kobi's story became the player's memory first; only
    // now do we open the archive. WorldScene may load behind it — FilmCut is the curtain.
    this.ctx.bus.emit('film', {
      clip: 'cup83-archive',
      captionHe: 'קובי סיפר את הערב הזה במשך שנים. עכשיו הזיכרון נפתח אל הארכיון — ואז החיים של פוגי מתחילים באמת.',
    })

    this.ctx.bus.emit('controls', { visible: true })
    this.cameras.main.fadeOut(900, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(WorldScene.KEY, { mapId: first.start.location, spawn: first.start.spawn })
    })
  }
}

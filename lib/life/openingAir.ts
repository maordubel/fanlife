import type { OpeningDocumentaryMode } from './opening'

/**
 * האוויר של הפתיח — atmosphere only, and only his recordings (spec §39).
 *
 * The documentary is complete in silence: sound is off until the player turns it on, and
 * turning it on IS the gesture a browser needs. What plays is picked from the nine files
 * Maor recorded or sent (`lib/life/runtime/audio.ts`, `ALLOWED`) — asserted by
 * `tests/life-opening.test.ts`, so this can never become a door for a synthesised noise:
 *
 *   origin · memory · identity   his street (`amb-park`), low-passed to an 80s window
 *   archive                      the transistor finding "שירים ושערים" (`radio-open`), once
 *   lights                       the ground far away (`crowd-real-murmur`), through a wall
 *   handoff                      everything steps back to nothing
 *
 * A private AudioContext, closed when the opening ends — the game's own `LifeAudio` wakes
 * on its own gesture and never inherits a street that is still running.
 */

export const OPENING_AIR_KEYS = ['amb-park', 'radio-open', 'crowd-real-murmur'] as const
type AirKey = (typeof OPENING_AIR_KEYS)[number]

type Cue = { street: number; far: number; once?: AirKey }

export const OPENING_AIR: Record<OpeningDocumentaryMode, Cue> = {
  origin: { street: 0.26, far: 0 },
  memory: { street: 0.16, far: 0 },
  archive: { street: 0.08, far: 0, once: 'radio-open' },
  identity: { street: 0.12, far: 0 },
  lights: { street: 0.04, far: 0.3 },
  handoff: { street: 0, far: 0 },
}

type Loop = { gain: GainNode; source: AudioBufferSourceNode | null }

export class OpeningAir {
  private ctx: AudioContext | null = null
  private ext: 'ogg' | 'm4a' = 'm4a'
  private buffers = new Map<AirKey, Promise<AudioBuffer | null>>()
  private loops = new Map<'street' | 'far', Loop>()
  private played = new Set<AirKey>()
  private on = false

  /** from a click handler only */
  wake(): void {
    if (typeof window === 'undefined') return
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      try {
        this.ext = document.createElement('audio').canPlayType('audio/ogg; codecs=vorbis') ? 'ogg' : 'm4a'
      } catch {
        this.ext = 'm4a'
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    this.on = true
  }

  mute(): void {
    this.on = false
    this.level('street', 0, 0.3)
    this.level('far', 0, 0.3)
  }

  cue(mode: OpeningDocumentaryMode): void {
    if (!this.on || !this.ctx) return
    const cue = OPENING_AIR[mode]
    this.level('street', cue.street, 1.1)
    this.level('far', cue.far, 1.4)
    if (cue.once && !this.played.has(cue.once)) {
      this.played.add(cue.once)
      void this.buffer(cue.once).then((buffer) => {
        const ctx = this.ctx
        if (!buffer || !ctx || !this.on) return
        const source = ctx.createBufferSource()
        source.buffer = buffer
        const gain = ctx.createGain()
        gain.gain.value = 0.32
        source.connect(gain).connect(ctx.destination)
        source.start()
      })
    }
  }

  close(): void {
    this.on = false
    const ctx = this.ctx
    this.ctx = null
    if (ctx) void ctx.close().catch(() => undefined)
  }

  private buffer(key: AirKey): Promise<AudioBuffer | null> {
    const known = this.buffers.get(key)
    if (known) return known
    const ctx = this.ctx
    if (!ctx) return Promise.resolve(null)
    const loading = fetch(`/life/sfx/${key}.${this.ext}`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((bytes) => ctx.decodeAudioData(bytes))
      .catch(() => null)
    this.buffers.set(key, loading)
    return loading
  }

  private level(which: 'street' | 'far', target: number, seconds: number): void {
    const ctx = this.ctx
    if (!ctx) return
    let loop = this.loops.get(which)
    if (!loop) {
      if (target <= 0) return
      const gain = ctx.createGain()
      gain.gain.value = 0
      // the street through a closed 80s window; the ground through a wall and a street
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = which === 'street' ? 2400 : 700
      filter.connect(gain).connect(ctx.destination)
      loop = { gain, source: null }
      this.loops.set(which, loop)
      const made = loop
      void this.buffer(which === 'street' ? 'amb-park' : 'crowd-real-murmur').then((buffer) => {
        if (!buffer || !this.ctx) return
        const source = this.ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true
        source.connect(filter)
        source.start(this.ctx.currentTime, Math.random() * Math.max(0.1, buffer.duration - 1))
        made.source = source
      })
    }
    loop.gain.gain.setTargetAtTime(target, ctx.currentTime, seconds / 3)
  }
}

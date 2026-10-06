/**
 * LIFE, universal — sound. Synthesised, never a file: nothing to license, nothing to load.
 * Woken by the first gesture, silent until then, and off the moment the supporter says so.
 */
const KEY = 'fan-life:life:sound'

export class LifeSound {
  private ctx: AudioContext | null = null
  private noise: AudioBuffer | null = null
  on = true

  constructor() {
    try { this.on = window.localStorage.getItem(KEY) !== 'off' } catch { /* private mode: sound stays on for the visit */ }
  }

  set(on: boolean) {
    this.on = on
    try { window.localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* not remembered, still obeyed */ }
    if (!on && this.ctx) void this.ctx.suspend()
    if (on && this.ctx) void this.ctx.resume()
  }

  /** Call from a gesture. Browsers refuse audio that nobody asked for. */
  wake() {
    if (!this.on) return
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext
        if (!Ctor) return
        this.ctx = new Ctor()
        const buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate), d = buf.getChannelData(0)
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
        this.noise = buf
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume()
    } catch { this.ctx = null; this.bedGain = null }
  }

  private tone(freq: number, len: number, gain: number, type: OscillatorType = 'sine', slide = 0, delay = 0) {
    const c = this.ctx
    if (!c || !this.on) return
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + len)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    o.connect(g).connect(c.destination)
    o.start(t)
    o.stop(t + len + 0.05)
  }

  private hiss(len: number, gain: number, from: number, to: number, q = 0.8, delay = 0) {
    const c = this.ctx
    if (!c || !this.on || !this.noise) return
    const t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
    s.buffer = this.noise
    s.loop = true
    f.type = 'bandpass'
    f.Q.value = q
    f.frequency.setValueAtTime(from, t)
    f.frequency.exponentialRampToValueAtTime(to, t + len)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.25, len / 3))
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    s.connect(f).connect(g).connect(c.destination)
    s.start(t)
    s.stop(t + len + 0.05)
  }

  play(cue: string) {
    switch (cue) {
      case 'step': this.hiss(0.07, 0.035, 900, 500, 1.4); break
      case 'page': this.hiss(0.12, 0.05, 2600, 1400, 0.9); break
      case 'tick': this.tone(660, 0.06, 0.04, 'triangle'); break
      case 'door': this.tone(140, 0.16, 0.12, 'triangle', -50); this.hiss(0.14, 0.04, 500, 300, 1); break
      case 'coin': this.tone(1320, 0.09, 0.06, 'square'); this.tone(1980, 0.16, 0.05, 'square', 0, 0.07); break
      case 'whistle': this.tone(2200, 0.5, 0.06, 'sine', 180); this.tone(2260, 0.5, 0.04, 'sine', 160); break
      case 'radio': this.hiss(0.9, 0.06, 1800, 3200, 0.5); this.tone(520, 0.3, 0.03, 'sawtooth', 240, 0.5); break
      case 'murmur': this.hiss(2.2, 0.07, 320, 420, 0.6); break
      case 'roar': this.hiss(2.6, 0.2, 380, 1500, 0.5); this.hiss(2.2, 0.1, 900, 2400, 0.7, 0.15); break
      case 'bus': this.tone(70, 1.4, 0.12, 'sawtooth', 30); this.hiss(1.2, 0.04, 200, 320, 0.6); break
      case 'clap': this.hiss(0.09, 0.16, 1500, 900, 0.9); break
      case 'keep': this.tone(523, 0.14, 0.06, 'triangle'); this.tone(784, 0.3, 0.06, 'triangle', 0, 0.12); break
      case 'reveal': this.tone(392, 0.9, 0.035, 'sine'); this.tone(588, 0.9, 0.03, 'sine', 0, 0.12); this.tone(784, 1.3, 0.03, 'sine', 0, 0.26); this.hiss(1.4, 0.03, 600, 2400, 0.4); break
      case 'end': this.tone(392, 0.3, 0.06, 'triangle'); this.tone(523, 0.3, 0.06, 'triangle', 0, 0.22); this.tone(659, 0.6, 0.06, 'triangle', 0, 0.44); break
      default: break
    }
  }

  private bedGain: GainNode | null = null

  /** The town's own sound: a crowd that is far away, and nearer the closer the supporter walks to the ground. 0 is silence. */
  bed(level: number) {
    const c = this.ctx
    if (!c || !this.on || !this.noise) return
    if (!this.bedGain) {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
      s.buffer = this.noise; s.loop = true
      f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.5
      g.gain.value = 0.0001
      s.connect(f).connect(g).connect(c.destination)
      s.start()
      this.bedGain = g
    }
    this.bedGain.gain.setTargetAtTime(Math.max(0.0001, Math.min(1, level) * 0.05), c.currentTime, 1.4)
  }

  close() { try { void this.ctx?.close() } catch { /* already gone */ } this.ctx = null; this.bedGain = null }
}

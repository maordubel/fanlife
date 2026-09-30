/**
 * הקול — three recordings, and nothing else.
 *
 * 6.9.2026, Maor, in one sentence: "תבטל את כל הסאונדים מלבד הסאונדים שאני סיפקתי, סאונד
 * של רחוב שסיפקתי, סאונד של מוזיקת רקע שסיפקתי וסאונד של איצטדיון שסיפקתי. כל הסאונדים
 * האחרים נשמעים נורא ואיום."
 *
 * He is right, and the reason is worth writing down so nobody rebuilds it. Everything else
 * in here was SYNTHESISED — noise through a filter, a sine with an envelope on it: a
 * footstep, a door latch, a whistle, a darbuka, a click for every button, and a bed of
 * filtered noise under every room. Each one is defensible on its own and together they are
 * a machine imitating a world, which a person hears immediately and cannot unhear. A game
 * that has three real recordings and silence around them sounds like a place. The same
 * game with sixty synthesised noises added sounds like a toy.
 *
 * So the library is now exactly nine files, and all nine are his:
 *
 *   הרחוב      `amb-park`, `park-wave`        — his urban recording, 144 seconds, cut in
 *                                               `ingest-audio-2026-09-05.py`
 *   האצטדיון   `crowd-real-*` (six)           — his ground recording, 58 seconds, cut into
 *                                               the states the match director moves through
 *   המוזיקה    `amb-theme`                    — "ימים טובים" (Leah Katamin, מקהלת טוב שוער),
 *                                               1:30–1:48, the bar he named himself
 *
 * `ALLOWED` is the whole policy and it is enforced in ONE place — `sample()` never fetches
 * a file that is not in it, and `play()` refuses the key before it reaches a bus. Every
 * one-shot method below is kept (a hundred call sites say `audio.door()`), and every one of
 * them now returns without making a sound. That is deliberate: the silence is the feature,
 * and a method that quietly does nothing is cheaper to keep than a hundred deletions that
 * would each have to be found again the day a real recording of a door arrives.
 *
 * Three rules that survive from the old brief:
 * · **Ambient ducks under dialogue** — the street steps back for a sentence, the ground
 *   steps back less, because a terrace does not go quiet while somebody talks.
 * · **Silence is a level.** Muted is remembered per browser (`the-worker:life:sound`).
 * · **The engine does not exist until a finger has touched the glass** — autoplay policy,
 *   and manners.
 */

export type AmbienceKey = 'interior' | 'kitchen' | 'day' | 'park' | 'dusk' | 'tunnel' | 'stadium' | 'hall' | 'station' | 'base' | 'classroom' | 'none'

/**
 * הקהל — the crowd is a STATE, not a loop.
 *
 * Seven states the match director moves through. Each one is a level and a colour on the
 * real murmur plus at most one cut fired on entry. Moving between states is a crossfade on
 * one gain node — there is never a second loop, on pause, on resume, or on a tab that went
 * dark and came back. `OFF` empties the ground.
 */
export type CrowdState = 'OFF' | 'LOW_MURMUR' | 'BUILDING_TENSION' | 'CHANT' | 'NEAR_MISS' | 'GOAL_BURST' | 'AFTERMATH' | 'FINAL_WHISTLE'

export const CROWD_STATES: readonly CrowdState[] = ['LOW_MURMUR', 'BUILDING_TENSION', 'CHANT', 'NEAR_MISS', 'GOAL_BURST', 'AFTERMATH', 'FINAL_WHISTLE']

/**
 * The union is kept whole so the call sites still typecheck and so the day a real door or
 * a real whistle is recorded there is a name waiting for it. Only `ALLOWED` plays.
 */
export type SampleKey =
  | 'crowd-goal' | 'crowd-swell' | 'crowd-groan' | 'crowd-hush' | 'crowd-claps'
  | 'whistle-1' | 'whistle-2' | 'whistle-3' | 'buzzer' | 'ball-bounce' | 'ball-kick'
  | 'darbuka-dum' | 'darbuka-tek' | 'darbuka-ka' | 'darbuka-three-two'
  | 'door' | 'page' | 'stamp' | 'tick' | 'coins' | 'bell-shop' | 'bell-school' | 'radio-tune'
  | 'bus-door' | 'car-pass' | 'car-door'
  | 'year-turn' | 'finale-hit' | 'stage-sting' | 'reveal' | 'gauge-up' | 'gauge-down' | 'heart'
  | 'ui-open' | 'ui-close' | 'ui-click' | 'choice' | 'ending' | 'box-item'
  | 'amb-room' | 'amb-kitchen' | 'amb-street-day' | 'amb-street-dusk' | 'amb-tunnel'
  | 'amb-stadium' | 'amb-hall' | 'amb-station' | 'amb-base' | 'amb-classroom' | 'amb-radio' | 'amb-bus'
  // ---- the three recordings, and the only sounds the game makes ----
  | 'crowd-real-goal' | 'crowd-real-murmur' | 'crowd-real-build' | 'crowd-real-miss' | 'crowd-real-after' | 'crowd-real-final'
  | 'amb-park' | 'park-wave'
  | 'amb-theme'
  // ---- 6.9.2026 — the two Maor sent for matchdays ----
  | 'crowd-bed' | 'chant-derby' | 'radio-open'

/**
 * מה מותר להישמע — the allow-list, and the whole of the sound policy.
 *
 * Nothing outside this set is fetched, decoded or played, whatever asks for it. Adding a
 * sound to the game means adding a recording and putting its name here; there is no other
 * door in.
 */
const ALLOWED: ReadonlySet<string> = new Set<string>([
  // הרחוב
  'amb-park',
  'park-wave',
  // האצטדיון
  'crowd-real-murmur',
  'crowd-real-build',
  'crowd-real-goal',
  'crowd-real-miss',
  'crowd-real-after',
  'crowd-real-final',
  // המוזיקה
  'amb-theme',
  /**
   * המשחק — שתי שכבות, 6.9.2026.
   *
   * Maor: *"רוצה לשלב את הסאונד רקע הקבוע כשפוגי נמצא במשחק כדורגל/כדורסל, ו'על הזין'
   * לערבב עם הקבוע כשזה דרבי."*
   *
   *   · `crowd-bed`   — the constant. It runs under EVERY match, football or basketball,
   *                     from the first minute to the whistle, and it never reacts to
   *                     anything. It is the sound of being inside a ground.
   *   · `chant-derby` — the derby, and only the derby. It is mixed OVER the bed rather
   *                     than replacing it, ducked while the ground itself is doing
   *                     something (a goal, a miss), and it comes back up after.
   *
   * The existing six `crowd-real-*` cuts keep doing exactly what they did — they are the
   * moments; these two are the room the moments happen in.
   */
  'crowd-bed',
  'chant-derby',
  /**
   * "שירים ושערים" — the opening of the programme, sent 6.9.2026.
   *
   * Not a sound effect: it is the thing a transistor DOES on a Saturday afternoon in this
   * country, and every radio moment in the game — 1990's promotion arithmetic, the 1998
   * evening that breaks everybody — starts with somebody finding this station.
   */
  'radio-open',
])

/**
 * איפה נשמע הרחוב — outdoors, and only outdoors.
 *
 * His recording is a street: traffic a block away, people, a mechanical sweep every half
 * minute. Under a kitchen it would be a window nobody opened. So the four outdoor keys get
 * it and the indoor ones get the tune alone, which is quieter than any room tone and does
 * not pretend to be a room.
 */
const STREET: ReadonlyArray<AmbienceKey> = ['day', 'park', 'dusk', 'station']

/** how loud the tune sits under an ordinary room — quiet, and then the bus takes more off */
const MUSIC_LEVEL = 0.11

/** how loud his street sits under an ordinary scene */
const STREET_LEVEL = 0.4

/**
 * צבע הרחוב לפי העשור — one recording, three rooms.
 *
 * Maor's street was recorded in the 2020s and the game runs from 1983 to 2000, and there
 * is exactly one honest thing to do about that: do not fake a second recording, TREAT the
 * one there is. A street in 1984 has fewer cars, no air conditioning on every balcony and
 * no modern engine hiss, so the top end comes off and the bottom is tightened; the
 * nineties open it back up; the two-thousands are the tape as it was recorded.
 *
 * This is a filter, not a performance. Nothing is added, nothing is synthesised, and
 * `ALLOWED` is untouched — the sound is still his and only his.
 */
type StreetColour = { top: number; bottom: number; level: number }
const STREET_ERA: Record<'80s' | '90s' | '00s' | '10s', StreetColour> = {
  '80s': { top: 3400, bottom: 150, level: 0.9 },
  '90s': { top: 5600, bottom: 95, level: 0.98 },
  '00s': { top: 9000, bottom: 60, level: 1.04 },
  '10s': { top: 12000, bottom: 45, level: 1.06 },
}

/** the constant bed under every match — present, never in the way */
const BED_LEVEL = 0.34
/** the derby chant over it: heard, but the ground is still louder than the song */
const CHANT_LEVEL = 0.42

const STORE = 'the-worker:life:sound'

/** per state: the loop's level, its lowpass colour, the cut fired on entry and its level */
export const CROWD_PLAN: Record<Exclude<CrowdState, 'OFF'>, { level: number; colour: number; cut?: SampleKey; cutLevel?: number }> = {
  LOW_MURMUR: { level: 0.42, colour: 1600 },
  BUILDING_TENSION: { level: 0.6, colour: 3200, cut: 'crowd-real-build', cutLevel: 0.55 },
  // the chant was a synthesised clap track over a synthesised darbuka; what is left is the
  // ground itself, held up and opened out, which is what a terrace in song actually sounds
  // like from the recording we have
  CHANT: { level: 0.62, colour: 2900 },
  NEAR_MISS: { level: 0.5, colour: 3600, cut: 'crowd-real-miss', cutLevel: 0.85 },
  GOAL_BURST: { level: 0.85, colour: 5200, cut: 'crowd-real-goal', cutLevel: 1.0 },
  AFTERMATH: { level: 0.34, colour: 1200, cut: 'crowd-real-after', cutLevel: 0.55 },
  FINAL_WHISTLE: { level: 0.0, colour: 2200, cut: 'crowd-real-final', cutLevel: 0.9 },
}

function jitter(v: number, pct: number) {
  return v * (1 + (Math.random() * 2 - 1) * pct)
}

export class LifeAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private ambient: GainNode | null = null
  private sfx: GainNode | null = null
  private ui: GainNode | null = null
  private current: AmbienceKey = 'none'
  private wanted: AmbienceKey = 'none'
  private _muted = false
  private ducked = false
  private samples = new Map<string, Promise<AudioBuffer | null>>()
  private ext: 'ogg' | 'm4a' = 'ogg'
  /** his street, when the room is outdoors — one node, faded, never two */
  private ambientFile: {
    source: AudioBufferSourceNode
    gain: GainNode
    top: BiquadFilterNode
    bottom: BiquadFilterNode
  } | null = null
  /** which decade the life is in — the street is coloured by it, nothing else is */
  private decade: '80s' | '90s' | '00s' | '10s' = '80s'
  /** the tune under the ordinary rooms — one node for the whole session, never restarted */
  private music: { source: AudioBufferSourceNode; gain: GainNode } | null = null
  private waveTimer = 0
  // the crowd: one bus, one loop, one state
  private crowdBus: GainNode | null = null
  private crowdLoop: { source: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null = null
  private crowdLoopStarting = false
  private _crowdState: CrowdState = 'OFF'
  private crowdWanted: CrowdState = 'OFF'
  private crowdTimers: number[] = []
  /**
   * שתי השכבות של המשחק — the bed under every match, and the chant over the derby.
   *
   * Separate nodes from `crowdLoop` on purpose: the murmur loop is the ground REACTING —
   * it opens, closes, brightens and ducks with the state machine — and these two do not
   * react to anything. The bed is a room and the chant is a stand full of people who have
   * decided what they are singing. Mixing them into the reactive loop would make both of
   * them flinch every time somebody nearly scored.
   */
  private matchBed: { source: AudioBufferSourceNode; gain: GainNode } | null = null
  private derbyChant: { source: AudioBufferSourceNode; gain: GainNode } | null = null
  /** whether the fixture on now is a derby — set by the directors before the first minute */
  private derbyNight = false
  /** whether a transistor is currently on, so its signature plays once and not per frame */
  private radio = false
  private crowdLog: { state: CrowdState; at: number }[] = []

  constructor() {
    try {
      this._muted = window.localStorage.getItem(STORE) === 'off'
    } catch {
      this._muted = false
    }
  }

  get muted() {
    return this._muted
  }

  /** the nine names that are allowed to make a sound — for the probe and the tests */
  static get allowed(): readonly string[] {
    return [...ALLOWED]
  }

  /** the engine exists only after a gesture; call from a pointer/key handler */
  wake() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = this._muted ? 0 : 1
    this.master.connect(this.ctx.destination)
    this.ambient = this.ctx.createGain()
    this.ambient.gain.value = 0.55
    this.ambient.connect(this.master)
    this.sfx = this.ctx.createGain()
    this.sfx.gain.value = 0.7
    this.sfx.connect(this.master)
    this.ui = this.ctx.createGain()
    this.ui.gain.value = 0.5
    this.ui.connect(this.master)
    this.crowdBus = this.ctx.createGain()
    this.crowdBus.gain.value = 0.8
    this.crowdBus.connect(this.master)
    // a tab that goes dark freezes the clock; nothing is started twice when it comes back
    try {
      document.addEventListener('visibilitychange', () => {
        const ctx = this.ctx
        if (!ctx) return
        if (document.visibilityState === 'hidden') void ctx.suspend()
        else if (ctx.state === 'suspended') void ctx.resume()
      })
    } catch {
      /* no document */
    }
    // Safari has no Vorbis; everything else prefers it (half the bytes of AAC at this quality)
    try {
      const probe = document.createElement('audio')
      this.ext = probe.canPlayType('audio/ogg; codecs=vorbis') ? 'ogg' : 'm4a'
    } catch {
      this.ext = 'm4a'
    }
    // the tune is the first thing wanted and the biggest file: start it loading now
    void this.sample('amb-theme')
    if (this.wanted !== 'none') this.setAmbience(this.wanted, true)
    if (this.crowdWanted !== 'OFF') this.crowd(this.crowdWanted, true)
  }

  // ---------------------------------------------------------------------- crowd ---

  get crowdState(): CrowdState {
    return this._crowdState
  }

  /** every state the crowd has been through since the engine woke, with the audio clock */
  get crowdHistory(): readonly { state: CrowdState; at: number }[] {
    return this.crowdLog
  }

  /**
   * Move the crowd to `state`. Idempotent: the same state twice is nothing; a state that
   * fires a cut fires it once, on entry. All timers belonging to the old state are
   * cancelled so a tension that was still breathing does not fire under a goal.
   */
  crowd(state: CrowdState, force = false) {
    this.crowdWanted = state
    if (!this.ctx || !this.crowdBus) return
    if (!force && state === this._crowdState) return
    const previous = this._crowdState
    this._crowdState = state
    this.crowdLog.push({ state, at: this.ctx.currentTime })
    if (this.crowdLog.length > 64) this.crowdLog.shift()
    for (const timer of this.crowdTimers) window.clearTimeout(timer)
    this.crowdTimers = []
    const ctx = this.ctx
    const t = ctx.currentTime
    if (state === 'OFF') {
      if (this.crowdLoop) {
        const old = this.crowdLoop
        old.gain.gain.setTargetAtTime(0, t, 1.2)
        old.source.stop(t + 5)
        this.crowdLoop = null
      }
      for (const layer of [this.matchBed, this.derbyChant]) {
        if (!layer) continue
        layer.gain.gain.setTargetAtTime(0, t, 1.4)
        layer.source.stop(t + 6)
      }
      this.matchBed = null
      this.derbyChant = null
      this.derbyNight = false
      if (this.ambientFile) this.ambientFile.gain.gain.setTargetAtTime(STREET_LEVEL * STREET_ERA[this.decade].level, t, 1.5)
      return
    }
    // the ground has a voice; his street steps back under it
    if (this.ambientFile) this.ambientFile.gain.gain.setTargetAtTime(0.16 * STREET_ERA[this.decade].level, t, 1.0)
    this.ensureCrowdLoop()
    this.ensureMatchLayers()
    if (previous === 'OFF') this.warm(['crowd-real-goal', 'crowd-real-build', 'crowd-real-miss', 'crowd-real-after', 'crowd-real-final'])
    /**
     * הקהל שר — until the ground itself says something.
     *
     * A chant does not stop for a goal; it is swallowed by one, and it comes back a few
     * seconds later louder than it was. So the derby layer ducks under the burst and the
     * near-miss and rides back up on everything else, and it goes quiet for good at the
     * final whistle while the ground is still roaring.
     */
    if (this.derbyChant) {
      const loud = state === 'GOAL_BURST' || state === 'NEAR_MISS'
      const target = state === 'FINAL_WHISTLE' ? 0 : loud ? CHANT_LEVEL * 0.3 : state === 'CHANT' ? CHANT_LEVEL * 1.15 : CHANT_LEVEL
      this.derbyChant.gain.gain.setTargetAtTime(target, t, loud ? 0.35 : 2.2)
    }
    if (this.matchBed) {
      this.matchBed.gain.gain.setTargetAtTime(state === 'FINAL_WHISTLE' ? BED_LEVEL * 0.5 : BED_LEVEL, t, 1.6)
    }
    const p = CROWD_PLAN[state]
    this.shapeCrowd(p.level, p.colour, state === 'GOAL_BURST' || state === 'NEAR_MISS' ? 0.25 : 1.1)
    // the entry cut waits for its bytes if it must (a goal is not a click), but only while the state holds
    if (p.cut) this.playWhenReady(p.cut, p.cutLevel ?? 0.8, () => this._crowdState === state)
    const later = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        // the state moved on, or the tab is dark: the timer belongs to nobody
        if (this._crowdState !== state || ctx.state !== 'running') return
        fn()
      }, ms)
      this.crowdTimers.push(id)
    }
    switch (state) {
      case 'BUILDING_TENSION': {
        // it keeps building: every few seconds another rise, a little higher
        const again = (n: number) => later(4800 + Math.random() * 1800, () => {
          this.play('crowd-real-build', { bus: 'crowd', level: Math.min(0.8, 0.55 + n * 0.08), jitter: 0.05 })
          again(n + 1)
        })
        again(1)
        break
      }
      case 'CHANT':
        // the ground breathes on its own: the murmur opens and closes, slowly, forever
        {
          const breathe = (up: boolean) => later(5200, () => {
            this.shapeCrowd(up ? 0.68 : 0.56, up ? 3200 : 2500, 2.4)
            breathe(!up)
          })
          breathe(true)
        }
        break
      case 'NEAR_MISS':
        // the "ohhh" falls back into the murmur on its own
        later(2600, () => this.shapeCrowd(0.46, 2400, 1.4))
        break
      case 'GOAL_BURST':
        // eight seconds up, then the ground settles but stays higher than before
        later(5000, () => this.shapeCrowd(0.55, 2800, 2.5))
        break
      case 'FINAL_WHISTLE':
        // the cut carries the burst; the loop goes to nothing and is dropped
        later(9000, () => this.crowd('OFF'))
        break
      default:
        break
    }
  }

  /** a cut that must be heard: loads first if it has to, plays if `still()` holds when it can */
  private playWhenReady(key: SampleKey, level: number, still: () => boolean) {
    const ctx = this.ctx
    const bus = this.crowdBus
    if (!ctx || !bus || !ALLOWED.has(key)) return
    void this.sample(key).then((buffer) => {
      if (!buffer || !still()) return
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.playbackRate.value = jitter(1, 0.04)
      const gain = ctx.createGain()
      gain.gain.value = jitter(level, 0.04)
      source.connect(gain).connect(bus)
      source.start(ctx.currentTime)
    })
  }

  /**
   * להקשיב לרדיו באמצע אצטדיון — the mix inverts, and the story is told by the mix.
   *
   * Mission 01 §24: normally Bloomfield is ninety per cent of what you can hear and the
   * transistor is the other ten. When news comes in from the parallel match the priority
   * flips; on the Yavne penalty the ground is all but gone and there is nothing in the
   * world except a small speaker held above somebody's head. Then the sixth goal goes in
   * and the radio does not matter at all any more.
   *
   * `weight` is how much of the room to keep: 1 is a normal match, 0.3 is a Yavne update,
   * 0.05 is the penalty. It ducks the crowd bus, the bed and the chant together, because
   * a chant that keeps singing under a held breath is nobody's memory of this.
   */
  listen(weight: number) {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime
    const w = Math.max(0, Math.min(1, weight))
    const fast = w < 0.5 ? 0.25 : 1.1
    if (this.crowdBus) this.crowdBus.gain.setTargetAtTime(w, t, fast)
    if (this.matchBed) this.matchBed.gain.gain.setTargetAtTime(BED_LEVEL * w, t, fast)
    if (this.derbyChant) this.derbyChant.gain.gain.setTargetAtTime(CHANT_LEVEL * w, t, fast)
  }

  /**
   * הדרבי — told once, before the first minute, by whoever is directing the night.
   *
   * `derby1991.ts` and the match director know what fixture this is; the audio does not
   * and must not guess. Calling this with `true` is what puts the chant over the bed.
   */
  setDerby(on: boolean) {
    if (this.derbyNight === on) return
    this.derbyNight = on
    if (this._crowdState !== 'OFF') this.ensureMatchLayers()
    if (!on && this.derbyChant && this.ctx) {
      this.derbyChant.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 1.2)
    }
  }

  /**
   * שתי השכבות — started once per match, looped, and never restarted by a state change.
   *
   * Each one begins at a random point in its own buffer, so two visits to the same ground
   * do not open on the same second of somebody's recording.
   */
  private ensureMatchLayers() {
    const ctx = this.ctx
    const bus = this.crowdBus
    if (!ctx || !bus) return
    const start = (key: SampleKey, level: number, into: 'matchBed' | 'derbyChant') => {
      if (this[into]) return
      void this.sample(key).then((buffer) => {
        // the match may have ended while the bytes were in the air
        if (!buffer || this[into] || this._crowdState === 'OFF') return
        if (into === 'derbyChant' && !this.derbyNight) return
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.loop = true
        source.playbackRate.value = jitter(1, 0.01)
        const gain = ctx.createGain()
        gain.gain.value = 0
        source.connect(gain).connect(bus)
        source.start(ctx.currentTime, Math.random() * Math.max(0.1, buffer.duration - 2))
        gain.gain.setTargetAtTime(level, ctx.currentTime, 2.4)
        this[into] = { source, gain }
      })
    }
    start('crowd-bed', BED_LEVEL, 'matchBed')
    if (this.derbyNight) start('chant-derby', CHANT_LEVEL, 'derbyChant')
  }

  private ensureCrowdLoop() {
    if (this.crowdLoop || this.crowdLoopStarting || !this.ctx || !this.crowdBus) return
    const ctx = this.ctx
    const bus = this.crowdBus
    this.crowdLoopStarting = true
    void this.sample('crowd-real-murmur').then((buffer) => {
      this.crowdLoopStarting = false
      if (!buffer || this.crowdLoop || this._crowdState === 'OFF') return
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      source.playbackRate.value = jitter(1, 0.015)
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 1600
      filter.Q.value = 0.5
      const gain = ctx.createGain()
      gain.gain.value = 0
      source.connect(filter).connect(gain).connect(bus)
      source.start(ctx.currentTime, Math.random() * Math.max(0.1, buffer.duration - 2))
      this.crowdLoop = { source, gain, filter }
      // the state that asked for the loop sets its level now that it exists (no second cut)
      const p = CROWD_PLAN[this._crowdState as Exclude<CrowdState, 'OFF'>]
      if (p) this.shapeCrowd(p.level, p.colour, 0.8)
    })
  }

  private shapeCrowd(level: number, colour: number, seconds: number) {
    if (!this.ctx || !this.crowdLoop) return
    const t = this.ctx.currentTime
    this.crowdLoop.gain.gain.setTargetAtTime(level, t, seconds)
    this.crowdLoop.filter.frequency.setTargetAtTime(colour, t, seconds)
  }

  // ------------------------------------------------------------------- samples ---

  private sample(key: string): Promise<AudioBuffer | null> {
    // the allow-list, enforced before a byte moves
    if (!ALLOWED.has(key)) return Promise.resolve(null)
    const known = this.samples.get(key)
    if (known) return known
    const ctx = this.ctx
    if (!ctx) return Promise.resolve(null)
    const loading = fetch(`/life/sfx/${key}.${this.ext}`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((bytes) => ctx.decodeAudioData(bytes))
      .catch(() => null)
    this.samples.set(key, loading)
    return loading
  }

  /**
   * One sound, once — if it is one of his.
   *
   * The return value used to mean "the file was there, do not fall back to the synth", and
   * every call site still reads it that way. There is no synth to fall back to any more, so
   * a refused key returns `true`: the caller stops, and nothing is made up in its place.
   */
  play(key: SampleKey, opts: { level?: number; rate?: number; bus?: 'sfx' | 'ui' | 'ambient' | 'crowd'; jitter?: number; delayMs?: number } = {}): boolean {
    if (!ALLOWED.has(key)) return true
    if (!this.ctx) return false
    const bus = opts.bus === 'ui' ? this.ui : opts.bus === 'ambient' ? this.ambient : opts.bus === 'crowd' ? this.crowdBus : this.sfx
    if (!bus) return false
    const cached = this.samples.get(key)
    // not yet decoded: start it loading, and let it be heard the next time it is asked for
    if (!cached) {
      void this.sample(key)
      return true
    }
    const ctx = this.ctx
    const j = opts.jitter ?? 0.06
    void cached.then((buffer) => {
      if (!buffer) return
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.playbackRate.value = jitter(opts.rate ?? 1, j)
      const gain = ctx.createGain()
      gain.gain.value = jitter(opts.level ?? 1, j)
      source.connect(gain).connect(bus)
      source.start(ctx.currentTime + (opts.delayMs ?? 0) / 1000)
    })
    return true
  }

  /** the sounds a chapter is about to need; anything not his is skipped in `sample` */
  warm(keys: SampleKey[]) {
    for (const key of keys) void this.sample(key)
  }

  setMuted(on: boolean) {
    this._muted = on
    try {
      window.localStorage.setItem(STORE, on ? 'off' : 'on')
    } catch {
      /* private mode */
    }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 0 : 1, this.ctx.currentTime, 0.05)
  }

  /** dialogue open: the room steps back */
  duck(on: boolean) {
    if (this.ducked === on) return
    this.ducked = on
    if (this.ambient && this.ctx) this.ambient.gain.setTargetAtTime(on ? 0.28 : 0.55, this.ctx.currentTime, 0.25)
    // the crowd steps back less than the room: a terrace does not go quiet for a sentence
    if (this.crowdBus && this.ctx) this.crowdBus.gain.setTargetAtTime(on ? 0.5 : 0.8, this.ctx.currentTime, 0.3)
  }

  // -------------------------------------------------------------------- music ---

  /**
   * המנגינה מתחת לכל השאר — one loop, started once, faded in and out by the room.
   *
   * Maor asked for this in his own words on 5.9.2026: the background of walking in the
   * street, of being at home, of everything ordinary, taken from his own file between 1:30
   * and 1:48, "באווירה שקטה, ברקע, בנעימות. במקום רעש הצעדים הלא נעים שיש עכשיו" — and
   * then, so it could not be misread: "תייצר מזה לופ נעים וזורם, שוב, לא בווליום גבוהה".
   *
   * So: it never restarts. A tune that begins again every time you walk through a door is
   * a menu jingle; this one runs underneath the whole afternoon and the rooms only decide
   * whether you can hear it.
   */
  private setMusic(on: boolean) {
    if (!this.ctx || !this.ambient) return
    const ctx = this.ctx
    const ambient = this.ambient
    if (this.music) {
      this.music.gain.gain.setTargetAtTime(on ? MUSIC_LEVEL : 0, ctx.currentTime, 2.2)
      return
    }
    if (!on) return
    void this.sample('amb-theme').then((buffer) => {
      if (!buffer || this.music) return
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      const gain = ctx.createGain()
      gain.gain.value = 0
      source.connect(gain).connect(ambient)
      source.start()
      gain.gain.setTargetAtTime(MUSIC_LEVEL, ctx.currentTime, 2.6)
      this.music = { source, gain }
    })
  }

  // ---------------------------------------------------------------- ambience ---

  /**
   * המקומות שיש להם מנגינה — the ordinary ones, which is everywhere except the ground.
   *
   * A terrace and a hall are left alone: each already has a sound that IS the place, and a
   * tune under a crowd is a tune nobody hears and a crowd nobody believes.
   */
  private static readonly NO_MUSIC: readonly AmbienceKey[] = ['stadium', 'hall']

  /**
   * העשור — set once per chapter, and the only thing it moves is the street.
   *
   * The tune and the ground are left alone on purpose. `amb-theme` is a specific
   * recording of a specific song and filtering it would be putting a hand over somebody's
   * mouth; the crowd already has a colour per state, set by what is happening on the
   * pitch rather than by what year it is.
   */
  setDecade(decade: '80s' | '90s' | '00s' | '10s') {
    if (this.decade === decade) return
    this.decade = decade
    this.colourStreet(1.4)
  }

  /** push the current decade's colour and level onto the street that is playing */
  private colourStreet(seconds = 1.2) {
    const ctx = this.ctx
    const file = this.ctx && this.ambientFile
    if (!ctx || !file) return
    const era = STREET_ERA[this.decade]
    const t = ctx.currentTime
    file.top.frequency.setTargetAtTime(era.top, t, seconds)
    file.bottom.frequency.setTargetAtTime(era.bottom, t, seconds)
    file.gain.gain.setTargetAtTime(this.streetLevel(), t, seconds)
  }

  /** how loud his street should be right now: quiet inside a ground, coloured by the decade */
  private streetLevel(): number {
    const base = this._crowdState !== 'OFF' ? 0.16 : STREET_LEVEL
    return base * STREET_ERA[this.decade].level
  }

  setAmbience(key: AmbienceKey, force = false) {
    this.wanted = key
    if (!this.ctx || !this.ambient) return
    if (!force && key === this.current) return
    this.current = key
    this.setMusic(!LifeAudio.NO_MUSIC.includes(key))
    const t = this.ctx.currentTime
    if (this.waveTimer) {
      window.clearTimeout(this.waveTimer)
      this.waveTimer = 0
    }
    // leaving the ground empties it; the director sets the state again on the next match
    if (key !== 'stadium' && key !== 'hall' && this._crowdState !== 'OFF') this.crowd('OFF')

    const wantsStreet = STREET.includes(key)
    if (this.ambientFile && !wantsStreet) {
      const old = this.ambientFile
      old.gain.gain.setTargetAtTime(0, t, 0.8)
      old.source.stop(t + 3)
      this.ambientFile = null
    }
    if (!wantsStreet) return
    // already outdoors and staying outdoors: his street keeps running, uncut
    if (this.ambientFile) {
      this.ambientFile.gain.gain.setTargetAtTime(this.streetLevel(), t, 1.2)
      this.colourStreet()
      this.waves()
      return
    }
    const ctx = this.ctx
    const ambient = this.ambient
    void this.sample('amb-park').then((buffer) => {
      if (!buffer || !STREET.includes(this.current) || this.ambientFile) return
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      source.playbackRate.value = jitter(1, 0.02)
      const era = STREET_ERA[this.decade]
      // the two filters are the decade: everything above `top` and below `bottom` is what
      // a street of this year did not have. They are set here rather than left flat so the
      // first second of the fade is already the right room.
      const top = ctx.createBiquadFilter()
      top.type = 'lowpass'
      top.frequency.value = era.top
      const bottom = ctx.createBiquadFilter()
      bottom.type = 'highpass'
      bottom.frequency.value = era.bottom
      const gain = ctx.createGain()
      gain.gain.value = 0
      source.connect(bottom).connect(top).connect(gain).connect(ambient)
      source.start(ctx.currentTime, Math.random() * Math.max(0.1, buffer.duration - 1))
      gain.gain.setTargetAtTime(this.streetLevel(), ctx.currentTime, 1.4)
      this.ambientFile = { source, gain, top, bottom }
      this.waves()
    })
  }

  /**
   * הגל — the mechanical sweep that is in his recording, every half minute or so.
   *
   * The loop is twenty-five seconds long and a player stands in the street for minutes, so
   * the one event in it that has a shape is pulled out and fired on its own clock. That is
   * the whole trick that stops a loop sounding like a loop.
   */
  private waves() {
    if (this.waveTimer) return
    const again = () => {
      this.waveTimer = window.setTimeout(() => {
        this.waveTimer = 0
        if (!STREET.includes(this.current) || !this.ctx || this.ctx.state !== 'running') return
        this.play('park-wave', { bus: 'ambient', level: 0.35, jitter: 0.1 })
        again()
      }, 28000 + Math.random() * 30000)
    }
    again()
  }

  // ------------------------------------------------------------------- one-shots ---
  //
  // Every method below is a sound the game used to synthesise and no longer makes. They are
  // kept, and kept empty, because the call sites are the map of where a real recording
  // would go if one is ever made — and because a hundred `audio.door()` calls deleted today
  // are a hundred call sites to find again tomorrow.

  /** a footstep — silent since 6.9.2026: the tune runs where the metronome was */
  step(_surface: 'floor' | 'street' | 'terrace' = 'floor') {
    void _surface
  }

  /** a page turned */
  page() {}

  /** the prompt found something */
  tick() {}

  /** a stamp landing / a thing put down */
  thud() {}

  /** a door */
  door() {}

  /** the referee */
  whistle(_blasts = 1) {
    void _blasts
  }

  /** AM radio — the set is still in the scene and still in the dialogue; it has no voice */
  /**
   * מדליקים רדיו — and since 6.9.2026 there is something to hear when you do.
   *
   * This was an empty stub for months, because the only radio sound in the library was a
   * synthesised hiss and the synthesiser is gone. Maor sent the opening of "שירים ושערים",
   * so switching a transistor on now does what switching one on did: the programme's own
   * signature comes out of it, once, quietly enough to talk over — and switching it off
   * takes it away. The looping match layers are not touched; this is the set, not the
   * ground.
   */
  radioOn(on: boolean) {
    if (!this.ctx) return
    if (on) {
      if (this.radio) return
      this.radio = true
      this.play('radio-open', { bus: 'ambient', level: 0.5 })
      return
    }
    this.radio = false
  }

  /**
   * a goal — the only one-shot left, because the only recording of one is his.
   *
   * Inside a directed match the crowd is a state machine and a goal is a state; outside one
   * there is no terrace to roar, so nothing happens, which is correct: a roar in an empty
   * street was always the synthesiser talking.
   */
  roar(big = 1) {
    if (this._crowdState !== 'OFF') this.crowd(big >= 2 ? 'GOAL_BURST' : 'NEAR_MISS', true)
  }
}

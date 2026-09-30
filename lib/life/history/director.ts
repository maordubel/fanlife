/**
 * ParallelHistoricalDirector — one engine for every day this game is about, where the day
 * is happening in two places at once and the boy is only standing in one of them.
 *
 * 12.5.1990 got this right first, by hand, inside `runtime/match1990.ts`: three states
 * kept deliberately apart (what is true / what he has heard / what the kids are saying),
 * radios with different lag, a fourth goal that costs you the radio, and a stretch of the
 * ninetieth minute that runs seven times slower than the seventieth. Maor's audit asked
 * for exactly one thing about it — *"do not create a second giant one-off runtime for
 * 1998"* — and he is right: 2.5.1998 is the same machine with a crueller configuration,
 * and 1999 and 2000 will be too.
 *
 * So the machine moves here and it obeys four rules.
 *
 * **It knows no Phaser.** Not a camera, not a tween, not a sprite. It takes milliseconds
 * and returns a list of semantic signals; whoever called it decides what a signal looks
 * and sounds like. That is what makes it testable without a browser, which is why
 * `tests/life-history.test.ts` can play both days end to end in a few milliseconds.
 *
 * **Truth and knowledge are different objects.** `canonicalAt()` answers what happened.
 * `known()` answers what the boy has been told, by whom, and how long ago. Nothing in the
 * game is allowed to read the first when it means the second — that confusion IS the bug
 * this chapter is about, and separating the two in code is the only reliable way to keep
 * it out of the fiction.
 *
 * **A channel can only carry what it could have carried.** Every source has latency, and
 * a channel that repeats another channel inherits its lag on top of its own. A boy who
 * walks from the far radio back to his father can therefore arrive holding news his
 * father's radio has not played yet, which is the entire point of 12.5.1990 and cost
 * nothing extra to keep general.
 *
 * **A whistle is not an ending.** The ending policy is a small object, not a timer: on
 * 2.5.1998 the primary ground finishing is explicitly NOT completion, the parallel ground
 * must finish too, and — the part that makes it a documentary rather than a scoreboard —
 * the boy must actually have LEARNED the final state before the mission is allowed to
 * close. A player who walks out before the news reaches him has not finished the day; he
 * has left it, which is a different card.
 */
import type { HistoricalMatchEvent, HistoryDay, VenueTimeline } from './types'

export type KnowledgeChannel = {
  id: string
  nameHe: string
  /** the grounds this source can hear at all */
  venues: string[]
  /** game-minutes of lag before this channel can carry an event */
  latency: number
  /** 0..1 — how often this channel garbles what it carries. The kids are 0.5. */
  garble?: number
  /** a channel that only ever repeats another one, and inherits its lag on top of its own */
  repeats?: string
}

/** game-minutes per real second, up to `until` venue-minutes */
export type DramaticBand = { until: number; pace: number }

export type EndingPolicy = {
  /** the primary ground's full time does not complete the mission (2.5.1998) */
  primaryFullTimeIsNotCompletion?: boolean
  /** a shootout has to be settled by hand before the day can close (1999, 17.5.2000) */
  requireShootoutSettled?: boolean
  /** every parallel ground must have reached full time */
  requiredParallelMatchesFinished?: boolean
  /** and the boy must have HEARD the final state, from someone */
  requirePlayerKnowledgeOfFinalState?: boolean
}

/** the four states the audit asked for, in the order a stand actually passes through them */
export type CrowdKnowledge = 'unaware' | 'heard_rumour' | 'confirmed' | 'reacting'

export type CrowdGroup = {
  id: string
  nameHe: string
  /** how many hops from the transistor this group of people is standing */
  hops: number
}

export type DirectorConfig = {
  day: HistoryDay
  channels: KnowledgeChannel[]
  bands: DramaticBand[]
  /** the pace outside the bands */
  fallbackPace: number
  ending: EndingPolicy
  crowd?: { groups: CrowdGroup[]; hopMinutes: number }
  /** the interval, in primary-venue minutes: the clock stands still for `length` */
  interval?: { at: number; length: number }
  /** the last minute the primary venue plays, before the clock is allowed to stop */
  fullTime?: number
  /**
   * הארכה — a cup final does not end at ninety, and the game should not pretend it does.
   *
   * `length` is in venue minutes (thirty, in both of these finals). When present, full time
   * is a PHASE and not an ending, which is the same shape as 2.5.1998's parallel ground and
   * the reason the ending policy is a policy rather than a timer.
   */
  extraTime?: { length: number }
  /**
   * פנדלים — and the only part of a directed day the player's hands are actually in.
   *
   * The shootout has no clock: it ends when somebody has won it. The director holds the
   * phase and refuses to complete the day until `settle()` is called, which is what makes
   * a reload in the middle of it resumable rather than replayable.
   */
  penalties?: boolean
}

export type VenuePhase = 'before' | 'first' | 'half' | 'second' | 'extra' | 'penalties' | 'over'

export type DirectorSignal =
  | { k: 'event'; event: HistoricalMatchEvent }
  | { k: 'phase'; venueId: string; phase: VenuePhase }
  | { k: 'crowd'; groupId: string; state: CrowdKnowledge }
  | { k: 'complete' }

export type KnownRow = { eventId: string; atMinute: number; via: string; garbled: boolean }

/** the needle's position on a directed day — written beside the log, never inside it */
export type DirectorSnapshot = {
  clock: number
  acc: number
  fired: string[]
  known: KnownRow[]
  crowd: Record<string, CrowdKnowledge>
  waveFrom: number | null
  completed: boolean
  phase: VenuePhase
  /** the shootout's result, once somebody has settled it — a cup final is not over at 120 */
  shootout?: string | null
}

const HALF = 45

export class ParallelHistoricalDirector {
  /** the master clock, in primary-venue minutes including the interval */
  private clock = 0
  private acc = 0
  private fired = new Set<string>()
  private knownRows: KnownRow[] = []
  private crowdState = new Map<string, CrowdKnowledge>()
  private waveFrom: number | null = null
  private phases = new Map<string, VenuePhase>()
  private completed = false
  private shootout: string | null = null

  constructor(private readonly config: DirectorConfig) {
    for (const venue of config.day.venues) this.phases.set(venue.venueId, 'before')
    for (const group of config.crowd?.groups ?? []) this.crowdState.set(group.id, 'unaware')
  }

  // ---------------------------------------------------------------- the clock ---

  /** start the day already under way — a boy the stewards let in at half-time */
  seek(minute: number) {
    this.clock = Math.max(0, minute)
    for (const venue of this.config.day.venues) {
      for (const event of venue.events) {
        if (event.pacingMinute <= this.venueMinute(venue.venueId)) this.fired.add(event.id)
      }
    }
    this.phases.set(this.config.day.primaryVenueId, this.phaseNow())
  }

  /** where the primary ground stands right now, from the clock alone */
  private phaseNow(): VenuePhase {
    const interval = this.config.interval
    const played = this.playedMinute()
    const full = this.config.fullTime ?? 90
    const extra = this.config.extraTime?.length ?? 0
    if (interval && this.clock >= interval.at && this.clock < interval.at + interval.length) return 'half'
    if (played >= full + extra) return this.config.penalties && !this.shootout ? 'penalties' : 'over'
    if (played >= full) return extra > 0 ? 'extra' : 'over'
    if (played >= HALF) return 'second'
    if (played > 0) return 'first'
    return 'before'
  }

  /**
   * מי לקח את הפנדלים — the shootout, settled from outside.
   *
   * Nothing here decides it: the archive already did (3–1 in 1999, 4–2 in 2000) and the
   * player's part is what he does with his body while it happens. What the director owns
   * is the fact that it HAS been settled, because that is what the day's ending waits for
   * and what a reload has to remember.
   */
  settle(resultHe: string) {
    this.shootout = resultHe
    this.phases.set(this.config.day.primaryVenueId, this.phaseNow())
  }

  settled(): string | null {
    return this.shootout
  }

  /** how fast the clock runs right now, in game-minutes per real second */
  pace(): number {
    if (this.phaseOf(this.config.day.primaryVenueId) === 'half') return this.config.fallbackPace
    const played = this.playedMinute()
    for (const band of this.config.bands) if (played < band.until) return band.pace
    return this.config.fallbackPace
  }

  /** feed it real milliseconds; get back what the world should now know */
  advance(deltaMs: number): DirectorSignal[] {
    if (this.completed) return []
    const out: DirectorSignal[] = []
    this.acc += (deltaMs / 1000) * this.pace()
    while (this.acc >= 1) {
      this.acc -= 1
      this.clock += 1
      out.push(...this.step())
    }
    out.push(...this.wave())
    if (!this.completed && this.completion().done) {
      this.completed = true
      out.push({ k: 'complete' })
    }
    return out
  }

  /** the primary venue's minute with the interval taken out */
  playedMinute(): number {
    const interval = this.config.interval
    if (!interval) return this.clock
    return this.clock > interval.at ? Math.max(interval.at, this.clock - interval.length) : this.clock
  }

  /** a given ground's own minute — it may have kicked off later than ours */
  venueMinute(venueId: string): number {
    const venue = this.venue(venueId)
    if (!venue) return 0
    return Math.max(0, this.playedMinute() - venue.kickoffOffset)
  }

  private step(): DirectorSignal[] {
    const out: DirectorSignal[] = []
    const primary = this.config.day.primaryVenueId

    // phases, primary ground only — the parallel ground's phase is nobody's business here
    const before = this.phaseOf(primary)
    const phase = this.phaseNow()
    if (phase !== before) {
      this.phases.set(primary, phase)
      out.push({ k: 'phase', venueId: primary, phase })
    }

    // every ground's canonical stream, on its own clock
    for (const venue of this.config.day.venues) {
      const minute = this.venueMinute(venue.venueId)
      for (const event of venue.events) {
        if (this.fired.has(event.id)) continue
        if (event.pacingMinute > minute) continue
        this.fired.add(event.id)
        out.push({ k: 'event', event })
      }
    }

    return out
  }

  phaseOf(venueId: string): VenuePhase {
    return this.phases.get(venueId) ?? 'before'
  }

  // ------------------------------------------------------------------- truth ---

  private venue(venueId: string): VenueTimeline | null {
    return this.config.day.venues.find((v) => v.venueId === venueId) ?? null
  }

  /** what has happened at a ground by a given one of ITS minutes */
  canonicalAt(venueId: string, minute = this.venueMinute(venueId)): HistoricalMatchEvent[] {
    const venue = this.venue(venueId)
    if (!venue) return []
    return venue.events.filter((e) => e.pacingMinute <= minute)
  }

  /** the last thing that happened at a ground — the truth, for the tests and nobody else */
  latestAt(venueId: string, minute = this.venueMinute(venueId)): HistoricalMatchEvent | null {
    const rows = this.canonicalAt(venueId, minute)
    return rows.length ? (rows[rows.length - 1] as HistoricalMatchEvent) : null
  }

  /** goals a named club has scored at a ground by now, off the canonical stream */
  goalsFor(venueId: string, teamSlug: string, minute = this.venueMinute(venueId)): number {
    return this.canonicalAt(venueId, minute).filter((e) => e.type === 'goal' && e.teamSlug === teamSlug).length
  }

  // --------------------------------------------------------------- the wires ---

  channel(id: string): KnowledgeChannel | null {
    return this.config.channels.find((c) => c.id === id) ?? null
  }

  /** a channel's total lag, including the lag of whatever it is repeating */
  latencyOf(channelId: string, seen = new Set<string>()): number {
    const channel = this.channel(channelId)
    if (!channel || seen.has(channelId)) return 0
    seen.add(channelId)
    return channel.latency + (channel.repeats ? this.latencyOf(channel.repeats, seen) : 0)
  }

  /** what this channel is able to carry about this ground, right now */
  heardOn(channelId: string, venueId: string): HistoricalMatchEvent[] {
    const channel = this.channel(channelId)
    if (!channel || !channel.venues.includes(venueId)) return []
    return this.canonicalAt(venueId, this.venueMinute(venueId) - this.latencyOf(channelId))
  }

  /** the freshest thing this channel can say about this ground */
  latestOn(channelId: string, venueId: string): HistoricalMatchEvent | null {
    const rows = this.heardOn(channelId, venueId)
    return rows.length ? (rows[rows.length - 1] as HistoricalMatchEvent) : null
  }

  // ------------------------------------------------------------- what he knows ---

  /** record that he was told something, by whom, and whether the telling was any good */
  learn(event: HistoricalMatchEvent, channelId: string, garbled = false) {
    if (this.knownRows.some((row) => row.eventId === event.id && row.via === channelId)) return
    this.knownRows.push({ eventId: event.id, atMinute: this.clock, via: channelId, garbled })
    if (!garbled && this.waveFrom === null && this.isDecisive(event)) this.waveFrom = this.clock + this.acc
  }

  known(): KnownRow[] {
    return [...this.knownRows]
  }

  /** does he know this one, other than as a rumour somebody got wrong? */
  knows(eventId: string): boolean {
    return this.knownRows.some((row) => row.eventId === eventId && !row.garbled)
  }

  /** the freshest thing he knows about a ground, however he came by it */
  latestKnown(venueId: string): HistoricalMatchEvent | null {
    const venue = this.venue(venueId)
    if (!venue) return null
    const rows = venue.events.filter((e) => this.knows(e.id))
    return rows.length ? (rows[rows.length - 1] as HistoricalMatchEvent) : null
  }

  /** game-minutes since he last heard anything at all about a ground */
  staleness(venueId: string): number | null {
    const venue = this.venue(venueId)
    if (!venue) return null
    const ids = new Set(venue.events.map((e) => e.id))
    const rows = this.knownRows.filter((row) => ids.has(row.eventId))
    if (!rows.length) return null
    return this.clock - Math.max(...rows.map((row) => row.atMinute))
  }

  /**
   * מה שאסור לומר — rule 11, as a method.
   *
   * A source that no newspaper carries may still drive the day; it may not put a name in
   * anybody's mouth. Everything that speaks in this game asks here first.
   */
  speakable(event: HistoricalMatchEvent): boolean {
    return event.speakable
  }

  // ---------------------------------------------------------------- the wave ---

  private isDecisive(event: HistoricalMatchEvent): boolean {
    const venue = this.venue(event.venueId)
    if (!venue || venue.venueId === this.config.day.primaryVenueId) return false
    const last = venue.events.filter((e) => e.type === 'goal')
    return last.length > 0 && last[last.length - 1]?.id === event.id
  }

  /**
   * גל הידיעה — the audit's four states, propagated by distance rather than by a switch.
   *
   * *"not a shout. A wave of faces understanding, row after row, the way lights go out."*
   * A group `hops` away from the transistor hears a rumour one hop before it is confirmed,
   * and starts reacting one hop after — so at any given second the stand holds three
   * different states at once, which is what it looked like.
   */
  private wave(): DirectorSignal[] {
    const crowd = this.config.crowd
    if (!crowd || this.waveFrom === null) return []
    const out: DirectorSignal[] = []
    const since = this.clock + this.acc - this.waveFrom
    for (const group of crowd.groups) {
      const at = group.hops * crowd.hopMinutes
      const want: CrowdKnowledge =
        since >= at + crowd.hopMinutes ? 'reacting' : since >= at ? 'confirmed' : since >= at - crowd.hopMinutes ? 'heard_rumour' : 'unaware'
      if (this.crowdState.get(group.id) !== want) {
        this.crowdState.set(group.id, want)
        out.push({ k: 'crowd', groupId: group.id, state: want })
      }
    }
    return out
  }

  crowdOf(groupId: string): CrowdKnowledge {
    return this.crowdState.get(groupId) ?? 'unaware'
  }

  crowdBoard(): Array<{ id: string; nameHe: string; state: CrowdKnowledge }> {
    return (this.config.crowd?.groups ?? []).map((group) => ({ id: group.id, nameHe: group.nameHe, state: this.crowdOf(group.id) }))
  }

  // ------------------------------------------------------------- the ending ---

  /**
   * מתי היום נגמר — an explicit policy instead of a chapter-specific timer.
   *
   * Returns the verdict and, when it is no, the Hebrew reason, which is what the debug
   * panel shows and what the last-resort net reads when it wants to know whether a
   * chapter is actually stuck or merely not finished yet.
   */
  completion(): { done: boolean; reasonHe: string } {
    const policy = this.config.ending
    const primary = this.config.day.primaryVenueId
    const primaryOver = this.phaseOf(primary) === 'over'
    if (this.phaseOf(primary) === 'penalties') return { done: false, reasonHe: 'פנדלים. עוד לא נגמר.' }
    if (!primaryOver) return { done: false, reasonHe: 'המשחק שלנו עוד רץ.' }
    if (policy.requireShootoutSettled && !this.shootout) return { done: false, reasonHe: 'הפנדלים עוד לא הוכרעו.' }
    if (!policy.primaryFullTimeIsNotCompletion) return { done: true, reasonHe: 'שריקה.' }

    if (policy.requiredParallelMatchesFinished) {
      for (const venue of this.config.day.venues) {
        if (venue.venueId === primary) continue
        const full = venue.events.find((e) => e.type === 'full_time')
        if (full && !this.fired.has(full.id)) return { done: false, reasonHe: `${venue.nameHe} עוד משחקת.` }
      }
    }
    if (policy.requirePlayerKnowledgeOfFinalState) {
      for (const venue of this.config.day.venues) {
        if (venue.venueId === primary) continue
        const decisive = [...venue.events].reverse().find((e) => e.type === 'goal')
        if (decisive && !this.knows(decisive.id)) return { done: false, reasonHe: 'הוא עוד לא יודע.' }
      }
    }
    return { done: true, reasonHe: 'נגמר, וגם הוא יודע שנגמר.' }
  }

  // ------------------------------------------------------------- resume ---

  /**
   * נקודת שמירה — everything a master event needs to be picked up where it was dropped.
   *
   * A directed day is the one thing in this game that a plain event log cannot restore on
   * its own. The log knows the boy heard about Yavne; it does not know that the fourth
   * goal has already been played, and a reload that replays it plays the roar, the flash
   * and the two points of football love a second time. So the director's own position —
   * clock, what has fired, what he has been told, where the wave has reached — is written
   * beside the log and read back in one call. Nothing here is state the reducer owns; it
   * is strictly the position of the needle on the record.
   */
  snapshot(): DirectorSnapshot {
    return {
      clock: this.clock,
      acc: this.acc,
      fired: [...this.fired],
      known: this.known(),
      crowd: Object.fromEntries(this.crowdState),
      waveFrom: this.waveFrom,
      completed: this.completed,
      phase: this.phaseOf(this.config.day.primaryVenueId),
      shootout: this.shootout,
    }
  }

  restore(snap: DirectorSnapshot) {
    this.clock = snap.clock
    this.acc = snap.acc
    this.fired = new Set(snap.fired)
    this.knownRows = snap.known.map((row) => ({ ...row }))
    this.crowdState = new Map(Object.entries(snap.crowd) as Array<[string, CrowdKnowledge]>)
    this.waveFrom = snap.waveFrom
    this.completed = snap.completed
    this.shootout = snap.shootout ?? null
    this.phases.set(this.config.day.primaryVenueId, snap.phase)
  }

  /** the truth, for the tests and for the debug panel — never for a line of dialogue */
  debug() {
    return {
      clock: this.clock,
      played: this.playedMinute(),
      pace: this.pace(),
      phase: this.phaseOf(this.config.day.primaryVenueId),
      fired: [...this.fired],
      known: this.known(),
      crowd: this.crowdBoard(),
      completion: this.completion(),
    }
  }
}

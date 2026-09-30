import { achievementEvents, earnedNow, type Achievement } from './achievements'
import { borrowedAnchorKey } from './content/chapters'
import { apply, emptyState, type LifeEvent } from './events'
import { freshSeed } from './rng'
import { lifeStore, SAVE_VERSION, type SaveFile } from './save'
import type { MasterCheckpoint } from './checkpoint'
import {
  relationshipOf,
  type CharacterId,
  type ItemId,
  type LifeState,
  type PersonalityId,
  type PlayerIdentity,
  type RedHeartId,
  type RelationshipAxis,
  type RelationshipMemory,
  type TraitId,
} from './types'

/**
 * מנוע החיים — what is true, and who is allowed to change it.
 *
 * The Phaser runtime owns pixels. This owns the life. A scene never writes a number:
 * it dispatches an event and re-reads the state, which is what stops the same rule
 * being implemented twice, differently, in a scene and in a minigame.
 *
 * It is a plain class with a subscribe list rather than a store library, because the
 * consumers are one React shell and a handful of scenes, and a dependency to notify
 * three listeners is a dependency to maintain forever.
 *
 * **Autosave is debounced, not per-event.** A walking player emits a clock event every
 * frame's worth of minutes; writing `localStorage` at that rate janks the game loop on
 * a phone. Saving on a 2s trailing edge — and immediately on anything structural —
 * keeps the save honest without paying for it in frames.
 */

export type LifeListener = (state: LifeState) => void

const AUTOSAVE_MS = 2000

/** Events worth writing the disk for at once, rather than on the trailing edge. */
const IMMEDIATE: ReadonlySet<LifeEvent['t']> = new Set([
  'life.started',
  'moved',
  'memory.kept',
  'anchor.attended',
  'anchor.missed',
  'chapter.entered',
  'chapter.completed',
  'item.gained',
  'redbox.item_added',
  'opportunity.accepted',
  'opportunity.missed',
  'relationship.memory_added',
  'rng.seeded',
  // The routes pass. A proof is the evidence a route's apex is argued from and a heard
  // reputation is a thing the world now knows; neither may be lost to a tab closing on
  // the trailing edge of an autosave.
  'proof.recorded',
  // Recognition must not be lost to a tab closing on the trailing edge of an autosave.
  'achievement.earned',
  'reputation.heard',
  // delta 91 — a mission done and a thing made are not lost to a tab closing on the trailing edge
  'mission.completed',
  'output.kept',
])

export class LifeEngine {
  private events: LifeEvent[]
  private listeners = new Set<LifeListener>()
  private timer: ReturnType<typeof setTimeout> | null = null
  private dirty = false
  /**
   * נקודת השמירה של אירוע־אב — where the needle was, beside the log rather than in it.
   *
   * The engine only carries it: it is written by whoever is directing the day and read
   * back by whoever picks it up, and `lib/life/checkpoint.ts` decides whether it is still
   * describing this life. Setting it marks the life dirty, so a checkpoint is never a
   * write the player has to wait for.
   */
  private checkpoint: MasterCheckpoint | null = null

  state: LifeState

  constructor(
    readonly identity: PlayerIdentity,
    readonly year: number,
    events: readonly LifeEvent[] = [],
  ) {
    this.events = [...events]
    this.state = this.events.reduce<LifeState>(apply, emptyState(identity, year))
  }

  /** The log itself — the thing that gets saved, and one day inserted into a table. */
  log(): readonly LifeEvent[] {
    return this.events
  }

  /** stash the position of a directed day; `null` clears it when the day is over */
  mark(checkpoint: MasterCheckpoint | null) {
    this.checkpoint = checkpoint
    this.markDirty(false)
  }

  /** what was stashed, for whoever is about to try to resume it */
  marked(): MasterCheckpoint | null {
    return this.checkpoint
  }

  /**
   * גרסת הדגלים — a counter that changes whenever ANY flag does.
   *
   * `WorldScene` refreshed a room when the NUMBER of flags changed, which catches a flag
   * being raised for the first time and misses a `flag.set` on a key that already exists.
   * The room then keeps showing whoever the old value said was there, and the only way out
   * is to walk through a door and back — a stale room the player cannot unstick.
   *
   * It is a version rather than a deep compare because the check runs every frame: an
   * integer that only moves on a flag write costs nothing to read sixty times a second.
   * (Code audit, 6.9.2026.)
   */
  flagVersion = 0

  /**
   * ההכרה נרשמת ברגע שהיא נהיית נכונה, ולא כשמסך נפתח — וזה נבדק כאן ולא בכל פריים.
   *
   * Every achievement predicate reads flags, proofs, presence, the Red Box, clothing, the
   * chapter or the debt, and **not one of them reads the clock.** So the check is gated on
   * the events that can actually change an answer. Without the gate it would run thirty
   * predicates on every `clock.advanced`, which on a match day is every frame's worth of
   * minutes — the same class of mistake as the 26× time-lapse that did per-minute work
   * inside a stadium (rule 49).
   */
  private static readonly MAY_EARN: ReadonlySet<LifeEvent['t']> = new Set([
    'flag.raised', 'flag.set', 'proof.recorded', 'presence.recorded', 'redbox.item_added',
    'clothing.gained', 'anchor.attended', 'debt.changed', 'memory.kept',
    'chapter.entered', 'chapter.completed', 'day.entered', 'year.entered',
  ])

  /** what the shell has not shown yet — drained one card at a time, never as a list */
  earned: Achievement[] = []

  dispatch(...events: LifeEvent[]): LifeState {
    let immediate = false
    let mayEarn = false
    const before = this.state
    for (const event of events) {
      // a chapter that borrows its anchor does not get to say how he was at it (`anchorOwner`)
      if (borrowsPresence(this.state.chapter, event)) continue
      this.events.push(event)
      this.state = apply(this.state, event)
      if (IMMEDIATE.has(event.t)) immediate = true
      if (LifeEngine.MAY_EARN.has(event.t)) mayEarn = true
      if (event.t === 'flag.raised' || event.t === 'flag.set') this.flagVersion += 1
    }
    if (mayEarn) {
      // `earnedNow` is pure and excludes anything already recorded, so this cannot recurse
      // and cannot announce a life twice — including when a whole log is re-folded on load.
      const gained = earnedNow(before, this.state)
      if (gained.length > 0) {
        for (const event of achievementEvents(gained, this.state)) {
          this.events.push(event)
          this.state = apply(this.state, event)
        }
        immediate = true
        this.earned = [...this.earned, ...gained]
      }
    }
    for (const listener of this.listeners) listener(this.state)
    this.markDirty(immediate)
    return this.state
  }

  /** the shell has shown this one — take it off the queue */
  drainEarned(id: string): void {
    this.earned = this.earned.filter((row) => row.id !== id)
  }

  subscribe(listener: LifeListener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // ---- selectors the runtime asks, so a scene never re-derives a rule -------------

  has(item: ItemId, count = 1): boolean {
    return (this.state.inventory[item] ?? 0) >= count
  }

  canAfford(agorot: number): boolean {
    return this.state.agorot >= agorot
  }

  bond(who: CharacterId): number {
    return this.state.bonds[who] ?? 0
  }

  relationship(who: CharacterId, axis: RelationshipAxis): number {
    return relationshipOf(this.state, who)[axis]
  }

  trait(trait: TraitId): number {
    return this.state.traits[trait]
  }

  personality(key: PersonalityId): number {
    return this.state.personality[key]
  }

  redHeart(key: RedHeartId): number {
    return this.state.redHeart[key]
  }

  flag(name: string): boolean {
    return this.state.flags[name] === true
  }

  /**
   * מישהו יזכור את זה — the one call that writes another person's memory.
   *
   * Everything downstream of it (what Kobi says on the terrace, whether Ofir waits for
   * you at the gate) reads the same list, which is the whole point: NPC memory is one
   * queryable structure, not scene flags scattered through a Phaser file.
   */
  remember(who: CharacterId, eventId: string, significance: RelationshipMemory['significance'] = 'notable') {
    this.dispatch({
      t: 'relationship.memory_added',
      memory: {
        characterId: who,
        eventId,
        significance,
        year: this.state.year,
        atMinute: this.state.minute,
      },
    })
  }

  // ---- checkpoints ---------------------------------------------------------------

  /**
   * להתחיל את היום מחדש — the log cut back to the latest actual day boundary.
   *
   * Multi-day chapters already write `day.entered`; treating the whole chapter as "today"
   * meant a player in 1996/2018 could lose several authored days while the menu promised
   * only a morning reset. We now prefer the latest `day.entered` that happened inside the
   * current chapter, and fall back to `chapter.entered` for ordinary one-day chapters.
   * The boundary event itself is kept, so its reducer reconstructs the same morning with
   * the same persistent life facts. Returns false only when no chapter boundary exists.
   */
  restartDay(): boolean {
    let chapterAt = -1
    for (let i = this.events.length - 1; i >= 0; i -= 1) {
      if (this.events[i]?.t === 'chapter.entered') {
        chapterAt = i
        break
      }
    }
    if (chapterAt < 0) return false

    let dayAt = -1
    for (let i = this.events.length - 1; i > chapterAt; i -= 1) {
      if (this.events[i]?.t === 'day.entered') {
        dayAt = i
        break
      }
    }

    const at = dayAt >= 0 ? dayAt : chapterAt
    this.events = this.events.slice(0, at + 1)
    this.state = this.events.reduce<LifeState>(apply, emptyState(this.identity, this.year))
    this.checkpoint = null
    this.earned = []
    for (const listener of this.listeners) listener(this.state)
    this.markDirty(true)
    return true
  }

  // ---- persistence ---------------------------------------------------------------

  private markDirty(immediate: boolean) {
    this.dirty = true
    if (immediate) {
      void this.save()
      return
    }
    if (this.timer) return
    this.timer = setTimeout(() => {
      this.timer = null
      void this.save()
    }, AUTOSAVE_MS)
  }

  async save(): Promise<boolean> {
    if (!this.dirty) return true
    this.dirty = false
    const file: SaveFile = {
      version: SAVE_VERSION,
      identity: this.identity,
      year: this.year,
      events: this.events,
      savedAt: new Date().toISOString(),
      checkpoint: this.checkpoint,
    }
    return lifeStore.write(file)
  }

  destroy() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.listeners.clear()
  }
}

/**
 * Open the saved life, or start one. The caller never touches the store directly.
 *
 * A brand new life gets its seed here, as the first row in its own log — which is the
 * only place in the game `Math.random` is allowed to be called. From that moment the
 * whole playthrough is reproducible from the save alone, and the second playthrough is
 * different because it is a different seed rather than because anything is unpredictable.
 */
export async function loadLife(fallback: PlayerIdentity, year: number): Promise<LifeEngine> {
  const file = await lifeStore.read()
  if (!file) {
    const engine = new LifeEngine(fallback, year)
    engine.dispatch({ t: 'rng.seeded', seed: freshSeed(year) })
    return engine
  }
  const engine = new LifeEngine(file.identity, file.year, file.events)
  if (file.checkpoint) engine.mark(file.checkpoint)
  return engine
}

/**
 * עדות על עוגן שאול — `presence.recorded`, `anchor.attended` ו-`anchor.missed` שנכתבים
 * בפרק שהעוגן שלו שייך לפרק אחר. לא נכתבים ליומן בכלל: יומן הוא רק-הוספה (כלל 45),
 * ושורה שאומרת "היה בפנים" על ערב שהפרק הזה לא היה בו היא עדות שקר שאי אפשר למחוק.
 */
export function borrowsPresence(chapter: string, event: LifeEvent): boolean {
  if (event.t !== 'presence.recorded' && event.t !== 'anchor.attended' && event.t !== 'anchor.missed') return false
  const key = borrowedAnchorKey(chapter)
  return key !== null && (event.anchorId === key || event.anchorId.startsWith(`${key}:`))
}

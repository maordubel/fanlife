/**
 * עולם בלי מסך — a headless player for THE WORKER LIFE (Director V3 §14, 24.9.2026).
 *
 * `npm run life:play` drives the real Phaser game in a browser and is the acceptance
 * script; it is also slow, and it cannot be asked "what if he closes this box by mistake"
 * in forty variations. This is the same world read as data — the rooms of `scenes.ts`, the
 * beats of the chapter, the real `DialogueRunner` over the real `LifeEngine` — with the
 * two things a person does in it: walk through a door, and press the button on something
 * that is standing there. It plays beats the way `WorldScene.runBeats` does (a beat whose
 * `when` still holds after it ran is armed again), and it can be reloaded from its own log.
 *
 * It is not a second engine: no content rule lives here. If this file and the runtime
 * disagree, the runtime is right and this file is the bug.
 */
import { DEVELOPMENT_ANCHOR } from '@/lib/life/anchors'
import { beatFlag, beatsAt, type Beat, type BeatAction } from '@/lib/life/content/beats'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { CHAPTER } from '@/lib/life/content/chapters'
import { eraFor } from '@/lib/life/content/era'
import { MATCH_SCRIPTS } from '@/lib/life/content/matchScripts'
import { STORY_CHORES, STORY_CHORE_PREFIX } from '@/lib/life/content/storyChores'
import { LifeEngine } from '@/lib/life/engine'
import type { LifeEvent } from '@/lib/life/events'
import { LifeBus, type DialogueChoice } from '@/lib/life/runtime/bus'
import { DialogueRunner } from '@/lib/life/runtime/dialogue'
import type { LocationId } from '@/lib/life/types'
import { SCENE, inEra, exitInEra, needsFor, sceneIn, whenFor } from '@/lib/life/world/scenes'
import { meets } from '@/lib/life/world/types'
import { NOTE_BOARDS } from '@/lib/life/content/noteBoards'
import { BOARD_PREFIX, resolveCards, settleWith, type NoteBoardDef } from '@/lib/life/noteBoards'

export type Thing =
  | { kind: 'actor'; id: string; act: string; label: string; x: number }
  | { kind: 'spot'; id: string; act: string; label: string; x: number; verb: string }
  | { kind: 'exit'; id: string; to: LocationId; spawn: string; label: string; x: number; locked: boolean }

/** the verbs of a hotspot that are done with the hands (Director V3 §13 B) */
export const HAND_VERBS: ReadonlySet<string> = new Set(['take', 'enter', 'exit', 'sit', 'play', 'buy', 'hold'])

/** walking away mid-sentence — not a choice id (a choice may well be called `leave`) */
export const WALK_AWAY = '__walk-away__'

/** how the simulated player answers a box: pick a choice id, or walk away mid-sentence */
export type Answer = string | ((choices: readonly DialogueChoice[]) => string)

export class WorldSim {
  engine: LifeEngine
  dialogue: DialogueRunner
  readonly chapter: string
  readonly endings: string[] = []
  readonly opened: string[] = []
  private bus = new LifeBus()
  private open = false
  private choices: DialogueChoice[] | null = null
  private pendingTravel: { to: LocationId; spawn: string } | null = null
  /** what a beat's `talk` is answered with — a confused player closes it */
  beatAnswer: Answer = WALK_AWAY

  /**
   * מדדי V3 (§13) — what the hands did, and how long the eyes went without them.
   *
   * `streak` counts answers picked in a row with nothing done in between: a door walked
   * through, a person or a thing walked up to, a played scene. A beat that opens a box by
   * itself does not reset it — nobody moved. `verbs` is every physical verb the walk used:
   * `walk`, the verb of a hotspot pressed (`take`, `enter`, `sit`, `play`, `buy`), and the
   * played scene a conversation opened (`chore:carry`, `ride`, `football`, a gesture…).
   */
  streak = 0
  maxStreak = 0
  /** where in `trace` the longest streak ended */
  streakAt = 0
  readonly verbs = new Set<string>()
  /** one row per thing the player did, for a failing test's message */
  readonly trace: string[] = []
  /** the played scenes the sim was asked to run, by kind (set by the test's `onMinigame`) */
  verbOf: (id: string) => string = (id) => {
    if (id.startsWith('ride:')) return 'ride'
    if (id.startsWith(`chore:${STORY_CHORE_PREFIX}`)) return `chore:${STORY_CHORES[id.slice(`chore:${STORY_CHORE_PREFIX}`.length)]?.shape.mode ?? 'story'}`
    if (id.startsWith('chore:')) return 'chore'
    return id
  }

  constructor(chapter: string, log?: readonly LifeEvent[]) {
    this.chapter = chapter
    const def = CHAPTER[chapter]
    if (!def) throw new Error(`no chapter ${chapter}`)
    if (log) {
      this.engine = new LifeEngine(DEFAULT_IDENTITY, def.year, log)
    } else {
      this.engine = new LifeEngine(DEFAULT_IDENTITY, def.year)
      this.engine.dispatch(
        { t: 'year.entered', year: def.year, weekday: def.weekday, minute: def.minute },
        { t: 'chapter.entered', chapter },
      )
      const entry = def.entry?.(this.engine.state) ?? []
      if (entry.length) this.engine.dispatch(...entry)
    }
    this.bus.on('dialogue', (payload) => {
      this.open = payload !== null
      this.choices = payload?.choices && payload.choices.length ? payload.choices : null
    })
    const anchor = { ...DEVELOPMENT_ANCHOR, year: def.year, match: null }
    this.dialogue = new DialogueRunner(
      this.engine,
      this.bus,
      {
        travel: (to, spawn) => {
          this.pendingTravel = { to: to as LocationId, spawn }
        },
        minigame: (id) => {
          this.minigames.push(id)
          this.pendingMinigame = id
        },
        ending: (id) => {
          this.endings.push(id)
          this.engine.dispatch({ t: 'chapter.completed', chapter: this.chapter })
        },
        onOpen: () => undefined,
      },
      DEVELOPMENT_ANCHOR,
      { [chapter]: anchor },
    )
    if (!log) this.go(def.start.location)
    else this.settle()
  }

  readonly minigames: string[] = []
  /** where the sim puts each scrap of a board — a test may replace it (the default is honest) */
  boardPlacement: (def: NoteBoardDef) => Record<string, string> = (def) =>
    Object.fromEntries(resolveCards(def, this.engine.state).map((card) => [card.id, card.fits ?? def.columns[0]!.id]))
  private pendingMinigame: string | null = null
  /**
   * what a played interaction does when the sim reaches it — a chore, a ride. The default
   * does nothing, which is what a player who closes the tab does; a test that wants the
   * work done supplies it (the runtime's scene is not simulated here).
   */
  onMinigame: (id: string, sim: WorldSim) => void = () => undefined

  get state() {
    return this.engine.state
  }

  get location(): LocationId {
    return this.engine.state.location
  }

  /** a reload: a new engine and a new runner over the same log, in the same room */
  reload(): WorldSim {
    return new WorldSim(this.chapter, this.engine.log())
  }

  /** everything in this room a person could walk up to right now */
  things(): Thing[] {
    const base = SCENE[this.location as keyof typeof SCENE]
    if (!base) return []
    const room = sceneIn(base, this.chapter)
    const state = this.engine.state
    const out: Thing[] = []
    for (const actor of room.actors) {
      if (!actor.talk || !inEra(actor, this.chapter) || !meets(state, actor.when)) continue
      out.push({ kind: 'actor', id: actor.id, act: actor.talk, label: actor.nameHe, x: actor.x })
    }
    for (const spot of room.hotspots) {
      if (!inEra(spot, this.chapter) || !meets(state, spot.when)) continue
      out.push({ kind: 'spot', id: spot.id, act: spot.act, label: spot.labelHe, x: spot.x, verb: spot.verb })
    }
    for (const exit of room.exits) {
      if (!exitInEra(exit, this.chapter) || !meets(state, whenFor(exit, this.chapter))) continue
      out.push({ kind: 'exit', id: exit.id, to: exit.to, spawn: exit.spawn, label: exit.labelHe, x: exit.x, locked: !meets(state, needsFor(exit, this.chapter)) })
    }
    return out
  }

  find(id: string): Thing | undefined {
    return this.things().find((thing) => thing.id === id || (thing.kind !== 'exit' && thing.act === id))
  }

  /** walk through a door (or be carried through one by a beat) */
  go(to: LocationId) {
    this.engine.dispatch({ t: 'moved', to })
    this.beats('enter')
    this.settle()
  }

  /** the clock moves; clock beats get their turn */
  wait(minutes: number) {
    this.engine.dispatch({ t: 'clock.advanced', minutes })
    this.settle()
  }

  /** press the button on a person or a thing in this room */
  press(id: string, answer: Answer = WALK_AWAY): boolean {
    const thing = this.find(id)
    if (!thing || thing.kind === 'exit') return false
    this.streak = 0
    if (thing.kind === 'spot' && HAND_VERBS.has(thing.verb)) this.verbs.add(thing.verb)
    this.trace.push(`${thing.kind === 'spot' ? thing.verb : 'talk'}:${thing.id}`)
    this.converse(thing.act, answer)
    this.settle()
    return true
  }

  /** walk through the exit with this id */
  exit(id: string): boolean {
    const door = this.things().find((thing) => thing.kind === 'exit' && thing.id === id)
    if (!door || door.kind !== 'exit' || door.locked) return false
    this.streak = 0
    this.verbs.add('walk')
    this.trace.push(`walk:${door.to}`)
    this.go(door.to)
    return true
  }

  /** a conversation, read to its end or left mid-sentence */
  converse(id: string, answer: Answer) {
    if (!this.dialogue.start(id)) return
    this.opened.push(id)
    for (let guard = 0; guard < 80 && this.open; guard += 1) {
      if (this.choices) {
        const pick = typeof answer === 'function' ? answer(this.choices) : answer
        if (pick === WALK_AWAY) {
          this.dialogue.leave()
          break
        }
        const enabled = this.choices.find((choice) => choice.id === pick && choice.enabled)
        if (!enabled) {
          this.dialogue.leave()
          break
        }
        this.streak += 1
        if (this.streak > this.maxStreak) this.streakAt = this.trace.length
        this.maxStreak = Math.max(this.maxStreak, this.streak)
        this.trace.push(`choice:${id}/${pick}`)
        this.dialogue.choose(pick)
        continue
      }
      if (answer === WALK_AWAY && guard === 0) {
        this.dialogue.leave()
        break
      }
      this.dialogue.advance()
    }
    if (this.open) this.dialogue.leave()
  }

  /** travel queued by a conversation, then any beat that is now due, until nothing moves */
  private settle() {
    for (let guard = 0; guard < 20; guard += 1) {
      if (this.pendingMinigame) {
        const id = this.pendingMinigame
        this.pendingMinigame = null
        this.streak = 0
        this.verbs.add(this.verbOf(id))
        this.trace.push(`play:${id}`)
        // הפתק — a board is a sheet over the room, not a scene: the sim sorts every scrap into
        // its honest column (or the first one) and folds it, exactly as the shell settles it
        if (id.startsWith(BOARD_PREFIX)) {
          const def = NOTE_BOARDS[id.slice(BOARD_PREFIX.length)]
          if (def) {
            const placed = this.boardPlacement(def)
            const outcome = settleWith(def, placed, this.engine.state)
            this.engine.dispatch(...outcome.events)
            if (outcome.after) this.converse(outcome.after, this.beatAnswer)
          }
          continue
        }
        this.onMinigame(id, this)
        continue
      }
      if (this.pendingTravel) {
        const { to } = this.pendingTravel
        this.pendingTravel = null
        this.engine.dispatch({ t: 'moved', to })
        this.beats('enter')
        continue
      }
      if (!this.beats('clock')) break
    }
  }

  private beats(trigger: Beat['trigger']): boolean {
    // the chapter has closed on its card: the runtime stops the room, and so does this
    if (this.endings.length) return false
    const era = eraFor(this.chapter)
    let ran = false
    for (let guard = 0; guard < 12; guard += 1) {
      const state = this.engine.state
      const due = beatsAt(era.beats, trigger, this.location).find((beat) => !state.flags[beatFlag(beat.id)] && meets(state, beat.when))
      if (!due) break
      ran = true
      this.engine.dispatch({ t: 'flag.raised', flag: beatFlag(due.id) })
      const moved = this.actions([...due.do])
      if (meets(this.engine.state, due.when)) this.engine.dispatch({ t: 'flag.set', flag: beatFlag(due.id), value: false })
      if (moved) break
      // an armed-again beat would loop here forever; the room's own breath is not simulated
      if (!this.engine.state.flags[beatFlag(due.id)]) break
    }
    return ran
  }

  /** returns true when the beat changed the room */
  private actions(list: BeatAction[]): boolean {
    for (const action of list) {
      switch (action.a) {
        // a card over black is a cut: the moment the player was in has ended (V3 §13 A)
        case 'card':
          this.streak = 0
          break
        case 'flag':
          this.engine.dispatch({ t: 'flag.raised', flag: action.flag })
          break
        case 'events':
          this.engine.dispatch(...action.events)
          break
        case 'derive': {
          const events = action.events(this.engine.state)
          if (events.length) this.engine.dispatch(...events)
          break
        }
        case 'presence':
          this.engine.dispatch({ t: 'presence.recorded', anchorId: 'sim', mode: action.mode })
          break
        case 'talk':
          this.converse(action.conversation, this.beatAnswer)
          if (this.pendingTravel) return true
          break
        case 'travel':
          this.pendingTravel = { to: action.to, spawn: action.spawn }
          return true
        case 'match': {
          // the directed match is watched, not simulated: what it opens is what is tested
          const script = MATCH_SCRIPTS[action.script]
          this.verbs.add('match')
          this.trace.push(`match:${action.script}`)
          for (const step of script?.steps ?? []) {
            // the board moves and the terrace answers between two of its questions
            this.streak = 0
            if (step.talk) this.converse(step.talk, this.beatAnswer)
          }
          if (this.pendingTravel) return true
          break
        }
        // (delta 93) presentation only: the sim records who took the step, nothing else moves
        case 'actorCue':
          this.trace.push(`cue:${action.actorId}:${action.cue}`)
          break
        case 'ending':
          this.endings.push(action.id)
          this.engine.dispatch({ t: 'chapter.completed', chapter: this.chapter })
          return true
        default:
          break
      }
    }
    return false
  }
}

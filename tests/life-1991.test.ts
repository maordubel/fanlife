import { describe, expect, it } from 'vitest'

import { STORY_CHORES } from '@/lib/life/content/storyChores'

import { DEVELOPMENT_ANCHOR, isPlaceholder, type HistoricalAnchor } from '@/lib/life/anchors'
import { resolveChapterAnchor, resolveUssishkinAnchor } from '@/lib/life/anchor-server'
import { CHARACTERS } from '@/lib/life/characters'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import {
  CLASSROOM_1991,
  closing1991,
  CURFEW,
  ENDINGS_1991,
  HOME_NIGHT_1991,
  TIP_OFF,
} from '@/lib/life/content/chapter1991'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { CONVERSATIONS_1991 } from '@/lib/life/content/dialogue1991'
import { ERA_1986, ERA_1990, ERA_1991, eraFor } from '@/lib/life/content/era'
import { OPPORTUNITIES_1991 } from '@/lib/life/content/opportunities1991'
import { SCHEDULE_1991 } from '@/lib/life/content/schedules1991'
import { LifeEngine } from '@/lib/life/engine'
import type { LifeEvent } from '@/lib/life/events'
import { CANDIDATES_1991, candidatesFor, pickRedBoxItem } from '@/lib/life/redbox'
import { FIGURE, PORTRAIT_ART, PROP } from '@/lib/life/runtime/art'
import { LifeBus } from '@/lib/life/runtime/bus'
import { DerbyNight, derbyFinalBoard, derbyMarginHe } from '@/lib/life/runtime/derby1991'
import { DialogueRunner } from '@/lib/life/runtime/dialogue'
import { ALL_SCENES, artFor, blockedFor, exitInEra, needsFor, sceneFor } from '@/lib/life/world/scenes'
import { meets } from '@/lib/life/world/types'

/**
 * ליל אוסישקין — what the second movement of Stage B promises before a browser opens.
 *
 * Three claims this suite exists to keep, and they are the three the chapter could most
 * easily break:
 *
 *  1. **The archive is the only place a number comes from.** The derby's final is a row
 *     in `content/manual/basketball-matches.json`, resolved as BASKETBALL, and no line of
 *     authored Hebrew anywhere in the chapter states a score, a margin, a quarter or a
 *     player. The one margin the game speaks is computed from the anchor.
 *  2. **Every route exists.** Stayed, left at the curfew, and never went — all three end
 *     the chapter, all three keep something in the box, and none of them is a Game Over.
 *  3. **The rooms are real rooms.** Two new ones, walkable, lit, reachable, with people
 *     the schedule can actually drive.
 */

const identity = DEFAULT_IDENTITY

/** a life that has finished 1990 and just crossed the bridge into March */
function inMarch(minute = 8 * 60 + 10, flags: string[] = []): LifeEngine {
  const engine = new LifeEngine(identity, 1986)
  engine.dispatch(
    { t: 'flag.raised', flag: 'prologue:done' },
    { t: 'chapter.entered', chapter: '1986' },
    { t: 'chapter.completed', chapter: '1986' },
    { t: 'year.entered', year: 1990, weekday: 6, minute: 12 * 60 + 35 },
    { t: 'chapter.entered', chapter: '1990' },
    { t: 'chapter.completed', chapter: '1990' },
    { t: 'year.entered', year: 1991, weekday: 1, minute },
    { t: 'chapter.entered', chapter: '1991' },
    ...flags.map((flag) => ({ t: 'flag.raised', flag }) as LifeEvent),
  )
  return engine
}

describe('העוגן — 11.3.1991 comes out of the archive, as basketball, or not at all', () => {
  const anchor = resolveUssishkinAnchor()

  it('resolves the derby from the basketball store at confidence 2', () => {
    expect(anchor.sport).toBe('basketball')
    expect(anchor.confidence).toBeGreaterThanOrEqual(2)
    expect(anchor.match).not.toBeNull()
    expect(anchor.match?.playedOn).toBe('1991-03-11')
    expect(anchor.match?.atHome).toBe(true)
    expect(anchor.sourceUrl).toBeTruthy()
    expect(isPlaceholder(anchor)).toBe(false)
  })

  it('states nothing the archive does not hold — no scorer, no quarters', () => {
    expect(anchor.match?.decidedBy).toBeNull()
    expect(anchor.titlesSoFar).toBeNull()
  })

  it('never leaks into the football canon', () => {
    const football = resolveChapterAnchor()
    expect(football.sport).toBe('football')
    expect(football.id).not.toBe(anchor.id)
    expect(anchor.id).toContain('derby:')
  })

  it('reads the margin off the anchor rather than out of a dialogue file', () => {
    const margin = derbyMarginHe(anchor)
    expect(margin).toBeTruthy()
    // a word, not a number — the whisper in the classroom is Hebrew, not arithmetic
    expect(/\d/.test(margin ?? '')).toBe(false)
    expect(derbyMarginHe({ ...anchor, match: null })).toBeNull()
    const board = derbyFinalBoard(anchor)
    expect(board?.over).toBe(true)
    expect(board!.homeScore).toBeGreaterThan(board!.awayScore)
  })

  it('says what is missing when the row is gone, instead of inventing it', () => {
    const empty: HistoricalAnchor = { ...anchor, match: null, placeholder: { what: 'x', needs: 'y' } }
    expect(isPlaceholder(empty)).toBe(true)
    expect(derbyFinalBoard(empty)).toBeNull()
  })
})

describe('העידן — 1991 is a chapter like the others', () => {
  it('resolves, and does not disturb the two before it', () => {
    expect(eraFor('1991')).toBe(ERA_1991)
    expect(eraFor('1986')).toBe(ERA_1986)
    expect(eraFor('1990')).toBe(ERA_1990)
    expect(ERA_1991.anchorKey).toBe('1991')
    expect(ERA_1991.memoryPrefix).toBe('1991')
    expect(ERA_1991.cutscene).toBeNull()
  })

  it('draws the boy and every plate from art that exists', () => {
    const figures = new Set<string>(FIGURE)
    const plates = new Set<string>(PORTRAIT_ART)
    for (const key of [...Object.values(ERA_1991.player.pose), ...ERA_1991.player.walk]) {
      expect(figures.has(key), key).toBe(true)
    }
    for (const [who, plate] of Object.entries(ERA_1991.portraits)) {
      expect(plates.has(plate), `${who} → ${plate}`).toBe(true)
    }
  })

  it('gives every speaker in the chapter a face', () => {
    const speakers = new Set<string>()
    for (const line of [...CLASSROOM_1991, ...HOME_NIGHT_1991, ...closing1991('עשר'), ...DerbyNight.wallLines()]) {
      if (line.who) speakers.add(line.who)
    }
    for (const conversation of CONVERSATIONS_1991) {
      for (const branch of conversation.branches) for (const line of branch.lines) if (line.who) speakers.add(line.who)
    }
    for (const who of speakers) expect(ERA_1991.portraits[who], `${who} has no plate in 1991`).toBeDefined()
  })

  it('has a door out of every room in 1991', () => {
    for (const scene of ALL_SCENES) {
      if (scene.id === 'bloomfield-inside') continue
      const doors = scene.exits.filter((exit) => exitInEra(exit, '1991'))
      expect(doors.length, `${scene.id} has no door in 1991`).toBeGreaterThan(0)
    }
  })

  it('drives only people the world has, in rooms that exist, inside the walk band', () => {
    const actors = new Set<string>()
    for (const scene of ALL_SCENES) for (const actor of scene.actors) if (actor.era === '1991' || actor.era === '*') actors.add(actor.id)
    for (const entry of SCHEDULE_1991) {
      expect(actors.has(entry.actorId), `schedule drives ${entry.actorId}, which no 1991 scene has`).toBe(true)
      expect(CHARACTERS[entry.characterId], `${entry.characterId} is not in the cast`).toBeDefined()
      const scene = sceneFor(entry.location)
      expect(scene.id).toBe(entry.location)
      expect(entry.end).toBeGreaterThan(entry.start)
      if (entry.y !== undefined) {
        expect(entry.y, `${entry.actorId} above the band`).toBeGreaterThanOrEqual(scene.band.far)
        expect(entry.y, `${entry.actorId} below the band`).toBeLessThanOrEqual(scene.band.near)
      }
      if (entry.x === undefined) continue
      for (const exit of scene.exits) {
        if (!exitInEra(exit, '1991')) continue
        const inDoor = entry.x > exit.x - 0.01 && entry.x < exit.x + exit.w + 0.01
        expect(inDoor, `${entry.actorId} stands in the doorway "${exit.id}" of ${scene.id}`).toBe(false)
      }
    }
  })

  /**
   * 6.9.2026 — the gate is a gate in every year now.
   *
   * It used to be tagged `era: '1991'`, and this test used to check that. The reason was
   * good and wrong: the gate was drawn at 0.62–0.69 of the street, which is the middle of
   * the concrete wall and also exactly where the 1990 street stands its man with the
   * radio, so the tag was hiding a placement bug. Maor found the placement bug from the
   * other end — he sent the frame with the marker floating on bare wall — and listed the
   * doors the street should have, with "בית ספר" in every one of them and no year on it.
   *
   * So the gate moved onto the shopfront he drew a box round, and the tag came off. A
   * schoolyard on a Saturday is not shut in this neighbourhood; it is where the game is.
   */
  it('opens the school in every year, on the shopfront rather than in the wall', () => {
    const gate = sceneFor('street').exits.find((exit) => exit.id === 'school')
    expect(gate).toBeDefined()
    expect(exitInEra(gate!, '1991')).toBe(true)
    expect(exitInEra(gate!, '1986')).toBe(true)
    expect(gate!.x).toBeGreaterThan(0.75)
    expect(sceneFor('classroom').exits.some((exit) => exit.to === 'schoolyard')).toBe(true)
    expect(sceneFor('schoolyard').exits.some((exit) => exit.to === 'classroom')).toBe(true)
  })

  it('locks the front door at night behind permission or a note, and says so in the right words', () => {
    const front = sceneFor('home').exits.find((exit) => exit.id === 'street')!
    const evening = { ...inMarch(20 * 60).state }
    expect(meets(evening, needsFor(front, '1991'))).toBe(false)
    expect(blockedFor(front, '1991')).toContain('אמא')
    // (Director V3 §11) 1986 has no key lock any more, so it has no refusal sentence either
    expect(meets(evening, needsFor(front, '1986'))).toBe(true)
    const allowed = inMarch(20 * 60, ['permission:yes']).state
    expect(meets(allowed, needsFor(front, '1991'))).toBe(true)
    const sneaking = inMarch(20 * 60, ['sneak:ready']).state
    expect(meets(sneaking, needsFor(front, '1991'))).toBe(true)
    // …and the afternoon is an ordinary door
    expect(meets(inMarch(16 * 60).state, needsFor(front, '1991'))).toBe(true)
  })

  it('paints the rooms 1991 shares with 1990 in the 1990 paint', () => {
    expect(artFor(sceneFor('bedroom'), '1991')).toBe('bedroom90')
    expect(artFor(sceneFor('street'), '1991')).toBe('street90')
    expect(artFor(sceneFor('classroom'), '1991')).toBe('classroom')
  })
})

describe('התוכן של 1991 — invented life, sourced history, and never the other way round', () => {
  const authored = [
    ...CLASSROOM_1991,
    ...HOME_NIGHT_1991,
    ...DerbyNight.wallLines(),
    ...CONVERSATIONS_1991.flatMap((c) => c.branches.flatMap((b) => b.lines)),
  ]
    .map((line) => line.text)
    .join('\n')

  it('states no scoreline anywhere in the chapter', () => {
    expect(/\d+\s*[:\-–—]\s*\d+/.test(authored), 'a scoreline appears').toBe(false)
    expect(authored.includes('97'), 'the final is typed into a line').toBe(false)
    expect(authored.includes('87'), 'the final is typed into a line').toBe(false)
  })

  it('names no player of that night, and no opponent', () => {
    for (const name of ['אמסלם', 'פרישמן', 'שפר', 'מכבי']) {
      expect(authored.includes(name), `${name} is named in authored 1991 content`).toBe(false)
    }
  })

  it('points every jump, journey and ending at something that exists', () => {
    const scenes = new Set(ALL_SCENES.map((scene) => scene.id))
    for (const conversation of CONVERSATIONS_1991) {
      for (const branch of conversation.branches) {
        const effects = [...(branch.then ?? []), ...(branch.choices ?? []).flatMap((choice) => choice.then)]
        for (const effect of effects) {
          if (effect.e === 'goto') expect(DIALOGUE[effect.node], `${conversation.id} → ${effect.node}`).toBeDefined()
          if (effect.e === 'travel') expect(scenes.has(effect.to), `${conversation.id} → ${effect.to}`).toBe(true)
          if (effect.e === 'ending') {
            expect(ERA_1991.endings[effect.id], `${conversation.id} → ending ${effect.id}`).toBeDefined()
          }
          if (effect.e === 'seize') {
            expect(
              OPPORTUNITIES_1991.some((entry) => entry.id === effect.opportunity),
              `${conversation.id} seizes ${effect.opportunity}`,
            ).toBe(true)
          }
        }
      }
    }
  })

  it('gives all three endings a memory that the box can draw', () => {
    const props = new Set<string>(PROP)
    for (const ending of Object.values(ENDINGS_1991)) {
      expect(ending.bodyHe.length).toBeGreaterThan(30)
      expect(ending.memoryItem.length).toBeGreaterThan(0)
      expect(ending.memoryHe.length).toBeGreaterThan(20)
    }
    for (const candidate of CANDIDATES_1991) {
      expect(candidate.weight).toBeGreaterThan(0)
      expect(candidate.titleHe.length).toBeGreaterThan(1)
    }
    // every 1991 object is drawn from a real prop sheet
    expect(props.has('propNote')).toBe(true)
    expect(props.has('propScorePaper')).toBe(true)
    expect(props.has('propTicket91')).toBe(true)
  })

  it('keeps a different thing depending on how the night went', () => {
    const stand = inMarch(22 * 60, ['uss:arrived', 'derby:over'])
    stand.dispatch({ t: 'item.gained', item: 'school-note' })
    const kept = pickRedBoxItem(stand.state, candidatesFor('1991'))
    expect(kept.item).not.toBeNull()
    expect(['note', 'score', 'stub-1991', 'wrapper', 'clipping-1991'].some((id) => kept.item!.id.endsWith(id))).toBe(true)
    // …and a boy who never left the house can still only keep the clipping
    const home = inMarch(22 * 60, ['derby:over'])
    const alone = pickRedBoxItem(home.state, candidatesFor('1991'))
    expect(alone.item?.id.endsWith('clipping-1991')).toBe(true)
    // 1986 and 1990 keep the list they always kept
    expect(candidatesFor('1990')).not.toBe(CANDIDATES_1991)
  })

  it('opens five windows and closes every one of them on its own', () => {
    for (const window of OPPORTUNITIES_1991) {
      expect(window.era).toBe('1991')
      expect(window.expires).toBeGreaterThan(window.start)
      expect(window.outcomes.length).toBeGreaterThan(0)
      expect(window.goneHe, `${window.id} does not say what the world looks like after`).toBeTruthy()
    }
  })
})

describe('השיחות של 1991 — played headless through the runner', () => {
  const runner = (flags: string[], minute = 8 * 60 + 20) => {
    const engine = inMarch(minute, flags)
    const bus = new LifeBus()
    const endings: string[] = []
    const anchor = resolveUssishkinAnchor()
    const dialogue = new DialogueRunner(
      engine,
      bus,
      {
        travel: () => undefined,
        minigame: () => undefined,
        ending: (id) => endings.push(id),
        onOpen: () => undefined,
      },
      DEVELOPMENT_ANCHOR,
      { '1991': anchor },
    )
    const drain = () => {
      for (let i = 0; i < 24; i += 1) dialogue.advance()
    }
    return { engine, dialogue, endings, drain }
  }

  it('the note: waiting for the chalk gets it through, and rushing gets it taken', () => {
    const patient = runner(['note:read'])
    expect(patient.dialogue.start('note-1991')).toBe(true)
    patient.drain()
    patient.dialogue.choose('wait')
    expect(patient.engine.state.flags['note:answered']).toBe(true)
    expect(patient.engine.state.flags['plan:tonight']).toBe(true)

    const rash = runner(['note:read'])
    rash.dialogue.start('note-1991')
    rash.drain()
    rash.dialogue.choose('now')
    // the goto lands on the teacher, who takes it and sets homework — not a Game Over
    rash.drain()
    expect(rash.engine.state.flags['note:caught']).toBe(true)
    expect(rash.engine.state.flags['hw:given']).toBe(true)
    expect(rash.engine.state.relationshipMemory.some((entry) => entry.characterId === 'teacher')).toBe(true)
  })

  it('the homework is three different evenings, and each one costs its own time', () => {
    // (Director V3 §12, 25.9.2026) the page is worked with the hands: sitting down opens the
    // chore, and how many of the thirteen were picked up decides which evening it was
    const all = runner(['hw:given'], 16 * 60)
    all.dialogue.start('homework-1991')
    all.drain()
    all.dialogue.choose('work')
    const homework = STORY_CHORES['homework-91']!
    all.engine.dispatch(...homework.finish(13, 13))
    expect(all.engine.state.flags['hw:done']).toBe(true)
    expect(all.engine.state.minute).toBe(16 * 60 + 50)

    const half = runner(['hw:given'], 16 * 60)
    half.engine.dispatch(...homework.finish(7, 13))
    expect(half.engine.state.flags['hw:half']).toBe(true)
    expect(half.engine.state.minute).toBe(16 * 60 + 20)

    const fake = runner(['hw:given'], 16 * 60)
    fake.dialogue.start('homework-1991')
    fake.drain()
    fake.dialogue.choose('fake')
    expect(fake.engine.state.flags['hw:faked']).toBe(true)
    expect(fake.engine.state.minute).toBe(16 * 60 + 8)
  })

  it('Rachel: the truth is a yes, the push is a no, and a no is a branch', () => {
    const honest = runner(['hw:given', 'hw:half'], 17 * 60)
    honest.dialogue.start('rachel-1991')
    honest.drain()
    honest.dialogue.choose('truth')
    expect(honest.engine.state.flags['permission:yes']).toBe(true)

    const pushy = runner(['hw:given', 'hw:half'], 17 * 60)
    pushy.dialogue.start('rachel-1991')
    pushy.drain()
    pushy.dialogue.choose('push')
    expect(pushy.engine.state.flags['permission:no']).toBe(true)
    expect(pushy.engine.state.relationships['rachel']?.tension).toBeGreaterThan(0)

    // …and the refused boy can still leave a note on the kitchen table
    const sneak = runner(['permission:no'], 19 * 60 + 30)
    sneak.dialogue.start('kitchen-note-1991')
    sneak.drain()
    sneak.dialogue.choose('note')
    expect(sneak.engine.state.flags['sneak:ready']).toBe(true)
  })

  it('closes the chapter three ways, and every one of them keeps something', () => {
    const late = runner(['uss:arrived', 'derby:over', 'curfew:broken'], 22 * 60 + 10)
    late.dialogue.start('rachel-1991')
    late.drain()
    expect(late.endings).toEqual(['hall'])
    expect(late.engine.state.redBox.length).toBe(1)

    const ontime = runner(['uss:arrived', 'derby:over', 'curfew:kept', 'heard:wall'], 21 * 60 + 45)
    ontime.dialogue.start('rachel-1991')
    ontime.drain()
    expect(ontime.endings).toEqual(['wall'])

    const absent = runner(['derby:over'], 22 * 60 + 30)
    absent.dialogue.start('rachel-1991')
    absent.drain()
    expect(absent.endings).toEqual(['missed'])
  })

  it('the step is held by standing on it, and the friend notices either way', () => {
    const held = runner(['spot:asked'], 19 * 60 + 40)
    held.dialogue.start('hall-spot')
    held.drain()
    expect(held.engine.state.flags['spot:held']).toBe(true)
    held.dialogue.start('amit-hall')
    held.drain()
    expect(held.engine.state.bonds['amit']).toBeGreaterThan(0)
  })

  it('the chant is forgiving: three ways in, and none of them is wrong', () => {
    for (const choice of ['join', 'help', 'clap']) {
      const night = runner(['uss:arrived'], 20 * 60 + 20)
      night.dialogue.start('derby:chant')
      night.drain()
      night.dialogue.choose(choice)
      const flags = night.engine.state.flags
      expect(flags['chant:joined'] || flags['chant:helped'] || flags['chant:quiet']).toBe(true)
    }
  })
})

describe('הבמאי — the hall runs on a clock, and puts one number on the screen', () => {
  /** A Phaser scene is a canvas and a loop; the director only ever asks it for two things. */
  const fakeScene = () => {
    const calls: Array<() => void> = []
    return {
      scene: {
        cameras: { main: { shake: () => undefined, flash: () => undefined } },
        time: { delayedCall: (_ms: number, fn: () => void) => calls.push(fn) },
      },
      run: () => {
        for (const fn of calls.splice(0)) fn()
      },
    }
  }

  const night = (flags: string[] = ['permission:yes', 'uss:arrived']) => {
    const engine = inMarch(TIP_OFF, flags)
    const bus = new LifeBus()
    const dialogue = new DialogueRunner(
      engine,
      bus,
      { travel: () => undefined, minigame: () => undefined, ending: () => undefined, onOpen: () => undefined },
      DEVELOPMENT_ANCHOR,
      { '1991': resolveUssishkinAnchor() },
    )
    const boards: Array<unknown> = []
    const moods: string[] = []
    let over = false
    let curfew = false
    const fake = fakeScene()
    const derby = new DerbyNight(fake.scene as never, { engine, bus, dialogue } as never, resolveUssishkinAnchor(), {
      onBoard: (board) => boards.push(board),
      onMood: (mood) => moods.push(mood),
      onOver: () => {
        over = true
      },
      onCurfew: () => {
        curfew = true
      },
      playerAt: () => ({ x: 0.5, y: 0.9 }),
      spotAt: () => ({ x: 0.5, y: 0.88 }),
    })
    return { engine, derby, boards, moods, fake, isOver: () => over, sawCurfew: () => curfew }
  }

  it('puts NO score on the strip while the game is alive, and the archive board at the horn', () => {
    const hall = night()
    hall.derby.start()
    expect(hall.boards).toEqual([null])
    for (let i = 0; i < 200; i += 1) hall.derby.tick(1000)
    expect(hall.isOver()).toBe(true)
    const final = hall.boards.at(-1) as { homeScore: number; awayScore: number; over?: boolean }
    expect(final.over).toBe(true)
    expect(final.homeScore).toBe(resolveUssishkinAnchor().match?.scoredFor)
    expect(final.awayScore).toBe(resolveUssishkinAnchor().match?.scoredAgainst)
    // the boards in between are the one at the start and the one at the end. Nothing else.
    expect(hall.boards.length).toBe(2)
  })

  it('brings half past nine to the HUD while the game is still going', () => {
    const hall = night()
    hall.derby.start()
    for (let i = 0; i < 200; i += 1) {
      hall.derby.tick(1000)
      if (hall.sawCurfew()) break
    }
    expect(hall.sawCurfew()).toBe(true)
    expect(hall.engine.state.flags['curfew:now']).toBe(true)
    expect(hall.engine.state.minute).toBeGreaterThanOrEqual(CURFEW)
    expect(hall.isOver()).toBe(false)
  })

  it('does not invent a curfew for a boy nobody set one for', () => {
    const hall = night(['uss:arrived'])
    hall.derby.start()
    for (let i = 0; i < 200; i += 1) hall.derby.tick(1000)
    expect(hall.engine.state.flags['curfew:now']).toBeUndefined()
    expect(hall.engine.state.flags['curfew:broken']).toBeUndefined()
    expect(hall.isOver()).toBe(true)
  })

  it('records staying as staying, and leaving as leaving', () => {
    const stayed = night()
    stayed.derby.start()
    for (let i = 0; i < 200; i += 1) stayed.derby.tick(1000)
    expect(stayed.engine.state.flags['curfew:broken']).toBe(true)
    expect(stayed.engine.state.attendedAnchors.length).toBe(1)

    const left = night()
    left.derby.start()
    for (let i = 0; i < 120; i += 1) left.derby.tick(1000)
    left.derby.leaveEarly()
    expect(left.engine.state.flags['curfew:kept']).toBe(true)
    expect(left.engine.state.flags['heard:wall']).toBe(true)
    expect(left.engine.state.flags['curfew:broken']).toBeUndefined()
    // and the rest of the night cannot happen to him any more
    for (let i = 0; i < 200; i += 1) left.derby.tick(1000)
    expect(left.isOver()).toBe(false)
  })

  it('loses the step when the boy wandered off, and holds it when he did not', () => {
    const away = inMarch(TIP_OFF, ['permission:yes', 'uss:arrived', 'spot:asked'])
    const bus = new LifeBus()
    const dialogue = new DialogueRunner(
      away,
      bus,
      { travel: () => undefined, minigame: () => undefined, ending: () => undefined, onOpen: () => undefined },
      DEVELOPMENT_ANCHOR,
      { '1991': resolveUssishkinAnchor() },
    )
    const fake = fakeScene()
    const derby = new DerbyNight(fake.scene as never, { engine: away, bus, dialogue } as never, resolveUssishkinAnchor(), {
      onBoard: () => undefined,
      onMood: () => undefined,
      onOver: () => undefined,
      onCurfew: () => undefined,
      playerAt: () => ({ x: 0.12, y: 0.9 }),
      spotAt: () => ({ x: 0.5, y: 0.88 }),
    })
    derby.start()
    expect(away.state.flags['spot:lost']).toBe(true)
    expect(away.state.flags['spot:held']).toBeUndefined()
  })
})

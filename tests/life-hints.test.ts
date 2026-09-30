import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '@/lib/life/content/chapters'
import { eraFor } from '@/lib/life/content/era'
import { characterName } from '@/lib/life/characters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { holds, mentionsPerson, peopleNamed } from '@/lib/life/world/hints'
import { ALL_SCENES, blockedFor, exitInEra, inEra, stuckFor, type SceneDef } from '@/lib/life/world/scenes'

/**
 * שהחדר לא ישקר — the room may not name somebody who is not in it.
 *
 * On 6.9.2026 a new life told Maor, in the first room of the first mission, to go and ask
 * his father a question. In 1984 his father is not in that room; the line had been written
 * for one Saturday in 1986 and silently inherited by eighteen other chapters. He looked
 * for the man at every hour, in every room, and concluded the game was broken — which, on
 * the evidence it gave him, it was.
 *
 * The runtime now refuses to print a hint that fails `holds()`, so the WORST case is a
 * blander sentence rather than a wrong one. These tests are the second lock: they fail the
 * build if a hint that names a ghost is ever written again, in any of the nineteen
 * chapters, so nobody has to remember which years have a father in the chair.
 */

const namesIn = (scene: SceneDef, chapter: string): string[] => {
  const out = new Set<string>()
  for (const actor of scene.actors) if (inEra(actor, chapter) && actor.nameHe) out.add(actor.nameHe)
  for (const row of eraFor(chapter).schedule) if (row.location === scene.id) out.add(characterName(row.characterId))
  return [...out]
}

const CHAPTER_IDS = CHAPTERS.filter((chapter) => chapter.playable !== false).map((chapter) => chapter.id)

describe('the matcher', () => {
  it('reads a name through the prefixes Hebrew glues onto it', () => {
    // the exact word from the line that started this: "ואבא בכורסה"
    expect(mentionsPerson('בלי מפתח אמא לא נותנת לצאת. ואבא בכורסה', 'אבא')).toBe(true)
    expect(mentionsPerson('שאבא יגיד', 'אבא')).toBe(true)
    expect(mentionsPerson('הכדור באמצע', 'אבא')).toBe(false)
  })

  it('matches a person by the words in the name the cast list gives them', () => {
    // the kiosk calls him "רפי מהקיוסק"; the hint calls him "רפי"
    expect(holds('רפי מחכה.', ['רפי מהקיוסק'])).toBe(true)
    expect(holds('רפי מחכה.', ['קובי'])).toBe(false)
  })

  it('a line about doors and nothing else always holds', () => {
    expect(peopleNamed('הדלת לרחוב — שמאל.')).toEqual([])
    expect(holds('הדלת לרחוב — שמאל.', [])).toBe(true)
  })
})

describe('every hint in every chapter', () => {
  for (const chapter of CHAPTER_IDS) {
    it(`${chapter}: no room names a person who is not in it`, () => {
      const lies: string[] = []
      for (const scene of ALL_SCENES) {
        const stuck = stuckFor(scene, chapter)
        if (stuck && !holds(stuck, namesIn(scene, chapter))) lies.push(`${scene.id}: «${stuck}»`)
      }
      expect(lies).toEqual([])
    })

    it(`${chapter}: no locked door sends the player to talk to a ghost`, () => {
      const ASKS = /תשאל|תדבר|תבקש|שאל את|דבר עם/u
      const lies: string[] = []
      for (const scene of ALL_SCENES) {
        const here = namesIn(scene, chapter)
        for (const exit of scene.exits) {
          if (!exitInEra(exit, chapter)) continue
          const byEra = (exit as { needsByEra?: Record<string, unknown> }).needsByEra
          const need = byEra && chapter in byEra ? byEra[chapter] : (exit as { needs?: unknown }).needs
          if (need == null) continue
          const blocked = blockedFor(exit, chapter)
          if (blocked && ASKS.test(blocked) && !holds(blocked, here)) lies.push(`${scene.id}/${exit.id}: «${blocked}»`)
        }
      }
      expect(lies).toEqual([])
    })

    it(`${chapter}: every room can be left`, () => {
      const sealed = ALL_SCENES.filter(
        (scene) => scene.id !== 'prologue' && !scene.exits.some((exit) => exitInEra(exit, chapter)),
      ).map((scene) => scene.id)
      expect(sealed).toEqual([])
    })

    it(`${chapter}: every person and thing in the room has a conversation behind it`, () => {
      const RUNTIME = ['pano:', 'net:', 'gig:', 'shop:', 'book:']
      const missing: string[] = []
      for (const scene of ALL_SCENES) {
        for (const actor of scene.actors) {
          if (!inEra(actor, chapter) || !actor.talk || actor.talk.startsWith('net:')) continue
          if (!DIALOGUE[actor.talk]) missing.push(`${scene.id}/${actor.id} → ${actor.talk}`)
        }
        for (const spot of scene.hotspots) {
          if (!inEra(spot, chapter)) continue
          const act = (spot as { act?: string }).act
          if (!act || RUNTIME.some((prefix) => act.startsWith(prefix))) continue
          if (!DIALOGUE[act]) missing.push(`${scene.id}/${spot.id} → ${act}`)
        }
      }
      expect(missing).toEqual([])
    })
  }
})

describe('the conversation graph', () => {
  it('never sends the player to a node that does not exist', () => {
    const broken: string[] = []
    for (const [id, conversation] of Object.entries(DIALOGUE)) {
      for (const branch of conversation.branches) {
        const effects = [...(branch.then ?? []), ...(branch.choices ?? []).flatMap((choice) => choice.then)]
        for (const effect of effects) {
          if (effect.e === 'goto' && !DIALOGUE[effect.node]) broken.push(`${id} → ${effect.node}`)
        }
      }
    }
    expect(broken).toEqual([])
  })
})

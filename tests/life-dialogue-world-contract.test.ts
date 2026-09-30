import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import { PANO_SPOTS } from '@/lib/life/content/panoramas'
import { ALL_SCENES, inEra, sceneIn } from '@/lib/life/world/scenes'

/**
 * העולם והשיחות על אותו מקור — Director V3 §14, `life-dialogue-world-contract`.
 *
 * On 23.9.2026 `era.ts` and `dialogue.ts` were pointed at a compact 1996 file while
 * `scenes.ts` kept drawing Kobi, Barry and Asaf with `talk:` ids only the old file had.
 * The runtime answers a missing id by opening nothing (`DialogueRunner.start` → false), so
 * the player saw a person, pressed the button, and got silence — and no test noticed,
 * because every existing check asked whether a conversation is REACHABLE, not whether
 * what the world POINTS AT is there. This is that question, for every chapter: every
 * person's `talk`, every thing's `act`, and every beat's `talk`, in every room that
 * chapter paints, names something the dialogue registry actually holds.
 */

const PREFIXED = /^(net:|pano:)/

describe('every actor, hotspot and beat in the world names a conversation that exists', () => {
  const chapters = [...CHAPTERS.map((chapter) => chapter.id), 'prologue']

  it('covers every chapter', () => {
    expect(chapters.length).toBeGreaterThan(40)
    expect(chapters).toContain('1996-army')
  })

  for (const chapter of chapters) {
    it(`${chapter}`, () => {
      const missing: string[] = []
      for (const base of ALL_SCENES) {
        const room = sceneIn(base, chapter)
        for (const actor of room.actors) {
          if (!actor.talk || !inEra(actor, chapter)) continue
          // `net:` is the 1990 information net, answered by its own runner in WorldScene
          if (PREFIXED.test(actor.talk)) continue
          if (!DIALOGUE[actor.talk]) missing.push(`${room.id}/${actor.id} talk → ${actor.talk}`)
        }
        for (const spot of room.hotspots) {
          if (!inEra(spot, chapter)) continue
          if (spot.act.startsWith('pano:')) {
            if (!PANO_SPOTS[spot.act.slice(5)]) missing.push(`${room.id}/${spot.id} pano → ${spot.act}`)
            continue
          }
          if (PREFIXED.test(spot.act)) continue
          if (!DIALOGUE[spot.act]) missing.push(`${room.id}/${spot.id} act → ${spot.act}`)
        }
      }
      for (const beat of eraFor(chapter).beats ?? []) {
        for (const action of beat.do) {
          if (action.a === 'talk' && !DIALOGUE[action.conversation]) missing.push(`beat ${beat.id} talk → ${action.conversation}`)
        }
      }
      expect(missing, `${chapter}: the world points at conversations nobody registered`).toEqual([])
    })
  }

  it('1996 in particular: the four people and the bus the Director Cut lost', () => {
    for (const id of ['kobi-gate7', 'barry-gate7', 'asaf-gate5', 'a3-bus', 'a4-winter', 'a4-freddy', 'yaron-base', 'a5-kiosk']) {
      expect(DIALOGUE[id], id).toBeDefined()
    }
  })

  it('every goto inside a conversation lands on a conversation', () => {
    const missing: string[] = []
    for (const conversation of Object.values(DIALOGUE)) {
      for (const branch of conversation.branches) {
        const effects = [...(branch.then ?? []), ...(branch.choices ?? []).flatMap((choice) => choice.then)]
        for (const effect of effects) if (effect.e === 'goto' && !DIALOGUE[effect.node]) missing.push(`${conversation.id} → ${effect.node}`)
      }
    }
    expect(missing).toEqual([])
  })
})

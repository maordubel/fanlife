import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { eraFor } from '@/lib/life/content/era'
import { bodySize, heightOf } from '@/lib/life/world/heights'
import { ALL_SCENES, inEra } from '@/lib/life/world/scenes'

/**
 * גובה אחד לילד, בכל חדר — and every body measured in metres beside him.
 *
 * Delta 30 moved every BODY off the hand-typed `ActorDef.size` and onto `heights.ts`;
 * `WorldScene.bodySizeAt` says so in as many words: *"Not `def.size` any more."* The boy
 * was never moved with them. He went on reading the room's own `size` band — a number
 * typed per room, for framing — so he arrived at a different height in every room while
 * everyone around him was measured in metres.
 *
 * It was invisible for two reasons, and both are worth keeping in mind:
 *
 *  · Nobody can see an absolute height on screen. You can only see a person against
 *    another person, and the boy is usually alone in the frame when he moves between rooms.
 *  · **The tool rule 55 points at was measuring the dead field.** `scripts/life/actor-sizes.ts`
 *    read `a.size` — deprecated, never read by the runtime — so "a placement is not done
 *    until its board has been looked at" was being satisfied by looking at a board that
 *    did not draw what the game draws. Fixed the same day (15.9.2026); this suite is what
 *    stops the two from drifting apart again.
 *
 * Measured before the fix: in 1986 the eight-year-old was 1.20m on the dirt pitch and
 * 1.41m at gate five — twenty-one centimetres of growth by walking. Ten rooms were out.
 */

const ERAS = ['1986', '1990', '1991', '1993-cup', '1993-galil', '1996-army', '1998-laces', '2000-double']

/** Mirrors `WorldScene.playerSize()`. If that changes, this must change with it. */
function boyNear(scene: (typeof ALL_SCENES)[number], scale: number): number {
  return scene.metre * heightOf('pogi') * scale
}

describe('גופים — מטרים, לא מספרים ביד', () => {
  it('הילד הוא אותו גובה בכל חדר, בכל פרק', () => {
    for (const era of ERAS) {
      const scale = eraFor(era).player.scale ?? 1
      const expected = heightOf('pogi') * scale
      for (const scene of ALL_SCENES) {
        const implied = boyNear(scene, scale) / scene.metre
        expect(
          Math.abs(implied - expected),
          `${era} · ${scene.id}: the boy is ${implied.toFixed(2)}m here and ${expected.toFixed(2)}m elsewhere`,
        ).toBeLessThan(0.01)
      }
    }
  })

  it('הוא גדל בין הפרקים, ורק בין הפרקים', () => {
    // Eight in 1986, twelve in 1990, a soldier in 1996. The growth belongs to the year,
    // not to the room — that is the whole point of the rule above.
    const at = (era: string) => heightOf('pogi') * (eraFor(era).player.scale ?? 1)
    expect(at('1990')).toBeGreaterThan(at('1986'))
    expect(at('1996-army')).toBeGreaterThan(at('1990'))
    expect(at('1986')).toBeCloseTo(1.3, 2)
  })

  it('אף אדם אינו בגודל בלתי אפשרי ליד הילד', () => {
    const wrong: string[] = []
    for (const era of ERAS) {
      const scale = eraFor(era).player.scale ?? 1
      for (const scene of ALL_SCENES) {
        const taper = scene.size.far / Math.max(1e-6, scene.size.near)
        for (const actor of scene.actors) {
          if (!inEra(actor, era)) continue
          const t = Math.max(0, Math.min(1, (actor.y - scene.band.far) / (scene.band.near - scene.band.far)))
          const drawn = bodySize(actor.figure, scene.metre, t, taper)
          const boy = boyNear(scene, scale) * (taper + (1 - taper) * t)
          const ratio = drawn / boy
          // A grown adult beside an eight-year-old is about 1.34×; beside a young man,
          // about 1.0×. Outside 0.55–2.2 is not a person, it is a typo.
          if (ratio < 0.55 || ratio > 2.2) {
            wrong.push(`${era} · ${scene.id} · ${actor.id} (${actor.figure}): ×${ratio.toFixed(2)} the boy`)
          }
        }
      }
    }
    expect(wrong, wrong.join('\n')).toEqual([])
  })

  it('הכלי שבודק גופים קורא את מה שהמנוע מצייר, לא את השדה המת', () => {
    // The guard against the defect that hid the defect. `ActorDef.size` is deprecated;
    // a measuring script that reads it is not evidence of anything.
    const source = readFileSync(join(process.cwd(), 'scripts/life/actor-sizes.ts'), 'utf8')
    expect(source).toContain('bodySize(')
    expect(source).toContain('heightOf(')
    expect(source, 'the script must not compute a body from the deprecated field').not.toMatch(
      /a\.size\s*\?\?/,
    )
  })
})

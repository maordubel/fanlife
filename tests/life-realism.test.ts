import { existsSync, readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import artManifest from '@/public/life/art/manifest.json'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { eraFor } from '@/lib/life/content/era'
import { FIGURE, KID_POSE, PROP, RETIRED_FIGURE } from '@/lib/life/runtime/art'
import { castFigure, FACES_2000 } from '@/lib/life/world/castFigures'
import { heightAt, heightOf } from '@/lib/life/world/heights'
import { ALL_SCENES, inEra, sceneIn } from '@/lib/life/world/scenes'

/**
 * "חיים מציאותיים" — מאור, 21.9.2026: *"אתה מציג את פוגי כילד כציור — זו טעות. צריך לדייק
 * הכל, ... ולבדוק שאנחנו לא זולגים באף דבר."* Each test below is one thing a screenshot
 * showed and a reading of the code did not.
 */

const portraits = (artManifest as { portraits: Record<string, { source?: string }> }).portraits
const props = (artManifest as { props: Record<string, { source?: string }> }).props

describe('פוגי הוא פוגי — לא ציור, ולא הבן של עצמו', () => {
  it('plays the two-a-side as the photographed boy, not the cartoon of the first concept board', () => {
    const source = readFileSync('lib/life/runtime/scenes/FootballScene.ts', 'utf8')
    expect(source).not.toMatch(/'kid'/)
    expect((RETIRED_FIGURE as readonly string[]).includes('kid')).toBe(true)
    expect((FIGURE as readonly string[]).includes('kid')).toBe(false)
  })

  it('never shows the player his own childhood as his son', () => {
    // every pose of Pogi that shows his FACE; the back view (a child in a red shirt, from
    // behind) is the declared stand-in until the son is drawn
    const pogiBodies = new Set<string>([KID_POSE.down, KID_POSE.downSide, KID_POSE.side, 'hero80', 'hero80-3q', 'teen'])
    for (const year of [2021, 2024, 2026]) expect(pogiBodies.has(castFigure('הילד', year)!.figure), String(year)).toBe(false)
    expect(FACES_2000['הילד']).not.toMatch(/^facePogi|^faceHero/)
  })
})

describe('הפנים בתיבה — מצולמות, מהגוף שעל הרצפה', () => {
  it('cuts the family and the alley of the eighties from their photographed bodies, not from the concept board', () => {
    for (const face of ['faceKobi', 'faceRachel', 'faceOfir', 'faceAmit', 'faceEfi', 'faceKeren', 'faceKid']) {
      expect(portraits[face]?.source, face).toMatch(/^cut from /)
    }
  })

  it('grows the faces of the eighties into the faces of the nineties', () => {
    const ninety = eraFor('1993-cup').portraits
    expect(ninety['קובי']).toBe('faceKobi90')
    expect(ninety['רחל']).toBe('faceRachel90')
    expect(ninety['אפי']).toBe('faceEfi96')
  })
})

describe('גבהים של שנה — חבר לכיתה אינו גבוה ממך בראש', () => {
  it('draws Ofir and Amit at twelve as twelve-year-olds beside the twelve-year-old Pogi', () => {
    const pogi12 = heightOf('hero80')
    for (const friend of ['ofir90', 'amit90', 'ofir90-arms', 'amit90-point']) {
      const h = heightAt(friend, 1990)
      expect(h / pogi12, friend).toBeGreaterThan(0.93)
      expect(h / pogi12, friend).toBeLessThan(1.07)
      expect(heightAt(friend, 2000)).toBe(heightOf(friend))
    }
  })

  it('keeps Efi four years ahead', () => {
    expect(heightAt('efi96-3q', 1991)).toBeGreaterThan(heightAt('ofir90', 1991))
  })
})

describe('חפצים — מצולמים, עבריים, ובשנה שלהם', () => {
  // the September props sheet drew these as pen-and-ink engravings
  const ENGRAVED = ['propColumn', 'propBallReal', 'propPapers', 'propCoins', 'propCar', 'propBus', 'propBin', 'propPlanter', 'propBunting', 'propBarrier', 'propBarriers', 'propPosters']

  it('ships no engraving into a photographed room', () => {
    for (const key of ENGRAVED) expect((PROP as readonly string[]).includes(key), key).toBe(false)
  })

  it('sells no English newspaper in a kiosk in south Tel Aviv', () => {
    expect((PROP as readonly string[]).includes('propNewsRack')).toBe(false)
  })

  it('keeps the red box a tin box with a hinged lid, and the transistor a drawn transistor — Maor’s own', () => {
    expect(props['propRedBox']?.source).toBe('maor-2026-09-20-objects')
    expect(props['propRadio']?.source).toBe('maor-2026-09-20-objects')
  })

  it('puts no object of the adult life into a room before its decade', () => {
    const MODERN = new Set(['propPhone2010', 'propPhone2020', 'propLaptop', 'propRemote', 'propRecorder', 'propHeadphones'])
    for (const scene of ALL_SCENES) {
      for (const chapter of CHAPTERS) {
        const here = sceneIn(scene, chapter.id)
        for (const layer of here.layers ?? []) {
          if (!MODERN.has(layer.art) || !inEra(layer, chapter.id)) continue
          expect(chapter.year, `${scene.id}@${chapter.id}: ${layer.art}`).toBeGreaterThanOrEqual(2006)
        }
        for (const spot of here.hotspots) {
          if (!spot.prop || !MODERN.has(spot.prop.key) || !inEra(spot, chapter.id)) continue
          expect(chapter.year, `${scene.id}@${chapter.id}: ${spot.prop.key}`).toBeGreaterThanOrEqual(2006)
        }
      }
    }
  })
})

describe('כרטיס הסיום — "אז" ו"עכשיו" הם תמונות שקיימות', () => {
  it('draws every before-and-after pair from a file that ships', () => {
    // `rachel90-smile` was named by the 1991 ending "שמעתי דרך הקיר" and never existed:
    // the card showed a broken image beside the one that did
    const missing: string[] = []
    for (const chapter of CHAPTERS) {
      for (const [id, card] of Object.entries(eraFor(chapter.id).endings ?? {})) {
        const after = (card as { after?: { fromArt: string; toArt: string } | null }).after
        if (!after) continue
        for (const art of [after.fromArt, after.toArt]) if (!existsSync(`public/life/art/${art}.webp`)) missing.push(`${chapter.id}/${id}: ${art}`)
      }
    }
    expect(missing).toEqual([])
  })
})

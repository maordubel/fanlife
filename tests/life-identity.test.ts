import { describe, expect, it } from 'vitest'

import artManifest from '@/public/life/art/manifest.json'
import { eraFor } from '@/lib/life/content/era'
import { FIGURE, LEGACY_POSE, PORTRAIT_ART } from '@/lib/life/runtime/art'
import { allowedFigure, CAST_2000, castFigure, familyOf, facesFor, playerFor, pogiBodyIn } from '@/lib/life/world/castFigures'
import { heightOf } from '@/lib/life/world/heights'
import { faceSource, identityAudit } from '@/lib/life/world/identity'
import { STAGED } from '@/lib/life/world/rooms2000'

/**
 * הזהות החזותית — GRAPHICS-MASTER-AUDIT (מאור, 23.9.2026) §24: *"is this actually the same
 * person?"*. Every test below is one class of error the audit found in a screenshot and no
 * instrument caught: a man of forty-eight on the body of a twenty-two-year-old, Keren on a
 * crowd woman, a scene handing Ofir the older sheet's different man, a face in the box cut
 * from somebody other than the person on the floor.
 */

const figures = new Set<string>(FIGURE)
const plates = new Set<string>(PORTRAIT_ART)
const portraits = (artManifest as unknown as { portraits: Record<string, { source?: string }> }).portraits

describe('life:identity — the audit itself is green', () => {
  it('finds no identity problem anywhere the game draws a person', () => {
    const { problems } = identityAudit()
    expect(problems.map((p) => `${p.code} ${p.where} ${p.detail}`)).toEqual([])
  })
})

describe('פוגי מזדקן על המסך — 32, 40, 47', () => {
  it('walks the adult life on the body of his age, never hero90 after 2009', () => {
    expect(pogiBodyIn(2009)).toBeNull()
    expect(pogiBodyIn(2012)).toBe('pogi32')
    expect(pogiBodyIn(2019)).toBe('pogi40')
    expect(pogiBodyIn(2025)).toBe('pogi47')
    for (const [chapter, body] of [['2012-cups', 'pogi32'], ['2019-armchair', 'pogi40'], ['2025-owner', 'pogi47'], ['2007-table', 'hero90']] as const) {
      const era = eraFor(chapter)
      expect(era.player.pose.down, chapter).toBe(body)
      for (const key of [...Object.values(era.player.pose), ...era.player.walk]) expect(figures.has(key), key).toBe(true)
    }
  })

  it('speaks with the face cut from that body', () => {
    expect(eraFor('2012-cups').portraits['פוגי']).toBe('facePogi32')
    expect(eraFor('2019-armchair').portraits['פוגי']).toBe('facePogi40')
    expect(eraFor('2025-owner').portraits['פוגי']).toBe('facePogi47')
    for (const face of ['facePogi32', 'facePogi40', 'facePogi47']) expect(faceSource(face)).toBe(face.replace('face', '').replace(/^./, (c) => c.toLowerCase()))
  })

  it('leaves the child, the teen and the soldier alone', () => {
    const child = { pose: { down: 'pogi', downSide: 'pogi-3q', side: 'pogi-side', up: 'pogi-back' }, walk: ['pogi-side', 'pogi-walk'] }
    expect(playerFor(2025, child)).toBe(child)
  })

  it('stands the grown man at a grown man’s height, not the eight-year-old’s', () => {
    for (const key of ['pogi32', 'pogi40-3q', 'pogi47-walk', 'ofir40', 'amit40-3q', 'keren40', 'efi44-3q']) expect(heightOf(key), key).toBeGreaterThan(1.6)
  })
})

describe('קובי 62 ו-72, החברים בני 40, קרן — קרן', () => {
  it('ages Kobi and the friends by the README’s years, body and plate together', () => {
    expect(castFigure('קובי', 2005)!.figure).toBe('kobi90-stand')
    expect(castFigure('קובי', 2012)!.figure).toBe('kobi62-3q')
    expect(castFigure('קובי', 2019)!.figure).toBe('kobi72-3q')
    expect(facesFor(2012)['קובי']).toBe('faceKobi62')
    expect(facesFor(2019)['קובי']).toBe('faceKobi72')
    for (const who of ['אופיר', 'עמית', 'אפי']) {
      const body = castFigure(who, 2015)!.figure
      expect(familyOf(faceSource(facesFor(2015)[who]!)!), who).toBe(familyOf(body))
    }
  })

  it('never stands Keren on a crowd woman again (P0)', () => {
    for (const year of [2000, 2013, 2023]) {
      const body = castFigure('קרן', year)!
      expect(body.figure).toMatch(/^keren40/)
      expect(body.standIn).toBeFalsy()
    }
    expect(facesFor(2013)['קרן']).toBe('faceKeren40')
  })

  it('gives Rachel at sixty her face, and says out loud that no body of that age exists', () => {
    expect(facesFor(2015)['רחל']).toBe('faceRachel60')
    expect(portraits['faceRachel60']?.source).toMatch(/^portrait-only/)
  })
})

describe('the canonical references — Hermesh, Michel, Barry', () => {
  it('stands Hermesh as the bald man, and speaks with the plate cut from him', () => {
    expect(castFigure('חרמש', 2020)!.figure).toMatch(/^hermesh/)
    expect(portraits['faceHermesh']?.source).toBe('cut from hermesh')
    expect(figures.has('hermesh-back')).toBe(false)
  })

  it('keeps the 1996 walk cycle — another man — out of every room', () => {
    for (const walk of ['michel96-walk1', 'michel96-walk3', 'michel96-walk5']) expect((LEGACY_POSE as readonly string[]).includes(walk)).toBe(true)
    expect(castFigure('מישל', 2005)!.figure).toMatch(/^michel99/)
  })

  it('makes Barry the man of Maor’s reference (barryToday), face and body', () => {
    expect(familyOf(castFigure('בארי', 2010)!.figure)).toBe('barryToday')
    expect(portraits['faceBarry']?.source).toBe('cut from barryToday')
  })
})

describe('row.figure — a pose is the person’s own pose', () => {
  it('refuses another family for a named person, and a documented other man for anybody', () => {
    expect(allowedFigure('אופיר', 2015, 'ofir40-walk')).toBe(true)
    expect(allowedFigure('אופיר', 2015, 'amit40-3q')).toBe(false)
    expect(allowedFigure('אופיר', 2002, 'ofir90-point')).toBe(false)
    expect(allowedFigure('קובי', 2019, 'kobi90-sitA')).toBe(true) // declared: nobody of 72 sits yet
    expect(allowedFigure('קובי', 2019, 'kobi90-point')).toBe(false)
    expect(allowedFigure('אורח שאינו בטבלה', 2019, 'adultA1')).toBe(true)
  })

  it('holds for every body staged in the rooms of 2000–2026', () => {
    const bad: string[] = []
    for (const actors of Object.values(STAGED)) {
      for (const actor of actors ?? []) {
        const year = Number(actor.era && String(actor.era).slice(0, 4))
        if (CAST_2000[actor.nameHe] && !allowedFigure(actor.nameHe, year, actor.figure)) bad.push(`${actor.id} → ${actor.figure}`)
      }
    }
    expect(bad).toEqual([])
  })
})

describe('everything this pass names ships', () => {
  it('registers every new body and every new plate', () => {
    for (const s of ['pogi32', 'pogi40', 'pogi47', 'kobi62', 'kobi72', 'ofir40', 'amit40', 'efi44', 'keren40']) {
      for (const p of ['', '-3q', '-side', '-back', '-walk']) expect(figures.has(`${s}${p}`), `${s}${p}`).toBe(true)
      expect(plates.has(`face${s[0]!.toUpperCase()}${s.slice(1)}`), s).toBe(true)
    }
    expect(plates.has('faceRachel60')).toBe(true)
  })
})

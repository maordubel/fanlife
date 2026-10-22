import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {readMasterScreenplay, readWindow, splitOption, statedCounts} from '../../lib/life/universal/master/read'

const SOURCE = 'docs/life/FANLIFE-LIFE-STORY-BIBLE-2026-10-15.md'
const md = readFileSync(SOURCE, 'utf8')
const book = readMasterScreenplay(md, SOURCE)
const scenes = book.chapters.flatMap(c => c.scenes)
const options = scenes.flatMap(s => s.options)
const ids = new Set(book.chapters.map(c => c.id))
/** A scene the owner added to the bible after version 2 (the three that hand the player to the big nights, 22.10.2026)
 *  says so in its first line; the shape the bible was written to — three scenes a chapter, four a route — holds without it. */
const approvedAddition = (sc: {bodyHe: string[]}) => (sc.bodyHe[0] ?? '').startsWith('נוסף באישור הבעלים')

describe('master screenplay — the reader agrees with the document that counts itself', () => {
  const stated = statedCounts(md)

  it('finds the counts the bible states about itself', () => { expect(stated).not.toBeNull() })

  it('reads every chapter, scene and written option the preamble promises', () => {
    expect(book.chapters.filter(c => c.kind === 'master')).toHaveLength(stated!.chapters)
    expect(scenes.filter(s => s.chapterId.startsWith('F'))).toHaveLength(stated!.scenes)
    expect(scenes.filter(s => s.chapterId.startsWith('R-') && s.chapterId !== 'R-OWNER')).toHaveLength(stated!.routeScenes)
    expect(scenes.filter(s => s.chapterId === 'R-OWNER')).toHaveLength(stated!.altScenes)
    expect(scenes).toHaveLength(stated!.total)
    expect(options).toHaveLength(stated!.options)
  })

  it('leaves nothing unread', () => { expect(book.report.unread).toEqual([]) })

  it('has eight life paths, four scenes each, and the optional owner branch', () => {
    const routes = book.chapters.filter(c => c.kind === 'route')
    expect(routes).toHaveLength(8)
    for (const r of routes) expect(r.scenes.filter(x => !approvedAddition(x)), r.id).toHaveLength(4)
    expect(book.chapters.filter(c => c.kind === 'alt-history').map(c => c.id)).toEqual(['R-OWNER'])
  })

  it('gives every master chapter three scenes and every scene three options with a body', () => {
    for (const c of book.chapters.filter(c => c.kind === 'master')) expect(c.scenes.filter(x => !approvedAddition(x)), c.id).toHaveLength(3)
    for (const s of scenes) {
      expect(s.options.map(o => o.n), s.id).toEqual([1, 2, 3])
      expect(s.bodyHe.length, s.id).toBeGreaterThan(0)
      for (const o of s.options) { expect(o.textHe.length, o.id).toBeGreaterThan(0); expect(o.resultHe, o.id).not.toBeNull() }
    }
    scenes.forEach(s => expect(s.id).toBe(`${s.chapterId}-S${s.n}`))
  })

  it('keeps ids unique and numbers chapters F01…F32 without a gap', () => {
    expect(new Set(book.chapters.map(c => c.id)).size).toBe(book.chapters.length)
    expect(new Set(scenes.map(s => s.id)).size).toBe(scenes.length)
    const f = book.chapters.filter(c => c.kind === 'master').map(c => c.id)
    expect(f).toEqual(Array.from({length: 32}, (_, i) => `F${String(i + 1).padStart(2, '0')}`))
  })
})

describe('master screenplay — the two statements of every chapter agree', () => {
  it('matches the §16 table with the chapter headings, title and window', () => {
    expect(book.table.map(r => r.id)).toEqual(book.chapters.filter(c => c.kind === 'master').map(c => c.id))
    for (const row of book.table) {
      const c = book.chapters.find(x => x.id === row.id)!
      expect(c.titleHe, row.id).toBe(row.titleHe)
      const t = readWindow(row.windowHe)
      expect([c.window!.minAge, c.window!.maxAge], row.id).toEqual([t.minAge, t.maxAge])
    }
  })

  it('reads a numeric age window for every master chapter, ordered', () => {
    for (const c of book.chapters.filter(c => c.kind === 'master')) {
      const w = c.window!
      expect(w.minAge, c.id).not.toBeNull()
      expect(w.maxAge, c.id).not.toBeNull()
      expect(w.minAge!, c.id).toBeLessThan(w.maxAge!)
      expect(w.minAge!, c.id).toBeGreaterThanOrEqual(5)
      expect(w.maxAge!, c.id).toBeLessThanOrEqual(75)
    }
  })

  it('reads the chapters in life order: windows never start earlier than the chapter before by more than the script allows', () => {
    const f = book.chapters.filter(c => c.kind === 'master')
    // the script runs childhood → old age; a window that starts at 5 after one that starts at 28 would be a typo
    for (let i = 1; i < f.length; i++) expect(f[i]!.window!.minAge! - f[i - 1]!.window!.minAge!, f[i]!.id).toBeGreaterThanOrEqual(-8)
  })

  it('points every mention at a chapter that exists', () => {
    for (const c of book.chapters) for (const m of c.mentions) expect(ids.has(m), `${c.id} → ${m}`).toBe(true)
  })

  it('gives every master chapter an anchor, a collection note and a continuation', () => {
    for (const c of book.chapters.filter(c => c.kind === 'master')) {
      expect(c.anchorHe, c.id).toBeTruthy(); expect(c.collectionHe, c.id).toBeTruthy(); expect(c.continuationHe, c.id).toBeTruthy()
    }
  })
})

describe('master screenplay — authored fiction states no archive fact (rule 11)', () => {
  const prose = scenes.flatMap(s => [s.titleHe, ...s.bodyHe, ...s.options.flatMap(o => [o.textHe, o.resultHe ?? ''])])

  it('prints no year and no scoreline in any scene or option', () => {
    for (const t of prose) {
      expect(t, t).not.toMatch(/\b(19|20)\d{2}\b/)
      expect(t, t).not.toMatch(/\b\d{1,2}\s*[–:-]\s*\d{1,2}\b/)
    }
  })

  it('never lets an option reward a bare number (prices are calibrated after a prototype)', () => {
    for (const o of options) expect(o.resultHe ?? '', o.id).not.toMatch(/[+-]\s*\d+\s*(נקודות|₪|€|מטבעות)/)
  })
})

describe('master screenplay — the generated file is what a fresh read produces', () => {
  it('has not drifted from the source', () => {
    const onDisk = JSON.parse(readFileSync('content/generated/life-master-screenplay.json', 'utf8'))
    expect(onDisk).toEqual(JSON.parse(JSON.stringify(book)))
  })
})

describe('master screenplay — reader details', () => {
  it('reads windows', () => {
    expect(readWindow('5–9; ירושה')).toMatchObject({minAge: 5, maxAge: 9, openEnded: false})
    expect(readWindow('18+ לעסק')).toMatchObject({minAge: 18, maxAge: null, openEnded: true})
    expect(readWindow('מ־F09 ולאורך הבגרות')).toMatchObject({minAge: null, maxAge: null})
  })
  it('splits an option on its first colon only', () => {
    expect(splitOption('לעזור: אתם: יחד')).toEqual({textHe: 'לעזור', resultHe: 'אתם: יחד'})
    expect(splitOption('בלי תוצאה')).toEqual({textHe: 'בלי תוצאה', resultHe: null})
  })
})

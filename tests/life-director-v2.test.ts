import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const file = (path: string) => readFileSync(join(root, path), 'utf8')

describe('Director v3 — documentary / encounters / playable 1996', () => {
  it('routes 1996 through the full gameplay chapter, not the compact menu replacement', () => {
    const era = file('lib/life/content/era.ts')
    const dialogue = file('lib/life/content/dialogue.ts')
    expect(era).toContain("from './chapter1996army'")
    expect(dialogue).toContain("from './chapter1996army'")
  })

  it('keeps the terrace decision recoverable through world conversations', () => {
    const army = file('lib/life/content/chapter1996army.ts')
    const scenes = file('lib/life/world/scenes.ts')
    expect(army).toContain("id: 'kobi-gate7'")
    expect(army).toContain("id: 'barry-gate7'")
    expect(army).toContain("id: 'asaf-gate5'")
    expect(scenes).toContain("to: 'gate5'")
    expect(scenes).toContain("era: ['1996-army'")
    expect(army).toContain('23 בנובמבר 1996')
    expect(army).not.toContain('16 בנובמבר 1996')
  })

  it('starts the bus dilemma with the bus already present', () => {
    const army = file('lib/life/content/chapter1996army.ts')
    expect(army).toContain("{ a: 'flag', flag: 'a3:bus-here' }")
    expect(army).toContain("id: 'a3-bus'")
  })

  it('restores seeded random encounters across late Stage B', () => {
    const era = file('lib/life/content/era.ts')
    const pool = file('lib/life/content/encountersStageB.ts')
    expect(era).toContain('encountersForStageB(chapter)')
    expect(pool).toContain("era: '1996-army'")
    expect(pool).toContain("era: '1998-laces'")
    expect(pool).toContain("era: '2000-double'")
  })

  it('plays the supplied Cup 83 archive after the interactive memory', () => {
    const prologue = file('lib/life/runtime/scenes/PrologueScene.ts')
    const film = file('components/life/FilmCut.tsx')
    expect(prologue).toContain("clip: 'cup83-archive'")
    expect(film).toContain("archive ? 38_000 : 6_200")
  })

  it('uses documentary transitions that explicitly connect world and Pugi', () => {
    const card = file('components/life/ChapterCard.tsx')
    expect(card).toContain('TIME → WORLD → PUGI')
    // the two beat labels moved to the LIFE catalogue (rule 10, delta 87)
    const life = file('messages/he.life.json')
    expect(card).toContain("t('life.chapterDoc.world')")
    expect(card).toContain("t('life.chapterDoc.pogi')")
    expect(life).toContain('"life.chapterDoc.world": "העולם"')
    expect(life).toContain('"life.chapterDoc.pogi": "פוגי"')
  })
})

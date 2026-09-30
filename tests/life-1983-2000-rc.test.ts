import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const f = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('1983–2000 release candidate contract', () => {
  it('gates A1 behind Opening and keeps childhood out of Traveller capability', () => {
    expect(f('lib/life/runtime/scenes/BootScene.ts')).toContain('OPENING_FLAG')
    const a = f('lib/life/content/chapterStageA.ts')
    expect(a).toContain("life:a1:instinct")
    expect(a).toContain("a1-kobi")
    expect(a).not.toMatch(/id: 'ears'[\s\S]{0,400}streetSmarts/)
  })
  it('starts 1986 from continuity, not a key hunt', () => {
    expect(f('lib/life/content/chapters.ts')).toContain("{ t: 'flag.raised', flag: 'knows:match' }")
    expect(f('lib/life/content/goals.ts')).not.toContain("return (state.inventory['house-key'] ?? 0) > 0 ? 'home' : 'bedroom'")
  })
  it('turns the 1986 passage into a documentary bridge with the 1989 wound', () => {
    const p = f('lib/life/runtime/scenes/PassageScene.ts')
    expect(p).toContain("titleHe: '1989'")
    expect(p).toContain('if (this.seen >= 1) this.finish()')
  })
  it('does not train Traveller capability at school', () => {
    expect(f('lib/life/content/dialogue1991.ts')).not.toContain("key: 'streetSmarts'")
  })
  it('models 1997 as a chain, not one fake relegation night', () => {
    const c = f('lib/life/content/chapter1997basket.ts')
    expect(c).toContain('27 במרץ 1997')
    expect(c).toContain('30 במרץ')
    expect(c).toContain('הרצליה')
    expect(c).not.toContain("match', script: 'hall-97'")
  })
  it('models 1999 as an away trip with parallel dependency', () => {
    const c = f('lib/life/content/chapter1999basket.ts')
    expect(c).toContain('29 במרץ 1999')
    expect(c).toContain('גליל עליון')
    expect(c).toContain('הרצליה')
    expect(c).not.toContain("script: 'hall-99'")
  })
  it('confirms the 2000 title from parallel information and removes the seven-item board', () => {
    const c = f('lib/life/content/chapter2000double.ts')
    expect(c).toContain("id: 't-confirm'")
    expect(c).toContain('המשחק המקביל')
    expect(c).not.toContain('יש שבעה דברים שצריך. יש זמן לשניים.')
    expect(c).not.toContain("id: 'd-days'")
  })
  it('classifies the 1999 film as context, not exact match footage', () => {
    const c = f('lib/life/cutscenes.ts')
    expect(c).toContain('1999-basket-context')
    expect(c).toContain('תיעוד תקופה, לא צילום של משחק הירידה')
    expect(c).toContain('pdQLDp_-Xgo')
    expect(c).toContain('RO14bGFcD-Q')
  })
})

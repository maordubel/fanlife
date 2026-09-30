import { describe, expect, it } from 'vitest'

import { KIND_ART, KIND_OF_ENDING, REAL_TICKET_MEMORY, kindArt, memoryKind } from '@/lib/life/boxObjects'
import { CHAPTERS } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import { apply, emptyState } from '@/lib/life/events'
import { boxContents } from '@/lib/life/redboxView'
import { PROP } from '@/lib/life/runtime/art'
import { ALL_SCENES, inEra, sceneIn } from '@/lib/life/world/scenes'

/**
 * הקופסה האדומה — חפץ בחדר, ומה שבה מצויר לפי מה שנכתב (21.9.2026).
 *
 * 138 סופים נשמרו כ-`folded-paper` ו-29 כ-`ticket-stub`, והכרטיס הוא סריקה של כרטיס
 * אמיתי מ-1986 — כלומר *"כרטיס טיסה, עם קפה על השוליים"* היה מצויר ככרטיס ילדים למשחק 15.
 * הבדיקה הזאת מחזיקה את הסיווג מול המשפטים עצמם.
 */

const IDENTITY = { name: 'פוגי', sex: 'boy', birthYear: 1978 } as const

const endings = CHAPTERS.flatMap((chapter) => {
  const era = eraFor(chapter.id)
  return Object.values(era.endings ?? {}).map((card) => ({ chapter: chapter.id, id: `${era.memoryPrefix}-${card.id}`, card }))
})

describe('THE WORKER LIFE — what goes into the red box is what the sentence says', () => {
  it('the 1986 ticket scan is the one real ticket, and only its own night draws it', () => {
    for (const { id, card, chapter } of endings) {
      const kind = memoryKind(card.memoryHe, card.memoryItem, card.id, id)
      const art = kindArt(kind, card.memoryItem, id, chapter, card.memoryHe)
      if (id === REAL_TICKET_MEMORY) expect(art).toBe('docTicket')
      else expect(art, `${id}: ${card.memoryHe}`).not.toBe('docTicket')
    }
  })

  it('a sentence that says there is nothing is not drawn as something', () => {
    for (const { id, card } of endings) {
      if (!/^(כלום|שקט|שיחה)/.test(card.memoryHe)) continue
      expect(memoryKind(card.memoryHe, card.memoryItem, card.id, id), `${id}`).toBe('nothing')
    }
  })

  it('the object is the FIRST thing the sentence names', () => {
    expect(memoryKind('דף עם שני טורים של מספרים שכתבת ומחקת. הרדיו לא ידע לספור.', 'folded-paper')).toBe('page')
    expect(memoryKind('כרטיס הגמר, ובתוכו, מקופל, הדף עם שלוש הכותרות.', 'folded-paper')).toBe('ticket')
    expect(memoryKind('הכתבה הראשונה, עם שם הצלמת מתחת לתמונה.', 'clipping')).toBe('clipping')
    expect(memoryKind('תמונה קבוצתית, ומפתח שכבר לא אצלך.', 'folded-paper')).toBe('photo')
    expect(memoryKind('הכניסה, מטושטשת, ובכל זאת שמורה.', 'folded-paper', 'photo')).toBe('photo')
  })

  it('every ending named in KIND_OF_ENDING exists — a stale override is a silent one', () => {
    const ids = new Set(endings.map((row) => row.id))
    for (const id of Object.keys(KIND_OF_ENDING)) expect(ids.has(id), id).toBe(true)
  })

  it('every kind that has art names a prop that ships', () => {
    const props = new Set<string>(PROP)
    for (const [kind, art] of Object.entries(KIND_ART)) {
      if (art === null || kind === 'shirt') continue
      expect(props.has(art), `${kind} → ${art}`).toBe(true)
    }
  })

  it('a folded paper is no longer what a hundred and thirty-eight different days left behind', () => {
    const papers = endings.filter(({ id, card }) => kindArt(memoryKind(card.memoryHe, card.memoryItem, card.id, id), card.memoryItem, id) === 'propNote')
    expect(papers.length).toBeLessThan(12)
  })
})

describe('the box is a thing in the room, and it opens', () => {
  const bedroom = ALL_SCENES.find((scene) => scene.id === 'bedroom')!

  it.each(['1986', '1990', '1998-laces', '2000-bridge', '2010-anthem', '2012-five'])('%s: a red box stands in the bedroom', (chapter) => {
    const scene = sceneIn(bedroom, chapter)
    const spots = scene.hotspots.filter((spot) => inEra(spot, chapter) && spot.prop?.key === 'propRedBox')
    expect(spots.length).toBe(1)
    expect(DIALOGUE[spots[0]!.act!]).toBeDefined()
  })

  /**
   * **הקופסה עוברת דירה (21.9.2026).** מ-2013 יש לפוגי בית משלו (`world/homes.ts`), והקופסה
   * על מדף הספרים שם — לא בחדר הילדות, שבערבים אצל ההורים נשאר בלעדיה. ומי שעבר לגור שם
   * לקח אותה איתו: *"היא טסה איתך, בתיק היד"*.
   */
  const home = ALL_SCENES.find((scene) => scene.id === 'home')!
  const flat = ALL_SCENES.find((scene) => scene.id === 'flat-abroad')!
  it.each(['2013-household', '2021-promises', '2025-eurocup'])('%s: the box is on his own bookcase', (chapter) => {
    const spots = sceneIn(home, chapter).hotspots.filter((spot) => inEra(spot, chapter) && spot.prop?.key === 'propRedBox')
    expect(spots.map((spot) => spot.act)).toEqual(['redbox-flat'])
    expect(sceneIn(bedroom, chapter).hotspots.filter((spot) => inEra(spot, chapter) && spot.prop?.key === 'propRedBox')).toEqual([])
  })
  it.each(['2023-abroad', '2025-abroad'])('%s: and abroad, on the chest by the television', (chapter) => {
    const spots = sceneIn(flat, chapter).hotspots.filter((spot) => inEra(spot, chapter) && spot.prop?.key === 'propRedBox')
    expect(spots.map((spot) => spot.act)).toEqual(['redbox-abroad'])
  })

  it('opening it opens it — the choice carries the box effect', () => {
    for (const id of ['redbox', 'redbox-shelf', 'redbox-flat', 'redbox-abroad']) {
      const open = DIALOGUE[id]!.branches[0]!.choices!.find((choice) => choice.id === 'open')!
      expect(open.then.some((effect) => effect.e === 'box'), id).toBe(true)
    }
  })

  it('the contents are read from the life, oldest first, with the sentence the ending wrote', () => {
    let state = emptyState(IDENTITY, 1986)
    state = apply(state, { t: 'memory.kept', memory: { id: '1990-home', item: 'promotion-table', atMinute: 600, year: 1990, anchorId: null } })
    state = apply(state, { t: 'memory.kept', memory: { id: '1986-home', item: 'ticket-stub', atMinute: 1200, year: 1986, anchorId: null } })
    const things = boxContents(state)
    expect(things.map((thing) => thing.id)).toEqual(['1986-home', '1990-home'])
    expect(things[0]!.art).toBe('docTicket')
    expect(things[0]!.noteHe).toContain('קופסה האדומה')
    expect(things[0]!.source).toBe('ending')
  })
})

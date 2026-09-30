import { describe, expect, it } from 'vitest'

import { beatsAt, type Beat } from '@/lib/life/content/beats'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { BEATS_GALIL, CONVERSATIONS_GALIL, ENDINGS_GALIL } from '@/lib/life/content/chapter1993galil'
import { BEATS_SINAI, CONVERSATIONS_SINAI, ENDINGS_SINAI } from '@/lib/life/content/chapter1995sinai'
// (24.9.2026, Director V3) chapter1996army.ts is the single live 1996 unit again — the
// Director's Cut file was folded into it and removed — so this suite checks what the game
// actually plays.
import { BEATS_ARMY, CONVERSATIONS_ARMY, ENDINGS_ARMY } from '@/lib/life/content/chapter1996army'
import { BEATS_HALL, CONVERSATIONS_HALL, ENDINGS_HALL } from '@/lib/life/content/chapter1997basket'
import { BEATS_LACES, CONVERSATIONS_LACES, ENDINGS_LACES } from '@/lib/life/content/chapter1998laces'
import { BEATS_SEED, CONVERSATIONS_SEED, ENDINGS_SEED } from '@/lib/life/content/chapter1999basket'
import { BEATS_CUP99, CONVERSATIONS_CUP99, ENDINGS_CUP99 } from '@/lib/life/content/chapter1999cup'
import {
  BEATS_DOUBLE,
  BEATS_TITLE,
  CONVERSATIONS_DOUBLE,
  CONVERSATIONS_TITLE,
  ENDINGS_DOUBLE,
  ENDINGS_TITLE,
  outcomeFamily,
} from '@/lib/life/content/chapter2000double'
import { CHAPTER, CHAPTERS, lastPlayable, nextPlayable, playableChapters } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { ERA_KEYS, eraFor } from '@/lib/life/content/era'
import type { EndingCard } from '@/lib/life/content/chapter1986'
import type { Conversation } from '@/lib/life/content/script'
import { LifeEngine } from '@/lib/life/engine'
import type { PresenceMode } from '@/lib/life/types'
import { ALL_SCENES, inEra, SCENE } from '@/lib/life/world/scenes'
import { meets } from '@/lib/life/world/types'

/**
 * שלב ב׳ — 1990–2000, eleven units, one suite.
 *
 * The brief's rules that can be checked by a machine are checked here for every chapter
 * at once: results are fixed and never spoken, the darbuka is never a guitar, Gabi is
 * Liron, Yosef is a man of the 2000s, שלום תקוה has one vav, the bus refusal keeps its
 * factual core, every id points at something, every ending knows how he was there, and
 * the Double is the last thing that happens.
 */
type Unit = {
  id: string
  unit: string
  beats: Beat[]
  conversations: Conversation[]
  endings: Record<string, EndingCard>
}

const UNITS: Unit[] = [
  { id: '1993-galil', unit: 'B4', beats: BEATS_GALIL, conversations: CONVERSATIONS_GALIL, endings: ENDINGS_GALIL },
  { id: '1995-sinai', unit: 'B5', beats: BEATS_SINAI, conversations: CONVERSATIONS_SINAI, endings: ENDINGS_SINAI },
  { id: '1996-army', unit: 'B6', beats: BEATS_ARMY, conversations: CONVERSATIONS_ARMY, endings: ENDINGS_ARMY },
  { id: '1997-basket', unit: 'B7', beats: BEATS_HALL, conversations: CONVERSATIONS_HALL, endings: ENDINGS_HALL },
  { id: '1998-laces', unit: 'B8', beats: BEATS_LACES, conversations: CONVERSATIONS_LACES, endings: ENDINGS_LACES },
  { id: '1999-basket', unit: 'B9', beats: BEATS_SEED, conversations: CONVERSATIONS_SEED, endings: ENDINGS_SEED },
  { id: '1999-cup', unit: 'B10', beats: BEATS_CUP99, conversations: CONVERSATIONS_CUP99, endings: ENDINGS_CUP99 },
  { id: '2000-title', unit: 'B11a', beats: BEATS_TITLE, conversations: CONVERSATIONS_TITLE, endings: ENDINGS_TITLE },
  { id: '2000-double', unit: 'B11b', beats: BEATS_DOUBLE, conversations: CONVERSATIONS_DOUBLE, endings: ENDINGS_DOUBLE },
]

const everyText = (unit: Unit): string[] => [
  ...unit.conversations.flatMap((c) =>
    c.branches.flatMap((b) => [
      ...b.lines.map((l) => l.text),
      ...(b.choices ?? []).flatMap((ch) => [ch.text, ch.noteHe ?? '', ...ch.then.map((fx) => ('text' in fx ? String(fx.text) : ''))]),
      ...(b.then ?? []).map((fx) => ('text' in fx ? String(fx.text) : '')),
    ]),
  ),
  ...unit.beats.flatMap((b) => b.do.flatMap((a) => ('text' in a ? [String(a.text)] : 'lines' in a ? (a.lines as readonly { text: string }[]).map((l) => l.text) : []))),
  ...Object.values(unit.endings).flatMap((e) => [e.titleHe, e.bodyHe, e.memoryHe ?? '']),
]

const stageB = CHAPTERS.filter((c) => c.stage === 'B')

const PRESENCE: PresenceMode[] = ['inside', 'late', 'outside', 'radio', 'television', 'army', 'working', 'heard-from-friend', 'archive-later']

describe('שלב ב׳ — the decade as a whole', () => {
  it('has eleven units chained in order, all playable, ending on the Double', () => {
    expect(stageB.map((c) => c.unit)).toEqual(['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11a', 'B11b'])
    for (const c of stageB) expect(c.playable, c.id).toBe(true)
    for (let i = 0; i < stageB.length - 1; i += 1) expect(stageB[i]!.next, stageB[i]!.id).toBe(stageB[i + 1]!.id)
    /**
     * ...ושלב ב׳ עדיין נגמר בדאבל — אבל **החיים כבר לא** (21.9.2026).
     *
     * שתי השורות האלה בדקו `lastPlayable().id === '2000-double'` ו-`next === null`,
     * והן היו נכונות כל עוד 2000 היה סוף מה שנבנה. מאור מסר תסריט שנפתח בדיוק שם,
     * ולכן הן נופלות — וזה בדיוק המקרה של כלל 68: ההחלטה השתנתה, בעל הבית אמר,
     * השומר **משנה צד ולא נמחק**. מה שהוא שומר עכשיו צר יותר ונכון יותר: `B11b` הוא
     * הפרק האחרון **של שלב ב׳**, והפרק שאחריו חייב להיות שלב ג׳ — כך ששרשור שגוי
     * בתוך העשור עדיין מפיל את הבדיקה.
     */
    expect(stageB[stageB.length - 1]!.id).toBe('2000-double')
    expect(CHAPTER['2000-double']!.next).toBe('2000-bridge')
    expect(CHAPTER['2000-bridge']!.stage).toBe('C')
    expect(nextPlayable('2000-title')?.id).toBe('2000-double')
    expect(playableChapters().length).toBe(CHAPTERS.length)
  })

  it('has an era record and a start room for every chapter', () => {
    for (const c of CHAPTERS) {
      expect(ERA_KEYS, c.id).toContain(c.id)
      expect(eraFor(c.id).chapter).toBe(c.id)
      expect(SCENE[c.start.location as keyof typeof SCENE], `${c.id} starts in ${c.start.location}`).toBeDefined()
      expect(SCENE[c.start.location as keyof typeof SCENE]!.spawns[c.start.spawn], `${c.id} spawn ${c.start.spawn}`).toBeDefined()
    }
  })

  it('dates the Double on 17.5.2000 and the title four days before it', () => {
    expect(CHAPTER['2000-double']!.dateHe).toContain('17 במאי 2000')
    expect(CHAPTER['2000-title']!.dateHe).toContain('13 במאי 2000')
    // 19 ולא 26. הבדיקה נעלה שנתיים את התאריך שהריפו טעה בו: ערך ויקיפדיה האנגלי שצוטט
    // לו אינו נוקב בתאריך הגמר בכלל, וויקיפועל נוקבת ב-19.5.1999 בדף המשחק ובמפתח
    // התאריכים. מפתח 26 במאי ריק מ-1999. תוקן 16.9.2026.
    expect(CHAPTER['1999-cup']!.dateHe).toContain('19 במאי 1999')
    expect(CHAPTER['1998-laces']!.dateHe).toContain('2 במאי 1998')
  })
})

describe.each(UNITS)('$unit · $id', (unit) => {
  const texts = everyText(unit)

  it('states no score and no scorer', () => {
    for (const text of texts) {
      expect(/\d+\s*[:\-–]\s*\d+/.test(text), text).toBe(false)
      expect(/\d+\s*–\s*\d+/.test(text), text).toBe(false)
    }
  })

  it('never hands Melamed a guitar, never says Gabi, spells שלום תקוה with one vav', () => {
    for (const text of texts) {
      expect(text.includes('גיטרה'), text).toBe(false)
      expect(/\bגבי\b/.test(text), text).toBe(false)
      // built from parts: the two-vav form may not appear literally anywhere (spec §0.1)
      expect(text.includes(['שלום', 'תקו' + 'וה'].join(' ')), text).toBe(false)
    }
    for (const c of unit.conversations) for (const b of c.branches) for (const l of b.lines) expect(l.who, `${c.id}: ${l.text}`).not.toBe('גבי')
  })

  it('keeps Yosef out of the nineties', () => {
    if (unit.id.startsWith('2000')) return
    for (const c of unit.conversations) for (const b of c.branches) for (const l of b.lines) expect(l.who, `${c.id}: ${l.text}`).not.toBe('יוסף')
    for (const text of texts) expect(/\bיוסף\b/.test(text), text).toBe(false)
  })

  it('points every talk, goto, ending, actor and hotspot at something that exists', () => {
    for (const c of unit.conversations) {
      expect(DIALOGUE[c.id], c.id).toBeDefined()
      for (const b of c.branches) {
        for (const ch of b.choices ?? []) for (const fx of ch.then) if (fx.e === 'goto') expect(DIALOGUE[fx.node], `${c.id} → ${fx.node}`).toBeDefined()
        for (const fx of b.then ?? []) if (fx.e === 'goto') expect(DIALOGUE[fx.node], `${c.id} → ${fx.node}`).toBeDefined()
        for (const ch of b.choices ?? []) for (const fx of ch.then) if (fx.e === 'ending') expect(unit.endings[fx.id], `${c.id} → ending ${fx.id}`).toBeDefined()
        for (const fx of b.then ?? []) if (fx.e === 'ending') expect(unit.endings[fx.id], `${c.id} → ending ${fx.id}`).toBeDefined()
      }
    }
    for (const beat of unit.beats) {
      for (const action of beat.do) {
        if (action.a === 'talk') expect(DIALOGUE[action.conversation], `${beat.id} → ${action.conversation}`).toBeDefined()
        if (action.a === 'ending') expect(unit.endings[action.id], `${beat.id} → ending ${action.id}`).toBeDefined()
        if (action.a === 'travel') expect(SCENE[action.to as keyof typeof SCENE], `${beat.id} → ${action.to}`).toBeDefined()
      }
    }
    for (const scene of ALL_SCENES) {
      for (const actor of scene.actors) {
        if (actor.era === undefined || !inEra(actor, unit.id)) continue
        if (actor.talk) expect(DIALOGUE[actor.talk], `${scene.id}/${actor.id} → ${actor.talk}`).toBeDefined()
      }
      for (const spot of scene.hotspots) {
        if (spot.era === undefined || !inEra(spot, unit.id) || spot.act.startsWith('pano:')) continue
        expect(DIALOGUE[spot.act], `${scene.id}/${spot.id} → ${spot.act}`).toBeDefined()
      }
    }
  })

  it('gives every ending a presence mode and a body', () => {
    expect(Object.keys(unit.endings).length).toBeGreaterThan(1)
    for (const [id, ending] of Object.entries(unit.endings)) {
      expect(PRESENCE, `${unit.id}/${id} presence`).toContain(ending.presence)
      expect(ending.bodyHe.length, `${unit.id}/${id} body`).toBeGreaterThan(40)
      expect(ending.titleHe.length, `${unit.id}/${id} title`).toBeGreaterThan(1)
    }
  })

  it('has an opening beat that fires in the start room on entry', () => {
    const chapter = CHAPTER[unit.id]!
    const engine = new LifeEngine(DEFAULT_IDENTITY, chapter.year)
    engine.dispatch({ t: 'year.entered', year: chapter.year, weekday: chapter.weekday, minute: chapter.minute }, { t: 'chapter.entered', chapter: unit.id })
    for (const ev of chapter.entry?.(engine.state) ?? []) engine.dispatch(ev)
    const open = beatsAt(unit.beats, 'enter', chapter.start.location).filter((b) => meets(engine.state, b.when))
    expect(open.length, `${unit.id} opens with nothing in ${chapter.start.location}`).toBeGreaterThan(0)
  })
})

/**
 * שלב א׳ — the six days before the Saturday, held to the same ids-point-somewhere rule.
 */
import {
  BEATS_A2, BEATS_A3, BEATS_A4, BEATS_A5, BEATS_A6, BEATS_A7,
  CONVERSATIONS_A2, CONVERSATIONS_A3, CONVERSATIONS_A4, CONVERSATIONS_A5, CONVERSATIONS_A6, CONVERSATIONS_A7,
  ENDINGS_A2, ENDINGS_A3, ENDINGS_A4, ENDINGS_A5, ENDINGS_A6, ENDINGS_A7,
} from '@/lib/life/content/chapterStageA'

const DAYS: Unit[] = [
  { id: 'a2-alley', unit: 'A2', beats: BEATS_A2, conversations: CONVERSATIONS_A2, endings: ENDINGS_A2 },
  { id: 'a3-hall', unit: 'A3', beats: BEATS_A3, conversations: CONVERSATIONS_A3, endings: ENDINGS_A3 },
  { id: 'a4-shirt', unit: 'A4', beats: BEATS_A4, conversations: CONVERSATIONS_A4, endings: ENDINGS_A4 },
  { id: 'a5-first', unit: 'A5', beats: BEATS_A5, conversations: CONVERSATIONS_A5, endings: ENDINGS_A5 },
  { id: 'a6-radio', unit: 'A6', beats: BEATS_A6, conversations: CONVERSATIONS_A6, endings: ENDINGS_A6 },
  { id: 'a7-week', unit: 'A7', beats: BEATS_A7, conversations: CONVERSATIONS_A7, endings: ENDINGS_A7 },
]

describe('שלב א׳ — the six days before the Saturday', () => {
  it('chains A2 → … → A7 → 24.5.1986 and is what the prologue hands to', () => {
    expect(CHAPTERS[0]!.id).toBe('a2-alley')
    for (let i = 0; i < DAYS.length - 1; i += 1) expect(CHAPTER[DAYS[i]!.id]!.next).toBe(DAYS[i + 1]!.id)
    expect(CHAPTER['a7-week']!.next).toBe('1986')
    expect(nextPlayable('a7-week')?.id).toBe('1986')
    for (const d of DAYS) expect(CHAPTER[d.id]!.stage).toBe('A')
  })

  describe.each(DAYS)('$unit · $id', (day) => {
    const texts = everyText(day)
    it('states no score', () => {
      for (const text of texts) expect(/\d+\s*[:\-–]\s*\d+/.test(text), text).toBe(false)
    })
    it('points every id at something that exists', () => {
      for (const c of day.conversations) {
        expect(DIALOGUE[c.id], c.id).toBeDefined()
        for (const b of c.branches) {
          for (const ch of b.choices ?? []) for (const fx of ch.then) {
            if (fx.e === 'goto') expect(DIALOGUE[fx.node], `${c.id} → ${fx.node}`).toBeDefined()
            if (fx.e === 'ending') expect(day.endings[fx.id], `${c.id} → ending ${fx.id}`).toBeDefined()
          }
          for (const fx of b.then ?? []) {
            if (fx.e === 'goto') expect(DIALOGUE[fx.node], `${c.id} → ${fx.node}`).toBeDefined()
            if (fx.e === 'ending') expect(day.endings[fx.id], `${c.id} → ending ${fx.id}`).toBeDefined()
          }
        }
      }
      for (const beat of day.beats) for (const action of beat.do) {
        if (action.a === 'talk') expect(DIALOGUE[action.conversation], `${beat.id} → ${action.conversation}`).toBeDefined()
        if (action.a === 'ending') expect(day.endings[action.id], `${beat.id} → ending ${action.id}`).toBeDefined()
      }
      for (const scene of ALL_SCENES) {
        for (const actor of scene.actors) {
          if (actor.era === undefined || !inEra(actor, day.id)) continue
          if (actor.talk) expect(DIALOGUE[actor.talk], `${scene.id}/${actor.id} → ${actor.talk}`).toBeDefined()
        }
        for (const spot of scene.hotspots) {
          if (spot.era === undefined || !inEra(spot, day.id) || spot.act.startsWith('pano:')) continue
          expect(DIALOGUE[spot.act], `${scene.id}/${spot.id} → ${spot.act}`).toBeDefined()
        }
      }
    })
    it('opens with a beat in its start room', () => {
      const chapter = CHAPTER[day.id]!
      const engine = new LifeEngine(DEFAULT_IDENTITY, chapter.year)
      engine.dispatch({ t: 'year.entered', year: chapter.year, weekday: chapter.weekday, minute: chapter.minute }, { t: 'chapter.entered', chapter: day.id })
      const open = beatsAt(day.beats, 'enter', chapter.start.location).filter((b) => meets(engine.state, b.when))
      expect(open.length, `${day.id} opens with nothing`).toBeGreaterThan(0)
      expect(Object.keys(day.endings).length).toBeGreaterThan(1)
    })
  })
})

describe('B6 — the bus, kept exactly', () => {
  // (Director V3 §8, 24.9.2026) the four buttons became four places in the station: the bus
  // door boards, the station door refuses, the bench hesitates, the timetable searches. The
  // memory itself — words and effects — is asserted exactly as before.
  it('offers a real bus that would arrive in time, a refusal, and two hours late as the consequence', () => {
    const bus = DIALOGUE['a3-bus']!
    const open = bus.branches.find((b) => (b.choices ?? []).length > 0)!
    const ids = (open.choices ?? []).map((c) => c.id)
    expect(ids).toContain('board')
    expect(ids).not.toContain('refuse')
    const away = DIALOGUE['a3-walk-away']!
    const walk = away.branches.find((b) => (b.then ?? []).length > 0)!
    expect(walk.lines.map((l) => l.text).join(' ')).toContain('לא על האוטובוס הזה')
    const spots = SCENE['bus-station'].hotspots.filter((spot) => inEra(spot, '1996-army')).map((spot) => spot.act)
    expect(spots).toEqual(expect.arrayContaining(['a3-bus', 'a3-walk-away', 'a3-bench', 'a3-timetable']))
    const all = open.lines.map((l) => l.text).join(' ')
    expect(all).toContain('בית"ר')
    expect(all).toContain('בזמן')
    const refused = DIALOGUE['a3-refused']!
    const after = refused.branches[0]!.lines.map((l) => l.text).join(' ')
    expect(after).toContain('שעתיים')
    // the memory is never "improved": no breakdown, no secret faster ride, no automatic pardon
    for (const text of [all, after]) {
      expect(text.includes('התקלקל') && !text.includes('"האוטובוס התקלקל."')).toBe(false)
      expect(text).not.toContain('טרמפ')
    }
    expect(walk.then!.some((fx) => fx.e === 'flag' && fx.flag === 'life:bus:refused')).toBe(true)
    expect(walk.then!.some((fx) => fx.e === 'goto' && fx.node === 'a3-refused')).toBe(true)
  })
})

describe('B11 — seven families, read off the decade', () => {
  it('derives a family from state and every family has an ending', () => {
    const engine = new LifeEngine(DEFAULT_IDENTITY, 2000)
    engine.dispatch({ t: 'year.entered', year: 2000, weekday: 3, minute: 15 * 60 }, { t: 'chapter.entered', chapter: '2000-double' })
    const family = outcomeFamily(engine.state)
    expect(ENDINGS_DOUBLE[family], family).toBeDefined()
    for (const id of ['inherited-chosen', 'gate5-builder', 'gate7-keeper', 'two-halls', 'always-travelling', 'heard-elsewhere', 'alone-in-crowd']) {
      expect(ENDINGS_DOUBLE[id], id).toBeDefined()
      const walk = DIALOGUE['d-family']!
      expect(walk.branches.some((b) => (b.then ?? []).some((fx) => fx.e === 'ending' && fx.id === id)), `d-family → ${id}`).toBe(true)
    }
  })

  /**
   * ...ומה שאחרי הדאבל הוא **הגשר**, לא כלום.
   *
   * הבדיקה הזאת נקראה "אין פרק אחרי הדאבל" והייתה נכונה עד 21.9.2026. היא לא נמחקה:
   * היא שואלת עכשיו את השאלה שבאמת חשובה — שהחיים ממשיכים, ושהם ממשיכים **לשלב
   * אחר**, כלומר למקור אחר (`SCREENPLAY-2000-2026.md`). חיים שנגמרים בגמר גביע הם
   * הבאג שהיא נבנתה מחדש כדי לתפוס.
   */
  it('continues into the bridge, which is where the 2000–2026 screenplay opens', () => {
    const after = nextPlayable('2000-double')
    expect(after?.id).toBe('2000-bridge')
    expect(after?.stage).toBe('C')
    expect(after?.unit).toBe('B00–B02')
  })
})

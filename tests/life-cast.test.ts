import { describe, expect, it } from 'vitest'

import {
  ALL_CHARACTERS,
  CHORUS,
  RUNTIME_ROLES,
  SPEAKING_ROLES,
  speakerHasAnAnswer,
  speakerKeys,
} from '@/lib/life/characters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import scenes from '@/lib/life/content/screenplay/scenes.json'

/**
 * מי מדבר — והשאלה שאפשר לשאול מכנית (20.9.2026).
 *
 * עד היום שתי תקלות שונות לגמרי נראו זהות. `רפי` מדבר ב-33 שיחות ולא הייתה לו שורה
 * במרשם; `אוהד` מדבר בשיחה אחת ואין לו שורה **בכוונה**. שומר ששואל "מי זה" ענה על
 * שניהם אותה תשובה, ולכן לא ענה על אף אחד.
 *
 * `speakerHasAnAnswer` היא ההפרדה: אדם, תפקיד מוצהר, תפקיד שנפתר בריצה, או מקהלה.
 * תשובה שלילית עליה היא **תמיד** באג — או שמישהו נכנס לתוכן בלי שורה, או שמישהו כתב
 * תפקיד בלי להצהיר עליו. שתי הבדיקות הראשונות כאן שואלות בדיוק את זה, על כל דובר
 * בכל שיחה במשחק ועל כל דובר ב-114 הסצנות של תסריט ההמשך.
 */

const speakersOf = (value: unknown, out: Set<string> = new Set()): Set<string> => {
  if (Array.isArray(value)) {
    for (const item of value) speakersOf(item, out)
    return out
  }
  if (!value || typeof value !== 'object') return out
  const node = value as Record<string, unknown>
  if (typeof node.who === 'string' && node.who) out.add(node.who)
  for (const child of Object.values(node)) speakersOf(child, out)
  return out
}

const IN_GAME = [...speakersOf(Object.values(DIALOGUE))].sort()
const IN_SCRIPT = [
  ...new Set(
    scenes.flatMap((scene) => [
      ...scene.openingLines.map((line) => line.who),
      ...scene.choices.flatMap((choice) => choice.lines.map((line) => line.who)),
    ]),
  ),
].sort()

describe('הקאסט — לכל מי שמדבר יש תשובה', () => {
  it('answers for every speaker in the game', () => {
    expect(IN_GAME.length).toBeGreaterThan(30)
    expect(IN_GAME.filter((who) => !speakerHasAnAnswer(who))).toEqual([])
  })

  it('answers for every speaker in the 2000–2026 screenplay', () => {
    expect(IN_SCRIPT.length).toBeGreaterThan(10)
    // `אילן` was the one open question — the registry already called `neighbour` "אילן השכן",
    // and whether they are one man is Maor's decision, not a table's (rule 64 §5). He
    // decided on 20.9.2026 ("אילן השכן זה אילן כן"), so the list is now empty — and the
    // assertion stays `toEqual([])` rather than being deleted: a check that is removed
    // once it goes green cannot catch the next name (rule 73).
    const open = IN_SCRIPT.filter((who) => !speakerHasAnAnswer(who))
    expect(open).toEqual([])
  })

  /**
   * ...ותפקיד אינו אדם, בשני הכיוונים.
   *
   * שם שיושב גם ברשימת התפקידים וגם במרשם הוא בדיוק הבלבול שההפרדה הזאת נועדה למנוע,
   * ותפקיד שיקבל בטעות גיל, עידן או פלייט יעמוד בכובע הקהל ליד קובי.
   */
  it('keeps a role out of the registry and a person out of the role list', () => {
    const people = new Set(ALL_CHARACTERS.flatMap((row) => [row.id, row.displayNameHe, ...(row.aliases ?? [])]))
    for (const role of [...Object.keys(SPEAKING_ROLES), ...Object.keys(RUNTIME_ROLES), ...CHORUS]) {
      if (role === 'אדם') continue // the one word that is both a role note and a person's name
      expect(people.has(role), `${role} is declared a role and also has a registry row`).toBe(false)
    }
  })

  it('gives every declared role a reason, so adding one is a decision', () => {
    for (const [role, why] of [...Object.entries(SPEAKING_ROLES), ...Object.entries(RUNTIME_ROLES)]) {
      expect(why.trim().length, `${role} is declared a role with no reason`).toBeGreaterThan(8)
    }
  })

  /**
   * רפי — השורה שנמדדה מהתוכן ולא שוערה.
   *
   * `gig-errands-rafi` ו-`gig-crates-kiosk` רצים מ-1985 עד 2000 והוא מדבר בשתיהן בכל
   * פרק. המרשם אמר `activeEras: ['1986']`. הבדיקה סופרת את השיחות שלו כדי שהשורה לא
   * תוכל לחזור לתאר אותו כניצב של שבת אחת.
   */
  it('describes Rafi as the recurring character the content makes him', () => {
    const rafi = ALL_CHARACTERS.find((row) => row.id === 'shopkeeper')
    expect(rafi?.aliases).toContain('רפי')
    expect(speakerKeys('רפי')).toContain('shopkeeper')
    const appearances = Object.values(DIALOGUE).filter((row) => JSON.stringify(row).includes('"רפי"')).length
    expect(appearances, 'Rafi stopped being everywhere').toBeGreaterThan(20)
    expect(rafi!.activeEras.length, 'his eras say less than his lines do').toBeGreaterThan(3)
  })

  it('resolves a first name to the person the registry holds under a full one', () => {
    for (const [first, id] of [
      ['גור', 'gur-katamin'],
      ['נטע', 'neta-katamin'],
      ['שלומי', 'shlomi-tattoo'],
      ['מישל', 'michel'],
    ] as const) {
      expect(speakerKeys(first), `${first} does not reach ${id}`).toContain(id)
    }
  })
})

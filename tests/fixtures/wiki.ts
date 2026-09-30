/**
 * SYNTHETIC FIXTURES — NOT HAPOEL HISTORY.
 *
 * Every name, number and date below is invented to exercise a parser branch. These
 * pages are used only by tests; the importer never reads this directory, so nothing
 * here can reach the database. Real facts arrive from the wiki or from
 * content/manual/, both of which carry a real source and a confidence level.
 */

import type { RawPage } from '@/scripts/ingest/lib/types'

function page(over: Partial<RawPage> & { title: string; sourceText: string }): RawPage {
  return {
    pageId: 1,
    namespace: 0,
    revisionId: 100,
    format: 'wikitext',
    contentHash: 'fixture',
    fetchedAt: '2026-08-31T00:00:00.000Z',
    url: `https://example.invalid/${encodeURIComponent(over.title)}`,
    ...over,
  }
}

export const PLAYER_PAGE = page({
  title: 'בדיקה שחקן א',
  sourceText: `
{{שחקן כדורגל
| שם = בדיקה שחקן א
| תאריך לידה = 12.5.1980
| עמדה = קשר
| לאום = ישראל, ברזיל
| כינוי = בדיקה כינוי
}}
טקסט גוף על כדורגל.
[[קטגוריה:שחקני הפועל תל אביב (כדורגל)]]
[[קטגוריה:שחקני בית (כדורגל)]]
`,
})

export const BASKETBALL_PLAYER_PAGE = page({
  title: 'בדיקה שחקן כדורסל',
  sourceText: `
{{שחקן כדורגל
| שם = בדיקה שחקן כדורסל
}}
[[קטגוריה:שחקני כדורסל]]
`,
})

export const PLAYER_PAGE_NO_INFOBOX = page({
  title: 'בדיקה שחקן ללא תבנית (כדורגל)',
  sourceText: 'טקסט חופשי על כדורגל בלי תבנית.\n[[קטגוריה:שחקני הפועל תל אביב (כדורגל)]]',
})

export const PLAYER_PAGE_BAD_DATE = page({
  title: 'בדיקה שחקן ב (כדורגל)',
  sourceText: `
{{שחקן כדורגל
| שם = בדיקה שחקן ב
| תאריך לידה = 32.13.1980
| עמדה = שוער
}}
[[קטגוריה:שחקני הפועל תל אביב (כדורגל)]]
`,
})

export const SEASON_PAGE = page({
  title: 'עונת 2001/02 (כדורגל)',
  sourceText: 'סיכום עונת כדורגל.\n[[קטגוריה:עונות (כדורגל)]]',
})

/**
 * A squad table that reproduces the failure modes real hand-maintained sources have:
 * a repeated header row mid-table, a blank name, an out-of-range shirt number and a
 * position typo.
 */
export const SQUAD_PAGE = page({
  title: 'קטגוריה:סגל הפועל ת"א (כדורגל) 2001/02',
  sourceText: `
סגל כדורגל.
{|
! מספר !! שחקן !! עמדה !! הופעות !! שערים
|-
| 1 || בדיקה שחקן א || שוער || 30 || 0
|-
| 10 || בדיקה שחקן ב || קשר || 28 || 7
|-
! מספר !! שחקן !! עמדה !! הופעות !! שערים
|-
| 123 || בדיקה שחקן ג || חלוץ || 12 || 3
|-
| 8 ||  || קשר || 1 || 0
|-
| 9 || בדיקה שחקן ד || חלון || 20 || 11
|}
[[קטגוריה:עונות (כדורגל)]]
`,
})

export const SQUAD_PAGE_NO_TABLE = page({
  title: 'קטגוריה:סגל הפועל ת"א (כדורגל) 2002/03',
  sourceText: 'סגל כדורגל ללא טבלה.\n[[קטגוריה:עונות (כדורגל)]]',
})

export const MATCH_PAGE = page({
  title: 'עונת 2001/02 (כדורגל) גביע אופ"א משחק בדיקה',
  sourceText: `
{{משחק כדורגל
| קבוצה א = בדיקה מועדון א
| קבוצה ב = בדיקה מועדון ב
| תוצאה = 2:1
| תאריך = 7.3.2002
| שלב = 1/4 גמר
}}
[[קטגוריה:עונות (כדורגל)]]
`,
})

export const MATCH_PAGE_MISSING_CLUB = page({
  title: 'עונת 2001/02 (כדורגל) משחק חסר',
  sourceText: `
{{משחק כדורגל
| קבוצה א = בדיקה מועדון א
| תוצאה = 2:1
}}
[[קטגוריה:עונות (כדורגל)]]
`,
})

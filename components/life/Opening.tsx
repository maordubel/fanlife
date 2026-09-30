'use client'

import { useEffect, useState } from 'react'

import { OpeningDocumentary } from '@/components/life/OpeningDocumentary'
import { OpeningFilm, type FilmHandover } from '@/components/life/OpeningFilm'
import type { HistoricalAnchor } from '@/lib/life/anchors'
import { beatForFilmMs } from '@/lib/life/opening'
import { choosePath, type OpeningPath } from '@/lib/life/openingAttempt'

/**
 * הפתיח — הסרט, ומה שמנגן כשהסרט לא יכול.
 *
 * מאור, 17.9.2026: *"זה הסרטון פתיחה שאני רוצה לצרף לתחילת המשחק החיים המלא במקום המצגת
 * שיש כעת"*, ואז, אחרי שהמדידה הוצגה לו: *"הסרטון מאושר כפי שהוא."*
 *
 * הקומפוננטה הזאת היא ה**החלטה** ולא אף אחד משני המסכים — ה-orchestrator היחיד (מפרט
 * 25.9.2026 §3, §68): `Opening → OpeningFilm | OpeningDocumentary`, ושום נתיב שלישי.
 * השניים לא יודעים זה על זה ולא מוצגים בבת אחת; כל אחד מהם פתיח שלם.
 *
 * ## למה שניים
 *
 * כלל 30: *"a frozen poster waiting for an `ended` event that will never fire is worse than
 * no opening."* החלופה אינה "לוותר על הפתיח" ואינה עוד מצגת: היא **הפתיח הדוקומנטרי** —
 * טקסט, זמן, קו אדום, טיפוגרפיה, אור ו-grain, בקוד בלבד, בלי שום תמונה שצריך להוריד. והיא
 * הגרסה הנגישה: הטקסט שלה DOM שקורא מסך קורא, והכתוביות של הסרט הן פיקסלים.
 *
 * ## שתי דרכים לבחור
 *
 * `prefers-reduced-motion` נבדק **לפני** שמשהו מוצג (21 שניות של קולנוע הן בדיוק מה שהבקשה
 * הזאת מבקשת לא לקבל) ומקבל את הדוקומנטרי במצב המופחת שלו. כל השאר — אוטופליי, קודק, רשת
 * — נקבע בתוך `OpeningFilm` (`lib/life/openingAttempt.ts`) ומגיע דרך `onFallback`, עם בחירת
 * הקול ועם הרגע בסרט שבו קפא, אם קפא.
 *
 * `path === 'pending'` הוא הרגע שלפני שהדפדפן נשאל. מציגים בו את הסרט כדי שיתחיל להיטען
 * מיד; מסך שמחכה לתשובה על עצמו הוא מסך שחור שהמשתמש סופר.
 */
export function Opening({
  anchor,
  onDone,
  force,
}: {
  anchor: HistoricalAnchor
  onDone: () => void
  /** QA only (`/qa/life-opening?path=documentary`) — the game never passes it */
  force?: Exclude<OpeningPath, 'pending'>
}) {
  const [path, setPath] = useState<OpeningPath>(force ?? 'pending')
  const [handover, setHandover] = useState<FilmHandover>({ sound: false, atMs: 0 })

  useEffect(() => {
    if (force) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
    setPath(choosePath(reduced))
  }, [force])

  if (path === 'documentary') {
    return (
      <OpeningDocumentary
        anchor={anchor}
        onDone={onDone}
        startAt={beatForFilmMs(handover.atMs)}
        sound={handover.sound}
      />
    )
  }
  return (
    <OpeningFilm
      onDone={onDone}
      onFallback={(next) => {
        setHandover(next)
        setPath('documentary')
      }}
    />
  )
}

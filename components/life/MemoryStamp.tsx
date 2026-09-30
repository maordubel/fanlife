'use client'

import { useEffect, useState } from 'react'

import { t } from '@/lib/i18n'
import { MEMORY_HEAD_HE } from '@/lib/life/story'
import type { MemoryBeat } from '@/lib/life/story'

/**
 * נרשם בזיכרון — הפידבק על התקדמות, בשפה של המשחק ולא בשפה של משחקים.
 *
 * המסמך של מאור אוסר את זה במפורש: *"🏆 ACHIEVEMENT UNLOCKED"*, זיקוקים, צליל ניצחון. לא
 * בגלל טעם — בגלל טון. משחק שכל כולו על מה שאדם זוכר מעשור אחד לא יכול לחגוג את עצמו כמו
 * אפליקציית כושר, כי ברגע שיש הישג יש גם השלמה, וברגע שיש השלמה יש כישלון. **החיים אינם
 * רשימה שממלאים.**
 *
 * אז השפה היא של הקופסה האדומה: כותרת קטנה, שם הדבר, ותאריך בכתב יד. שתי שניות. הרקע נשאר
 * גלוי מאחור — לא מסך, לא מודאל, לא עצירה של המשחק. פיסת נייר שנכנסת פנימה.
 *
 * שלוש הדרגות שהמסמך מבקש חיות בשלושה מקומות שונים בכוונה: אישור מיקרו הוא `Stamp` שכבר
 * קיים; זה כאן הוא הדרגה האמצעית, לרגע שבאמת קרה משהו; וסיכום היום הוא מסך נפרד בסוף.
 * לערבב ביניהם זה להפוך כל דבר לאירוע, וכשהכל אירוע — כלום לא.
 */
export function MemoryStamp({ beat, dateHe, onDone }: { beat: MemoryBeat; dateHe?: string; onDone?: () => void }) {
  const [going, setGoing] = useState(false)

  useEffect(() => {
    const hold = setTimeout(() => setGoing(true), 2000)
    const gone = setTimeout(() => onDone?.(), 2500)
    return () => {
      clearTimeout(hold)
      clearTimeout(gone)
    }
  }, [beat.id, onDone])

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-30 flex justify-center px-gutter"
      data-life="memory-stamp"
      aria-live="polite"
    >
      <div
        className={`${going ? 'opacity-0' : 'animate-ticket-in opacity-100'} border-hair border-ink bg-sheet px-4 py-2.5 transition-opacity duration-500`}
      >
        <span className="mb-1.5 block w-fit bg-red px-1.5 py-0.5 font-sign text-[10px] leading-none text-sheet">
          <bdi>{MEMORY_HEAD_HE}</bdi>
        </span>
        <p className="font-display text-[15px] leading-none text-ink">
          <bdi>{beat.titleHe}</bdi>
        </p>
        {dateHe ? (
          <p className="mt-1.5 font-sign text-[11px] leading-none text-ink/60">
            <bdi>{dateHe}</bdi>
          </p>
        ) : null}
        <span className="sr-only">{t('life.memory.saved')}</span>
      </div>
    </div>
  )
}

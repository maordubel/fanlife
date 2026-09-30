'use client'

import { artUrl } from '@/lib/life/runtime/art'
import type { BoxKind } from '@/lib/life/boxObjects'

/**
 * חפץ אחד מהקופסה — מצויר, לא נקרא (21.9.2026).
 *
 * שמונה סוגים מצוירים מתוך התיקייה (`KIND_ART`), וחמישה שאין להם ציור נבנים כאן, בשפה
 * של הקופסה ולא של ממשק: **תמונה** היא הלוח של אותו יום במסגרת נייר; **כרטיס** הוא ספח
 * עם פס אדום וניקוב, בלי אף פרט שלא נכתב עליו (כלל 11 — שנה, לא מחיר ולא מספר מושב);
 * **כרטיס ביקור** הוא נייר קטן עם קו; **הודעה** היא בועה; **מפתח** הוא מפתח; ו**כלום**
 * הוא מקום ריק עם קו מקווקו — סוף שאמר שאין חפץ לא מקבל חפץ.
 *
 * הזווית של כל חפץ נגזרת מהמזהה שלו ולא מ-`Math.random`, כדי שהקופסה תיראה אותו דבר בכל
 * פעם שפותחים אותה — ערימה שמסתדרת מחדש בכל פתיחה היא לא ערימה של מישהו.
 */

function tilt(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((Math.abs(h) % 9) - 4) * 1.2
}

export function BoxObject({
  id,
  kind,
  art,
  plate,
  year,
  label,
  className = '',
}: {
  id: string
  kind: BoxKind
  art: string | null
  plate: string | null
  year: number
  /** לקורא מסך — מה החפץ */
  label: string
  className?: string
}) {
  const rotate = { transform: `rotate(${tilt(id)}deg)` }

  if (kind === 'photo' && plate) {
    return (
      <div className={`flex h-full w-full items-center justify-center ${className}`} role="img" aria-label={label}>
        <div className="w-[88%] bg-sheet p-[6%] pb-[14%]" style={rotate}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={artUrl(plate)} alt="" aria-hidden="true" className="aspect-[4/3] w-full object-cover grayscale-[35%]" />
        </div>
      </div>
    )
  }

  if (art) {
    return (
      <div className={`flex h-full w-full items-center justify-center ${className}`} role="img" aria-label={label}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artUrl(art)} alt="" aria-hidden="true" className="max-h-full max-w-full object-contain" style={rotate} />
      </div>
    )
  }

  if (kind === 'ticket') {
    return (
      <div className={`flex h-full w-full items-center justify-center ${className}`} role="img" aria-label={label}>
        <div className="flex h-[46%] w-[86%] bg-sheet" style={rotate}>
          <div className="w-[22%] bg-red" />
          <div className="flex flex-1 flex-col justify-between border-e-2 border-dashed border-ink/35 px-[8%] py-[7%]">
            <span className="block h-[2px] w-3/4 bg-ink/70" />
            <span className="block h-[2px] w-1/2 bg-ink/40" />
            <span className="font-mono text-[10px] leading-none tabular-nums text-ink/70">{year}</span>
          </div>
          <div className="w-[16%]" />
        </div>
      </div>
    )
  }

  if (kind === 'card') {
    return (
      <div className={`flex h-full w-full items-center justify-center ${className}`} role="img" aria-label={label}>
        <div className="flex h-[48%] w-[78%] flex-col justify-center gap-[8%] bg-sheet px-[10%]" style={rotate}>
          <span className="block h-[3px] w-1/2 bg-red" />
          <span className="block h-[2px] w-3/4 bg-ink/60" />
          <span className="block h-[2px] w-2/5 bg-ink/35" />
        </div>
      </div>
    )
  }

  if (kind === 'message') {
    return (
      <div className={`flex h-full w-full items-center justify-center ${className}`} role="img" aria-label={label}>
        <div className="relative w-[78%]" style={rotate}>
          <div className="flex flex-col gap-[6px] bg-sheet px-[10%] py-[12%]">
            <span className="block h-[2px] w-4/5 bg-ink/60" />
            <span className="block h-[2px] w-3/5 bg-ink/40" />
          </div>
          {/* the tail of a phone bubble, on the sender's side */}
          <div className="absolute -bottom-[7px] end-[14%] h-0 w-0 border-e-[9px] border-t-[8px] border-e-transparent border-t-sheet" />
        </div>
      </div>
    )
  }

  if (kind === 'key') {
    return (
      <div className={`flex h-full w-full items-center justify-center text-concrete ${className}`} role="img" aria-label={label}>
        <svg viewBox="0 0 64 28" className="w-[78%]" style={rotate} aria-hidden="true">
          <circle cx="11" cy="14" r="8.5" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M19.5 14 H60 M50 14 v7 M56 14 v5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square" />
        </svg>
      </div>
    )
  }

  // כלום — מקום ריק, וזה מה שהסוף אמר
  return (
    <div className={`flex h-full w-full items-center justify-center ${className}`} role="img" aria-label={label}>
      <div className="h-[62%] w-[72%] border-2 border-dashed border-concrete/45" style={rotate} />
    </div>
  )
}

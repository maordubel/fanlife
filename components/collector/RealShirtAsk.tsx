'use client'

import { useEffect, useState } from 'react'

import { SignInPrompt } from '@/components/collector/SignInPrompt'
import { have, wantSet } from '@/lib/collector/api'
import { errorLabel } from '@/lib/collector/labels'
import { pendingIntents, rememberIntent } from '@/lib/collector/pending'
import type { CollectorError } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

/**
 * "זיהית אותה. עכשיו השאלה האמיתית: יש לך אותה בבית?" — שער 4 פוגש את הארון (מפרט §42–§43).
 *
 * **שני אוספים, ואף אחד לא נכתב מהשני.** מה שהורכב בשער 4 הוא UNLOCKED_IN_GAME ונשמר ב-
 * `lib/kit/collection.ts`; מה שתלוי בבית הוא OWNED_IN_REAL_LIFE ונשמר בחשבון. הקובץ הזה לא מייבא
 * את הראשון ולא קורא ממנו, ו-`tests/collector-closet.test.ts` אוסר עליו.
 *
 * **הוא לא עוצר את הסבב** (כלל 21). הוא יושב בחשיפה, אחרי הבדיקה, ו"לחולצה הבאה" לא מחכה לו.
 * אורח שעונה לא נשלח להתחבר באמצע סבב — זה היה זורק את הסבב. התשובה שלו נרשמת, ובסוף הסבב
 * `<RealShirtPending>` מציע לשמור את מה שסימן.
 */
export function RealShirtAsk({ slug, kitId }: { slug: string; kitId: string | null }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<'have' | 'want' | 'pending' | null>(null)
  const [error, setError] = useState<CollectorError | null>(null)

  async function answer(action: 'have' | 'want') {
    if (busy) return
    setBusy(true)
    setError(null)
    const out = action === 'have' ? await have(slug, kitId) : await wantSet(slug, true, { kitId })
    setBusy(false)
    if (out.ok) {
      setDone(action)
      return
    }
    if (out.error === 'auth_required') {
      rememberIntent({ slug, kitId, action })
      setDone('pending')
      return
    }
    setError(out.error)
  }

  return (
    <section aria-labelledby={`real-${slug}`} data-real-shirt="" className="mt-2 border-rule border-ink bg-sheet p-2.5">
      <p id={`real-${slug}`} className="font-display text-[19px] leading-tight text-ink">
        {t('collector.gate4.lead')}
      </p>
      <p className="mt-0.5 font-body text-[13px] font-bold leading-snug text-ink">{t('collector.gate4.ask')}</p>
      {done === null ? (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => void answer('have')}
            disabled={busy}
            className="flex min-h-tap items-center justify-center border-rule border-red bg-red px-3 font-body text-[14px] font-extrabold text-paper disabled:opacity-60"
          >
            {t('collector.gate4.have')}
          </button>
          <button
            type="button"
            onClick={() => void answer('want')}
            disabled={busy}
            className="flex min-h-tap items-center justify-center border-rule border-ink bg-paper px-3 font-body text-[14px] font-extrabold text-ink disabled:opacity-60"
          >
            {t('collector.gate4.want')}
          </button>
        </div>
      ) : (
        <p role="status" className={`mt-1.5 font-body text-[13px] font-bold ${done === 'want' ? 'text-sign' : 'text-red'}`}>
          {done === 'have' ? t('collector.gate4.haveDone') : done === 'want' ? t('collector.gate4.wantDone') : t('collector.gate4.pending')}
        </p>
      )}
      {error ? (
        <p role="alert" className="mt-1.5 font-body text-[12px] leading-snug text-muted">
          {errorLabel(error)}
        </p>
      ) : null}
      <p className="mt-1.5 font-body text-[11px] leading-snug text-muted">{t('collector.gate4.separate')}</p>
    </section>
  )
}

/**
 * The end of the round: what a guest marked on the way, and one way to keep it (spec §44). Shown
 * only when something is waiting — a round nobody answered has nothing to sign in for.
 */
export function RealShirtPending() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    setCount(pendingIntents().length)
  }, [])
  if (count === 0) return null
  return (
    <div className="mt-3">
      <p className="mb-1.5 font-body text-[13px] font-bold text-ink">
        {count === 1 ? t('collector.gate4.pendingOne') : t('collector.gate4.pendingMany', { n: String(count) })}
      </p>
      <SignInPrompt next="/kits/closet" />
    </div>
  )
}

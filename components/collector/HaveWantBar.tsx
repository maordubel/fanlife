'use client'

import { useState } from 'react'

import { ShareRow } from '@/components/share/ShareRow'
import { SignInPrompt } from '@/components/collector/SignInPrompt'
import { have, wantSet } from '@/lib/collector/api'
import { isolate, wantedCard } from '@/lib/collector/cards'
import { errorLabel } from '@/lib/collector/labels'
import { rememberIntent } from '@/lib/collector/pending'
import type { CollectorError, ShirtSignal } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

/**
 * יש לי · מחפש — על כל חולצה בארכיון (מפרט §5, §41, §44, §47).
 *
 * **לחיצה אחת, בלי טופס.** "יש לי" שולח את הסלאג ואת `kit_id` (כשה-Kit Master יודע אותו) ותו לא;
 * מידה, מצב ותמונה נדרשים רק כשפותחים עותק למכירה או להחלפה, בארון. אורח שלוחץ שומע
 * "מעולה. שמור אותה בארון שלך." — והלחיצה שלו נזכרת (`lib/collector/pending.ts`) ונכנסת לארון
 * ברגע שהוא חוזר מחובר, כדי שההרשמה תהיה סיבה ולא מחסום.
 *
 * **אות הביקוש הוא מה שהמסד ספר, לא הערכה.** בלי תשובה מהמסד (אין מפתחות, אין רשת) השורה לא
 * מודפסת בכלל — "0 מחפשים" שלא נספר הוא בדיוק האפס המומצא שכלל 11 אוסר.
 */
export function HaveWantBar({
  slug,
  kitId,
  dateLabel,
  variantHe,
  signal,
  onSignal,
}: {
  slug: string
  kitId: string | null
  /** `1994/95` or `1994 בערך`, already worded */
  dateLabel: string
  /** the variant's own word, printed on the wanted card unless it is the home shirt */
  variantHe: string | null
  /** what the database counted; undefined until it answers, and for ever when there is none */
  signal: ShirtSignal | undefined
  onSignal?: (next: ShirtSignal) => void
}) {
  const [busy, setBusy] = useState<'have' | 'want' | null>(null)
  const [error, setError] = useState<CollectorError | null>(null)
  const [ask, setAsk] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [saved, setSaved] = useState<'have' | 'want' | 'unwant' | null>(null)

  const youHave = signal?.youHave ?? false
  const youWant = signal?.youWant ?? false

  function settle(next: Partial<ShirtSignal>) {
    const base: ShirtSignal = signal ?? { have: 0, want: 0, forTrade: 0, forSale: 0, live: 0, youHave: false, youWant: false }
    onSignal?.({ ...base, ...next })
  }

  function refused(code: CollectorError, action: 'have' | 'want') {
    if (code === 'auth_required') {
      rememberIntent({ slug, kitId, action })
      setAsk(true)
      return
    }
    if (code === 'off') {
      setAsk(true)
      return
    }
    setError(code)
  }

  async function tapHave() {
    if (busy) return
    setBusy('have')
    setError(null)
    setSaved(null)
    const out = await have(slug, kitId)
    setBusy(null)
    if (!out.ok) return refused(out.error, 'have')
    setSaved('have')
    const base = signal
    // the database drops the want when a shirt is marked "have" — the counts follow it
    settle({
      youHave: true,
      youWant: false,
      have: (base?.have ?? 0) + (base?.youHave ? 0 : 1),
      want: Math.max(0, (base?.want ?? 0) - (base?.youWant ? 1 : 0)),
    })
  }

  async function tapWant() {
    if (busy) return
    const on = !youWant
    setBusy('want')
    setError(null)
    setSaved(null)
    const out = await wantSet(slug, on, { kitId })
    setBusy(null)
    if (!out.ok) return refused(out.error, 'want')
    setSaved(on ? 'want' : 'unwant')
    settle({ youWant: on, want: Math.max(0, (signal?.want ?? 0) + (on ? 1 : -1)) })
  }

  const market = (signal?.forSale ?? 0) + (signal?.forTrade ?? 0)
  const closetHref = `/kits/closet?shirt=${encodeURIComponent(slug)}`

  return (
    <section aria-labelledby={`bar-${slug}`} className="mt-stack border-plate border-ink bg-sheet">
      <div className="flex items-baseline justify-between gap-3 bg-ink px-3 py-2">
        <h2 id={`bar-${slug}`} className="font-display text-step-1 leading-none text-paper">
          {t('collector.bar.title')}
        </h2>
        <p className="font-latin text-[9px] font-bold tracking-[0.2em] text-red" dir="ltr">
          MY CLOSET
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3">
        {youHave ? (
          <a
            href={closetHref}
            aria-label={t('collector.have.onHint')}
            className="flex min-h-tap items-center justify-center border-rule border-red bg-red px-3 text-center font-body text-step-0 font-extrabold text-paper"
          >
            {t('collector.have.on')}
          </a>
        ) : (
          <button
            type="button"
            onClick={() => void tapHave()}
            disabled={busy !== null}
            aria-busy={busy === 'have'}
            className="flex min-h-tap items-center justify-center border-rule border-ink bg-paper px-3 font-body text-step-0 font-extrabold text-ink transition-transform duration-press ease-stamp active:scale-[.97] disabled:opacity-60 motion-reduce:transition-none"
          >
            {t('collector.have.button')}
          </button>
        )}
        <button
          type="button"
          onClick={() => void tapWant()}
          disabled={busy !== null || youHave}
          aria-pressed={youWant}
          aria-busy={busy === 'want'}
          title={youWant ? t('collector.want.onHint') : undefined}
          className={`flex min-h-tap items-center justify-center border-rule px-3 font-body text-step-0 font-extrabold transition-transform duration-press ease-stamp active:scale-[.97] disabled:opacity-45 motion-reduce:transition-none ${
            youWant ? 'border-sign bg-sign text-paper' : 'border-ink bg-paper text-ink'
          }`}
        >
          {youWant ? t('collector.want.on') : t('collector.want.button')}
        </button>
      </div>

      {saved === 'have' ? (
        <p role="status" className="-mt-1 px-3 pb-2 font-body text-step--1 text-ink">
          {t('collector.gate4.haveDone')}{' '}
          <a href={closetHref} className="font-extrabold text-red underline underline-offset-4">
            {t('collector.gate4.closet')}
          </a>
        </p>
      ) : saved === 'want' ? (
        <p role="status" className="-mt-1 px-3 pb-2 font-body text-step--1 text-sign">
          {t('collector.gate4.wantDone')}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="-mt-1 px-3 pb-2 font-body text-step--1 font-bold text-red">
          {errorLabel(error)}
        </p>
      ) : null}

      {ask ? (
        <div className="px-3 pb-3">
          <SignInPrompt next="/kits/closet" onClose={() => setAsk(false)} />
        </div>
      ) : null}

      {signal ? (
        <div className="border-t-hair border-ink/30 px-3 py-2.5">
          <p className="flex flex-wrap gap-x-2 gap-y-0.5 font-body text-step--1 text-ink">
            <span className="font-extrabold">
              {signal.want === 0
                ? t('collector.demand.wantNone')
                : signal.want === 1
                  ? t('collector.demand.wantOne')
                  : t('collector.demand.want', { n: String(signal.want) })}
            </span>
            <span aria-hidden="true" className="text-muted">·</span>
            <span>{signal.have === 1 ? t('collector.demand.haveOne') : t('collector.demand.have', { n: String(signal.have) })}</span>
            <span aria-hidden="true" className="text-muted">·</span>
            <span>
              {signal.forTrade === 1 ? t('collector.demand.tradeOne') : t('collector.demand.trade', { n: String(signal.forTrade) })}
            </span>
          </p>

          {youHave && signal.want > 0 ? (
            <div className="mt-2 border-s-plate border-red bg-paper py-2 pe-2 ps-3">
              <p className="font-display text-step-1 leading-tight text-ink">
                {signal.want === 1 ? t('collector.demand.yoursOne') : t('collector.demand.yours', { n: String(signal.want) })}
              </p>
              <a
                href={`${closetHref}&edit=1`}
                className="mt-1 inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-red underline underline-offset-4"
              >
                {t('collector.demand.openCta')}
              </a>
            </div>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-x-4">
            {market > 0 ? (
              <a
                href={`/kits/market?slug=${encodeURIComponent(slug)}`}
                className="inline-flex min-h-tap items-center font-body text-step--1 font-extrabold text-sign underline underline-offset-4"
              >
                {market === 1 ? t('collector.demand.marketOne') : t('collector.demand.market', { n: String(market) })}
              </a>
            ) : (
              <p className="py-2 font-body text-[12px] leading-snug text-muted">{t('collector.demand.marketNone')}</p>
            )}
            {signal.live > 0 ? (
              <a
                href="/kits/auction"
                className="inline-flex min-h-tap items-center gap-1.5 font-body text-step--1 font-extrabold text-red underline underline-offset-4"
              >
                <span aria-hidden="true" className="inline-block h-2 w-2 bg-red" />
                {t('collector.demand.live')}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="border-t-hair border-ink/30 px-3">
        <button
          type="button"
          onClick={() => setSharing((open) => !open)}
          aria-expanded={sharing}
          className="flex min-h-tap w-full items-center justify-between gap-2 font-body text-step--1 font-extrabold text-ink"
        >
          <span>{t('collector.share.wanted')}</span>
          <span aria-hidden="true" className="font-poster text-[20px] leading-none text-red">
            {sharing ? '−' : '+'}
          </span>
        </button>
      </div>
      {sharing ? (
        <div className="px-3 pb-3">
          <ShareRow
            kind="wanted"
            params={{}}
            headline={isolate(dateLabel)}
            route={`/kits/archive?shirt=${encodeURIComponent(slug)}`}
            card={wantedCard(dateLabel, variantHe)}
          />
        </div>
      ) : null}
    </section>
  )
}

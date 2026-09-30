'use client'

import Link from 'next/link'
import { useState } from 'react'

import type { PublicItem } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

export const threadHref = (id: string) => `/kits/market/c/${encodeURIComponent(id)}`

/**
 * בקש חיבור (מפרט §14) — not "contact the seller": the fan says what they want — to buy, or to
 * trade — and may add a first line; the request opens a conversation inside The Worker. No phone,
 * no e-mail, no WhatsApp is asked for or shown, and the panel says so in one line (§18).
 */
export function ConnectPanel({
  item,
  connectionId,
  busy,
  error,
  onConnect,
}: {
  item: Pick<PublicItem, 'forSale' | 'forTrade'>
  connectionId: string | null
  busy: boolean
  error: string | null
  onConnect: (kind: 'buy' | 'trade', body: string) => void
}) {
  const kinds: ('buy' | 'trade')[] = [...(item.forSale ? (['buy'] as const) : []), ...(item.forTrade ? (['trade'] as const) : [])]
  const [kind, setKind] = useState<'buy' | 'trade' | null>(kinds.length === 1 ? kinds[0]! : null)
  const [body, setBody] = useState('')

  if (connectionId) {
    return (
      <section className="border-plate border-ink bg-sheet p-4" data-market-connect="existing">
        <p className="font-display text-step-1 leading-tight text-ink">{t('market.connect.existing')}</p>
        <Link
          href={threadHref(connectionId)}
          className="mt-3 inline-flex min-h-tap items-center border-rule border-ink bg-red px-5 font-body text-step--1 font-extrabold text-paper"
        >
          {t('market.connect.toThread')}
        </Link>
      </section>
    )
  }

  return (
    <section aria-labelledby="market-connect" className="border-plate border-ink bg-sheet" data-market-connect="">
      <header className="flex items-baseline justify-between gap-3 bg-red px-4 py-2.5 text-paper">
        <h2 id="market-connect" className="font-display text-step-2 leading-none">
          {t('market.connect.title')}
        </h2>
      </header>
      <form
        className="p-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (kind && !busy) onConnect(kind, body.trim())
        }}
      >
        <p className="max-w-prose font-body text-[12.5px] leading-relaxed text-ink">{t('market.connect.body')}</p>
        <fieldset className="mt-3">
          <legend className="font-body text-step--1 font-extrabold text-ink">{t('market.connect.pick')}</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {kinds.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
                className={`min-h-tap border-rule px-2 font-body text-step--1 font-extrabold transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none ${
                  kind === value ? 'border-ink bg-ink text-paper' : 'border-ink bg-paper text-ink'
                }`}
              >
                {value === 'buy' ? t('market.connect.buy') : t('market.connect.trade')}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="mt-3 block font-body text-step--1 font-extrabold text-ink">
          {t('market.connect.message')}
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={t('market.connect.placeholder')}
            className="mt-1 block w-full border-rule border-ink bg-paper p-2 font-body text-step--1 font-normal text-ink placeholder:text-muted"
          />
        </label>
        {error ? (
          <p role="alert" className="mt-2 font-body text-step--1 font-bold text-red">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!kind || busy}
          className="mt-3 flex min-h-tap w-full items-center justify-center border-rule border-ink bg-red font-body text-step-0 font-extrabold text-paper disabled:opacity-50"
        >
          {busy ? t('market.connect.sending') : t('market.connect.send')}
        </button>
      </form>
    </section>
  )
}

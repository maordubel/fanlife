'use client'

import { useEffect, useMemo, useState } from 'react'

import { CollectorTag } from '@/components/collector/CollectorTag'
import { ShirtThumb } from '@/components/collector/ShirtThumb'
import { Num } from '@/components/ui/Num'
import { closetView } from '@/lib/collector/api'
import type { ClosetView, CollectorShirt } from '@/lib/collector/types'
import { activeCollection } from '@/lib/kit/collection'
import { portalConfigured } from '@/lib/portal/env'
import { t } from '@/lib/i18n'

import { ClosetInvite } from '../ClosetScreen'

/**
 * ארון של מישהו אחר — מה שתלוי אצלו ומה שהוא מחפש, בלי שם אמיתי ובלי דרך ליצור קשר מחוץ לשוק.
 *
 * **מגן הספוילר של הארכיון חל גם כאן.** חולצה ששער 4 עוד יכול לחלק למי שמסתכל מגיעה בלי תצלום,
 * עד שהוא מבקש לראות — בדיוק כמו באגף. האוסף של המשחק רק **נקרא** כאן, כדי לדעת מה הוא כבר
 * הרכיב; שום דבר בארון לא כותב אליו.
 */
type Phase = { kind: 'loading' } | { kind: 'off' } | { kind: 'hidden' } | { kind: 'error' } | { kind: 'ready'; view: ClosetView }

export function PublicCloset({
  handle,
  token,
  shirts,
  fixture,
}: {
  handle: number | null
  token: string | null
  shirts: Readonly<Record<string, CollectorShirt>>
  /** the QA harness hands the answer in rather than asking a database it does not have */
  fixture?: ClosetView | 'hidden'
}) {
  const [phase, setPhase] = useState<Phase>(
    fixture === 'hidden' ? { kind: 'hidden' } : fixture ? { kind: 'ready', view: fixture } : { kind: 'loading' },
  )
  const store = useMemo(() => activeCollection(), [])
  const [built, setBuilt] = useState<Set<string> | null>(null)
  const [uncovered, setUncovered] = useState<Set<string>>(new Set())

  useEffect(() => {
    let live = true
    void store.read().then((rows) => {
      if (live) setBuilt(new Set(Object.keys(rows)))
    })
    return () => {
      live = false
    }
  }, [store])

  useEffect(() => {
    if (fixture) return
    if (handle === null) {
      setPhase({ kind: 'hidden' })
      return
    }
    if (!portalConfigured()) {
      setPhase({ kind: 'off' })
      return
    }
    let live = true
    void closetView(handle, token).then((out) => {
      if (!live) return
      if (out.ok) setPhase({ kind: 'ready', view: out })
      else setPhase(out.error === 'not_found' ? { kind: 'hidden' } : { kind: 'error' })
    })
    return () => {
      live = false
    }
  }, [handle, token, fixture])

  // covered until the game's own record says this viewer has built it — the safe default
  const shielded = (slug: string) => {
    const key = shirts[slug]?.spoiler
    return Boolean(key) && !uncovered.has(slug) && !(built?.has(key as string) ?? false)
  }
  const uncover = (slug: string) => setUncovered((rows) => new Set(rows).add(slug))

  if (phase.kind === 'loading') {
    return (
      <p role="status" className="mt-stack border-rule border-ink bg-sheet p-4 font-body text-step--1 text-muted">
        {t('collector.public.loading')}
      </p>
    )
  }
  if (phase.kind === 'off') return <div className="mt-stack max-w-2xl"><ClosetInvite off /></div>
  if (phase.kind === 'error') {
    return (
      <p role="alert" className="mt-stack border-rule border-red bg-sheet p-4 font-body text-step--1 text-ink">
        {t('collector.error.network')}
      </p>
    )
  }
  if (phase.kind === 'hidden') {
    return (
      <div data-closet-hidden="" className="mt-stack max-w-2xl border-rule border-dashed border-ink/50 bg-sheet p-5">
        <p className="font-display text-step-2 leading-tight text-ink">{t('collector.public.notFound')}</p>
        <p className="mt-2 font-body text-step--1 leading-relaxed text-muted">{t('collector.public.notFoundBody')}</p>
        <a href="/kits/closet" className="mt-3 inline-flex min-h-tap items-center bg-red px-4 font-body text-step--1 font-extrabold text-paper">
          {t('collector.public.cta')}
        </a>
      </div>
    )
  }

  const { view } = phase
  return (
    <div data-public-closet="" className="mt-stack">
      {view.mine ? (
        <p data-closet-own="" className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-rule border-ink bg-sheet px-3 py-2 font-body text-step--1 text-ink">
          <span>{t('collector.public.yours')}</span>
          <a href="/kits/closet" className="inline-flex min-h-tap items-center font-extrabold text-red underline underline-offset-4">
            {t('collector.public.yoursEdit')}
          </a>
        </p>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3 border-y-rule border-ink py-2.5">
        <div className="min-w-0">
          <CollectorTag label={view.label} />
        </div>
        <p className="flex items-baseline gap-2">
          <span className="font-poster text-[40px] leading-none text-red">
            <Num>{String(view.items.length)}</Num>
          </span>
          <span className="font-body text-step--1 font-extrabold text-ink">{t('collector.public.have')}</span>
        </p>
      </div>

      <div className="mt-stack lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:items-start lg:gap-6">
        <section aria-labelledby="public-have">
          <h2 id="public-have" className="border-b-plate border-ink pb-1 font-display text-step-2 leading-none text-ink">
            {t('collector.public.have')}
          </h2>
          {view.items.length === 0 ? (
            <p className="mt-3 font-body text-step--1 text-muted">{t('collector.public.empty')}</p>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {view.items.map((item, index) => {
                const shirt = shirts[item.archiveSlug]
                const cover = shielded(item.archiveSlug)
                const body = (
                  <>
                    <ShirtThumb shirt={shirt} shielded={cover} onUncover={cover ? () => uncover(item.archiveSlug) : undefined} />
                    <span className="mt-2 block font-poster text-[17px] leading-none text-ink">
                      <DateLine shirt={shirt} slug={item.archiveSlug} />
                    </span>
                    <span className="mt-1 block truncate font-body text-[11px] font-extrabold text-red">{shirt?.variantHe ?? ''}</span>
                    {item.id ? (
                      <span className="mt-1 flex gap-px">
                        {item.forTrade ? <span className="bg-sign px-1.5 font-body text-[11px] font-extrabold text-paper">⇄</span> : null}
                        {item.forSale ? <span className="bg-red px-1.5 font-body text-[11px] font-extrabold text-paper">₪</span> : null}
                        <span className="ps-1.5 font-body text-[11px] font-extrabold text-sign">{t('collector.public.openItem')}</span>
                      </span>
                    ) : null}
                  </>
                )
                return (
                  <li key={`${item.archiveSlug}-${index}`} className="border-rule border-ink/70 bg-sheet p-2">
                    {item.id && !cover ? (
                      <a href={`/kits/market/item/${item.id}`} className="block">
                        {body}
                      </a>
                    ) : (
                      body
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="public-wants" className="mt-stack lg:mt-0">
          <h2 id="public-wants" className="border-b-plate border-ink pb-1 font-display text-step-2 leading-none text-ink">
            {t('collector.public.wants')}
          </h2>
          {view.wants.length === 0 ? (
            <p className="mt-3 font-body text-step--1 text-muted">{t('collector.public.wantsEmpty')}</p>
          ) : (
            <ul className="mt-2">
              {view.wants.map((slug) => {
                const shirt = shirts[slug]
                return (
                  <li key={slug} className="border-b-hair border-ink/25">
                    <a href={`/kits/archive?shirt=${encodeURIComponent(slug)}`} className="flex min-h-tap items-center gap-3 py-1.5">
                      <span className="font-poster text-[20px] leading-none text-sign">♡</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-poster text-[18px] leading-none text-ink">
                          <DateLine shirt={shirt} slug={slug} />
                        </span>
                        <span className="block truncate font-body text-[11px] font-extrabold text-red">{shirt?.variantHe ?? ''}</span>
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
          <a href="/kits/closet" className="mt-stack flex min-h-tap items-center justify-center bg-red px-4 font-body text-step--1 font-extrabold text-paper">
            {t('collector.public.cta')}
          </a>
        </section>
      </div>
    </div>
  )
}

function DateLine({ shirt, slug }: { shirt: CollectorShirt | undefined; slug: string }) {
  if (!shirt) return <bdi>{slug}</bdi>
  if (!shirt.seasonAmbiguous && shirt.seasonLabel) return <Num>{shirt.seasonLabel}</Num>
  return (
    <>
      <Num>{String(shirt.yearRaw ?? shirt.year)}</Num> {t('kits.archive.approx')}
    </>
  )
}


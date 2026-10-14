'use client'
// FAN LIFE — hand-written (THE WEEKLY, rule 124). Replaces the fork's swipe strip for FAN LIFE: nothing scrolls sideways.

import { useState } from 'react'

import { UserPhoto } from '@/components/fanlife/collector/UserPhoto'
import type { CollectorShirt } from '@/lib/collector/types'
import { t } from '@/lib/fanlife/i18n'

import { ArchivePhoto } from '@/components/fanlife/market/ShirtBits'

/**
 * The item's photographs as a print pinned to an orange plate: one photo large, the others as a wrapping grid of
 * thumbnails under it (a tap shows that one). The price sits on a roundel. With no photos yet the ARCHIVE photograph
 * shows, labelled as what it is — the model, not this object — and the page says photos can be asked for.
 */
export function ItemPhotos({ photos, shirt, price }: { photos: readonly string[]; shirt: CollectorShirt | null; price: string | null }) {
  const [index, setIndex] = useState(0)
  const at = Math.min(index, Math.max(0, photos.length - 1))
  const archive = photos.length === 0
  return (
    <section className="wkc-photos" aria-label={t('market.item.gallery')} data-market-gallery={archive ? 'archive' : 'copy'}>
      <div className="wk-orangeplate wkc-photos-plate">
        <span className="wk-speed" aria-hidden="true" />
        <figure className="wkc-print">
          <span className="wkc-tape" aria-hidden="true" />
          <div className="wkc-print-pic">
            {archive ? (shirt ? <ArchivePhoto shirt={shirt} eager /> : null) : <UserPhoto path={photos[at]!} />}
          </div>
          <figcaption className="wk-k">{archive ? t('market.item.archivePhoto') : t('market.item.gallery.count', { i: String(at + 1), n: String(photos.length) })}</figcaption>
        </figure>
        {price ? <span className="wk-roundel wkc-price"><b className="wk-num">{price}</b></span> : null}
      </div>
      {archive ? <p className="wk-cap white wkc-photos-note">{t('market.item.gallery.none')}</p> : null}
      {photos.length > 1 ? (
        <ul className="wkc-thumbs">
          {photos.map((path, i) => (
            <li key={path}>
              <button type="button" className="min-h-tap" onClick={() => setIndex(i)} aria-label={t('market.item.gallery.count', { i: String(i + 1), n: String(photos.length) })} aria-current={i === at ? 'true' : undefined}>
                <UserPhoto path={path} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

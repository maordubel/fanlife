import Link from 'next/link'

import { UserPhoto } from '@/components/collector/UserPhoto'
import { conditionLabel, isReproduction, sizeLabel, typeLabel } from '@/lib/collector/labels'
import { copyTerms, shirtName } from '@/lib/collector/market'
import type { CollectorShirt, PublicItem } from '@/lib/collector/types'
import { t } from '@/lib/i18n'
import { CollectorTag } from '@/components/collector/CollectorTag'

export const itemHref = (id: string) => `/kits/market/item/${encodeURIComponent(id)}`

/**
 * עותק אחד על השולחן — a torn ticket under the shirt it is a copy of: what it asks for (a price,
 * "open to offers", a trade), what it is (size, condition, and a replica ALWAYS says so — §24),
 * and who holds it, as a number (§19). The whole row is the link; the tap height is the row.
 */
export function CopyTicket({ item, shirt, hidePhoto = false }: { item: PublicItem; shirt: CollectorShirt; hidePhoto?: boolean }) {
  const terms = copyTerms(item)
  const photo = item.photos[0]
  return (
    <Link
      href={itemHref(item.id)}
      aria-label={t('market.copy.aria', { shirt: shirtName(shirt) })}
      className="group flex min-h-tap items-stretch gap-3 border-t-hair border-dashed border-ink/45 px-3 py-2.5 transition-colors duration-press hover:bg-paper focus-visible:bg-paper"
      data-market-copy=""
    >
      <span className="relative block h-[60px] w-[60px] shrink-0 overflow-hidden border-hair border-ink/40 bg-paper">
        {photo && !hidePhoto ? (
          <UserPhoto path={photo} />
        ) : (
          <span className="flex h-full w-full items-center justify-center px-1 text-center font-body text-[9.5px] leading-tight text-muted">
            {t('market.copy.noPhoto')}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          {terms.map((term, index) => (
            <span
              key={term}
              className={`font-poster leading-none ${index === 0 && item.forSale && item.askingPrice !== null ? 'text-[24px] text-red' : 'text-[17px] text-sign'}`}
            >
              {term}
            </span>
          ))}
          {item.mine ? (
            <span className="bg-ink px-1.5 py-0.5 font-body text-[10px] font-extrabold text-paper">{t('market.copy.mine')}</span>
          ) : null}
          {item.state === 'reserved' ? (
            <span className="border-hair border-ink px-1.5 font-body text-[10px] font-extrabold text-ink">{t('market.copy.reserved')}</span>
          ) : null}
        </span>
        <span className="flex flex-wrap gap-x-2 font-body text-[11.5px] leading-snug text-ink">
          <span className={isReproduction(item.itemType) ? 'font-extrabold text-sign' : 'font-bold'}>{typeLabel(item.itemType)}</span>
          {item.size ? <span>{sizeLabel(item.size)}</span> : null}
          {item.condition ? <span className="text-muted">{conditionLabel(item.condition)}</span> : null}
        </span>
        {item.seller ? (
          <span className="block truncate">
            <CollectorTag label={item.seller} compact />
          </span>
        ) : null}
      </span>
      <span aria-hidden="true" className="self-center font-body text-step-0 text-red transition-transform duration-press group-hover:-translate-x-0.5">
        ←
      </span>
    </Link>
  )
}

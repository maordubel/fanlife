import { claimLabel, conditionLabel, formatPrice, isReproduction, sizeLabel, typeLabel } from '@/lib/collector/labels'
import type { PublicItem } from '@/lib/collector/types'
import { t } from '@/lib/i18n'
import { Num } from '@/components/ui/Num'

/**
 * מה שנכון על העותק, בשורות — מידה, מצב, סוג, טענת מקוריות, הדפס, מחיר.
 * רפליקה תמיד נושאת את ההערה שלה (מפרט §24), וטענת מקוריות תמיד מנוסחת כמה שהמוכר מציין (§9).
 */
export function ItemFacts({ item, showPrice = true }: { item: Omit<PublicItem, 'seller'>; showPrice?: boolean }) {
  return (
    <div className="font-body text-step--1 leading-relaxed text-ink">
      <p className="flex flex-wrap gap-x-3 gap-y-1">
        <span className="font-extrabold">{typeLabel(item.itemType)}</span>
        {item.size ? <span>{sizeLabel(item.size)}</span> : null}
        {item.condition ? <span>{conditionLabel(item.condition)}</span> : null}
      </p>
      {item.authenticityClaim ? <p className="text-muted">{claimLabel(item.authenticityClaim)}</p> : null}
      {isReproduction(item.itemType) ? (
        <p className="mt-1 border-s-4 border-sign ps-2 text-[11.5px] leading-snug text-ink">{t('collector.replica.note')}</p>
      ) : null}
      {item.playerName || item.playerNumber !== null ? (
        <p>
          {t('collector.print', { name: item.playerName ?? '', number: item.playerNumber === null ? '' : String(item.playerNumber) })}
        </p>
      ) : null}
      {showPrice && item.forSale ? (
        <p className="mt-1 flex flex-wrap items-baseline gap-2">
          {item.askingPrice !== null ? (
            <span className="font-poster text-step-2 text-red">
              <Num>{formatPrice(item.askingPrice, item.currency)}</Num>
            </span>
          ) : null}
          {item.openToOffers ? <span className="text-muted">{t('collector.openToOffers')}</span> : null}
        </p>
      ) : null}
    </div>
  )
}

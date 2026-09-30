import type { Metadata } from 'next'

import { EmptyState } from '@/components/ui/EmptyState'
import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import { lockedCatalog, facetCounts } from '@/lib/kit/catalog'
import { t } from '@/lib/i18n'
import { kitRecords } from '@/lib/kit/kit-master'
import { gateMetadata } from '@/lib/seo'

import { KitWing } from './KitWing'

export const metadata: Metadata = gateMetadata('kits')

/**
 * legacyKey → the archive's own photograph of that exact shirt (its `src` only — a URL, not the
 * spec). Real photographs always beat the graphics we generate (Maor, 23.9.2026): the collection
 * card of a shirt you PROVED you built shows this instead of the drawn shirt. A card for a shirt
 * you have not built never reaches this map (`KitWing` gates it on `built && row`, same rule as
 * Gate 4's reveal, spec §15/§24) — the photo is the hero of a shirt you already know, never a
 * preview of one you do not.
 */
function photosByKey(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const kit of kitRecords()) {
    if (kit.evidence.exactPhoto) out[kit.legacyKey] = kit.evidence.exactPhoto.src
  }
  return out
}

/**
 * שער 5 — אגף המדים.
 *
 * What this page sends is a SEASON AND A VARIANT per kit — nothing a Gate 4 puzzle asks for. The
 * shirts the device built are drawn after it proves it built them (`app/kits/actions.ts`); the DNA
 * rack of the studio is the same rows, filtered to the ones whose DNA opened (brief §15–16).
 */
export default function KitsPage() {
  const catalog = lockedCatalog()
  return (
    <Screen title={t('screen.kits.title')} sub={t('screen.kits.sub')} stage>
      {catalog.length > 0 ? (
        <KitWing catalog={catalog} counts={facetCounts(catalog)} photos={photosByKey()} />
      ) : (
        <EmptyState title={t('empty.kits')} body={t('empty.kits.body')} />
      )}
      <div className="hidden md:block">
        <ReportLink />
      </div>
    </Screen>
  )
}

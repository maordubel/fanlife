import type { Metadata } from 'next'
import Link from 'next/link'

import { ClosetDoor } from '@/components/collector/ClosetDoor'
import { EmptyState } from '@/components/ui/EmptyState'
import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import {
  archiveDecades,
  archiveShirts,
  archiveSources,
  archiveSummary,
  archiveVariants,
} from '@/lib/kit/archive'
import { collectorShirts } from '@/lib/collector/catalog'
import { playableKits } from '@/lib/kit/kit-master'
import { t } from '@/lib/i18n'
import { gateMetadata } from '@/lib/seo'

import { ArchiveWing } from './ArchiveWing'

/**
 * שער 5 — ארכיון החולצות.
 *
 * A route of its own rather than a third tab inside `/kits`, for two reasons that are
 * both about honesty rather than navigation:
 *
 *   · **It is the only screen in the product that shows photographs of real objects.**
 *     `public/kits/` is the third yellow exemption, and the sweep visits this URL to
 *     measure the chrome around the photographs with the photographs hidden. A tab
 *     inside another screen has no URL, so it could not be swept at all.
 *   · **It is linkable.** "The 1985 away shirt" is a thing a person sends to another
 *     person, and a tab state is not.
 *
 * Everything is read on the SERVER — 168 rows, three facet lists and a summary — and
 * what crosses to the client is the projection the grid needs. `content/manual` never
 * reaches a browser (rule 1).
 */
export const metadata: Metadata = gateMetadata('kits-archive')

/**
 * The exact photographs of the shirts Gate 4 can deal — by file, to the kit's collection key. The
 * archive is the club's record and stays whole; what it does not do is hand a player the answer to
 * a puzzle they have not played, so those photographs arrive behind a shield (brief §15, rule 69).
 */
function spoilerMap(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const kit of playableKits()) {
    const photo = kit.evidence.exactPhoto
    if (photo) out[photo.file.replace(/\.webp$/, '')] = kit.legacyKey
  }
  return out
}

/** slug → Kit Master id, only for the exact photographs — the closet's join (`lib/collector/catalog.ts`) */
function kitMap(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const shirt of collectorShirts()) if (shirt.kitId) out[shirt.slug] = shirt.kitId
  return out
}

export default function KitArchivePage() {
  const shirts = archiveShirts()
  const summary = archiveSummary(shirts)

  return (
    <Screen title={t('screen.kitarchive.title')} sub={t('screen.kitarchive.sub')}>
      {shirts.length > 0 ? (
        <>
          <p className="mt-stack font-body text-step--1 leading-relaxed text-muted">
            {t('kits.archive.lede', {
              n: String(summary.total),
              from: String(summary.firstYear),
              to: String(summary.lastYear),
              approx: String(summary.approximate),
            })}
          </p>
          <div className="mt-3">
            <ClosetDoor compact />
          </div>
          {/* שוק האדומים — the copies fans hold of these shirts (spec §12). One shirt's copies are /kits/market?slug=<slug>. */}
          <Link
            href="/kits/market"
            className="mt-2 inline-flex min-h-tap flex-wrap items-center gap-x-2 border-rule border-ink bg-sheet px-3 py-1.5 font-body text-step--1 font-extrabold text-ink"
            data-archive-market=""
          >
            <span className="text-red">{t('market.title')}</span>
            <span className="font-normal text-muted">{t('market.fromArchive')}</span>
            <span aria-hidden="true" className="text-red">
              ←
            </span>
          </Link>
          <ArchiveWing
            shirts={shirts}
            variants={archiveVariants(shirts)}
            decades={archiveDecades(shirts)}
            sources={archiveSources(shirts)}
            spoilers={spoilerMap()}
            kits={kitMap()}
          />
        </>
      ) : (
        <EmptyState title={t('kits.archive.empty')} body={t('kits.archive.note')} />
      )}
      <ReportLink />
    </Screen>
  )
}

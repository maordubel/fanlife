import { notFound } from 'next/navigation'

import { collectorShirtMap } from '@/lib/collector/catalog'
import { qaAllowed } from '@/lib/qa'

import { CollectorHarness } from './Harness'

/**
 * מתקן הארון — the closet, the archive bar, the Gate 4 question, the bell and the public closet,
 * drawn from fixtures, because this environment has no database and every real call answers `off`.
 *
 * `?view=` picks the screen (`closet`, `editor`, `notices`, `empty`, `public`, `hidden`, `parts`),
 * so a screenshot script can photograph each one at four widths. `notFound()` on the live site,
 * like every harness under `app/qa/` (`tests/brand.test.ts`).
 */
export default function CollectorQaPage({ searchParams }: { searchParams: { view?: string } }) {
  if (!qaAllowed()) notFound()
  const shirts = collectorShirtMap()
  return <CollectorHarness view={searchParams.view ?? 'closet'} shirts={shirts} />
}

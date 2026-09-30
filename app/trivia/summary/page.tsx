import { redirect } from 'next/navigation'

/**
 * TOMBSTONE — retired 1.9.2026. The run now ends in place, so there is no summary page.
 *
 * It stays as a redirect rather than a deletion for two reasons: a retired route must
 * still compile (see `app/kits/build/KitChallengeBoard.tsx` for why), and every share
 * link posted before the run screen existed points here. Those links now land on the
 * round they were bragging about instead of a 404.
 */
export default function RetiredSummaryPage({
  searchParams,
}: {
  searchParams: { seed?: string }
}) {
  const seed = Number(searchParams.seed) || 1
  redirect(`/trivia?seed=${seed}`)
}

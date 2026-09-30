import type { Metadata } from 'next'
import Link from 'next/link'

import { ChallengeLanding } from '@/components/share/ChallengeLanding'
import { Screen } from '@/components/ui/Screen'
import { inviteLine } from '@/lib/challenges/invite'
import { land } from '@/lib/challenges/runs'
import { t } from '@/lib/i18n'
import { withCard } from '@/lib/og/meta'

/**
 * /c/<code> — the challenge landing (ONE RED WORLD §9, §27, §50).
 *
 * The link a share row sends. It exists for three reasons, and none of them is a page to
 * read:
 *
 *   · **the preview** — its Open Graph card is the CHALLENGE (the gate's line, the
 *     sender's figure, never the answer), drawn by `app/api/card/challenge`;
 *   · **the check** — the server re-deals the run from the seed and compares it with the
 *     fingerprint the link was made with (`lib/challenges/runs.ts`); a run that drifted,
 *     or a link past its window, still opens the gate, only without the comparison;
 *   · **the door** — a guest goes straight into the identical run (§50: "shared link
 *     guest — נכנס ישר לאתגר"), no account, no wall. Gate 10 first opens the sealed man
 *     as a run on this device, because its run cannot live in a URL.
 *
 * A crawler reads the metadata and stops; a person is forwarded on the first frame.
 */
export const dynamic = 'force-dynamic'

const BASE: Metadata = {
  title: t('challenge.landing.title'),
  description: t('challenge.landing.body'),
  robots: { index: false, follow: false },
}

export function generateMetadata({ params }: { params: { code: string } }): Metadata {
  const landing = land(params.code)
  if (!landing) return BASE
  const title = inviteLine(landing.challenge)
  return withCard(BASE, `/api/card/challenge?c=${encodeURIComponent(params.code)}`, title, t('challenge.og.cta'))
}

export default function ChallengePage({ params }: { params: { code: string } }) {
  const landing = land(params.code)
  if (!landing) {
    return (
      <Screen title={t('challenge.landing.title')} sub={t('challenge.landing.gone')}>
        <p className="mt-stack font-body text-step-0 text-ink">{t('challenge.landing.gone')}</p>
        <Link href="/" className="mt-3 inline-flex min-h-tap items-center border-rule border-ink bg-paper px-4 font-body font-extrabold text-ink">
          {t('challenge.landing.toGate')}
        </Link>
      </Screen>
    )
  }
  return (
    <Screen title={t('challenge.landing.title')} sub={inviteLine(landing.challenge)}>
      <ChallengeLanding
        code={params.code}
        gate={landing.challenge.gate}
        target={landing.target}
        expired={landing.reason === 'expired' || landing.reason === 'drift'}
        sealed={landing.challenge.gate === 10}
      />
    </Screen>
  )
}

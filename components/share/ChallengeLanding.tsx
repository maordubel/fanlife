'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { startBlindCowChallenge } from '@/app/c/actions'
import { flush, track } from '@/lib/analytics/meter'
import { GATE_ROUTE, type ChallengeGate } from '@/lib/challenges/contract'
import { t } from '@/lib/i18n'

/**
 * The landing's one job: count the arrival (§37 `share_joined`, `challenge_joined`) and
 * put the guest into the run on the first frame. The card underneath is what a person
 * sees for that frame, and what a person with scripts off gets as a plain link.
 */
export function ChallengeLanding({
  code,
  gate,
  target,
  expired,
  sealed,
}: {
  code: string
  gate: ChallengeGate
  target: string
  /** the run drifted or the link is past its window — the gate opens without the comparison */
  expired: boolean
  /** gate 10: the server opens the sealed man as a run before the gate is entered */
  sealed: boolean
}) {
  const router = useRouter()
  const [href, setHref] = useState(target)
  const went = useRef(false)

  useEffect(() => {
    if (went.current) return
    went.current = true
    const route = GATE_ROUTE[gate]
    track('share_joined', { gate: route, detail: `g${gate}` })
    track('challenge_joined', { gate: route, detail: expired ? `g${gate}:stale` : `g${gate}` })
    flush(true)
    if (!sealed) {
      router.replace(target)
      return
    }
    startBlindCowChallenge(code)
      .then((next) => {
        const to = next ?? target
        setHref(to)
        router.replace(to)
      })
      .catch(() => router.replace(target))
  }, [code, gate, target, expired, sealed, router])

  return (
    <section data-challenge-landing className="mt-stack border-rule border-ink bg-ink p-5 text-center text-paper">
      <p className="font-display text-step-3 leading-tight">{t('challenge.landing.title')}</p>
      <p className="mx-auto mt-2 max-w-[36ch] font-body text-step--1 text-concrete">{t(expired ? 'challenge.landing.expired' : 'challenge.landing.body')}</p>
      <Link href={href} className="mt-4 inline-flex min-h-tap items-center justify-center bg-red px-6 font-body text-step-0 font-extrabold text-paper">
        {t('challenge.landing.go')}
      </Link>
    </section>
  )
}

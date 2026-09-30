import { notFound } from 'next/navigation'

import { qaAllowed } from '@/lib/qa'

import { Preview } from './Preview'
import { t } from '@/lib/i18n'

/**
 * QA only — the pitch, without playing a life to reach it.
 *
 * Same discipline as `/qa/life-cutscene`, `/qa/life-finale` and `/qa/story` (rule 19): a
 * screen that exists so a thing can be LOOKED at during development, `notFound()` in
 * production so the exemption cannot leak, and built from the real component with a real
 * payload rather than from a mock.
 *
 * It is also where `scripts/life/playthrough.mjs` points its `pitch` probe: three widths,
 * a screenshot each, and the yellow count run on the actual rendered frame. A 3D scene
 * builds its colour at runtime and has no PNG for the asset scanner to read, so this page
 * is the only place rule 8 can be enforced on the football engine at all.
 *
 * `?away=plain` renders the opponent in chalk instead of the approved yellow — the frame
 * the probe asserts must contain no yellow at all.
 */
export const dynamic = 'force-dynamic'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ away?: string; quality?: string; minute?: string }>
}) {
  if (!qaAllowed()) notFound()
  const { away, quality, minute } = await searchParams

  return (
    <>
      <title>{t('life.pitch.qa.title')}</title>
      <div className="relative h-dvh w-full">
        <Preview
          pitch={{
            matchId: 'qa-pitch',
            windowId: 'free',
            mode: 'replay',
            homeHe: 'הפועל',
            awayHe: 'יריבה',
            // the harness holds no archive, so it prints no score it cannot source
            showScore: true,
            score: { home: 0, away: 0 },
            startMinute: minute ? Number(minute) : 0,
            era: 'mid-1980s',
            awayYellow: away !== 'plain',
            quality: quality === 'low' || quality === 'high' ? quality : 'medium',
          }}
        />
      </div>
    </>
  )
}

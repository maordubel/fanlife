import { notFound } from 'next/navigation'

import { qaAllowed } from '@/lib/qa'

import { Preview } from './Preview'
import { resolveChapterAnchor, resolveStageBAnchors } from '@/lib/life/anchor-server'
import { chapterFor } from '@/lib/life/content/chapters'
import { eraFor } from '@/lib/life/content/era'
import { buildFinale } from '@/lib/life/finale'
import { apply, emptyState } from '@/lib/life/events'
import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'

/**
 * QA only — the end of Stage A, without playing ninety minutes to reach it.
 *
 * Same idea as `/qa/story` (rule 19): a screen that exists so a thing can be LOOKED at
 * during development, `notFound()` in production, and built from the real component with
 * real data rather than from a mock. The three afternoons below are the three the finale
 * distinguishes — saw the goal, got in late, never got in — so a change that flattens
 * them into one is visible here in one screen.
 */
export const dynamic = 'force-dynamic'

const RUNS: Array<{ id: string; flags: string[] }> = [
  { id: 'saw-the-goal', flags: ['entry:granted', 'entry:ticket', 'saw:goal', 'went:alone'] },
  { id: 'got-in-late', flags: ['entry:granted', 'arrived:late'] },
  { id: 'never-got-in', flags: [] },
]

/**
 * ...ושלושת הימים שיש להם ניירת — `?chapter=1999-cup`, `2000-title`, `2000-double`.
 *
 * The card that closes those chapters now carries the match report: the goals with their
 * minutes and scorers, the shootout kick by kick, the referee and the crowd with the
 * disagreement about it kept, four scans of real paper and five links to film. None of
 * that can be judged from a diff. Rule 52 is blunt about this — *a door is placed by
 * looking, not by reading* — and the same goes for a screen that is mostly documents.
 */
const CHAPTERS = ['1986', '1990', '1998-laces', '1999-cup', '2000-title', '2000-double'] as const

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ run?: string; chapter?: string; card?: string; ending?: string }>
}) {
  if (!qaAllowed()) notFound()
  const { run, chapter, card: cardKind, ending } = await searchParams
  const picked = RUNS.find((entry) => entry.id === run) ?? RUNS[0]!
  const which = CHAPTERS.find((id) => id === chapter) ?? '1986'

  let state = emptyState(DEFAULT_IDENTITY, 1986)
  for (const flag of picked.flags) state = apply(state, { t: 'flag.raised', flag })
  const card = buildFinale(state, [])

  const row = chapterFor(which)
  const anchor = which === '1986' ? resolveChapterAnchor() : (resolveStageBAnchors()[row?.anchorKey ?? ''] ?? resolveChapterAnchor())

  // `?card=ending&ending=<id>` shows the Saturday's own card instead — the other half of
  // rule 49's pair, and the only place the keepsake gate can be looked at.
  const endings = eraFor(which).endings
  const endingRow = cardKind === 'ending' ? (endings[ending ?? ''] ?? Object.values(endings)[0] ?? null) : null

  return (
    <div className="relative h-dvh w-full">
      <Preview
        ending={
          endingRow
            ? {
                titleHe: endingRow.titleHe,
                bodyHe: endingRow.bodyHe,
                memoryHe: endingRow.memoryHe,
                chapter: which,
                presence: endingRow.presence ?? null,
              }
            : null
        }
        finale={{
          anchor,
          chapter: which,
          titleHe: card.titleHe,
          bodyHe: card.bodyHe,
          becameHe: card.becameHe,
          keptTicket: card.keptTicket,
          nextYear: 1990,
        }}
      />
    </div>
  )
}

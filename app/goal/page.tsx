import type { Metadata } from 'next'

import { EmptyState } from '@/components/ui/EmptyState'
import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import { goalFromHash } from '@/lib/challenges/runs'
import { dealRun, hasGoals, pinnedGoal } from '@/lib/game/goal'
import { wardrobe } from '@/lib/kit/playerShirt'
import { goalLinks } from '@/lib/links'
import { withCard } from '@/lib/og/meta'
import { goalCardQuery, parseGoalCard } from '@/lib/og/params'
import { roundFrom } from '@/lib/rotation/round'
import { t } from '@/lib/i18n'
import { gateMetadata } from '@/lib/seo'
import { GoalRun } from './GoalRun'

/**
 * שער 8 — שחזור השער.
 *
 * Three sourced goals a run, dealt here WITHOUT their zones: `dealRun()` strips the
 * truth and the narrative, and `submitGoal` re-reads the record from the seed to grade.
 * The player never receives an answer they have not earned.
 *
 * `?g=<goalId>` pins one goal as goal 1 of an otherwise normal run — the archive's
 * "rebuild this goal". An unknown or held id is ignored rather than refused: the link
 * still opens a run, just not a pinned one.
 */
/** A shared result (`?cg=…&ca=…`, delta 89) previews as its card: the goal, the accuracy, his shirt. */
export function generateMetadata({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): Metadata {
  const base = gateMetadata('goal')
  const card = parseGoalCard(searchParams)
  if (!card || !pinnedGoal(card.goalId)) return base
  return withCard(base, `/api/card/goal?${goalCardQuery(card)}`, `${card.avg}% · ${t('screen.goal.title')}`, t('connect.card.goal.cta'))
}

export default function GoalPage({
  searchParams,
}: {
  searchParams: { seed?: string; r?: string; g?: string | string[]; gh?: string | string[] }
}) {
  const round = roundFrom(searchParams)
  // a challenge pins its goal as a HASH (the id names the scorer, §44); `g` stays the plain pin
  const pin =
    pinnedGoal(Array.isArray(searchParams.g) ? searchParams.g[0] : searchParams.g) ??
    goalFromHash(Array.isArray(searchParams.gh) ? searchParams.gh[0] : searchParams.gh)
  const goals = hasGoals() ? dealRun(round.seed, round.cursor, pin) : []
  // Delta 88: every man on the pitch wears HIS shirt of THAT season — the photograph where
  // the archive has one (lib/kit/playerShirt.ts). Keyed `goalIndex|name`; the other side's
  // men get none (they are printed in navy). The pool is already public, so this carries
  // nothing the deal did not.
  const shirts = wardrobe(
    goals.flatMap((goal, index) =>
      goal.pool
        .filter((name) => !goal.opponents.includes(name))
        .map((name) => ({ key: `${index}|${name}`, player: name, season: goal.seasonLabel })),
    ),
  )

  // delta 89: where each dealt goal lives in the other gates — its match's archive card,
  // its AWAY DAYS stop when abroad, the scorer's card (lib/links, every target checked)
  const links = Object.fromEntries(goals.map((goal) => [goal.goalId, goalLinks(goal.goalId)]))

  return (
    <Screen title={t('screen.goal.title')} sub={t('screen.goal.sub')} stage>
      {goals.length > 0 ? (
        <>
          <GoalRun goals={goals} seed={round.seed} cursor={round.cursor} pin={pin} shirts={shirts} links={links} />
          <div className="shrink-0 max-md:hidden">
            <ReportLink />
          </div>
        </>
      ) : (
        <EmptyState title={t('empty.goal')} body={t('empty.goal.body')} />
      )}
    </Screen>
  )
}

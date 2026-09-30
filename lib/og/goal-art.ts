import 'server-only'

import goalsFile from '@/content/manual/goals.json'
import { momentForGoal } from '@/lib/archive/match-master'
import { pinnedGoal, seasonOfDate } from '@/lib/game/goal'
import { playerShirt } from '@/lib/kit/playerShirt'

import type { GoalArt } from './cards'
import type { GoalCard } from './params'

type GoalRow = { goalId: string; titleHe: string; subtitleHe: string; competitionHe: string; playedOn: string }

/**
 * The gate-8 card's facts, from the goal the link names — only a goal the gate really
 * deals (`pinnedGoal`), so a link cannot put an arbitrary title on the card. The fixture,
 * the title and the date are what the run already showed; the shirt is the scorer's real
 * shirt of that season where the archive holds its photograph (`playerShirt`), fetched
 * from the site's own `public/kits/og/` (its PNG twin) — never a drawing on a share card.
 */
export async function goalArt(card: GoalCard, origin: string): Promise<GoalArt | null> {
  const id = pinnedGoal(card.goalId)
  if (!id) return null
  const row = (goalsFile as unknown as { records: GoalRow[] }).records.find((r) => r.goalId === id)
  if (!row) return null
  const season = seasonOfDate(row.playedOn)
  const scorer = momentForGoal(id)?.scorer?.playerId ?? null
  let shirt: string | null = null
  let shirtSeason: string | null = null
  if (scorer) {
    const look = playerShirt(scorer, { season })
    if (look.kind === 'photo' && /^\/kits\/[a-z0-9-]+\.webp$/.test(look.src)) {
      // the PNG twin of the same photograph (scripts/og/kit-thumbs.py) — satori reads no WebP
      shirt = await dataUri(new URL(look.src.replace(/^\/kits\/(.+)\.webp$/, '/kits/og/$1.png'), origin).toString())
      shirtSeason = shirt ? look.seasonLabel : null
    }
  }
  return {
    titleHe: row.titleHe,
    subtitleHe: row.subtitleHe,
    competitionHe: row.competitionHe,
    avg: card.avg,
    best: card.best,
    score: card.score,
    shirt,
    shirtSeason,
  }
}

async function dataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'force-cache' })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (type !== 'image/png') return null
    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.length > 500_000) return null
    return `data:${type};base64,${bytes.toString('base64')}`
  } catch {
    return null
  }
}

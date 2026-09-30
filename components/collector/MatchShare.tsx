'use client'

import { ShareRow } from '@/components/share/ShareRow'
import { isolate, matchCard } from '@/lib/collector/cards'

/**
 * MATCH COMPLETED — the share on the success card of a finished deal (spec §49, §59).
 *
 * `mine` and `theirs` arrive already worded (`1989/90`, `1994 בערך`). A trade prints the shirt
 * that left ⇄ the shirt that arrived; a purchase has one shirt and `theirs` is null. The card
 * says "דרך The Worker" and nothing about money — the amount is nobody's business (spec §53).
 */
export function MatchShare({ kind, mine, theirs }: { kind: 'trade' | 'buy'; mine: string; theirs: string | null }) {
  const other = kind === 'trade' ? theirs : null
  const headline = other === null ? isolate(mine) : `${isolate(mine)} ⇄ ${isolate(other)}`
  return <ShareRow kind="match" params={{}} headline={headline} card={matchCard(mine, other)} route="/kits/market" />
}

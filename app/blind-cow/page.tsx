import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import { ArenaEntrance } from '@/components/gates/ArenaEntrance'
import { BlindCowGame } from '@/components/blind-cow/BlindCowGame'
import { Screen } from '@/components/ui/Screen'
import { BANK, searchEntries, todayInIsrael } from '@/lib/game/blind-cow/bank'
import { duelAvailable } from '@/lib/game/blind-cow/duel'
import { viewOf, type RunState } from '@/lib/game/blind-cow/engine'
import { open } from '@/lib/game/blind-cow/token'
import { t } from '@/lib/i18n'
import { blindCowHeadline } from '@/lib/og/cards'
import { withCard } from '@/lib/og/meta'
import { blindCowCardQuery, parseBlindCowCard } from '@/lib/og/params'

/**
 * שער 10 — פרה עיוורת (spec GATE10-BLINDCOW-AWAYDAYS, part A).
 *
 * Resolved here, on the server: a run already in progress on this device (the sealed
 * `bc_solo` / `bc_daily` cookies — a refresh resumes it on its original clock), today's
 * daily if it was already played, whether the duel server exists, and the guess list.
 * The bank itself — answers and unopened clues — never leaves the server; `viewOf` is the
 * projection, and it carries the answer only once a run is over.
 *
 * `?duel=<token>` opens a duel link; `?mode=daily` (a shared daily result) puts the daily
 * on the primary button without starting its clock.
 */
const BASE: Metadata = {
  title: t('screen.blindcow.title'),
  description: t('blindcow.meta.description'),
  alternates: { canonical: '/blind-cow' },
}

/** A shared result (`?bm=…&bs=…`, delta 89) previews as its card — never with a name in it. */
export function generateMetadata({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): Metadata {
  const card = parseBlindCowCard(searchParams)
  if (!card) return BASE
  return withCard(BASE, `/api/card/blind-cow?${blindCowCardQuery(card)}`, `${blindCowHeadline(card)} · ${t('screen.blindcow.title')}`, t('connect.card.bc.cta'))
}

export const dynamic = 'force-dynamic'

function resumed(name: 'bc_solo' | 'bc_daily', mode: 'solo' | 'daily') {
  const state = open<RunState>(cookies().get(name)?.value)
  if (!state || state.v !== 1 || state.mode !== mode) return null
  if (mode === 'daily' && state.day !== todayInIsrael()) return null
  return viewOf(state)
}

/** only a run still in play is handed down — a finished solo is not resumed */
function playing(view: ReturnType<typeof viewOf>) {
  return view && view.status === 'playing' ? view : null
}

export default function BlindCowPage({ searchParams }: { searchParams: { duel?: string; mode?: string; bm?: string } }) {
  const token = typeof searchParams.duel === 'string' && /^[0-9a-f]{32}$/.test(searchParams.duel) ? searchParams.duel : null
  return (
    <Screen title={t('screen.blindcow.title')} sub={t('screen.blindcow.sub')} stage>
      <ArenaEntrance logo="blind-cow" />
      <BlindCowGame
        entries={searchEntries()}
        bankSize={BANK.counts.solo}
        initialSolo={playing(resumed('bc_solo', 'solo'))}
        initialDaily={resumed('bc_daily', 'daily')}
        duelToken={token}
        duelAvailable={duelAvailable()}
        preferDaily={searchParams.mode === 'daily' || searchParams.bm === 'd'}
      />
    </Screen>
  )
}

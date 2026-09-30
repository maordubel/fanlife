'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { noteCrossLink } from '@/components/meter/GateMeter'
import { CrossLinks } from '@/components/links/CrossLinks'
import { ExitNext, ExitShare } from '@/components/result/UniversalExit'
import { ShareCardChips } from '@/components/links/ShareCard'
import { CompareCard } from '@/components/share/CompareCard'
import { ShareRow } from '@/components/share/ShareRow'
import { clueCard } from '@/lib/share/artefacts'
import { PlayerShirt } from '@/components/stage/PlayerShirt'
import { SlideSheet } from '@/components/stage/SlideSheet'
import { track } from '@/lib/analytics/meter'
import { t, type MessageKey } from '@/lib/i18n'
import type { DuelState } from '@/lib/game/blind-cow/duel'
import { secondsLabel } from '@/lib/game/blind-cow/scoring'
import type { RunView } from '@/lib/game/blind-cow/types'
import { blindCowCardQuery, type BlindCowCard } from '@/lib/og/params'
import { tierFromClues, voice } from '@/lib/voice'

import { CowMark } from './CowMark'
import { gateUrl } from './share'

/**
 * המסך שאחרי — the file is open (spec §3 State 4): who he was, in his real shirt (the
 * archive's photograph where one exists — `lib/kit/playerShirt.ts`), how many clues, the
 * raw and the weighted time with the sum written out, the clue that caught you, every
 * clue in a sheet, his archive card, share, and the next question. A duel adds the VS.
 */
export function ResultPanel({
  view,
  duel,
  onNext,
  onLobby,
  onRefreshDuel,
}: {
  view: RunView
  duel: DuelState | null
  onNext: (() => void) | null
  onLobby: () => void
  onRefreshDuel: (() => void) | null
}) {
  const [allOpen, setAllOpen] = useState(false)
  const r = view.result
  const tier = r ? tierFromClues(view.status === 'solved', r.hintsUsed) : 'low'
  useEffect(() => {
    if (r) track('result_view', { detail: `blind-cow:${tier}` })
    // one result, one view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r?.playerId])
  if (!r) return null
  const solved = view.status === 'solved'
  // the Red Voice (§19): "השם כבר היה שם." — same run, same line (seeded by the run itself)
  const spoken = voice({
    gate: 10,
    moment: 'result',
    result: tier,
    seed: `${view.mode}:${view.day ?? ''}:${r.playerId}:${r.hintsUsed}`,
    vars: { n: String(r.hintsUsed) },
  })
  const head = spoken.title
  const caught = r.caughtBy ? r.allClues.find((c) => c.n === r.caughtBy) : null

  const dailyTag = view.mode === 'daily' && view.day ? t('blindcow.share.dailyTag', { date: view.day.split('-').reverse().join('.') }) : ''
  let text = solved
    ? t('blindcow.share.solved', { daily: dailyTag, n: String(r.hintsUsed), s: secondsLabel(r.rawElapsedMs) })
    : t('blindcow.share.gaveUp', { daily: dailyTag })
  if (view.mode === 'duel' && duel?.winner) {
    text = t(duel.winner === 'me' ? 'blindcow.share.duelWon' : 'blindcow.share.duelLost', {
      n: String(r.hintsUsed),
      s: secondsLabel(r.rawElapsedMs),
    })
  }
  // delta 89: the shared link carries the result card (`lib/og/params.ts`) — how you did,
  // never who he was — and its WhatsApp preview is that card
  const card: BlindCowCard = {
    mode: view.mode,
    status: view.status === 'solved' ? 'solved' : view.status === 'timeout' ? 'timeout' : 'gave_up',
    hints: r.hintsUsed,
    tenths: Math.round(r.rawElapsedMs / 100),
    weightedTenths: solved ? Math.round(r.weightedTimeMs / 100) : null,
    duel: view.mode === 'duel' && duel?.winner ? (duel.winner === 'me' ? 'won' : duel.winner === 'them' ? 'lost' : duel.winner === 'tie' ? 'tie' : 'none') : null,
    day: view.mode === 'daily' ? (view.day ?? null) : null,
  }
  const query = blindCowCardQuery(card)
  const url = gateUrl(`?${query}${view.mode === 'daily' ? '&mode=daily' : ''}`)

  const extra = Math.max(0, r.hintsUsed - 1)
  const archiveLink = r.links.find((link) => link.kind === 'archive') ?? null

  return (
    <div className="flex min-h-0 flex-1 flex-col md:block">
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-hidden pt-1 md:mx-auto md:max-w-[520px]">
        <div className="flex shrink-0 items-center gap-2">
          <CowMark peek className="text-[34px] [@media(max-height:680px)]:text-[26px]" />
          <p className={`relative font-display text-[30px] leading-none [@media(max-height:680px)]:text-[24px] ${solved ? 'text-red' : 'text-sign'} animate-slam-solid`}>
            {head}
          </p>
        </div>
        {spoken.body && (
          <p data-exit="emotion" className="max-w-full shrink-0 truncate text-center font-body text-[12px] leading-snug text-muted">
            {spoken.body}
          </p>
        )}
        <div className="flex min-h-0 w-full flex-1 items-center justify-center gap-3">
          <PlayerShirt
            look={r.shirt}
            eager
            title={r.shirtTitle ? t('blindcow.result.shirt', { season: r.shirtTitle }) : t('blindcow.result.shirtPlain')}
            className="aspect-[4/5] h-full max-h-[280px] min-h-[84px] shrink-0 animate-fx-pop"
          />
          <div className="min-w-0 max-w-[55%]">
            <p className="font-display text-[26px] leading-[1.05] text-ink [@media(max-height:680px)]:text-[21px]">
              <bdi>{r.nameHe}</bdi>
            </p>
            {r.yearsHe && (
              <p className="mt-1 font-mono text-[12px] tabular-nums text-muted" dir="ltr">
                {r.yearsHe}
              </p>
            )}
            {r.shirtTitle && (
              <p className="mt-0.5 font-body text-[11px] text-muted">{t('blindcow.result.shirt', { season: r.shirtTitle })}</p>
            )}
            {archiveLink && (
              <Link
                href={archiveLink.href}
                data-blindcow="archive-link"
                onClick={() => {
                  track('cross_link_click', { detail: 'blind-cow:archive-primary' })
                  noteCrossLink()
                }}
                className="mt-2 flex min-h-tap items-center justify-between gap-2 border-rule border-ink bg-ink px-2.5 font-body text-[13px] font-extrabold text-paper active:scale-[.97]"
              >
                <span>{t('blindcow.result.archive')}</span>
                <span aria-hidden="true">←</span>
              </Link>
            )}
          </div>
        </div>

        <dl className="grid w-full shrink-0 grid-cols-3 border-rule border-ink bg-paper text-center">
          <div className="border-e-hair border-ink/40 py-1.5">
            <dt className="font-body text-[10px] font-extrabold tracking-widest text-sign">{t('blindcow.result.clues')}</dt>
            <dd className="font-poster text-[30px] leading-none text-ink">{r.hintsUsed}</dd>
          </div>
          <div className="border-e-hair border-ink/40 py-1.5">
            <dt className="font-body text-[10px] font-extrabold tracking-widest text-sign">{t('blindcow.result.time')}</dt>
            <dd className="font-poster text-[30px] leading-none text-ink" dir="ltr">
              {secondsLabel(r.rawElapsedMs)}″
            </dd>
          </div>
          <div className="bg-ink py-1.5">
            <dt className="font-body text-[10px] font-extrabold tracking-widest text-concrete">{t('blindcow.result.weighted')}</dt>
            <dd className="font-poster text-[30px] leading-none text-red" dir="ltr">
              {solved ? `${secondsLabel(r.weightedTimeMs)}″` : '—'}
            </dd>
          </div>
        </dl>
        {solved && (
          <p className="w-full shrink-0 truncate text-center font-mono text-[10.5px] tabular-nums text-muted">
            {t('blindcow.result.formula', { raw: secondsLabel(r.rawElapsedMs), extra: String(extra), wrong: String(r.wrongGuesses) })}
          </p>
        )}

        {view.mode === 'duel' && duel ? (
          <DuelVs duel={duel} view={view} onRefresh={onRefreshDuel} />
        ) : caught ? (
          <div className="w-full shrink-0 border-s-stamp border-red bg-paper px-2.5 py-1.5">
            <p className="font-body text-[10px] font-extrabold tracking-widest text-sign">{t('blindcow.result.caught')}</p>
            <p className="font-sign text-[14px] leading-snug text-ink">
              <bdi>{caught.valueHe}</bdi>
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-1.5 shrink-0 md:mx-auto md:max-w-[520px]">
        {view.mode !== 'duel' && (
          <CompareCard
            gate={10}
            mine={{ gate: 10, hints: r.hintsUsed, wrong: Math.min(99, r.wrongGuesses), status: view.status === 'solved' ? 'solved' : view.status === 'timeout' ? 'timeout' : 'gave_up' }}
          />
        )}
        <CrossLinks links={r.links} from="blind-cow" className="pb-1.5" />
        <ExitNext next={r.next} from="blind-cow" compact />
        <ExitShare label={spoken.ctaShare} from="blind-cow">
          {/* the ONE share system (rule 19): the clue card — how many clues, never who — and a
              challenge whose man is sealed on the server (§44); the OG chips ride under it */}
          <ShareRow
            kind="blindcow"
            params={{}}
            headline={text}
            card={clueCard({ hints: r.hintsUsed, total: 10, solved })}
            challenge={{ gate: 10 }}
          />
          <ul className="-mx-1 mt-1.5 flex gap-1.5 overflow-x-auto px-1">
            <ShareCardChips
              imagePath={`/api/card/blind-cow?${query}`}
              url={url}
              text={text}
              onShared={(channel) => track('blind_cow_result_shared', { detail: channel })}
            />
          </ul>
        </ExitShare>
        <div className="-mx-1 mt-1.5 flex gap-1.5 overflow-x-auto px-1 pb-1.5">
          <button type="button" onClick={() => setAllOpen(true)} className="flex min-h-tap shrink-0 items-center border-rule border-ink bg-paper px-3 font-body text-[12.5px] font-extrabold text-ink active:scale-[.97]">
            {t('blindcow.result.all')}
          </button>
        </div>
        <button
          type="button"
          onClick={onNext ?? onLobby}
          className="flex min-h-tap w-full items-center justify-center border-rule border-ink bg-red px-4 font-body text-step-0 font-extrabold text-paper active:scale-[.98]"
        >
          {onNext ? t('blindcow.result.next') : t('blindcow.result.lobby')}
        </button>
      </div>

      <SlideSheet open={allOpen} onClose={() => setAllOpen(false)} title={t('blindcow.result.all')} latin={t('blindcow.latin.clues')} size="auto">
        <ol className="flex flex-col gap-1">
          {r.allClues.map((clue) => {
            const opened = clue.n <= r.hintsUsed
            return (
              <li key={clue.n} className={`flex items-baseline gap-2 border-b-hair border-ink/25 py-1.5 ${opened ? '' : 'text-muted'}`}>
                <span className={`w-6 shrink-0 text-center font-poster text-[20px] leading-none ${clue.n === r.caughtBy ? 'text-red' : opened ? 'text-ink' : 'text-muted'}`}>{clue.n}</span>
                <span className="min-w-0 flex-1 font-body text-[13px] leading-snug">
                  <span className="font-extrabold text-sign">{clue.labelHe}</span> · <bdi>{clue.valueHe}</bdi>
                  {!opened && <span className="ms-1.5 font-body text-[10px] text-muted">({t('blindcow.result.unopened')})</span>}
                </span>
              </li>
            )
          })}
        </ol>
      </SlideSheet>
    </div>
  )
}

const STATUS: Record<string, MessageKey> = {
  solved: 'blindcow.duel.status.solved',
  gave_up: 'blindcow.duel.status.gave_up',
  timeout: 'blindcow.duel.status.timeout',
  playing: 'blindcow.duel.status.playing',
}

function DuelVs({ duel, view, onRefresh }: { duel: DuelState; view: RunView; onRefresh: (() => void) | null }) {
  const r = view.result
  const other = duel.opponent?.result ?? null
  const verdict =
    duel.winner === 'me'
      ? t('blindcow.duel.win')
      : duel.winner === 'them'
        ? t('blindcow.duel.lose')
        : duel.winner === 'tie'
          ? t('blindcow.duel.tie')
          : duel.winner === 'none'
            ? t('blindcow.duel.none')
            : !duel.opponent
              ? t('blindcow.duel.waiting')
              : duel.opponent.finished
                ? t('blindcow.duel.opponentDone')
                : duel.opponent.started
                  ? t('blindcow.duel.opponentPlaying')
                  : t('blindcow.duel.opponentJoined')
  const row = (name: string, s: { status: string; hintsUsed: number; rawElapsedMs: number | null; weightedTimeMs: number | null } | null, win: boolean) => (
    <div className={`flex items-center justify-between gap-2 px-2 py-1 ${win ? 'bg-red text-paper' : 'text-ink'}`}>
      <span className="min-w-0 truncate font-sign text-[14px]">
        <bdi>{name}</bdi>
      </span>
      <span className="shrink-0 font-mono text-[12px] tabular-nums" dir="ltr">
        {s
          ? s.status === 'solved'
            ? `${s.hintsUsed} · ${secondsLabel(s.rawElapsedMs ?? 0)}″ → ${secondsLabel(s.weightedTimeMs ?? 0)}″`
            : t(STATUS[s.status] ?? 'blindcow.duel.status.playing')
          : '…'}
      </span>
    </div>
  )
  return (
    <div className="w-full shrink-0 border-rule border-ink bg-paper">
      <p className="border-b-hair border-ink/40 px-2 py-1 font-display text-[16px] leading-tight text-ink">{verdict}</p>
      {r && row(duel.myName ?? t('blindcow.duel.you'), { status: view.status, hintsUsed: r.hintsUsed, rawElapsedMs: r.rawElapsedMs, weightedTimeMs: r.weightedTimeMs }, duel.winner === 'me')}
      {row(duel.opponent?.name ?? t('blindcow.duel.them'), other, duel.winner === 'them')}
      {!duel.winner && onRefresh && (
        <button type="button" onClick={onRefresh} className="min-h-tap w-full border-t-hair border-ink/40 font-body text-[12px] font-extrabold text-sign">
          {t('blindcow.duel.refresh')}
        </button>
      )}
    </div>
  )
}

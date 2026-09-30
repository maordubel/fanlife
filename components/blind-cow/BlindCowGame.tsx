'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { firePickFx, firePickFxAt } from '@/components/stage/PickFx'
import { SlideSheet } from '@/components/stage/SlideSheet'
import { markStep, track } from '@/lib/analytics/meter'
import { t, type MessageKey } from '@/lib/i18n'
import { microFeedback } from '@/lib/voice'
import { emit } from '@/lib/profile/events'
import { readCompletedChapters } from '@/lib/life/memoryPassport'
import type { DuelError, DuelState } from '@/lib/game/blind-cow/duel'
import { scoringConfig, secondsLabel } from '@/lib/game/blind-cow/scoring'
import type { SearchEntry } from '@/lib/game/blind-cow/search'
import type { RunView } from '@/lib/game/blind-cow/types'
import {
  createDuelAction,
  duelStateAction,
  giveUpRun,
  joinDuelAction,
  livedFilterOpen,
  revealClue,
  startDaily,
  startDuelAction,
  startSolo,
  submitGuess,
  type ActionResult,
} from '@/app/blind-cow/actions'

import { ClueStack } from './ClueStack'
import { GateLogo } from '@/components/gates/GateLogo'
import { CowMark } from './CowMark'
import { GuessDrawer } from './GuessDrawer'
import { LiveRoom } from './LiveRoom'
import { ResultPanel } from './ResultPanel'
import { copyLink, gateUrl, shareOut, waHref } from './share'

/**
 * שער 10 — פרה עיוורת, the whole phone stage (delta 87 pattern): a one-line HUD, the
 * field (the clue chain), and a dock with one primary action. Everything else is a sheet.
 *
 * The screen owns NO game truth. It holds the clues the server has opened and asks the
 * server for the next move (`app/blind-cow/actions.ts`); every answer comes back as a
 * whole `RunView`, so a refresh or a retried tap simply re-draws the server's state.
 */

type Mode = 'solo' | 'daily' | 'duel'
type Screen = 'lobby' | 'run' | 'duel'

const FILTERS: { id: string; key: MessageKey }[] = [
  { id: 'all', key: 'blindcow.filter.all' },
  { id: 'israeli', key: 'blindcow.filter.israeli' },
  { id: 'foreign', key: 'blindcow.filter.foreign' },
  { id: 'familiar', key: 'blindcow.filter.familiar' as MessageKey },
  { id: 'deep', key: 'blindcow.filter.deep' as MessageKey },
  { id: 'legend', key: 'blindcow.filter.legend' },
  { id: 'hardcore', key: 'blindcow.filter.hardcore' },
  { id: '1950', key: 'blindcow.filter.1950' },
  { id: '1960', key: 'blindcow.filter.1960' },
  { id: '1970', key: 'blindcow.filter.1970' },
  { id: '1980', key: 'blindcow.filter.1980' },
  { id: '1990', key: 'blindcow.filter.1990' },
  { id: '2000', key: 'blindcow.filter.2000' },
  { id: '2010', key: 'blindcow.filter.2010' },
  { id: '2020', key: 'blindcow.filter.2020' },
]

/** §19 — shown only when this device finished a LIFE chapter and the server says the pool holds ten */
const LIVED_FILTER: { id: string; key: MessageKey } = { id: 'lived', key: 'redworld.blindcow.lived' as MessageKey }

const DUEL_ERRORS: Partial<Record<DuelError, MessageKey>> = {
  expired: 'blindcow.duel.error.expired',
  full: 'blindcow.duel.error.full',
  not_found: 'blindcow.duel.error.not_found',
  network: 'blindcow.duel.error.network',
  slow_down: 'blindcow.duel.error.slow_down',
  unavailable: 'blindcow.duel.unavailable',
}

const NAME_KEY = 'tw.blindcow.name'

function readName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}
function saveName(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name)
  } catch {
    /* private window — the name is a convenience */
  }
}

export function BlindCowGame({
  entries,
  bankSize,
  initialSolo,
  initialDaily,
  duelToken,
  duelAvailable,
  preferDaily,
}: {
  entries: SearchEntry[]
  bankSize: number
  initialSolo: RunView | null
  initialDaily: RunView | null
  duelToken: string | null
  duelAvailable: boolean
  preferDaily: boolean
}) {
  const resumable = initialSolo && initialSolo.status === 'playing' ? initialSolo : null
  const [screen, setScreen] = useState<Screen>(duelToken ? 'duel' : 'lobby')
  const [mode, setMode] = useState<Mode>(duelToken ? 'duel' : 'solo')
  const [view, setView] = useState<RunView | null>(null)
  const [daily, setDaily] = useState<RunView | null>(initialDaily)
  const [solo, setSolo] = useState<RunView | null>(resumable)
  const [skew, setSkew] = useState(0)
  const [filter, setFilter] = useState('all')
  /**
   * ONE RED WORLD §19 — "תן לי מישהו מהשנים שחיית עכשיו". The finished LIFE chapters are a
   * fact about this device's save; the server answers only whether the pool is deep enough
   * (ten or more men) and never who is in it. No chapter finished → no chip at all.
   */
  const [lived, setLived] = useState<string[]>([])
  const [livedOpen, setLivedOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fresh, setFresh] = useState<number | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [howto, setHowto] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [duelSheet, setDuelSheet] = useState(false)
  const [token, setToken] = useState<string | null>(duelToken)
  const [duel, setDuel] = useState<DuelState | null>(null)
  const [duelError, setDuelError] = useState<DuelError | null>(null)
  const [created, setCreated] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [sure, setSure] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const counted = useRef<string | null>(null)
  const completed = useRef<string | null>(null)
  const stack = useRef<HTMLDivElement>(null)

  useEffect(() => setName(readName()), [])
  useEffect(() => {
    let alive = true
    void readCompletedChapters().then(async (chapters) => {
      if (!alive || chapters.length === 0) return
      const open = await livedFilterOpen(chapters).catch(() => false)
      if (!alive || !open) return
      setLived(chapters)
      setLivedOpen(true)
    })
    return () => {
      alive = false
    }
  }, [])
  // the measurement's step is the clue on the table; the lobby is step 0 (lib/analytics)
  useEffect(() => markStep(0, undefined, true), [])

  const take = useCallback((next: RunView, m: Mode) => {
    setView(next)
    setSkew(next.serverNow - Date.now())
    if (m === 'daily') setDaily(next)
    if (m === 'solo') setSolo(next.status === 'playing' ? next : null)
  }, [])

  /* the progress ledger hears about a finished run exactly once */
  useEffect(() => {
    if (!view?.result || view.status === 'playing') return
    const key = `${view.mode}|${view.startedAt}`
    if (counted.current === key) return
    counted.current = key
    const solved = view.status === 'solved'
    emit({
      type: 'gate_completed',
      gate: '/blind-cow',
      variant: view.mode === 'solo' ? null : view.mode,
      score: solved ? Math.max(1, 11 - view.result.hintsUsed) : 0,
      correct: solved ? 1 : 0,
      asked: 1,
    })
    // spec §11 — the measurement (lib/analytics): how many clues, how long, and how it ended
    if (solved) track('blind_cow_solved', { step: view.result.hintsUsed, value: view.result.rawElapsedMs, detail: view.mode })
    else track('blind_cow_gave_up', { step: view.result.hintsUsed, detail: view.status === 'timeout' ? 'timeout' : view.mode })
  }, [view])

  /* a duel is complete once both sides are in: counted once per duel */
  useEffect(() => {
    if (!duel?.winner || !token || completed.current === token) return
    completed.current = token
    track('blind_cow_duel_completed', { detail: duel.winner })
  }, [duel, token])

  /* ---------------------------------------------------------------- duel state */

  const loadDuel = useCallback(async (tk: string) => {
    const out = await duelStateAction(tk)
    if ('error' in out) {
      setDuelError(out.error)
      return null
    }
    setDuelError(null)
    setDuel(out)
    if (out.me) {
      // a started run resumes on its own clock; a finished one opens on its result
      take(out.me, 'duel')
      setMode('duel')
      setScreen('run')
    }
    return out
  }, [take])

  useEffect(() => {
    if (!token || !duelAvailable) return
    void loadDuel(token)
  }, [token, duelAvailable, loadDuel])

  // while the other side is still out there, look again every few seconds
  useEffect(() => {
    if (!token || !duel || duel.winner || view?.status === 'playing') return
    if (!view?.result) return
    const id = window.setInterval(() => void loadDuel(token), 6000)
    return () => window.clearInterval(id)
  }, [token, duel, view, loadDuel])

  /* ---------------------------------------------------------------- moves */

  async function begin(m: 'solo' | 'daily') {
    if (busy) return
    setBusy(true)
    setError(null)
    const out = m === 'daily' ? await startDaily() : await startSolo(filter, filter === 'lived' ? lived : [])
    setBusy(false)
    if (!out.view) {
      setError(t('blindcow.filter.empty'))
      return
    }
    setMode(m)
    setFresh(1)
    take(out.view, m)
    setScreen('run')
    track('blind_cow_started', { detail: m })
    markStep(1)
    firePickFx(window.innerWidth / 2, window.innerHeight * 0.4, { label: t('blindcow.hud.clue', { n: '1', total: String(out.view.total) }), tone: 'red' })
  }

  function resume(v: RunView, m: Mode) {
    setMode(m)
    setFresh(null)
    take(v, m)
    setScreen('run')
  }

  async function more() {
    if (!view || busy || view.status !== 'playing' || view.clues.length >= view.total) return
    setBusy(true)
    const out: ActionResult = await revealClue(mode, view.clues.length, token ?? undefined)
    setBusy(false)
    if (out.view) {
      if (out.view.clues.length > view.clues.length) {
        setFresh(out.view.clues.length)
        track('blind_cow_hint_revealed', { step: out.view.clues.length, detail: mode })
        markStep(out.view.clues.length)
      }
      take(out.view, mode)
    } else if (out.error) setError(t(DUEL_ERRORS[out.error as DuelError] ?? 'blindcow.duel.error.generic'))
  }

  async function guess(entry: SearchEntry): Promise<'right' | 'wrong' | 'none'> {
    if (!view || view.status !== 'playing') return 'none'
    const clientMs = Date.now() + skew - view.startedAt
    const out = await submitGuess(mode, entry.id, token ?? undefined, clientMs)
    if (!out.view) return 'none'
    if (out.verdict === 'right') {
      setDrawer(false)
      firePickFx(window.innerWidth / 2, window.innerHeight * 0.42, { label: microFeedback(10, 'correct', `${mode}:${entry.id}`, 0)?.line ?? t('blindcow.result.solved'), tone: 'red', big: true, haptic: 'lock' })
      take(out.view, mode)
      if (mode === 'duel' && token) void loadDuel(token)
      return 'right'
    }
    take(out.view, mode)
    if (out.verdict === 'wrong') track('blind_cow_guess_wrong', { step: out.view.clues.length, detail: mode })
    if (out.view.status !== 'playing') setDrawer(false)
    return out.verdict
  }

  async function quit() {
    if (!view || busy) return
    if (!sure) {
      setSure(true)
      window.setTimeout(() => setSure(false), 2600)
      return
    }
    setSure(false)
    setBusy(true)
    const out = await giveUpRun(mode, token ?? undefined)
    setBusy(false)
    if (out.view) {
      firePickFxAt(stack.current, { tone: 'sign', haptic: 'miss' })
      take(out.view, mode)
      if (mode === 'duel' && token) void loadDuel(token)
    }
  }

  function toLobby() {
    setScreen('lobby')
    setView(null)
    setMode('solo')
    setToken(null)
    setDuel(null)
    if (duelToken || token) window.history.replaceState(null, '', '/blind-cow')
  }

  /* ---------------------------------------------------------------- duel moves */

  async function createDuel() {
    if (busy) return
    setBusy(true)
    saveName(name)
    const out = await createDuelAction(name)
    setBusy(false)
    if ('error' in out) {
      setDuelError(out.error)
      return
    }
    setDuelError(null)
    setCreated(out.token)
    track('blind_cow_duel_created')
  }

  function playCreated() {
    if (!created) return
    setDuelSheet(false)
    window.history.replaceState(null, '', `/blind-cow?duel=${created}`)
    setToken(created)
    setMode('duel')
    setScreen('duel')
    setCreated(null)
  }

  async function acceptDuel() {
    if (!token || busy) return
    setBusy(true)
    saveName(name)
    const joined = await joinDuelAction(token, name)
    if ('error' in joined) {
      setBusy(false)
      setDuelError(joined.error)
      return
    }
    track('blind_cow_duel_joined')
    await loadDuel(token)
    setBusy(false)
  }

  async function startDuel() {
    if (!token || busy) return
    setBusy(true)
    const out = await startDuelAction(token)
    setBusy(false)
    if (!out.view) {
      setDuelError((out.error as DuelError) ?? 'network')
      return
    }
    setMode('duel')
    setFresh(1)
    take(out.view, 'duel')
    setScreen('run')
    track('blind_cow_started', { detail: 'duel' })
    markStep(1)
    firePickFx(window.innerWidth / 2, window.innerHeight * 0.4, { label: t('blindcow.hud.clue', { n: '1', total: String(out.view.total) }), tone: 'red' })
    void loadDuel(token)
  }

  /** the live room's go: the run is open, on the shared clock (spec §2.4) */
  const liveGo = useCallback(
    (next: RunView) => {
      setLive(false)
      setMode('duel')
      setFresh(1)
      take(next, 'duel')
      setScreen('run')
      markStep(1)
      firePickFx(window.innerWidth / 2, window.innerHeight * 0.4, { label: t('blindcow.hud.clue', { n: '1', total: String(next.total) }), tone: 'red', big: true, haptic: 'lock' })
      if (token) void loadDuel(token)
    },
    [take, token, loadDuel],
  )

  const inviteText = t('blindcow.share.invite')

  /* ---------------------------------------------------------------- screens */

  if (screen === 'run' && view) {
    if (view.status !== 'playing' && view.result) {
      return (
        <div className="flex min-h-0 flex-1 flex-col md:block md:flex-none">
          <ResultPanel
            view={view}
            duel={mode === 'duel' ? duel : null}
            onNext={mode === 'solo' ? () => void begin('solo') : null}
            onLobby={toLobby}
            onRefreshDuel={mode === 'duel' && token ? () => void loadDuel(token) : null}
          />
        </div>
      )
    }
    const last = view.clues.length >= view.total
    return (
      <div className="flex min-h-0 flex-1 flex-col md:mx-auto md:block md:w-full md:max-w-[560px] md:flex-none">
        <Hud view={view} mode={mode} skew={skew} onQuit={quit} sure={sure} />
        <div ref={stack} className="flex min-h-0 flex-1 flex-col md:min-h-[440px]">
          <ClueStack clues={view.clues} total={view.total} fresh={fresh} />
        </div>
        {error && (
          <p className="shrink-0 pb-1 text-center font-body text-[11px] font-extrabold text-sign" role="status">
            {error}
          </p>
        )}
        <div className="mt-1.5 grid shrink-0 grid-cols-[1fr_1.35fr] gap-1.5">
          <button
            type="button"
            onClick={more}
            disabled={busy || last}
            className="flex min-h-tap flex-col items-center justify-center border-rule border-ink bg-paper px-2 py-1 text-ink transition-transform duration-press active:scale-[.97] disabled:opacity-40 motion-reduce:transition-none"
          >
            <span className="font-body text-[14px] font-extrabold leading-tight">{last ? t('blindcow.more.none') : t('blindcow.more')}</span>
            {!last && (
              <span className="font-mono text-[10px] tabular-nums text-sign">
                {t('blindcow.more.cost')} · {t('blindcow.more.left', { n: String(view.total - view.clues.length) })}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setDrawer(true)}
            disabled={busy}
            className="flex min-h-tap items-center justify-center border-rule border-ink bg-red px-3 font-body text-step-0 font-extrabold text-paper transition-transform duration-press active:scale-[.97] disabled:opacity-60 motion-reduce:transition-none"
          >
            {t('blindcow.guess')}
          </button>
        </div>
        <GuessDrawer open={drawer} onClose={() => setDrawer(false)} entries={entries} tried={view.tried} onPick={(entry) => guess(entry)} />
      </div>
    )
  }

  if (screen === 'duel' && live && token && duelAvailable) {
    return <LiveRoom token={token} myName={duel?.myName ?? name} onGo={liveGo} onLeave={() => setLive(false)} />
  }

  if (screen === 'duel') {
    return (
      <div className="flex min-h-0 flex-1 flex-col md:mx-auto md:block md:w-full md:max-w-[560px] md:flex-none">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center md:min-h-[420px]">
          <p className="font-latin text-[10px] font-bold tracking-[0.22em] text-red" dir="ltr">
            {t('blindcow.latin.duel')}
          </p>
          <div className="bc-stage flex w-full max-w-[420px] justify-center border-rule border-ink px-3 py-2">
            <GateLogo logo="blind-cow" className="w-[min(100%,300px)]" />
          </div>
          <p className="font-display text-[28px] leading-none text-ink">
            {duel?.joined ? t('blindcow.duel.title') : t('blindcow.duel.invited')}
          </p>
          <p className="max-w-[34ch] font-body text-[13px] leading-snug text-ink">{t('blindcow.duel.lede')}</p>
          {!duelAvailable ? (
            <p className="max-w-[34ch] border-rule border-sign bg-paper px-3 py-2 font-body text-[12.5px] font-bold text-sign">{t('blindcow.duel.unavailable')}</p>
          ) : duelError ? (
            <p className="max-w-[34ch] border-rule border-sign bg-paper px-3 py-2 font-body text-[12.5px] font-bold text-sign" role="status">
              {t(DUEL_ERRORS[duelError] ?? 'blindcow.duel.error.generic')}
            </p>
          ) : duel && duel.joined ? (
            <p className="font-body text-[12px] text-sign">
              {!duel.opponent
                ? t('blindcow.duel.waiting')
                : duel.opponent.finished
                  ? t('blindcow.duel.opponentDone')
                  : duel.opponent.started
                    ? t('blindcow.duel.opponentPlaying')
                    : t('blindcow.duel.opponentJoined')}
            </p>
          ) : duel ? (
            <label className="block w-full max-w-[320px]">
              <span className="block text-start font-body text-[11px] font-extrabold tracking-widest text-sign">{t('blindcow.duel.name')}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 24))}
                maxLength={24}
                className="mt-1 min-h-tap w-full border-rule border-ink bg-paper px-3 font-body text-[16px] text-ink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-sign"
              />
            </label>
          ) : null}
        </div>
        <div className="mt-1.5 shrink-0 md:mx-auto md:max-w-[520px]">
          {duel?.joined && duel.mySlot === 1 && token && !duel.opponent && (
            <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1.5">
              <li className="shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    const out = await shareOut(inviteText, gateUrl(`?duel=${token}`))
                    if (out === 'copied') setNote(t('blindcow.share.copied'))
                    if (out !== 'failed') track('blind_cow_duel_shared', { detail: 'share' })
                  }}
                  className="flex min-h-tap items-center border-rule border-ink bg-paper px-3 font-body text-[12.5px] font-extrabold text-ink"
                >
                  {t('blindcow.duel.send')}
                </button>
              </li>
              <li className="shrink-0">
                <a href={waHref(inviteText, gateUrl(`?duel=${token}`))} onClick={() => track('blind_cow_duel_shared', { detail: 'whatsapp' })} target="_blank" rel="noopener noreferrer" className="flex min-h-tap items-center border-rule border-ink bg-paper px-3 font-body text-[12.5px] font-extrabold text-ink">
                  {t('blindcow.share.whatsapp')}
                </a>
              </li>
              <li className="shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    if (await copyLink(gateUrl(`?duel=${token}`))) {
                      setNote(t('blindcow.share.copied'))
                      track('blind_cow_duel_shared', { detail: 'copy' })
                    }
                  }}
                  className="flex min-h-tap items-center border-rule border-ink bg-paper px-3 font-body text-[12.5px] font-extrabold text-ink"
                >
                  {t('blindcow.duel.copy')}
                </button>
              </li>
            </ul>
          )}
          {note && (
            <p className="pb-1 text-center font-body text-[11px] font-extrabold text-sign" role="status">
              {note}
            </p>
          )}
          {duelAvailable && duel && !duelError ? (
            duel.joined ? (
              !duel.me ? (
                // spec §2.4: play it now, together — or on your own time, as before
                <div className="grid grid-cols-[1fr_1.35fr] gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLive(true)}
                    data-live="open"
                    className="flex min-h-tap flex-col items-center justify-center border-rule border-ink bg-ink px-2 text-paper transition-transform duration-press active:scale-[.97] motion-reduce:transition-none"
                  >
                    <span className="font-body text-[13.5px] font-extrabold leading-tight">{t('connect.live.open')}</span>
                    <span className="font-latin text-[9px] font-bold tracking-[0.2em] text-concrete" dir="ltr">
                      LIVE
                    </span>
                  </button>
                  <PrimaryButton onClick={startDuel} disabled={busy}>
                    {t('blindcow.duel.start')}
                  </PrimaryButton>
                </div>
              ) : (
                <PrimaryButton onClick={startDuel} disabled={busy}>
                  {t('blindcow.duel.start')}
                </PrimaryButton>
              )
            ) : (
              <PrimaryButton onClick={acceptDuel} disabled={busy}>
                {t('blindcow.duel.accept')}
              </PrimaryButton>
            )
          ) : (
            <PrimaryButton onClick={toLobby}>{t('blindcow.result.lobby')}</PrimaryButton>
          )}
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------- lobby */

  const dailyLabel = daily ? (daily.status === 'solved' ? t('blindcow.daily.done') : daily.status === 'playing' ? t('blindcow.daily') : t('blindcow.daily.played')) : t('blindcow.daily')
  const openDaily = () => (daily ? resume(daily, 'daily') : void begin('daily'))

  return (
    <div className="flex min-h-0 flex-1 flex-col md:mx-auto md:block md:w-full md:max-w-[620px] md:flex-none">
      <div
        data-blindcow="portrait"
        className="bc-stage relative mb-2 flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-hidden border-rule border-ink px-4 text-center text-paper md:min-h-[420px]"
      >
        <span aria-hidden="true" className="absolute start-2 top-1 font-poster text-[64px] leading-none text-paper/15" dir="ltr">
          10
        </span>
        <p className="relative font-latin text-[10px] font-bold tracking-[0.22em] text-paper/70" dir="ltr">
          {t('blindcow.latin.gate')}
        </p>
        <GateLogo logo="blind-cow" className="relative w-[min(92%,440px)] [@media(max-height:680px)]:w-[min(78%,300px)]" />
        <h2 className="relative font-display text-[36px] leading-none text-paper [@media(max-height:680px)]:text-[28px]">{t('blindcow.lobby.title')}</h2>
        <p className="relative max-w-[30ch] font-body text-[13.5px] leading-snug text-paper/85">{t('blindcow.lobby.lede')}</p>
        <p className="relative border-t-hair border-paper/30 pt-1 font-mono text-[11px] tabular-nums text-concrete">{t('blindcow.lobby.count', { n: String(bankSize) })}</p>
      </div>

      <div className="shrink-0 md:mx-auto md:max-w-[560px]">
        {solo ? (
          <div className="grid grid-cols-[1.35fr_1fr] gap-1.5">
            <PrimaryButton onClick={() => resume(solo, 'solo')}>{t('blindcow.resume')}</PrimaryButton>
            <button type="button" onClick={() => void begin('solo')} disabled={busy} className="flex min-h-tap items-center justify-center border-rule border-ink bg-paper px-2 font-body text-[14px] font-extrabold text-ink">
              {t('blindcow.play')}
            </button>
          </div>
        ) : preferDaily && !daily ? (
          <PrimaryButton onClick={openDaily} disabled={busy}>
            {t('blindcow.daily')}
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={() => void begin('solo')} disabled={busy}>
            {t('blindcow.play')}
          </PrimaryButton>
        )}
        {error && (
          <p className="pb-1 text-center font-body text-[11px] font-extrabold text-sign" role="status">
            {error}
          </p>
        )}
        <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1.5">
          <li className="shrink-0">
            <button type="button" onClick={openDaily} disabled={busy} className={`flex min-h-tap items-center border-rule border-ink px-3 font-body text-[12.5px] font-extrabold ${preferDaily ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}>
              {dailyLabel}
            </button>
          </li>
          <li className="shrink-0">
            <button type="button" onClick={() => setDuelSheet(true)} className="flex min-h-tap items-center border-rule border-ink bg-paper px-3 font-body text-[12.5px] font-extrabold text-ink">
              {t('blindcow.duel')}
            </button>
          </li>
          <li className="shrink-0">
            <button type="button" onClick={() => setHowto(true)} className="flex min-h-tap items-center border-rule border-ink bg-paper px-3 font-body text-[12.5px] font-extrabold text-ink">
              {t('blindcow.howto')}
            </button>
          </li>
        </ul>
        <div className="mb-1.5">
          <button
            type="button"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
            data-blindcow="filter-toggle"
            className="flex min-h-tap w-full items-center justify-between border-hair border-ink/40 bg-sheet px-2.5 font-body text-[12px] font-extrabold text-ink"
          >
            <span>{filter === 'all' ? t('blindcow.filter.optional') : `${t('blindcow.filter.label')}: ${t((FILTERS.find((f) => f.id === filter) ?? LIVED_FILTER).key)}`}</span>
            <span aria-hidden="true">{filtersOpen ? '▴' : '▾'}</span>
          </button>
          {filtersOpen && (
            <>
            <p className="sr-only">{t('blindcow.filter.label')}</p>
            <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" aria-label={t('blindcow.filter.label')}>
              {(livedOpen ? [FILTERS[0]!, LIVED_FILTER, ...FILTERS.slice(1)] : FILTERS).map((f) => (
                <li key={f.id} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={filter === f.id}
                    onClick={(e) => {
                      setFilter(f.id)
                      setError(null)
                      firePickFxAt(e.currentTarget, { tone: 'ink', haptic: 'tap' })
                    }}
                    className={`flex min-h-tap items-center whitespace-nowrap border-hair px-2.5 font-body text-[12px] font-extrabold transition-colors duration-press motion-reduce:transition-none ${
                      filter === f.id ? 'border-red bg-red text-paper' : 'border-ink/50 bg-sheet text-ink'
                    }`}
                  >
                    {t(f.key)}
                  </button>
                </li>
              ))}
            </ul>
            </>
          )}
        </div>
      </div>

      <SlideSheet open={howto} onClose={() => setHowto(false)} title={t('blindcow.howto')} latin={t('blindcow.latin.howto')} size="auto">
        <ol className="flex flex-col gap-2 pb-2">
          {(['blindcow.howto.1', 'blindcow.howto.2', 'blindcow.howto.3', 'blindcow.howto.4'] as const).map((key, i) => (
            <li key={key} className="flex gap-2.5">
              <span className="w-6 shrink-0 text-center font-poster text-[24px] leading-none text-red">{i + 1}</span>
              <span className="font-body text-[14px] leading-snug text-ink">{t(key)}</span>
            </li>
          ))}
        </ol>
        <p className="border-t-hair border-ink/30 pt-2 font-mono text-[11px] tabular-nums text-muted" dir="ltr">
          {`+${secondsLabel(scoringConfig().extraHintPenaltyMs)}″ · +${secondsLabel(scoringConfig().wrongGuessPenaltyMs)}″ · v${scoringConfig().version}`}
        </p>
      </SlideSheet>

      <SlideSheet
        open={duelSheet}
        onClose={() => {
          setDuelSheet(false)
          setCreated(null)
        }}
        title={t('blindcow.duel.title')}
        latin={t('blindcow.latin.duel')}
        size="auto"
        footer={
          !duelAvailable ? null : created ? (
            <PrimaryButton onClick={playCreated}>{t('blindcow.duel.playMine')}</PrimaryButton>
          ) : (
            <PrimaryButton onClick={createDuel} disabled={busy}>
              {t('blindcow.duel.create')}
            </PrimaryButton>
          )
        }
      >
        <p className="font-body text-[13.5px] leading-snug text-ink">{t('blindcow.duel.lede')}</p>
        {!duelAvailable ? (
          <p className="mt-3 border-rule border-sign bg-paper px-3 py-2 font-body text-[13px] font-bold text-sign">{t('blindcow.duel.unavailable')}</p>
        ) : created ? (
          <div className="mt-3">
            <p className="font-display text-[20px] leading-tight text-ink">{t('blindcow.duel.created')}</p>
            <p className="mt-1 truncate border-hair border-ink/40 bg-paper px-2 py-1.5 font-mono text-[11px] text-ink" dir="ltr">
              {gateUrl(`?duel=${created}`)}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={async () => {
                  const out = await shareOut(inviteText, gateUrl(`?duel=${created}`))
                  if (out === 'copied') setNote(t('blindcow.share.copied'))
                  if (out !== 'failed') track('blind_cow_duel_shared', { detail: 'share' })
                }}
                className="flex min-h-tap items-center border-rule border-ink bg-ink px-3 font-body text-[12.5px] font-extrabold text-paper"
              >
                {t('blindcow.duel.send')}
              </button>
              <a href={waHref(inviteText, gateUrl(`?duel=${created}`))} onClick={() => track('blind_cow_duel_shared', { detail: 'whatsapp' })} target="_blank" rel="noopener noreferrer" className="flex min-h-tap items-center border-rule border-ink bg-paper px-3 font-body text-[12.5px] font-extrabold text-ink">
                {t('blindcow.share.whatsapp')}
              </a>
              <button
                type="button"
                onClick={async () => {
                  if (await copyLink(gateUrl(`?duel=${created}`))) {
                    setNote(t('blindcow.share.copied'))
                    track('blind_cow_duel_shared', { detail: 'copy' })
                  }
                }}
                className="flex min-h-tap items-center border-rule border-ink bg-paper px-3 font-body text-[12.5px] font-extrabold text-ink"
              >
                {t('blindcow.duel.copy')}
              </button>
            </div>
            {note && <p className="mt-1.5 font-body text-[11px] font-extrabold text-sign">{note}</p>}
          </div>
        ) : (
          <label className="mt-3 block">
            <span className="block font-body text-[11px] font-extrabold tracking-widest text-sign">{t('blindcow.duel.name')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              maxLength={24}
              className="mt-1 min-h-tap w-full border-rule border-ink bg-paper px-3 font-body text-[16px] text-ink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-sign"
            />
          </label>
        )}
        {duelError && duelAvailable && (
          <p className="mt-2 font-body text-[12px] font-bold text-sign" role="status">
            {t(DUEL_ERRORS[duelError] ?? 'blindcow.duel.error.generic')}
          </p>
        )}
      </SlideSheet>
    </div>
  )
}

function PrimaryButton({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-tap w-full items-center justify-center border-rule border-ink bg-red px-4 font-body text-step-0 font-extrabold text-paper transition-transform duration-press active:scale-[.98] disabled:opacity-60 motion-reduce:transition-none"
    >
      {children}
    </button>
  )
}

/** One line: the mode, clue n/10, the running clock (server time), mistakes, and "ויתרתי". */
function Hud({ view, mode, skew, onQuit, sure }: { view: RunView; mode: Mode; skew: number; onQuit: () => void; sure: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [])
  const elapsed = Math.max(0, now + skew - view.startedAt)
  const max = scoringConfig().duelMaxMs
  const label: Record<Mode, MessageKey> = { solo: 'blindcow.hud.solo', daily: 'blindcow.hud.daily', duel: 'blindcow.hud.duel' }
  return (
    <div data-blindcow="hud" className="shrink-0 border-rule border-ink bg-red text-paper">
      <div className="flex h-11 items-center gap-2 px-2">
        <span className="shrink-0 bg-ink px-1.5 py-0.5 font-body text-[10px] font-extrabold tracking-widest text-paper">{t(label[mode])}</span>
        <span className="min-w-0 flex-1 truncate font-display text-[19px] leading-none">
          {t('blindcow.hud.clue', { n: String(view.clues.length), total: String(view.total) })}
        </span>
        {view.wrong > 0 && (
          <span className="shrink-0 border-hair border-paper px-1 font-mono text-[11px] font-bold tabular-nums">{t('blindcow.hud.wrong', { n: String(view.wrong) })}</span>
        )}
        <span className="shrink-0 bg-paper px-2 py-0.5 font-poster text-[22px] leading-none tabular-nums text-ink" dir="ltr" aria-live="off">
          {mode === 'duel' ? t('blindcow.hud.left', { s: String(Math.max(0, Math.ceil((max - elapsed) / 1000))) }) : `${secondsLabel(elapsed)}″`}
        </span>
        <button
          type="button"
          onClick={onQuit}
          className={`min-h-tap shrink-0 px-1 font-body text-[11px] font-extrabold ${sure ? 'bg-ink text-paper' : 'text-paper/85'}`}
        >
          {sure ? t('blindcow.giveup.sure') : t('blindcow.giveup')}
        </button>
      </div>
      <ol className="flex items-center gap-[3px] bg-ink px-2 py-1.5" aria-hidden="true">
        {Array.from({ length: view.total }, (_, i) => (
          <li key={i} className={`h-2 min-w-0 flex-1 ${i < view.clues.length ? 'bg-red' : 'bg-paper/25'}`} />
        ))}
      </ol>
    </div>
  )
}

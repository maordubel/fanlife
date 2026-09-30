'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { RecordRun } from '@/components/play/RecordRun'
import { FitBox } from '@/components/stage/FitBox'
import { firePickFx, firePickFxAt } from '@/components/stage/PickFx'
import { SlideSheet } from '@/components/stage/SlideSheet'
import { t as tt } from '@/lib/i18n'
import type { RoyalRumbleDraft, RoyalRumbleOffer, RoyalRumblePublicPlayer, RoyalRumbleResult } from '@/lib/game/royal-rumble'
import {
  canPickRoyalRumbleOffer,
  countPicked,
  lineupCost,
  resolvePublicFormation,
  toSelection,
  type Position,
  type RoyalRumblePick,
} from '@/lib/game/royal-rumble-public'
import type { KitSpec } from '@/lib/kit/spec'
import { currentAccount, signInWithGoogle, type Account } from '@/lib/portal/sync'
import { t } from '@/lib/royal-rumble/i18n'
import {
  createRoyalRumbleRoom,
  getRoyalRumbleLiveState,
  joinRoyalRumbleRoom,
  lockRoyalRumbleLive,
  resolveRoyalRumbleLive,
  type RoyalRumbleLiveRoom,
  type RoyalRumbleLiveState,
} from './live-actions'
import { FormationMini, slotShort } from './RoyalRumbleRun'
import { RoyalRumbleSlotReveal } from './RoyalRumbleSlotReveal'
import { RumbleShirt } from './RumbleShirt'

type EraKit = { seasonLabel: string; spec: KitSpec }
type Phase = 'lobby' | 'draft' | 'waiting' | 'countdown' | 'result'

const POSITION_SHORT: Record<Position, string> = { GK: 'GK', DF: 'DEF', MF: 'MID', FW: 'ATT' }

function money(value: number) { return `€${value}M` }
/** the man's real shirt, never an empty box (delta 88 — `RumbleShirt.tsx`) */
function Shirt({ player, kits, className = 'h-[116px] w-[102px]' }: { player: RoyalRumblePublicPlayer; kits: EraKit[]; className?: string }) {
  return <RumbleShirt player={player} kits={kits} className={className} />
}
function Lamp({ on }: { on: boolean }) { return <span className={`inline-block h-2.5 w-2.5 ${on ? 'bg-red' : 'border border-paper/40'}`} /> }

export function RoyalRumbleLiveRun({ draft, shuffleDraft, matchSeed, roundSeed, cursor = 0, kits, initialRoomCode }: {
  draft: RoyalRumbleDraft
  shuffleDraft: RoyalRumbleDraft
  matchSeed: number
  /** the round the route read (§18): the room link hands over `seed` + `r`, so the guest deals the same board */
  roundSeed?: number
  cursor?: number
  kits: EraKit[]
  initialRoomCode?: string
}) {
  const [account, setAccount] = useState<Account | null | undefined>(undefined)
  const [room, setRoom] = useState<RoyalRumbleLiveRoom | null>(null)
  const [state, setState] = useState<RoyalRumbleLiveState | null>(null)
  const [code, setCode] = useState(initialRoomCode?.toUpperCase() ?? '')
  const [phase, setPhase] = useState<Phase>('lobby')
  const [activeDraft, setActiveDraft] = useState(draft)
  const [shuffleUsed, setShuffleUsed] = useState(false)
  const [picks, setPicks] = useState<RoyalRumblePick[]>(() => Array.from({ length: 5 }, () => null))
  const [slot, setSlot] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [countdown, setCountdown] = useState(4)
  const [result, setResult] = useState<RoyalRumbleResult | null>(null)
  const [roomOpen, setRoomOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const autoJoin = useRef(false)
  const resolved = useRef(false)

  const spent = lineupCost(picks)
  const remaining = activeDraft.budget - spent
  const pickedCount = countPicked(picks)
  const complete = pickedCount === 5
  const currentSlot = activeDraft.slots[slot] ?? activeDraft.slots[0]
  const formation = resolvePublicFormation(picks)
  // the same rule as solo (§27, §56): one shuffle, only before the first pick
  const shuffleOpen = !shuffleUsed && pickedCount === 0 && !busy

  const refresh = useCallback(async (target: RoyalRumbleLiveRoom | null) => {
    if (!target) return
    const next = await getRoyalRumbleLiveState(target.id)
    if (!next) return
    setState(next)
    if (next.status === 'countdown') setPhase('countdown')
    else if (next.youReady) setPhase('waiting')
    else if (next.opponentJoined) setPhase('draft')
  }, [])

  const updateUrl = useCallback((roomCode: string) => {
    const url = new URL(window.location.href)
    // the round, not the offer seed: the route folds `r` in again on arrival
    url.searchParams.set('seed', String((roundSeed ?? draft.seed) >>> 0))
    if (roundSeed !== undefined && cursor > 0) url.searchParams.set('r', String(cursor))
    else url.searchParams.delete('r')
    url.searchParams.set('room', roomCode)
    window.history.replaceState({}, '', url.toString())
  }, [cursor, draft.seed, roundSeed])

  const join = useCallback(async (roomCode: string) => {
    if (!account || !roomCode.trim()) return
    setBusy(true); setError(false)
    const next = await joinRoyalRumbleRoom(roomCode, matchSeed, draft.seed)
    setBusy(false)
    if (!next) { setError(true); return }
    setRoom(next); setCode(next.code); updateUrl(next.code)
    await refresh(next)
    setPhase('draft')
  }, [account, draft.seed, matchSeed, refresh, updateUrl])

  useEffect(() => { void currentAccount().then(setAccount) }, [])
  useEffect(() => {
    if (!account || !initialRoomCode || autoJoin.current) return
    autoJoin.current = true
    void join(initialRoomCode)
  }, [account, initialRoomCode, join])
  useEffect(() => {
    if (!room) return
    void refresh(room)
    const timer = window.setInterval(() => void refresh(room), 1200)
    return () => window.clearInterval(timer)
  }, [room, refresh])

  useEffect(() => {
    if (phase !== 'countdown' || !state?.startsAt || !room || resolved.current) return
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((new Date(state.startsAt!).getTime() - Date.now()) / 1000))
      setCountdown(left)
      if (left === 0 && !resolved.current) {
        resolved.current = true
        setBusy(true)
        void resolveRoyalRumbleLive(room.id).then((next) => {
          setBusy(false)
          if (!next) { resolved.current = false; setError(true); return }
          setResult(next); setPhase('result')
        })
      }
    }, 120)
    return () => window.clearInterval(timer)
  }, [phase, room, state?.startsAt])

  // viability is the shared helper's (`lib/game/royal-rumble-public.ts`), not a second copy
  function canPick(index: number, offer: RoyalRumbleOffer) {
    return canPickRoyalRumbleOffer(activeDraft, picks, index, offer)
  }
  function pick(offer: RoyalRumbleOffer) {
    if (!canPick(slot, offer)) return
    setPicks((current) => current.map((item, index) => index === slot ? offer : item))
    setSlot((value) => Math.min(4, value + 1))
  }
  function shuffle() {
    if (!shuffleOpen) return
    setActiveDraft(shuffleDraft); setShuffleUsed(true); setPicks(Array.from({ length: 5 }, () => null)); setSlot(0)
  }
  async function create() {
    setBusy(true); setError(false)
    const next = await createRoyalRumbleRoom(matchSeed, draft.seed)
    setBusy(false)
    if (!next) { setError(true); return }
    setRoom(next); setCode(next.code); updateUrl(next.code); setPhase('draft'); await refresh(next)
  }
  async function lock() {
    const selection = toSelection(picks)
    if (!room || !selection || remaining < 0) return
    setBusy(true); setError(false)
    const next = await lockRoyalRumbleLive(room.id, activeDraft.seed, selection)
    setBusy(false)
    if (!next) { setError(true); return }
    setState(next); setPhase(next.status === 'countdown' ? 'countdown' : 'waiting')
  }
  async function copyRoom() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true); window.setTimeout(() => setCopied(false), 1400)
  }

  /*
   * THE PHONE STAGE (delta 88) — live is laid out like solo: one screen, no page scroll.
   * Every phase fills the stage (`flex-1`) instead of floating at the top of it; the draft is
   * [HUD: room · lamps · money] → [the five] → [chips: shuffle · room · rules] → [THE
   * FIELD: three offers in a FitBox] → [lock]. The room's code/link and the rules slide up in
   * sheets. From md up the same blocks stack as the page they always were.
   */
  const fill = 'flex h-full min-h-0 flex-col md:block md:h-auto'

  if (account === undefined) return <div className={`${fill} justify-center border-rule border-ink bg-ink p-6 font-display text-[28px] text-paper`}>LIVE…</div>
  if (!account) return (
    <section className={`${fill} justify-center border-rule border-ink bg-ink p-5 text-paper`}>
      <p className="font-mono tabular-nums text-[9px] font-black tracking-[.22em] text-red" dir="ltr">ROYAL RUMBLE · LIVE</p>
      <h2 className="mt-2 font-display text-[32px] leading-none md:text-[36px]">{t('liveTitle')}</h2>
      <p className="mt-3 max-w-xl font-body text-[12px] leading-relaxed text-paper/60">{t('liveSignInBody')}</p>
      <button type="button" onClick={() => void signInWithGoogle(`${window.location.pathname}${window.location.search}`)} className="mt-5 min-h-tap w-full border-rule border-red bg-red px-5 font-display text-[24px] text-paper md:w-auto">{t('liveSignIn')}</button>
    </section>
  )

  if (!room) return (
    <section className="flex h-full min-h-0 flex-col gap-1.5 border-rule border-ink bg-paper p-1.5 md:grid md:h-auto md:grid-cols-2 md:gap-3 md:p-4">
      <div className="flex min-h-0 flex-1 flex-col justify-between border-rule border-ink bg-ink p-3 text-paper md:p-4">
        <div>
          <p className="font-mono tabular-nums text-[8px] font-black tracking-[.2em] text-red" dir="ltr">HOST</p>
          <h2 className="mt-1 font-display text-[26px] leading-none md:text-[30px]">{t('liveCreateTitle')}</h2>
          <p className="mt-2 font-body text-[11px] leading-snug text-paper/55 md:text-[10px]">{t('liveCreateBody')}</p>
        </div>
        <button type="button" disabled={busy} onClick={(event) => { firePickFxAt(event.currentTarget, { tone: 'red', haptic: 'tap' }); void create() }} className="mt-3 min-h-tap w-full border-rule border-red bg-red px-4 font-display text-[22px] text-paper disabled:opacity-40 md:mt-4 md:text-[24px]">{t('liveCreate')}</button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-between border-rule border-ink bg-paper p-3 text-ink md:p-4">
        <div>
          <p className="font-mono tabular-nums text-[8px] font-black tracking-[.2em] text-red" dir="ltr">JOIN</p>
          <h2 className="mt-1 font-display text-[26px] leading-none md:text-[30px]">{t('liveJoinTitle')}</h2>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('liveCodePlaceholder')} className="mt-3 min-h-tap w-full border-rule border-ink bg-paper px-3 font-mono tabular-nums text-[18px] font-black uppercase tracking-[.18em]" dir="ltr" />
        </div>
        <button type="button" disabled={busy || !code.trim()} onClick={(event) => { firePickFxAt(event.currentTarget, { tone: 'ink', haptic: 'tap' }); void join(code) }} className="mt-3 min-h-tap w-full border-rule border-ink bg-ink px-4 font-display text-[22px] text-paper disabled:opacity-40 md:text-[24px]">{t('liveJoin')}</button>
      </div>
      {error && <p className="shrink-0 border-rule border-red bg-red/10 p-2.5 font-body text-[11px] font-black text-red md:col-span-2 md:p-3 md:text-[10px]">{t('liveError')}</p>}
    </section>
  )

  if (phase === 'result' && result) {
    const won = result.winner === 'us'; const draw = result.winner === 'draw'
    return <div className={fill}><RecordRun gate="royal-rumble-live" score={won ? 3 : draw ? 1 : 0} correct={won ? 1 : 0} asked={1} />
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center border-rule border-ink bg-ink p-6 text-center text-paper md:block"><p className="font-mono tabular-nums text-[9px] font-black tracking-[.24em] text-red" dir="ltr">LIVE · FULL TIME</p><p className="mt-3 animate-slam-solid font-display text-[96px] leading-none motion-reduce:animate-none md:text-[104px]" dir="ltr">{result.scoreFor}–{result.scoreAgainst}</p><h2 className="mt-3 font-display text-[32px] md:text-[36px]">{won ? t('liveWon') : draw ? t('liveDraw') : t('liveLost')}</h2></section></div>
  }
  if (phase === 'countdown') return <section className={`${fill} items-center justify-center border-rule border-ink bg-ink p-7 text-center text-paper`}><p className="font-mono tabular-nums text-[9px] font-black tracking-[.26em] text-red" dir="ltr">SYNCED START</p><p className="mt-2 font-body text-[11px] text-paper/50">{t('liveCountdown')}</p><p key={countdown} className="mt-4 animate-fx-pop font-display text-[140px] leading-none text-red motion-reduce:animate-none" dir="ltr">{countdown || 'GO'}</p>{busy && <p className="font-body text-[10px] text-paper/45">{t('liveResolving')}</p>}</section>
  if (phase === 'waiting') return <section className={`${fill} justify-center border-rule border-ink bg-ink p-5 text-paper`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono tabular-nums text-[8px] font-black tracking-[.2em] text-red" dir="ltr">ROOM {room.code}</p><h2 className="mt-1 font-display text-[32px]">{t('liveLocked')}</h2></div><div className="flex gap-4 font-body text-[11px] md:text-[9px]"><span className="flex items-center gap-2"><Lamp on />{t('liveYouReady')}</span><span className="flex items-center gap-2"><Lamp on={Boolean(state?.opponentReady)} />{t('liveOpponentReady')}</span></div></div><p className="mt-4 border-t border-paper/15 pt-4 font-body text-[12px] leading-relaxed text-paper/55 md:text-[11px]">{t('liveWaiting')}</p></section>
  if (!currentSlot) return null

  const lockable = complete && remaining >= 0 && !busy && Boolean(state?.opponentJoined)

  return <div className="flex h-full min-h-0 flex-col md:h-auto md:gap-3">
    {/* HUD — one line on a phone: the room, both lamps, the money */}
    <section className="shrink-0 border-rule border-ink bg-ink px-2.5 py-1.5 text-paper md:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono tabular-nums text-[8px] font-black tracking-[.2em] text-red" dir="ltr">LIVE ROOM · {room.code}</p>
          <h2 className="mt-1 hidden font-display text-[31px] md:block">{t('liveDraftTitle')}</h2>
          <p className="mt-0.5 flex items-center gap-3 font-body text-[10px] md:hidden">
            <span className="flex items-center gap-1.5"><Lamp on />{t('liveYou')}</span>
            <span className="flex items-center gap-1.5"><Lamp on={Boolean(state?.opponentJoined)} />{state?.opponentJoined ? t('liveOpponentJoined') : t('liveOpponentMissing')}</span>
          </p>
        </div>
        <p className="font-display text-[24px] leading-none text-paper md:hidden" dir="ltr">{money(remaining)}</p>
        <button type="button" onClick={() => void copyRoom()} className="hidden min-h-tap border border-paper/25 px-3 font-body text-[10px] font-black md:block">{copied ? t('liveCopied') : t('liveCopy')}</button>
      </div>
      <div className="mt-3 hidden grid-cols-2 gap-2 border-t border-paper/15 pt-3 font-body text-[9px] md:grid"><span className="flex items-center gap-2"><Lamp on />{t('liveYou')}</span><span className="flex items-center gap-2"><Lamp on={Boolean(state?.opponentJoined)} />{state?.opponentJoined ? t('liveOpponentJoined') : t('liveOpponentMissing')}</span></div>
    </section>

    {/* the five */}
    <section className="mt-1.5 grid shrink-0 grid-cols-[repeat(5,minmax(0,1fr))_44px] gap-1 border-rule border-ink bg-ink p-1 text-paper md:order-2 md:mt-0 md:p-2">
      {activeDraft.slots.map((s, i) => {
        const label = slotShort(s.rule)
        const chosen = picks[i] ?? null
        return (
          <button key={`${label}-${i}`} type="button" onClick={() => setSlot(i)} aria-pressed={slot === i} aria-label={chosen ? `${label} · ${chosen.player.nameHe} · ${money(chosen.player.price)}` : `${label} · ${t('vacant')}`} className={`min-h-tap min-w-0 border p-1 text-center ${slot === i ? 'border-red bg-red' : 'border-paper/15'}`}>
            <span className="font-mono tabular-nums text-[7px] font-black" dir="ltr">{label}</span>
            <span key={chosen?.player.slug ?? 'none'} className={`mt-1 block truncate font-body text-[9px] font-black md:text-[8px] ${chosen ? 'animate-fx-pop motion-reduce:animate-none' : ''}`}>{chosen?.player.nameHe ?? '—'}</span>
          </button>
        )
      })}
      {/* the one shape — the same mini pitch as solo */}
      <div className="flex min-w-0 flex-col justify-center border border-paper/10 p-0.5" title={t('formationCreative')}>
        <FormationMini formation={formation} />
      </div>
    </section>

    {/* chips — shuffle once · the room · the rules (phone); md up keeps its own bar below */}
    <div className="mt-1.5 flex shrink-0 gap-1.5 md:hidden">
      <button type="button" disabled={!shuffleOpen} onClick={(event) => { shuffle(); firePickFxAt(event.currentTarget, { tone: 'sign', haptic: 'tap' }) }} className={`flex min-h-tap flex-1 items-center justify-between gap-2 border-hair px-2.5 font-body text-[11.5px] font-extrabold ${shuffleOpen ? 'border-ink bg-paper text-ink' : 'border-ink/15 text-ink/35'}`}>
        <span className="truncate">{shuffleUsed ? t('shuffleUsed') : pickedCount > 0 ? t('shuffleBeforePick') : t('shuffleAction')}</span>
        <span className="shrink-0 font-mono tabular-nums text-[9px] font-black tracking-[0.16em] text-red" dir="ltr">×1</span>
      </button>
      <button type="button" onClick={() => setRoomOpen(true)} className="flex min-h-tap shrink-0 items-center border-hair border-ink bg-sheet px-2.5 font-body text-[11.5px] font-extrabold text-ink">{tt('rumble.live.roomChip')}</button>
      <button type="button" onClick={() => setRulesOpen(true)} className="flex min-h-tap shrink-0 items-center border-hair border-ink/35 px-2.5 font-body text-[11.5px] font-extrabold text-ink">{t('stageRulesChip')}</button>
    </div>

    {/* THE FIELD — the three offers, as big as the phone allows */}
    <section className="mt-1.5 flex min-h-0 flex-1 flex-col border-rule border-ink bg-paper p-1.5 text-ink md:mt-0 md:block md:flex-none md:p-5">
      <div className="mb-1 flex shrink-0 items-end justify-between gap-3">
        <div className="min-w-0"><p className="font-mono tabular-nums text-[8px] font-black tracking-[.18em] text-red" dir="ltr">PICK {slot + 1}/5 · {slotShort(currentSlot.rule)}</p><h3 className="truncate font-display text-[16px] leading-none md:text-[28px]">{t('draftQuestion')}</h3></div>
        <p className="hidden font-display text-[34px] text-red md:block" dir="ltr">{money(remaining)}</p>
      </div>
      <FitBox ratio={1.5} className="min-h-0 flex-1" innerClassName="flex items-stretch">
        <div className="relative flex w-full md:mt-3">
          <RoyalRumbleSlotReveal offers={currentSlot.offers} signature={`${activeDraft.seed}-${slot}`} />
          <div className="grid w-full grid-cols-3 gap-1.5 sm:gap-3">{currentSlot.offers.map((offer) => {
            const { player, offeredAs } = offer
            const active = picks[slot]?.player.slug === player.slug
            const disabled = !canPick(slot, offer)
            return (
              <button
                key={`${player.slug}-${offeredAs}`}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                aria-label={disabled ? t('cardBlocked', { name: player.nameHe, price: money(player.price) }) : t('cardAria', { name: player.nameHe, position: POSITION_SHORT[offeredAs], price: money(player.price) })}
                onClick={(event) => { pick(offer); firePickFxAt(event.currentTarget, { label: money(player.price), tone: 'red', haptic: 'lock' }) }}
                className={`flex h-full min-h-tap flex-col border-rule p-1.5 text-start transition duration-200 active:translate-y-1 motion-reduce:transition-none md:min-h-[245px] md:p-2 ${active ? 'translate-y-1 border-red bg-red text-paper' : 'border-ink bg-paper text-ink'} ${disabled ? 'opacity-25 grayscale' : ''}`}
              >
                <div className="flex shrink-0 items-start justify-between"><span className={`font-mono tabular-nums text-[8px] font-black ${active ? 'border-paper/50' : 'border-red text-red'}`} dir="ltr">{POSITION_SHORT[offeredAs]}</span><span className={`font-display text-[20px] leading-none md:text-[28px] ${active ? 'text-paper' : 'text-red'}`} dir="ltr">{money(player.price)}</span></div>
                <div className="mt-1 flex min-h-[40px] flex-1 items-center justify-center overflow-hidden md:mt-2 md:h-[112px] md:flex-none">
                  <Shirt player={player} kits={kits} className="h-full max-h-[116px] w-auto max-w-[102px] md:h-[116px] md:w-[102px]" />
                </div>
                <p className="mt-1 shrink-0 truncate font-display text-[15px] leading-[.95] md:mt-3 md:whitespace-normal md:text-[22px] md:leading-[.9]">{player.nameHe}</p>
              </button>
            )
          })}</div>
        </div>
      </FitBox>
    </section>

    <div className="hidden gap-2 md:order-3 md:grid md:grid-cols-2"><button type="button" disabled={!shuffleOpen} onClick={shuffle} className="min-h-tap border-rule border-ink bg-paper px-4 text-start font-display text-[22px] text-ink disabled:opacity-35">{shuffleUsed ? t('shuffleUsed') : pickedCount > 0 ? t('shuffleBeforePick') : t('shuffleAction')}</button><button type="button" disabled={!lockable} onClick={(event) => { firePickFx(event.clientX, event.clientY, { label: t('liveLock'), tone: 'red', big: true, haptic: 'lock' }); void lock() }} className="min-h-tap border-rule border-red bg-red px-4 text-start font-display text-[24px] text-paper disabled:opacity-35">{busy ? t('locking') : t('liveLock')}</button></div>
    {error && <p className="mt-1.5 shrink-0 border-rule border-red bg-red/10 p-2.5 font-body text-[11px] font-black text-red md:order-4 md:mt-0 md:p-3 md:text-[10px]">{t('liveError')}</p>}

    {/* the one primary action on a phone */}
    <button type="button" disabled={!lockable} onClick={(event) => { firePickFx(event.clientX, event.clientY, { label: t('liveLock'), tone: 'red', big: true, haptic: 'lock' }); void lock() }} className="mt-1.5 min-h-tap w-full shrink-0 border-rule border-red bg-red px-4 text-start font-display text-[22px] text-paper disabled:border-concrete disabled:bg-concrete disabled:text-ink/55 md:hidden">{busy ? t('locking') : t('liveLock')}</button>

    <SlideSheet open={roomOpen} onClose={() => setRoomOpen(false)} title={t('liveDraftTitle')} latin={`ROOM ${room.code}`} footer={<button type="button" onClick={() => void copyRoom()} className="min-h-tap w-full border-rule border-red bg-red font-display text-[20px] text-paper">{copied ? t('liveCopied') : t('liveCopy')}</button>}>
      <div className="flex flex-col gap-3">
        <p className="font-mono tabular-nums text-[34px] font-black tracking-[.24em] text-ink" dir="ltr">{room.code}</p>
        <div className="grid grid-cols-2 gap-2 font-body text-[12px]">
          <span className="flex items-center gap-2 border-hair border-ink/30 bg-ink p-2 text-paper"><Lamp on />{t('liveYou')}</span>
          <span className="flex items-center gap-2 border-hair border-ink/30 bg-ink p-2 text-paper"><Lamp on={Boolean(state?.opponentJoined)} />{state?.opponentJoined ? t('liveOpponentJoined') : t('liveOpponentMissing')}</span>
        </div>
        <p className="font-body text-[12px] leading-relaxed text-ink/80">{t('liveWaiting')}</p>
      </div>
    </SlideSheet>
    <SlideSheet open={rulesOpen} onClose={() => setRulesOpen(false)} title={t('stageRulesTitle')} latin="RULES">
      <div className="flex flex-col gap-2">
        <p className="font-body text-[13px] leading-relaxed text-ink">{t('liveCreateBody')}</p>
        <p className="border-s-rule border-red ps-2.5 font-body text-[12px] leading-relaxed text-ink/85">{t('rulePrice')}</p>
        <p className="border-s-rule border-red ps-2.5 font-body text-[12px] leading-relaxed text-ink/85">{t('ruleRange')}</p>
        <p className="border-s-rule border-red ps-2.5 font-body text-[12px] leading-relaxed text-ink/85">{t('fixedOrderHint')}</p>
        <p className="border-s-rule border-red ps-2.5 font-body text-[12px] leading-relaxed text-ink/85">{t('shuffleBeforePick')}</p>
        <p className="font-body text-[11px] text-concrete">{t('budgetOf', { budget: money(activeDraft.budget) })}</p>
      </div>
    </SlideSheet>
  </div>
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { firePickFx, firePickFxAt } from '@/components/stage/PickFx'
import { track } from '@/lib/analytics/meter'
import { t, type MessageKey } from '@/lib/i18n'
import type { DuelError, LiveState } from '@/lib/game/blind-cow/duel'
import type { RunView } from '@/lib/game/blind-cow/types'
import { portalConfigured } from '@/lib/portal/env'
import { liveReadyAction, liveStartAction, liveStateAction } from '@/app/blind-cow/actions'

import { CowMark } from './CowMark'

/**
 * חדר המוכנים — the live duel (spec §2.4, delta 89).
 *
 * Both sides in the room, both press "מוכן", the DATABASE sets one go time four seconds
 * out, both screens count 3-2-1 on the database's clock, and at go both runs open with
 * their clocks at that same instant (`worker_blind_cow_live_start`). From there it is the
 * ordinary duel — the same clues, the same referee, the same VS.
 *
 * Supabase Realtime is only the doorbell: a Broadcast "poke" on a channel named from a
 * hash of the token, and Presence so each side sees the other arrive. It never carries a
 * result or a state. Without it (no env, a blocked socket) the room asks every 1.5 s and
 * reaches the same go time.
 */

const ERRORS: Partial<Record<DuelError, MessageKey>> = {
  started: 'connect.live.error.started',
  expired: 'blindcow.duel.error.expired',
  not_found: 'blindcow.duel.error.not_found',
  network: 'blindcow.duel.error.network',
  unavailable: 'blindcow.duel.unavailable',
}

type Channel = { send: (m: unknown) => Promise<unknown>; unsubscribe: () => unknown }

async function channelName(token: string): Promise<string | null> {
  try {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`worker-bc-live|${token}`))
    return `worker-bc-live-${[...new Uint8Array(bytes)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')}`
  } catch {
    return null
  }
}

export function LiveRoom({
  token,
  myName,
  onGo,
  onLeave,
}: {
  token: string
  myName: string
  onGo: (view: RunView) => void
  onLeave: () => void
}) {
  const [state, setState] = useState<LiveState | null>(null)
  const [error, setError] = useState<DuelError | null>(null)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [present, setPresent] = useState(false)
  const channel = useRef<Channel | null>(null)
  const going = useRef(false)

  const take = useCallback((out: LiveState | { error: DuelError }) => {
    if ('error' in out) {
      setError(out.error)
      return null
    }
    setError(null)
    setState(out)
    return out
  }, [])

  const refresh = useCallback(async () => take(await liveStateAction(token)), [token, take])
  const poke = useCallback(() => {
    void channel.current?.send({ type: 'broadcast', event: 'poke', payload: {} }).catch(() => {})
  }, [])

  // the doorbell — Realtime Broadcast + Presence, when the build has a Supabase project
  useEffect(() => {
    if (!portalConfigured()) return
    let gone = false
    let sub: Channel | null = null
    void (async () => {
      const name = await channelName(token)
      if (!name || gone) return
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const client = createClient()
        const ch = client.channel(name, { config: { broadcast: { self: false }, presence: { key: Math.random().toString(36).slice(2) } } })
        ch.on('broadcast', { event: 'poke' }, () => void refresh())
          .on('presence', { event: 'sync' }, () => {
            setPresent(Object.keys(ch.presenceState()).length >= 2)
            void refresh()
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') void ch.track({ at: Date.now() })
          })
        sub = ch as unknown as Channel
        channel.current = sub
      } catch {
        /* no socket — the room polls */
      }
    })()
    return () => {
      gone = true
      void sub?.unsubscribe()
      channel.current = null
    }
  }, [token, refresh])

  // the fallback that always works
  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 1500)
    return () => window.clearInterval(id)
  }, [refresh])

  // the countdown runs on the database's clock
  useEffect(() => {
    if (!state?.goAt) return
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [state?.goAt])

  const left = state?.goAt ? state.goAt - (now + state.skewMs) : null
  const shown = left === null ? null : Math.max(0, Math.ceil(left / 1000))

  useEffect(() => {
    if (shown === null || shown <= 0) return
    firePickFx(window.innerWidth / 2, window.innerHeight * 0.42, { label: String(shown), tone: shown === 1 ? 'red' : 'ink', big: shown === 1, haptic: 'tap' })
  }, [shown])

  useEffect(() => {
    if (left === null || left > 0 || going.current) return
    going.current = true
    void (async () => {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const out = await liveStartAction(token)
        if (out.view) {
          track('blind_cow_live_started')
          track('blind_cow_started', { detail: 'live' })
          poke()
          onGo(out.view)
          return
        }
        if (out.error !== 'too_early') {
          setError((out.error as DuelError) ?? 'network')
          going.current = false
          return
        }
        await new Promise((r) => window.setTimeout(r, 250))
      }
      going.current = false
    })()
  }, [left, token, onGo, poke])

  async function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    if (busy || !state || state.goAt) return
    setBusy(true)
    const out = take(await liveReadyAction(token, !state.meReady))
    setBusy(false)
    if (out) {
      poke()
      firePickFxAt(event.currentTarget, { tone: out.meReady ? 'red' : 'sign', haptic: out.meReady ? 'lock' : 'tap', label: out.meReady ? t('connect.live.ready') : undefined })
    }
  }

  const them = state?.them ?? null
  const counting = shown !== null && shown > 0

  return (
    <div className="flex min-h-0 flex-1 flex-col md:block md:flex-none" data-live="room">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center md:min-h-[420px]">
        <p className="font-latin text-[10px] font-bold tracking-[0.22em] text-red" dir="ltr">
          LIVE · READY ROOM
        </p>
        {counting ? (
          <p key={shown} className="relative animate-fx-pop font-poster text-[min(46vw,200px)] leading-none" aria-live="assertive">
            <span className="plate-shift absolute inset-0 text-sign">{shown}</span>
            <span className="plate-top relative text-red">{shown}</span>
          </p>
        ) : (
          <CowMark className="text-[84px] [@media(max-height:680px)]:text-[56px]" />
        )}
        <p className="font-display text-[26px] leading-none text-ink">{counting ? t('connect.live.counting') : t('connect.live.title')}</p>
        <div className="grid w-full max-w-[340px] grid-cols-2 border-rule border-ink bg-paper">
          <Seat name={myName || t('blindcow.duel.you')} ready={state?.meReady ?? false} here />
          <Seat name={them?.name ?? t('blindcow.duel.them')} ready={them?.ready ?? false} here={Boolean(them) || present} />
        </div>
        <p className="max-w-[34ch] font-body text-[12.5px] leading-snug text-sign" role="status">
          {error
            ? t(ERRORS[error] ?? 'blindcow.duel.error.generic')
            : !them
              ? t('connect.live.waiting')
              : state?.goAt
                ? t('connect.live.go')
                : state?.meReady && !them.ready
                  ? t('connect.live.waitingReady')
                  : t('connect.live.lede')}
        </p>
      </div>
      <div className="mt-1.5 grid shrink-0 grid-cols-[1fr_1.6fr] gap-1.5 md:mx-auto md:max-w-[520px]">
        <button
          type="button"
          onClick={onLeave}
          disabled={counting}
          className="flex min-h-tap items-center justify-center border-rule border-ink bg-paper px-2 font-body text-[13px] font-extrabold text-ink disabled:opacity-40"
        >
          {t('connect.live.leave')}
        </button>
        <button
          type="button"
          onClick={toggle}
          disabled={busy || !state || Boolean(state.goAt) || error === 'started' || error === 'expired'}
          aria-pressed={state?.meReady ?? false}
          data-live="ready"
          className={`flex min-h-tap items-center justify-center border-rule border-ink px-3 font-body text-step-0 font-extrabold transition-transform duration-press active:scale-[.97] disabled:opacity-60 motion-reduce:transition-none ${
            state?.meReady ? 'bg-ink text-paper' : 'bg-red text-paper'
          }`}
        >
          {state?.meReady ? t('connect.live.unready') : t('connect.live.ready')}
        </button>
      </div>
    </div>
  )
}

function Seat({ name, ready, here }: { name: string; ready: boolean; here: boolean }) {
  return (
    <div className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 border-e-hair border-ink/40 px-2 py-1.5 last:border-e-0 ${ready ? 'bg-red text-paper' : 'text-ink'}`}>
      <span className="max-w-full truncate font-sign text-[15px]">
        <bdi>{name}</bdi>
      </span>
      <span className={`font-body text-[10px] font-extrabold tracking-widest ${ready ? 'text-paper' : here ? 'text-sign' : 'text-muted'}`}>
        {ready ? t('connect.live.seatReady') : here ? t('connect.live.seatHere') : t('connect.live.seatEmpty')}
      </span>
    </div>
  )
}

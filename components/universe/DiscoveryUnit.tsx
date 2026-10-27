'use client'
import {useEffect, useRef, useState, type ReactNode} from 'react'
import {busy, occupied, snooze, snoozed} from '@/lib/universe/attention'
import {RUN_DONE, type RunDone} from '@/lib/clubs/completion'

/**
 * Connected Football — one client shell for every discovery unit (CF-02, CF-05, CF-01).
 *  · a snoozed family stays away; "×" snoozes it for seven days, here and in the slide-up banner alike
 *  · `data-discovery-unit` + `data-up` let the banner and the DUBID strip see it: one unit on screen at a time
 *  · `expiresAt` hides the promise the moment it stops being true; a tab back from the background asks `recheck`
 *    whether the hub would still make the same promise, and hides it if not
 *  · `after` keeps it out of sight until the game on this page has shown its result (lib/clubs/completion.ts)
 * Nothing here is stored about the visitor beyond the existing snooze.
 */
type After = {club: string; gate: string}
export function DiscoveryUnit({unit, family, actionId, expiresAt, recheck, after, floating, children}: {
  unit: string; family: string; actionId?: string; expiresAt?: string; recheck?: string; after?: After; floating?: boolean; children: ReactNode
}) {
  const [state, setState] = useState<'wait' | 'show' | 'gone'>('wait')
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // 1 · snoozed, expired, or waiting for a result
  useEffect(() => {
    if (snoozed(family)) { setState('gone'); return }
    const exp = Date.parse(expiresAt ?? '')
    if (expiresAt && (!Number.isFinite(exp) || exp <= Date.now())) { setState('gone'); return }
    if (!after) { setState('show'); return }
    let t = 0, dead = false
    const ready = () => {
      if (dead) return
      if (busy() || occupied(unit)) { t = window.setTimeout(ready, 1000); return }
      setState('show')
    }
    const on = (d: RunDone | undefined) => { if (d && d.club === after.club && d.gate === after.gate) { window.clearTimeout(t); t = window.setTimeout(ready, 1200) } }
    on((window as unknown as {__flRunDone?: RunDone}).__flRunDone)
    const h = (e: Event) => on((e as CustomEvent<RunDone>).detail)
    window.addEventListener(RUN_DONE, h)
    return () => { dead = true; window.clearTimeout(t); window.removeEventListener(RUN_DONE, h) }
  }, [family, expiresAt, after?.club, after?.gate, unit]) // eslint-disable-line react-hooks/exhaustive-deps

  // 2 · the deadline, and the tab that comes back from the background
  useEffect(() => {
    if (state !== 'show' || !expiresAt) return
    const exp = Date.parse(expiresAt)
    const t = window.setTimeout(() => setState('gone'), Math.max(0, Math.min(exp - Date.now(), 2_147_000_000)))
    let hiddenAt = 0
    const vis = () => {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return }
      if (Date.now() >= exp) { setState('gone'); return }
      if (recheck && actionId && hiddenAt && Date.now() - hiddenAt > 60_000) {
        fetch(recheck, {cache: 'no-store'}).then(r => r.json()).then((d: {id?: string | null}) => { if (d?.id !== actionId) setState('gone') }).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', vis)
    return () => { window.clearTimeout(t); document.removeEventListener('visibilitychange', vis) }
  }, [state, expiresAt, recheck, actionId])

  // 3 · an inline unit counts as "on screen" only while it is in view
  useEffect(() => {
    if (state !== 'show' || floating || !ref.current || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), {threshold: 0.4})
    io.observe(ref.current)
    return () => io.disconnect()
  }, [state, floating])

  if (state !== 'show') return null
  const close = () => { snooze(family); setState('gone') }
  return <div ref={ref} data-discovery-unit={unit} data-family={family} data-up={floating || inView ? 'true' : 'false'} data-action={actionId}
    className={floating ? 'uv-unit uv-float' : 'uv-unit'} style={floating ? {position: 'fixed', insetInline: 12, bottom: 'calc(var(--app-bottom, 0px) + env(safe-area-inset-bottom, 0px) + 12px)', zIndex: 45, maxWidth: 520, marginInline: 'auto'} : {position: 'relative'}}>
    {children}
    <button type="button" className="min-h-tap" aria-label="Not now — hide for a week" onClick={close}
      style={{position: 'absolute', insetBlockStart: 4, insetInlineEnd: 4, minWidth: 44, minHeight: 44, background: 'none', border: 0, color: 'inherit', font: '700 20px/1 var(--mag-body, system-ui)', cursor: 'pointer'}}>×</button>
  </div>
}

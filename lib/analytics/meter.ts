import { deviceId } from '@/lib/portal/device'
import { portalConfigured } from '@/lib/portal/env'

import { MAX_BATCH, cleanEvent, meteredGate, type EventName, type MeterEvent } from './events'

/**
 * המדידה בדפדפן — one queue, one endpoint, nothing third-party (delta 89).
 *
 *   track(name, props)   queue one event (gate defaults to the gate on screen)
 *   markStep(n)          a gate's own step index — "הרמז השלישי", "השער השני"
 *   visit                the one open gate visit: view → start → picks → finish | leave
 *
 * The queue flushes 1.5 s after the last event, and on `pagehide`/`visibilitychange` with
 * `navigator.sendBeacon` so a closed tab still says where it stopped. Nothing is sent at
 * all when the build has no Supabase keys, when the browser asks not to be tracked (GPC /
 * Do Not Track), or when the device cannot hold its random id.
 *
 * The id is the portal's own (`worker.device.v1`, `lib/portal/device.ts`) and the database
 * never keeps it: it stores a hash salted with a key that changes every day.
 */

const ENDPOINT = '/api/track'
const FLUSH_MS = 1500

type Visit = {
  gate: string
  started: boolean
  finished: boolean
  left: boolean
  /** picks on the ground (`firePickFx` hits) — the generic step */
  picks: number
  /** the gate's own step, when it reports one */
  step: number | null
}

let queue: MeterEvent[] = []
let timer: number | null = null
let current: Visit | null = null
/** a step a gate declared before the visit opened (child effects run before the layout's) */
let pending: { gate: string; step: number } | null = null

export function meterEnabled(): boolean {
  if (typeof window === 'undefined' || !portalConfigured()) return false
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  if (nav.globalPrivacyControl === true || nav.doNotTrack === '1') return false
  return true
}

function body(events: MeterEvent[]): string | null {
  const device = deviceId()
  if (!device) return null
  return JSON.stringify({ device, events })
}

function send(events: MeterEvent[], beacon: boolean) {
  for (let i = 0; i < events.length; i += MAX_BATCH) {
    const payload = body(events.slice(i, i + MAX_BATCH))
    if (!payload) return
    try {
      if (beacon && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }))
      } else {
        void fetch(ENDPOINT, { method: 'POST', body: payload, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {})
      }
    } catch {
      // measurement is never the reason a screen breaks
    }
  }
}

export function flush(beacon = false) {
  if (timer !== null) {
    window.clearTimeout(timer)
    timer = null
  }
  if (queue.length === 0) return
  const out = queue
  queue = []
  send(out, beacon)
}

/** Queue one event. `gate` defaults to the gate on screen; outside a gate it is dropped. */
export function track(name: EventName, props: Omit<MeterEvent, 'name' | 'gate'> & { gate?: string } = {}) {
  if (!meterEnabled()) return
  const gate = props.gate ?? current?.gate ?? meteredGate(window.location.pathname)
  const event = cleanEvent({ ...props, name, gate })
  if (!event) return
  queue.push(event)
  if (queue.length >= MAX_BATCH) flush()
  else if (timer === null) timer = window.setTimeout(() => flush(), FLUSH_MS)
}

/* ------------------------------------------------------------------ the visit */

export function openVisit(gate: string, detail: string) {
  closeVisit(false)
  const step = pending && pending.gate === gate ? pending.step : null
  pending = null
  current = { gate, started: false, finished: false, left: false, picks: 0, step }
  track('gate_view', { gate, detail })
}

/** The first real touch in the gate — a pick, a button, a drag. */
export function startVisit() {
  if (!current || current.started) return
  current.started = true
  track('gate_start', { gate: current.gate })
}

export function countPick() {
  if (!current) return
  current.picks = Math.min(999, current.picks + 1)
  startVisit()
}

/**
 * A gate's own step index (one line in the gate, optional). `quiet` only sets where the
 * gate stands — the opening step, on mount — without counting it as a start or an event.
 */
export function markStep(step: number, detail?: string, quiet = false) {
  if (!Number.isInteger(step) || step < 0) return
  if (!current) {
    const gate = typeof window === 'undefined' ? null : meteredGate(window.location.pathname)
    if (gate) pending = { gate, step: Math.min(999, step) }
    return
  }
  if (current.step === step) return
  current.step = Math.min(999, step)
  if (quiet) return
  startVisit()
  track('gate_step', { gate: current.gate, step: current.step, detail })
}

function lastStep(v: Visit): { step: number; detail: string } {
  return v.step !== null ? { step: v.step, detail: 'step' } : { step: v.picks, detail: 'picks' }
}

/** A round finished — heard from the progress ledger (`emit`), once per visit. */
export function finishVisit(gate?: string, value?: number) {
  if (!current) return
  if (gate && meteredGate(gate) !== current.gate) return
  if (current.finished) return
  current.finished = true
  const { step, detail } = lastStep(current)
  track('gate_finish', { gate: current.gate, step, detail, value })
}

/**
 * The person went away mid-round: another route, a closed tab, a hidden app. Only a
 * started, unfinished visit leaves — a bounce is a view with no start.
 */
export function closeVisit(beacon: boolean) {
  const v = current
  if (v && v.started && !v.finished && !v.left) {
    v.left = true
    const { step, detail } = lastStep(v)
    track('gate_leave', { gate: v.gate, step, detail })
  }
  if (!beacon) current = null
  flush(beacon)
}

export function currentGate(): string | null {
  return current?.gate ?? null
}

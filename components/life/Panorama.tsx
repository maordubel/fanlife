'use client'

import { useEffect, useRef, useState } from 'react'

import { artUrl } from '@/lib/life/runtime/art'
import type { LifeBusEvents } from '@/lib/life/runtime/bus'
import { t } from '@/lib/i18n'

type Pano = NonNullable<LifeBusEvents['pano']>

/** the panorama is 4:1 and wraps; the horizon sits at 48% of its height */
const ASPECT = 4
/** how much taller than the glass the strip is drawn — the room to tilt up and down */
const OVERSCAN = 1.22

const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180

/**
 * מבט — for a moment the game is the boy's own eyes.
 *
 * A cylindrical 360° painting the player turns inside: drag a thumb, or (on a phone
 * that allows it) turn the phone itself. Things worth looking at are marked; touching
 * one speaks. The world scene is paused underneath — this is not a new room, it is the
 * same room seen from one metre twenty off the floor.
 *
 * The picture is a CSS background that repeats on X: the strip is scaled to
 * `OVERSCAN` × the glass height, so a finger can also tilt a little up (the roof,
 * the floodlights) and down (the step, the parquet). Yaw is degrees; a hotspot is a
 * yaw and a pitch; the math is one line each way. Momentum on release, because a
 * head that stops dead the instant a thumb lifts feels like a slideshow.
 *
 * Model: Myst / Firewatch, not Doom. There are no hands and no gun.
 */
export function Panorama({ pano, onTalk, onClose }: { pano: Pano; onTalk: (act: string) => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: 390, h: 844 })
  const [yaw, setYaw] = useState(pano.startYaw ?? 0)
  const [pitch, setPitch] = useState(0)
  const [hint, setHint] = useState(true)
  const [gyro, setGyro] = useState<'off' | 'on' | 'ask'>('off')
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number; vx: number; t: number } | null>(null)
  const velocity = useRef(0)
  const gyroBase = useRef<number | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setHint(false), 3400)
    return () => clearTimeout(timer)
  }, [])

  // momentum: a released drag keeps turning and slows
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (!drag.current && Math.abs(velocity.current) > 0.02) {
        setYaw((y) => wrap(y + velocity.current))
        velocity.current *= 0.92
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [yaw])

  // the phone as the head
  useEffect(() => {
    if (gyro !== 'on') return
    const onOrient = (event: DeviceOrientationEvent) => {
      if (event.alpha === null || event.alpha === undefined) return
      if (gyroBase.current === null) gyroBase.current = event.alpha
      // alpha grows counter-clockwise; turning the phone right should look right
      setYaw(wrap((pano.startYaw ?? 0) - (event.alpha - gyroBase.current)))
      if (event.beta !== null && event.beta !== undefined) setPitch(Math.max(-1, Math.min(1, (event.beta - 60) / 40)))
    }
    window.addEventListener('deviceorientation', onOrient)
    return () => window.removeEventListener('deviceorientation', onOrient)
  }, [gyro, pano.startYaw])

  const enableGyro = async () => {
    const ctor = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent
    try {
      if (ctor?.requestPermission) {
        const answer = await ctor.requestPermission()
        if (answer !== 'granted') return
      }
    } catch {
      return
    }
    gyroBase.current = null
    setGyro('on')
  }

  const stripH = size.h * OVERSCAN
  const stripW = stripH * ASPECT
  const pxPerDeg = stripW / 360
  // yaw 0 is the centre of the painting; the strip repeats on X so any offset is valid
  const bgX = size.w / 2 - stripW / 2 - yaw * pxPerDeg
  const bgY = -(stripH - size.h) * (0.5 + pitch * 0.5)

  const onDown = (event: React.PointerEvent) => {
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, yaw, pitch, vx: 0, t: performance.now() }
    velocity.current = 0
    setHint(false)
  }
  const onMove = (event: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const now = performance.now()
    const nextYaw = wrap(d.yaw - (event.clientX - d.x) / pxPerDeg)
    d.vx = (nextYaw - yaw) / Math.max(1, now - d.t) * 16
    d.t = now
    setYaw(nextYaw)
    setPitch(Math.max(-1, Math.min(1, d.pitch - (event.clientY - d.y) / (size.h * 0.6))))
  }
  const onUp = () => {
    if (drag.current) velocity.current = Math.max(-6, Math.min(6, drag.current.vx))
    drag.current = null
  }

  return (
    <div
      ref={box}
      className="pointer-events-auto absolute inset-0 z-[28] touch-none select-none overflow-hidden bg-ink"
      data-life="panorama"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${artUrl(pano.key)})`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: `${stripW}px ${stripH}px`,
          backgroundPosition: `${bgX}px ${bgY}px`,
        }}
        aria-hidden="true"
      />
      {/* a breath of vignette so the marks and the plates sit on something */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/70 to-transparent" aria-hidden="true" />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/70 to-transparent" aria-hidden="true" />

      {/* the marks — a red square and a name, on the thing itself */}
      {pano.hotspots.map((spot) => {
        const dx = wrap(spot.yaw - yaw) * pxPerDeg
        const x = size.w / 2 + dx
        // a 4:1 cylinder spans about 90° vertically: 45° up is half the strip
        const y = stripH * 0.48 + bgY - (spot.pitch / 45) * (stripH * 0.5)
        if (x < -80 || x > size.w + 80) return null
        return (
          <button
            key={spot.act}
            type="button"
            data-life="pano-spot"
            onClick={(event) => {
              event.stopPropagation()
              onTalk(spot.act)
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
            style={{ left: x, top: y }}
          >
            <span className="block h-3.5 w-3.5 animate-caret-blink border-hair border-sheet bg-red" aria-hidden="true" />
            <span className="border-hair border-ink bg-sheet/95 px-2 py-1 font-sign text-[11px] font-bold leading-none text-ink transition-colors duration-press group-active:bg-red group-active:text-sheet">
              <bdi>{spot.labelHe}</bdi>
            </span>
          </button>
        )
      })}

      {/* the plate, the hint, the way back */}
      <div className="pointer-events-none absolute inset-x-0 top-[max(0.625rem,env(safe-area-inset-top))] flex items-start justify-between px-2.5">
        <div className="border-hair border-sheet/40 bg-ink/85 px-2.5 py-1.5">
          <p className="font-sign text-[12px] font-bold leading-none text-sheet">
            <bdi>{pano.titleHe}</bdi>
          </p>
        </div>
        <div className="pointer-events-auto flex gap-2">
          {gyro !== 'on' && (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={enableGyro}
              className="border-hair border-sheet/40 bg-ink/85 px-2.5 py-1.5 font-body text-[11px] leading-none text-sheet"
            >
              {t('life.pano.tilt')}
            </button>
          )}
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onClose}
            data-life="pano-close"
            className="min-h-tap border-hair border-sheet bg-red px-3 font-display text-[13px] leading-none text-sheet"
          >
            {t('life.pano.back')}
          </button>
        </div>
      </div>
      {hint && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(24px+env(safe-area-inset-bottom))] flex justify-center">
          <span className="animate-plate-in border-hair border-sheet/40 bg-ink/85 px-3 py-1.5 font-body text-[11px] leading-none text-sheet">
            {t('life.pano.hint')}
          </span>
        </div>
      )}
    </div>
  )
}

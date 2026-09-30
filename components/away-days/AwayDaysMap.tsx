'use client'

import { geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, Geometry, MultiLineString } from 'geojson'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { feature, mesh } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import world from 'world-atlas/countries-110m.json'

import { t } from '@/lib/i18n'
import type { VenueLite } from '@/lib/away-days/journey'

/**
 * המפה — the world, printed (AWAY DAYS spec §25–§26, §31–§32).
 *
 * No tiles, no provider, no geocoder: an orthographic globe drawn from Natural Earth's
 * 1:110m countries (`world-atlas`) with `d3-geo`, as one SVG. Every coordinate on it comes
 * from the generated master. This module is the only one that imports the atlas, and the
 * page loads it with `next/dynamic`, so the ~110 KB of geometry ships on /away-days only.
 *
 * The camera is a rotation and a zoom. `focus` moves it: a flight interpolates the centre
 * along the great circle and dips the zoom in the middle (a flyTo), while the leg being
 * travelled draws itself from the last ground to the next. Under reduced motion the
 * camera jumps and the leg is drawn whole. In explore mode the globe turns under a drag,
 * zooms with a pinch, the wheel or the ± buttons, and every ground is a keyboard stop.
 *
 * Colour: charcoal sea (ink), navy land (sign), quiet borders, the route in vermilion,
 * the names in cream. No yellow can arise: nothing fades over anything.
 */

type LngLat = [number, number]
export type MarkerState = 'active' | 'past' | 'idle' | 'origin'
export type MapMarker = { venue: VenueLite; state: MarkerState; label?: string; count?: number }
export type Camera = { lng: number; lat: number; zoom: number }

const topo = world as unknown as Topology<{ countries: GeometryCollection; land: GeometryCollection }>
const LAND = feature(topo, topo.objects.land) as unknown as FeatureCollection<Geometry>
const BORDERS = mesh(topo, topo.objects.countries, (a, b) => a !== b) as MultiLineString
const GRATICULE = geoGraticule10()
const SPHERE = { type: 'Sphere' } as const

const MIN_ZOOM = 0.9
const MAX_ZOOM = 9

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function reducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function AwayDaysMap({
  markers,
  route,
  leg,
  focus,
  interactive,
  onMarker,
  onArrive,
  labelledBy,
}: {
  markers: MapMarker[]
  /** legs already travelled, as [from, to] pairs */
  route: [LngLat, LngLat][]
  /** the leg being travelled now — it draws itself during the flight */
  leg: [LngLat, LngLat] | null
  /** where the camera should be; a new object starts a flight */
  focus: Camera
  interactive: boolean
  onMarker?: (venueId: string) => void
  onArrive?: () => void
  labelledBy?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [camera, setCamera] = useState<Camera>(focus)
  const [progress, setProgress] = useState(1)
  const cameraRef = useRef(camera)
  cameraRef.current = camera
  const frame = useRef<number | null>(null)
  const arrive = useRef(onArrive)
  arrive.current = onArrive

  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // the flight
  useEffect(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    const from = cameraRef.current
    const to = focus
    const arc = geoDistance([from.lng, from.lat], [to.lng, to.lat])
    if (reducedMotion() || (arc < 1e-4 && Math.abs(from.zoom - to.zoom) < 1e-3)) {
      setCamera(to)
      setProgress(1)
      arrive.current?.()
      return
    }
    const centre = geoInterpolate([from.lng, from.lat], [to.lng, to.lat])
    const duration = Math.min(2400, 900 + arc * 900)
    const dip = Math.min(0.55, arc * 0.45)
    const start = performance.now()
    setProgress(0)
    const step = (now: number) => {
      const raw = Math.min(1, (now - start) / duration)
      const e = ease(raw)
      const [lng, lat] = centre(e)
      const zoom = (from.zoom + (to.zoom - from.zoom) * e) * (1 - dip * Math.sin(Math.PI * e))
      setCamera({ lng, lat, zoom: Math.max(MIN_ZOOM * 0.8, zoom) })
      setProgress(Math.min(1, e * 1.08))
      if (raw < 1) frame.current = requestAnimationFrame(step)
      else {
        frame.current = null
        setCamera(to)
        setProgress(1)
        arrive.current?.()
      }
    }
    frame.current = requestAnimationFrame(step)
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [focus])

  const radius = Math.max(40, Math.min(size.w, size.h) / 2 - 6)
  const projection = useMemo(
    () =>
      geoOrthographic()
        .rotate([-camera.lng, -camera.lat])
        .scale(radius * camera.zoom)
        .translate([size.w / 2, size.h / 2])
        .clipAngle(90)
        .precision(0.6),
    [camera, radius, size.w, size.h],
  )
  const path = useMemo(() => geoPath(projection), [projection])
  const centre: LngLat = [camera.lng, camera.lat]
  const visible = (p: LngLat) => geoDistance(p, centre) < Math.PI / 2 - 0.02

  const lineOf = (a: LngLat, b: LngLat, upTo = 1): string => {
    const interp = geoInterpolate(a, b)
    const steps = 48
    const coords: LngLat[] = []
    for (let i = 0; i <= steps; i += 1) coords.push(interp((i / steps) * upTo) as LngLat)
    return path({ type: 'LineString', coordinates: coords } as Feature['geometry']) ?? ''
  }

  /* ---- explore: drag to turn, pinch / wheel / buttons to zoom */
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<number | null>(null)
  const zoomBy = useCallback((factor: number) => {
    setCamera((c) => ({ ...c, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom * factor)) }))
  }, [])

  function down(event: React.PointerEvent) {
    if (!interactive) return
    // no capture yet: a tap must still reach the marker under the finger
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }]
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }
  function move(event: React.PointerEvent) {
    const last = pointers.current.get(event.pointerId)
    if (!interactive || !last) return
    const next = { x: event.clientX, y: event.clientY }
    const el = event.currentTarget as HTMLElement
    if (!el.hasPointerCapture(event.pointerId)) {
      if (Math.hypot(next.x - last.x, next.y - last.y) < 4) return
      el.setPointerCapture(event.pointerId)
    }
    pointers.current.set(event.pointerId, next)
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()] as [{ x: number; y: number }, { x: number; y: number }]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      zoomBy(d / pinch.current)
      pinch.current = d
      return
    }
    const k = 90 / (radius * cameraRef.current.zoom)
    setCamera((c) => ({
      ...c,
      lng: c.lng - (next.x - last.x) * k,
      lat: Math.max(-80, Math.min(80, c.lat + (next.y - last.y) * k)),
    }))
  }
  function up(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }
  useEffect(() => {
    const el = box.current
    if (!el || !interactive) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      zoomBy(Math.exp(-event.deltaY * 0.0015))
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [interactive, zoomBy])

  const ready = size.w > 0 && size.h > 0
  const hit = 44

  return (
    <div
      ref={box}
      className={`relative h-full w-full select-none overflow-hidden bg-ink ${interactive ? 'cursor-grab touch-none active:cursor-grabbing' : 'touch-pan-y'}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {ready && (
        <svg
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          role="img"
          aria-labelledby={labelledBy}
          aria-label={labelledBy ? undefined : t('away.map.aria')}
          className="block"
        >
          <path d={path(SPHERE) ?? ''} className="fill-lamp-off stroke-concrete/20" strokeWidth={1} />
          <path d={path(GRATICULE) ?? ''} className="fill-none stroke-concrete/10" strokeWidth={0.6} />
          <path d={path(LAND) ?? ''} className="fill-sign" />
          <path d={path(BORDERS) ?? ''} className="fill-none stroke-ink/60" strokeWidth={0.6} />

          {/* the road already travelled */}
          {route.map(([a, b], i) => (
            <path key={`r${i}`} d={lineOf(a, b)} className="fill-none stroke-red/60" strokeWidth={1.6} strokeLinecap="square" />
          ))}
          {/* the leg being travelled — it grows with the flight */}
          {leg && (
            <>
              <path d={lineOf(leg[0], leg[1], progress)} className="fill-none stroke-ink" strokeWidth={5} strokeLinecap="square" />
              <path d={lineOf(leg[0], leg[1], progress)} className="fill-none stroke-red" strokeWidth={2.6} strokeLinecap="square" />
            </>
          )}

          {markers.map((m) => {
            const p: LngLat = [m.venue.lng, m.venue.lat]
            if (!visible(p)) return null
            const xy = projection(p)
            if (!xy) return null
            const [x, y] = xy
            const s = m.state === 'active' ? 12 : m.state === 'origin' ? 9 : m.state === 'past' ? 8 : 9
            const aria = t('away.marker.aria', {
              venue: m.venue.nameHe,
              city: m.venue.cityHe,
              n: String(m.count ?? 1),
            })
            const press = () => onMarker?.(m.venue.id)
            return (
              <g
                key={m.venue.id}
                transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}
                {...(interactive && onMarker
                  ? {
                      role: 'button',
                      tabIndex: 0,
                      'aria-label': aria,
                      onClick: press,
                      onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          press()
                        }
                      },
                      className: 'cursor-pointer outline-none [&:focus-visible>rect.focus]:stroke-red',
                    }
                  : { 'aria-hidden': true })}
              >
                {interactive && <rect x={-hit / 2} y={-hit / 2} width={hit} height={hit} className="focus fill-ink/0 stroke-transparent" strokeWidth={2} />}
                {m.state === 'active' && interactive && (
                  <rect data-away="marker-ring" x={-s / 2 - 4} y={-s / 2 - 4} width={s + 8} height={s + 8} className="fill-none stroke-sheet" strokeWidth={1.4} />
                )}
                {m.state === 'active' && <rect x={-s / 2 + 2} y={-s / 2 + 2} width={s} height={s} className="fill-sign" />}
                <rect
                  x={-s / 2}
                  y={-s / 2}
                  width={s}
                  height={s}
                  strokeWidth={m.state === 'past' ? 1.6 : 1.2}
                  className={
                    m.state === 'active'
                      ? 'fill-red stroke-ink'
                      : m.state === 'origin'
                        ? 'fill-sheet stroke-ink'
                        : m.state === 'past'
                          ? 'fill-ink stroke-red'
                          : 'fill-red stroke-ink'
                  }
                />
                {m.count && m.count > 1 && interactive && (
                  <text x={0} y={3} textAnchor="middle" className="fill-sheet font-mono text-[7px] font-bold tabular-nums" aria-hidden="true">
                    {m.count}
                  </text>
                )}
                {m.label && (
                  <text
                    x={0}
                    y={-s / 2 - 6}
                    textAnchor="middle"
                    direction="ltr"
                    className="fill-sheet stroke-ink font-latin text-[10px] font-bold tracking-[0.18em] [paint-order:stroke]"
                    strokeWidth={3}
                    aria-hidden="true"
                  >
                    {m.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}

      {interactive && (
        <div className="absolute bottom-2 end-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => zoomBy(1.5)}
            aria-label={t('away.zoomIn')}
            className="grid min-h-tap w-tap place-items-center border-hair border-concrete/40 bg-ink font-mono text-[20px] tabular-nums leading-none text-sheet active:scale-[.94] motion-reduce:transition-none"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.5)}
            aria-label={t('away.zoomOut')}
            className="grid min-h-tap w-tap place-items-center border-hair border-concrete/40 bg-ink font-mono text-[20px] tabular-nums leading-none text-sheet active:scale-[.94] motion-reduce:transition-none"
          >
            −
          </button>
        </div>
      )}
    </div>
  )
}

export default AwayDaysMap

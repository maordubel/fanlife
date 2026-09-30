'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { t } from '@/lib/i18n'
import {
  CITY_AREAS,
  CITY_LABELS,
  CITY_LINES,
  isRevealed,
  KM,
  MAP_PLACES,
  MAP_SIZE,
  placeOfScene,
  project,
  type MapPlaceDef,
} from '@/lib/life/map'
import type { MapPlace } from '@/lib/life/runtime/game'
import { placeLabel } from '@/lib/life/world/labels'
import type { LifeState, LocationId } from '@/lib/life/types'

/**
 * מפת העיר — תל אביב, printed, and you can move it.
 *
 * Maor, 16.9.2026: "אשמח למפה אינטרקטיבית, שאפשר להזיז אותה, שיהיה כיף, ממש אווירת
 * תל אביבית." Before this pass the map was one static drawing at a computed viewBox with a
 * two-position wide/near toggle, and both halves of that sentence failed: you could not
 * move it, and at the wide position every name on it was printed at about eight screen
 * pixels and the six pins in Jaffa sat on top of each other.
 *
 * **The camera.** `cam` is a square window on the 1000×1000 drawing — `{x, y, w}` — and it
 * is the only thing that moves. Drag pans it, two fingers or the ＋/－ pair zoom it,
 * a released drag keeps going and slows (the house pattern, `Panorama.tsx:135–136`), and
 * `clampCam` will not let the window leave the city: a map you can fling into an empty
 * page is a map you can lose. There is always a way back on the glass — the fit button
 * flies to the whole city or to your own corner of it — because a player who has lost the
 * map must never be stuck.
 *
 * **A pan writes ONE attribute.** The rAF loop sets the `viewBox` and nothing else. Every
 * other number on the drawing — the counter-scale on the pins and the names, the stroke on
 * a road, the two paper textures — is a function of the ZOOM alone, so it is rendered from
 * a `unit` state that only moves when the zoom moves by more than a percent and a half.
 * Panning is therefore free, and a pinch costs a handful of renders rather than sixty.
 *
 * That split is not a micro-optimisation, it is the difference between a map and a slide
 * show. The first cut counter-scaled every mark by walking the DOM each frame and stroked
 * every road with `vector-effect: non-scaling-stroke`, and `map-pan-probe` measured the
 * open sheet at **two frames in two seconds** on the QA browser — slow enough that
 * Playwright could not even click a button on it, which is the same thing a thumb would
 * have found on a phone. The probe prints the frame rate for exactly that reason.
 *
 * **Two coordinate systems, and the rule is one line.** Everything under the camera —
 * coast, river, streets, quarters — is drawn in map units. Everything inside a group that
 * carries `scale(unit)` is drawn in SCREEN PIXELS around its own origin. So a pin's disc
 * is `r="7"` and it is seven pixels at every zoom.
 *
 * **Names arrive as you lean in.** The towns and the sea are always printed; the quarters
 * carry their tint and their name from the first zoom in; streets closer in; the small
 * things (the two ports, the market, מגדל שלום) closest of all. On top of that a greedy
 * pass drops any name whose box would land on a name already placed, and the pins go
 * first — a place this life has reached outranks a quarter every time.
 *
 * Everything the map already did, it still does: `isRevealed` decides what exists, a tap
 * on an open pin calls `onGo` and walks the door graph at the door graph's price, a place
 * behind a shut door is drawn grey with that door's own words under it, and `focus` +
 * `dropping` still play the reveal moment — only now the push-in is a real camera move
 * instead of a `viewBox` swap that no browser ever animated.
 */

type Cam = { x: number; y: number; w: number }

/** how far in the camera may go: a 150-unit window is about 1.4 km across */
const MIN_W = 150
const MAX_W = MAP_SIZE.w
/**
 * A released drag keeps 0.92 of its speed per frame at sixty frames a second, and a flight
 * covers 0.12 of what is left of it. Both are written here as RATES PER SECOND, and that is
 * the whole point: the first cut wrote them per frame, and on the QA browser — which draws
 * this page at one or two frames a second (rule 54 measured six on a phone) — "fly back to
 * the whole city" moved the camera about a tenth of the way and stopped. A map whose way
 * home is a function of the frame rate is a map you can still get lost on. `dt` is capped
 * at a tenth of a second for the same reason `TunnelWalk` caps it: after a long stall the
 * camera should resume, not teleport.
 */
const FRICTION_PER_S = 5.0
const EASE_PER_S = 7.7
/** slower than this many map units a second, the drag has stopped */
const STILL = 7
/**
 * A stall must not fling the city across the page, so a released drag never integrates more
 * than a tenth of a second at a time. A FLIGHT is the opposite case — the player asked to
 * be taken somewhere and a slow device must not charge them for it — so it gets a longer
 * step and simply arrives sooner in wall-clock time on a browser that is dropping frames.
 */
const MAX_DT = 0.1
const MAX_FLIGHT_DT = 0.35
/** a pointer that moved less than this many pixels was a tap, not a drag */
const TAP_SLOP = 8

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

/** the whole city, always the way home */
const FIT: Cam = { x: 0, y: 0, w: MAX_W }

export function CityMap({
  state,
  places,
  here,
  onGo,
  focus,
  dropping,
  wide,
  interactive,
  className,
}: {
  state: LifeState
  /** the runtime's door list — reachability and cost, by scene id */
  places: readonly MapPlace[]
  here: LocationId
  onGo?: (scene: string) => void
  focus?: MapPlaceDef | null
  dropping?: boolean
  /** show the whole city rather than the window around the revealed pins */
  wide?: boolean
  /** drag, pinch and the controls — off for the reveal, which drives the camera itself */
  interactive?: boolean
  className?: string
}) {
  const box = useRef<HTMLDivElement | null>(null)
  const svg = useRef<SVGSVGElement | null>(null)

  const reachable = useMemo(() => new Map(places.map((p) => [p.id, p])), [places])
  const herePlace = placeOfScene(here)

  /** the box around everything this life has on its map — the "near" way home */
  const nearCam = useMemo<Cam>(() => {
    const pins = MAP_PLACES.filter((p) => !p.offMap && isRevealed(state, p)).map((p) => project(p.lat, p.lon))
    if (pins.length === 0) return FIT
    const minX = Math.min(...pins.map((p) => p.x))
    const maxX = Math.max(...pins.map((p) => p.x))
    const minY = Math.min(...pins.map((p) => p.y))
    const maxY = Math.max(...pins.map((p) => p.y))
    // never tighter than a neighbourhood: six pins around one house must not stack up
    const w = clamp(Math.max(300, (maxX - minX) * 1.9, (maxY - minY) * 1.9), MIN_W, MAX_W)
    return { x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - w / 2, w }
  }, [state])

  /** the window on one place, for the reveal's push-in */
  const focusCam = useCallback((place: MapPlaceDef): Cam => {
    const p = project(place.lat, place.lon)
    const w = 320
    return { x: p.x - w / 2, y: p.y - w / 2, w }
  }, [])

  const [size, setSize] = useState({ w: 360, h: 360 })
  /** map units per screen pixel — React only hears about it when the zoom really moves */
  const [unit, setUnit] = useState(MAX_W / 360)
  const [wideMode, setWideMode] = useState(true)
  const [hint, setHint] = useState(true)

  const cam = useRef<Cam>(wide === false ? nearCam : FIT)
  const target = useRef<Cam | null>(null)
  const velocity = useRef({ x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number; x0: number; y0: number; t: number }>())
  const pinch = useRef<{ dist: number; cx: number; cy: number } | null>(null)
  const dragged = useRef(false)
  const still = useRef(true)

  const reduced = useRef(false)
  useEffect(() => {
    reduced.current = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth || 360, h: el.clientHeight || 360 })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!interactive) return
    const timer = window.setTimeout(() => setHint(false), 3600)
    return () => window.clearTimeout(timer)
  }, [interactive])

  /** map units per pixel for a camera — `meet` fits the square window to the short edge */
  const unitsPerPx = useCallback((w: number) => w / Math.max(1, Math.min(size.w, size.h)), [size])

  /** the city may be looked at from anywhere inside itself, and nowhere outside it */
  const clampCam = useCallback(
    (next: Cam): Cam => {
      const w = clamp(next.w, MIN_W, MAX_W)
      const u = unitsPerPx(w)
      const halfW = (size.w * u) / 2
      const halfH = (size.h * u) / 2
      const cx = halfW >= MAP_SIZE.w / 2 ? MAP_SIZE.w / 2 : clamp(next.x + next.w / 2, halfW, MAP_SIZE.w - halfW)
      const cy = halfH >= MAP_SIZE.h / 2 ? MAP_SIZE.h / 2 : clamp(next.y + next.w / 2, halfH, MAP_SIZE.h - halfH)
      return { x: cx - w / 2, y: cy - w / 2, w }
    },
    [size, unitsPerPx],
  )

  /** הצייר — the whole camera, in one attribute. Everything else is a render, not a frame. */
  const paint = useCallback(() => {
    const node = svg.current
    if (!node) return
    const c = cam.current
    node.setAttribute('viewBox', `${c.x.toFixed(2)} ${c.y.toFixed(2)} ${c.w.toFixed(2)} ${c.w.toFixed(2)}`)
    node.dataset.cam = `${Math.round(c.x)},${Math.round(c.y)},${Math.round(c.w)}`
  }, [])

  // the loop: a flight to a target, or the tail of a released drag, or nothing at all
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      const elapsed = Math.max(0.001, (now - last) / 1000)
      const dt = Math.min(MAX_DT, elapsed)
      last = now
      const goal = target.current
      if (goal) {
        const ease = reduced.current ? 1 : 1 - Math.exp(-EASE_PER_S * Math.min(MAX_FLIGHT_DT, elapsed))
        const next = {
          x: cam.current.x + (goal.x - cam.current.x) * ease,
          y: cam.current.y + (goal.y - cam.current.y) * ease,
          w: cam.current.w + (goal.w - cam.current.w) * ease,
        }
        if (Math.abs(goal.w - next.w) < 0.5 && Math.abs(goal.x - next.x) < 0.5 && Math.abs(goal.y - next.y) < 0.5) {
          cam.current = goal
          target.current = null
        } else {
          cam.current = next
        }
        still.current = false
      } else if (pointers.current.size === 0 && Math.hypot(velocity.current.x, velocity.current.y) > STILL) {
        cam.current = clampCam({ ...cam.current, x: cam.current.x + velocity.current.x * dt, y: cam.current.y + velocity.current.y * dt })
        const keep = Math.exp(-FRICTION_PER_S * dt)
        velocity.current = { x: velocity.current.x * keep, y: velocity.current.y * keep }
        still.current = false
      } else if (still.current) {
        return
      } else {
        still.current = true
      }
      paint()
      const u = unitsPerPx(cam.current.w)
      setUnit((was) => (Math.abs(was - u) / u > 0.015 ? u : was))
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [clampCam, paint, unitsPerPx])

  // the box changed (a rotation, a keyboard opening): re-clamp and repaint at once
  useEffect(() => {
    cam.current = clampCam(cam.current)
    paint()
    setUnit(unitsPerPx(cam.current.w))
  }, [clampCam, paint, size, unitsPerPx])

  // the reveal drives the camera from outside: whole city for a breath, then the push-in
  useEffect(() => {
    if (interactive) return
    target.current = clampCam(focus ? focusCam(focus) : FIT)
    still.current = false
  }, [clampCam, focus, focusCam, interactive, wide])

  const flyTo = useCallback(
    (next: Cam) => {
      velocity.current = { x: 0, y: 0 }
      target.current = clampCam(next)
      still.current = false
    },
    [clampCam],
  )

  /** zoom about one point on the glass, keeping whatever is under it under it */
  const zoomAt = useCallback(
    (factor: number, px: number, py: number) => {
      const c = target.current ?? cam.current
      const w = clamp(c.w * factor, MIN_W, MAX_W)
      const before = unitsPerPx(c.w)
      const after = unitsPerPx(w)
      // the point under (px,py) must not move: the offset from the glass centre scales with u
      const cx = c.x + c.w / 2 + (px - size.w / 2) * before
      const cy = c.y + c.w / 2 + (py - size.h / 2) * before
      const nx = cx - (px - size.w / 2) * after - w / 2
      const ny = cy - (py - size.h / 2) * after - w / 2
      target.current = null
      velocity.current = { x: 0, y: 0 }
      cam.current = clampCam({ x: nx, y: ny, w })
      still.current = false
    },
    [clampCam, size, unitsPerPx],
  )

  /** the glass, in map units — the inverse of the camera, and the only place it is written */
  const toMap = useCallback(
    (px: number, py: number) => {
      const c = cam.current
      const u = unitsPerPx(c.w)
      return { x: c.x + c.w / 2 + (px - size.w / 2) * u, y: c.y + c.w / 2 + (py - size.h / 2) * u, u }
    },
    [size, unitsPerPx],
  )

  /**
   * איזה סיכה נגעת בה — which open pin is under a finger, worked out from the geometry.
   *
   * It would be shorter to hang `onClick` on the pin's own group, and that is what the
   * first cut did: `map-pan-probe` then tapped the kiosk and the boy stayed in the street.
   * The wrapper takes `setPointerCapture` on every pointerdown so that a drag keeps
   * panning after the thumb leaves the box — and a captured pointer delivers its `click`
   * to the CAPTURING element, not to whatever is under it. The pin never heard the tap.
   * Capture is worth keeping and the tap is worth keeping, so the tap is resolved here:
   * the nearest open pin within the same 22 pixels the invisible target circle covers.
   */
  const pinAt = useCallback(
    (px: number, py: number): MapPlaceDef | null => {
      const point = toMap(px, py)
      const reach = 22 * point.u
      let best: { place: MapPlaceDef; d: number } | null = null
      for (const place of MAP_PLACES) {
        if (!isRevealed(state, place)) continue
        const door = place.scene ? reachable.get(place.scene) : undefined
        if (!door || door.here || door.lockedHe) continue
        const p = project(place.lat, place.lon)
        const d = Math.hypot(p.x - point.x, p.y - point.y)
        if (d <= reach && (!best || d < best.d)) best = { place, d }
      }
      return best?.place ?? null
    },
    [reachable, state, toMap],
  )

  const localPoint = (event: { clientX: number; clientY: number }) => {
    const rect = box.current?.getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }

  const onPointerDown = (event: React.PointerEvent) => {
    if (!interactive) return
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY, x0: event.clientX, y0: event.clientY, t: performance.now() })
    dragged.current = false
    velocity.current = { x: 0, y: 0 }
    target.current = null
    setHint(false)
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = {
        dist: Math.hypot(a!.x - b!.x, a!.y - b!.y),
        cx: (a!.x + b!.x) / 2,
        cy: (a!.y + b!.y) / 2,
      }
    }
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!interactive) return
    const was = pointers.current.get(event.pointerId)
    if (!was) return
    const now = performance.now()
    pointers.current.set(event.pointerId, { ...was, x: event.clientX, y: event.clientY, t: now })

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      const start = pinch.current
      if (start && dist > 0) {
        dragged.current = true
        const mid = localPoint({ clientX: (a!.x + b!.x) / 2, clientY: (a!.y + b!.y) / 2 })
        zoomAt(start.dist / dist, mid.x, mid.y)
        pinch.current = { dist, cx: mid.x, cy: mid.y }
      }
      return
    }

    const dx = event.clientX - was.x
    const dy = event.clientY - was.y
    // a tap on a pin wobbles a pixel or two; only a real drag may swallow the tap
    if (Math.hypot(event.clientX - was.x0, event.clientY - was.y0) > TAP_SLOP) dragged.current = true
    const u = unitsPerPx(cam.current.w)
    cam.current = clampCam({ ...cam.current, x: cam.current.x - dx * u, y: cam.current.y - dy * u })
    // map units per second, clamped: a phone that stalls for half a second between two
    // pointer moves would otherwise report a flick nobody made
    const seconds = Math.max(0.008, Math.min(0.12, (now - was.t) / 1000))
    velocity.current = { x: (-dx * u) / seconds, y: (-dy * u) / seconds }
    still.current = false
  }

  /**
   * A pointer that is captured and then lost — the finger left the screen at its edge, the
   * browser took the capture back, a probe moved the mouse outside the viewport — never
   * sends the `pointerup` the drag is waiting for. Without this the pointer stays in the
   * set forever, the momentum never runs again, and the NEXT press lands on the element
   * that still holds the capture instead of on the button under the finger. That is not
   * theoretical: it ate the first press of the fit button in `map-pan-probe`.
   */
  const onLostCapture = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  const onPointerUp = (event: React.PointerEvent) => {
    if (!interactive) return
    // `delete` answers whether this pointer was ever ours. A press on one of the controls
    // stops `pointerdown` from reaching this box but not `pointerup`, so without this test
    // letting go of the zoom button would be read as a tap on the city under it — and if a
    // pin happened to be under that button, the boy would walk there.
    const ours = pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (reduced.current) velocity.current = { x: 0, y: 0 }
    // a tap is not a fling: without this every pin tap threw the city a few hundred metres
    if (!ours || dragged.current || pointers.current.size > 0) return
    velocity.current = { x: 0, y: 0 }
    const p = localPoint(event)
    const place = pinAt(p.x, p.y)
    if (place?.scene && onGo) onGo(place.scene)
  }

  const onWheel = (event: React.WheelEvent) => {
    if (!interactive) return
    const p = localPoint(event)
    zoomAt(Math.exp(event.deltaY * 0.0015), p.x, p.y)
  }

  const toggleFit = () => {
    const next = !wideMode
    setWideMode(next)
    flyTo(next ? FIT : nearCam)
  }

  // --- what is printed at this zoom ---------------------------------------------------

  const side = unit * Math.min(size.w, size.h)

  /**
   * המילים שנכנסות — one greedy pass in screen pixels, highest rank first, and a name whose
   * box lands on a name already placed is simply not printed. Two candidate positions per
   * name (above the point, below it) before giving up, which is what stops the four pins
   * around the house from losing three of their names.
   */
  const printed = useMemo(() => {
    type Mark = { key: string; x: number; y: number; w: number; h: number }
    const taken: Mark[] = []
    const hits = (a: Mark) =>
      taken.some((b) => Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h)
    const place = (key: string, mx: number, my: number, text: string, size: number, offsets: number[]) => {
      const w = text.length * size * 0.58
      const h = size * 1.25
      for (const dy of offsets) {
        const mark = { key, x: mx / unit, y: my / unit + dy, w, h }
        if (!hits(mark)) {
          taken.push(mark)
          return dy
        }
      }
      return null
    }

    const pinNames = new Map<string, number>()
    const ranked = MAP_PLACES.filter((p) => isRevealed(state, p) || focus?.id === p.id).sort((a, b) => {
      const rank = (p: MapPlaceDef) => {
        if (herePlace?.id === p.id || focus?.id === p.id) return 0
        const door = p.scene ? reachable.get(p.scene) : undefined
        return door && !door.here && !door.lockedHe ? 1 : 2
      }
      return rank(a) - rank(b)
    })
    for (const p of ranked) {
      const point = project(p.lat, p.lon)
      const name = placeLabel(p, state).labelHe
      const dy = place(`pin:${p.id}`, point.x, point.y, name, 13, [-19, 26, -34])
      if (dy !== null) pinNames.set(p.id, dy)
    }

    const cityNames = new Set<string>()
    const tiers: { size: 'town' | 'sea' | 'hood' | 'spot'; px: number; when: boolean }[] = [
      { size: 'sea', px: 15, when: true },
      { size: 'town', px: 15, when: true },
      { size: 'hood', px: 11, when: side <= 900 },
      { size: 'spot', px: 9.5, when: side <= 430 },
    ]
    for (const tier of tiers) {
      if (!tier.when) continue
      for (const label of CITY_LABELS) {
        if (label.size !== tier.size) continue
        const point = project(label.lat, label.lon)
        if (place(`city:${label.labelHe}`, point.x, point.y, label.labelHe, tier.px, [4]) !== null) {
          cityNames.add(label.labelHe)
        }
      }
    }

    const streetNames = new Set<string>()
    for (const line of CITY_LINES) {
      if (!line.labelHe) continue
      const big = line.kind === 'river' || line.kind === 'highway' || line.kind === 'coast'
      if (!big && side > 640) continue
      const pts = line.points.map(([lat, lon]) => project(lat, lon))
      const mid = pts[Math.floor(pts.length / 2)]!
      if (place(`line:${line.id}`, mid.x, mid.y, line.labelHe, big ? 12 : 9.5, [-6, 12]) !== null) {
        streetNames.add(line.id)
      }
    }

    return { pinNames, cityNames, streetNames }
  }, [focus, herePlace, reachable, side, state, unit])

  // --- the drawing ---------------------------------------------------------------------

  const coast = CITY_LINES.find((line) => line.id === 'coast')!
  const coastPts = coast.points.map(([lat, lon]) => project(lat, lon))
  const seaPath = `M ${coastPts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} L 0 ${MAP_SIZE.h} L 0 0 Z`
  /**
   * החול — the beach, as the coast pushed 11 map units (about 100 metres) along its own
   * inland normal. It is a CONVENTION, not a survey: there is sand along nearly all of this
   * coast and rock at the Jaffa promontory, and one band says the first thing without
   * pretending to know where each stretch begins.
   */
  const sandPath = useMemo(() => {
    const inland = coastPts.map((p, i) => {
      const a = coastPts[Math.max(0, i - 1)]!
      const b = coastPts[Math.min(coastPts.length - 1, i + 1)]!
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
      // the normal that points away from the water, which on this coast is inland
      return { x: p.x + ((b.y - a.y) / len) * 11, y: p.y - ((b.x - a.x) / len) * 11 }
    })
    return `M ${coastPts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} L ${[...inland]
      .reverse()
      .map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' L ')} Z`
  }, [coastPts])

  const scale = useMemo(() => {
    for (const km of [5, 2, 1, 0.5, 0.25]) {
      const px = (km * KM) / unit
      if (px <= 96) return { km, px }
    }
    return { km: 0.25, px: (0.25 * KM) / unit }
  }, [unit])

  return (
    <div
      ref={box}
      className={`relative overflow-hidden bg-sheet ${interactive ? 'touch-none select-none' : 'pointer-events-none'} ${className ?? ''}`}
      data-life="city-map-box"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onLostCapture}
      onWheel={onWheel}
    >
      <svg
        ref={svg}
        viewBox={`${cam.current.x} ${cam.current.y} ${cam.current.w} ${cam.current.w}`}
        className="h-full w-full"
        role="img"
        aria-label={t('life.map.city')}
        data-life="city-map"
      >
        <defs>
          <pattern id="sea-hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform={`rotate(-20) scale(${unit.toFixed(3)})`}>
            <line x1="0" y1="7" x2="14" y2="7" stroke="rgb(var(--sign))" strokeOpacity="0.22" strokeWidth="1.4" />
          </pattern>
          <pattern id="paper-grid" width="50" height="50" patternUnits="userSpaceOnUse" patternTransform={`scale(${unit.toFixed(3)})`}>
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgb(var(--ink))" strokeOpacity="0.05" strokeWidth="1" />
          </pattern>
          <pattern id="park-stipple" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform={`scale(${unit.toFixed(3)})`}>
            <circle cx="2" cy="2" r="1.1" fill="rgb(var(--ink))" fillOpacity="0.22" />
          </pattern>
        </defs>

        {/* the water, the sand, and the city on top of both — the paper is the box's own ground */}
        <rect x="0" y="0" width={MAP_SIZE.w} height={MAP_SIZE.h} fill="url(#paper-grid)" />
        <path d={seaPath} fill="rgb(var(--sign))" fillOpacity="0.07" />
        <path d={seaPath} fill="url(#sea-hatch)" />
        <path d={sandPath} fill="rgb(var(--concrete))" fillOpacity="0.85" />

        {CITY_AREAS.map((area) => {
          // a quarter with no name on it is a bubble, not a neighbourhood: the tint arrives
          // with the label it belongs to. Parks and the old city read as themselves and stay.
          if (area.kind === 'quarter' && side > 900) return null
          const c = project(area.lat, area.lon)
          const edge = project(area.lat - area.dLat, area.lon + area.dLon)
          const rx = Math.abs(edge.x - c.x)
          const ry = Math.abs(edge.y - c.y)
          const park = area.kind === 'park'
          return (
            <g key={area.id}>
              <ellipse
                cx={c.x}
                cy={c.y}
                rx={rx}
                ry={ry}
                fill="rgb(var(--ink))"
                fillOpacity={park ? 0.05 : area.kind === 'oldcity' ? 0.12 : 0.06}
              />
              {park && <ellipse cx={c.x} cy={c.y} rx={rx} ry={ry} fill="url(#park-stipple)" />}
              <ellipse
                cx={c.x}
                cy={c.y}
                rx={rx}
                ry={ry}
                fill="none"
                stroke="rgb(var(--ink))"
                strokeOpacity="0.22"
                strokeWidth={unit}
                strokeDasharray={park ? undefined : `${(5 * unit).toFixed(1)} ${(4 * unit).toFixed(1)}`}
              />
            </g>
          )
        })}

        {CITY_LINES.map((line) => {
          const pts = line.points.map(([lat, lon]) => project(lat, lon))
          const d = `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}`
          const ink = line.kind === 'river' ? 'rgb(var(--sign))' : 'rgb(var(--ink))'
          const stroke =
            line.kind === 'coast' ? 2.2 : line.kind === 'river' ? 3.4 : line.kind === 'highway' ? 3 : line.kind === 'road' ? 1.7 : line.kind === 'mole' ? 2.4 : 1.1
          const opacity =
            line.kind === 'coast' ? 0.85 : line.kind === 'river' ? 0.5 : line.kind === 'highway' ? 0.5 : line.kind === 'walk' ? 0.35 : line.kind === 'mole' ? 0.6 : 0.34
          const dash = line.kind === 'highway' ? [9, 5] : line.kind === 'walk' ? [2, 3] : undefined
          return (
            <path
              key={line.id}
              d={d}
              fill="none"
              stroke={ink}
              strokeOpacity={opacity}
              strokeWidth={stroke * unit}
              strokeDasharray={dash ? dash.map((n) => (n * unit).toFixed(1)).join(' ') : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        })}

        {/* the street names — same counter-scale as everything else that is read, not drawn */}
        {CITY_LINES.map((line) => {
          if (!line.labelHe || !printed.streetNames.has(line.id)) return null
          const pts = line.points.map(([lat, lon]) => project(lat, lon))
          const mid = pts[Math.floor(pts.length / 2)]!
          const big = line.kind === 'river' || line.kind === 'highway' || line.kind === 'coast'
          return (
            <g key={`name-${line.id}`} transform={`translate(${mid.x.toFixed(1)} ${mid.y.toFixed(1)}) scale(${unit.toFixed(4)})`}>
              <text
                x="0"
                y="-6"
                fontSize={big ? 12 : 9.5}
                fill={line.kind === 'river' ? 'rgb(var(--sign))' : 'rgb(var(--ink))'}
                fillOpacity={big ? 0.6 : 0.55}
                fontFamily="var(--font-heebo)"
                textAnchor="middle"
                direction="rtl"
                stroke="rgb(var(--sheet))"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {line.labelHe}
              </text>
            </g>
          )
        })}

        {CITY_LABELS.map((label) => {
          if (!printed.cityNames.has(label.labelHe)) return null
          const p = project(label.lat, label.lon)
          const town = label.size === 'town'
          const sea = label.size === 'sea'
          return (
            <g key={label.labelHe} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${unit.toFixed(4)})`}>
              <text
                x="0"
                y="4"
                textAnchor="middle"
                direction="rtl"
                fontFamily={town || sea ? 'var(--font-miriam)' : 'var(--font-heebo)'}
                fontSize={town || sea ? 15 : label.size === 'hood' ? 11 : 9.5}
                fontWeight={town ? 700 : 400}
                fill={sea ? 'rgb(var(--sign))' : 'rgb(var(--ink))'}
                fillOpacity={town ? 0.78 : sea ? 0.5 : label.size === 'hood' ? 0.55 : 0.45}
                stroke="rgb(var(--sheet))"
                strokeWidth={town ? 3.5 : 2.5}
                strokeOpacity={sea ? 0 : 0.8}
                paintOrder="stroke"
                // לא — 6.9.2026: Maor found "יפו" printed as "ופי" on his phone. `letterSpacing`
                // on RTL SVG text is a known WebKit fault — it inserts the tracking before
                // re-running bidi, and a short RTL string comes out mirrored whole. The extra
                // tracking on a town's name was never worth this; every label here is
                // untracked now, and `tests/life-map.test.ts` keeps it that way.
              >
                {label.labelHe}
              </text>
            </g>
          )
        })}

        {/* the pins — only what the life has reached */}
        {MAP_PLACES.map((place) => {
          const shown = isRevealed(state, place) || focus?.id === place.id
          if (!shown) return null
          const p = project(place.lat, place.lon)
          const isHere = herePlace?.id === place.id
          const name = placeLabel(place, state)
          const door = place.scene ? reachable.get(place.scene) : undefined
          const open = Boolean(door && !door.here && !door.lockedHe)
          const dim = !open && !isHere
          const dropped = dropping && focus?.id === place.id
          const nameDy = printed.pinNames.get(place.id)
          const shut = door?.lockedHe ?? null
          const cost = door && !door.here && !door.lockedHe ? t('life.map.minutesAt', { n: String(door.minutes) }) : null
          const sub = isHere ? t('life.map.here') : (shut ?? cost ?? (side <= 700 ? name.subHe : ''))
          return (
            <g
              key={place.id}
              data-life="map-pin"
              data-place={place.id}
              transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${unit.toFixed(4)})`}
              className={open ? 'cursor-pointer' : undefined}
            >
              <g style={dropped ? { animation: 'land 520ms var(--ease-stamp) 900ms both', transformBox: 'fill-box', transformOrigin: 'center' } : undefined}>
                {isHere && (
                  <circle cx="0" cy="0" r="14" fill="none" stroke="rgb(var(--red))" strokeWidth="1.6">
                    <animate attributeName="r" values="9;19;9" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values=".9;0;.9" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* a big tap target, invisible — 44px across at every zoom */}
                <circle cx="0" cy="0" r="22" fill="transparent" />
                <circle cx="0" cy="0" r="7" fill={dim ? 'rgb(var(--concrete))' : 'rgb(var(--red))'} stroke="rgb(var(--sheet))" strokeWidth="2.2" />
                <circle cx="0" cy="0" r="7" fill="none" stroke="rgb(var(--ink))" strokeWidth="0.9" />
                {nameDy !== undefined && (
                  <text
                    x="0"
                    y={nameDy}
                    textAnchor="middle"
                    direction="rtl"
                    fontFamily="var(--font-frank)"
                    fontWeight="700"
                    fontSize="13"
                    fill="rgb(var(--ink))"
                    stroke="rgb(var(--sheet))"
                    strokeWidth="3"
                    paintOrder="stroke"
                  >
                    {name.labelHe}
                  </text>
                )}
                {/*
                  המשנה — the line the map keeps under the name. A shut door says so in the
                  door's own words, an open one says what the walk costs, and where neither
                  applies it is the biography: which gate this Pugi stands at, whether the
                  hall became home, what he did at that kiosk.
                */}
                {nameDy !== undefined && sub && (
                  <text
                    x="0"
                    y={nameDy < 0 ? 15 : -8}
                    textAnchor="middle"
                    direction="rtl"
                    fontFamily="var(--font-courier)"
                    fontSize="10"
                    fill={isHere || shut ? 'rgb(var(--red))' : dim ? 'rgb(var(--muted))' : 'rgb(var(--ink))'}
                    stroke="rgb(var(--sheet))"
                    strokeWidth="2.6"
                    paintOrder="stroke"
                    opacity="0.9"
                  >
                    {sub}
                  </text>
                )}
              </g>
            </g>
          )
        })}
      </svg>

      {interactive && (
        <>
          {/* the printer's furniture: which way is north, and how far a centimetre is */}
          <div className="pointer-events-none absolute top-2 flex flex-col items-center gap-0.5" style={{ insetInlineEnd: 8 }}>
            <svg viewBox="0 0 16 22" className="h-[22px] w-4" aria-hidden="true">
              <path d="M8 1 L13 20 L8 15 L3 20 Z" fill="rgb(var(--ink))" fillOpacity="0.5" />
            </svg>
            <span className="border-hair border-ink/25 bg-sheet/90 px-1 font-body text-[9px] leading-none text-ink/50">{t('life.map.north')}</span>
          </div>
          <div className="pointer-events-none absolute bottom-2 flex flex-col items-center gap-1 border-hair border-ink/25 bg-sheet/90 px-1.5 py-1" style={{ insetInlineEnd: 8 }}>
            <span className="block h-[5px] border-x-hair border-b-hair border-ink/60" style={{ width: Math.round(scale.px) }} aria-hidden="true" />
            <span className="font-mono tabular-nums text-[9px] leading-none text-ink/60" data-life="map-scale">
              {scale.km >= 1 ? t('life.map.km', { n: String(scale.km) }) : t('life.map.m', { n: String(scale.km * 1000) })}
            </span>
          </div>

          <div className="absolute top-2 flex flex-col" style={{ insetInlineStart: 8 }} onPointerDown={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => zoomAt(0.62, size.w / 2, size.h / 2)}
              data-life="map-zoom-in"
              aria-label={t('life.map.zoomIn')}
              className="flex min-h-tap w-12 items-center justify-center border-hair border-ink bg-sheet/95 text-ink active:bg-red active:text-sheet"
            >
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M10 2 V18 M2 10 H18" stroke="currentColor" strokeWidth="2.4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => zoomAt(1 / 0.62, size.w / 2, size.h / 2)}
              data-life="map-zoom-out"
              aria-label={t('life.map.zoomOut')}
              className="flex min-h-tap w-12 items-center justify-center border-hair border-t-0 border-ink bg-sheet/95 text-ink active:bg-red active:text-sheet"
            >
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M2 10 H18" stroke="currentColor" strokeWidth="2.4" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFit}
            data-life="map-wide"
            className="absolute bottom-2 flex min-h-tap items-center border-hair border-ink bg-sheet/95 px-3 font-body text-[11px] text-ink active:bg-red active:text-sheet"
            style={{ insetInlineStart: 8 }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {wideMode ? t('life.map.near') : t('life.map.city')}
          </button>

          {hint && (
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
              <span data-life="map-hint" className="animate-plate-in border-hair border-ink/40 bg-sheet/95 px-2.5 py-1 font-body text-[10px] leading-none text-muted">
                {t('life.map.hint')}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

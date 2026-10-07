'use client'
/**
 * LIFE, universal — the city as a standing model.
 *
 * The drawing lives in `lib/life/universal/iso.ts`; this component decides which districts stand
 * in the light. A district is lit once the supporter has stood in one of its rooms; the filler
 * blocks around it (towers, park, mall) are lit when a lit district is next to them, so the city
 * has a real size from the first chapter and opens as the life does. The camera is a viewBox that
 * eases towards the lit part of the board and can be dragged. Colours come from the club's tokens.
 */
import {useEffect, useId, useMemo, useRef, useState} from 'react'
import type {RoomId} from '@/lib/life/universal/types'
import type {Place} from '@/lib/life/universal/city'
import {BOARD, FALLBACK_CLUB, P, SKY, WINDOW, boxOf, buildIso, centreOf, isoKey, type District} from '@/lib/life/universal/iso'
import styles from './life.module.css'

const DISTRICT_OF: Record<string, District> = {
  bedroom: 'home', kitchen: 'home', room: 'home', street: 'street', route: 'plaza', pitch: 'pitch', workshop: 'work',
  schoolyard: 'school', classroom: 'school', 'bus-stop': 'bus', 'bus-station': 'bus', gate: 'stadium', tunnel: 'stadium', terrace: 'stadium',
  'away-end': 'away', 'flat-abroad': 'abroad',
}
const SLOT: [number, number][] = [[-1.1, -.8], [.9, -.4], [-.2, 1.1], [1.2, 1], [-1.3, .9]]
const hexOf = (css: string): string => {
  const m = /rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(css)
  if (m) return `#${[m[1], m[2], m[3]].map(v => Number(v).toString(16).padStart(2, '0')).join('')}`
  return /^#[0-9a-f]{6}$/i.test(css.trim()) ? css.trim() : FALLBACK_CLUB
}

export type IsoProps = {places: Place[]; pick: string | null; onPick: (id: string) => void; night: boolean; clubId: string; label: string; trip: {stops: RoomId[]; ms: number} | null; unknown: string; story: {lang?: string; dir?: 'ltr'}}

export function IsoBoard({places, pick, onPick, night, clubId, label, trip, unknown, story}: IsoProps) {
  const uid = 'iso' + useId().replace(/:/g, '')
  const host = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [club, setClub] = useState(FALLBACK_CLUB)
  useEffect(() => { if (host.current) setClub(hexOf(getComputedStyle(host.current).getPropertyValue('--club-primary') || getComputedStyle(host.current).color)) }, [])
  const iso = useMemo(() => buildIso(club, [...clubId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)), [club, clubId])

  const placed = places.map(p => {
    const k = DISTRICT_OF[p.id] ?? 'street'
    const same = places.filter(q => (DISTRICT_OF[q.id] ?? 'street') === k)
    const [cx, cy] = centreOf(k), [dx, dy] = SLOT[same.indexOf(p) % SLOT.length]!
    return {p, k, xy: P(cx + dx, cy + dy, 2), }
  })
  const litStory = new Set(places.filter(p => p.status === 'here' || p.status === 'seen').map(p => DISTRICT_OF[p.id] ?? 'street'))
  const lit = BOARD.filter(b => {
    if (litStory.has(b.k)) return true
    if (Object.values(DISTRICT_OF).includes(b.k)) return false
    return BOARD.some(o => litStory.has(o.k) && Math.abs(o.bi - b.bi) + Math.abs(o.bj - b.bj) <= 2)
  })
  const litKeys = lit.map(b => b.k + b.bi + b.bj), dark = BOARD.filter(b => !litKeys.includes(b.k + b.bi + b.bj)).map(b => b.k + b.bi + b.bj)
  const rules = [
    `#${uid} .obj,#${uid} .fog{transition:opacity .9s ease,transform 1.3s ease}`,
    `#${uid} .pin{transition:opacity .6s ease}`,
    ...dark.map(k => `#${uid} .obj[data-k="${k}"]{opacity:0;transform:translateY(-30px)}#${uid} .tile[data-k="${k}"]{filter:grayscale(.9) brightness(1.08) opacity(.8)}`),
    ...litKeys.map(k => `#${uid} .fog[data-k="${k}"]{opacity:0;transform:translateY(-34px);pointer-events:none}`),
    `#${uid} .w1{fill:${WINDOW[night ? 'night' : 'day'][0]}}#${uid} .w2{fill:${WINDOW[night ? 'night' : 'day'][1]}}`,
    `@media (prefers-reduced-motion:reduce){#${uid} *{transition:none!important}}`,
  ].join('')

  /* the camera: ease towards the lit part of the board; a drag shifts it */
  const cam = useRef({x: 0, y: 0, w: 900, h: 620, tx: 0, ty: 0, tw: 900, th: 620, px: 0, py: 0, snap: true})
  const target = () => {
    const el = host.current, asp = el ? el.clientWidth / Math.max(1, el.clientHeight) : 1.4, c = cam.current
    const here = places.find(p => p.status === 'here'), hk = here ? DISTRICT_OF[here.id] : undefined
    const keys = lit.map(b => b.k)
    const bb = boxOf(keys), pad = 22
    let w = bb.maxx - bb.minx + pad * 2, h = bb.maxy - bb.miny + pad * 2
    if (w / h < asp) w = h * asp; else h = w / asp
    w = Math.max(w, asp < 1.1 ? 230 : 300); h = w / asp
    let cx = (bb.minx + bb.maxx) / 2, cy = (bb.miny + bb.maxy) / 2 + 10
    if (hk) { const hp = P(...centreOf(hk)); if (asp < 1.1) { w = 340; h = w / asp; cx = hp[0] + 20; cy = hp[1] - 10 } else { cx = (cx + hp[0]) / 2; cy = (cy + hp[1]) / 2 } }
    c.tx = cx - w / 2; c.ty = cy - h / 2; c.tw = w; c.th = h; c.px = 0; c.py = 0
  }
  const litSig = litKeys.join()
  useEffect(() => { target() }, [litSig]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const c = cam.current, reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target(); c.x = c.tx; c.y = c.ty; c.w = c.tw; c.h = c.th
    let raf = 0
    const tick = () => {
      const k = reduce ? 1 : .12
      c.x += (c.tx + c.px - c.x) * k; c.y += (c.ty + c.py - c.y) * k; c.w += (c.tw - c.w) * k; c.h += (c.th - c.h) * k
      svg.current?.setAttribute('viewBox', `${c.x.toFixed(1)} ${c.y.toFixed(1)} ${c.w.toFixed(1)} ${c.h.toFixed(1)}`)
      raf = requestAnimationFrame(tick)
    }
    tick()
    const ro = new ResizeObserver(() => target()); if (host.current) ro.observe(host.current)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const drag = useRef<{x: number; y: number; px: number; py: number; moved: boolean} | null>(null)

  /* the walk: a dotted line down the roads between the districts he passes */
  const routeD = useMemo(() => {
    if (!trip) return null
    const ks = trip.stops.map(id => DISTRICT_OF[id] ?? 'street'), segs: string[] = []
    for (let i = 1; i < ks.length; i++) if (ks[i] !== ks[i - 1]) segs.push(iso.road(ks[i - 1]!, ks[i]!))
    if (!segs.length) return null
    return segs.map((s, i) => (i ? s.replace(/^M/, 'L') : s)).join(' ')
  }, [trip, iso])

  return (
    <div ref={host} className={styles.isoStage} data-night={night ? 'true' : 'false'} id={uid}
      onPointerDown={e => { drag.current = {x: e.clientX, y: e.clientY, px: cam.current.px, py: cam.current.py, moved: false} }}
      onPointerMove={e => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (!d.moved && Math.hypot(dx, dy) < 6) return; d.moved = true; e.currentTarget.setPointerCapture(e.pointerId); const k = cam.current.w / (host.current?.clientWidth || 1); cam.current.px = d.px - dx * k; cam.current.py = d.py - dy * k }}
      onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
      <style>{rules}</style>
      <svg ref={svg} className={styles.isoSvg} role="group" aria-label={label} viewBox="0 0 900 620" preserveAspectRatio="xMidYMid slice">
        <defs><linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={SKY[night ? 'night' : 'day'][0]} /><stop offset="1" stopColor={SKY[night ? 'night' : 'day'][1]} /></linearGradient></defs>
        <rect x="-3000" y="-3000" width="7000" height="7000" fill={`url(#${uid}s)`} />
        <g style={{filter: night ? 'brightness(.62) saturate(.85)' : undefined, transition: 'filter 1s ease'}}>
          <g dangerouslySetInnerHTML={{__html: iso.sky}} />
          <g dangerouslySetInnerHTML={{__html: iso.html}} />
        </g>
        {routeD && <g aria-hidden="true" data-life="map-trip"><path d={routeD} className={styles.isoRouteBase} /><path d={routeD} pathLength={1} className={styles.isoRoute} strokeDasharray="1" strokeDashoffset="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur={`${trip!.ms}ms`} fill="freeze" /></path><circle r="5" className={styles.isoDot}><animateMotion dur={`${trip!.ms}ms`} fill="freeze" path={routeD} /></circle></g>}
        {placed.filter(x => x.p.status !== 'hidden').map(({p, xy}) => {
          const known = p.status === 'known', sel = pick === p.id, here = p.status === 'here'
          return (
            <g key={p.id} className={`pin min-h-tap ${styles.isoPin}`} data-status={p.status} data-selected={sel ? 'true' : 'false'} data-place={p.id} data-kind={p.kind} data-goal={p.goal ? 'true' : 'false'}
              role="button" tabIndex={0} aria-pressed={sel} aria-label={known ? unknown : p.name}
              onClick={() => { if (!drag.current?.moved) onPick(p.id) }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(p.id) } }}>
              {here && <circle cx={xy[0]} cy={xy[1]} r="9" className={styles.isoYou}><animate attributeName="r" values="7;14;7" dur="1.8s" repeatCount="indefinite" /></circle>}
              <circle cx={xy[0]} cy={xy[1] - 6} r="19" fill="transparent" />
              <path d={`M${xy[0]},${xy[1] + 4} c-9,-9 -9,-20 0,-20 c9,0 9,11 0,20z`} className={styles.isoPinBody} />
              <circle cx={xy[0]} cy={xy[1] - 12} r="2.8" className={styles.isoPinEye} />
              {p.offers.length > 0 && <circle cx={xy[0] + 8} cy={xy[1] - 17} r="3" className={styles.isoOffer} />}
              {p.goal && <path d={`M${xy[0] - 4},${xy[1] - 30} l4,6 l4,-6z`} className={styles.isoGoal}><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="1.3s" repeatCount="indefinite" /></path>}
              <text x={xy[0]} y={xy[1] + 14} textAnchor="middle" className={styles.isoLabel} {...(known ? {} : story)}>{known ? unknown : p.name}</text>
              <title>{known ? unknown : p.name}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
export {isoKey}

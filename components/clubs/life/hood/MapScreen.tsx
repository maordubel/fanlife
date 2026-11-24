'use client'
/**
 * LIFE · the game — the district map, edge to edge: the neighbourhood drawn from above (`MapWorld`), pan and pinch and wheel with a
 * little inertia, lettered pins, a route drawn along the streets to the waypoint, a sheet that slides over for the picked place.
 * Setting a waypoint only points the HUD arrow; nothing ever walks for him.
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {clockText} from '@/lib/life/hood/shell'
import {districtModel, routeTo} from '@/lib/life/hood/district'
import type {HoodRun} from '@/lib/life/hood/run'
import type {PlaceId} from '@/lib/life/hood/types'
import {Icon} from './Icons'
import {MapWorld, type MapAerial} from './MapWorld'
import css from './hood.module.css'

type W = (k: string, extra?: Record<string, string>) => string
type View = {cx: number; cy: number; s: number}
const MAX_S = 11

/** a small drawn picture for the sheet, one per place */
function PlaceArt({id}: {id: PlaceId}) {
  return (
    <svg viewBox="0 0 120 64" className={css.lgArt} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <rect width="120" height="64" className={css.lgArtSky} /><rect y="46" width="120" height="18" className={css.lgArtGround} />
      {id === 'home' && <g><rect x="34" y="16" width="52" height="34" className={css.lgMRoof0} /><rect x="34" y="14" width="52" height="5" className={css.lgMWall} /><rect x="54" y="30" width="12" height="20" className={css.lgMVent} /><rect x="40" y="26" width="9" height="9" className={css.lgMWin} /><rect x="71" y="26" width="9" height="9" className={css.lgMWin} /></g>}
      {id === 'kiosk' && <g><rect x="38" y="24" width="44" height="26" className={css.lgMWall} />{Array.from({length: 6}, (_, i) => <rect key={i} x={34 + i * 8.7} y="18" width="8.7" height="9" className={i % 2 ? css.lgMAw1 : css.lgMAw0} />)}<rect x="44" y="32" width="32" height="10" className={css.lgMWin} /></g>}
      {id === 'corner' && <g><rect x="58" y="12" width="3" height="38" className={css.lgMVent} /><circle cx="59.5" cy="12" r="14" fill="url(#lgGlowL)" className={css.lgMLamp} /><rect x="76" y="40" width="20" height="4" className={css.lgMVent} /><rect x="22" y="30" width="26" height="20" className={css.lgMRoof3} /></g>}
      {id === 'school' && <g><rect x="24" y="22" width="72" height="28" className={css.lgMRoof3} /><rect x="24" y="20" width="72" height="4" className={css.lgMWall} />{[0, 1, 2, 3, 4].map(i => <rect key={i} x={32 + i * 13} y="30" width="7" height="8" className={css.lgMWin} />)}<line x1="100" x2="100" y1="14" y2="50" className={css.lgMFlag} /></g>}
      {id === 'pitch' && <g><rect x="20" y="22" width="80" height="26" className={css.lgMGrass} /><g className={css.lgMLine}><rect x="23" y="25" width="74" height="20" /><line x1="60" x2="60" y1="25" y2="45" /><circle cx="60" cy="35" r="5" /></g></g>}
      {id === 'ground' && <g><path d="M10 50V30q0-12 14-12h72q14 0 14 12v20z" className={css.lgMBowl} /><path d="M18 50V32q0-8 10-8h64q10 0 10 8v18z" className={css.lgMSeats2} /><rect x="26" y="34" width="68" height="16" className={css.lgMGrass} /><line x1="14" x2="14" y1="6" y2="30" className={css.lgMVent} /><line x1="106" x2="106" y1="6" y2="30" className={css.lgMVent} /><circle cx="14" cy="8" r="9" fill="url(#lgGlowF)" className={css.lgMFlood} /><circle cx="106" cy="8" r="9" fill="url(#lgGlowF)" className={css.lgMFlood} /></g>}
    </svg>
  )
}

/** a person to mark on the map: who gives the next mission (filled) or a small job (hollow) */
export type MapGiver = {id: string; x: number; z: number; kind: 'main' | 'side'; label: string; letter: string}

export function MapScreen({w, run, waypoint, wayLabel, onWaypoint, onClose, onTab, accent, mapKey, reduced, givers = [], aerial = null}: {w: W; run: HoodRun; waypoint: PlaceId | null; wayLabel: string; onWaypoint: (id: PlaceId | null) => void; onClose: () => void; onTab: () => void; accent: string; mapKey: number; reduced: boolean; givers?: MapGiver[]; aerial?: MapAerial | null}) {
  const level = run.level
  const model = useMemo(() => districtModel(level, run), [level, run, mapKey])  // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState<PlaceId | null>(waypoint)
  const box = useRef<HTMLDivElement | null>(null)
  const [dim, setDim] = useState({w: 390, h: 844})
  const dimRef = useRef(dim)
  const b = model.bounds
  const vr = useRef<View>({cx: run.sim.x, cy: run.sim.z - 16, s: 3.4})
  const [view, setViewState] = useState<View>(vr.current)
  const inertia = useRef({vx: 0, vy: 0, raf: 0})
  const ptrs = useRef(new Map<number, {x: number; y: number}>())
  const gest = useRef<{x0: number; y0: number; t0: number; moved: boolean; pinch: number}>({x0: 0, y0: 0, t0: 0, moved: false, pinch: 0})

  const limits = useCallback(() => ({minS: Math.max(1.3, Math.min(dimRef.current.w / (b.w + 70), dimRef.current.h / (b.h + 50))), maxS: MAX_S}), [b])
  const setView = useCallback((v: View) => {
    const {minS, maxS} = limits()
    const s = Math.max(minS, Math.min(maxS, v.s))
    const cx = Math.max(b.x - 10, Math.min(b.x + b.w + 10, v.cx)), cy = Math.max(b.y - 10, Math.min(b.y + b.h + 10, v.cy))
    vr.current = {cx, cy, s}; setViewState(vr.current)
  }, [b, limits])
  useEffect(() => {
    const el = box.current; if (!el) return
    const f = () => { const d = {w: el.clientWidth || 390, h: el.clientHeight || 844}; dimRef.current = d; setDim(d); setView(vr.current) }
    f(); const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(f) : null; ro?.observe(el)
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect(), v = vr.current, k = Math.exp(-e.deltaY * 0.0015), s2 = v.s * k
      const wx = v.cx + (e.clientX - r.left - dimRef.current.w / 2) / v.s, wy = v.cy + (e.clientY - r.top - dimRef.current.h / 2) / v.s
      setView({s: s2, cx: wx - (e.clientX - r.left - dimRef.current.w / 2) / s2, cy: wy - (e.clientY - r.top - dimRef.current.h / 2) / s2})
    }
    el.addEventListener('wheel', wheel, {passive: false})
    return () => { ro?.disconnect(); el.removeEventListener('wheel', wheel); cancelAnimationFrame(inertia.current.raf) }
  }, [setView])

  const toScreen = (x: number, y: number) => ({x: dim.w / 2 + (x - view.cx) * view.s, y: dim.h / 2 + (y - view.cy) * view.s})
  const pinPos = (p: {x: number; y: number}) => toScreen(p.x, p.y)
  const pinLetter = (id: PlaceId) => w(`hood.pin.${id}`)

  const onDown = (e: React.PointerEvent) => {
    cancelAnimationFrame(inertia.current.raf)
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    ptrs.current.set(e.pointerId, {x: e.clientX, y: e.clientY})
    if (ptrs.current.size === 1) gest.current = {x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false, pinch: 0}
    else { const [a, c] = [...ptrs.current.values()]; gest.current.pinch = Math.hypot(a!.x - c!.x, a!.y - c!.y); gest.current.moved = true }
  }
  const onMove = (e: React.PointerEvent) => {
    const p = ptrs.current.get(e.pointerId); if (!p) return
    const dx = e.clientX - p.x, dy = e.clientY - p.y
    p.x = e.clientX; p.y = e.clientY
    const v = vr.current
    if (ptrs.current.size >= 2) {
      const [a, c] = [...ptrs.current.values()], d = Math.hypot(a!.x - c!.x, a!.y - c!.y)
      if (gest.current.pinch > 0) setView({...v, s: v.s * (d / gest.current.pinch), cx: v.cx - dx / 2 / v.s, cy: v.cy - dy / 2 / v.s})
      gest.current.pinch = d; return
    }
    if (!gest.current.moved && Math.hypot(e.clientX - gest.current.x0, e.clientY - gest.current.y0) < 6) return
    gest.current.moved = true
    inertia.current.vx = dx / v.s * 0.6 + inertia.current.vx * 0.4; inertia.current.vy = dy / v.s * 0.6 + inertia.current.vy * 0.4
    setView({...v, cx: v.cx - dx / v.s, cy: v.cy - dy / v.s})
  }
  const onUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId)
    const g = gest.current
    if (ptrs.current.size > 0) return
    if (!g.moved && performance.now() - g.t0 < 500) {
      const r = box.current!.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top
      let best: PlaceId | null = null, bd = 30
      for (const p of model.places) { const s = pinPos(p), d = Math.hypot(s.x - px, s.y - py); if (d < bd) { bd = d; best = p.id } }
      if (best) setSel(best); else setSel(null)
      return
    }
    if (reduced) return
    const run0 = inertia.current
    const tick = () => { run0.vx *= 0.93; run0.vy *= 0.93; if (Math.hypot(run0.vx, run0.vy) < 0.02) return; const v = vr.current; setView({...v, cx: v.cx - run0.vx, cy: v.cy - run0.vy}); run0.raf = requestAnimationFrame(tick) }
    run0.raf = requestAnimationFrame(tick)
  }
  const zoomBy = (k: number) => { const v = vr.current; setView({...v, s: v.s * k}) }
  const focus = (id: PlaceId) => { setSel(id); const p = model.places.find(q => q.id === id); if (p) setView({cx: p.x, cy: p.y + 8, s: Math.max(vr.current.s, 4)}) }

  const place = model.places.find(p => p.id === sel) ?? null
  const dist = place ? Math.round(Math.hypot(place.x - run.sim.x, place.y - run.sim.z)) : 0
  const isWay = !!place && waypoint === place.id
  const wp = waypoint ? model.places.find(p => p.id === waypoint) ?? null : null
  const route = wp ? routeTo(level, {x: run.sim.x, z: run.sim.z}, {x: wp.x, z: wp.y}) : null
  const school = model.places.find(p => p.id === 'school') ?? null
  const me = toScreen(run.sim.x, run.sim.z)
  const showLabels = view.s >= 3.3
  // the scale bar: the nearest of 20 / 50 / 100 m that fits in a quarter of the width
  const barM = [100, 50, 20, 10].find(m => m * view.s <= dim.w * 0.28) ?? 10
  const tf = `translate(${dim.w / 2 - view.cx * view.s} ${dim.h / 2 - view.cy * view.s}) scale(${view.s})`

  return (
    <section className={css.lgMapFull} aria-label={w('hood.map.title')} data-life="hood-map" data-reduced={reduced}>
      <div ref={box} className={css.lgMapView} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={e => { ptrs.current.delete(e.pointerId) }}>
        <svg className={css.lgMapSvg} width={dim.w} height={dim.h} viewBox={`0 0 ${dim.w} ${dim.h}`} role="img" aria-label={w('hood.map.aria')}>
          <g transform={tf}>
            <MapWorld model={model} seed={level.seed} crossings={level.crossings} half={level.half} walk={level.walk} accent={accent} schoolAt={school ? {x: school.x, y: school.y} : null} aerial={aerial} />
            {route && route.length > 1 && <g><polyline points={route.map(p => `${p.x},${p.z}`).join(' ')} className={css.lgMRouteCase} style={{strokeWidth: 3.4 / view.s * 2.2}} /><polyline points={route.map(p => `${p.x},${p.z}`).join(' ')} className={css.lgMRoute} style={{stroke: accent, strokeWidth: 2 / view.s * 2.2, strokeDasharray: `${9 / view.s * 2.2} ${6 / view.s * 2.2}`}} /></g>}
          </g>
          {/* screen-space: pins and you */}
          {model.places.map(p => {
            const s = pinPos(p), on = sel === p.id, way = waypoint === p.id
            if (s.x < -40 || s.x > dim.w + 40 || s.y < -40 || s.y > dim.h + 40) return null
            return (
              <g key={p.id} transform={`translate(${s.x} ${s.y})`} className={css.lgPin} data-on={on} data-way={way} tabIndex={0} role="button" aria-label={w(p.key)} aria-pressed={on} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focus(p.id) } }}>
                {p.job && <circle r={22} className={css.lgPinPulse} style={{stroke: accent}} />}
                <ellipse cx={0} cy={19} rx={9} ry={3} className={css.lgMShadow} />
                <circle r={on ? 19 : 16} className={css.lgPinBody} style={on || way ? {fill: accent} : undefined} />
                <text y={5.5} textAnchor="middle" className={css.lgPinText} data-on={on || way}>{pinLetter(p.id)}</text>
                {(on || way || showLabels) && <g transform="translate(0 34)"><rect x={-w(p.key).length * 3.6 - 9} y={-11} width={w(p.key).length * 7.2 + 18} height={22} rx={11} className={css.lgPinTag} /><text y={4.5} textAnchor="middle" className={css.lgPinTagText}>{w(p.key)}</text></g>}
              </g>
            )
          })}
          {givers.map(g => {
            const s = toScreen(g.x, g.z)
            if (s.x < -30 || s.x > dim.w + 30 || s.y < -30 || s.y > dim.h + 30) return null
            return (
              <g key={`${g.kind}-${g.id}`} transform={`translate(${s.x} ${s.y - 26})`} className={css.lgGiver} data-kind={g.kind} role="img" aria-label={g.label}>
                {g.kind === 'main' && <circle r={20} className={css.lgPinPulse} style={{stroke: accent}} />}
                <circle r={g.kind === 'main' ? 12 : 9} style={g.kind === 'main' ? {fill: accent, stroke: accent} : {fill: 'transparent', stroke: accent}} />
                <text y={4.5} textAnchor="middle">{g.letter}</text>
              </g>
            )
          })}
          <g transform={`translate(${me.x} ${me.y})`} aria-hidden="true">
            <circle r={26} className={css.lgYouPulse} style={{stroke: accent, fill: accent}} />
            <g transform={`rotate(${180 - (run.sim.heading * 180) / Math.PI})`}><path d="M0 -15 L10 11 L0 5.5 L-10 11 Z" className={css.lgYouArrow} style={{fill: accent}} /></g>
          </g>
        </svg>
        <div className={css.lgVignette} /><div className={css.lgGrain} />
        <div className={css.lgCompass} aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" className={css.lgCompassRing} /><path d="M20 6l5 14h-10z" style={{fill: accent}} /><path d="M20 34l-5-14h10z" className={css.lgCompassS} /></svg><b>{w('hood.map.north')}</b></div>
        <div className={css.lgScale} aria-hidden="true"><i style={{inlineSize: barM * view.s}} /><span>{w('hood.map.scale', {m: String(barM)})}</span></div>
      </div>
      <div className={css.lgMapTop}>
        <div className={css.lgGlass + ' ' + css.lgMapHeader}>
          <button type="button" className={css.lgIconBtn} aria-label={w('hood.back')} onClick={onClose}><Icon n="back" /></button>
          <div className={css.lgMapTitle}><small>{w('hood.map.kicker')}</small><h1>{w('hood.map.title')}</h1></div>
          <div className={css.lgTabs}><button type="button" className={css.lgTab} aria-current="true">{w('hood.pause.map')}</button><button type="button" className={css.lgTab} onClick={onTab}>{w('hood.pause.bag')}</button></div>
        </div>
        <div className={css.lgMapChips} role="group" aria-label={w('hood.map.places')}>
          {model.places.map(p => <button key={p.id} type="button" className={css.lgChip + ' ' + css.lgGlass} aria-pressed={sel === p.id} data-way={waypoint === p.id} onClick={() => focus(p.id)}>{w(p.key)}</button>)}
        </div>
      </div>
      <div className={css.lgMapTools}>
        <button type="button" className={css.lgGlass + ' ' + css.lgIconBtn} aria-label={w('hood.map.zoomin')} onClick={() => zoomBy(1.5)}><span aria-hidden="true">+</span></button>
        <button type="button" className={css.lgGlass + ' ' + css.lgIconBtn} aria-label={w('hood.map.zoomout')} onClick={() => zoomBy(1 / 1.5)}><span aria-hidden="true">−</span></button>
        <button type="button" className={css.lgGlass + ' ' + css.lgIconBtn} aria-label={w('hood.map.centre')} onClick={() => setView({cx: run.sim.x, cy: run.sim.z - 14, s: Math.max(vr.current.s, 3.4)})}><Icon n="pin" /></button>
      </div>
      <div className={css.lgMapStatus + ' ' + css.lgGlass} data-lifted={!!place}><span>{w('hood.hud.time')}<b>{clockText(run.sim.t)}</b></span><span>{w('hood.hud.waypoint')}<b>{wayLabel || '—'}</b></span></div>
      <div className={css.lgSheet} data-open={!!place} aria-live="polite">
        {place && (
          <div className={css.lgSheetIn}>
            <PlaceArt id={place.id} />
            <div className={css.lgSheetText}>
              <span className={css.lgInfoFlag}>{place.job ? w('hood.map.job') : w('hood.map.landmark')}</span>
              <h2>{w(place.key)}</h2>
              <p>{w(place.descKey)}</p>
              <p className={css.lgSheetDist}>{isWay ? w('hood.map.set.done', {place: w(place.key)}) : w('hood.map.dist', {m: String(dist)})}</p>
              <button type="button" className={css.lgBtn + ' min-h-tap'} data-primary={!isWay} onClick={() => onWaypoint(isWay ? null : place.id)}>{isWay ? w('hood.map.clear') : w('hood.map.set')}<Icon n="pin" /></button>
            </div>
            <button type="button" className={css.lgIconBtn + ' ' + css.lgSheetX} aria-label={w('hood.close')} onClick={() => setSel(null)}><Icon n="close" /></button>
          </div>
        )}
      </div>
    </section>
  )
}

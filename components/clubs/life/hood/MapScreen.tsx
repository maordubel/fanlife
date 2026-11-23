'use client'
/** LIFE · the game — the district map: the real level drawn top-down, drag to pan, tap a place, set a waypoint (never auto-walk). */
import {useEffect, useMemo, useRef, useState} from 'react'
import {clockText} from '@/lib/life/hood/shell'
import {districtModel, placeNear, type DistrictModel} from '@/lib/life/hood/district'
import type {HoodRun} from '@/lib/life/hood/run'
import type {PlaceId} from '@/lib/life/hood/types'
import {Icon} from './Icons'
import css from './hood.module.css'

type W = (k: string, extra?: Record<string, string>) => string
const VIEW_W = 150

function drawBlocks(m: DistrictModel) {
  const tone = ['#1b2a3d', '#223449', '#2a4059']
  return m.blocks.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={1.4} fill={tone[b.tone]} stroke="#2f4a68" strokeWidth={0.35} />)
}

export function MapScreen({w, run, waypoint, wayLabel, onWaypoint, onClose, onTab, accent, mapKey}: {w: W; run: HoodRun; waypoint: PlaceId | null; wayLabel: string; onWaypoint: (id: PlaceId | null) => void; onClose: () => void; onTab: () => void; accent: string; mapKey: number}) {
  const model = useMemo(() => districtModel(run.level, run), [run, mapKey])  // eslint-disable-line react-hooks/exhaustive-deps
  const [sel, setSel] = useState<PlaceId | null>(waypoint)
  const box = useRef<HTMLDivElement | null>(null)
  const [dim, setDim] = useState({w: 360, h: 420})
  const [c, setC] = useState({x: run.sim.x, y: run.sim.z - 30})
  const drag = useRef<{id: number; sx: number; sy: number; cx: number; cy: number; moved: boolean} | null>(null)
  useEffect(() => {
    const el = box.current; if (!el) return
    const f = () => setDim({w: el.clientWidth || 360, h: el.clientHeight || 420})
    f(); const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(f) : null; ro?.observe(el)
    return () => ro?.disconnect()
  }, [])
  const vw = VIEW_W, vh = VIEW_W * (dim.h / dim.w), k = dim.w / vw
  const clamp = (x: number, y: number) => ({x: Math.max(model.bounds.x, Math.min(model.bounds.x + model.bounds.w, x)), y: Math.max(model.bounds.y, Math.min(model.bounds.y + model.bounds.h, y))})
  const toWorld = (px: number, py: number) => ({x: c.x - vw / 2 + px / k, y: c.y - vh / 2 + py / k})
  const onDown = (e: React.PointerEvent) => { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); drag.current = {id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: c.x, cy: c.y, moved: false} }
  const onMove = (e: React.PointerEvent) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; const dx = e.clientX - d.sx, dy = e.clientY - d.sy; if (Math.hypot(dx, dy) > 6) d.moved = true; if (d.moved) setC(clamp(d.cx - dx / k, d.cy - dy / k)) }
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current; drag.current = null
    if (!d || d.moved) return
    const r = box.current!.getBoundingClientRect(), p = toWorld(e.clientX - r.left, e.clientY - r.top)
    setSel(placeNear(model, p.x, p.y, 44 / k)?.id ?? sel)
  }
  const place = model.places.find(p => p.id === sel) ?? null
  const dist = place ? Math.round(Math.hypot(place.x - run.sim.x, place.y - run.sim.z)) : 0
  const isWay = !!place && waypoint === place.id
  const pr = 44 / k / 2 + 2  // a hit target at least 44px wide on the glass

  return (
    <section className={css.lgScreen + ' ' + css.lgMapPage} data-solid="true" aria-label={w('hood.map.title')} data-life="hood-map">
      <div className={css.lgBar}>
        <span className={css.lgBrandMark}>{w('hood.brand')}</span>
        <div className={css.lgTabs}><button type="button" className={css.lgTab} aria-current="true">{w('hood.pause.map')}</button><button type="button" className={css.lgTab} onClick={onTab}>{w('hood.pause.bag')}</button></div>
        <button type="button" className={css.lgIconBtn} aria-label={w('hood.close')} onClick={onClose}><Icon n="close" /></button>
      </div>
      <div className={css.lgMapHead}><p className={css.lgKicker}>{w('hood.map.kicker')}</p><h1 className={css.lgH1}>{w('hood.map.title')}</h1></div>
      <div className={css.lgMapBody}>
        <div ref={box} className={css.lgMapBox} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null }}>
          <svg className={css.lgMapSvg} viewBox={`${c.x - vw / 2} ${c.y - vh / 2} ${vw} ${vh}`} role="img" aria-label={w('hood.map.aria')} preserveAspectRatio="xMidYMid slice">
            <rect x={model.bounds.x - 400} y={model.bounds.y - 400} width={model.bounds.w + 800} height={model.bounds.h + 800} fill="#0a121c" />
            {drawBlocks(model)}
            {model.streets.map((s, i) => <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill="#3a4a5e" />)}
            {/* the main street's centre line */}
            <line x1={0} x2={0} y1={model.bounds.y + 30} y2={model.bounds.y + model.bounds.h} stroke="#5d7088" strokeWidth={0.5} strokeDasharray="3 3" />
            <rect x={model.pitch.x} y={model.pitch.y} width={model.pitch.w} height={model.pitch.h} rx={1} fill="#2c6b46" stroke="#cfe6d2" strokeWidth={0.4} />
            <line x1={model.pitch.x} x2={model.pitch.x + model.pitch.w} y1={model.pitch.y + model.pitch.h / 2} y2={model.pitch.y + model.pitch.h / 2} stroke="#cfe6d2" strokeWidth={0.3} />
            <rect x={model.ground.x} y={model.ground.y} width={model.ground.w} height={model.ground.h} rx={5} fill="#16222f" stroke={accent} strokeWidth={0.9} />
            <rect x={model.ground.x + 5} y={model.ground.y + 7} width={model.ground.w - 10} height={model.ground.h - 14} rx={2} fill="#2c6b46" stroke="#cfe6d2" strokeWidth={0.4} />
            <circle cx={0} cy={model.ground.y + model.ground.h / 2} r={4.5} fill="none" stroke="#cfe6d2" strokeWidth={0.3} />
            <rect x={model.kiosk.x} y={model.kiosk.y} width={model.kiosk.w} height={model.kiosk.h} fill="#c9d7e6" />
            {waypoint && (() => { const p = model.places.find(q => q.id === waypoint); return p ? <line x1={run.sim.x} y1={run.sim.z} x2={p.x} y2={p.y} stroke={accent} strokeWidth={0.7} strokeDasharray="2 2" /> : null })()}
            {model.places.map(p => {
              const on = sel === p.id, way = waypoint === p.id
              return (
                <g key={p.id} className={css.lgMapPin} role="button" tabIndex={0} aria-label={w(p.key)} aria-pressed={on} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(p.id) } }} onPointerDown={e => e.stopPropagation()} onClick={() => setSel(p.id)}>
                  <circle className={css.lgHit} cx={p.x} cy={p.y} r={pr} fill="transparent" stroke="none" />
                  <circle cx={p.x} cy={p.y} r={on ? 4.6 : 3.6} fill={way || on ? accent : '#0f1a28'} stroke={way || on ? '#0f1a28' : '#fff1dc'} strokeWidth={0.8} />
                  <text x={p.x} y={p.y + 1.5} textAnchor="middle" fontSize={4} fontWeight={700} fill={way || on ? '#0f1a28' : '#fff1dc'} style={{fontFamily: 'var(--lg-head)', pointerEvents: 'none'}}>{w(p.key).charAt(0)}</text>
                  {p.job && <circle cx={p.x + 4} cy={p.y - 4} r={1.8} fill={accent} stroke="#0f1a28" strokeWidth={0.5} />}
                  <text x={p.x} y={p.y + 9} textAnchor="middle" fontSize={3.4} fill="#fff1dc" stroke="#0a121c" strokeWidth={0.9} paintOrder="stroke" style={{fontFamily: 'var(--lg-body)', pointerEvents: 'none', letterSpacing: '.02em'}}>{w(p.key)}</text>
                </g>
              )
            })}
            {/* you are here */}
            <g transform={`translate(${run.sim.x} ${run.sim.z}) rotate(${(-run.sim.heading * 180) / Math.PI + 180})`} aria-hidden="true">
              <circle r={5.6} fill={accent} opacity={0.22} />
              <text y={-8} textAnchor="middle" fontSize={3.2} fill="#fff1dc" stroke="#0a121c" strokeWidth={0.8} paintOrder="stroke" transform={`rotate(${(run.sim.heading * 180) / Math.PI - 180})`}>{w('hood.map.you')}</text>
              <path d="M0 -4.4 L3.2 3.2 L0 1.6 L-3.2 3.2 Z" fill={accent} stroke="#0f1a28" strokeWidth={0.6} />
            </g>
          </svg>
          <div className={css.lgMapTools}><button type="button" className={css.lgIconBtn} aria-label={w('hood.map.centre')} onPointerDown={e => e.stopPropagation()} onClick={() => setC({x: run.sim.x, y: run.sim.z - 20})}><Icon n="pin" /></button></div>
        </div>
        <div className={css.lgSide}>
          <div className={css.lgChips} role="group" aria-label={w('hood.map.places')}>
            {model.places.map(p => <button key={p.id} type="button" className={css.lgChip} aria-pressed={sel === p.id} data-way={waypoint === p.id} onClick={() => { setSel(p.id); setC(clamp(p.x, p.y)) }}>{w(p.key)}</button>)}
          </div>
          <div className={css.lgInfo} aria-live="polite">
            {place ? (<>
              <span className={css.lgInfoFlag}>{place.job ? w('hood.map.job') : w('hood.map.landmark')}</span>
              <h2>{w(place.key)}</h2>
              <p>{w(place.descKey)}</p>
              <p>{isWay ? w('hood.map.set.done', {place: w(place.key)}) : w('hood.map.dist', {m: String(dist)})}</p>
              <button type="button" className={css.lgBtn} data-primary={!isWay} onClick={() => onWaypoint(isWay ? null : place.id)}>{isWay ? w('hood.map.clear') : w('hood.map.set')}<Icon n="pin" /></button>
            </>) : <p>{w('hood.map.pick')}</p>}
          </div>
        </div>
        <div className={css.lgStatus}><span>{w('hood.hud.time')}<b>{clockText(run.sim.t)}</b></span><span>{w('hood.hud.waypoint')}<b>{wayLabel || '—'}</b></span></div>
      </div>
    </section>
  )
}

'use client'
/**
 * LIFE, universal — the town from above.
 *
 * Everything here is drawn from `lib/life/universal/city.ts`: the layout is fixed, the dressing
 * (which blocks stand where, which cars drive) is seeded from the club's id, and the fog lifts
 * only over rooms the supporter has stood in. Colours come from the `--l-*` tokens; the shell
 * decides what a tap does.
 */
import {useId, useMemo, useState} from 'react'
import {CITY, type City, type Place, type SiteKind} from '@/lib/life/universal/city'
import styles from './life.module.css'

type Copy = Record<string, string>
type Props = {city: City; clubId: string; night: boolean; copy: Copy; story: {lang?: string; dir?: 'ltr'}; onTravel: (place: Place) => void; onClose: () => void}

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const rng = (seed: number) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }

const GLYPH: Record<SiteKind, string> = {home: 'H', school: 'S', street: '·', work: 'W', stadium: '▲', bus: 'B', abroad: '✈', pitch: '○'}

export function CityMap({city, clubId, night, copy, story, onTravel, onClose}: Props) {
  const uid = useId().replace(/:/g, '')
  const [pick, setPick] = useState<string | null>(() => city.places.find(p => p.goal)?.id ?? city.places.find(p => p.status === 'here')?.id ?? null)
  const at = Object.fromEntries(city.places.map(p => [p.id, p]))
  const lit = city.places.filter(p => p.status !== 'hidden' && p.status !== 'known')
  const blocks = useMemo(() => {
    const r = rng(hash(clubId)), out: {x: number; y: number; w: number; h: number; t: number}[] = []
    for (let gy = 0; gy < 14; gy++) for (let gx = 0; gx < 12; gx++) {
      const x = gx * 8.3 + 1.5 + r() * 2, y = gy * 8 + 1 + r() * 2, w = 3 + r() * 3.4, h = 3 + r() * 3.4, t = r()
      if (city.places.some(p => Math.hypot(p.x - (x + w / 2), p.y - (y + h / 2)) < 9)) continue
      if (t < 0.18) continue
      out.push({x, y, w, h, t})
    }
    return out
  }, [clubId, city.places])
  const cars = useMemo(() => {
    const r = rng(hash(clubId + 'cars'))
    return city.roads.filter(([a, b]) => at[a]?.status !== 'hidden' && at[b]?.status !== 'hidden').map(([a, b], i) => ({a, b, dur: 9 + r() * 9, delay: -r() * 9, back: i % 2 === 0}))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, city.roads])
  const here = city.places.find(p => p.status === 'here') ?? null
  const sel = pick ? at[pick] ?? null : null
  const bent = (a: Place, b: Place) => `M${a.x} ${a.y} L${a.x} ${b.y} L${b.x} ${b.y}`
  const road = (a: string, b: string) => { const p = at[a], q = at[b]; return p && q ? bent(p, q) : null }

  return (
    <section className={`${styles.cover} z-[60]`} role="dialog" aria-modal="true" aria-labelledby="life-map-title" data-life="map" data-night={night ? 'true' : 'false'}>
      <div className={styles.mapSheet}>
        <header className={styles.mapHead}>
          <div>
            <p className={styles.serial}>{copy['map.explored']} · <bdi>{city.explored}</bdi> / <bdi>{city.total}</bdi> · {copy['map.met']} <bdi>{city.met}</bdi> / <bdi>{city.people}</bdi></p>
            <h2 id="life-map-title" className={styles.mapTitle}>{copy['map.title']}</h2>
          </div>
          <button type="button" className={`${styles.leave} ${styles.mapClose} min-h-tap`} onClick={onClose} aria-label={copy.close} data-life="map-close">×</button>
        </header>
        <div className={styles.mapBoard}>
          <svg className={styles.mapSvg} viewBox={`0 0 ${CITY.w} ${CITY.h}`} role="group" aria-label={copy['map.title']} preserveAspectRatio="xMidYMid meet">
            <defs>
              <mask id={`${uid}m`}>
                <rect width={CITY.w} height={CITY.h} fill="black" />
                {lit.map(p => <circle key={p.id} cx={p.x} cy={p.y} r={p.status === 'here' ? 24 : 17} fill="white" />)}
              </mask>
              <pattern id={`${uid}g`} width="6" height="6" patternUnits="userSpaceOnUse"><path d="M6 0H0V6" className={styles.mapGrid} /></pattern>
            </defs>
            <rect width={CITY.w} height={CITY.h} className={styles.mapGround} />
            <rect width={CITY.w} height={CITY.h} fill={`url(#${uid}g)`} />
            <g className={styles.mapDim}>{blocks.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} />)}</g>
            <g mask={`url(#${uid}m)`}>
              <rect width={CITY.w} height={CITY.h} className={styles.mapLitGround} />
              <g className={styles.mapLit}>{blocks.map((b, i) => <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} data-t={b.t > 0.6 ? 'hi' : 'lo'} />)}</g>
            </g>
            {city.roads.map(([a, b]) => { const d = road(a, b); const open = at[a]?.status !== 'hidden' && at[b]?.status !== 'hidden'; return d && <path key={a + b} d={d} className={open ? styles.mapRoad : styles.mapRoadFog} /> })}
            {city.roads.map(([a, b]) => { const d = road(a, b); const open = at[a]?.status !== 'hidden' && at[b]?.status !== 'hidden'; return d && open && <path key={'c' + a + b} d={d} className={styles.mapRoadLine} /> })}
            {cars.map((c, i) => { const d = road(c.a, c.b); return d && (
              <rect key={i} width="1.8" height="1.1" x="-0.9" y="-0.55" className={styles.mapCar}>
                <animateMotion dur={`${c.dur}s`} begin={`${c.delay}s`} repeatCount="indefinite" path={d} keyPoints={c.back ? '1;0' : '0;1'} keyTimes="0;1" calcMode="linear" />
              </rect>
            ) })}
            {city.places.map(p => {
              const hidden = p.status === 'hidden', known = p.status === 'known'
              return (
                <g key={p.id} className={styles.mapSite} data-status={p.status} data-selected={pick === p.id ? 'true' : 'false'} data-kind={p.kind} data-place={p.id}
                  transform={`translate(${p.x} ${p.y})`} tabIndex={hidden ? -1 : 0} role="button" aria-pressed={pick === p.id} aria-label={hidden ? copy['map.unknown'] : p.name}
                  onClick={() => !hidden && setPick(p.id)} onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !hidden) { e.preventDefault(); setPick(p.id) } }}>
                  <rect x="-6.5" y="-4.5" width="13" height="9" className={styles.mapPlot} />
                  {!hidden && <text className={styles.mapGlyph} textAnchor="middle" dy="1.6" aria-hidden="true">{known ? '?' : GLYPH[p.kind]}</text>}
                  {hidden && <text className={styles.mapFog} textAnchor="middle" dy="1.8" aria-hidden="true">?</text>}
                  {p.offers.length > 0 && <circle cx="5.6" cy="-4.2" r="1.7" className={styles.mapOffer} />}
                  {p.goal && <path d="M-1.4 -9 L0 -6.6 L1.4 -9 Z" className={styles.mapGoal}><animateTransform attributeName="transform" type="translate" values="0 0;0 -1.4;0 0" dur="1.4s" repeatCount="indefinite" /></path>}
                  {p.status === 'here' && <circle r="2.6" cy="7.6" className={styles.mapYou}><animate attributeName="r" values="2;3.2;2" dur="1.6s" repeatCount="indefinite" /></circle>}
                  {!hidden && <text className={styles.mapLabel} textAnchor="middle" dy="9.4" {...(p.status === 'known' ? {} : story)}>{known ? copy['map.unknown'] : p.name}</text>}
                </g>
              )
            })}
          </svg>
        </div>
        {sel && (
          <div className={styles.mapCard} data-life="map-card" data-place={sel.id} data-status={sel.status}>
            <p className={styles.serial}>{sel.status === 'here' ? copy['map.here'] : sel.status === 'seen' ? copy['map.seen'] : copy['map.heard']}{sel.goal && <> · <b>{copy['map.errand']}</b></>}</p>
            <h3 className={styles.mapPlace} {...story}>{sel.status === 'known' ? copy['map.unknown'] : sel.name}</h3>
            {sel.errand && <p className={styles.mapErrand} {...story}>{sel.errand}</p>}
            {sel.people.length > 0 && <p className={styles.mapPeople}>{sel.people.map(p => <span key={p.id} data-met={p.met ? 'true' : 'false'}><bdi>{p.met ? p.name : copy['map.stranger']}</bdi></span>)}</p>}
            {sel.offers.length > 0 && <ul className={styles.mapOffers}>{sel.offers.map(o => <li key={o.id} data-kind={o.kind}><span className={styles.mapTag}>{copy[`map.offer.${o.kind}`]}</span> <span {...story}>{o.label}</span></li>)}</ul>}
            {sel.status !== 'here' && sel.status !== 'hidden' && (
              sel.route.ok
                ? <button type="button" className={`${styles.button} min-h-tap`} onClick={() => onTravel(sel)} data-life="map-go">{sel.route.stopsAt ? copy['map.goStops'] : copy['map.go']}{' · '}<bdi>{sel.route.hops.length}</bdi>{' '}{copy['map.hops']}</button>
                : <p className={styles.mapShut} data-life="map-shut">{sel.route.reason ? <span {...story}>{sel.route.reason}</span> : copy['map.noRoute']}</p>
            )}
            {sel.status === 'here' && <button type="button" className={`${styles.button} min-h-tap`} onClick={onClose}>{copy['map.stay']}</button>}
          </div>
        )}
        {!sel && here && <p className={styles.muted}>{copy['map.pick']}</p>}
      </div>
    </section>
  )
}

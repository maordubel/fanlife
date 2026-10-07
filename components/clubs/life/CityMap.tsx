'use client'
/**
 * LIFE, universal — the town from above.
 *
 * Everything here is drawn from `lib/life/universal/city.ts`: the layout is fixed, the dressing
 * (which blocks stand where, which cars drive) is seeded from the club's id, and the fog lifts
 * only over rooms the supporter has stood in. Colours come from the `--l-*` tokens; the shell
 * decides what a tap does.
 */
import {useState} from 'react'
import type {City, Place} from '@/lib/life/universal/city'
import type {RoomId} from '@/lib/life/universal/types'
import {IsoBoard} from './IsoBoard'
import styles from './life.module.css'

type Copy = Record<string, string>
type Props = {city: City; clubId: string; night: boolean; copy: Copy; story: {lang?: string; dir?: 'ltr'}; onTravel: (place: Place) => void; onClose: () => void}

export function CityMap({city, clubId, night, copy, story, onTravel, onClose}: Props) {
  const [pick, setPick] = useState<string | null>(() => city.places.find(p => p.goal)?.id ?? city.places.find(p => p.status === 'here')?.id ?? null)
  const at = Object.fromEntries(city.places.map(p => [p.id, p]))
  const [trip, setTrip] = useState<{stops: RoomId[]; ms: number; to: Place} | null>(null)
  const here = city.places.find(p => p.status === 'here') ?? null
  const sel = pick ? at[pick] ?? null : null
  /* he does not teleport: the route is drawn from where he stands, a dot walks it, and only then does the town change */
  const setOff = (to: Place) => {
    if (trip) return
    const stops = [here?.id, ...(to.route.ok ? to.route.hops : [])].filter((id): id is RoomId => !!id)
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (stops.length < 2 || reduce) { onTravel(to); return }
    const ms = Math.min(2600, 700 + stops.length * 500)
    setTrip({stops, ms, to})
    window.setTimeout(() => onTravel(to), ms + 250)
  }

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
          <IsoBoard places={city.places} pick={pick} onPick={setPick} night={night} clubId={clubId} label={copy['map.title']!} trip={trip ? {stops: trip.stops, ms: trip.ms} : null} unknown={copy['map.unknown']!} story={story} />
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
                ? <button type="button" className={`${styles.button} min-h-tap`} onClick={() => setOff(sel)} disabled={!!trip} data-life="map-go">{sel.route.stopsAt ? copy['map.goStops'] : copy['map.go']}{' · '}<bdi>{sel.route.hops.length}</bdi>{' '}{copy['map.hops']}</button>
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

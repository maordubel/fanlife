'use client'
/**
 * The HUD plate — the Worker's LifeHud, in the club's paper.
 *
 * One compact object at the top of the glass: the chapter number and age over the name of the place,
 * a Map button that is loud on purpose (a supporter who cannot find the way out is lost), a ☰ for
 * everything else, and under them the meters as chips. A chip is a button: it opens the gauges sheet.
 * Nothing here is positioned by a pixel offset — the shell measures this plate and every other layer
 * hangs from `--l-hud`.
 */
import type {MutableRefObject} from 'react'
import styles from './life.module.css'

type Copy = Record<string, string>
type Story = {lang?: string; dir?: 'ltr' | 'rtl'}
export type Meter = 'coins' | 'energy' | 'standing'

export function Hud({plateRef, initials, serial, place, objective, coins, energy, standing, talking, copy, story, onMeter, onMap, onMenu}: {
  plateRef: MutableRefObject<HTMLElement | null>
  initials: string
  serial: string
  place: string
  objective: string | null
  coins: number
  energy: number
  standing: number
  talking: boolean
  copy: Copy
  story: Story
  onMeter: (m: Meter) => void
  onMap: () => void
  onMenu: () => void
}) {
  const chip = (m: Meter, value: number, bar: boolean) => (
    <button key={m} type="button" className={`${styles.hudChip} min-h-tap`} data-meter={m} data-low={m === 'energy' && energy < 25 ? 'true' : 'false'} onClick={() => onMeter(m)} aria-haspopup="dialog" data-life={`meter-${m}`}>
      <span>{copy[`me.${m}`]}</span>
      {bar && <i aria-hidden="true"><b style={{inlineSize: `${Math.max(0, Math.min(100, value))}%`}} /></i>}
      <b><bdi>{Math.round(value)}</bdi></b>
    </button>
  )
  return (
    <header ref={plateRef} className={styles.hud} data-life="hud" data-talking={talking ? 'true' : 'false'}>
      <div className={styles.hudRow}>
        <span className={styles.mark} aria-hidden="true">{initials}</span>
        <div className={styles.hudText}>
          <p className={styles.serial}>{serial}</p>
          <p className={styles.hudPlace} {...story}>{place}</p>
        </div>
        <button type="button" className={`${styles.hudMap} min-h-tap`} onClick={onMap} aria-haspopup="dialog" data-life="map-open"><span aria-hidden="true">◈</span> {copy.map}</button>
        <button type="button" className={`${styles.hudMenu} min-h-tap`} onClick={onMenu} aria-haspopup="dialog" aria-label={copy.menu} data-life="menu-open"><span aria-hidden="true">☰</span></button>
      </div>
      {!talking && (
        <div className={styles.hudChips} data-life="meters">
          {chip('coins', coins, false)}
          {chip('energy', energy, true)}
          {chip('standing', standing, false)}
        </div>
      )}
      {!talking && objective && <p className={styles.hudToday} data-life="objective"><span>{copy.today}</span> <span {...story}>{objective}</span></p>}
    </header>
  )
}

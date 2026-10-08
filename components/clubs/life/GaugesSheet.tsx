'use client'
/**
 * The gauges — what the HUD chips open. Words AND numbers (the supporter wants to see what a coin or a
 * rest did); bonds as a word with the figure beside it. `Everything about me` goes on to the Me sheet.
 */
import {nameOf} from '@/lib/life/universal/world'
import type {Chapter, LifePack, LifeState} from '@/lib/life/universal/types'
import {bondWord} from './MeSheet'
import type {Meter} from './Hud'
import styles from './life.module.css'

type Copy = Record<string, string>
const level = (v: number) => (v >= 80 ? 3 : v >= 50 ? 2 : v >= 25 ? 1 : 0)

export function GaugesSheet({pack, chapter, state, copy, story, focus, onMe, onClose}: {
  pack: LifePack; chapter: Chapter; state: LifeState; copy: Copy; story: {lang?: string; dir?: 'ltr' | 'rtl'}; focus: Meter | null; onMe: () => void; onClose: () => void
}) {
  const meters: {k: 'energy' | 'standing' | 'heart'; v: number}[] = [{k: 'energy', v: state.energy}, {k: 'standing', v: state.standing}, {k: 'heart', v: state.heart}]
  const bonds = Object.entries(state.bonds).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  return (
    <section className={`${styles.cover} z-[60]`} role="dialog" aria-modal="true" aria-labelledby="life-gauge-title" data-life="gauges">
      <div className={styles.mapSheet}>
        <header className={styles.mapHead}>
          <div><p className={styles.serial}>{copy.age} <bdi>{chapter.age}</bdi> · {pack.club.name}</p><h2 id="life-gauge-title" className={styles.mapTitle}>{copy['gauge.title']}</h2></div>
          <button type="button" className={`${styles.leave} ${styles.mapClose} min-h-tap`} onClick={onClose} aria-label={copy.close} data-life="gauges-close">×</button>
        </header>
        <ul className={styles.meters}>
          <li data-meter="coins" data-focus={focus === 'coins' ? 'true' : 'false'}>
            <span className={styles.meterName}>{copy['me.coins']}</span>
            <span className={styles.gaugeWord}>{copy['gauge.coins']}</span>
            <b className={styles.meterNum}><bdi>{state.coins}</bdi></b>
          </li>
          {meters.map(m => (
            <li key={m.k} data-meter={m.k} data-focus={focus === m.k ? 'true' : 'false'}>
              <span className={styles.meterName}>{copy[`me.${m.k}`]}</span>
              <span className={styles.meterBar} aria-hidden="true"><i style={{inlineSize: `${Math.max(0, Math.min(100, m.v))}%`}} /></span>
              <b className={styles.meterNum}><bdi>{Math.round(m.v)}</bdi></b>
              <span className={styles.gaugeWord}>{copy[`gauge.word.${level(m.v)}`]}</span>
            </li>
          ))}
        </ul>
        <h3 className={styles.heading}>{copy['gauge.bondsTitle']}</h3>
        {bonds.length === 0 ? <p className={styles.muted}>{copy['me.noBonds']}</p> : (
          <ul className={styles.bondList}>{bonds.map(([w, v]) => <li key={w}><span {...story}>{nameOf(pack, chapter, w)}</span><i data-bond={bondWord(v)}>{copy[`me.bond.${bondWord(v)}`]} · <bdi>{Math.round(v)}</bdi></i></li>)}</ul>
        )}
        <div className={styles.actions}><button type="button" className={`${styles.quiet} min-h-tap`} onClick={onMe} data-life="gauges-me">{copy['gauge.seeAll']}</button></div>
      </div>
    </section>
  )
}

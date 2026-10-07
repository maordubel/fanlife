'use client'
/**
 * LIFE, universal — "Me": the meters, the people, the nights.
 *
 * One sheet, three pages. Meters carry a bar AND the number (the supporter wants to see what a
 * coin or a rest did). Bonds are words, like the master's profile card; a person is shown by
 * name only after the supporter has been introduced. A night shows its teams and score only
 * once the chapter that holds it has been lived.
 */
import {useState} from 'react'
import {nameOf} from '@/lib/life/universal/world'
import type {Chapter, LifePack, LifeState} from '@/lib/life/universal/types'
import styles from './life.module.css'

type Copy = Record<string, string>
type Tab = 'me' | 'people' | 'nights'

export const bondWord = (n: number) => (n >= 18 ? 3 : n >= 10 ? 2 : n >= 5 ? 1 : 0)

export function MeSheet({pack, chapter, state, copy, locale, story, onClose}: {pack: LifePack; chapter: Chapter; state: LifeState; copy: Copy; locale: 'en' | 'he'; story: {lang?: string; dir?: 'ltr' | 'rtl'}; onClose: () => void}) {
  const [tab, setTab] = useState<Tab>('me')
  const meters: {k: string; v: number; max: number}[] = [
    {k: 'energy', v: state.energy, max: 100}, {k: 'standing', v: state.standing, max: 100}, {k: 'heart', v: state.heart, max: 100}, {k: 'coins', v: state.coins, max: 0},
  ]
  const everyone = [...new Map(pack.chapters.flatMap(c => c.cast.map(p => [p.who, c] as const))).entries()]
  const nights = pack.chapters.filter(c => c.anchor?.match)
  const now = pack.chapters.findIndex(c => c.id === chapter.id)
  return (
    <section className={`${styles.cover} z-[60]`} role="dialog" aria-modal="true" aria-labelledby="life-me-title" data-life="me">
      <div className={styles.mapSheet}>
        <header className={styles.mapHead}>
          <div><p className={styles.serial}>{copy.age} <bdi>{chapter.age}</bdi> · {pack.club.name}</p><h2 id="life-me-title" className={styles.mapTitle}>{copy['me.title']}</h2></div>
          <button type="button" className={`${styles.leave} ${styles.mapClose} min-h-tap`} onClick={onClose} aria-label={copy.close} data-life="me-close">×</button>
        </header>
        <div className={styles.tabs} role="tablist">
          {(['me', 'people', 'nights'] as Tab[]).map(t => <button key={t} type="button" role="tab" aria-selected={tab === t} className={`${styles.tab} min-h-tap`} onClick={() => setTab(t)} data-tab={t}>{copy[`me.tab.${t}`]}</button>)}
        </div>
        {tab === 'me' && (
          <div role="tabpanel">
            <ul className={styles.meters}>
              {meters.map(m => (
                <li key={m.k} data-meter={m.k}>
                  <span className={styles.meterName}>{copy[`me.${m.k}`]}</span>
                  {m.max > 0 && <span className={styles.meterBar} aria-hidden="true"><i style={{inlineSize: `${Math.max(0, Math.min(100, (m.v / m.max) * 100))}%`}} /></span>}
                  <b className={styles.meterNum}><bdi>{Math.round(m.v)}</bdi></b>
                </li>
              ))}
            </ul>
            <h3 className={styles.heading}>{copy['me.bonds']}</h3>
            {Object.entries(state.bonds).filter(([, v]) => v > 0).length === 0 ? <p className={styles.muted}>{copy['me.noBonds']}</p> : (
              <ul className={styles.bondList}>{Object.entries(state.bonds).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([w, v]) => <li key={w}><span {...story}>{nameOf(pack, chapter, w)}</span><i data-bond={bondWord(v)}>{copy[`me.bond.${bondWord(v)}`]}</i></li>)}</ul>
            )}
          </div>
        )}
        {tab === 'people' && (
          <div role="tabpanel">
            <h3 className={styles.heading}>{copy['me.people']} · <bdi>{state.met.length}</bdi> / <bdi>{everyone.length}</bdi></h3>
            {state.met.length === 0 && <p className={styles.muted}>{copy['me.noPeople']}</p>}
            <ul className={styles.dossier}>
              {everyone.map(([who, c]) => { const met = state.met.includes(who), m = pack.cast[who]; return (
                <li key={who} data-met={met ? 'true' : 'false'}>
                  <b {...(met ? story : {})}>{met ? nameOf(pack, c, who) : copy['me.unmet']}</b>
                  {met && m && <small {...story}>{m.role} — {m.blurb}</small>}
                </li>
              ) })}
            </ul>
          </div>
        )}
        {tab === 'nights' && (
          <div role="tabpanel">
            <h3 className={styles.heading}>{copy['me.nights']}</h3>
            {nights.length === 0 && <p className={styles.muted}>{copy['me.noNights']}</p>}
            <ul className={styles.nightList}>
              {nights.map(c => { const a = c.anchor!, m = a.match!, done = !!state.done[c.id], reached = pack.chapters.indexOf(c) <= now; return (
                <li key={c.id} data-done={done ? 'true' : 'false'}>
                  <span className={styles.serial}>{copy.age} <bdi>{c.age}</bdi>{a.on && done && <> · <time dateTime={a.on}><bdi>{new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${a.on}T00:00:00Z`))}</bdi></time></>}</span>
                  {done ? <b dir="ltr"><bdi>{m.home} {m.homeGoals}–{m.awayGoals} {m.away}</bdi></b> : <b>{reached ? <bdi dir="ltr">{m.home} — {m.away}</bdi> : '?'}</b>}
                  <small>{done ? copy[`score.${m.result}`] : copy['me.nightAhead']}{done && a.hint ? <> · <bdi>{a.hint}</bdi></> : null}</small>
                </li>
              ) })}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

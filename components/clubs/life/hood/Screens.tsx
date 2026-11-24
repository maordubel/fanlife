'use client'
/** LIFE · the game — the screens that are not the street: boot, title, name entry, cinematic, pause, settings, help, job card. */
import Link from 'next/link'
import {useEffect, useRef, useState} from 'react'
import type {HoodSettings} from '@/lib/life/hood/save'
import {Icon} from './Icons'
import css from './hood.module.css'

type W = (k: string, extra?: Record<string, string>) => string
const LOGO = '/brand/life/life-logo-light'

export function Wordmark({className}: {className?: string}) {
  // the owner's LIFE wordmark, cream outline for dark screens
  return <span className={className}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`${LOGO}-600.webp`} srcSet={`${LOGO}-300.webp 300w, ${LOGO}-600.webp 600w, ${LOGO}-1200.webp 1200w`} sizes="(min-width: 900px) 340px, 62vw" alt="LIFE" decoding="async" /></span>
}

export function Boot({w, out}: {w: (k: string) => string; out: boolean}) {
  return <div className={css.lgBoot} style={out ? {opacity: 0, pointerEvents: 'none'} : undefined} role="status" aria-label={w('hood.boot')}><Wordmark /><p>{w('hood.boot')}</p></div>
}

export function Title({w, club, clubHref, hasSave, saveName, onContinue, onNew, onSettings}: {w: W; club: string; clubHref: string; hasSave: boolean; saveName: string; onContinue: () => void; onNew: () => void; onSettings: () => void}) {
  const first = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { first.current?.focus({preventScroll: true }) }, [])
  let i = 0
  return (
    <section className={css.lgScreen + ' ' + css.lgTitle} aria-label={w('hood.brand')} data-life="hood-title">
      <div className={css.lgTitleTop}><span className={css.lgBrandMark}>{w('hood.brand')}</span></div>
      <Wordmark className={css.lgWordmark + ' ' + css.lgIn} />
      <p className={css.lgKicker + ' ' + css.lgIn} style={{'--i': 1} as React.CSSProperties}>{w('hood.kicker.game')}</p>
      <h1 className={css.lgTagline + ' ' + css.lgIn} style={{'--i': 2} as React.CSSProperties}>{w('hood.tagline')}</h1>
      <p className={css.lgClub + ' ' + css.lgIn} style={{'--i': 3} as React.CSSProperties}>{club}</p>
      <div className={css.lgMenu}>
        {hasSave && <button ref={first} type="button" className={css.lgBtn + ' ' + css.lgIn} data-primary="true" style={{'--i': 4 + i++} as React.CSSProperties} onClick={onContinue}>{w('hood.title.continue')}<Icon n="chevron" /></button>}
        <button ref={hasSave ? undefined : first} type="button" className={css.lgBtn + ' ' + css.lgIn} data-primary={!hasSave} style={{'--i': 4 + i++} as React.CSSProperties} onClick={onNew}>{w('hood.title.new')}<Icon n="chevron" /></button>
        <button type="button" className={css.lgBtn + ' ' + css.lgIn} style={{'--i': 4 + i++} as React.CSSProperties} onClick={onSettings}>{w('hood.title.settings')}<Icon n="chevron" /></button>
        <Link href={clubHref} className={css.lgBtn + ' ' + css.lgIn} data-quiet="true" style={{'--i': 4 + i++, textDecoration: 'none'} as React.CSSProperties}>{w('hood.title.club')}<Icon n="back" /></Link>
      </div>
      <p className={css.lgFoot}>{hasSave && saveName ? w('hood.title.saved', {name: saveName}) : ''}</p>
    </section>
  )
}

export function NameEntry({w, onGo, onBack, clean}: {w: W; onGo: (name: string) => void; onBack: () => void; clean: (s: string) => string}) {
  const [v, setV] = useState('')
  const ref = useRef<HTMLInputElement | null>(null)
  useEffect(() => { ref.current?.focus({preventScroll: true}) }, [])
  const go = () => onGo(clean(v) || w('hood.name.default'))
  return (
    <form className={css.lgScreen + ' ' + css.lgName} onSubmit={e => { e.preventDefault(); go() }} aria-label={w('hood.name.title')} data-life="hood-name">
      <p className={css.lgKicker + ' ' + css.lgIn}>{w('hood.name.kicker')}</p>
      <h1 className={css.lgH1 + ' ' + css.lgIn} style={{'--i': 1} as React.CSSProperties}>{w('hood.name.title')}</h1>
      <div className={css.lgField + ' ' + css.lgIn} style={{'--i': 2} as React.CSSProperties}>
        <label htmlFor="lg-name">{w('hood.name.label')}</label>
        <input id="lg-name" ref={ref} value={v} maxLength={14} autoComplete="off" autoCapitalize="words" spellCheck={false} placeholder={w('hood.name.default')} onChange={e => setV(e.target.value.slice(0, 14))} />
        <small>{w('hood.name.hint')}</small>
      </div>
      <div className={css.lgMenu + ' ' + css.lgIn} style={{'--i': 3} as React.CSSProperties}>
        <button type="submit" className={css.lgBtn} data-primary="true">{w('hood.name.go')}<Icon n="chevron" /></button>
        <button type="button" className={css.lgBtn} data-quiet="true" onClick={onBack}>{w('hood.name.back')}<Icon n="back" /></button>
      </div>
    </form>
  )
}

/** letterbox bars, a few beats of subtitle text over the live street, SKIP. `onBeat` lets the host move the camera's subject. */
export function Cinematic({lines, w, reduced, onBeat, onDone, ms = 3800}: {lines: string[]; w: W; reduced: boolean; onBeat?: (i: number) => void; onDone: () => void; ms?: number}) {
  const [i, setI] = useState(0)
  const done = useRef(onDone), beat = useRef(onBeat)
  done.current = onDone; beat.current = onBeat
  useEffect(() => { beat.current?.(i) }, [i])
  useEffect(() => {
    const t = window.setTimeout(() => { if (i + 1 >= lines.length) done.current(); else setI(i + 1) }, ms)
    return () => window.clearTimeout(t)
  }, [i, lines.length, ms])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); if (i + 1 >= lines.length) done.current(); else setI(i + 1) } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [i, lines.length])
  return (
    <div className={css.lgCine} data-life="hood-cine" role="region" aria-label={w('hood.skip')} onClick={() => { if (i + 1 >= lines.length) onDone(); else setI(i + 1) }}>
      <div className={css.lgBarT} /><div className={css.lgBarB} />
      <button type="button" className={css.lgCineSkip} onClick={e => { e.stopPropagation(); onDone() }}>{w('hood.skip')}</button>
      <p key={i} className={css.lgCineText} aria-live="polite" style={reduced ? {animation: 'none'} : undefined}>{lines[i]}</p>
      <div className={css.lgDots} aria-hidden="true">{lines.map((_, k) => <i key={k} data-on={k <= i} />)}</div>
    </div>
  )
}

export function Pause({w, club, name, onResume, onMap, onBag, onSettings, onHelp, onQuit}: {w: W; club: string; name: string; onResume: () => void; onMap: () => void; onBag: () => void; onSettings: () => void; onHelp: () => void; onQuit: () => void}) {
  const first = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { first.current?.focus({preventScroll: true}) }, [])
  const items: [string, () => void, 'chevron' | 'map' | 'bag' | 'back', boolean?][] = [[w('hood.pause.resume'), onResume, 'chevron', true], [w('hood.pause.map'), onMap, 'map'], [w('hood.pause.bag'), onBag, 'bag'], [w('hood.pause.settings'), onSettings, 'chevron'], [w('hood.pause.help'), onHelp, 'chevron'], [w('hood.pause.quit'), onQuit, 'back']]
  return (
    <section className={css.lgScreen + ' ' + css.lgPause} data-solid="true" aria-label={w('hood.pause.title')} data-life="hood-pause">
      <div className={css.lgPauseHead}><p className={css.lgKicker}>{w('hood.brand')}</p><h1 className={css.lgH1}>{w('hood.pause.title')}</h1><p className={css.lgClub} style={{margin: 0}}>{[club, name].filter(Boolean).join(' · ')}</p></div>
      <div className={css.lgPauseList}>
        {items.map(([label, fn, icon, primary], i) => <button key={label} ref={i === 0 ? first : undefined} type="button" className={css.lgBtn} data-primary={!!primary} style={{'--i': i} as React.CSSProperties} onClick={fn}>{label}<Icon n={icon} /></button>)}
      </div>
      <p className={css.lgSaved}>{w('hood.pause.saved')}</p>
    </section>
  )
}

function Switch({label, on, onChange, w}: {label: string; on: boolean; onChange: (v: boolean) => void; w: W}) {
  return (
    <div className={css.lgRow}><span id={`lg-${label}`}>{label}</span>
      <div className={css.lgSeg} role="radiogroup" aria-labelledby={`lg-${label}`}>
        <button type="button" role="radio" aria-checked={on} onClick={() => onChange(true)}>{w('hood.set.on')}</button>
        <button type="button" role="radio" aria-checked={!on} onClick={() => onChange(false)}>{w('hood.set.off')}</button>
      </div>
    </div>
  )
}

export function Settings({w, s, quality, onChange, onBack}: {w: W; s: HoodSettings; quality: 'lite' | 'high'; onChange: (s: HoodSettings) => void; onBack: () => void}) {
  return (
    <section className={css.lgScreen + ' ' + css.lgPanelPage} data-solid="true" aria-label={w('hood.set.title')} data-life="hood-settings">
      <div className={css.lgBar}><button type="button" className={css.lgIconBtn} aria-label={w('hood.back')} onClick={onBack}><Icon n="back" /></button><span className={css.lgBrandMark}>{w('hood.brand')}</span><span style={{inlineSize: 44}} /></div>
      <h1 className={css.lgH1}>{w('hood.set.title')}</h1>
      <div className={css.lgRows}>
        <Switch w={w} label={w('hood.set.sound')} on={s.sound} onChange={v => onChange({...s, sound: v})} />
        <Switch w={w} label={w('hood.set.invert')} on={s.invert} onChange={v => onChange({...s, invert: v})} />
        <div className={css.lgRow}><span id="lg-quality">{w('hood.set.quality')}</span>
          <div className={css.lgSeg} role="radiogroup" aria-labelledby="lg-quality">
            <button type="button" role="radio" aria-checked={quality === 'lite'} onClick={() => onChange({...s, quality: 'lite'})}>{w('hood.set.lite')}</button>
            <button type="button" role="radio" aria-checked={quality === 'high'} onClick={() => onChange({...s, quality: 'high'})}>{w('hood.set.high')}</button>
          </div>
        </div>
        <Switch w={w} label={w('hood.set.reduced')} on={s.reduced} onChange={v => onChange({...s, reduced: v})} />
      </div>
      <p className={css.lgNote}>{w('hood.set.note')}</p>
    </section>
  )
}

export function Help({w, onBack}: {w: W; onBack: () => void}) {
  return (
    <section className={css.lgScreen + ' ' + css.lgPanelPage} data-solid="true" aria-label={w('hood.help.title')} data-life="hood-help">
      <div className={css.lgBar}><button type="button" className={css.lgIconBtn} aria-label={w('hood.back')} onClick={onBack}><Icon n="back" /></button><span className={css.lgBrandMark}>{w('hood.brand')}</span><span style={{inlineSize: 44}} /></div>
      <h1 className={css.lgH1}>{w('hood.help.title')}</h1>
      <div className={css.lgHelpCols}>
        <div className={css.lgHelpCol}><h2>{w('hood.help.touch')}</h2>{[1, 2, 3, 4].map(n => <p key={n}>{w(`hood.help.t${n}`)}</p>)}</div>
        <div className={css.lgHelpCol}><h2>{w('hood.help.keys')}</h2>{[1, 2, 3, 4].map(n => <p key={n}>{w(`hood.help.k${n}`)}</p>)}</div>
      </div>
    </section>
  )
}

export function JobCard({w, title, onGo, onMap}: {w: W; title: string; onGo: () => void; onMap: () => void}) {
  const ref = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { ref.current?.focus({preventScroll: true}) }, [])
  return (
    <section className={css.lgScreen + ' ' + css.lgCardWrap} data-solid="true" aria-label={w('hood.card.kicker')} data-life="hood-card">
      <div className={css.lgCard}>
        <span className={css.lgTick}><Icon n="check" /></span>
        <p className={css.lgKicker}>{w('hood.card.kicker')}</p>
        <h2>{title}</h2>
        <p>{w('hood.card.line')}</p>
        <div className={css.lgCardStats}><div><small>{w('hood.card.steps')}</small><b>3 / 3</b></div><div><small>{w('hood.card.cash')}</small><b>0</b></div></div>
        <button ref={ref} type="button" className={css.lgBtn + ' min-h-tap'} data-primary="true" onClick={onGo}>{w('hood.card.go')}<Icon n="chevron" /></button>
        <button type="button" className={css.lgBtn} data-quiet="true" onClick={onMap}>{w('hood.card.map')}<Icon n="map" /></button>
      </div>
    </section>
  )
}

/** what a story card prints, prepared by the host from the director and the archive row (every word already looked up) */
export type StoryCardView = {
  kind: 'chapter' | 'aftermath' | 'stage-end'
  kicker: string; title: string; lines: string[]
  chips: {label: string; value: string; tone: 'up' | 'down' | 'box'}[]
  /** the archive row's own facts; null for a personal chapter (no date, no score) */
  archive: {kicker: string; date: string | null; result: string | null; title: string | null; titleLocale: string | null; source: string | null} | null
  /** the painted Flow plate behind it, when the manifest has one */
  plate: string | null
  /** a painted thing beside it: what went in the Box, the bus ticket, the paper */
  art?: string | null
  /** the paper the archive's line is printed on */
  paper?: string | null
  go: string
}

/** a chapter's title card, the aftermath, the end of a stage: full-screen, a painted plate behind (or the drawn dusk), one way on */
export function StoryCard({view, onGo}: {view: StoryCardView; onGo: () => void}) {
  const ref = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { ref.current?.focus({preventScroll: true}) }, [view])
  return (
    <section className={css.lgScreen + ' ' + css.lgStory} data-kind={view.kind} data-plate={!!view.plate} aria-label={view.title} data-life="hood-story">
      {view.plate && <span className={css.lgStoryPlate} aria-hidden="true">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={view.plate} alt="" decoding="async" /></span>}
      <span className={css.lgStoryShade} aria-hidden="true" />
      <div className={css.lgStoryIn}>
        <p className={css.lgKicker + ' ' + css.lgIn}>{view.kicker}</p>
        <h1 className={css.lgStoryTitle + ' ' + css.lgIn} style={{'--i': 1} as React.CSSProperties}>{view.title}</h1>
        {view.lines.map((l, i) => <p key={i} className={css.lgStoryLine + ' ' + css.lgIn} style={{'--i': 2 + i} as React.CSSProperties}>{l}</p>)}
        {view.art && <img className={css.lgStoryArt + ' ' + css.lgIn} src={view.art} alt="" decoding="async" style={{'--i': 2} as React.CSSProperties} />}
        {view.chips.length > 0 && <ul className={css.lgStoryChips + ' ' + css.lgIn} style={{'--i': 3} as React.CSSProperties}>{view.chips.map((c, i) => <li key={i} data-tone={c.tone}><small>{c.label}</small><b>{c.value}</b></li>)}</ul>}
        {view.archive && (
          <aside className={css.lgStoryPaper + ' ' + css.lgIn} style={{'--i': 4} as React.CSSProperties} aria-label={view.archive.kicker}>
            {view.paper && <img className={css.lgStoryPaperArt} src={view.paper} alt="" decoding="async" />}
            <small>{view.archive.kicker}</small>
            {view.archive.date && <p className={css.lgStoryDate}>{view.archive.date}</p>}
            {view.archive.result && <p className={css.lgStoryResult}><bdi dir="ltr">{view.archive.result}</bdi></p>}
            {view.archive.title && <p lang={view.archive.titleLocale ?? undefined} dir="auto">{view.archive.title}</p>}
            {view.archive.source && <p className={css.lgStorySrc}>{view.archive.source}</p>}
          </aside>
        )}
        <button ref={ref} type="button" className={css.lgBtn + ' min-h-tap ' + css.lgIn} data-primary="true" style={{'--i': 5} as React.CSSProperties} onClick={onGo}>{view.go}<Icon n="chevron" /></button>
      </div>
    </section>
  )
}

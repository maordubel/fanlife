'use client'
import {useState,type ReactNode} from 'react'
import {LIVES} from '@/lib/game/session'
import {secondsFor} from '@/lib/game/timeline-run'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {makeT} from '../derby/ui'
import css from './threadgame.module.css'
import {Plate} from '@/components/weekly/Plate'

/**
 * Gate 13 · Chronology's explicit start (§18.1): what the run is — the objective, how many placements, lives, timers —
 * and whether it is a full run or a short one, said before the first card is dealt. A link that says `play=1` (the result's
 * "play again") goes straight in; the player has already read this once.
 */
export function ChronologyStart({copy,clubName,placements,category,have,need,autoStart,children}:{copy:GameCopy;clubName:string;placements:number;category:'full'|'short';have:number;need:number;autoStart:boolean;children:ReactNode}){
 const t=makeT(copy),[started,setStarted]=useState(autoStart)
 if(started)return <>{children}</>
 return <section className={css.intro} data-testid="timeline-intro" data-category={category}>
  <div className={`wk-panel wk-lift wk-sky ${css.cover}`}>
   <span className="wk-speed" aria-hidden="true" style={{['--sx' as string]:'70%',['--sy' as string]:'55%'}}/>
   <Plate art="scarf" ink="club" className={css.coverArt}/>
   <p className={`wk-banner ${css.coverBanner}`}>{t('tl.c.kicker',{club:clubName})}</p>
   <h2 className={`wk-logo ${css.coverTitle}`}>{t('tl.c.title')}</h2>
   <p className={`wk-cap white ${css.coverCap}`}>{t('tl.c.intro',{n:placements})}</p>
  </div>
  <ul className={css.facts}>
   <li><b>1</b>{t('tl.c.rule.tap')}</li>
   <li><b>2</b>{t('tl.c.rule.lives',{lives:LIVES})}</li>
   <li><b>3</b>{t('tl.c.rule.timer',{a:secondsFor(0),b:secondsFor(4),c:secondsFor(8)})}</li>
   <li><b>4</b>{t('tl.c.rule.score')}</li>
  </ul>
  <p className={css.tag} data-testid="timeline-category">{category==='full'?t('tl.c.cat.full',{n:placements}):t('tl.c.cat.short',{n:placements,club:clubName,have,need})}</p>
  {category==='short'&&<p className={css.fine}>{t('tl.c.cat.note')}</p>}
  <div className={css.kickRow}><button type="button" className={`min-h-tap wk-kick ${css.kick}`} data-testid="timeline-start" onClick={()=>setStarted(true)}>
   <span className="wk-kick-gate" aria-hidden="true"><small>{String(copy.ticketGate)}</small><b>13</b></span>
   <span className="wk-kick-go"><span className="wk-speed" aria-hidden="true" style={{['--sx' as string]:'100%',['--sy' as string]:'50%'}}/><span>{t('tl.c.start')}</span><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" className="wga-ball-fill"/><path d="M20 11l7 5-3 8h-8l-3-8z" className="wga-ball-ink"/></svg></span>
  </button></div>
 </section>
}

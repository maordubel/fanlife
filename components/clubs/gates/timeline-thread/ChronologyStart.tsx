'use client'
import {useState,type ReactNode} from 'react'
import {LIVES} from '@/lib/game/session'
import {secondsFor} from '@/lib/game/timeline-run'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {makeT} from '../derby/ui'
import css from './threadgame.module.css'

/**
 * Gate 13 · Chronology's explicit start (§18.1): what the run is — the objective, how many placements, lives, timers —
 * and whether it is a full run or a short one, said before the first card is dealt. A link that says `play=1` (the result's
 * "play again") goes straight in; the player has already read this once.
 */
export function ChronologyStart({copy,clubName,placements,category,have,need,autoStart,children}:{copy:GameCopy;clubName:string;placements:number;category:'full'|'short';have:number;need:number;autoStart:boolean;children:ReactNode}){
 const t=makeT(copy),[started,setStarted]=useState(autoStart)
 if(started)return <>{children}</>
 return <section className={css.card} data-testid="timeline-intro" data-category={category}>
  <p className={css.kicker}>{t('tl.c.kicker',{club:clubName})}</p>
  <h2 className={css.h2}>{t('tl.c.title')}</h2>
  <p className={css.body}>{t('tl.c.intro',{n:placements})}</p>
  <ul className={css.facts}>
   <li>{t('tl.c.rule.tap')}</li>
   <li>{t('tl.c.rule.lives',{lives:LIVES})}</li>
   <li>{t('tl.c.rule.timer',{a:secondsFor(0),b:secondsFor(4),c:secondsFor(8)})}</li>
   <li>{t('tl.c.rule.score')}</li>
  </ul>
  <p className={css.tag} data-testid="timeline-category">{category==='full'?t('tl.c.cat.full',{n:placements}):t('tl.c.cat.short',{n:placements,club:clubName,have,need})}</p>
  {category==='short'&&<p className={css.fine}>{t('tl.c.cat.note')}</p>}
  <button type="button" className={`${css.cta} min-h-tap`} data-testid="timeline-start" onClick={()=>setStarted(true)}>{t('tl.c.start')}</button>
 </section>
}

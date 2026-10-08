import Link from 'next/link'
import type {ModeInfo} from '@/lib/clubs/rivalry-modes'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {makeT} from '../derby/ui'
import css from './rivalry.module.css'

/** A mode that is not open says why, with the exact counts it has and needs — and the §16.5 blocker code. Never an empty room. */
export function ModeLocked({mode,clubName,copy,otherHref,extra}:{mode:ModeInfo;clubName:string;copy:GameCopy;otherHref:string;extra?:string[]}){
 const t=makeT(copy)
 const body=mode.key==='meetings'?t('derby.lock.meetings',{club:clubName}):mode.key==='wall'?t('derby.lock.wall',{club:clubName,need:mode.need,have:mode.have}):t('derby.lock.blackfile',{club:clubName,have:mode.have,have2:mode.have2??0,need2:mode.need2??0})
 return <section className={css.card} data-tone="locked" data-testid="derby-mode-locked" data-mode={mode.key} data-blocker={mode.blocker??''}>
  <p className={css.kicker}>{t(`derby.mode.state.${mode.state}`)}</p>
  <h2 className={css.h2}>{t('derby.lock.title',{mode:t(`derby.mode.${mode.key}`)})}</h2>
  <p className={css.body}>{body}</p>
  {extra?.map((x,i)=><p key={i} className={css.fine}>{x}</p>)}
  {mode.blocker&&<p className={css.fine}><span className={css.code}>{t('derby.lock.blocker',{code:mode.blocker})}</span></p>}
  {mode.key!=='meetings'&&<Link prefetch={false} className={css.ghost} href={otherHref}>{t('derby.lock.other')}</Link>}
 </section>
}

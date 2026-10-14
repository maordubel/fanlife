'use client'
import type {ReactNode} from 'react'
import type {ClubPlayer} from '@/lib/clubs/contract'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import type {DuelCandidate} from '@/lib/clubs/polls-duel/types'
import {Mark} from './DuelFace'
import css from './duel.module.css'

type T=(k:string,v?:Record<string,string|number>)=>string
const KNOWN=['favourite','keeper','centreback','defender','midfield','striker','foreign']
export const makeKey=(pollId:string,isDebate:boolean)=>isDebate?'pc.make.debate':KNOWN.includes(pollId)?`pc.make.${pollId}`:'pc.make.debate'

type Common={winner:DuelCandidate;byId:ReadonlyMap<string,ClubPlayer>;wardrobe:RumbleWardrobe;contentLocale:string;t:T;pollId:string;prompt:string;isDebate:boolean}

/** Full time: the one question. Nothing is a vote until "yes". */
export function DuelConfirm({winner,byId,wardrobe,contentLocale,t,pollId,prompt,isDebate,decided,exhausted,more,replaces,canUndo,onYes,onMore,onBack,onUndo}:Common&{
 decided:number;exhausted:boolean;more:number;replaces:string|null;canUndo:boolean;onYes:()=>void;onMore:()=>void;onBack:()=>void;onUndo:()=>void}){
 return <section className={css.fullTime} data-testid="duel-confirm">
  <div className={css.pick}>
   <p className={css.kicker}>{t('pc.confirm.kicker')} · {t('pc.decided',{n:decided})}</p>
   <Mark cand={winner} byId={byId} wardrobe={wardrobe} big/>
   <h2 className={css.pickName} lang={contentLocale} dir="auto">{winner.title}</h2>
  </div>
  <div className={css.ftBody}>
   <p className={css.ask}>{t(makeKey(pollId,isDebate),{name:winner.title,q:prompt})}</p>
   {replaces&&<p className={css.fine} data-testid="duel-replace">{t('pc.replace',{name:replaces})}</p>}
   <div className={css.actions}>
    <button type="button" className="wk-btn red block lg min-h-tap" onClick={onYes} data-testid="duel-yes">{t('pc.yes')}</button>
    {exhausted?<p className={css.fine} data-testid="duel-exhausted">{t('pc.exhausted')}</p>
     :<button type="button" className={`${css.ghost} min-h-tap`} onClick={onMore} data-testid="duel-more">{t('pc.more',{n:more})}</button>}
    {canUndo&&<button type="button" className={`${css.ghost} min-h-tap`} onClick={onUndo}>{t('pc.var')}</button>}
    <button type="button" className={`${css.ghost} min-h-tap`} onClick={onBack} data-testid="duel-back">{t('pc.back')}</button>
   </div>
  </div>
 </section>
}

/** Sealed: the pick is on the card. */
export function DuelDone({winner,byId,wardrobe,contentLocale,t,share,fresh,onAnother,onAgain,onCard}:Omit<Common,'pollId'|'prompt'|'isDebate'>&{share:ReactNode;fresh:boolean;onAnother:()=>void;onAgain:()=>void;onCard:()=>void}){
 return <section className={css.fullTime} data-testid="duel-done">
  <div className={css.pick}>
   <span className={css.seal} data-new={fresh||undefined}>{t('pc.done.kicker')}</span>
   <Mark cand={winner} byId={byId} wardrobe={wardrobe} big/>
   <h2 className={css.pickName} lang={contentLocale} dir="auto">{winner.title}</h2>
   <p className={css.fine}>{t('pc.done.note')}</p>
  </div>
  <div className={css.ftBody}>
   {share}
   <div className={css.actions}>
    <button type="button" className={`${css.ghost} min-h-tap`} onClick={onCard}>{t('pc.card')}</button>
    <button type="button" className={`${css.ghost} min-h-tap`} onClick={onAnother}>{t('pc.next')}</button>
    <button type="button" className={`${css.ghost} min-h-tap`} onClick={onAgain}>{t('pc.again')}</button>
   </div>
  </div>
 </section>
}

'use client'
import {useState} from 'react'
import {gameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {encodeDuel} from '@/lib/clubs/rumble-duel'
import {tr} from './shared'
import s from './rumble.module.css'

/** After the whistle: put this five in a link. Whoever opens it plays for any club he likes against these five men. */
export function RumbleChallenge({club,seed,picks,locale}:{club:string;seed:number;picks:string[];locale:UiLocale}){
 const copy=gameCopy(locale),[state,setState]=useState<'idle'|'copied'|'failed'>('idle'),[url,setUrl]=useState('')
 async function share(){
  const link=`${window.location.origin}/clubs/${club}/royal-rumble?duel=${encodeDuel({c:club,s:seed,p:picks})}${locale==='en'?'':`&lang=${locale}`}`
  setUrl(link)
  try{
   if(typeof navigator.share==='function'){await navigator.share({url:link,text:tr(copy,'rr.challenge')});setState('copied');return}
   await navigator.clipboard.writeText(link);setState('copied')
  }catch{setState('failed')}
 }
 return <div className={s.challenge} data-testid="rumble-challenge">
  <button type="button" className={`${s.chip} min-h-tap`} onClick={()=>void share()}>{tr(copy,'rr.challenge')}</button>
  <p className={`${s.mono} ${s.challengeNote}`} role="status">{state==='copied'?tr(copy,'rr.challengeCopied'):state==='failed'?tr(copy,'rr.challengeFail'):tr(copy,'rr.challengeHint')}</p>
  {state==='failed'&&url&&<a className={s.challengeLink} href={url} dir="ltr">{url}</a>}
 </div>
}

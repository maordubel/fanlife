'use client'
import {useState,useTransition} from 'react'
import {playRumble} from '@/app/clubs/[slug]/[gate]/gate-actions'
import {gameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import type {RumbleCard} from '@/lib/clubs/rumble'
const BUDGET=15
export function RumbleBoard({draft,club,version,seed,locale}:{draft:RumbleCard[][];club:string;version:string;seed:number;locale:UiLocale}) {
 const copy=gameCopy(locale),[picks,setPicks]=useState<(string|null)[]>(draft.map(()=>null)),[res,setRes]=useState<Awaited<ReturnType<typeof playRumble>>>(null),[pending,start]=useTransition()
 const cost=picks.reduce((s,id,i)=>s+(draft[i]!.find(c=>c.id===id)?.price||0),0),done=picks.every(Boolean),over=cost>BUDGET
 return <section className="game-panel mag-card" data-testid="rumble">
  <p className="mag-kicker">{copy.rumbleSub}</p>
  <p className="mag-bowl" style={{fontSize:24}} aria-live="polite">{copy.rumbleBudget} {cost}/{BUDGET}{over&&` · ${copy.rumbleOver}`}</p>
  {draft.map((cards,i)=><fieldset className="mag-chips" key={i}><legend className="mag-kicker">{copy.rumbleSlot} {i+1} · {cards[0]?.position}</legend>
   {cards.map(c=><button key={c.id} type="button" disabled={!!res} className="mag-chip min-h-tap" aria-pressed={picks[i]===c.id} onClick={()=>setPicks(p=>p.map((x,j)=>j===i?c.id:x))}><bdi>{c.name}</bdi><b className="mag-price">{c.price}</b></button>)}
  </fieldset>)}
  {!res?<button className="mag-cta min-h-tap" type="button" disabled={!done||over||pending} onClick={()=>start(async()=>setRes(await playRumble(club,version,seed,picks as string[])))}>{copy.rumbleKickoff}<span>→</span></button>
   :<div aria-live="polite"><p className="mag-bowl" style={{fontSize:26}}>{res.goals[0]}–{res.goals[1]} · {res.verdict==='win'?copy.rumbleWin:res.verdict==='draw'?copy.rumbleDraw:copy.rumbleLoss}</p>
    <p className="mag-kicker">{copy.rumbleYou}</p><p><bdi>{res.you.names.join(' · ')}</bdi></p><p className="mag-kicker">{copy.rumbleRival}</p><p><bdi>{res.rival.names.join(' · ')}</bdi></p><p>{copy.rumbleNote}</p>
    <a className="mag-cta red min-h-tap" href={`?lang=${locale}&seed=${seed+1}`}>{copy.rumbleAgain}<span>→</span></a></div>}
 </section>
}

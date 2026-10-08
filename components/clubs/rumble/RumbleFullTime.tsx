'use client'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {ShowPlayer,ShowScript} from '@/lib/clubs/rumble-show'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {Bulbs,RumbleShirt,money,posShort,shortName,tr,years} from './shared'
import {findPlayer} from './RumbleStage'
import s from './rumble.module.css'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {rumbleShare} from '@/lib/share/v3/adapters'

export type RecentRound={seed:number;cost:number;us:number;them:number;r:'W'|'D'|'L'}

/** The full-time board (port of RumbleFullTime): score, who scored and when, man of the match, two lines of story — all read from the script. */
export function RumbleFullTime({script,copy,wardrobe,againHref,recent,club,seed}:{script:ShowScript;copy:GameCopy;wardrobe:RumbleWardrobe;againHref:string;recent:RecentRound[];club?:string;seed?:number}){
 const f=script.final,goals=script.events.filter(e=>e.type==='goal')
 const verdict=f.winner==='us'?'won':f.winner==='draw'?'drew':'lost'
 const mvp=findPlayer(script,script.motm.side,script.motm.id)
 const m=script.motm,reason=m.goals>=2?tr(copy,'rr.motmGoals',{n:m.goals}):m.goals===1?tr(copy,'rr.motmGoal'):m.saves>1?tr(copy,'rr.motmSaves',{n:m.saves}):m.saves===1?tr(copy,'rr.motmSave'):m.assists>0?tr(copy,'rr.motmAssist'):tr(copy,'rr.motmRan')
 const first=goals[0],last=goals[goals.length-1],scoreTxt=`${f.us}–${f.them}`
 const summary=!first?tr(copy,'rr.summaryNone'):f.winner==='draw'?tr(copy,'rr.summaryLevel',{name:shortName(findPlayer(script,first.side,first.player)?.name||''),minute:first.minute,score:scoreTxt}):tr(copy,'rr.summaryDecided',{name:shortName(findPlayer(script,last!.side,last!.player)?.name||''),minute:last!.minute,score:scoreTxt})
 const row=(p:ShowPlayer)=><div className={s.row} key={p.side+p.id} data-motm={p.side===m.side&&p.id===m.id}>
  <RumbleShirt card={p} side={p.side} wardrobe={wardrobe}/>
  <p><b dir="auto">{p.name}</b><small className={s.mono} dir="ltr">{posShort(copy,p.position)} · {years(copy,p)}</small></p>
  <span dir="ltr">{money(p.price)}</span>
 </div>
 return <div className={s.game} data-phase="show" data-testid="rumble-result" data-verdict-rumble={verdict}>
  <section className={s.stage}>
   <Bulbs n={15} className={`${s.bulbs} ${s.stageBulbs}`}/>
   <p className={`${s.mono} ${s.stageKicker}`} style={{marginTop:10}}>{tr(copy,'rr.ftKicker')}</p>
   <p className={s.ftScore} dir="ltr" data-testid="rumble-final">{scoreTxt}</p>
   <div className={s.ftRule}/>
   <h2 className={s.stageTitle}>{tr(copy,`rr.${verdict}`)}</h2>
   <p className={s.stageLine}>{tr(copy,`rr.${verdict}Body`)}</p>
   {goals.length>0&&<ul className={s.scorers}>{goals.map(g=>{const p=findPlayer(script,g.side,g.player),a=findPlayer(script,g.side,g.assist);return <li key={g.id} data-side={g.side}><bdi dir="ltr">{g.minute}′</bdi><span dir="auto">{p?shortName(p.name):''}</span>{a&&<small>{tr(copy,'rr.assist',{name:shortName(a.name)})}</small>}</li>})}</ul>}
   {mvp&&<div className={s.motm}><p className={`${s.mono} ${s.stageKicker}`}>{tr(copy,'rr.motm')}</p><b dir="auto">{mvp.name}</b><p style={{fontSize:12,opacity:.75}}>{reason}</p></div>}
   <p className={s.summary}>{summary}</p>
   <p className={s.secret}>{tr(copy,'rr.secret')}</p>
   {club&&seed!==undefined&&<ShareComposer draft={rumbleShare(club,{seed,us:f.us,them:f.them,five:script.us.map(p=>({position:String(p.position),name:shortName(p.name)})),bill:money(script.bills.us)})}/>}
  </section>
  <div className={s.fives}>
   <section className={s.five} data-side="us"><div className={s.fiveHead}><p><span className={`${s.mono} ${s.stageKicker}`} style={{display:'block'}}>{tr(copy,'rr.bill')} {money(script.bills.us)}</span><b>{tr(copy,'rr.yourFive')}</b></p></div>{script.us.map(row)}</section>
   <section className={s.five} data-side="them"><div className={s.fiveHead}><p><span className={`${s.mono} ${s.stageKicker}`} style={{display:'block'}}>{tr(copy,'rr.bill')} {money(script.bills.them)}</span><b>{tr(copy,'rr.theirFive')}</b></p></div>{script.them.map(row)}</section>
  </div>
  <a className={`${s.again} min-h-tap`} href={againHref} data-testid="rumble-again"><span><small className={s.mono}>{tr(copy,'rr.againSub')}</small><strong>{tr(copy,'rr.again')}</strong></span><span aria-hidden="true">→</span></a>
  <section className={s.recent}>
   <p className={`${s.mono} ${s.stageKicker}`} style={{color:'var(--club-primary)'}}>{tr(copy,'rr.recent')}</p>
   {recent.length<=1?<p style={{fontSize:13,marginTop:4,opacity:.7}}>{tr(copy,'rr.recentEmpty')}</p>:<ol>{recent.map(r=><li key={r.seed}><b data-r={r.r}>{tr(copy,`rr.${r.r}`)}</b><span className={s.mono} dir="ltr">{money(r.cost)}</span><span className={s.mono} dir="ltr">{r.us}–{r.them}</span></li>)}</ol>}
  </section>
 </div>
}

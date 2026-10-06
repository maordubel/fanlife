'use client'
import {useState,useTransition} from 'react'
import {gradeClubGoal,clubGoalCount} from '@/app/clubs/[slug]/[gate]/gate-actions'
import {gameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {COLS,ROWS,zoneParts} from '@/lib/game/goal-zones'
import {REPLAY_ACTIONS} from '@/lib/game/replay/vocab'

type Item={id:string;title:string;subtitle:string;competition:string;opponent:string;score:string;on:string|null;pool:string[]}
type Touch={actor:string;action:string;zone:string}
type Verdict=NonNullable<Awaited<ReturnType<typeof gradeClubGoal>>>
const MAX=5
/* Board geometry — one half of a pitch, the goal at the top, twenty zones (5 across × 4 deep). */
const W=300,H=400,X0=13,Y0=40,CW=55,CH=86
const centre=(z:string)=>{const p=zoneParts(z);return p?{x:X0+p.col*CW+CW/2,y:Y0+p.row*CH+CH/2}:{x:W/2,y:H/2}}

function Path({touches,tone,dashed}:{touches:{zone:string}[];tone:string;dashed?:boolean}){
 // two touches in one zone sit side by side, never on top of each other
 const pts=touches.map((t,i)=>{const c=centre(t.zone),k=touches.slice(0,i).filter(x=>x.zone===t.zone).length;return {x:c.x+k*18,y:c.y-k*6}})
 return <g>
  {pts.slice(1).map((p,i)=><line key={i} x1={pts[i]!.x} y1={pts[i]!.y} x2={p.x} y2={p.y} stroke={tone} strokeWidth={5} strokeDasharray={dashed?'9 7':undefined} strokeLinecap="round"/>)}
  {pts.length>0&&<line x1={pts[pts.length-1]!.x} y1={pts[pts.length-1]!.y} x2={W/2} y2={Y0-14} stroke={tone} strokeWidth={5} strokeDasharray="2 9" strokeLinecap="round"/>}
  {pts.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r={14} fill={tone} stroke="var(--mag-ink)" strokeWidth={3}/><text x={p.x} y={p.y+6} textAnchor="middle" fontFamily="var(--mag-mono)" fontWeight={700} fontSize={16} fill="var(--mag-white)">{i+1}</text></g>)}
 </g>
}

/**
 * Gate 8 for any club. The Worker's rule stands: a goal is rebuilt in the reporter's own terms — a man,
 * a verb, a zone — never a pixel. The board shows the fixture and a room of names; the server grades.
 */
export function GoalBoard({items,club,version,seed,locale,contentLocale}:{items:Item[];club:string;version:string;seed:number;locale:UiLocale;contentLocale:string}){
 const copy=gameCopy(locale),[n,setN]=useState(0),[touches,setTouches]=useState<Touch[]>([]),[actor,setActor]=useState<string|null>(null),[action,setAction]=useState<string|null>(null)
 const [res,setRes]=useState<Verdict|null>(null),[count,setCount]=useState<number|null>(null),[err,setErr]=useState(false),[pending,start]=useTransition()
 const g=items[n%items.length]!,ready=actor!==null&&action!==null&&touches.length<MAX&&!res
 const place=(zone:string)=>{if(!ready)return;setTouches(t=>[...t,{actor:actor!,action:action!,zone}]);setActor(null);setAction(null)}
 const whistle=()=>start(async()=>{const r=await gradeClubGoal(club,version,g.id,seed,touches);setErr(!r);setRes(r)})
 const hint=()=>start(async()=>setCount(await clubGoalCount(club,version,g.id)))
 const next=()=>{setN(n+1);setTouches([]);setActor(null);setAction(null);setRes(null);setCount(null);setErr(false)}
 const act=(a:string)=>copy[`act.${a}` as 'act.pass']||a
 return <section className="game-panel mag-card goal-board" data-testid="goal-board">
  <p className="mag-kicker">{copy.goalSub}</p>
  <h2 className="mag-h2" style={{fontSize:24,marginBlock:8}}><bdi lang={contentLocale} dir="auto">{g.title}</bdi></h2>
  <p className="mag-fine"><bdi lang={contentLocale} dir="auto">{[g.subtitle||g.on,g.competition,g.score].filter(Boolean).join(' · ')}</bdi></p>
  <div className="goal-layout">
   <figure className="goal-pitch" aria-label={copy.goalPitch}>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true">
     <rect width={W} height={H} fill="var(--mag-green)"/>
     {ROWS.map((_,i)=><rect key={i} x={0} y={Y0+i*CH} width={W} height={CH/2} fill="var(--mag-ink)" opacity={0.06}/>)}
     <rect x={X0} y={Y0} width={CW*5} height={CH*4} fill="none" stroke="var(--mag-white)" strokeWidth={3}/>
     <rect x={X0+CW} y={Y0} width={CW*3} height={CH*0.95} fill="none" stroke="var(--mag-white)" strokeWidth={3}/>
     <rect x={X0+CW*1.8} y={Y0} width={CW*1.4} height={CH*0.38} fill="none" stroke="var(--mag-white)" strokeWidth={3}/>
     <path d={`M${W/2-46} ${Y0+CH*4} A46 46 0 0 1 ${W/2+46} ${Y0+CH*4}`} fill="none" stroke="var(--mag-white)" strokeWidth={3}/>
     <rect x={W/2-34} y={Y0-22} width={68} height={22} fill="var(--mag-white)" stroke="var(--mag-ink)" strokeWidth={3}/>
     {res?<><Path touches={touches} tone="var(--mag-navy)" dashed/><Path touches={res.truth} tone="var(--mag-vermilion)"/></>:<Path touches={touches} tone="var(--mag-navy)"/>}
    </svg>
    <div className="goal-zones" role="group" aria-label={copy.goalWhere}>{ROWS.flatMap(r=>COLS.map(c=>{const z=`${c}${r}`;return <button key={z} type="button" className="goal-zone" data-zone={z} disabled={!ready} onClick={()=>place(z)} aria-label={`${copy.goalWhere}: ${z}`}/>}))}</div>
   </figure>
   <div className="goal-controls">
    {!res&&<>
     <p className="mag-mono" aria-live="polite">{copy.goalTouch} {Math.min(touches.length+1,MAX)}/{MAX}{count!==null?` · ${copy.goalHintCountIs.replace('{n}',String(count))}`:''}</p>
     <fieldset className="mag-chips"><legend className="mag-kicker">{copy.goalWho}</legend>{g.pool.map(p=><button key={p} type="button" className="mag-chip min-h-tap" aria-pressed={actor===p} onClick={()=>setActor(p)}><bdi lang={contentLocale} dir="auto">{p}</bdi></button>)}<button type="button" className="mag-chip min-h-tap" aria-pressed={actor===''} onClick={()=>setActor('')}>{copy.goalUnnamed}</button></fieldset>
     <fieldset className="mag-chips"><legend className="mag-kicker">{copy.goalWhat}</legend>{REPLAY_ACTIONS.map(a=><button key={a} type="button" className="mag-chip min-h-tap" aria-pressed={action===a} onClick={()=>setAction(a)}>{act(a)}</button>)}</fieldset>
     <p className="mag-fine" aria-live="polite">{ready?copy.goalWhere:touches.length<MAX?copy.goalPickFirst:''}</p>
     {touches.length>0&&<ol className="goal-list goal-verdicts">{touches.map((t,i)=><li key={i}><b>{i+1}</b><div><bdi className="goal-name" lang={contentLocale} dir="auto">{t.actor||copy.goalUnnamed}</bdi><span className="goal-meta"><span>{act(t.action)}</span><span className="mag-mono">{t.zone}</span></span></div></li>)}</ol>}
     <div className="goal-actions">
      {touches.length>0&&<button type="button" className="mag-chip min-h-tap" onClick={()=>setTouches(t=>t.slice(0,-1))}>{copy.goalUndo}</button>}
      {count===null&&<button type="button" className="mag-chip min-h-tap" disabled={pending} onClick={hint}>{copy.goalHintCount}</button>}
     </div>
     {err&&<p role="alert">{copy.unavailable}</p>}
     <button className="mag-cta min-h-tap" type="button" disabled={!touches.length||pending} onClick={whistle}>{copy.goalWhistle}<span>→</span></button>
    </>}
    {res&&<div aria-live="polite">
     <p className="mag-bowl" style={{fontSize:30}}>{copy.goalPoints}: {res.points}/{res.max}</p>
     <p className="mag-kicker">{res.countRight?copy.goalCountRight:copy.goalCountWrong}</p>
     <p className="goal-legend"><span className="yours">{copy.goalYours}</span> <span className="archive">{copy.goalArchive}</span></p>
     <ol className="goal-list goal-verdicts">{res.truth.map((t,i)=>{const v=res.steps[i]!,mark=(ok:boolean)=><span className="goal-mark" data-ok={ok}>{ok?'✓':'✗'}</span>;return <li key={i}><b>{i+1}</b><div><bdi className="goal-name" lang={contentLocale} dir="auto">{t.actor||copy.goalUnnamed}</bdi><span className="goal-meta"><span>{act(t.action)}</span><span className="mag-mono">{t.zone}</span></span><span className="goal-meta">{copy.goalWho} {mark(v.actor)} {copy.goalWhat} {mark(v.action)} <span data-zone={v.zone}>{v.zone==='exact'?copy.goalExact:v.zone==='near'?copy.goalNear:copy.goalMiss}</span></span>{t.note&&<small lang={contentLocale} dir="auto">{t.note}</small>}</div></li>})}</ol>
     {res.narrative&&<p lang={contentLocale} dir="auto">{res.narrative}</p>}
     {res.sources.map(s=>s.url?<p key={s.title} className="mag-fine"><a href={s.url} target="_blank" rel="noreferrer">{copy.goalSource}: <bdi>{s.title}</bdi> ↗</a></p>:<p key={s.title} className="mag-fine">{copy.goalSource}: <bdi>{s.title}</bdi></p>)}
     <p className="mag-fine">{copy.goalApprox}</p>
     <button className="mag-cta red min-h-tap" type="button" onClick={next}>{copy.goalNext}<span>→</span></button>
    </div>}
   </div>
  </div>
 </section>
}

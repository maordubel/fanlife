'use client'
import {useState} from 'react'
import type {PublicQuestion} from '@/lib/game/questions/types'
import {haptic} from '@/lib/play/haptics'
import css from './trivia.module.css'

/**
 * The six ways to answer (choice, multi, true/false, year, order, pairs) — the Worker's dedicated controls, drawn
 * as answer tickets in the magazine's ink. They know nothing about the club or the archive: they take the dealt
 * options, report ONE committed answer, and after grading draw what the server said was right. An answer is never
 * known on the client before the player commits (rule 4). A tap path exists for every control (WCAG 2.5.7).
 */
export type Graded={correct:boolean;correctAnswers:string[]}
export type AnswerLabels={
 multiCount:(n:number,of:number)=>string;order:{yours:string;empty:string;bank:string;truth:string;slot:(n:number)=>string}
 match:{left:string;right:string;was:string;help:string};year:string;right:string;wrong:string;struck:string;confirm:string
 true:string;false:string
}
type Props={q:PublicQuestion;locked:boolean;graded:Graded|null;struck:string[];contentLocale:string;labels:AnswerLabels;onAnswer:(v:string|string[])=>void}

export function Answers(p:Props){
 const {q}=p
 if(q.type==='tf')return <TrueFalse {...p}/>
 if(q.type==='year')return <Choices {...p} scale/>
 if(q.type==='order')return <Order {...p}/>
 if(q.type==='match')return <Pairs {...p}/>
 return <Choices {...p} multi={q.type==='multi'}/>
}

const Mark=({state}:{state:'right'|'wrong'|'picked'|null})=><span className={css.mark} data-state={state??'none'} aria-hidden="true">{state==='right'?'✓':state==='wrong'?'✗':state==='picked'?'●':''}</span>

function Choices({q,locked,graded,struck,contentLocale,labels,onAnswer,multi=false,scale=false}:Props&{multi?:boolean;scale?:boolean}){
 const [picked,setPicked]=useState<string[]>([]),want=multi?q.pickCount:1
 const tap=(o:string)=>{
  if(locked||struck.includes(o))return
  haptic('tap')
  if(!multi){setPicked([o]);onAnswer(o);return}
  setPicked(cur=>cur.includes(o)?cur.filter(x=>x!==o):cur.length<want?[...cur,o]:cur)
 }
 return <div className={css.answers} data-kind={scale?'year':multi?'multi':'mcq'}>
  {multi&&<p className={css.how} aria-live="polite">{labels.multiCount(picked.length,want)}</p>}
  <ul className={scale?css.scale:css.choices} role={scale?'group':undefined} aria-label={scale?labels.year:undefined}>
   {q.options.map(o=>{
    const right=graded?graded.correctAnswers.includes(o):null,mine=picked.includes(o),gone=struck.includes(o)
    const state=graded?(right?'right':mine?'wrong':null):mine?'picked':null
    return <li key={o}><button type="button" className={css.choice} data-state={state??'none'} data-gone={gone||undefined} aria-pressed={multi?mine:undefined} disabled={locked||gone} onClick={()=>tap(o)}>
     <Mark state={state}/>
     <span className={css.choiceText} lang={contentLocale} dir="auto" style={gone?{textDecoration:'line-through'}:undefined}>{o}</span>
     {graded&&right&&<span className="sr-only">{labels.right}</span>}{graded&&!right&&mine&&<span className="sr-only">{labels.wrong}</span>}{gone&&<span className="sr-only">{labels.struck}</span>}
    </button></li>
   })}
  </ul>
  {multi&&!graded&&<button type="button" className={css.confirm} disabled={locked||picked.length!==want} onClick={()=>onAnswer(picked)}>{labels.confirm}</button>}
 </div>
}

function TrueFalse({locked,graded,labels,onAnswer}:Props){
 const [picked,setPicked]=useState<string|null>(null)
 return <div className={css.answers} data-kind="tf"><ul className={css.tf}>
  {(['true','false'] as const).map(v=>{
   const right=graded?graded.correctAnswers.includes(v):null,mine=picked===v,state=graded?(right?'right':mine?'wrong':null):mine?'picked':null
   return <li key={v}><button type="button" className={css.choice} data-state={state??'none'} data-big="true" disabled={locked} onClick={()=>{if(locked)return;haptic('tap');setPicked(v);onAnswer(v)}}>
    <Mark state={state??null}/><span className={css.choiceText}>{v==='true'?labels.true:labels.false}</span>
    {graded&&right&&<span className="sr-only">{labels.right}</span>}</button></li>
  })}
 </ul></div>
}

function Order({q,locked,graded,contentLocale,labels,onAnswer}:Props){
 const [placed,setPlaced]=useState<string[]>([]),bank=q.options.filter(o=>!placed.includes(o))
 return <div className={css.answers} data-kind="order">
  <ol className={css.slots} aria-label={labels.order.yours}>
   {q.options.map((_,i)=>{
    const item=placed[i],truth=graded?.correctAnswers[i],ok=graded&&item!==undefined?item===truth:null
    return <li key={i} className={css.slotRow}><span className={css.slotNo} aria-hidden="true">{i+1}</span>
     <button type="button" className={css.slot} data-state={item===undefined?'empty':ok===null?'picked':ok?'right':'wrong'} disabled={locked||item===undefined} onClick={()=>{haptic('tap');setPlaced(placed.filter((_,at)=>at!==i))}} aria-label={item===undefined?`${labels.order.slot(i+1)}: ${labels.order.empty}`:undefined}>
      <span lang={contentLocale} dir="auto">{item??labels.order.empty}</span>
      {graded&&item!==undefined&&<><span aria-hidden="true">{ok?'✓':'✗'}</span><span className="sr-only">{ok?labels.right:labels.wrong}</span></>}
     </button></li>
   })}
  </ol>
  {!graded&&bank.length>0&&<><p className={css.how}>{labels.order.bank}</p><div className={css.bank}>{bank.map(o=><button key={o} type="button" className={css.chipBtn} disabled={locked} onClick={()=>{haptic('tap');setPlaced([...placed,o])}}><span lang={contentLocale} dir="auto">{o}</span></button>)}</div></>}
  {graded&&!graded.correct&&<p className={css.how}><b>{labels.order.truth}</b> <bdi lang={contentLocale}>{graded.correctAnswers.join(' → ')}</bdi></p>}
  {!graded&&<button type="button" className={css.confirm} disabled={locked||placed.length!==q.options.length} onClick={()=>onAnswer(placed)}>{labels.confirm}</button>}
 </div>
}

function Pairs({q,locked,graded,contentLocale,labels,onAnswer}:Props){
 const left=q.left??[],[active,setActive]=useState<string|null>(left[0]??null),[pairs,setPairs]=useState<Record<string,string>>({}),used=new Set(Object.values(pairs))
 const pickLeft=(item:string)=>{
  if(locked)return;haptic('tap')
  if(pairs[item]!==undefined){const next={...pairs};delete next[item];setPairs(next);setActive(item);return}
  setActive(active===item?null:item)
 }
 const pickRight=(v:string)=>{
  if(locked||active===null||used.has(v))return;haptic('tap')
  const next={...pairs,[active]:v};setPairs(next);setActive(left.find(l=>next[l]===undefined)??null)
 }
 const done=left.length>0&&left.every(l=>pairs[l]!==undefined)
 return <div className={css.answers} data-kind="match">
  <div className={css.pairs}>
   <ul className={css.pairCol} aria-label={labels.match.left}>
    {left.map((item,i)=>{
     const mine=pairs[item],truth=graded?.correctAnswers[i],ok=graded&&mine!==undefined?mine===truth:null
     return <li key={item}><button type="button" className={css.pairLeft} data-active={active===item||undefined} data-state={ok===null?'none':ok?'right':'wrong'} disabled={locked} aria-pressed={active===item} onClick={()=>pickLeft(item)}>
      <span lang={contentLocale} dir="auto">{item}</span>
      {mine!==undefined&&<small><span aria-hidden="true">{graded?(ok?'✓ ':'✗ '):'↔ '}</span><bdi lang={contentLocale}>{mine}</bdi></small>}
      {graded&&ok===false&&truth!==undefined&&<small>{labels.match.was} <bdi lang={contentLocale}>{truth}</bdi></small>}
     </button></li>
    })}
   </ul>
   <ul className={css.pairCol} aria-label={labels.match.right}>
    {q.options.map(v=><li key={v}><button type="button" className={css.pairRight} disabled={locked||used.has(v)||active===null} onClick={()=>pickRight(v)}><bdi lang={contentLocale}>{v}</bdi></button></li>)}
   </ul>
  </div>
  {!graded&&<p className={css.how}>{labels.match.help}</p>}
  {!graded&&<button type="button" className={css.confirm} disabled={locked||!done} onClick={()=>onAnswer(left.map(l=>pairs[l]!))}>{labels.confirm}</button>}
 </div>
}

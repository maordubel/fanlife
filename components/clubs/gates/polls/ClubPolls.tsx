'use client'
import Link from 'next/link'
import {useEffect,useMemo,useRef,useState} from 'react'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {firePickFxAt} from '@/components/stage/PickFx'
import {ClubShirt} from '@/components/clubs/stage/ClubShirt'
import {tr} from '@/components/clubs/rumble/shared'
import {SupporterCard,answerOf} from './SupporterCard'
import {ChoicePicker,NumberPicker,PlayerPicker,PositionPicker} from './Picker'
import type {ClubPlayer} from '@/lib/clubs/contract'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import type {ClubPoll} from '@/lib/clubs/polls'
import {pollKey,xiKey} from '@/lib/clubs/activity'
import {completeRun} from '@/lib/clubs/completion'
import {markStep} from '@/lib/analytics/meter'
import {SLIP,clearPick,debatesDone,emptySlip,filled,isComplete,nextOpen,questionOf,reasonsOf,setPick,setReason,shareText,slipKey,typeName,validateSlip,validateVotes,xiIds,type Slip} from '@/lib/clubs/polls-model'
import css from './polls.module.css'

type Tab='card'|'debates'
type Sheet=null|{kind:'player'|'number'|'position'|'debate'|'card';id:string}
export type ClubPollsProps={players:ClubPlayer[];debates:ClubPoll[];club:string;clubName:string;version:string;seed:number;cursor:number;locale:UiLocale;contentLocale:string;wardrobe:RumbleWardrobe;copy:GameCopy}

const readJSON=(key:string):unknown=>{try{const raw=localStorage.getItem(key);return raw&&raw.length<20000?JSON.parse(raw):null}catch{return null}}

/** Gate 7 · the Terrace vote: a printed ballot slip with eight lines, a supporter card read back from it, and open debates. */
export function ClubPolls({players,debates,club,clubName,version,seed,cursor,locale,contentLocale,wardrobe,copy}:ClubPollsProps){
 const t=(k:string,v?:Record<string,string|number>)=>tr(copy,k,v)
 const byId=useMemo(()=>new Map(players.map(p=>[p.id,p])),[players])
 const [tab,setTab]=useState<Tab>('card'),[slip,setSlip]=useState<Slip>(emptySlip),[votes,setVotes]=useState<Record<string,string>>({}),[loaded,setLoaded]=useState(false)
 const [mine,setMine]=useState<ReadonlySet<string>>(()=>new Set()),[sheet,setSheet]=useState<Sheet>(null),[why,setWhy]=useState<string|null>(null),[aim,setAim]=useState<string|null>(null),[notice,setNotice]=useState('')
 const opener=useRef<HTMLElement|null>(null),touched=useRef(false),wasComplete=useRef(false)

 useEffect(()=>{
  setSlip(validateSlip(readJSON(slipKey(club)),players));setVotes(validateVotes(readJSON(pollKey(club)),debates));setMine(new Set(xiIds(readJSON(xiKey(club)),players)))
  setLoaded(true)
 },[club,players,debates])
 useEffect(()=>{if(loaded&&!touched.current)setAim(nextOpen(slip))},[loaded,slip])
 useEffect(()=>{if(!loaded)return;try{localStorage.setItem(slipKey(club),JSON.stringify(slip))}catch{setNotice(copy.savedUnavailable)}},[slip,loaded,club,copy.savedUnavailable])
 useEffect(()=>{if(loaded&&isComplete(slip)){wasComplete.current=true;completeRun(club,'polls',`terrace:${version}`)}},[loaded,slip,club,version])
 useEffect(()=>{if(loaded&&debatesDone(votes,debates))completeRun(club,'polls',`polls:${version}:${seed}:${cursor}`)},[loaded,votes,debates,club,version,seed,cursor])
 useEffect(()=>{
  if(!aim||!touched.current)return
  const row=document.querySelector(`[data-q="${aim}"]`),calm=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  row?.scrollIntoView?.({block:'nearest',behavior:calm?'auto':'smooth'})
 },[aim])

 const word=(qid:string)=>answerOf(slip,qid,byId,t)
 const openSheet=(s:NonNullable<Sheet>)=>(e:React.SyntheticEvent)=>{opener.current=e.currentTarget as HTMLElement;touched.current=true;setSheet(s)}
 const closeSheet=()=>{setSheet(null);setNotice('');opener.current?.focus?.()}
 function choose(qid:string,value:string,from:HTMLElement|null){
  const was=isComplete(slip),next=setPick(slip,qid,value)
  touched.current=true;setSlip(next);setWhy(null);setAim(nextOpen(next,qid));setSheet(null);setNotice('');markStep(filled(next))
  window.requestAnimationFrame(()=>{const row=document.querySelector(`[data-q="${qid}"]`);firePickFxAt(row??from,{label:answerOf(next,qid,byId,t)??undefined})})
  if(!was&&isComplete(next))window.setTimeout(()=>{opener.current=null;setSheet({kind:'card',id:'card'})},650)
 }
 function vote(id:string,choice:string,from:HTMLElement|null){
  const next={...votes,[id]:choice};setVotes(next);setSheet(null);touched.current=true
  try{const previous=readJSON(pollKey(club));localStorage.setItem(pollKey(club),JSON.stringify({...(previous&&typeof previous==='object'&&!Array.isArray(previous)?previous:{}),...next}))}catch{setNotice(copy.savedUnavailable)}
  window.requestAnimationFrame(()=>firePickFxAt(document.querySelector(`[data-debate="${id}"]`)??from,{}))
 }

 async function share(){
  const rows=SLIP.map(q=>({label:t(`tv.q.${q.id}`),value:word(q.id)??'—'}))
  const text=shareText({club:clubName,title:t('tv.share.title'),name:slip.name.trim(),rows,url:`${location.origin}/clubs/${club}/polls`})
  try{
   if(typeof navigator.share==='function'){await navigator.share({title:t('tv.share.title'),text});setNotice(t('tv.shared'))}
   else{await navigator.clipboard.writeText(text);setNotice(t('tv.copied'))}
  }catch(e){if((e as Error)?.name!=='AbortError')setNotice(t('tv.shareFail'))}
 }

 const n=filled(slip),done=n===SLIP.length,q=sheet&&sheet.kind!=='debate'&&sheet.kind!=='card'?questionOf(sheet.id):undefined,deb=sheet?.kind==='debate'?debates.find(d=>d.id===sheet.id):undefined
 const posLabel=(p:string)=>copy[p]??p
 const honest=<aside className={css.honest} aria-label={t('tv.honest.title')}><b>{t('tv.honest.title')}</b><p>{t('tv.honest.body')}</p></aside>
 const cardView=<>
  <SupporterCard slip={slip} byId={byId} wardrobe={wardrobe} clubName={clubName} contentLocale={contentLocale} t={t} editable onName={v=>setSlip(s=>({...s,name:typeName(v)}))}/>
  {honest}
 </>

 const slipView=<ol className={css.slip} data-testid="polls-slip">
  {SLIP.map((row,i)=>{
   const answer=word(row.id),kind=row.kind,p=kind==='player'&&slip.picks[row.id]?byId.get(slip.picks[row.id]!):null,reason=slip.reasons[row.id]
   return <li key={row.id} className={css.line} data-q={row.id} data-done={answer!==null} data-aim={aim===row.id&&answer===null}>
    <button type="button" className={css.lineMain} aria-label={answer?t('tv.row.aria',{q:t(`tv.q.${row.id}`),a:answer}):t('tv.row.ariaEmpty',{q:t(`tv.q.${row.id}`)})} data-testid={`polls-line-${row.id}`} onClick={openSheet({kind:kind==='player'?'player':kind,id:row.id})}>
     <span className={css.lineNo} aria-hidden="true">{i+1}</span>
     <span className={css.lineText}>
      <span className={css.latin} aria-hidden="true">{row.latin}</span>
      <span className={css.ask}>{t(`tv.q.${row.id}`)}</span>
      {!answer&&<span className={css.sub}>{t(`tv.sub.${row.id}`)}</span>}
      {answer&&reason&&<span className={css.reasonLine}>{t(`tv.why.${row.id}.${reason}`)}</span>}
     </span>
     <span className={css.mark} data-empty={answer===null}>
      {p&&<span className={css.markShirt}><ClubShirt player={p} wardrobe={wardrobe} side="us"/></span>}
      <span className={css.stamp} data-empty={answer===null} lang={kind==='player'?contentLocale:undefined} dir="auto">{answer??t('tv.row.empty')}</span>
     </span>
    </button>
    {answer&&<button type="button" className={css.whyBtn} aria-expanded={why===row.id} onClick={()=>setWhy(w=>w===row.id?null:row.id)}>{t('tv.why.open')}</button>}
    {answer&&why===row.id&&<div className={css.whyRow} role="group" aria-label={t('tv.why.label')}>
     {reasonsOf(row.id).map(r=><button key={r} type="button" className={css.chip} aria-pressed={reason===r} onClick={()=>setSlip(s=>setReason(s,row.id,r))}>{t(`tv.why.${row.id}.${r}`)}</button>)}
     <button type="button" className={css.chip} onClick={()=>{setSlip(s=>clearPick(s,row.id));setWhy(null)}}>{t('tv.clear')}</button>
    </div>}
   </li>
  })}
 </ol>

 const answered=debates.filter(d=>votes[d.id]!==undefined).length
 const debateView=<div className={css.debates} data-testid="polls-debates">
  <div className={css.paperHead}><p className={css.kicker}>{t('tv.deb.round',{n:cursor+1})}</p><h2 className={css.paperTitle}>{t('tv.deb.title')}</h2><p className={css.fine}>{t('tv.deb.sub')}</p></div>
  {debates.length===0?<p className={css.empty}>{t('tv.deb.empty')}</p>
   :<ol className={css.slip}>{debates.map((d,i)=>{
    const picked=d.choices.find(c=>c.id===votes[d.id])
    return <li key={d.id} className={css.line} data-debate={d.id} data-done={!!picked}>
     <button type="button" className={css.lineMain} aria-label={picked?t('tv.deb.aria',{q:d.prompt,a:picked.name}):t('tv.deb.ariaEmpty',{q:d.prompt})} data-testid={`polls-debate-${d.id}`} onClick={openSheet({kind:'debate',id:d.id})}>
      <span className={css.lineNo} aria-hidden="true">{i+1}</span>
      <span className={css.lineText}><span className={css.ask}>{d.prompt}</span></span>
      <span className={css.mark}><span className={css.stamp} data-empty={!picked} lang={picked?contentLocale:undefined} dir="auto">{picked?.name??t('tv.deb.choose')}</span></span>
     </button></li>})}</ol>}
  {debatesDone(votes,debates)&&<div className={css.roundDone} data-testid="polls-result"><p>{t('tv.deb.done')}</p><Link className={css.cta} href={`?seed=${seed}&r=${cursor+1}&lang=${locale}`}>{t('tv.deb.next')}</Link></div>}
  {honest}
 </div>

 const tabs=<div className={css.bar}>
  <div className={css.tabs} role="tablist" aria-label={t('tv.tabs')}>
   {(['card','debates'] as const).map(k=><button key={k} type="button" role="tab" id={`tv-tab-${k}`} aria-controls={`tv-pane-${k}`} className={css.tab} aria-selected={tab===k} onClick={()=>{setTab(k);setNotice('')}}>{t(`tv.tab.${k}`)}</button>)}
  </div>
  <span className={css.count} data-done={tab==='card'?done:debatesDone(votes,debates)} aria-live="polite">{tab==='card'?t('tv.count',{n}):t('tv.deb.count',{n:answered,m:debates.length})}</span>
 </div>

 return <section className={css.stage} data-testid="polls-board" data-tab={tab}>
  {tabs}
  <div className={css.layout}>
   <div className={css.main}>
    {tab==='card'
     ?<div className={css.paper} role="tabpanel" id="tv-pane-card" aria-labelledby="tv-tab-card" data-testid="polls-pane-card">
       <div className={css.paperHead}><p className={css.kicker}>{t('tv.slip.kicker')}</p><h2 className={css.paperTitle}>{t('tv.slip.title')}</h2><p className={css.fine}>{t('tv.slip.sub')}</p></div>
       {slipView}
       <div className={css.onlyMobile}>{honest}</div>
      </div>
     :<div className={css.paper} role="tabpanel" id="tv-pane-debates" aria-labelledby="tv-tab-debates" data-testid="polls-pane-debates">{debateView}</div>}
    {tab==='card'&&<div className={css.dock}>
     <button type="button" className={`${css.cta} ${css.onlyMobile}`} disabled={n===0} data-testid="polls-seal" onClick={e=>{opener.current=e.currentTarget;setNotice(done?t('tv.sealed'):'');setSheet({kind:'card',id:'card'})}}>{done?t('tv.seal'):t('tv.view')}</button>
     {!done&&<p className={css.hint}>{t('tv.sealHint')}</p>}
     <p className={css.status} role="status">{notice}</p>
    </div>}
    {tab==='debates'&&notice&&<p className={css.status} role="status">{notice}</p>}
   </div>
   {tab==='card'&&<aside className={css.side} aria-label={t('tv.card.preview')}>
    {cardView}
    <button type="button" className={css.cta} disabled={n===0} onClick={share}>{t('tv.share')}</button>
    <p className={css.status} role="status">{notice}</p>
    <p className={css.fine}>{copy.localOnly}</p>
   </aside>}
  </div>

  <PlayerPicker open={sheet?.kind==='player'&&!!q} onClose={closeSheet} title={q?t('tv.pick.for',{q:t(`tv.q.${q.id}`)}):''} players={players} wardrobe={wardrobe} contentLocale={contentLocale} opens={q?.open??null} mine={mine} current={q?slip.picks[q.id]:undefined}
   closeLabel={copy['play.close']!} searchLabel={t('tv.pick.search')} posLabel={posLabel} t={t} onPick={(id,from)=>q&&choose(q.id,id,from)}/>
  <NumberPicker open={sheet?.kind==='number'} onClose={closeSheet} title={t('tv.num.title')} current={slip.picks.number} closeLabel={copy['play.close']!} t={t} onPick={(v,from)=>choose('number',v,from)}/>
  <PositionPicker open={sheet?.kind==='position'} onClose={closeSheet} title={t('tv.posn.title')} current={slip.picks.position} closeLabel={copy['play.close']!} t={t} onPick={(v,from)=>choose('position',v,from)}/>
  <ChoicePicker open={sheet?.kind==='debate'&&!!deb} onClose={closeSheet} title={deb?.prompt??''} choices={deb?.choices??[]} current={deb?votes[deb.id]:undefined} contentLocale={contentLocale} closeLabel={copy['play.close']!} searchLabel={t('tv.deb.search')} t={t} onPick={(id,from)=>deb&&vote(deb.id,id,from)}/>
  <SlideSheet open={sheet?.kind==='card'} onClose={closeSheet} title={t('tv.card.kicker')} size="full" closeLabel={copy['play.close']!}
   footer={<div className={css.actions}><button type="button" className={`${css.cta} ${css.wide}`} onClick={share}>{t('tv.share')}</button><p className={css.status} role="status">{notice}</p></div>}>
   <div className={css.sheetCard}>{cardView}<p className={css.fine}>{copy.localOnly}</p></div>
  </SlideSheet>
 </section>
}

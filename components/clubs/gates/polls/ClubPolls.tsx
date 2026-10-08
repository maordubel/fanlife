'use client'
import Link from 'next/link'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {firePickFxAt} from '@/components/stage/PickFx'
import {ClubShirt} from '@/components/clubs/stage/ClubShirt'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
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
import {terraceShare} from '@/lib/share/v3/adapters'
import {DEBATE_REASONS,answerDebate,choicesFor,clearPick,dealBallot,debatesDone,emptySlip,filled,isComplete,nextOpen,questionOf,readDebates,reasonDebate,reasonKey,reasonsOf,receiptsFor,setPick,setReason,shareText,slipKey,standingOf,typeName,usableDebates,validateSlip,xiIds,type DebateState,type Slip} from '@/lib/clubs/polls-model'
import {syncVotes} from '@/lib/clubs/polls-votes'
import {clientTally} from '@/lib/clubs/polls-tally'
import css from './polls.module.css'

type Tab='card'|'debates'
type Sheet=null|{kind:'player'|'number'|'position'|'debate'|'card';id:string}
export type ClubPollsProps={players:ClubPlayer[];debates:ClubPoll[];club:string;clubName:string;version:string;seed:number;cursor:number;locale:UiLocale;contentLocale:string;wardrobe:RumbleWardrobe;copy:GameCopy}

const readJSON=(key:string):unknown=>{try{const raw=localStorage.getItem(key);return raw&&raw.length<30000?JSON.parse(raw):null}catch{return null}}
/** the per-device voter id: the unit of "one active vote" (PO-R06). Random, kept on this device, never shown. */
const newVoter=()=>{
 try{return Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>b.toString(36).padStart(2,'0')).join('').slice(0,14)}
 catch{return Math.random().toString(36).slice(2,14).padEnd(10,'0')}
}

/** Gate 7 · the Terrace vote: a printed ballot slip, a supporter card read back from it, and open debates. An opinion — no score, no clock. */
export function ClubPolls({players,debates:rawDebates,club,clubName,version,seed,cursor,locale,contentLocale,wardrobe,copy}:ClubPollsProps){
 const t=(k:string,v?:Record<string,string|number>)=>tr(copy,k,v)
 const byId=useMemo(()=>new Map(players.map(p=>[p.id,p])),[players])
 /** the ballot is DEALT from this roster: a line without two documented choices is not in it (PO-R02/R03/R05) */
 const ballot=useMemo(()=>dealBallot(players),[players])
 const debates=useMemo(()=>usableDebates(rawDebates),[rawDebates])
 const store=useMemo(()=>clientTally(),[])
 const [tab,setTab]=useState<Tab>('card'),[slip,setSlip]=useState<Slip>(emptySlip),[ds,setDs]=useState<DebateState>(()=>readDebates(null,null,[])),[loaded,setLoaded]=useState(false)
 const [mine,setMine]=useState<ReadonlySet<string>>(()=>new Set()),[sheet,setSheet]=useState<Sheet>(null),[why,setWhy]=useState<string|null>(null),[aim,setAim]=useState<string|null>(null),[notice,setNotice]=useState('')
 const [undo,setUndo]=useState<Slip|null>(null),[online,setOnline]=useState(true)
 const opener=useRef<HTMLElement|null>(null),touched=useRef(false),voterRef=useRef('')
 const posLabel=(p:string)=>copy[p]??p

 useEffect(()=>{const up=()=>setOnline(navigator.onLine!==false);up();window.addEventListener('online',up);window.addEventListener('offline',up);return()=>{window.removeEventListener('online',up);window.removeEventListener('offline',up)}},[])
 useEffect(()=>{
  const s=validateSlip(readJSON(slipKey(club)),players,ballot);voterRef.current=s.voter
  setSlip(s);setDs(readDebates(readJSON(pollKey(club)),readJSON(reasonKey(club)),debates));setMine(new Set(xiIds(readJSON(xiKey(club)),players)))
  setLoaded(true)
 },[club,players,ballot,debates])
 useEffect(()=>{if(loaded&&!touched.current)setAim(nextOpen(slip,ballot))},[loaded,slip,ballot])
 useEffect(()=>{if(!loaded)return;try{localStorage.setItem(slipKey(club),JSON.stringify(slip))}catch{setNotice(copy.savedUnavailable)}},[slip,loaded,club,copy.savedUnavailable])
 // finishing the ballot / a debate round is PARTICIPATION: the score is always 0, there is no skill to rank (PO-R01)
 useEffect(()=>{if(loaded&&isComplete(slip,ballot))completeRun(club,'polls',`terrace:${version}:${ballot.length}`)},[loaded,slip,ballot,club,version])
 useEffect(()=>{if(loaded&&debatesDone(ds.votes,debates))completeRun(club,'polls',`polls:${version}:${seed}:${cursor}`)},[loaded,ds.votes,debates,club,version,seed,cursor])
 // a tally, when there is one, is offered every pick it has not accepted — with the SAME keys, so a retry never double-counts (PO-R08)
 useEffect(()=>{
  if(!loaded||!store.available||!online)return
  let live=true
  void syncVotes(slip,ballot,club,store).then(r=>{if(live&&r.counted.length)setSlip(r.slip)})
  return()=>{live=false}
 },[loaded,online,slip,ballot,club,store])
 useEffect(()=>{
  if(!aim||!touched.current)return
  const row=document.querySelector(`[data-q="${aim}"]`),calm=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  row?.scrollIntoView?.({block:'nearest',behavior:calm?'auto':'smooth'})
 },[aim])

 const word=useCallback((qid:string)=>answerOf(slip,qid,byId,t),[slip,byId,copy]) // eslint-disable-line react-hooks/exhaustive-deps -- t is a pure function of copy
 const openSheet=(s:NonNullable<Sheet>)=>(e:React.SyntheticEvent)=>{opener.current=e.currentTarget as HTMLElement;touched.current=true;setSheet(s)}
 const closeSheet=()=>{setSheet(null);setNotice('');opener.current?.focus?.()}
 const voter=()=>{if(!voterRef.current)voterRef.current=newVoter();return voterRef.current}
 function choose(qid:string,value:string,from:HTMLElement|null){
  const q=questionOf(ballot,qid);if(!q)return
  const was=isComplete(slip,ballot),next=setPick(slip,q,value,{club,voter:voter()})
  touched.current=true;setUndo(slip);setSlip(next);setWhy(null);setAim(nextOpen(next,ballot,qid));setSheet(null);setNotice('');markStep(filled(next,ballot))
  window.requestAnimationFrame(()=>{const row=document.querySelector(`[data-q="${qid}"]`);firePickFxAt(row??from,{label:answerOf(next,qid,byId,t)??undefined})})
  if(!was&&isComplete(next,ballot))window.setTimeout(()=>{opener.current=null;setSheet({kind:'card',id:'card'})},650)
 }
 function undoLast(){if(!undo)return;touched.current=true;setSlip(undo);setUndo(null);setWhy(null);setNotice(t('tv.undone'))}
 function vote(id:string,choice:string,from:HTMLElement|null){
  const d=debates.find(x=>x.id===id);if(!d)return
  const next=answerDebate(ds,d,choice);setDs(next);setSheet(null);touched.current=true
  persistDebates(next)
  window.requestAnimationFrame(()=>firePickFxAt(document.querySelector(`[data-debate="${id}"]`)??from,{}))
 }
 function persistDebates(next:DebateState){
  try{
   const previous=readJSON(pollKey(club)),flat={...(previous&&typeof previous==='object'&&!Array.isArray(previous)?previous as Record<string,string>:{}),...next.votes}
   localStorage.setItem(pollKey(club),JSON.stringify(flat));localStorage.setItem(reasonKey(club),JSON.stringify({why:next.why,made:next.made}))
  }catch{setNotice(copy.savedUnavailable)}
 }
 const giveReason=(id:string,r:string)=>{const next=reasonDebate(ds,id,r);setDs(next);persistDebates(next)}

 async function share(){
  const rows=ballot.questions.map(q=>({label:t(`tv.q.${q.id}`),value:word(q.id)??'—'}))
  const text=shareText({club:clubName,title:t('tv.share.title'),name:slip.name.trim(),rows,url:`${location.origin}/clubs/${club}/polls`})
  try{
   if(typeof navigator.share==='function'){await navigator.share({title:t('tv.share.title'),text});setNotice(t('tv.shared'))}
   else{await navigator.clipboard.writeText(text);setNotice(t('tv.copied'))}
  }catch(e){if((e as Error)?.name!=='AbortError')setNotice(t('tv.shareFail'))}
 }

 const n=filled(slip,ballot),done=isComplete(slip,ballot),q=sheet&&sheet.kind!=='debate'&&sheet.kind!=='card'?questionOf(ballot,sheet.id):undefined,deb=sheet?.kind==='debate'?debates.find(d=>d.id===sheet.id):undefined
 const fav=slip.picks.favourite?byId.get(slip.picks.favourite):undefined
 const tallyOn=store.available
 const honest=!tallyOn&&<aside className={css.honest} aria-label={t('tv.honest.title')} data-testid="polls-honest"><b>{t('tv.honest.title')}</b><p>{t('tv.honest.body')}</p></aside>
 const shorter=ballot.off.length>0&&<p className={`${css.fine} ${css.shorter}`} role="note" data-testid="polls-shorter" data-off={ballot.off.map(o=>o.id).join(' ')}>{t('tv.ballot.shorter',{m:ballot.length})} {ballot.off.map(o=>o.renamedTo?t('tv.off.renamed',{q:t(`tv.q.${o.id}`),to:t(`tv.q.${o.renamedTo}`)}):t('tv.off.short',{q:t(`tv.q.${o.id}`)})).join(' ')}</p>
 const cardView=<>
  <SupporterCard slip={slip} ballot={ballot} byId={byId} wardrobe={wardrobe} clubName={clubName} contentLocale={contentLocale} t={t} editable onName={v=>setSlip(s=>({...s,name:typeName(v)}))}/>
  {honest}
 </>
 const shareBlock=<div className={css.shareRow}>
  {fav&&<ShareComposer label={t('tv.share')} draft={terraceShare(club,{question:t('tv.q.favourite'),pick:fav.name})}/>}
  <button type="button" className={`${css.cta} min-h-tap`} disabled={n===0} onClick={share} data-testid="polls-share-text">{t('tv.share.text')}</button>
 </div>

 const slipView=ballot.length===0
  ?<p className={css.empty} data-testid="polls-empty" role="status">{t('tv.ballot.empty')}</p>
  :<ol className={css.slip} data-testid="polls-slip" data-length={ballot.length}>
  {ballot.questions.map((row,i)=>{
   const answer=word(row.id),kind=row.kind,p=kind==='player'&&slip.picks[row.id]?byId.get(slip.picks[row.id]!):null,reason=slip.reasons[row.id],stand=standingOf(slip,row.id),old=receiptsFor(slip,row.id).at(-1)
   const oldName=old?old.choice&&(row.kind==='player'?byId.get(old.choice)?.name:row.kind==='number'?`#${old.choice}`:t(`tv.posn.${old.choice}`)):null
   return <li key={row.id} className={css.line} data-q={row.id} data-done={answer!==null} data-aim={aim===row.id&&answer===null} data-standing={stand??undefined}>
    <button type="button" className={`${css.lineMain} min-h-tap`} aria-label={answer?t('tv.row.aria',{q:t(`tv.q.${row.id}`),a:answer}):t('tv.row.ariaEmpty',{q:t(`tv.q.${row.id}`)})} data-testid={`polls-line-${row.id}`} onClick={openSheet({kind:kind==='player'?'player':kind,id:row.id})}>
     <span className={css.lineNo} aria-hidden="true">{i+1}</span>
     <span className={css.lineText}>
      <span className={css.latin} aria-hidden="true">{row.latin}</span>
      <span className={css.ask}>{t(`tv.q.${row.id}`)}</span>
      {!answer&&<span className={css.sub}>{t(`tv.sub.${row.id}`)}</span>}
      {row.id==='foreign'&&<span className={css.sub}>{t('tv.def.foreign')}</span>}
      {answer&&reason&&<span className={css.reasonLine}>{t(`tv.why.${row.id}.${reason}`)}</span>}
      {answer&&<span className={css.state} data-standing={stand} data-testid={`polls-state-${row.id}`}>{t(stand==='counted'?'tv.state.counted':'tv.state.device')}</span>}
     </span>
     <span className={css.mark} data-empty={answer===null}>
      {p&&<span className={css.markShirt}><ClubShirt player={p} wardrobe={wardrobe} side="us"/></span>}
      <span className={css.stamp} data-empty={answer===null} lang={kind==='player'?contentLocale:undefined} dir="auto">{answer??t('tv.row.empty')}</span>
     </span>
    </button>
    {answer&&<button type="button" className={`${css.whyBtn} min-h-tap`} aria-expanded={why===row.id} onClick={()=>setWhy(w=>w===row.id?null:row.id)}>{t('tv.why.open')}</button>}
    {answer&&why===row.id&&<div className={css.whyRow} role="group" aria-label={t('tv.why.label')}>
     {reasonsOf(row.id).map(r=><button key={r} type="button" className={`${css.chip} min-h-tap`} aria-pressed={reason===r} onClick={()=>setSlip(s=>setReason(s,row.id,r))}>{t(`tv.why.${row.id}.${r}`)}</button>)}
     <button type="button" className={`${css.chip} min-h-tap`} onClick={()=>{setUndo(slip);setSlip(s=>clearPick(s,row.id));setWhy(null)}}>{t('tv.clear')}</button>
    </div>}
    {old&&oldName&&<div className={css.receipt} data-testid={`polls-receipt-${row.id}`} data-retired={old.retired}>
     <span>{t(old.retired?'tv.receipt.retired':'tv.receipt.older',{a:oldName})}</span>
     {!old.retired&&!answer&&<button type="button" className={`${css.chip} min-h-tap`} onClick={e=>choose(row.id,old.choice,e.currentTarget)}>{t('tv.keep',{a:oldName})}</button>}
    </div>}
   </li>
  })}
 </ol>

 const answered=debates.filter(d=>ds.votes[d.id]!==undefined).length
 const debateView=<div className={css.debates} data-testid="polls-debates">
  <div className={css.paperHead}><p className={css.kicker}>{t('tv.deb.round',{n:cursor+1})}</p><h2 className={css.paperTitle}>{t('tv.deb.title')}</h2><p className={css.fine}>{t('tv.deb.sub')}</p><p className={css.fine} data-testid="polls-deb-context">{t('tv.deb.context')}</p></div>
  {debates.length===0?<p className={css.empty}>{t('tv.deb.empty')}</p>
   :<ol className={css.slip}>{debates.map((d,i)=>{
    const picked=d.choices.find(c=>c.id===ds.votes[d.id]),r=ds.why[d.id],earlier=ds.receipts[d.id],earlierName=earlier&&d.choices.find(c=>c.id===earlier.choice)?.name
    return <li key={d.id} className={css.line} data-debate={d.id} data-done={!!picked}>
     <button type="button" className={`${css.lineMain} min-h-tap`} aria-label={picked?t('tv.deb.aria',{q:d.prompt,a:picked.name}):t('tv.deb.ariaEmpty',{q:d.prompt})} data-testid={`polls-debate-${d.id}`} onClick={openSheet({kind:'debate',id:d.id})}>
      <span className={css.lineNo} aria-hidden="true">{i+1}</span>
      <span className={css.lineText}><span className={css.ask}>{d.prompt}</span>{picked&&r&&<span className={css.reasonLine}>{t(`tv.deb.why.${r}`)}</span>}{picked&&<span className={css.state} data-standing="device">{t('tv.state.device')}</span>}</span>
      <span className={css.mark}><span className={css.stamp} data-empty={!picked} lang={picked?contentLocale:undefined} dir="auto">{picked?.name??t('tv.deb.choose')}</span></span>
     </button>
     {picked&&<div className={css.whyRow} role="group" aria-label={t('tv.deb.why.label')}>{DEBATE_REASONS.map(x=><button key={x} type="button" className={`${css.chip} min-h-tap`} aria-pressed={r===x} onClick={()=>giveReason(d.id,x)}>{t(`tv.deb.why.${x}`)}</button>)}</div>}
     {earlier&&!picked&&<div className={css.receipt} data-testid={`polls-deb-receipt-${d.id}`} data-retired={earlier.retired}><span>{earlierName?t('tv.receipt.older',{a:earlierName}):t('tv.receipt.retired',{a:'—'})}</span></div>}
    </li>})}</ol>}
  {debatesDone(ds.votes,debates)&&<div className={css.roundDone} data-testid="polls-result"><p>{t('tv.deb.done')}</p><Link className={css.cta} href={`?seed=${seed}&r=${cursor+1}&lang=${locale}`}>{t('tv.deb.next')}</Link></div>}
  {honest}
 </div>

 const tabs=<div className={css.bar}>
  <div className={css.tabs} role="tablist" aria-label={t('tv.tabs')}>
   {(['card','debates'] as const).map(k=><button key={k} type="button" role="tab" id={`tv-tab-${k}`} aria-controls={`tv-pane-${k}`} className={`${css.tab} min-h-tap`} aria-selected={tab===k} onClick={()=>{setTab(k);setNotice('')}}>{t(`tv.tab.${k}`)}</button>)}
  </div>
  <span className={css.count} data-done={tab==='card'?done:debatesDone(ds.votes,debates)} aria-live="polite">{tab==='card'?t('tv.count',{n,m:ballot.length}):t('tv.deb.count',{n:answered,m:debates.length})}</span>
 </div>

 if(!loaded)return <section className={css.stage} data-testid="polls-board" data-tab={tab} data-loading="true" aria-busy="true"><p className={css.empty} role="status">{t('tv.loading')}</p></section>

 return <section className={css.stage} data-testid="polls-board" data-tab={tab} data-ballot={ballot.length}>
  {!online&&<p className={css.offline} role="status" data-testid="polls-offline">{t('tv.offline')}</p>}
  {tabs}
  <div className={css.layout}>
   <div className={css.main}>
    {tab==='card'
     ?<div className={css.paper} role="tabpanel" id="tv-pane-card" aria-labelledby="tv-tab-card" data-testid="polls-pane-card">
       <div className={css.paperHead}><p className={css.kicker}>{t('tv.slip.kicker')}</p><h2 className={css.paperTitle}>{t('tv.slip.title',{m:ballot.length})}</h2><p className={css.fine}>{t('tv.slip.sub')}</p>{shorter}</div>
       {slipView}
       <div className={css.onlyMobile}>{honest}</div>
      </div>
     :<div className={css.paper} role="tabpanel" id="tv-pane-debates" aria-labelledby="tv-tab-debates" data-testid="polls-pane-debates">{debateView}</div>}
    {tab==='card'&&<div className={css.dock}>
     <button type="button" className={`${css.cta} ${css.onlyMobile}`} disabled={n===0} data-testid="polls-seal" onClick={e=>{opener.current=e.currentTarget;setNotice(done?t('tv.sealed'):'');setSheet({kind:'card',id:'card'})}}>{done?t('tv.seal'):t('tv.view')}</button>
     {!done&&ballot.length>0&&<p className={css.hint}>{t('tv.sealHint',{m:ballot.length})}</p>}
     {undo&&<button type="button" className={`${css.undo} min-h-tap`} onClick={undoLast} data-testid="polls-undo">{t('tv.undo')}</button>}
     <p className={css.status} role="status">{notice}</p>
    </div>}
    {tab==='debates'&&notice&&<p className={css.status} role="status">{notice}</p>}
   </div>
   {tab==='card'&&<aside className={css.side} aria-label={t('tv.card.preview')}>
    {cardView}
    {shareBlock}
    <p className={css.status} role="status">{notice}</p>
    <p className={css.fine}>{copy.localOnly}</p>
   </aside>}
  </div>

  <PlayerPicker open={sheet?.kind==='player'&&!!q} onClose={closeSheet} title={q?t('tv.pick.for',{q:t(`tv.q.${q.id}`)}):''} players={q?choicesFor(players,q):[]} wardrobe={wardrobe} contentLocale={contentLocale} mine={mine} current={q?slip.picks[q.id]:undefined}
   closeLabel={copy['play.close']!} searchLabel={t('tv.pick.search')} posLabel={posLabel} t={t} onPick={(id,from)=>q&&choose(q.id,id,from)}/>
  <NumberPicker open={sheet?.kind==='number'} onClose={closeSheet} title={t('tv.num.title')} current={slip.picks.number} closeLabel={copy['play.close']!} t={t} onPick={(v,from)=>choose('number',v,from)}/>
  <PositionPicker open={sheet?.kind==='position'} onClose={closeSheet} title={t('tv.posn.title')} current={slip.picks.position} closeLabel={copy['play.close']!} t={t} onPick={(v,from)=>choose('position',v,from)}/>
  <ChoicePicker open={sheet?.kind==='debate'&&!!deb} onClose={closeSheet} title={deb?.prompt??''} choices={deb?.choices??[]} current={deb?ds.votes[deb.id]:undefined} contentLocale={contentLocale} closeLabel={copy['play.close']!} searchLabel={t('tv.deb.search')} t={t} onPick={(id,from)=>deb&&vote(deb.id,id,from)}/>
  <SlideSheet open={sheet?.kind==='card'} onClose={closeSheet} title={t('tv.card.kicker')} size="full" closeLabel={copy['play.close']!}
   footer={<div className={css.actions}>{shareBlock}<p className={css.status} role="status">{notice}</p></div>}>
   <div className={css.sheetCard}>{cardView}<p className={css.fine}>{copy.localOnly}</p></div>
  </SlideSheet>
 </section>
}

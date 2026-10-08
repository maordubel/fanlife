'use client'
import {useCallback,useDeferredValue,useEffect,useMemo,useRef,useState} from 'react'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {tr} from '@/components/clubs/rumble/shared'
import {BEEN_EVENT,beenList,readBeen} from '@/lib/fanlife/been'
import {completeRun} from '@/lib/clubs/completion'
import {markStep} from '@/lib/analytics/meter'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {decodeArchive,type ArchiveWire,type Entry} from '@/lib/clubs/entities'
import {ROUND_DEPTH,addToTrail,buckets,dayIndex,digOrder,inDecade,isDayKey,localDayKey,nearestDays,roundDone,searchEntries,shiftDay,type Filter} from '@/lib/clubs/archive-model'
import {SAVED_EVENT,readSaved,savedIds,setSaved,type SavedBook} from '@/lib/clubs/archive-mine'
import {EntryCard,keyLabel,type CardCtx} from './ArchiveCards'
import {ArchiveSheetBody} from './ArchiveSheet'
import {DigBox} from './DigBox'
import css from './archive.module.css'

export type ArchiveTab='today'|'time'|'dig'|'search'|'mine'
const TABS:ArchiveTab[]=['today','time','dig','search','mine']
const PAGE=24
export type ClubArchiveProps={
 club:string;clubName:string;version:string;locale:UiLocale;contentLocale:string;copy:GameCopy;wire:ArchiveWire;seed:number
 initial:{tab:ArchiveTab;q:string;event:string|null};links:{xi:string|null;derby:string|null};wardrobe:RumbleWardrobe
}

const Icon=({tab}:{tab:ArchiveTab})=><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
 {tab==='today'&&<><rect x="3.5" y="5" width="17" height="15" rx="1"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.6" fill="currentColor"/></>}
 {tab==='time'&&<><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></>}
 {tab==='dig'&&<><path d="M3 10l3-5h12l3 5v9H3z"/><path d="M3 10h6l1.5 2h3L15 10h6"/></>}
 {tab==='search'&&<><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></>}
 {tab==='mine'&&<path d="M6 3h12v18l-6-4.5L6 21z"/>}
</svg>

/** keep the address honest without a server round-trip: the tab, the query and the open entry are all in the URL */
function syncUrl(patch:{tab?:ArchiveTab;q?:string;event?:string|null}){
 try{
  const u=new URL(location.href)
  if(patch.tab!==undefined){u.searchParams.set('tab',patch.tab);u.searchParams.delete('today');if(patch.tab!=='search'&&patch.q===undefined)u.searchParams.delete('q')}
  if(patch.q!==undefined){if(patch.q)u.searchParams.set('q',patch.q);else u.searchParams.delete('q')}
  if(patch.event!==undefined){if(patch.event)u.searchParams.set('event',patch.event);else u.searchParams.delete('event')}
  window.history.replaceState(window.history.state,'',u)
 }catch{/* the address bar is a convenience */}
}

/** Gate 12 · the Living Archive: Today · Time · Dig · Search · Mine over one set of entries, one drawer, one trail. */
export function ClubArchive({club,clubName,version,locale,contentLocale,copy,wire,seed,initial,links,wardrobe}:ClubArchiveProps){
 const t=useCallback((k:string,v?:Record<string,string|number>)=>tr(copy,k,v),[copy])
 const entries=useMemo(()=>decodeArchive(wire),[wire])
 const byId=useMemo(()=>new Map(entries.map(e=>[e.id,e])),[entries])
 const ix=useMemo(()=>dayIndex(entries),[entries])
 const ctx:CardCtx=useMemo(()=>({copy,locale,contentLocale,wardrobe}),[copy,locale,contentLocale,wardrobe])

 const [tab,setTabState]=useState<ArchiveTab>(initial.tab)
 const [today,setToday]=useState<string|null>(null),[browse,setBrowse]=useState<string|null>(null)
 const [q,setQ]=useState(initial.q),[filter,setFilter]=useState<Filter>('all'),[shown,setShown]=useState(PAGE)
 const [decade,setDecade]=useState<number|null|undefined>(undefined)
 const [stack,setStack]=useState<string[]>(initial.event&&byId.has(initial.event)?[initial.event]:[])
 const [trail,setTrail]=useState<string[]>(()=>initial.event&&byId.has(initial.event)?[initial.event]:[])
 const [saved,setSavedBook]=useState<SavedBook>({}),[beenTick,setBeenTick]=useState(0),[notice,setNotice]=useState('')
 const visit=useRef(Date.now().toString(36)),finished=useRef(false)

 // ---- the supporter's own day, on the supporter's own device (never the server's UTC clock)
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined
  const tick=()=>{
   const now=new Date();setToday(localDayKey(now))
   const next=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,2).getTime()-now.getTime()
   if(timer)clearTimeout(timer);timer=setTimeout(tick,Math.min(Math.max(next,1000),2147483000))
  }
  tick()
  const vis=()=>{if(document.visibilityState==='visible')tick()}
  document.addEventListener('visibilitychange',vis)
  return()=>{if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',vis)}
 },[])
 // ---- saves + "I was there" live on the device; both books are re-read when another tab or component changes them
 useEffect(()=>{
  const read=()=>setSavedBook(readSaved(club)),been=()=>setBeenTick(n=>n+1)
  read();window.addEventListener(SAVED_EVENT,read);window.addEventListener('storage',read);window.addEventListener(BEEN_EVENT,been)
  return()=>{window.removeEventListener(SAVED_EVENT,read);window.removeEventListener('storage',read);window.removeEventListener(BEEN_EVENT,been)}
 },[club])
 const savedSet=useMemo(()=>new Set(savedIds(saved)),[saved])

 const setTab=useCallback((next:ArchiveTab)=>{setTabState(next);setNotice('');syncUrl({tab:next,...(next==='search'&&q?{q}:{})})},[q])
 const day=isDayKey(browse)?browse:today
 const onToggleSave=useCallback((id:string)=>{
  const was=savedSet.has(id),r=setSaved(club,id,!was)
  setNotice(r===null?t('ar.sheet.saveFail'):'')
 },[club,savedSet,t])

 // ---- the entry drawer + the trail (a visit's distinct entries opened — the exploration round)
 const open=useCallback((id:string)=>{
  if(!byId.has(id))return
  setStack(s=>s[s.length-1]===id?s:[...s,id]);setTrail(tr0=>addToTrail(tr0,id));syncUrl({event:id})
 },[byId])
 const close=useCallback(()=>{setStack([]);syncUrl({event:null})},[])
 const back=useCallback(()=>{const n=stack.slice(0,-1);setStack(n);syncUrl({event:n[n.length-1]??null})},[stack])
 useEffect(()=>{
  if(!trail.length)return
  markStep(Math.min(trail.length,ROUND_DEPTH))
  if(!finished.current&&roundDone(trail)){finished.current=true;completeRun(club,'archive',`archive:${version}:${visit.current}`,new Set(trail).size)}
 },[trail,club,version])
 const searchFor=useCallback((text:string)=>{setStack([]);setQ(text);setFilter('all');setShown(PAGE);setTabState('search');syncUrl({event:null,tab:'search',q:text})},[])

 const current=stack.length?byId.get(stack[stack.length-1]!):null,previous=stack.length>1?byId.get(stack[stack.length-2]!):null
 const seen=useMemo(()=>new Set(trail),[trail])
 const onOpenCard=useCallback((id:string)=>open(id),[open])
 const card=(e:Entry,variant:'deck'|'row'|'mini'='row')=><li key={e.id}><EntryCard e={e} ctx={ctx} variant={variant} saved={savedSet.has(e.id)} onOpen={onOpenCard} onToggleSave={onToggleSave}/></li>

 // keyboard: arrow keys move between tabs (roving tabindex)
 const onTabKey=(ev:React.KeyboardEvent<HTMLDivElement>)=>{
  const keys=['ArrowRight','ArrowLeft','Home','End'];if(!keys.includes(ev.key))return
  ev.preventDefault();const rtl=getComputedStyle(ev.currentTarget).direction==='rtl',i=TABS.indexOf(tab)
  const step=ev.key==='Home'?-i:ev.key==='End'?TABS.length-1-i:(ev.key==='ArrowRight')!==rtl?1:-1
  const n=TABS[(i+step+TABS.length)%TABS.length]!;setTab(n)
  window.requestAnimationFrame(()=>document.getElementById(`ar-tab-${n}`)?.focus())
 }

 const distinct=new Set(trail).size,done=distinct>=ROUND_DEPTH
 return <section className={css.stage} data-testid="archive-board" data-tab={tab}>
  <div className={css.dock} role="tablist" aria-label={t('ar.tabs')} onKeyDown={onTabKey}>
   {TABS.map(k=><button key={k} id={`ar-tab-${k}`} type="button" role="tab" className={css.dockBtn} aria-selected={tab===k} aria-controls={`ar-panel-${k}`} tabIndex={tab===k?0:-1} onClick={()=>setTab(k)}>
    <Icon tab={k}/><span>{t(`ar.tab.${k}`)}</span>{k==='mine'&&savedSet.size>0&&<i className={css.badge} aria-hidden="true">{savedSet.size}</i>}</button>)}
  </div>
  <div className={css.trail} role="status" data-done={done}>
   <span className={css.pips} aria-hidden="true">{Array.from({length:ROUND_DEPTH},(_,i)=><i key={i} data-on={i<distinct}/>)}</span>
   <span>{done?t('ar.round.done'):t('ar.round.progress',{n:Math.min(distinct,ROUND_DEPTH),total:ROUND_DEPTH})}</span>
   {done&&<span className={css.trailNote}>{t('ar.round.doneNote',{n:distinct})}</span>}
  </div>
  {notice&&<p className={css.fine} role="status">{notice}</p>}

  <div id={`ar-panel-${tab}`} role="tabpanel" aria-labelledby={`ar-tab-${tab}`} className={css.panel}>
   {tab==='today'&&<TodayPanel day={day} today={today} browse={browse} setBrowse={setBrowse} ix={ix} t={t} locale={locale} card={card} entriesCount={entries.length} onJumpTab={setTab}/>}
   {tab==='time'&&<TimePanel entries={entries} decade={decade} setDecade={setDecade} filter={filter} setFilter={setFilter} shown={shown} setShown={setShown} t={t} card={card}/>}
   {tab==='dig'&&<DigBox entries={entries} byId={byId} seed={seed} ctx={ctx} saved={savedSet} onOpen={onOpenCard} onToggleSave={onToggleSave}/>}
   {tab==='search'&&<SearchPanel entries={entries} q={q} setQ={v=>{setQ(v);setShown(PAGE);syncUrl({q:v})}} filter={filter} setFilter={setFilter} shown={shown} setShown={setShown} t={t} card={card}/>}
   {tab==='mine'&&<MinePanel club={club} byId={byId} savedIds={savedIds(saved)} trail={trail} beenTick={beenTick} t={t} card={card} onOpen={open}/>}
  </div>

  <SlideSheet open={!!current} onClose={close} title={current?.title||t('ar.sheet.fallback')} size="full" closeLabel={copy['play.close']}>
   {current&&<ArchiveSheetBody key={current.id} entry={current} entries={entries} byId={byId} seen={seen} ctx={ctx} club={club} clubName={clubName} locale={locale} sources={wire.sources} links={links}
    saved={savedSet.has(current.id)} onOpen={id=>open(id)} onBack={previous?back:null} backTitle={previous?.title??null} onToggleSave={onToggleSave} onSearch={searchFor}/>}
  </SlideSheet>
 </section>
}

type T=(k:string,v?:Record<string,string|number>)=>string
type CardFn=(e:Entry,v?:'deck'|'row'|'mini')=>React.ReactNode
const FILTERS:Filter[]=['all','moment','player']
function Filters({filter,setFilter,t,onChange}:{filter:Filter;setFilter:(f:Filter)=>void;t:T;onChange?:()=>void}){
 return <div className={css.chips} role="group" aria-label={t('ar.filter.label')}>{FILTERS.map(f=><button key={f} type="button" className={css.chip} aria-pressed={filter===f} onClick={()=>{setFilter(f);onChange?.()}}>{t(`ar.filter.${f}`)}</button>)}</div>
}

// ------------------------------------------------------------------ Today
function TodayPanel({day,today,browse,setBrowse,ix,t,locale,card,entriesCount,onJumpTab}:{day:string|null;today:string|null;browse:string|null;setBrowse:(k:string|null)=>void;ix:ReturnType<typeof dayIndex>;t:T;locale:string;card:CardFn;entriesCount:number;onJumpTab:(t:ArchiveTab)=>void}){
 const deckRef=useRef<HTMLUListElement>(null),[pos,setPos]=useState(0)
 const list=useMemo(()=>day?ix.get(day)||[]:[],[day,ix]),near=useMemo(()=>day&&!list.length?nearestDays(ix,day,4):[],[day,list,ix]),nextList=near[0]?ix.get(near[0].key)||[]:[]
 useEffect(()=>{setPos(0);deckRef.current?.scrollTo?.({left:0})},[day])
 if(!day)return <p className={css.loading} aria-busy="true">{t('ar.today.loading')}</p>
 const label=keyLabel(day,locale,true),browsing=!!browse&&browse!==today
 return <div className={css.today}>
  <div className={css.dateBar}>
   <button type="button" className={css.step} aria-label={t('ar.today.prev')} onClick={()=>setBrowse(shiftDay(day,-1))}><span aria-hidden="true" className={css.arrow}>‹</span></button>
   <div className={css.dateMain}><p className={css.kicker}>{browsing?t('ar.today.browsing',{date:label}):t('ar.today.kicker')}</p>
    <h2 className={css.bigDate}>{browsing?label:`${t('ar.today.title')} · ${label}`}</h2></div>
   <button type="button" className={css.step} aria-label={t('ar.today.next')} onClick={()=>setBrowse(shiftDay(day,1))}><span aria-hidden="true" className={css.arrow}>›</span></button>
  </div>
  {browsing&&<button type="button" className={`${css.linkBtn} min-h-tap`} onClick={()=>setBrowse(null)}>{t('ar.today.reset')}</button>}
  {list.length>0?<>
   <p className={css.count} role="status">{t('ar.today.count',{n:list.length})}{list.length>1&&<span className={css.pos}> · {t('ar.today.pos',{n:pos+1,total:list.length})}</span>}</p>
   <ul ref={deckRef} className={css.deck} aria-label={t('ar.today.deck',{date:label})} data-count={list.length}
    onScroll={e=>{const el=e.currentTarget,first=el.firstElementChild as HTMLElement|null;if(first)setPos(Math.min(list.length-1,Math.max(0,Math.round(Math.abs(el.scrollLeft)/(first.offsetWidth+12)))))}}>
    {list.map(e=>card(e,'deck'))}
   </ul>
  </>:<div className={css.empty}>
   <p className={css.emptyTitle}>{t('ar.today.none',{date:label})}</p>
   <p className={css.fine}>{entriesCount?t('ar.today.noneNote'):''}</p>
   {near.length>0&&<><p className={css.kicker}>{t('ar.today.nearest')}</p>
    <div className={css.chips}>{near.map(n=><button key={n.key} type="button" className={css.chip} onClick={()=>setBrowse(n.key)}>{t('ar.today.nearestDay',{date:keyLabel(n.key,locale),n:n.count})}</button>)}</div></>}
   {!near.length&&<button type="button" className={`${css.tool} min-h-tap`} onClick={()=>onJumpTab('time')}>{t('ar.tab.time')}</button>}
  </div>}
  {!list.length&&nextList.length>0&&<>
   <p className={css.count} role="status">{t('ar.today.nextOnFile',{date:keyLabel(near[0]!.key,locale,true)})}</p>
   <ul className={css.deck} aria-label={t('ar.today.deck',{date:keyLabel(near[0]!.key,locale,true)})} data-count={nextList.length}>{nextList.map(e=>card(e,'deck'))}</ul>
  </>}
 </div>
}

// ------------------------------------------------------------------ Time
function TimePanel({entries,decade,setDecade,filter,setFilter,shown,setShown,t,card}:{entries:Entry[];decade:number|null|undefined;setDecade:(d:number|null)=>void;filter:Filter;setFilter:(f:Filter)=>void;shown:number;setShown:(n:number)=>void;t:T;card:CardFn}){
 const bs=useMemo(()=>buckets(entries,filter),[entries,filter])
 // the newest decade with something on file, until the supporter picks one
 const picked=decade!==undefined&&bs.some(b=>b.decade===decade)?decade:(bs.filter(b=>b.decade!==null).slice(-1)[0]?.decade??bs[0]?.decade??null)
 const list=useMemo(()=>inDecade(entries,picked,filter),[entries,picked,filter])
 const people=list.filter(e=>e.kind==='player')
 const visible=list.slice(0,shown),vMoments=visible.filter(e=>e.kind==='moment'),vPeople=visible.filter(e=>e.kind==='player')
 return <div>
  <h2 className={css.panelTitle}>{t('ar.time.title')}</h2>
  <Filters filter={filter} setFilter={setFilter} t={t} onChange={()=>setShown(PAGE)}/>
  <div className={css.decades} role="group" aria-label={t('ar.time.pick')}>{bs.map(b=><button key={String(b.decade)} type="button" className={css.decade} aria-pressed={b.decade===picked} onClick={()=>{setDecade(b.decade);setShown(PAGE)}}>
   <b>{b.decade===null?t('ar.time.undated'):t('ar.time.decade',{decade:b.decade})}</b><span>{b.count}</span></button>)}</div>
  {!list.length&&<p className={css.fine}>{t('ar.time.empty')}</p>}
  {vMoments.length>0&&<ul className={css.list}>{vMoments.map(e=>card(e))}</ul>}
  {vPeople.length>0&&<><h3 className={css.subTitle}>{t('ar.time.players')} · {people.length}</h3><ul className={css.list}>{vPeople.map(e=>card(e))}</ul></>}
  {list.length>shown&&<button type="button" className={`${css.tool} min-h-tap`} onClick={()=>setShown(shown+PAGE)}>{t('ar.sheet.more',{n:Math.min(PAGE,list.length-shown)})}</button>}
 </div>
}

// ------------------------------------------------------------------ Search
function SearchPanel({entries,q,setQ,filter,setFilter,shown,setShown,t,card}:{entries:Entry[];q:string;setQ:(v:string)=>void;filter:Filter;setFilter:(f:Filter)=>void;shown:number;setShown:(n:number)=>void;t:T;card:CardFn}){
 const deferred=useDeferredValue(q),has=deferred.trim().length>0
 const hits=useMemo(()=>has?searchEntries(entries,deferred,filter):[],[entries,deferred,filter,has])
 return <div>
  <h2 className={css.panelTitle}>{t('ar.search.label')}</h2>
  <label className={css.searchBox}><span className="sr-only">{t('ar.search.label')}</span>
   <input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder={t('ar.search.placeholder')} enterKeyHint="search" autoComplete="off" maxLength={100} spellCheck={false}/></label>
  <Filters filter={filter} setFilter={setFilter} t={t} onChange={()=>setShown(PAGE)}/>
  <p className={css.count} role="status">{has?(hits.length?t('ar.search.count',{n:hits.length,q:deferred.trim()}):t('ar.search.none',{q:deferred.trim()})):t('ar.search.start')}</p>
  {hits.length>0&&<ul className={css.list}>{hits.slice(0,shown).map(e=>card(e))}</ul>}
  {hits.length>shown&&<button type="button" className={`${css.tool} min-h-tap`} onClick={()=>setShown(shown+PAGE)}>{t('ar.sheet.more',{n:Math.min(PAGE,hits.length-shown)})}</button>}
 </div>
}

// ------------------------------------------------------------------ Mine
function MinePanel({club,byId,savedIds:saved,trail,beenTick,t,card,onOpen}:{club:string;byId:Map<string,Entry>;savedIds:string[];trail:string[];beenTick:number;t:T;card:CardFn;onOpen:(id:string)=>void}){
 const [been,setBeen]=useState<ReturnType<typeof beenList>>([])
 // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read when the been-book changes (beenTick)
 useEffect(()=>{setBeen(beenList(readBeen(),club))},[club,beenTick])
 const savedEntries=saved.map(id=>byId.get(id)).filter((e):e is Entry=>!!e)
 return <div>
  <h2 className={css.panelTitle}>{t('ar.mine.title')}</h2>
  <section className={css.mineGroup}><h3 className={css.subTitle}>{t('ar.mine.saved')} · {savedEntries.length}</h3>
   {savedEntries.length?<ul className={css.list}>{savedEntries.map(e=>card(e))}</ul>:<p className={css.fine}>{t('ar.mine.savedEmpty')}</p>}</section>
  <section className={css.mineGroup}><h3 className={css.subTitle}>{t('ar.mine.been')} · {been.length}</h3>
   {been.length?<ul className={css.beenList}>{been.map(b=>{const id=b.key.slice(club.length+1),e=byId.get(id);return <li key={b.key}>{e
    ?<button type="button" className={`${css.mini} min-h-tap`} onClick={()=>onOpen(id)}><span className={css.miniDate}>{b.on??''}</span><span>{b.label}</span></button>
    :<span className={`${css.mini} min-h-tap`} data-static="true"><span className={css.miniDate}>{b.on??''}</span><span>{b.label}</span></span>}</li>})}</ul>:<p className={css.fine}>{t('ar.mine.beenEmpty')}</p>}
   <p className={css.fine}>{t('ar.mine.beenNote')}</p></section>
  <section className={css.mineGroup}><h3 className={css.subTitle}>{t('ar.mine.trail')} · {new Set(trail).size}</h3>
   {trail.length?<ol className={css.trailList}>{trail.map((id,i)=>{const e=byId.get(id);return e&&<li key={id}><button type="button" className={`${css.mini} min-h-tap`} data-n="true" onClick={()=>onOpen(id)}><span className={css.miniDate}>{i+1}</span><span>{e.title}</span></button></li>})}</ol>:<p className={css.fine}>{t('ar.mine.trailEmpty')}</p>}</section>
  <p className={css.fine}>{t('ar.mine.device')}</p>
 </div>
}

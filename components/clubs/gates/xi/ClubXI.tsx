'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import {PickRail,flyShirt,type RailItem,type RailLabels} from '@/components/roster/PickRail'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {firePickFxAt} from '@/components/stage/PickFx'
import {ClubShirt} from '@/components/clubs/stage/ClubShirt'
import {tr,shortName} from '@/components/clubs/rumble/shared'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {xiShare} from '@/lib/share/v3/adapters'
import {FORMATIONS} from '@/lib/game/formations'
import {fitOf} from '@/lib/xi/roles'
import type {ClubPlayer} from '@/lib/clubs/contract'
import type {GameCopy} from '@/lib/clubs/game-copy'
import {localeDirection,type UiLocale} from '@/lib/clubs/locale'
import type {RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {emptyXI,validateXI,searchClubPlayers,type ClubXI as XIState} from '@/lib/clubs/xi'
import {xiKey,worstXiKey} from '@/lib/clubs/activity'
import {completeRun} from '@/lib/clubs/completion'
import {markStep} from '@/lib/analytics/meter'
import {TWELFTH,changeFormation,decadeSpread,filledCount,firstEmpty,isComplete,midYear,nextEmpty,occupant,place,rankForSlot,setCaptain,shareText,slotsOf,swapWhere,vacate,whereIs,type Where} from '@/lib/clubs/xi-model'
import {XIPitch} from './XIPitch'
import css from './xi.module.css'

type Kind='best'|'worst'
type Sheet=null|'full'|'formation'|'result'
const RAIL_MAX=90
const decadesOf=(p:ClubPlayer)=>{
 if(p.fromYear===null||p.toYear===null)return [] as number[]
 const a=Math.floor(p.fromYear/10)*10,b=Math.floor(p.toYear/10)*10
 return Array.from({length:Math.max(0,(b-a)/10)+1},(_,i)=>a+i*10)
}
const years=(p:ClubPlayer)=>`${p.fromYear??'?'}–${p.toYear??'?'}`
const rowsOf=(xi:XIState)=>{
 const by=new Map<number,string[]>()
 for(const s of slotsOf(xi)){const r=by.get(s.y)??[];r.push(s.slotId);by.set(s.y,r)}
 return [...by.entries()].sort((a,b)=>a[0]-b[0]).map(([,ids])=>ids.sort((a,b)=>slotsOf(xi).find(s=>s.slotId===a)!.x-slotsOf(xi).find(s=>s.slotId===b)!.x))
}

/** the eleven for the share card: keeper first, then each line from the back, left to right */
const cardLines=(xi:XIState,byId:ReadonlyMap<string,ClubPlayer>)=>{const rows=rowsOf(xi);if(!rows[0]?.includes('GK'))rows.reverse();return rows.map(r=>r.map(id=>{const p=xi.picks[id]?byId.get(xi.picks[id]!):null;return p?shortName(p.name):''}))}

export type ClubXIProps={players:ClubPlayer[];club:string;clubName:string;locale:UiLocale;contentLocale:string;wardrobe:RumbleWardrobe;copy:GameCopy}

/** Gate 1 · the all-time XI as a game: a printed pitch, shirts you tap or drag, a rail docked under it. */
export function ClubXI(props:ClubXIProps){
 const [kind,setKind]=useState<Kind>('best'),{copy}=props,t=(k:string,v?:Record<string,string|number>)=>tr(copy,k,v)
 const tabs=<div className={css.tabs} role="tablist" aria-label={t('xi.tabs')}>
  {(['best','worst'] as const).map(k=><button key={k} type="button" role="tab" className={css.tab} aria-selected={kind===k} onClick={()=>setKind(k)}>{t(`xi.tab.${k}`)}</button>)}
 </div>
 return <section className={css.stage} data-testid="xi-builder" data-kind={kind}>
  <XIBoard key={kind} kind={kind} tabs={tabs} {...props}/>
 </section>
}

function XIBoard({kind,tabs,players,club,clubName,locale,contentLocale,wardrobe,copy}:ClubXIProps&{kind:Kind;tabs:React.ReactNode}){
 const t=(k:string,v?:Record<string,string|number>)=>tr(copy,k,v)
 const storageKey=kind==='best'?xiKey(club):worstXiKey(club),side=kind==='best'?'us':'them'
 const [xi,setXI]=useState<XIState>(emptyXI),[active,setActive]=useState<Where>('GK'),[railOpen,setRailOpen]=useState(true),[loaded,setLoaded]=useState(false)
 const [sheet,setSheet]=useState<Sheet>(null),[notice,setNotice]=useState(''),[query,setQuery]=useState(''),[fitOnly,setFitOnly]=useState(false)
 const [full,setFull]=useState({q:'',pos:'',era:'',fit:false,limit:40})
 const sheetOpener=useRef<HTMLElement|null>(null)
 const byId=useMemo(()=>new Map(players.map(p=>[p.id,p])),[players])
 const slots=slotsOf(xi),role=active===TWELFTH?null:(slots.find(s=>s.slotId===active)?.role??null)

 useEffect(()=>{
  try{const raw=localStorage.getItem(storageKey);if(raw&&raw.length<20000){const next=validateXI(JSON.parse(raw),players);setXI(next);setActive(firstEmpty(next)??'GK');if(isComplete(next))setRailOpen(false)}}catch{/* Invalid or unavailable device saves are not used. */}
  setLoaded(true)
 },[storageKey,players])
 useEffect(()=>{if(!loaded)return;try{localStorage.setItem(storageKey,JSON.stringify(xi))}catch{/* a draft that cannot be kept is still playable */}},[xi,loaded,storageKey])
 // a formation change can remove the aimed slot — re-aim at the first empty one
 useEffect(()=>{if(active!==TWELFTH&&!slots.some(s=>s.slotId===active))setActive(firstEmpty(xi)??slots[0]!.slotId)},[active,slots,xi])

 function commit(next:XIState,landed?:Where){
  const was=isComplete(xi);setXI(next);setNotice('');markStep(filledCount(next))
  if(!was&&isComplete(next)){setRailOpen(false);setSheet('result')}
  else if(landed!==undefined){const n=nextEmpty(next,landed);if(n)setActive(n)}
 }
 const spot=(where:Where)=>document.querySelector(`[data-slot="${where}"]`)
 function pick(key:string,from:Element|null){
  const p=byId.get(key);if(!p)return
  const where=active;commit(place(xi,where,key),where);flyShirt(from,`[data-slot="${where}"]`,shortName(p.name))
 }
 function drop(zone:string,key:string){
  if(!zone.startsWith('xi:'))return
  const where=zone.slice(3);if(where!==TWELFTH&&!slots.some(s=>s.slotId===where))return
  const p=byId.get(key);if(!p)return
  commit(place(xi,where,key),where);setActive(where);window.requestAnimationFrame(()=>firePickFxAt(spot(where),{label:shortName(p.name)}))
 }
 function move(from:Where,zone:string){
  if(!zone.startsWith('xi:'))return
  const to=zone.slice(3);if(to===from||(to!==TWELFTH&&!slots.some(s=>s.slotId===to)))return
  commit(swapWhere(xi,from,to));setActive(to);window.requestAnimationFrame(()=>firePickFxAt(spot(to)))
 }
 const select=(where:Where)=>{setActive(where);setRailOpen(true);setNotice('')}
 const activeId=occupant(xi,active),activeMan=activeId?byId.get(activeId)??null:null

 // ---- the rail: fit-first for the aimed slot; a typed search reaches the whole roster
 const ranked=useMemo(()=>rankForSlot(players,role),[players,role])
 const items:RailItem[]=useMemo(()=>{
  const pool=ranked.filter(p=>!fitOnly||!role||fitOf(p.positions,role)!=='other')
  const source=query.trim()?searchClubPlayers(pool,query):pool.slice(0,RAIL_MAX)
  return source.map(p=>{const parts=p.name.trim().split(/\s+/);return {
   key:p.id,family:parts.length>1?parts[parts.length-1]!:p.name,given:parts.length>1?parts.slice(0,-1).join(' '):undefined,years:years(p),
   shirt:<ClubShirt player={p} wardrobe={wardrobe} side={side} className="h-full w-full"/>,title:p.name,taken:whereIs(xi,p.id)!==null,decades:decadesOf(p),search:`${p.name} ${p.aliases.join(' ')}`}})
 },[ranked,fitOnly,role,query,xi,wardrobe,side])
// eslint-disable-next-line react-hooks/exhaustive-deps -- `t` only closes over `copy`
 const labels:RailLabels=useMemo(()=>({allEras:t('xi.rail.allEras'),era:d=>t('xi.rail.era',{decade:d}),aria:target=>t('xi.rail.aria',{target}),search:t('xi.rail.search'),close:t('xi.rail.close'),empty:t('xi.rail.empty'),count:n=>t('xi.rail.count',{n}),taken:t('xi.rail.taken'),shirt:()=>''}),[copy])

 // ---- save / share
 function lockIn(){
  try{localStorage.setItem(storageKey,JSON.stringify(xi))}catch{setNotice(copy.savedUnavailable);return}
  if(kind==='best')completeRun(club,'xi','xi')
  setNotice(kind==='best'?copy.saved:t('xi.worstSaved'))
 }
 async function share(){
  const text=shareText({club:clubName,title:t(kind==='best'?'xi.poster.mine':'xi.poster.worst'),xi,byId,captainWord:t('xi.captainWord'),twelfthWord:t('xi.twelfthWord'),url:`${location.origin}/clubs/${club}/xi`})
  try{
   if(typeof navigator.share==='function'){await navigator.share({title:t(kind==='best'?'xi.poster.mine':'xi.poster.worst'),text});setNotice(t('xi.shared'))}
   else{await navigator.clipboard.writeText(text);setNotice(t('xi.copied'))}
  }catch(e){if((e as Error)?.name!=='AbortError')setNotice(t('xi.shareFail'))}
 }

 const complete=isComplete(xi),spread=decadeSpread(xi,byId),maxSpread=Math.max(1,...Object.values(spread))
 const roleLabel=(r:string,name:string|null)=>name?t('xi.slotFilled',{role:r,name}):t('xi.slotEmpty',{role:r})
 const target=active===TWELFTH?t('xi.twelfth'):(role??'')
 const closeSheet=()=>{setSheet(null);sheetOpener.current?.focus?.()}
 const open=(s:Sheet)=>(e?:React.SyntheticEvent)=>{sheetOpener.current=(e?.currentTarget as HTMLElement)??null;setSheet(s)}
 const fullPool=useMemo(()=>rankForSlot(searchClubPlayers(players,full.q),role).filter(p=>(!full.pos||p.positions.includes(full.pos as ClubPlayer['positions'][number]))&&(!full.era||decadesOf(p).includes(Number(full.era)))&&(!full.fit||!role||fitOf(p.positions,role)!=='other')),[players,full,role])
 const allDecades=useMemo(()=>[...new Set(players.flatMap(decadesOf))].sort((a,b)=>a-b),[players])

 const main=<div className={css.main}>
  <div className={css.bar}>{tabs}
   <button type="button" className={css.tool} aria-pressed={activeMan?xi.captain===activeMan.id:false} disabled={!activeMan||active===TWELFTH} onClick={()=>commit(setCaptain(xi,activeMan!.id))} aria-label={t('xi.captainMake')} title={t('xi.captainMake')}>C</button>
   <button type="button" className={css.tool} disabled={!activeMan} onClick={()=>{commit(vacate(xi,active))}} aria-label={t('xi.remove')} title={t('xi.remove')}>✕</button>
  </div>
  {kind==='worst'&&<p className={css.note}>{t('xi.worstNote')}</p>}
  <XIPitch xi={xi} byId={byId} wardrobe={wardrobe} side={side} kind={kind} active={active} contentLocale={contentLocale} flip={localeDirection(locale)==='ltr'} label={roleLabel} chairLabel={t('xi.twelfth')} chairTag={t('xi.twelfth')} onSelect={select} onMove={move}
   hud={{count:t('xi.count',{n:filledCount(xi)}),done:complete,formation:xi.formation,onFormation:open('formation'),formationLabel:t('xi.formationBtn',{name:xi.formation})}}/>
  <div className={css.dock}>
   {railOpen
    ?<PickRail target={target} targetSub={activeMan?.name??t('xi.pickFor')} items={items} onPick={pick} onDrop={drop} onClose={()=>setRailOpen(false)} labels={labels} onQuery={setQuery}
       chips={role?[{key:'fit',label:t('xi.fits'),pressed:fitOnly,onClick:()=>setFitOnly(v=>!v)}]:[]}
       extra={<button type="button" onClick={open('full')} className="flex min-h-tap shrink-0 items-center border-hair border-ink/40 px-2 font-body text-[11.5px] font-extrabold text-ink">{t('xi.fullList')}</button>}/>
    :complete
     ?<div className={css.strip} data-testid="xi-complete"><h2>{t(kind==='best'?'xi.complete.title':'xi.complete.worst')}</h2>
       <button type="button" className={css.tool} onClick={lockIn}>{copy.save}</button>
       <button type="button" className={css.tool} onClick={open('result')}>{t('xi.share')}</button></div>
     :<p className={css.hint}>{t('xi.hintReopen')}</p>}
   <p className={css.status} role="status">{notice}</p>
  </div>
 </div>

 return <>
  <div className={css.layout}>
   {main}
   <aside className={css.side} aria-label={t(kind==='best'?'xi.poster.mine':'xi.poster.worst')}>
    <div className={css.sideCard}><h3>{xi.formation} · {t('xi.count',{n:filledCount(xi)})}</h3>
     <ol className={css.sheetList}>{[...slots].sort((a,b)=>a.y-b.y||a.x-b.x).map(s=>{const p=xi.picks[s.slotId]?byId.get(xi.picks[s.slotId]!):null;return <li key={s.slotId} data-empty={!p}><b>{s.role}</b><span lang={contentLocale} dir="auto">{p?`${p.name}${xi.captain===p.id?` (${t('xi.captainWord')})`:''}`:'—'}</span></li>})}
      {xi.twelfth&&byId.get(xi.twelfth)&&<li><b>12</b><span lang={contentLocale} dir="auto">{byId.get(xi.twelfth)!.name}</span></li>}</ol></div>
    <p className={css.fine}>{copy.localOnly}</p>
   </aside>
  </div>

  <SlideSheet open={sheet==='formation'} onClose={closeSheet} title={t('xi.formationTitle')} closeLabel={copy['play.close']}>
   <ul className={css.formations}>{Object.keys(FORMATIONS).map(f=><li key={f}><button type="button" className={css.formation} aria-pressed={xi.formation===f} onClick={()=>{commit(changeFormation(xi,f));closeSheet()}}>
    <svg viewBox="0 0 100 133" aria-hidden="true">{FORMATIONS[f]!.slots.map(s=><circle key={s.slotId} cx={localeDirection(locale)==='ltr'?100-s.x:s.x} cy={(11+(s.y-14)*(77/80))*1.33} r="5"/>)}</svg>{f}</button></li>)}</ul>
  </SlideSheet>

  <SlideSheet open={sheet==='full'} onClose={closeSheet} title={`${t('xi.sheetTitle')} · ${target}`} size="full" closeLabel={copy['play.close']}>
   <div className={css.sheetBody}>
    <div className={css.filters}>
     <label>{copy.search}<input type="search" value={full.q} onChange={e=>setFull(f=>({...f,q:e.target.value,limit:40}))}/></label>
     <label>{copy.position}<select value={full.pos} onChange={e=>setFull(f=>({...f,pos:e.target.value,limit:40}))}><option value="">{copy.all}</option>{(['GK','DF','MF','FW'] as const).map(p=><option key={p} value={p}>{copy[p]}</option>)}</select></label>
     <label>{copy.years}<select value={full.era} onChange={e=>setFull(f=>({...f,era:e.target.value,limit:40}))}><option value="">{copy.anyEra}</option>{allDecades.map(d=><option key={d} value={d}>{d}</option>)}</select></label>
     {role&&<label className={css.check}><input type="checkbox" checked={full.fit} onChange={e=>setFull(f=>({...f,fit:e.target.checked,limit:40}))}/>{copy.fitOnly}</label>}
    </div>
    <ul className={css.rows} data-testid="xi-players">{fullPool.slice(0,full.limit).map(p=>{const fit=role?fitOf(p.positions,role):'unknown',here=whereIs(xi,p.id)
     return <li key={p.id}><button type="button" className={css.row} data-player-id={p.id} disabled={here===active} onClick={()=>{commit(place(xi,active,p.id),active);closeSheet()}}>
      <span className={css.rowShirt}><ClubShirt player={p} wardrobe={wardrobe} side={side}/></span>
      <span><span className={css.rowName} lang={contentLocale} dir="auto">{p.name}</span><span className={css.rowSub}>{p.positions.join(' / ')||copy.unknown} · {years(p)}</span></span>
      <span className={css.rowFit} data-fit={fit}>{here?t('xi.rail.taken'):fit==='fit'?copy.fit:fit==='other'?copy.fitOther:''}</span></button></li>})}</ul>
    {fullPool.length>full.limit&&<button type="button" className={css.tool} onClick={()=>setFull(f=>({...f,limit:f.limit+40}))}>{copy.more}</button>}
   </div>
  </SlideSheet>

  <SlideSheet open={sheet==='result'} onClose={closeSheet} title={t(kind==='best'?'xi.poster.mine':'xi.poster.worst')} size="full" closeLabel={copy['play.close']}
   footer={<div className={css.actions}>
    <button type="button" className={`${css.tool} ${css.primary}`} onClick={lockIn}>{copy.save}</button>
    {kind==='best'&&complete?<ShareComposer label={t('xi.share')} draft={xiShare(club,{formation:xi.formation,lines:cardLines(xi,byId),captain:xi.captain?shortName(byId.get(xi.captain)?.name||'')||null:null})}/>:<button type="button" className={css.tool} onClick={share}>{t('xi.share')}</button>}
    <button type="button" className={css.tool} onClick={closeSheet}>{t('xi.poster.keep')}</button></div>}>
   <div className={css.poster} data-testid="xi-poster">
    <div className={css.posterHead}><p className={css.posterKicker}>{clubName} · {xi.formation}</p><h2 className={css.posterTitle}>{t(kind==='best'?'xi.poster.mine':'xi.poster.worst')}</h2></div>
    <div className={css.posterRows}>{rowsOf(xi).map((ids,i)=><div key={i} className={css.posterRow}>{ids.map(id=>{const p=xi.picks[id]?byId.get(xi.picks[id]!):null;return p&&<div key={id} className={css.posterMan}><span className={css.shirt}><ClubShirt player={p} wardrobe={wardrobe} side={side}/>{xi.captain===p.id&&<span className={css.cap}>{t('xi.poster.captain')}</span>}</span><span className={css.plate} lang={contentLocale} dir="auto">{shortName(p.name)}</span></div>})}</div>)}
     {xi.twelfth&&byId.get(xi.twelfth)&&<div className={css.posterRow}><div className={css.posterMan}><span className={css.shirt}><ClubShirt player={byId.get(xi.twelfth)!} wardrobe={wardrobe} side={side}/></span><span className={css.plate} lang={contentLocale} dir="auto">{shortName(byId.get(xi.twelfth)!.name)}</span><span className={css.chairTag}>{t('xi.twelfth')}</span></div></div>}</div>
    {Object.keys(spread).length>0&&<div className={css.spread}><p className={css.posterKicker}>{t('xi.poster.spread')}</p>{Object.entries(spread).sort((a,b)=>Number(a[0])-Number(b[0])).map(([d,n])=><div key={d} className={css.spreadRow}><span>{d}s</span><span className={css.spreadBar}><i style={{width:`${(n/maxSpread)*100}%`}}/></span><span>{n}</span></div>)}</div>}
    <p className={css.fine}>{kind==='worst'?t('xi.worstNote'):copy.localOnly}</p>
    <p className={css.status} role="status">{notice}</p>
   </div>
  </SlideSheet>
 </>
}

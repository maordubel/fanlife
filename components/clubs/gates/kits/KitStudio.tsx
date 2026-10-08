'use client'
import {useCallback,useEffect,useMemo,useRef,useState} from 'react'
import Link from 'next/link'
import {SlideSheet} from '@/components/stage/SlideSheet'
import {firePickFxAt} from '@/components/stage/PickFx'
import {tr} from '@/components/clubs/rumble/shared'
import type {GameCopy} from '@/lib/clubs/game-copy'
import type {UiLocale} from '@/lib/clubs/locale'
import {BLANK,COLLARS,PATTERNS,colourHex,type ClothSpec,type CollarId,type ColourKey,type PatternId} from '@/lib/clubs/kit-model'
import {DESIGN_MAX,NAME_MAX,RENDERER,TRAIT_SCHEMA,decodeDesign,edit,encodeDesign,newDesignId,readBuilt,readDesigns,redo,resetTo,startHistory,studioViewKey,undo,upsertDesign,writeDesigns,type Built,type SavedDesign,type StudioLimits} from '@/lib/clubs/kit-studio'
import {METRICS,briefMet,briefsOffered,scorecard,type BriefCtx,type BriefId,type Reference,type StudioIdentity} from '@/lib/clubs/kit-design'
import {DNA_THRESHOLD} from '@/lib/clubs/kit-rules'
import {ShareComposer} from '@/components/share/v3/ShareComposer'
import {templateById} from '@/lib/share/v3/templates'
import {coverShare} from '@/lib/share/v3/adapters'
import type {CollectionRow,OpenKit} from '@/lib/clubs/kit-collection'
import {KitCloth} from '../kit-builder/KitCloth'
import {colourLabel} from '../kit-builder/KitBuilder'
import {openBuiltKits} from './actions'
import css from './kits.module.css'

type Tab='studio'|'collection'
type Tool='body'|'trim'|'design'|'collar'|'sleeves'|'maker'|'sponsor'|'crest'|'back'
type Sheet=null|{k:'shirt';id:string}|{k:'save'}|{k:'designs'}|{k:'brief'}|{k:'score'}|{k:'start'}|{k:'help'}
const TRIM_PREFERENCE:ColourKey[]=['white','cream','black','navy','red','blue','green','grey','purple']

export type KitStudioProps={club:string;clubName:string;locale:UiLocale;contentLocale:string;copy:GameCopy;monogram:string;limits:StudioLimits;identity:StudioIdentity;rows:CollectionRow[];gate4:boolean;focusKit:string|null;/** a fan design in the link, still to be validated here against this club's palette */sharedDesign:string|null;/** cut-out archive photos by kit id, only for shirts that are open */photos?:Record<string,string>}

/** Gate 5 · The Kit Studio — the club's documented shirts as a collection, and a free designer for your own FAN DESIGN. */
export function KitStudio(props:KitStudioProps){
 const {club,clubName,locale,contentLocale,copy,monogram,limits,identity,rows,gate4,focusKit,sharedDesign,photos={}}=props
 const say=useCallback((k:string,v?:Record<string,string|number>)=>tr(copy,k,v),[copy])
 const [tab,setTab]=useState<Tab>(focusKit?'collection':'studio')
 const [hist,setHist]=useState(()=>startHistory()),[tool,setTool]=useState<Tool>('body'),[view,setView]=useState<'front'|'back'>('front')
 const [designs,setDesigns]=useState<SavedDesign[]>([]),[designId,setDesignId]=useState<string|null>(null),[designName,setDesignName]=useState(''),[fromKit,setFromKit]=useState<string|null>(null),[confirmDel,setConfirmDel]=useState<string|null>(null)
 const [opened,setOpened]=useState<Record<string,OpenKit>>(()=>Object.fromEntries(rows.flatMap(r=>r.open?[[r.id,r.open]]:[])))
 const [built,setBuilt]=useState<Record<string,Built>>({}),[filter,setFilter]=useState<'all'|'home'|'away'|'third'>('all')
 const [briefId,setBriefId]=useState<BriefId>('free'),[memoryId,setMemoryId]=useState<string|null>(null)
 const [sheet,setSheet]=useState<Sheet>(null),[notice,setNotice]=useState(''),[checking,setChecking]=useState(false),[saveName,setSaveName]=useState('')
 const opener=useRef<HTMLElement|null>(null),garmentRef=useRef<HTMLDivElement>(null),focused=useRef(false)
 const spec=hist.present

 // ---- device-local state: saved designs, the builds gate 4 proved, the last tab
 useEffect(()=>{setDesigns(readDesigns(club,limits));setBuilt(readBuilt(club));try{const v=localStorage.getItem(studioViewKey(club));if(!focusKit&&!sharedDesign&&(v==='collection'||v==='studio'))setTab(v)}catch{/* private mode */}},[club,limits,focusKit,sharedDesign])
 useEffect(()=>{ // a fan design in the link is re-validated against THIS club's palette; anything it cannot draw is refused, not repaired
  if(!sharedDesign)return
  const d=decodeDesign(sharedDesign,limits)
  if(d){setHist(h=>resetTo(h,d));setTool('body');setNotice(say('ks.shared.opened'))}else setNotice(say('ks.shared.refused'))
 },[sharedDesign,limits,say])
 const showTab=(next:Tab)=>{setTab(next);try{localStorage.setItem(studioViewKey(club),next)}catch{/* private mode */}}
 // a build only counts once the server confirms its token (gate 4 minted it) — then the shirt's facts arrive
 const verify=useCallback(async()=>{
  if(!gate4)return
  const have=readBuilt(club),want=Object.entries(have).filter(([id])=>!opened[id]).map(([id,b])=>({id,t:b.t,f:b.f,o:b.o,r:b.r}))
  setBuilt(have)
  if(!want.length)return
  setChecking(true)
  try{const r=await openBuiltKits(club,want);if(r.ok&&r.kits.length)setOpened(o=>({...o,...Object.fromEntries(r.kits.map(k=>[k.id,k]))}))}catch{/* the collection stays as it was; nothing is lost */}
  setChecking(false)
 },[club,gate4,opened])
 useEffect(()=>{void verify()},[]) // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{const on=()=>void verify();window.addEventListener('focus',on);return()=>window.removeEventListener('focus',on)},[verify])
 useEffect(()=>{ // arriving from gate 4 with ?kit= opens that shirt's card as soon as it is confirmed
  if(!focusKit||focused.current)return
  if(opened[focusKit]||rows.some(r=>r.id===focusKit&&!r.open)){focused.current=true;setSheet({k:'shirt',id:focusKit})}
 },[focusKit,opened,rows])

 // ---- editing
 const apply=(patch:Partial<ClothSpec>)=>{setHist(h=>edit(h,patch));setNotice('');window.requestAnimationFrame(()=>firePickFxAt(garmentRef.current,{}))}
 const trimFor=(base:ColourKey|null)=>TRIM_PREFERENCE.find(k=>k!==base&&limits.colours.includes(k))??null
 const setBase=(k:ColourKey)=>apply(spec.trim===k?{base:k,trim:null,pattern:'solid',collarInk:'base',sleeveInk:'base'}:{base:k})
 const setTrim=(k:ColourKey|null)=>apply(k?{trim:k}:{trim:null,pattern:'solid',collarInk:'base',sleeveInk:'base'})
 const setPattern=(p:PatternId)=>{
  if(p!=='solid'&&!spec.trim){const tr2=trimFor(spec.base);if(!tr2){setNotice(say('ks.needTrim'));return}apply({pattern:p,trim:tr2});return}
  apply({pattern:p})
 }
 const setTool2=(next:Tool)=>{setTool(next);setView(next==='back'?'back':'front')}
 const doUndo=()=>setHist(undo),doRedo=()=>setHist(redo)
 const doReset=()=>{setHist(h=>resetTo(h));setDesignId(null);setDesignName('');setFromKit(null);setNotice(say('ks.reset.done'))}
 useEffect(()=>{
  if(tab!=='studio'||sheet)return
  const on=(e:KeyboardEvent)=>{
   const el=e.target as HTMLElement|null
   if(el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA'))return
   if(!(e.ctrlKey||e.metaKey)||e.altKey)return
   const k=e.key.toLowerCase()
   if(k==='z'){e.preventDefault();setHist(e.shiftKey?redo:undo)}else if(k==='y'){e.preventDefault();setHist(redo)}
  }
  window.addEventListener('keydown',on);return()=>window.removeEventListener('keydown',on)
 },[tab,sheet])

 // ---- sheets
 const openSheet=(s:NonNullable<Sheet>)=>(e?:React.SyntheticEvent)=>{opener.current=(e?.currentTarget as HTMLElement)??null;setSheet(s)}
 const closeSheet=()=>{setSheet(null);opener.current?.focus?.()}
 const hasDesign=spec.base!==null

 // ---- saved designs
 function openSave(e:React.SyntheticEvent){setSaveName(designName||say('ks.save.default',{n:designs.length+1}));openSheet({k:'save'})(e)}
 function save(asNew:boolean){
  const name=saveName.trim().slice(0,32)||say('ks.save.default',{n:designs.length+1}),id=asNew||!designId?newDesignId():designId,now=new Date().toISOString()
  const was=designs.find(d=>d.id===id)
  const next=upsertDesign(designs,{id,name,spec,from:fromKit,brief:brief.id,schema:TRAIT_SCHEMA,renderer:RENDERER,author:'device',at:was?.at??now,updated:now})
  const ok=writeDesigns(club,next)
  setDesigns(next);setDesignId(id);setDesignName(name);setSheet(null)
  setNotice(ok?say('ks.save.done',{name}):say('ks.save.fail'))
 }
 function load(d:SavedDesign){setHist(h=>resetTo(h,d.spec));if(d.brief&&briefsOffered(ctx).some(b=>b.id===d.brief))setBriefId(d.brief as BriefId);setDesignId(d.id);setDesignName(d.name);setFromKit(d.from);setSheet(null);setTool('body');setView('front');setNotice(say('ks.load.done',{name:d.name}))}
 function remove(id:string){
  if(confirmDel!==id){setConfirmDel(id);return}
  const next=designs.filter(d=>d.id!==id);writeDesigns(club,next);setDesigns(next);setConfirmDel(null)
  if(designId===id){setDesignId(null)}
 }
 function startFrom(k:OpenKit){
  if(!k.cloth)return
  setHist(h=>resetTo(h,k.cloth!));setFromKit(k.id);setDesignId(null);setDesignName('');setTool('body');setView('front');setSheet(null);showTab('studio');setNotice(say('ks.start.done',{season:k.season}))
 }
 async function share(){
  const link=`${location.origin}/clubs/${club}/kits?${new URLSearchParams({design:encodeDesign(spec),lang:locale})}`
  const text=say('ks.share.text',{club:clubName,name:designName||say('ks.untitled')})+` ${link}`
  try{if(typeof navigator.share==='function'){await navigator.share({title:say('ks.title'),text});setNotice(say('ks.share.done'))}else{await navigator.clipboard.writeText(text);setNotice(say('ks.share.copied'))}}catch(e){if((e as Error)?.name!=='AbortError')setNotice(say('ks.share.fail'))}
 }

 // ---- the collection
 const variantName=(v:string)=>say(`kb.variant.${v}`)
 const variants=useMemo(()=>[...new Set(rows.map(r=>r.variant))],[rows])
 const shown=rows.filter(r=>filter==='all'||r.variant===filter)
 const openCount=rows.filter(r=>opened[r.id]).length
 const startable=Object.values(opened).filter(k=>k.cloth).sort((a,b)=>a.season.localeCompare(b.season))
 const sheetKit=sheet?.k==='shirt'?rows.find(r=>r.id===sheet.id)??null:null
 const sheetOpen=sheet?.k==='shirt'?opened[sheet.id]??null:null

 const refs=useMemo<Reference[]>(()=>Object.values(opened).flatMap(k=>k.cloth?[{id:k.id,season:k.season,cloth:k.cloth}]:[]).sort((a,b)=>a.season.localeCompare(b.season)),[opened])
 const ctx=useMemo<BriefCtx>(()=>({identity,memory:refs.find(r=>r.id===memoryId)??refs.find(r=>r.id===fromKit)??refs[0]??null}),[identity,refs,memoryId,fromKit])
 const offered=briefsOffered(ctx),brief=offered.find(b=>b.id===briefId)??offered[0]!
 const card=scorecard(spec,brief,refs,ctx)
 const decades=[...new Set(refs.map(r=>/(\d{3})\d/.exec(r.season)?.[1]).filter((x):x is string=>!!x))].sort().slice(0,3).map(d=>`${d}0s`)
 const closetDraft=useMemo(()=>{
  const t=templateById('06-my-closet')!,d=coverShare(club,[]),origin=new URL(d.data.link).origin
  return {...d,template:t,surface:'wardrobe' as const,purpose:'entry' as const,data:{...d.data,headline:t.headline,context:t.context,main:String(openCount),label:t.label,detail:t.detail,cta:t.cta,rows:decades.length?decades:t.rows,statement:'Every shirt has a story.',link:`${origin}/clubs/${club}/kits?lang=en`}}
 },[club,openCount,decades.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps -- decades derives from opened

 const tools:{id:Tool;show:boolean}[]=[{id:'body',show:true},{id:'trim',show:true},{id:'design',show:true},{id:'collar',show:true},{id:'sleeves',show:true},{id:'maker',show:limits.makers.length>0},{id:'sponsor',show:limits.sponsors.length>0},{id:'crest',show:true},{id:'back',show:true}]
 const trimOk=!!spec.trim

 return <section className={css.stage} data-testid="kit-studio" data-tab={tab}>
  <div className={css.tabs} role="tablist" aria-label={say('ks.tabs')}>
   <button type="button" role="tab" id="ks-tab-studio" aria-controls="ks-pane-studio" aria-selected={tab==='studio'} className={`min-h-tap ${css.tab}`} onClick={()=>showTab('studio')} data-testid="ks-tab-studio">{say('ks.tab.studio')}</button>
   <button type="button" role="tab" id="ks-tab-collection" aria-controls="ks-pane-collection" aria-selected={tab==='collection'} className={`min-h-tap ${css.tab}`} onClick={()=>showTab('collection')} data-testid="ks-tab-collection">{say('ks.tab.collection')} <small>{openCount}/{rows.length}</small></button>
  </div>

  {tab==='studio'&&<div className={css.studio} id="ks-pane-studio" role="tabpanel" aria-labelledby="ks-tab-studio">
   <div className={css.left}>
    <div className={css.bar}>
     <button type="button" className={`min-h-tap ${css.tool}`} onClick={doUndo} disabled={!hist.past.length} aria-label={say('ks.undo')} data-testid="ks-undo"><span aria-hidden="true">↶</span></button>
     <button type="button" className={`min-h-tap ${css.tool}`} onClick={doRedo} disabled={!hist.future.length} aria-label={say('ks.redo')} data-testid="ks-redo"><span aria-hidden="true">↷</span></button>
     <button type="button" className={`min-h-tap ${css.tool}`} onClick={doReset} disabled={!hasDesign&&!hist.past.length} data-testid="ks-reset">{say('ks.reset')}</button>
     <span className={css.grow}/>
     <button type="button" className={`min-h-tap ${css.tool}`} aria-pressed={view==='back'} onClick={()=>setView(v=>v==='front'?'back':'front')} data-testid="ks-flip">{view==='front'?say('ks.view.back'):say('ks.view.front')}</button>
     <button type="button" className={`min-h-tap ${css.tool} ${css.primaryBtn}`} onClick={openSave} disabled={!hasDesign} data-testid="ks-save">{say('ks.save')}</button>
    </div>
    <div className={css.garment} ref={garmentRef} data-testid="ks-garment">
     <span className={css.stamp} data-testid="ks-stamp">{say('ks.stamp')}</span>
     {designName&&<span className={css.designName}><bdi>{designName}</bdi></span>}
     <KitCloth spec={spec} view={view} monogram={monogram} title={hasDesign?say('ks.garment.aria',{view:view==='front'?say('ks.view.front'):say('ks.view.back')}):say('ks.garment.blank')}/>
    </div>
   </div>

   <div className={css.right}>
    <div className={css.toolRail} role="tablist" aria-label={say('ks.tools')}>
     {tools.filter(x=>x.show).map(x=><button key={x.id} type="button" role="tab" aria-selected={tool===x.id} className={`min-h-tap ${css.toolBtn}`} onClick={()=>setTool2(x.id)} data-testid={`ks-tool-${x.id}`}>{say(`ks.tool.${x.id}`)}</button>)}
    </div>
    <div className={css.panel} role="tabpanel" data-testid="ks-panel" data-tool={tool}>
     <p className={css.hintLine}>{say(`ks.tool.${tool}.hint`)}</p>
     {tool==='body'&&<div className={css.strip}>{limits.colours.map(k=><button key={k} type="button" className={css.swatch} aria-pressed={spec.base===k} onClick={()=>setBase(k)} data-testid={`ks-body-${k}`} data-club={k===identity.primary||k===identity.secondary}><i style={{background:colourHex(k)}}/><span>{say(`kb.colour.${k}`)}{(k===identity.primary||k===identity.secondary)&&<small className={css.clubDot}> · {say('ks.club.colour')}</small>}</span></button>)}</div>}
     {tool==='trim'&&<div className={css.strip}>
      <button type="button" className={`min-h-tap ${css.chip}`} aria-pressed={!spec.trim} onClick={()=>setTrim(null)} disabled={!spec.base} data-testid="ks-trim-none">{say('ks.none')}</button>
      {limits.colours.filter(k=>k!==spec.base).map(k=><button key={k} type="button" className={css.swatch} aria-pressed={spec.trim===k} onClick={()=>setTrim(k)} disabled={!spec.base} data-testid={`ks-trim-${k}`}><i style={{background:colourHex(k)}}/><span>{say(`kb.colour.${k}`)}</span></button>)}</div>}
     {tool==='design'&&<div className={css.strip}>{PATTERNS.map(p=>{
      const base=spec.base??limits.colours[0]??null,trim=spec.trim??trimFor(base)
      return <button key={p} type="button" className={css.pattern} aria-pressed={spec.pattern===p} onClick={()=>setPattern(p)} disabled={!spec.base} data-testid={`ks-pattern-${p}`}><span className={css.patternArt}><KitCloth spec={{...BLANK,base,trim,pattern:p,collar:spec.collar}} texture={false} viewBox="40 36 240 262"/></span><span>{say(`kb.pattern.${p}`)}</span></button>})}</div>}
     {tool==='collar'&&<><div className={css.strip}>{COLLARS.map((c:CollarId)=><button key={c} type="button" className={`min-h-tap ${css.chip}`} aria-pressed={spec.collar===c} onClick={()=>apply({collar:c})} disabled={!spec.base} data-testid={`ks-collar-${c}`}>{say(`ks.collar.${c}`)}</button>)}</div>
      <div className={css.strip}>{(['base','trim'] as const).map(i=><button key={i} type="button" className={`min-h-tap ${css.chip}`} aria-pressed={spec.collarInk===i} onClick={()=>apply({collarInk:i})} disabled={!spec.base||(i==='trim'&&!trimOk)}>{say(`ks.ink.${i}`)}</button>)}</div></>}
     {tool==='sleeves'&&<div className={css.strip}>{(['base','trim'] as const).map(i=><button key={i} type="button" className={`min-h-tap ${css.chip}`} aria-pressed={spec.sleeveInk===i} onClick={()=>apply({sleeveInk:i})} disabled={!spec.base||(i==='trim'&&!trimOk)} data-testid={`ks-sleeve-${i}`}>{say(`ks.ink.${i}`)}</button>)}</div>}
     {tool==='maker'&&<div className={css.strip}>
      <button type="button" className={`min-h-tap ${css.chip}`} aria-pressed={!spec.maker} onClick={()=>apply({maker:null})} disabled={!spec.base}>{say('ks.none')}</button>
      {limits.makers.map(m=><button key={m} type="button" className={`min-h-tap ${css.chip}`} lang={contentLocale} dir="auto" aria-pressed={spec.maker===m} onClick={()=>apply({maker:m})} disabled={!spec.base} data-testid="ks-maker">{m}</button>)}</div>}
     {tool==='sponsor'&&<div className={css.strip}>
      <button type="button" className={`min-h-tap ${css.chip}`} aria-pressed={!spec.sponsor} onClick={()=>apply({sponsor:null})} disabled={!spec.base}>{say('ks.none')}</button>
      {limits.sponsors.map(m=><button key={m} type="button" className={`min-h-tap ${css.chip}`} lang={contentLocale} dir="auto" aria-pressed={spec.sponsor===m} onClick={()=>apply({sponsor:m})} disabled={!spec.base} data-testid="ks-sponsor">{m}</button>)}</div>}
     {tool==='crest'&&<div className={css.strip}>{([false,true] as const).map(on=><button key={String(on)} type="button" className={`min-h-tap ${css.chip}`} aria-pressed={spec.crest===on} onClick={()=>apply({crest:on})} disabled={!spec.base} data-testid={`ks-crest-${on?'on':'off'}`}>{on?say('ks.crest.on'):say('ks.crest.off')}</button>)}</div>}
     {tool==='back'&&<div className={css.fields}>
      <label>{say('ks.back.name')}<input type="text" inputMode="text" maxLength={NAME_MAX} value={spec.name??''} disabled={!spec.base} dir="auto" lang={contentLocale} autoComplete="off" onChange={e=>apply({name:e.target.value.trim()?e.target.value.slice(0,NAME_MAX):null})} data-testid="ks-name"/></label>
      {identity.wordmark&&<button type="button" className={`min-h-tap ${css.chip}`} disabled={!spec.base} onClick={()=>apply({name:identity.wordmark})} data-testid="ks-wordmark">{say('ks.back.wordmark',{name:identity.wordmark})}</button>}
      <label>{say('ks.back.number')}<input type="text" inputMode="numeric" maxLength={2} value={spec.number===null?'':String(spec.number)} disabled={!spec.base} autoComplete="off" onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(0,2);apply({number:v===''?null:Number(v)})}} data-testid="ks-number"/></label></div>}
    </div>
    <div className={css.bar2}>
     <button type="button" className={`min-h-tap ${css.tool}`} onClick={openSheet({k:'designs'})} data-testid="ks-designs">{say('ks.designs')} <small>{designs.length}</small></button>
     <button type="button" className={`min-h-tap ${css.tool}`} onClick={openSheet({k:'start'})} disabled={!startable.length} data-testid="ks-start">{say('ks.startFrom')}</button>
     <button type="button" className={`min-h-tap ${css.tool}`} onClick={openSheet({k:'brief'})} data-testid="ks-brief">{say('ks.brief')} <small>{say(`ks.brief.${brief.id}.short`)}</small></button>
     <button type="button" className={`min-h-tap ${css.tool}`} onClick={openSheet({k:'score'})} disabled={!hasDesign} data-testid="ks-score">{say('ks.score')} <small>{card.overall===null?'—':card.overall}</small></button>
     <button type="button" className={`min-h-tap ${css.tool}`} onClick={share} disabled={!hasDesign}>{say('ks.share')}</button>
     <button type="button" className={`min-h-tap ${css.tool}`} onClick={openSheet({k:'help'})} aria-label={say('ks.help.open')}><span aria-hidden="true">i</span></button>
    </div>
    <p className={css.status} role="status" data-testid="ks-status">{notice}</p>
   </div>
  </div>}

  {tab==='collection'&&<div className={css.collection} id="ks-pane-collection" role="tabpanel" aria-labelledby="ks-tab-collection">
   <header className={css.collHead}>
    <p className={css.kicker}>{clubName}</p>
    <h2>{say('ks.coll.title')}</h2>
    <p className={css.count} data-testid="ks-count"><b>{openCount}</b> / {rows.length} {say('ks.coll.open')}{checking&&<span> · {say('ks.coll.checking')}</span>}</p>
    {gate4?<p className={css.fine}>{say('ks.coll.lockedNote')}</p>:<p className={css.fine}>{say('ks.coll.openNote')}</p>}
    <p className={css.fine} data-testid="ks-own-note">{say('ks.own.note')}</p>
    {openCount>0&&<div className={css.cta2}><ShareComposer label={say('ks.coll.share')} draft={closetDraft}/></div>}
   </header>
   {variants.length>1&&<div className={css.filters} role="group" aria-label={say('ks.filter')}>
    {(['all',...variants] as const).map(v=><button key={v} type="button" className={`min-h-tap ${css.chip}`} aria-pressed={filter===v} onClick={()=>setFilter(v as typeof filter)}>{v==='all'?say('ks.filter.all'):variantName(v)}</button>)}</div>}
   {rows.length===0?<p className={css.note}>{say('ks.coll.empty')}</p>:<ul className={css.grid} data-testid="ks-grid">
    {shown.map(r=>{
     const k=opened[r.id],b=built[r.id]
     return <li key={r.id}><button type="button" className={css.kcard} data-open={!!k} data-testid="ks-card" onClick={openSheet({k:'shirt',id:r.id})} aria-label={k?say('ks.card.open',{season:r.season,variant:variantName(r.variant)}):say('ks.card.locked',{season:r.season,variant:variantName(r.variant)})}>
      <span className={css.kcardArt}>{k?(photos[k.id]?<img src={photos[k.id]} alt={`${k.season} ${variantName(k.variant)}`} width={160} height={160} loading="lazy" data-archive-photo/>:k.cloth?<KitCloth spec={k.cloth} texture={false} monogram={monogram} viewBox="24 30 292 270"/>:<span className={css.textOnly}><bdi>{k.design||variantName(k.variant)}</bdi></span>):<span className={css.locked}><KitCloth spec={BLANK} texture={false} viewBox="24 30 292 270"/></span>}</span>
      <span className={css.kcardText}><b><bdi>{r.season}</bdi></b><small>{variantName(r.variant)}{b?.p&&<i aria-label={say('ks.card.perfect')}> ★</i>}</small></span>
      {!k&&<span className={css.lockTag}>{say('ks.card.tag')}</span>}
      {k&&<span className={css.ownTag} data-ownership={r.open?'shelf':'earned'}>{r.open?say('ks.own.shelf'):say('ks.own.earned')}</span>}
     </button></li>})}
   </ul>}
   {gate4&&<div className={css.cta2}><Link className={`min-h-tap ${css.cta}`} href={`/clubs/${club}/kit-builder?lang=${locale}`} data-testid="ks-to-builder"><b>{say('ks.coll.build')}</b></Link></div>}
  </div>}

  {/* ---- the shirt card */}
  <SlideSheet open={sheet?.k==='shirt'} onClose={closeSheet} title={sheetKit?`${sheetKit.season} · ${variantName(sheetKit.variant)}`:''} closeLabel={copy['play.close']}>
   {sheetKit&&<div className={css.sheetBody} data-testid="ks-shirt-card">
    {sheetOpen?<>
     {photos[sheetOpen.id]?<div className={css.bigShirt}><img src={photos[sheetOpen.id]} alt={`${sheetOpen.season} ${variantName(sheetOpen.variant)}`} width={320} height={320} data-archive-photo/></div>:sheetOpen.cloth?<div className={css.bigShirt}><KitCloth spec={sheetOpen.cloth} monogram={monogram} title={`${sheetOpen.season} ${variantName(sheetOpen.variant)}`}/></div>:<p className={css.note}>{say('ks.card.undrawn')}</p>}
     <dl className={css.facts}>
      <div><dt>{say('ks.fact.season')}</dt><dd><bdi>{sheetOpen.season}</bdi></dd></div>
      <div><dt>{say('ks.fact.strip')}</dt><dd>{variantName(sheetOpen.variant)}</dd></div>
      {sheetOpen.colours.length>0&&<div><dt>{say('ks.fact.colours')}</dt><dd>{sheetOpen.cloth?colourLabel(copy,{base:sheetOpen.cloth.base,trim:sheetOpen.cloth.trim}):<bdi lang={contentLocale}>{sheetOpen.colours.join(' · ')}</bdi>}</dd></div>}
      {sheetOpen.design&&<div><dt>{say('ks.fact.design')}</dt><dd><bdi lang={contentLocale}>{sheetOpen.design}</bdi></dd></div>}
      {sheetOpen.maker&&<div><dt>{say('ks.fact.maker')}</dt><dd><bdi lang={contentLocale}>{sheetOpen.maker}</bdi></dd></div>}
      {sheetOpen.sponsor&&<div><dt>{say('ks.fact.sponsor')}</dt><dd><bdi lang={contentLocale}>{sheetOpen.sponsor}</bdi></dd></div>}
      <div><dt>{say('ks.fact.shelf')}</dt><dd>{rows.find(r=>r.id===sheetOpen.id)?.open?say('ks.own.shelf'):say('ks.own.earned')}</dd></div>
      {built[sheetOpen.id]&&<div><dt>{say('ks.fact.built')}</dt><dd>{say('ks.fact.builtAcc',{f:built[sheetOpen.id]!.f})} · {built[sheetOpen.id]!.p?say('ks.fact.builtPerfect'):say('ks.fact.builtBest',{n:built[sheetOpen.id]!.s})}</dd></div>}
     </dl>
     {sheetOpen.cloth&&<p className={css.fine}>{say('ks.card.recon')}</p>}
     {sheetOpen.sources.length>0&&<p className={css.fine}>{say('ks.card.sources')}: {sheetOpen.sources.map((s,i)=><span key={i}>{s.url?<a href={s.url} target="_blank" rel="noreferrer noopener"><bdi>{s.title}</bdi></a>:<bdi>{s.title}</bdi>}{i<sheetOpen.sources.length-1?' · ':''}</span>)}</p>}
     {sheetOpen.cloth&&<button type="button" className={`min-h-tap ${css.cta} ${css.primary}`} onClick={()=>startFrom(sheetOpen)} data-testid="ks-design-from"><b>{say('ks.card.designFrom')}</b></button>}
    </>:<>
     <div className={css.bigShirt} data-locked="true"><KitCloth spec={BLANK} texture={false} title={say('ks.card.lockedArt')}/></div>
     <dl className={css.facts}><div><dt>{say('ks.fact.season')}</dt><dd><bdi>{sheetKit.season}</bdi></dd></div><div><dt>{say('ks.fact.strip')}</dt><dd>{variantName(sheetKit.variant)}</dd></div></dl>
     <p>{say('ks.card.lockedBody')}</p>
     <Link className={`min-h-tap ${css.cta} ${css.primary}`} href={`/clubs/${club}/kit-builder?lang=${locale}`}><b>{say('ks.card.buildIt')}</b></Link>
    </>}
   </div>}
  </SlideSheet>

  {/* ---- save */}
  <SlideSheet open={sheet?.k==='save'} onClose={closeSheet} title={say('ks.save.title')} closeLabel={copy['play.close']}>
   <form className={css.sheetBody} onSubmit={e=>{e.preventDefault();save(false)}}>
    <div className={css.saveShirt}><KitCloth spec={spec} monogram={monogram} texture={false} title={say('ks.stamp')}/></div>
    <label className={css.field}>{say('ks.save.name')}<input type="text" value={saveName} maxLength={32} dir="auto" onChange={e=>setSaveName(e.target.value)} autoFocus data-testid="ks-save-name"/></label>
    <p className={css.fine}>{say('ks.save.fine',{max:DESIGN_MAX})}</p>
    <div className={css.sheetActions}>
     <button type="submit" className={`min-h-tap ${css.cta} ${css.primary}`} data-testid="ks-save-confirm"><b>{designId?say('ks.save.update'):say('ks.save.confirm')}</b></button>
     {designId&&<button type="button" className={`min-h-tap ${css.cta}`} onClick={()=>save(true)}><b>{say('ks.save.asNew')}</b></button>}</div>
   </form>
  </SlideSheet>

  {/* ---- my designs */}
  <SlideSheet open={sheet?.k==='designs'} onClose={()=>{setConfirmDel(null);closeSheet()}} title={say('ks.designs.title')} closeLabel={copy['play.close']}>
   <div className={css.sheetBody}>{designs.length===0?<p>{say('ks.designs.empty')}</p>:<ul className={css.designList} data-testid="ks-design-list">{designs.map(d=><li key={d.id}>
    <button type="button" className={css.designRow} onClick={()=>load(d)} data-testid="ks-design-open"><span className={css.rowShirt}><KitCloth spec={d.spec} texture={false} monogram={monogram} viewBox="24 30 292 270"/></span><span className={css.rowText}><b><bdi>{d.name||say('ks.untitled')}</bdi></b><small>{say('ks.stamp')}{d.updated&&` · ${new Date(d.updated).toLocaleDateString(locale==='he'?'he-IL':'en-GB')}`}</small></span></button>
    <button type="button" className={`min-h-tap ${css.tool}`} onClick={()=>remove(d.id)} aria-label={say('ks.designs.delete',{name:d.name})} data-testid="ks-design-delete">{confirmDel===d.id?say('ks.designs.sure'):'×'}</button></li>)}</ul>}</div>
  </SlideSheet>

  {/* ---- start from an archive shirt */}
  <SlideSheet open={sheet?.k==='start'} onClose={closeSheet} title={say('ks.startFrom.title')} closeLabel={copy['play.close']}>
   <div className={css.sheetBody}><p>{say('ks.startFrom.body')}</p><ul className={css.designList}>{startable.map(k=><li key={k.id}><button type="button" className={css.designRow} onClick={()=>startFrom(k)} data-testid="ks-start-row"><span className={css.rowShirt}><KitCloth spec={k.cloth!} texture={false} monogram={monogram} viewBox="24 30 292 270"/></span><span className={css.rowText}><b><bdi>{k.season}</bdi></b><small>{variantName(k.variant)}</small></span></button></li>)}</ul></div>
  </SlideSheet>

  {/* ---- briefs: parameterised by this club; the memory brief only when an opened shirt exists */}
  <SlideSheet open={sheet?.k==='brief'} onClose={closeSheet} title={say('ks.brief.title')} closeLabel={copy['play.close']}>
   <div className={css.sheetBody}><p>{say('ks.brief.body')}</p>
    <ul className={css.briefItems} data-testid="ks-brief-list">{offered.map(b=><li key={b.id} data-met={hasDesign&&briefMet(b,spec,ctx)}>
     <button type="button" className={`min-h-tap ${css.briefRow}`} aria-pressed={brief.id===b.id} onClick={()=>setBriefId(b.id)} data-testid={`ks-brief-${b.id}`}>
      <span className={css.mark} aria-hidden="true">{hasDesign&&briefMet(b,spec,ctx)?'✓':'○'}</span>
      <span><b>{say(`ks.brief.${b.id}.title`)}</b><small>{say(`ks.brief.${b.id}.body`,{primary:identity.primary?say(`kb.colour.${identity.primary}`):'',secondary:identity.secondary?say(`kb.colour.${identity.secondary}`):'',season:ctx.memory?.season??'',club:clubName})}</small></span>
      <span className="sr-only">{hasDesign&&briefMet(b,spec,ctx)?say('ks.brief.met'):say('ks.brief.open')}</span></button></li>)}</ul>
    {brief.id==='memory'&&refs.length>1&&<div className={css.strip} role="group" aria-label={say('ks.brief.memory.pick')}>{refs.map(r=><button key={r.id} type="button" className={`min-h-tap ${css.chip}`} aria-pressed={ctx.memory?.id===r.id} onClick={()=>setMemoryId(r.id)}><bdi>{r.season}</bdi></button>)}</div>}
    {refs.length===0&&<p className={css.fine}>{say('ks.brief.memory.none')}</p>}</div>
  </SlideSheet>

  {/* ---- the design scorecard: heuristics, with N/A where the club has nothing to compare */}
  <SlideSheet open={sheet?.k==='score'} onClose={closeSheet} title={say('ks.score.title')} closeLabel={copy['play.close']}>
   <div className={css.sheetBody} data-testid="ks-scorecard">
    <p className={css.fine}>{say('ks.score.body')}</p>
    <ul className={css.metricList}>{METRICS.map(id=>{const m=card.metrics.find(x=>x.id===id)!;return <li key={id} data-na={m.value===null}><span><b>{say(`ks.metric.${id}`)}</b><small>{say(`ks.metric.${id}.note`,{n:card.compared,dna:DNA_THRESHOLD})}</small></span><span className={css.metricVal} data-testid={`ks-metric-${id}`}>{m.value===null?say('ks.metric.na'):m.value}</span></li>})}</ul>
    <p className={css.overall} data-testid="ks-overall">{say('ks.score.overall')}: <b>{card.overall===null?'—':card.overall}</b></p>
    <p className={css.fine}>{say('ks.score.fine')}</p>
   </div>
  </SlideSheet>

  {/* ---- help */}
  <SlideSheet open={sheet?.k==='help'} onClose={closeSheet} title={say('ks.help.title')} closeLabel={copy['play.close']}>
   <div className={css.sheetBody}><p>{say('ks.help.studio')}</p><p>{say('ks.help.fan')}</p><p>{say('ks.help.collection')}</p><p className={css.fine}>{say('ks.help.keys')}</p></div>
  </SlideSheet>
 </section>
}

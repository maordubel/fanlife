'use client'
import {useCallback,useEffect,useMemo,useState} from 'react'
import {AlbumCoupons} from './AlbumCoupons'
import {CLUB_CARDS,FEATURES,PLAYLISTS,TEMPLATES,TOPICS,OPEN_CLUBS,OPENING_SOON,type TemplateKey,type Topic} from '@/lib/marketing/campaigns'

/**
 * CAMPAIGNS (owner, 24.11.2026): every marketing campaign in one place, split by topic — the report (posts out, where
 * they went, the visits they brought), pause / resume / stop, and a new campaign from a simple template: pick, preview,
 * launch. The pictures draw themselves (v4, two hours ahead) and the marketing machine publishes; nothing else to do.
 */
type Row={id:string;name:string;topic:Topic;state:'running'|'waiting'|'paused'|'stopped'|'done';sent:number;pending:number;waiting:number;paused:number;skipped:number;failed:number
 facebook:number;instagram:number;visitors:number;views:number;clicks:number;first_at:string;last_at:string;next_at:string|null;next_label:string|null;hold:string|null}
type Preview={campaign:{id:string;name:string;days:number};rows:{at:string;t:string;label:string;hook:string;held:boolean}[]}
const STATE_L={running:'Running',waiting:'Waits for the club to open',paused:'Paused',stopped:'Stopped',done:'Finished'}
const T_L:Record<string,string>={'L-CLUB':'Club card','L-SHOP':'Product','L-SALE':'Sale','L-FILM':'Film','L-YT':'Channel','L-RUMBLE':'Royal Rumble','L-KITS':'Kit archive','L-MARKET':'Market','L-GATE':'Legends Manager','L-ALBUM':'Album','L-HUB':'FAN LIFE wall','L-GTA':'LIFE'}
const FEATURE_L={rumble:'Royal Rumble',kits:'Kit archive',legends:'Legends Manager',market:'The market'}
const when=(iso:string|null)=>iso?new Date(iso).toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Athens'}):'—'
const today=()=>new Date(Date.now()+864e5).toLocaleDateString('en-CA',{timeZone:'Europe/Athens'})
const CLUBS=[...OPEN_CLUBS,...OPENING_SOON].map(id=>CLUB_CARDS[id]!)

async function call<T>(method:'GET'|'POST',body?:unknown):Promise<T>{
 const r=await fetch('/api/master/campaigns',{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,cache:'no-store'})
 const d=await r.json().catch(()=>({error:`The server answered ${r.status}.`}))
 if(!r.ok)throw new Error(d.error||`The server answered ${r.status}.`)
 return d as T
}

export function CampaignsDesk(){
 const [rows,setRows]=useState<Row[]|null>(null),[err,setErr]=useState(''),[topic,setTopic]=useState<Topic|'all'>('all'),[busy,setBusy]=useState(false),[note,setNote]=useState('')
 const load=useCallback(async()=>{try{setRows((await call<{campaigns:Row[]}>('GET')).campaigns||[]);setErr('')}catch(e){setErr((e as Error).message);setRows([])}},[])
 useEffect(()=>{load()},[load])
 const shown=(rows??[]).filter(r=>topic==='all'||r.topic===topic)
 const sum=(k:keyof Row)=>shown.reduce((a,r)=>a+(Number(r[k])||0),0)
 const set=async(id:string,state:'pause'|'resume'|'stop')=>{
  if(state==='stop'&&!window.confirm('Stop this campaign? Its posts still ahead will not go out.'))return
  setBusy(true);try{const o=await call<{n:number}>('POST',{action:'set',id,state});setNote(`${o.n} post(s) ${state==='pause'?'paused':state==='resume'?'back in the queue':'stopped'}.`);await load()}catch(e){setErr((e as Error).message)}finally{setBusy(false)}}
 return <section className="desk-panel camp" aria-labelledby="camp-h">
  <h1 id="camp-h" className="desk-h1">Campaigns</h1>
  <p className="desk-fine">Every campaign builds its own posts, draws its own pictures and publishes on its own (Facebook, Instagram, stories). Every link carries the campaign, so the visits it brings are counted here.</p>
  <div className="desk-chips camp-topics" role="group" aria-label="Topic">
   {[{key:'all' as const,label:'All topics'},...TOPICS].map(t=><button key={t.key} type="button" className="desk-chip min-h-tap" aria-pressed={topic===t.key} onClick={()=>setTopic(t.key)}>{t.label}</button>)}
  </div>
  <dl className="camp-kpis">
   <div><dt>Running</dt><dd>{shown.filter(r=>r.state==='running').length}</dd></div>
   <div><dt>Posts out</dt><dd>{sum('sent')}</dd></div>
   <div><dt>Still ahead</dt><dd>{sum('pending')+sum('waiting')}</dd></div>
   <div><dt>Visitors brought</dt><dd>{sum('visitors')}</dd></div>
   <div><dt>Clicks on the site</dt><dd>{sum('clicks')}</dd></div>
  </dl>
  {err&&<p className="desk-state" data-tone="bad" role="alert">{err}</p>}
  {note&&<p className="desk-state" role="status">{note}</p>}
  {rows===null?<p className="desk-state" role="status">Loading the campaigns…</p>:shown.length===0?<p className="desk-state">No campaign in this topic yet — build one below.</p>:
   <ul className="camp-list">{shown.map(r=><li key={r.id} className="camp-card" data-state={r.state}>
    <div className="camp-head"><b>{r.name}</b><span className="camp-tag">{TOPICS.find(t=>t.key===r.topic)?.label??r.topic}</span><span className="camp-state">{STATE_L[r.state]}</span></div>
    <p className="desk-fine">{when(r.first_at)} → {when(r.last_at)}{r.next_at?` · next: ${r.next_label??''} ${when(r.next_at)}`:''}{r.state==='waiting'&&r.hold?` · goes the evening ${r.hold.replace('open:','')} opens`:''}</p>
    <dl className="camp-nums">
     <div><dt>Out</dt><dd>{r.sent}</dd></div><div><dt>Ahead</dt><dd>{r.pending+r.waiting}</dd></div><div><dt>Facebook</dt><dd>{r.facebook}</dd></div><div><dt>Instagram</dt><dd>{r.instagram}</dd></div>
     <div><dt>Visitors</dt><dd>{r.visitors}</dd></div><div><dt>Page views</dt><dd>{r.views}</dd></div><div><dt>Clicks</dt><dd>{r.clicks}</dd></div>{r.failed>0&&<div><dt>Failed</dt><dd>{r.failed}</dd></div>}
    </dl>
    <div className="camp-acts">
     {r.state==='running'&&<button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={()=>set(r.id,'pause')}>Pause</button>}
     {r.state==='paused'&&<button type="button" className="desk-btn min-h-tap" disabled={busy} onClick={()=>set(r.id,'resume')}>Resume</button>}
     {(r.state==='running'||r.state==='waiting'||r.state==='paused')&&<button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={()=>set(r.id,'stop')}>Stop</button>}
    </div>
   </li>)}</ul>}
  <Builder onLaunched={async m=>{setNote(m);await load()}}/>
 </section>
}

function Builder({onLaunched}:{onLaunched:(msg:string)=>Promise<void>}){
 const [tpl,setTpl]=useState<TemplateKey>('club-days'),[clubs,setClubs]=useState<string[]>(['panathinaikos']),[feature,setFeature]=useState<string>('legends')
 const [start,setStart]=useState(today()),[days,setDays]=useState<number>(TEMPLATES['club-days'].days),[name,setName]=useState(''),[opened,setOpened]=useState(false)
 const [sale,setSale]=useState({label:'Weekend sale',percent:15,ends:'',starts:''}),[code,setCode]=useState(''),[playlist,setPlaylist]=useState('')
 const [pre,setPre]=useState<Preview|null>(null),[busy,setBusy]=useState(false),[err,setErr]=useState('')
 const t=TEMPLATES[tpl],multi=tpl!=='club-days'&&tpl!=='club-opening'
 const body=useMemo(()=>({template:tpl,clubs,feature,start,days,name:name||undefined,opened,code:tpl==='album-push'&&code?code:undefined,playlist:tpl==='film-push'&&playlist?playlist:undefined,sale:tpl==='sale-beats'?{...sale,starts:sale.starts||undefined}:undefined}),[tpl,clubs,feature,start,days,name,opened,sale,code,playlist])
 useEffect(()=>{setPre(null)},[body])
 const pick=(k:TemplateKey)=>{setTpl(k);setDays(TEMPLATES[k].days);if(k==='club-days'||k==='club-opening')setClubs(c=>c.slice(0,1).length?c.slice(0,1):['panathinaikos'])}
 const toggle=(id:string)=>setClubs(c=>multi?(c.includes(id)?c.filter(x=>x!==id):[...c,id]):[id])
 const run=async(action:'preview'|'launch')=>{setBusy(true);setErr('')
  try{if(action==='preview')setPre(await call<Preview>('POST',{action,...body}))
   else{if(!window.confirm(`Launch “${pre?.campaign.name}”? ${pre?.rows.length} post(s) go into the publishing queue.`))return
    const o=await call<{n:number;dropped:number;campaign:{name:string}}>('POST',{action,...body});setPre(null);await onLaunched(`“${o.campaign.name}” is running: ${o.n} post(s) queued${o.dropped?`, ${o.dropped} in the past left out`:''}.`)}}
  catch(e){setErr((e as Error).message)}finally{setBusy(false)}}
 return <section className="desk-card camp-new" aria-labelledby="camp-new-h">
  <h2 className="desk-h2" id="camp-new-h">New campaign</h2>
  <p className="desk-fine"><b>1 · Pick a template</b></p>
  <div className="camp-templates" role="radiogroup" aria-label="Template">
   {(Object.keys(TEMPLATES) as TemplateKey[]).map(k=><button key={k} type="button" role="radio" aria-checked={tpl===k} className="camp-tpl min-h-tap" onClick={()=>pick(k)}><b>{TEMPLATES[k].label}</b><small>{TEMPLATES[k].hint}</small></button>)}
  </div>
  <p className="desk-fine"><b>2 · {multi?'Clubs (one a day, in turn — none = every open club)':'Club'}</b></p>
  <div className="desk-chips" role="group" aria-label="Clubs">{CLUBS.map(c=><button key={c.id} type="button" className="desk-chip min-h-tap" aria-pressed={clubs.includes(c.id)} onClick={()=>toggle(c.id)}>{c.name}{OPENING_SOON.includes(c.id)?' · opening':''}</button>)}</div>
  <div className="shop-row camp-fields">
   {tpl==='feature-push'&&<label className="shop-field"><span>Game or feature</span><select value={feature} onChange={e=>setFeature(e.target.value)}>{FEATURES.map(f=><option key={f} value={f}>{FEATURE_L[f]}</option>)}</select></label>}
   <label className="shop-field"><span>First day</span><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
   <label className="shop-field"><span>Days</span><input type="number" min={1} max={31} value={days} onChange={e=>setDays(Number(e.target.value)||1)}/></label>
   <label className="shop-field"><span>Name (optional)</span><input maxLength={80} value={name} placeholder={t.label} onChange={e=>setName(e.target.value)}/></label>
   {tpl==='album-push'&&<label className="shop-field"><span>Code (optional, e.g. FANLIFE99)</span><input maxLength={40} value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,''))}/></label>}
   {tpl==='film-push'&&<label className="shop-field"><span>Series (when no club is picked)</span><select value={playlist} onChange={e=>setPlaylist(e.target.value)}><option value="">The clubs’ own films</option>{Object.entries(PLAYLISTS).map(([k,p])=><option key={k} value={k}>{p.name}</option>)}</select></label>}
   {tpl==='club-opening'&&<label className="shop-field"><span>The club is already open</span><input type="checkbox" checked={opened} onChange={e=>setOpened(e.target.checked)}/></label>}
   {tpl==='sale-beats'&&<>
    <label className="shop-field"><span>Sale name (as in the shop)</span><input maxLength={40} value={sale.label} onChange={e=>setSale({...sale,label:e.target.value})}/></label>
    <label className="shop-field"><span>Up to % off</span><input type="number" min={5} max={60} value={sale.percent} onChange={e=>setSale({...sale,percent:Number(e.target.value)||15})}/></label>
    <label className="shop-field"><span>Sale starts</span><input type="date" value={sale.starts} onChange={e=>setSale({...sale,starts:e.target.value})}/></label>
    <label className="shop-field"><span>Last day (e.g. Mon 30 Nov)</span><input maxLength={24} value={sale.ends} onChange={e=>setSale({...sale,ends:e.target.value})}/></label>
   </>}
  </div>
  {tpl==='album-push'&&<><p className="desk-fine">The posts announce the code; the code itself lives here (FANLIFE99 is already on: 3 envelopes, until 31 Dec).</p><AlbumCoupons/></>}
  {tpl==='sale-beats'&&<p className="desk-fine">Save the sale itself in Shop → Sales first: the posts read its real cut and days when they are drawn.</p>}
  {tpl==='club-opening'&&!opened&&<p className="desk-fine">Two teaser evenings go out as planned; opening night and the days after wait until the club’s page is open to the public, then go out by themselves (opening night at 19:47).</p>}
  {err&&<p className="desk-state" data-tone="bad" role="alert">{err}</p>}
  <div className="camp-acts"><button type="button" className="desk-btn ghost min-h-tap" disabled={busy} onClick={()=>run('preview')}>3 · Preview</button>
   {pre&&<button type="button" className="desk-btn min-h-tap" disabled={busy||!pre.rows.length} onClick={()=>run('launch')}>4 · Launch {pre.rows.length} post(s)</button>}</div>
  {pre&&<div className="desk-table-wrap"><table className="desk-table"><caption className="desk-fine">{pre.campaign.name}</caption>
   <thead><tr><th scope="col">When</th><th scope="col">Picture</th><th scope="col">Caption opens with</th></tr></thead>
   <tbody>{pre.rows.map((r,i)=><tr key={i}><th scope="row">{r.at}{r.held&&<small>waits for the club</small>}</th><td data-label="Picture">{T_L[r.t]??r.t}</td><td data-label="Caption">{r.hook}</td></tr>)}</tbody></table></div>}
 </section>
}

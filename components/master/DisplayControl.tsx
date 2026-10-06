'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import {BOOLEANS,DISPLAY_DEFAULTS,ENUMS,RANGES,changedKeys,type DisplayConfig,type LifeDisplayState} from '@/lib/master/lifeDisplay'
import type {useAdminApi} from './adminApi'

/**
 * LIFE display — the control room's view of the voxel engine's DISP object (rule: settings live here, not on a
 * standalone page). The preview is the real engine in a same-origin frame driven by postMessage and it NEVER
 * persists; only Save draft / Publish touch the server, and only Publish reaches players (/life/voxel/display.json).
 */
const DEVICES=[['phone-s','Phone S',320,568],['phone','Phone',390,844],['tablet','Tablet',768,1024],['laptop','Laptop',1280,720],['hd','Full HD',1920,1080],['fit','Fit',0,0]] as const
type Device=typeof DEVICES[number][0]
const GROUPS:{label:string;keys:(keyof DisplayConfig)[]}[]=[
 {label:'View',keys:['zoom','fov','azimuth','elevation']},
 {label:'Character',keys:['figure','charScale','mirror','faces']},
 {label:'Look',keys:['exposure','warmth','vignette','grain','blob','blobOpacity']},
 {label:'Behaviour',keys:['idle','quality']},
]
const LABEL:Record<string,string>={zoom:'Zoom',fov:'Field of view',azimuth:'Camera turn',elevation:'Camera height',figure:'Figure',charScale:'Character size',mirror:'Mirror',faces:'Faces',exposure:'Exposure',warmth:'Warmth',vignette:'Vignette',grain:'Grain',blob:'Ground shadow',blobOpacity:'Shadow strength',idle:'Idle motion',quality:'Render quality',mood:'Mood'}
type Ready={rooms:{id:string;label:string}[];clubs:{id:string;label:string}[];moods:string[]}

export function DisplayControl({initial,api}:{initial:LifeDisplayState;api:ReturnType<typeof useAdminApi>}){
 const [state,setState]=useState(initial),[work,setWork]=useState<DisplayConfig>({...(initial.draft||initial.live)})
 const [device,setDevice]=useState<Device>('phone'),[ready,setReady]=useState<Ready|null>(null)
 const [scene,setScene]=useState({club:'',time:'day',room:'',mood:'normal'})
 const frame=useRef<HTMLIFrameElement>(null)
 // a phone cannot show a 390px device inside its own column; it starts on Fit and can still pick any size
 useEffect(()=>{if(window.innerWidth<720)setDevice('fit')},[])
 const send=(extra:Record<string,unknown>={})=>frame.current?.contentWindow?.postMessage({type:'life-display',patch:work,...scene,...extra},location.origin)
 useEffect(()=>{const on=(e:MessageEvent)=>{if(e.origin!==location.origin||!e.data)return;if(e.data.type==='life-display-ready'){setReady({rooms:e.data.rooms||[],clubs:e.data.clubs||[],moods:e.data.moods||[]});setScene(s=>({...s,club:e.data.club||s.club,room:e.data.room||s.room}))}};window.addEventListener('message',on);return()=>window.removeEventListener('message',on)},[])
 useEffect(()=>{if(ready)send()},[work,scene,ready])// eslint-disable-line react-hooks/exhaustive-deps
 const saved=state.draft||state.live
 const unsaved=useMemo(()=>changedKeys(work,saved),[work,saved]),toPublish=useMemo(()=>state.draft?changedKeys(state.draft,state.live):[],[state])
 const set=<K extends keyof DisplayConfig>(k:K,v:DisplayConfig[K])=>setWork(w=>({...w,[k]:v}))
 const act=async(action:string,message:string,body:unknown={})=>{const r=await api.post<LifeDisplayState>(`life-display/${action}`,body,message);if(r?.live){setState(r);setWork({...(r.draft||r.live)})}}
 const dev=DEVICES.find(d=>d[0]===device)!
 const download=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state.live,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='display.json';a.click();URL.revokeObjectURL(url)}
 return <section className="panel dc" aria-labelledby="dc-h">
  <div className="section-head"><div><p className="eyebrow">LIFE / DISPLAY</p><h2 id="dc-h">How the world looks to every player</h2><p className="muted">The preview never saves. Players get the live version; a player’s own choice in the game still wins for that player.</p></div></div>
  <div className="dc-bar" role="group" aria-label="Publishing">
   <p><b>Live</b> · revision {state.revision}{state.publishedAt?` · published ${state.publishedAt.slice(0,16).replace('T',' ')} UTC`:' · code defaults'}</p>
   <p>{state.draft?<><b>Draft waiting</b> · {toPublish.length?`changes ${toPublish.join(', ')}`:'same as live'}</>:'No draft'}{unsaved.length?<> · <b>Unsaved here</b>: {unsaved.join(', ')}</>:null}</p>
   <div className="dc-actions">
    <button className="min-h-tap button" disabled={api.busy||!unsaved.length} onClick={()=>act('save-draft','Draft saved. Players still see live.',{patch:work})}>Save draft</button>
    <button className="min-h-tap button" disabled={api.busy||!state.draft||unsaved.length>0} title={unsaved.length?'Save the draft first':undefined} onClick={()=>act('publish','Published. Players get it within a minute.')}>Publish ↗</button>
    <button className="min-h-tap button secondary" disabled={api.busy||!state.previous} onClick={()=>act('revert','Back to the previous version.')}>Revert to previous</button>
    <button className="min-h-tap button secondary" disabled={api.busy} onClick={()=>act('reset','Reset to the engine defaults and published.')}>Reset to defaults</button>
    <button className="min-h-tap button secondary" onClick={()=>setWork({...saved})} disabled={!unsaved.length}>Discard unsaved</button>
    <button className="min-h-tap button secondary" onClick={download}>Download display.json ↓</button>
   </div>
  </div>
  <div className="dc-grid">
   <div className="dc-stage">
    <div className="dc-pickers">
     <label>Device<select value={device} onChange={e=>setDevice(e.target.value as Device)}>{DEVICES.map(([k,l,w,h])=><option key={k} value={k}>{l}{w?` · ${w}×${h}`:''}</option>)}</select></label>
     <label>Club<select value={scene.club} onChange={e=>setScene({...scene,club:e.target.value})} disabled={!ready}>{(ready?.clubs||[]).map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
     <label>Room<select value={scene.room} onChange={e=>setScene({...scene,room:e.target.value})} disabled={!ready}>{(ready?.rooms||[]).map(r=><option key={r.id} value={r.id}>{r.label}</option>)}</select></label>
     <label>Time<select value={scene.time} onChange={e=>setScene({...scene,time:e.target.value})}><option value="day">Day</option><option value="night">Night</option></select></label>
     <label>Mood<select value={scene.mood} onChange={e=>setScene({...scene,mood:e.target.value})}>{(ready?.moods.length?ready.moods:ENUMS.mood).map(m=><option key={m} value={m}>{m}</option>)}</select></label>
    </div>
    <div className="dc-viewport" data-device={device}>
     <iframe ref={frame} title="LIFE preview" src="/life/voxel/display-preview.html" style={dev[2]?{inlineSize:dev[2],blockSize:dev[3]}:undefined} onLoad={()=>setReady(null)}/>
    </div>
    {!ready&&<p className="muted" role="status">Loading the engine…</p>}
   </div>
   <form className="dc-controls" onSubmit={e=>e.preventDefault()}>
    {GROUPS.map(g=><fieldset key={g.label}><legend>{g.label}</legend>{g.keys.map(k=><Control key={k} k={k} value={work[k]} onChange={v=>set(k,v as never)}/>)}</fieldset>)}
   </form>
  </div>
 </section>
}

function Control({k,value,onChange}:{k:keyof DisplayConfig;value:unknown;onChange:(v:unknown)=>void}){
 const dflt=(DISPLAY_DEFAULTS as Record<string,unknown>)[k],changed=value!==dflt,label=LABEL[k]||k
 if(k in RANGES){const [lo,hi,step]=RANGES[k as keyof typeof RANGES];return <label className="dc-range" data-changed={changed||undefined}><span>{label}<output>{Number(value).toFixed(step<1?2:0)}</output></span><input type="range" min={lo} max={hi} step={step} value={Number(value)} onChange={e=>onChange(Number(e.target.value))}/></label>}
 if((BOOLEANS as readonly string[]).includes(k))return <label className="dc-check min-h-tap" data-changed={changed||undefined}><input type="checkbox" checked={Boolean(value)} onChange={e=>onChange(e.target.checked)}/> {label}</label>
 const opts=ENUMS[k as keyof typeof ENUMS] as readonly string[]
 return <label className="dc-enum" data-changed={changed||undefined}>{label}<select value={String(value)} onChange={e=>onChange(e.target.value)}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select></label>
}

'use client'
import {useEffect,useRef,useState} from 'react'
import {usePathname} from 'next/navigation'
import {capped,delayOf,eligible,isOwn,outbound,pageOf,pickBanner,showOf} from '@/lib/promo/rules'
import type {Banner,Page,PromoDoc,Seen} from '@/lib/promo/types'
import {busy as busyNow,familyOf,occupied,snooze,snoozed} from '@/lib/universe/attention'

const KEY='fanlife.promo.v1',SKEY='fanlife.promo.session.v1'
type Session={seen:Seen;shown:number;last:number;lastId:string|null;stop:boolean;/** where each shown banner led, so its family survives a config change */fam?:Record<string,string>}
const read=<T,>(store:'local'|'session',key:string,d:T):T=>{try{const s=store==='local'?localStorage:sessionStorage;const v=s.getItem(key);return v?JSON.parse(v) as T:d}catch{return d}}
const write=(store:'local'|'session',key:string,v:unknown)=>{try{(store==='local'?localStorage:sessionStorage).setItem(key,JSON.stringify(v))}catch{/* a convenience, never a requirement */}}
const blank=():Session=>({seen:{},shown:0,last:0,lastId:null,stop:false})
const reduce=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches

/** where the viewer is NOW: a club page names its club in the DOM (a club's own host has no /clubs/ prefix in the address bar) */
function here():Page{
 const club=document.querySelector<HTMLElement>('.club-app')?.dataset.club||null
 return pageOf(club,location.pathname)
}
/** nothing over a decision (rule 28), and one discovery unit at a time (Connected Football §11) */
const busy=()=>busyNow()||occupied('promo')
/** one family per visit, whatever the language variant; a snoozed family stays away for seven days */
const familyFree=(b:Banner,s:Session)=>{const f=familyOf(b.id,b.href);return !snoozed(f)&&!Object.keys(s.seen).some(id=>id!==b.id&&s.seen[id]&&familyOf(id,s.fam?.[id]??'')===f)}

/**
 * The slide-up banner. 3 s after the page loads (the owner's setting) one eligible banner rises from the bottom, stays
 * its show time (7 s), and drops away. Hover or keyboard focus holds it. Per-device caps live in localStorage, per-visit
 * caps in sessionStorage; both are optional — without them the banner simply rotates by chance.
 */
export function PromoBanner({doc,israel,greece=false}:{doc:PromoDoc;israel:boolean;greece?:boolean}){
 const path=usePathname(),[shown,setShown]=useState<{b:Banner;page:Page}|null>(null),[up,setUp]=useState(false)
 const hold=useRef(false),timers=useRef<number[]>([]),current=useRef<string|null>(null)
 const clear=()=>{timers.current.forEach(clearTimeout);timers.current=[]}
 const later=(fn:()=>void,ms:number)=>{timers.current.push(window.setTimeout(fn,ms))}

 useEffect(()=>{
  clear();setUp(false);setShown(null)
  const sess=read<Session>('session',SKEY,blank());if(sess.stop)return
  const now0=Date.now(),page0=here();const cap=doc.settings.maxPerSession
  if(cap>0&&sess.shown>=cap)return
  const pool=()=>{const now=Date.now(),page=here(),seen=read<Seen>('local',KEY,{}),s=read<Session>('session',SKEY,blank())
   return {page,now,seen,s,list:eligible(doc,page,now,{israel,greece}).filter(b=>!capped(b,seen,s.seen,now)&&familyFree(b,s))}}
  // the first banner of a visit waits the banner's own delay; later pages wait the gap since the last one closed
  const first=pickBanner(pool().list,pool().seen,sess.lastId,now0,Math.random)
  if(!first)return
  const sinceLast=sess.last?Math.max(0,doc.settings.gapSec*1000-(now0-sess.last)):0
  const wait=Math.max(delayOf(first,doc.settings),sinceLast)
  const attempt=()=>{
   if(hold.current||busy()){later(attempt,1500);return}
   const {page,now,seen,s,list}=pool();if(s.stop||(cap>0&&s.shown>=cap))return
   const b=pickBanner(list,seen,s.lastId,now,Math.random);if(!b)return
   current.current=b.id;setShown({b,page})
   window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>setUp(true)))
   const record=()=>{const t=Date.now(),sn=read<Seen>('local',KEY,{}),day=(sn[b.id]?.day)
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem'}).format(new Date(t))
    const prev=sn[b.id];sn[b.id]={n:(prev?.n??0)+1,last:t,day:today,dn:prev&&day===today?prev.dn+1:1}
    write('local',KEY,sn)
    const ss=read<Session>('session',SKEY,blank());ss.seen[b.id]={n:(ss.seen[b.id]?.n??0)+1,last:t,day:today,dn:1};ss.fam={...ss.fam,[b.id]:b.href};ss.shown+=1;ss.last=t;ss.lastId=b.id;write('session',SKEY,ss)}
   record()
   const close=()=>{if(hold.current){later(close,1000);return}setUp(false);later(()=>{setShown(null);current.current=null
     const ss=read<Session>('session',SKEY,blank());ss.last=Date.now();write('session',SKEY,ss)
     if(!(cap>0&&ss.shown>=cap)&&!ss.stop)later(attempt,Math.max(1000,doc.settings.gapSec*1000))},reduce()?0:460)}
   later(close,showOf(b,doc.settings))
  }
  later(attempt,wait)
  void page0
  return clear
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[path,doc,israel,greece])

 if(!shown)return null
 const {b,page}=shown
 const dismiss=()=>{snooze(familyOf(b.id,b.href));const ss=read<Session>('session',SKEY,blank());ss.stop=true;ss.last=Date.now();write('session',SKEY,ss);clear();setUp(false);window.setTimeout(()=>setShown(null),reduce()?0:460)}
 return <aside className="promo" data-up={up?'true':'false'} data-discovery-unit="promo" data-family={familyOf(b.id,b.href)} data-promo={b.id} role="complementary" aria-label="Advertisement"
  onPointerEnter={()=>{hold.current=true}} onPointerLeave={()=>{hold.current=false}} onFocusCapture={()=>{hold.current=true}} onBlurCapture={()=>{hold.current=false}}>
  <a className="promo-link" href={outbound(b,page)} {...(isOwn(b)?{}:{target:'_blank',rel:'noopener noreferrer sponsored'})} aria-label={b.alt||b.name}>
   <img src={b.img1x} srcSet={`${b.img1x} 1x, ${b.img2x} 2x`} width={320} height={50} alt={b.alt||b.name} decoding="async"/>
  </a>
  <button type="button" className="promo-x min-h-tap" onClick={dismiss} aria-label="Close advertisement">×</button>
  <span className="promo-tag" aria-hidden="true">Ad</span>
 </aside>
}

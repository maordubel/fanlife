import {SHARED_GATES} from '@/lib/clubs/gates'

/**
 * Pinned shortcuts (owner audit 27.10.2026 §5.4–5.5): one or two places the FAN chose — never a suggestion, never a
 * discovery unit, never snoozed. Device-only under `fanlife.pins.v1` (like "I was there", `lib/fanlife/been.ts`, which
 * FAN LIFE does not sync to an account either). A pin is an internal route from a closed list, checked by a regex per
 * kind on the way in AND on the way out of storage — an arbitrary URL can never be pinned or rendered.
 */
export const PINS_KEY='fanlife.pins.v1'
export const PINS_EVENT='fanlife:pins'
export const MAX_PINS=2

export type PinKind='club'|'gate'|'life'|'legends'|'allFootball'|'app'
export type Pin={href:string;label:string;kind:PinKind;at:string}

const SLUG='[a-z0-9][a-z0-9-]{1,59}'
const GATE_KEYS=new Set<string>(SHARED_GATES.map(g=>g.key))
const RULES:[PinKind,RegExp][]=[
 ['club',new RegExp(`^/clubs/${SLUG}$`)],
 ['life',new RegExp(`^/clubs/${SLUG}/life$`)],
 ['gate',new RegExp(`^/clubs/${SLUG}/([a-z-]{2,20})$`)],
 ['legends',/^\/all-football\/legends(?:\/career\/[A-Za-z0-9_-]{1,80})?$/],
 ['allFootball',/^\/all-football$/],
 ['app',new RegExp(`^/go/(?:dubid|offsides)\\?c=pin(?:&club=${SLUG})?$`)],
]

/** The kind of an internal route, or null when it is not on the list. */
export function pinKind(href:unknown):PinKind|null{
 if(typeof href!=='string'||href.length>160)return null
 for(const [kind,re] of RULES){
  const m=re.exec(href)
  if(!m)continue
  if(kind==='gate'&&!GATE_KEYS.has(m[1]!))return null
  return kind
 }
 return null
}

const CLEAN=/[\u0000-\u001f\u007f<>]/g
export function cleanLabel(label:unknown):string|null{
 if(typeof label!=='string')return null
 const s=label.replace(CLEAN,'').replace(/\s+/g,' ').trim().slice(0,60)
 return s||null
}

/** A pin from anything (storage, a prop): valid or null. */
export function toPin(raw:unknown):Pin|null{
 if(!raw||typeof raw!=='object')return null
 const r=raw as Record<string,unknown>,kind=pinKind(r.href),label=cleanLabel(r.label)
 if(!kind||!label)return null
 return {href:r.href as string,label,kind,at:typeof r.at==='string'&&r.at.length<40?r.at:''}
}

/** Stored list → at most two valid, unique pins, order kept. */
export function normalizePins(raw:unknown):Pin[]{
 if(!Array.isArray(raw))return []
 const out:Pin[]=[]
 for(const x of raw){const p=toPin(x);if(p&&!out.some(o=>o.href===p.href))out.push(p);if(out.length>=MAX_PINS)break}
 return out
}

export type AddResult={ok:true;pins:Pin[]}|{ok:false;reason:'invalid'|'full'}
/** Adds at the end. Full (two pins) is refused unless `replace` names the one to give up — it takes that one's place. */
export function addPin(list:readonly Pin[],href:string,label:string,o:{replace?:string;now?:string}={}):AddResult{
 const p=toPin({href,label,at:o.now??new Date().toISOString()})
 if(!p)return {ok:false,reason:'invalid'}
 const cur=normalizePins(list)
 if(cur.some(x=>x.href===p.href))return {ok:true,pins:cur}
 if(o.replace){const i=cur.findIndex(x=>x.href===o.replace);if(i>=0){const next=[...cur];next[i]=p;return {ok:true,pins:next}}}
 if(cur.length>=MAX_PINS)return {ok:false,reason:'full'}
 return {ok:true,pins:[...cur,p]}
}
export const removePin=(list:readonly Pin[],href:string):Pin[]=>normalizePins(list).filter(x=>x.href!==href)
export const isPinned=(list:readonly Pin[],href:string)=>list.some(x=>x.href===href)

/** The link as drawn: a club's pages keep `?lang` (clubHref), everything else is the stored route. */
export function pinHref(p:Pin,locale:string='en'):string{
 if(locale==='en'||!/^(?:he|el|hr|bs|sr|de)$/.test(locale))return p.href
 return p.kind==='club'||p.kind==='gate'||p.kind==='life'?`${p.href}?lang=${locale}`:p.href
}
/** The route a page pins: its path with no query (a club page's `?lang` is dropped so the same place is one pin). */
export const pinTarget=(path:string)=>path.split(/[?#]/)[0]!.replace(/\/+$/,'')||'/'

// ── device storage ─────────────────────────────────────────────────────────────────────────────────────────────────
let memory:Pin[]=[]
let cache:{raw:string|null;pins:Pin[]}|null=null
export function readPins():Pin[]{
 let raw:string|null=null
 try{raw=localStorage.getItem(PINS_KEY)}catch{return memory}
 if(cache&&cache.raw===raw)return cache.pins
 let pins:Pin[]=[]
 try{pins=raw&&raw.length<4000?normalizePins(JSON.parse(raw)):[]}catch{pins=[]}
 cache={raw,pins};return pins
}
export function writePins(pins:readonly Pin[]):void{
 const next=normalizePins(pins)
 memory=next
 try{const raw=JSON.stringify(next);localStorage.setItem(PINS_KEY,raw);cache={raw,pins:next}}catch{cache=null}
 try{window.dispatchEvent(new Event(PINS_EVENT))}catch{/* no window */}
}
/** Same tab (custom event) and other tabs (`storage`). */
export function subscribePins(cb:()=>void):()=>void{
 const onStorage=(e:StorageEvent)=>{if(e.key===null||e.key===PINS_KEY){cache=null;cb()}}
 window.addEventListener(PINS_EVENT,cb);window.addEventListener('storage',onStorage)
 return ()=>{window.removeEventListener(PINS_EVENT,cb);window.removeEventListener('storage',onStorage)}
}

// ── the switch, as the page's server told it (door('pins')) ───────────────────────────────────────────────────────
let enabled=false
const listeners=new Set<()=>void>()
export function setPinsEnabled(on:boolean){if(enabled===on)return;enabled=on;listeners.forEach(f=>f())}
export const pinsEnabled=()=>enabled
export function subscribeEnabled(cb:()=>void){listeners.add(cb);return ()=>{listeners.delete(cb)}}

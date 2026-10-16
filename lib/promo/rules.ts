import type {Banner,Page,PageRule,PromoDoc,PromoSettings,Seen,Targeting} from './types'

/** Never shown, whatever a banner says: the control room, test pages, and The Worker's game run (rule 28). */
export const NEVER_ON=['/master','/qa','/life','/api','/closet/play']
export const DEFAULTS:PromoSettings={enabled:true,delaySec:3,showSec:7,gapSec:45,maxPerSession:3,pageRules:[]}
const pathStarts=(path:string,prefix:string)=>prefix==='/'?(path==='/'||path===''):path===prefix||path.startsWith(prefix.endsWith('/')?prefix:prefix+'/')

export function pageOf(club:string|null,path:string):Page{
 if(club)return {kind:'club',club,path}
 if(path==='/'||path==='')return {kind:'home'}
 return {kind:'other',path}
}
export const pageKey=(p:Page)=>p.kind==='home'?'home':p.kind==='club'?`club:${p.club}`:'other'

/** may this banner appear on this page by its own targeting? */
export function pageAllows(t:Targeting,p:Page):boolean{
 const path=p.kind==='home'?'/':p.path
 if(NEVER_ON.some(x=>pathStarts(path,x)))return false
 if(t.exclude.some(x=>pathStarts(path,x)))return false
 if(p.kind==='home')return t.home
 if(p.kind==='club')return t.allClubs||t.clubs.includes(p.club)
 return t.other||t.paths.some(x=>pathStarts(path,x))
}
/** the per-page rule: a club's own row beats "clubs", which beats nothing */
export function ruleFor(rules:readonly PageRule[],p:Page):PageRule|null{
 const find=(k:string)=>rules.find(r=>r.page===k)??null
 return p.kind==='home'?find('home'):p.kind==='club'?find(`club:${p.club}`)??find('clubs'):find('other')
}

/** Israel's clock, whatever the viewer's: schedule is judged where the audience is */
export function israelClock(now:number):{dow:number;hour:number;day:string}{
 const f=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',weekday:'short',hour:'2-digit',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now))
 const g=(t:string)=>f.find(x=>x.type===t)?.value??''
 const dow=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(g('weekday'))
 return {dow,hour:Number(g('hour')),day:`${g('year')}-${g('month')}-${g('day')}`}
}
export function inWindow(b:Banner,now:number):boolean{
 if(b.startsAt&&now<Date.parse(b.startsAt))return false
 if(b.endsAt&&now>Date.parse(b.endsAt))return false
 const c=israelClock(now)
 if(b.days.length&&!b.days.includes(c.dow))return false
 const {fromHour:a,toHour:z}=b
 if(a===z)return true // 0–0 (or any equal pair) = all day
 return a<z?(c.hour>=a&&c.hour<z):(c.hour>=a||c.hour<z) // 22→6 wraps midnight
}

export type Viewer={israel:boolean}
/** every banner that may be put in front of this viewer on this page right now, before frequency caps */
export function eligible(doc:Pick<PromoDoc,'settings'|'banners'>,page:Page,now:number,v:Viewer):Banner[]{
 if(!doc.settings.enabled)return []
 const rule=ruleFor(doc.settings.pageRules,page)
 if(rule?.mode==='off')return []
 return doc.banners.filter(b=>b.enabled&&(b.audience==='all'||v.israel)&&pageAllows(b.targeting,page)&&inWindow(b,now)&&(!rule||rule.mode!=='only'||rule.only.includes(b.id)))
}

/** frequency caps: per session, per Israel day, and a cooldown between two showings of one banner */
export function capped(b:Banner,seen:Seen,session:Seen,now:number):boolean{
 if(b.maxPerSession>0&&(session[b.id]?.n??0)>=b.maxPerSession)return true
 const s=seen[b.id],day=israelClock(now).day
 if(s){
  if(b.maxPerDay>0&&s.day===day&&s.dn>=b.maxPerDay)return true
  if(b.cooldownMin>0&&now-s.last<b.cooldownMin*60000)return true
 }
 return false
}
/**
 * The rotation. Weight is the owner's dial; a banner this device has never seen is twice as likely, each showing today
 * thins it, and the one shown last is passed over whenever another is available — so two banners alternate, three cycle.
 */
export function pickBanner(list:readonly Banner[],seen:Seen,lastId:string|null,now:number,rand:()=>number):Banner|null{
 const day=israelClock(now).day
 const pool=list.length>1?list.filter(b=>b.id!==lastId):[...list]
 const use=pool.length?pool:[...list]
 const w=use.map(b=>{const s=seen[b.id];return Math.max(0,b.weight)*(s?1:2)/(1+(s&&s.day===day?s.dn:0))})
 const total=w.reduce((a,b)=>a+b,0);if(use.length===0||total<=0)return null
 let r=rand()*total;for(let i=0;i<use.length;i++){r-=w[i]!;if(r<0)return use[i]!}
 return use[use.length-1]!
}
export const delayOf=(b:Banner,s:PromoSettings)=>(b.delaySec??s.delaySec)*1000
export const showOf=(b:Banner,s:PromoSettings)=>(b.showSec??s.showSec)*1000

/** the link carries where it was seen, so the other app can tell a banner visit from any other */
/** a banner that points back into this site: same tab, no tracking parameters */
export const isOwn=(b:Banner)=>{try{return new URL(b.href).hostname==='fanlife.dubelteam.com'}catch{return false}}
export function outbound(b:Banner,p:Page):string{
 try{const u=new URL(b.href);if(u.hostname==='fanlife.dubelteam.com')return b.href;u.searchParams.set('utm_source','fanlife');u.searchParams.set('utm_medium','banner');u.searchParams.set('utm_campaign',b.id);u.searchParams.set('utm_content',p.kind==='club'?p.club:p.kind);return u.toString()}catch{return b.href}
}

// ----------------------------------------------------------------- validation (the control room's write path)
const ID=/^[a-z0-9][a-z0-9-]{1,39}$/,SLUG=/^[a-z0-9][a-z0-9-]{0,59}$/
const num=(v:unknown,lo:number,hi:number,d:number)=>{const n=typeof v==='number'?v:Number(v);return Number.isFinite(n)?Math.min(hi,Math.max(lo,Math.round(n))):d}
const strs=(v:unknown,ok:RegExp,max=60)=>Array.isArray(v)?[...new Set(v.map(x=>String(x).trim()).filter(x=>ok.test(x)))].slice(0,max):[]
const pathList=(v:unknown)=>strs(v,/^\/[a-zA-Z0-9/_-]{0,80}$/,40)
const date=(v:unknown)=>{if(v==null||v==='')return null;const t=Date.parse(String(v));return Number.isFinite(t)?new Date(t).toISOString():null}
const img=(v:unknown)=>{const s=String(v??'').trim();return /^\/ads\/[a-z0-9._-]+$/i.test(s)||/^https:\/\/[^\s]+$/.test(s)?s:''}
export class PromoInvalid extends Error{}
export function cleanBanner(raw:unknown):Banner{
 const r=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>,t=(r.targeting&&typeof r.targeting==='object'?r.targeting:{}) as Record<string,unknown>
 const id=String(r.id??'').trim();if(!ID.test(id))throw new PromoInvalid(`Banner id “${id}” must be 2–40 lowercase letters, digits or dashes.`)
 const href=String(r.href??'').trim();let u:URL|null=null;try{u=new URL(href)}catch{/* checked below */}
 if(!u||u.protocol!=='https:')throw new PromoInvalid(`${id}: the link must be a full https:// address.`)
 const img1x=img(r.img1x),img2x=img(r.img2x)||img1x;if(!img1x)throw new PromoInvalid(`${id}: the 1× image must be an /ads/… file or an https address.`)
 return {id,name:String(r.name??id).trim().slice(0,80)||id,enabled:r.enabled===true,href:u.toString(),alt:String(r.alt??'').trim().slice(0,160),img1x,img2x,
  audience:r.audience==='israel'?'israel':'all',
  targeting:{home:t.home===true,allClubs:t.allClubs===true,clubs:strs(t.clubs,SLUG),other:t.other===true,paths:pathList(t.paths),exclude:pathList(t.exclude)},
  startsAt:date(r.startsAt),endsAt:date(r.endsAt),
  days:[...new Set((Array.isArray(r.days)?r.days:[]).map(Number).filter(n=>Number.isInteger(n)&&n>=0&&n<=6))].sort(),
  fromHour:num(r.fromHour,0,23,0),toHour:num(r.toHour,0,23,0),
  delaySec:r.delaySec==null||r.delaySec===''?null:num(r.delaySec,0,120,3),showSec:r.showSec==null||r.showSec===''?null:num(r.showSec,2,60,7),
  weight:num(r.weight,0,100,10),maxPerSession:num(r.maxPerSession,0,50,1),maxPerDay:num(r.maxPerDay,0,200,0),cooldownMin:num(r.cooldownMin,0,10080,0),
  note:String(r.note??'').trim().slice(0,300)}
}
export function cleanSettings(raw:unknown):PromoSettings{
 const r=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>
 const rules=(Array.isArray(r.pageRules)?r.pageRules:[]).map(x=>{const o=(x&&typeof x==='object'?x:{}) as Record<string,unknown>
  return {page:String(o.page??''),mode:o.mode==='off'?'off':o.mode==='only'?'only':'auto',only:strs(o.only,ID)} as PageRule}).filter(x=>x.page==='home'||x.page==='clubs'||x.page==='other'||/^club:[a-z0-9-]+$/.test(x.page)).slice(0,80)
 return {enabled:r.enabled!==false,delaySec:num(r.delaySec,0,120,DEFAULTS.delaySec),showSec:num(r.showSec,2,60,DEFAULTS.showSec),gapSec:num(r.gapSec,0,3600,DEFAULTS.gapSec),maxPerSession:num(r.maxPerSession,0,50,DEFAULTS.maxPerSession),pageRules:rules}
}
export function cleanDoc(raw:unknown,audit:PromoDoc['audit']=[]):PromoDoc{
 const r=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>
 const banners=(Array.isArray(r.banners)?r.banners:[]).map(cleanBanner)
 if(new Set(banners.map(b=>b.id)).size!==banners.length)throw new PromoInvalid('Two banners share an id.')
 if(banners.length>60)throw new PromoInvalid('At most 60 banners.')
 return {v:1,settings:cleanSettings(r.settings),banners,audit}
}

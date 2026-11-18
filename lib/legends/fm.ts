import data from '@/content/manual/legends-fm-ratings.json'
import {clamp,type QuotaPos} from './config'
import {quarter,ROLE_ATTRS} from './ratings'

/**
 * MANAGER RATINGS (owner, 18.11.2026: "real manager ratings for every man — ability, defence, attack, goalkeeping — like the
 * Manager, fair between the clubs so the contest stays healthy, hidden, and seen only when he is in the manager's squad").
 *
 * The SHAPE comes from the research pack (content/manual/legends-fm-ratings.json, built by scripts/legends/fm-ratings/build.mjs):
 * one Football Manager / Championship Manager profile per man, or a scout's estimate where no game data exists.
 * The LEVEL comes from his stars — the club-percentile rating every club shares (ratings.ts) — so a five-star man at a small club
 * and a five-star man at a big one stand on the same 1–20 ground, and the strongest squad is the one the manager builds, not the
 * one a bigger club's database hands him. Pure, server side: the view sends a sheet only for men in the manager's own squad.
 */
type Row={r:string;v:string;k:number;s:'o'|'p'|'e';e?:string;f?:number}
type File={keys:string[];men:Record<string,Row>;medians:Record<string,{v:string;k:number}>}
const F=data as unknown as File
export const FM_KEYS=F.keys
export type FmGroupId='technical'|'mental'|'physical'|'goalkeeping'
const GROUPS:Record<FmGroupId,readonly string[]>={
 technical:F.keys.slice(0,14),mental:F.keys.slice(14,28),physical:F.keys.slice(28,36),
 goalkeeping:['Aerial Reach','Command of Area','Communication','Eccentricity','First Touch','Handling','Kicking','One on Ones','Passing','Reflexes','Rushing Out','Tendency to Punch','Throwing']}
/** FM's key attributes per family — highlighted on the sheet (the pack's own calibration weights, ≥2) */
export const KEY_ATTRS:Record<QuotaPos,readonly string[]>={
 GK:['Reflexes','Handling','One on Ones','Aerial Reach','Agility','Positioning','Concentration'],
 DF:['Marking','Tackling','Positioning','Heading','Jumping Reach','Anticipation','Concentration'],
 MF:['Passing','Vision','Technique','First Touch','Decisions','Composure'],
 FW:['Finishing','Off the Ball','Acceleration','Pace','Dribbling','First Touch','Composure','Anticipation']}
/** character attributes move half as far when a man is scaled to his stars: talent is levelled, temperament stays his own */
const CHARACTER=new Set(['Aggression','Bravery','Determination','Leadership','Teamwork','Work Rate','Flair','Eccentricity','Tendency to Punch'])
const h32=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0}
const dec=(v:string)=>{const o:Record<string,number>={};for(let i=0;i<F.keys.length;i++){const c=v.charCodeAt(i);if(c>=65&&c<=84)o[F.keys[i]!]=c-64}return o}
export type FmSource='game'|'partial'|'estimate'
export type FmRaw={vals:Record<string,number>;k:number;source:FmSource;edition:string|null}
/** the man's raw profile, or a scout's estimate from the median man of his role (a small stable spread, so no two are clones) */
export function fmRaw(club:string,id:string,pos:QuotaPos):FmRaw{
 const row=F.men[id]??F.men[`${club}:${id}`]??F.men[id.slice(id.indexOf(':')+1)]
 if(row&&row.r===pos||row&&pos!=='GK'&&row.r!=='GK')return {vals:dec(row!.v),k:row!.k,source:row!.s==='o'?'game':row!.s==='p'?'partial':'estimate',edition:row!.e??null}
 const m=F.medians[pos]!,vals=dec(m.v)
 for(const k of Object.keys(vals))vals[k]=clamp(vals[k]!+((h32(`${club}:${id}:${k}`)%3)-1),1,20)
 return {vals,k:m.k,source:'estimate',edition:null}
}
/** the 1–20 level a man of these stars carries in his key attributes: 1★ ≈ 8, 3★ ≈ 12, 5★ ≈ 16.5 */
export const levelOf=(stars:number)=>8+(clamp(stars,1,5)-1)*2.125
export function fmScaled(raw:FmRaw,stars:number):Record<string,number>{
 const d=levelOf(stars)-raw.k,o:Record<string,number>={}
 for(const [k,v] of Object.entries(raw.vals))o[k]=clamp(Math.round(v+d*(CHARACTER.has(k)?0.5:1)),1,20)
 return o
}
/** the four game attributes the match engine reads (ratings.ts), shaped by his profile and centred on his stars */
const GAME:Record<string,readonly string[]>={
 reflexes:['Reflexes','One on Ones','Agility'],handling:['Handling','Aerial Reach','Command of Area'],distribution:['Kicking','Throwing','Passing'],
 tackling:['Tackling','Positioning','Strength'],marking:['Marking','Concentration','Anticipation'],heading:['Heading','Jumping Reach','Strength'],
 passing:['Passing','First Touch','Technique','Vision'],vision:['Vision','Decisions','Flair'],stamina:['Stamina','Work Rate','Natural Fitness'],
 shooting:['Long Shots','Technique','Finishing'],finishing:['Finishing','Composure','Off the Ball'],pace:['Pace','Acceleration','Agility']}
export function fmGameAttrs(raw:FmRaw,stars:number,pos:QuotaPos):Record<string,number>{
 const out:Record<string,number>={}
 for(const k of ROLE_ATTRS[pos]){const xs=GAME[k]!.map(a=>raw.vals[a]).filter((x):x is number=>x!==undefined)
  const g=xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:raw.k
  out[k]=quarter(stars+clamp((g-raw.k)/4,-1.25,1.25))}
 return out
}
export type FmRowView={k:string;v:number;key:boolean}
export type FmSheet={source:FmSource;edition:string|null;groups:{id:FmGroupId;rows:FmRowView[]}[];best:string[];weak:string[];ability:number}
/** the sheet the manager reads on his own man: FM's groups, key attributes marked, his three best and three weakest */
export function fmSheet(club:string,id:string,pos:QuotaPos,stars:number):FmSheet{
 const raw=fmRaw(club,id,pos),v=fmScaled(raw,stars),keys=new Set(KEY_ATTRS[pos])
 const ids:FmGroupId[]=pos==='GK'?['goalkeeping','mental','physical']:['technical','mental','physical']
 const groups=ids.map(g=>({id:g,rows:GROUPS[g].filter(k=>v[k]!==undefined).map(k=>({k,v:v[k]!,key:keys.has(k)}))}))
 const ranked=[...KEY_ATTRS[pos]].filter(k=>v[k]!==undefined).sort((a,b)=>v[b]!-v[a]!||a.localeCompare(b))
 const ability=Math.round(KEY_ATTRS[pos].reduce((s,k)=>s+(v[k]??levelOf(stars)),0)/KEY_ATTRS[pos].length*10)/10
 return {source:raw.source,edition:raw.edition,groups,best:ranked.slice(0,3),weak:ranked.slice(-3).reverse(),ability}
}

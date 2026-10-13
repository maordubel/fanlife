import 'server-only'
import {createHash} from 'node:crypto'
import {fileArea} from '@/lib/master/files'

/**
 * "Suggest the next club" (owner, 13.10.2026): a fan types the club they want on the ballot; it goes to the control room.
 * No account, no email, no IP is stored — the only thing kept is the text, a day and a short hash used to stop one device
 * sending the same request over and over (the hash is salted per day and is not kept after the day ends).
 */
export type Suggestion={id:string;text:string;at:string;key:string}
export type SuggestionFile={v:1;items:Suggestion[]}
const FILE='club-suggestions.json',MAX_ITEMS=500,MAX_PER_DEVICE_PER_DAY=3
export const SUGGEST_MAX=80,SUGGEST_MIN=2
const area=()=>fileArea('suggestions')
export function cleanSuggestion(v:unknown):string|null{
 if(typeof v!=='string')return null
 const t=v.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim()
 if(t.length<SUGGEST_MIN||t.length>SUGGEST_MAX)return null
 if(/https?:\/\/|www\.|@/i.test(t))return null // a club name is not a link or an address
 return t
}
export const dayKey=(d=new Date())=>d.toISOString().slice(0,10)
export const deviceKey=(ip:string,ua:string,day=dayKey())=>createHash('sha256').update(`${day}|${ip}|${ua}`).digest('hex').slice(0,12)
export async function addSuggestion(text:string,key:string,now=new Date()):Promise<{ok:true}|{ok:false;error:'limit'|'full'}>{
 let result:{ok:true}|{ok:false;error:'limit'|'full'}={ok:true}
 await area().update<SuggestionFile>(FILE,{v:1,items:[]},cur=>{
  const day=dayKey(now),mine=cur.items.filter(i=>i.key===key&&i.at.startsWith(day))
  if(mine.length>=MAX_PER_DEVICE_PER_DAY){result={ok:false,error:'limit'};return cur}
  if(cur.items.length>=MAX_ITEMS){result={ok:false,error:'full'};return cur}
  const id=createHash('sha256').update(`${now.toISOString()}|${text}|${cur.items.length}`).digest('hex').slice(0,10)
  return {v:1,items:[...cur.items,{id,text,at:now.toISOString(),key}]}
 })
 return result
}
export async function listSuggestions():Promise<Suggestion[]>{return (await area().readJson<SuggestionFile>(FILE,{v:1,items:[]})).items}
/** what the desk shows: the same name typed by several fans is one line with a count */
export function tally(items:readonly Suggestion[]):{name:string;count:number;last:string}[]{
 const m=new Map<string,{name:string;count:number;last:string}>()
 for(const i of items){const k=i.text.toLowerCase();const e=m.get(k);if(e){e.count++;if(i.at>e.last)e.last=i.at}else m.set(k,{name:i.text,count:1,last:i.at})}
 return [...m.values()].sort((a,b)=>b.count-a.count||b.last.localeCompare(a.last))
}

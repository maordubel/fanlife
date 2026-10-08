/**
 * "Mine" for the Living Archive (gate 12): what this supporter SAVED, on this device, for this club.
 * Saving is a bookmark — not "I was there" (lib/fanlife/been.ts, a personal stamp that proves nothing), not a score.
 * Un-saving keeps a tombstone (`b:false`) like the been-book, so a later sync can tell a change of heart from a gap.
 */
export const savedKey=(club:string)=>`fan-life:club:${club}:archive-saved:v1`
export const SAVED_EVENT='fanlife:archive-saved'
export type SavedRow={b:boolean;at:string}
export type SavedBook=Record<string,SavedRow>
const ID=/^[A-Za-z0-9:_.-]{1,150}$/
const MAX_ROWS=2000

export function parseSaved(raw:string|null):SavedBook{
 try{
  if(!raw||raw.length>300000)return {}
  const p=JSON.parse(raw) as unknown
  if(!p||typeof p!=='object'||Array.isArray(p))return {}
  const out:SavedBook={}
  for(const [id,v] of Object.entries(p as Record<string,Partial<SavedRow>>)){
   if(!ID.test(id)||!v||typeof v.at!=='string'||v.at.length>40)continue
   out[id]={b:v.b===true,at:v.at}
   if(Object.keys(out).length>=MAX_ROWS)break
  }
  return out
 }catch{return {}}
}
export function readSaved(club:string):SavedBook{
 try{return parseSaved(localStorage.getItem(savedKey(club)))}catch{return {}}
}
/** returns the new saved state, or null when the device cannot keep it */
export function setSaved(club:string,id:string,b:boolean,now=new Date()):boolean|null{
 if(!ID.test(id))return null
 const book=readSaved(club);book[id]={b,at:now.toISOString()}
 try{localStorage.setItem(savedKey(club),JSON.stringify(book));window.dispatchEvent(new Event(SAVED_EVENT));return b}catch{return null}
}
/** saved ids, most recently saved first */
export function savedIds(book:SavedBook):string[]{
 return Object.entries(book).filter(([,r])=>r.b).sort((a,b)=>b[1].at.localeCompare(a[1].at)||a[0].localeCompare(b[0])).map(([id])=>id)
}
/** two devices' books: per id the later `at` wins; on a tie "saved" wins */
export function mergeSaved(a:SavedBook,b:SavedBook):SavedBook{
 const out:SavedBook={...a}
 for(const [id,r] of Object.entries(b)){const x=out[id];if(!x||r.at>x.at||(r.at===x.at&&r.b&&!x.b))out[id]=r}
 return out
}

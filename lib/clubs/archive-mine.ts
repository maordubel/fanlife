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
/** One capacity, used by reading AND writing (review F05): a book never holds more rows than it can read back. */
export const MAX_ROWS=2000
/** newest first: what a full book keeps when it is cut */
const newest=(rows:[string,SavedRow][])=>rows.sort((a,b)=>b[1].at.localeCompare(a[1].at)||a[0].localeCompare(b[0]))

export function parseSaved(raw:string|null):SavedBook{
 try{
  if(!raw||raw.length>300000)return {}
  const p=JSON.parse(raw) as unknown
  if(!p||typeof p!=='object'||Array.isArray(p))return {}
  const rows:[string,SavedRow][]=[]
  for(const [id,v] of Object.entries(p as Record<string,Partial<SavedRow>>)){
   if(!ID.test(id)||!v||typeof v.at!=='string'||v.at.length>40)continue
   rows.push([id,{b:v.b===true,at:v.at}])
  }
  // an over-full book (an older build, a merge) keeps its NEWEST rows, never the first ones it happened to list
  return Object.fromEntries(rows.length>MAX_ROWS?newest(rows).slice(0,MAX_ROWS):rows)
 }catch{return {}}
}
export function readSaved(club:string):SavedBook{
 try{return parseSaved(localStorage.getItem(savedKey(club)))}catch{return {}}
}
/**
 * Room for one more row. A full book first lets go of its OLDEST un-saves (tombstones only matter to a sync that has
 * not happened yet; the oldest is the least likely to be unsynced). When every row is a live bookmark it refuses.
 */
export function makeRoom(book:SavedBook,id:string):SavedBook|'full'{
 if(book[id]||Object.keys(book).length<MAX_ROWS)return book
 const tomb=newest(Object.entries(book).filter(([,r])=>!r.b)).reverse()
 if(!tomb.length)return 'full'
 const out={...book};delete out[tomb[0]![0]];return out
}
/** returns the new saved state, null when the device cannot keep it, 'full' when the book has no room for a new bookmark */
export function setSaved(club:string,id:string,b:boolean,now=new Date()):boolean|null|'full'{
 if(!ID.test(id))return null
 const room=makeRoom(readSaved(club),id)
 if(room==='full')return b?'full':null
 const book=room;book[id]={b,at:now.toISOString()}
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

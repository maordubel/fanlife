/**
 * Gate 6 · the souvenir shelf — every pair a supporter has ever found on this club's wall, kept on this device.
 *
 * A pair that locks is filed here under its archive id, so the same memory found twice is one memory (idempotent).
 * The entry carries the pair's own faces and the one fact the archive row held (or null) — it never writes a
 * sentence of its own. It lives in `localStorage` per club and is never sent anywhere; every read and write is
 * guarded, because storage can be blocked or full and the wall must still play (rule 11, playbook).
 */
export type ShelfEntry={id:string;a:string;b:string;kind:string;object:string;fact:string|null;at:number;href?:string|null}
export type Shelf=Record<string,ShelfEntry>

const KEY=(club:string)=>`fan-life:memory:shelf:v1:${club}`
export const SHELF_MAX=400

const isEntry=(x:unknown):x is ShelfEntry=>!!x&&typeof x==='object'&&typeof (x as ShelfEntry).id==='string'&&typeof (x as ShelfEntry).a==='string'&&typeof (x as ShelfEntry).b==='string'&&typeof (x as ShelfEntry).kind==='string'&&typeof (x as ShelfEntry).object==='string'&&typeof (x as ShelfEntry).at==='number'&&((x as ShelfEntry).fact===null||typeof (x as ShelfEntry).fact==='string')&&((x as ShelfEntry).href===undefined||(x as ShelfEntry).href===null||typeof (x as ShelfEntry).href==='string')

/** a shelf out of whatever storage held: anything malformed is dropped, never repaired */
export function parseShelf(raw:string|null|undefined):Shelf{
 if(!raw)return {}
 try{
  const data=JSON.parse(raw) as unknown
  if(!data||typeof data!=='object'||Array.isArray(data))return {}
  const out:Shelf={}
  for(const [id,entry] of Object.entries(data as Record<string,unknown>))if(isEntry(entry)&&entry.id===id)out[id]=entry
  return out
 }catch{return {}}
}

/**
 * file a pair: the first find keeps its date, so an old find is never re-dated; a later call may only FILL what the first
 * one did not have (the archive sentence and entry arrive from the server after the match), never overwrite it. The shelf
 * is capped by dropping the oldest.
 */
export function addToShelf(shelf:Shelf,pair:{id:string;a:string;b:string;kind:string;object:string;factHe:string|null;href?:string|null},at:number):Shelf{
 const held=shelf[pair.id]
 if(held){
  const fact=held.fact??pair.factHe,href=held.href??pair.href??null
  if(fact===held.fact&&href===(held.href??null))return shelf
  return {...shelf,[pair.id]:{...held,fact,href}}
 }
 const next:Shelf={...shelf,[pair.id]:{id:pair.id,a:pair.a,b:pair.b,kind:pair.kind,object:pair.object,fact:pair.factHe,at,href:pair.href??null}}
 const ids=Object.keys(next)
 if(ids.length<=SHELF_MAX)return next
 const keep=ids.sort((x,y)=>next[y]!.at-next[x]!.at).slice(0,SHELF_MAX),out:Shelf={}
 for(const id of keep)out[id]=next[id]!
 return out
}

/** newest first */
export const shelfList=(shelf:Shelf):ShelfEntry[]=>Object.values(shelf).sort((x,y)=>y.at-x.at||x.id.localeCompare(y.id))

export function readShelf(club:string):Shelf{
 try{return parseShelf(localStorage.getItem(KEY(club)))}catch{return {}}
}
/** returns false when the device would not keep it — the caller says so instead of pretending */
export function writeShelf(club:string,shelf:Shelf):boolean{
 try{localStorage.setItem(KEY(club),JSON.stringify(shelf));return true}catch{return false}
}

import {mkdir,readFile,rename,writeFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import path from 'node:path'
import {durable} from '@/lib/master/durable'
import {dataRoot} from '@/lib/dataRoot'
import {inOrder,untilWon} from '@/lib/master/cas'

/**
 * One tiny JSON store for the goals pipeline, with optimistic concurrency.
 * Production = the control room's durable store (Vercel Blob, ETag compare-and-set). Without one the pipeline still
 * works on local files — but `isDurable()` is false, and the gate then refuses automatic publication (fail closed,
 * spec §0 and §3): an unattended publish that a restart could erase is a false publication.
 */
export const isDurable=()=>{const d=durable();return !!d&&d.kind==='vercel-blob'}
const NAME=(n:string)=>`goals/${n}.json`
const local=(n:string)=>path.join(dataRoot(),'goals',`${n}.json`)

export async function readDoc<T>(name:string,fallback:T):Promise<{value:T;etag:string|null}>{
 const d=durable()
 if(d){const r=await d.read(NAME(name));return r?{value:JSON.parse(r.text) as T,etag:r.etag}:{value:fallback,etag:null}}
 try{const text=await readFile(local(name),'utf8');return {value:JSON.parse(text) as T,etag:String(text.length)+':'+text.slice(-32)}}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return {value:fallback,etag:null};throw e}
}

/** Returns false when somebody else wrote first; the caller re-reads and re-applies. */
export async function writeDoc(name:string,value:unknown,etag:string|null):Promise<boolean>{
 const text=JSON.stringify(value,null,1),d=durable()
 if(d)return d.write(NAME(name),text,etag)
 const file=local(name);await mkdir(path.dirname(file),{recursive:true});const tmp=`${file}.${randomUUID()}.tmp`;await writeFile(tmp,text);await rename(tmp,file);return true
}

/** Read-modify-write: ordered per document in this instance, retried with back-off, real errors thrown as themselves. */
export function updateDoc<T>(name:string,fallback:T,change:(v:T)=>T|Promise<T>):Promise<T>{
 return inOrder(`goals/${name}`,async()=>{
  let out!:T
  await untilWon(`The goals document ${name}`,async()=>{
   const {value,etag}=await readDoc(name,fallback),next=await change(structuredClone(value))
   if(await writeDoc(name,next,etag)){out=next;return true}
   return false
  })
  return out
 })
}

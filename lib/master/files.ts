import 'server-only'
import {createHash} from 'node:crypto'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {durable,type DurableRead} from '@/lib/master/durable'
import {inOrder,untilWon} from '@/lib/master/cas'

/**
 * A named area of small JSON files in the control room's durable store (Supabase `worker_fanlife_files`, rule 105) —
 * the same compare-and-swap contract the Player Control Center uses (`lib/players/store.ts`), for any feature that keeps
 * its own workflow beside the control state instead of inside it (ADR-fanlife-0012: CRM tasks, FAN LEAGUE without
 * Supabase, the ALL FOOTBALL manifest). Without a store: the local data directory, or memory on a serverless host.
 */
const etagOf=(text:string)=>createHash('sha256').update(text).digest('hex').slice(0,24)
const mem=(globalThis as typeof globalThis&{fanAreaMem?:Map<string,string>}).fanAreaMem??=new Map<string,string>()
export type FileArea={
 kind:()=>{kind:'supabase'|'vercel-blob'|'disk'|'memory';durable:boolean}
 read:(name:string,fresh?:boolean)=>Promise<DurableRead>
 write:(name:string,text:string,etag:string|null)=>Promise<boolean>
 readJson:<T>(name:string,fallback:T)=>Promise<T>
 update:<T>(name:string,fallback:T,fn:(cur:T)=>T|Promise<T>)=>Promise<T>
}
export function fileArea(prefix:string):FileArea{
 if(!/^[a-z][a-z0-9-]*$/.test(prefix))throw new Error(`Bad file area: ${prefix}`)
 const dir=()=>path.resolve(process.env.FAN_LIFE_DATA_DIR||path.join(process.cwd(),'.fan-life'),prefix)
 const safe=(name:string)=>{if(!/^[a-zA-Z0-9._/-]{1,160}$/.test(name)||name.includes('..'))throw new Error(`Bad file name: ${name}`);return name}
 const key=(name:string)=>`${prefix}/${safe(name)}`
 const read=async(name:string,fresh=false):Promise<DurableRead>=>{
  const d=durable();if(d)return d.read(key(name),fresh?{fresh:true}:{})
  if(process.env.VERCEL){const t=mem.get(key(name));return t===undefined?null:{text:t,etag:etagOf(t)}}
  try{const t=await readFile(path.join(dir(),safe(name)),'utf8');return {text:t,etag:etagOf(t)}}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e}
 }
 const write=async(name:string,text:string,etag:string|null):Promise<boolean>=>{
  const d=durable();if(d)return d.write(key(name),text,etag)
  const cur=await read(name,true)
  if(etag===null?!!cur:cur?.etag!==etag)return false
  if(process.env.VERCEL){mem.set(key(name),text);return true}
  const file=path.join(dir(),safe(name));await mkdir(path.dirname(file),{recursive:true});await writeFile(file,text);return true
 }
 return {
  kind:()=>{const d=durable();return d?{kind:d.kind==='memory'?'memory':d.kind,durable:d.kind!=='memory'}:{kind:process.env.VERCEL?'memory':'disk',durable:!process.env.VERCEL}},
  read,write,
  readJson:async<T>(name:string,fallback:T):Promise<T>=>{const r=await read(name);return r?JSON.parse(r.text) as T:fallback},
  update:<T>(name:string,fallback:T,fn:(cur:T)=>T|Promise<T>):Promise<T>=>inOrder(key(name),async()=>{
   let result!:T
   await untilWon(`The file ${key(name)}`,async()=>{
    const r=await read(name,true),cur=r?JSON.parse(r.text) as T:fallback,next=await fn(cur)
    if(await write(name,JSON.stringify(next),r?r.etag:null)){result=next;return true}
    return false
   })
   return result
  }),
 }
}

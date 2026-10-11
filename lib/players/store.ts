import 'server-only'
import {createHash} from 'node:crypto'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {durable,type DurableRead} from '@/lib/master/durable'
/**
 * Where the Player Control Center keeps its files: the control room's own durable store (Vercel Blob, conditional writes on the ETag) when one
 * is connected, otherwise the local data directory. A write is compare-and-swap: it names the ETag it read, and the loser re-reads and re-applies.
 * `playersStorage()` tells the desk plainly when a change will not survive a restart.
 */
const dir=()=>path.resolve(process.env.FAN_LIFE_DATA_DIR||path.join(process.cwd(),'.fan-life'),'players')
const etagOf=(text:string)=>createHash('sha256').update(text).digest('hex').slice(0,24)
const mem=(globalThis as typeof globalThis&{fanPlayerMem?:Map<string,string>}).fanPlayerMem??=new Map<string,string>()
export const playersStorage=():{kind:'vercel-blob'|'disk'|'memory';durable:boolean}=>{const d=durable();return d?{kind:'vercel-blob',durable:true}:{kind:process.env.VERCEL?'memory':'disk',durable:false}}
export async function readFileText(name:string):Promise<DurableRead>{
 const d=durable();if(d)return d.read('players/'+name)
 if(process.env.VERCEL){const t=mem.get(name);return t===undefined?null:{text:t,etag:etagOf(t)}}
 try{const t=await readFile(path.join(dir(),name),'utf8');return {text:t,etag:etagOf(t)}}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e}
}
/** `etag` null = create only. Returns false when someone else wrote first. */
export async function writeFileText(name:string,text:string,etag:string|null):Promise<boolean>{
 const d=durable();if(d)return d.write('players/'+name,text,etag)
 const cur=await readFileText(name)
 if(etag===null?!!cur:cur?.etag!==etag)return false
 if(process.env.VERCEL){mem.set(name,text);return true}
 await mkdir(dir(),{recursive:true});await writeFile(path.join(dir(),name),text);return true
}
/** read–modify–write with retries on a lost race */
export async function update<T>(name:string,fallback:T,fn:(cur:T)=>T|Promise<T>):Promise<T>{
 for(let i=0;i<6;i++){
  const r=await readFileText(name),cur=r?JSON.parse(r.text) as T:fallback,next=await fn(cur)
  if(await writeFileText(name,JSON.stringify(next),r?r.etag:null))return next
 }
 throw new Error('conflict: the player files changed too many times while saving')
}
export const readJson=async<T>(name:string,fallback:T):Promise<T>=>{const r=await readFileText(name);return r?JSON.parse(r.text) as T:fallback}

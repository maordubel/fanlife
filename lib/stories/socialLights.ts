import 'server-only'
import {durable} from '@/lib/master/durable'
import type {SocialLights} from './social'

/**
 * Which platforms the social runner (.github/workflows/stories-social.yml) can publish to, as it saw them on its last
 * round: yes/no per platform, whether automatic publishing is switched on, and whether Telegram is there for the
 * ready packs. Written at most once in 4 minutes; outside `stories/` so it never touches the job list.
 */
const NAME='studio/social-lights.json'
const WRITE_EVERY_MS=4*60_000
/** Lights older than this are shown as "not checked recently" — the runner looks every 10 minutes. */
export const LIGHTS_STALE_MS=45*60_000

export async function noteLights(l:SocialLights):Promise<void>{
 const d=durable()
 if(!d||d.kind==='memory')return
 const cur=await d.read(NAME,{fresh:true,soft:true}).catch(()=>null)
 let prev:SocialLights|null=null
 try{prev=cur?JSON.parse(cur.text) as SocialLights:null}catch{prev=null}
 const same=prev&&JSON.stringify({...prev,at:''})===JSON.stringify({...l,at:''})
 if(prev&&same&&Date.now()-Date.parse(prev.at)<WRITE_EVERY_MS)return
 await d.write(NAME,JSON.stringify(l),cur?.etag??null).catch(()=>false)
}

export async function readLights():Promise<SocialLights|null>{
 const d=durable()
 if(!d||d.kind==='memory')return null
 const raw=await d.read(NAME,{fresh:true,soft:true}).catch(()=>null)
 try{return raw?JSON.parse(raw.text) as SocialLights:null}catch{return null}
}

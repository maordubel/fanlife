import 'server-only'
import {ownOrigin} from '@/lib/origin'
import {NextResponse} from 'next/server'
import {StoryError} from './jobs'
import {SocialError} from './social'

export const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'no-store, private','X-Robots-Tag':'noindex, nofollow'}})
/** State-changing owner requests must come from the studio's own origin (CSRF): a cross-site form or fetch is refused. */
export function sameOrigin(r:Request):boolean{
 return ownOrigin(r)&&r.headers.get('sec-fetch-site')!=='cross-site'
}
export async function body(r:Request,max=8000):Promise<unknown>{
 const raw=await r.text()
 if(raw.length>max)throw new StoryError('TOO_LARGE','Request is too large.',413)
 try{return JSON.parse(raw)}catch{throw new StoryError('JSON','Invalid JSON.')}
}
export function fail(e:unknown){
 if(e instanceof StoryError||e instanceof SocialError)return json({error:e.message,code:e.code},e.status)
 console.error('[stories]',e)
 return json({error:'The studio could not complete that request.',code:'INTERNAL'},500)
}
/** Small in-instance rate limit for owner actions (a stuck button cannot queue fifty films). */
const hits=new Map<string,number[]>()
export function limited(key:string,max:number,windowMs:number):boolean{
 const now=Date.now(),a=(hits.get(key)||[]).filter(t=>now-t<windowMs)
 a.push(now);hits.set(key,a);return a.length>max
}

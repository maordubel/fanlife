import 'server-only'
import {createHmac,timingSafeEqual} from 'node:crypto'

/** A personal print's recipe travels in its URL, signed, so Printify (and the preview) can fetch the picture and nobody can forge one. */
const key=()=>process.env.FAN_LIFE_ADMIN_KEY||process.env.CRON_SECRET||'fanlife-dev-only'
export const signOf=(s:string)=>createHmac('sha256',key()).update(s).digest('base64url').slice(0,32)
export const encode=(o:unknown)=>Buffer.from(JSON.stringify(o)).toString('base64url')
export function decode<T>(s:string|null,sig:string|null):T|null{
 if(!s||!sig||s.length>6000)return null
 const want=Buffer.from(signOf(s)),got=Buffer.from(sig);if(want.length!==got.length||!timingSafeEqual(want,got))return null
 try{return JSON.parse(Buffer.from(s,'base64url').toString('utf8')) as T}catch{return null}
}
/** the manager's name a supporter may add: his own, letters and numbers, up to 22, nothing offensive */
const BLOCK=/fuck|shit|cunt|nigg|fag|nazi|hitler|rape|porn|זונה|מניאק|כוס|זין/i
export function cleanManager(raw:unknown):{ok:true;value:string|null}|{ok:false}{
 const s=String(raw??'').normalize('NFKC').replace(/\s+/g,' ').trim().slice(0,22)
 if(!s)return {ok:true,value:null}
 if(!/^[\p{L}\p{N} .'’\-]+$/u.test(s)||BLOCK.test(s))return {ok:false}
 return {ok:true,value:s}
}

import {createHmac,timingSafeEqual} from 'node:crypto'
import {StoryError,type Job} from './jobs'
import {WINDOW_GRACE_MS,WINDOW_MS} from './autopilot'

/**
 * The signed "Cancel publishing" link (docs/rules/studio-autopilot.md): one job, one purpose, valid until the window
 * ends. Signed with the scheduler's secret (CRON_SECRET), exactly as the Final Whistle render link is
 * (lib/final-whistle/token.ts) — no new secret, and never a login. Server only (node:crypto).
 */
const mac=(secret:string,id:string,exp:number)=>createHmac('sha256',secret).update(`stories-autopilot-cancel.${id}.${exp}`).digest('hex')
export function signCancel(secret:string,id:string,exp:number):string{
 if(secret.length<32)throw new StoryError('SECRET','The scheduler secret is not set.',503)
 return mac(secret,id,exp)
}
export function verifyCancel(secret:string,id:string,exp:number,sig:string,now:number):boolean{
 if(secret.length<32||!/^[a-z0-9-]{8,64}$/.test(id)||!Number.isSafeInteger(exp)||exp<now||exp>now+WINDOW_MS+WINDOW_GRACE_MS+120_000)return false
 const a=Buffer.from(mac(secret,id,exp)),b=Buffer.from(String(sig))
 return a.length===b.length&&timingSafeEqual(a,b)
}
export function cancelLink(base:string,secret:string,job:Job):string|null{
 const at=job.autopilot?.preview.publishAt
 if(!at)return null
 const exp=Date.parse(at)
 return `${base.replace(/\/$/,'')}/studio-cancel?job=${job.id}&exp=${exp}&sig=${signCancel(secret,job.id,exp)}`
}

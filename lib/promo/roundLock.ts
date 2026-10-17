import 'server-only'
/**
 * DUBID's round lock, read from the shared Supabase through DUBID's own public functions (`game.current_gameweek`, `game.gameweek_state`,
 * both granted to anon and already used by DUBID's browser client). Nothing is created here (rule 89) and nothing is written.
 * One place knows the shape; the countdown endpoint and the Telegram reminder both call it.
 */
export type RoundLock={code:string;number:number;status:string;lockAt:string;serverNow:number}
/** the countdown starts this long before the lock (owner, 17.10.2026) */
export const COUNTDOWN_HOURS=12
const base=()=>(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'')
const key=()=>process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||''
async function rpc(name:string,body:Record<string,unknown>,fetcher:typeof fetch):Promise<unknown>{
 const r=await fetcher(`${base()}/rest/v1/rpc/${name}`,{method:'POST',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{apikey:key(),authorization:`Bearer ${key()}`,'content-type':'application/json','content-profile':'game','accept-profile':'game'},body:JSON.stringify(body)})
 if(!r.ok)throw new Error(`DUBID ${name} answered ${r.status}`)
 return r.json()
}
/** null when DUBID has no current round or the database does not answer — a countdown never invents a time */
export async function readRoundLock(fetcher:typeof fetch=fetch):Promise<RoundLock|null>{
 if(!base()||!key())return null
 try{
  const code=await rpc('current_gameweek',{},fetcher)
  if(typeof code!=='string'||!code)return null
  const s=await rpc('gameweek_state',{p_gw_code:code},fetcher) as Record<string,unknown>|null
  if(!s||typeof s.lockAt!=='string'||!Number.isFinite(Date.parse(s.lockAt)))return null
  return {code,number:Number(s.number)||0,status:String(s.status??''),lockAt:s.lockAt,serverNow:Number.isFinite(Number(s.serverNow))?Number(s.serverNow):Date.now()}
 }catch{return null}
}
export type Countdown={id:string;app:'dubid';label:string;closesAt:string;startsAt:string;hours:number;href:string}
/** the countdown for a round, or null outside its window: not open, already locked, or still more than `hours` away */
export function countdownOf(lock:RoundLock|null,nowMs:number,hours=COUNTDOWN_HOURS):Countdown|null{
 if(!lock||!['open','upcoming'].includes(lock.status))return null
 const closes=Date.parse(lock.lockAt),starts=closes-hours*3600_000
 if(nowMs<starts||nowMs>=closes)return null
 return {id:`dubid-lock-${lock.code}`,app:'dubid',label:'round locks in',closesAt:new Date(closes).toISOString(),startsAt:new Date(starts).toISOString(),hours,href:'https://dubid.dubelteam.com'}
}

import 'server-only'
import {createHmac,timingSafeEqual} from 'node:crypto'

/**
 * Gate 4 → gate 5: the only proof that a shirt was assembled is a token the SERVER minted after grading it.
 * A device-local "I built it" flag is not proof (audit §8); the collection asks the server to confirm each token
 * before it opens a shirt's card. The key is a deploy secret that never reaches a browser — `KIT_UNLOCK_KEY`, else one
 * derived from `SUPABASE_SERVICE_ROLE_KEY`, else a development constant (the house pattern of `lib/game/blind-cow/token.ts`).
 * The token binds the club and the kit only — not the content version — so an unlock survives an archive update.
 */
function secret(){return process.env.KIT_UNLOCK_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'fan-life-kit-local-development'}
export const signUnlock=(club:string,kitId:string)=>createHmac('sha256',secret()).update(`fan-life-kit-unlock|${club}|${kitId}`).digest('base64url').slice(0,24)
export function verifyUnlock(club:string,kitId:string,token:unknown):boolean{
 if(typeof token!=='string'||token.length!==24)return false
 const a=Buffer.from(token),b=Buffer.from(signUnlock(club,kitId))
 return a.length===b.length&&timingSafeEqual(a,b)
}

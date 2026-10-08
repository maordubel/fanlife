import 'server-only'
import {createHmac,timingSafeEqual} from 'node:crypto'

/**
 * Gate 4 → gate 5: the only proof that a shirt was assembled is a token the SERVER minted after grading it.
 * A device-local "I built it" flag is not proof (audit §8); the collection asks the server to confirm each token
 * before it opens a shirt's card. The key is a deploy secret that never reaches a browser — `KIT_UNLOCK_KEY`, else one
 * derived from `SUPABASE_SERVICE_ROLE_KEY`, else a development constant (the house pattern of `lib/game/blind-cow/token.ts`).
 *
 * The unlock receipt binds the club, the kit, how many documented parts the shirt was scored on, the rules version and the
 * field accuracy (KB-R11): a receipt for 74 cannot be replayed as 75, one club's receipt opens nothing at another, and a
 * hint receipt binds the puzzle, the step, the strike number and the struck card, so the same hint cannot be spent twice
 * (the grade counts DISTINCT valid receipts). The content version is deliberately not bound: an unlock survives an archive update.
 */
function secret(){return process.env.KIT_UNLOCK_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'fan-life-kit-local-development'}
const mac=(...parts:(string|number)[])=>createHmac('sha256',secret()).update(parts.join('|')).digest('base64url').slice(0,24)
function equal(token:unknown,expected:string){
 if(typeof token!=='string'||token.length!==24)return false
 const a=Buffer.from(token),b=Buffer.from(expected)
 return a.length===b.length&&timingSafeEqual(a,b)
}

export type Outcome={f:number;o:number;r:string}
export const signUnlock=(club:string,kitId:string,out:Outcome)=>mac('fan-life-kit-unlock',club,kitId,out.o,out.r,out.f)
export const verifyUnlock=(club:string,kitId:string,out:Outcome,token:unknown)=>equal(token,signUnlock(club,kitId,out))

export const signHint=(club:string,puzzleId:string,step:string,nth:number,optionId:string)=>mac('fan-life-kit-hint',club,puzzleId,step,nth,optionId)
export const verifyHint=(club:string,puzzleId:string,step:string,nth:number,optionId:string,token:unknown)=>equal(token,signHint(club,puzzleId,step,nth,optionId))

'use server'
import {requestClub} from '@/lib/clubs/request'
import {clubMystery} from '@/lib/clubs/mystery'
import {dealMode,legalTag,readModeSession,saveModeSession,type Mode} from '@/lib/clubs/mystery-modes'
import {giveUp} from '@/lib/game/blind-cow/solo-engine'
/**
 * Gate 10 · the daily and the challenge. The same rules as `startMystery`/`moveMystery` (tenant, gate switch, content
 * version, sealed cookie, answer only after a finished run) — the mystery is dealt from a TAG (a day or a seed), so a
 * link or a date leaks nothing. A daily is only dealt for the club's current day.
 */
async function current(slug:string,version:string,mode:Mode){
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||version.length>100||(mode!=='daily'&&mode!=='duel'))return null
 const resolved=await requestClub(slug,10)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates['blind-cow']?.playable)return null
 const game=clubMystery(resolved.data);if(!game.poolSize)return null
 return {data:resolved.data,game}
}
export async function startMysteryMode(slug:string,version:string,mode:Mode,tag:string){
 const ctx=await current(slug,version,mode);if(!ctx||!legalTag(mode,tag,ctx.data))return null
 const dealt=dealMode(ctx.data,ctx.game,mode,tag);if(!dealt)return null
 if(dealt.fresh)saveModeSession({club:slug,version,mode,tag,run:dealt.run})
 return ctx.game.view(dealt.run)
}
export async function moveMysteryMode(slug:string,version:string,mode:Mode,tag:string,rid:string,move:'reveal'|'guess'|'give_up',value:string|number){
 if(typeof tag!=='string'||tag.length>12||typeof rid!=='string'||rid.length>20||!['reveal','guess','give_up'].includes(move)||!['string','number'].includes(typeof value))return null
 const ctx=await current(slug,version,mode);if(!ctx)return null
 const session=readModeSession(mode,slug,version,ctx.game);if(!session||session.tag!==tag||session.run.rid!==rid)return null
 const now=Date.now(),previous=session.run,run=move==='reveal'?ctx.game.reveal(previous,Number(value)):move==='guess'?ctx.game.guess(previous,String(value),now).state:giveUp(previous,now)
 saveModeSession({...session,run});return ctx.game.view(run,now)
}

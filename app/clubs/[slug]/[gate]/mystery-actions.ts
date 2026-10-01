'use server'
import {cookies} from 'next/headers'
import {requestClub} from '@/lib/clubs/request'
import {clubMystery} from '@/lib/clubs/mystery'
import {seal,open} from '@/lib/game/blind-cow/token'
import {giveUp,type RunState} from '@/lib/game/blind-cow/solo-engine'
type Session={club:string;version:string;run:RunState}
const key=(club:string)=>`fanlife-mystery-${club}`
async function current(slug:string,version:string){
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||version.length>100)return null
 const resolved=await requestClub(slug,10)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates['blind-cow']?.playable)return null
 const game=clubMystery(resolved.data),value=open<Session>(cookies().get(key(slug))?.value)
 const session=value&&value.club===slug&&value.version===version&&game.valid(value.run)?value:null
 return {game,session}
}
function save(slug:string,session:Session){cookies().set(key(slug),seal(session),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*30})}
export async function startMystery(slug:string,version:string,next=false){
 const ctx=await current(slug,version);if(!ctx)return null
 if(ctx.session&&(!next||ctx.session.run.status==='playing'))return ctx.game.view(ctx.session.run)
 const run=ctx.game.start(Date.now(),ctx.session?.run.recent);if(!run)return null
 save(slug,{club:slug,version,run});return ctx.game.view(run)
}
export async function moveMystery(slug:string,version:string,rid:string,move:'reveal'|'guess'|'give_up',value:string|number){
 if(typeof rid!=='string'||rid.length>20||!['reveal','guess','give_up'].includes(move)||!['string','number'].includes(typeof value))return null
 const ctx=await current(slug,version);if(!ctx?.session||ctx.session.run.rid!==rid)return null
 const previous=ctx.session.run,now=Date.now(),run=move==='reveal'?ctx.game.reveal(previous,Number(value)):move==='guess'?ctx.game.guess(previous,String(value),now).state:giveUp(previous,now)
 save(slug,{club:slug,version,run});return ctx.game.view(run,now)
}

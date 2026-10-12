'use server'
import {door} from '@/lib/features-server'
import {viewer} from '@/lib/fan-league/owner'
import {careerView,marketPage,startCareer,type CardView,type CareerView} from '@/lib/fan-league/server'
import {mutateCareer,readCareer,SaveUnavailable} from '@/lib/fan-league/store'
import {applyAction,parseAction} from '@/lib/fan-league/career'

/**
 * FAN LEAGUE's server actions. The browser sends an intent (buy this id, play the round) with the revision it saw and a fresh
 * key; the server reads who is asking, loads the career, checks it is theirs, applies the ONE action and saves it with
 * compare-and-swap. Nothing the browser says about money, results or clubs is believed.
 */
type Fail={ok:false;error:string;code?:string;view?:CareerView}
const UNAVAILABLE='Saving is not available right now — nothing was changed.'
async function gate():Promise<string|null>{const d=await door('fanLeague');return d.open?'ok':null}

export async function createCareerAction(club:string,decade:number):Promise<{ok:true;id:string}|Fail>{
 if(!await gate())return {ok:false,error:'FAN LEAGUE is not open.'}
 if(typeof club!=='string'||!Number.isSafeInteger(decade))return {ok:false,error:'Choose a club and a decade.'}
 const owner=await viewer(true);if(!owner)return {ok:false,error:UNAVAILABLE}
 try{return await startCareer(owner,club,decade)}catch(e){return {ok:false,error:e instanceof SaveUnavailable?UNAVAILABLE:'The career could not be saved. Try again.'}}
}

export async function careerAction(id:string,raw:unknown):Promise<{ok:true;view:CareerView;replay?:boolean}|Fail>{
 if(!await gate())return {ok:false,error:'FAN LEAGUE is not open.'}
 const owner=await viewer(false),action=parseAction(raw)
 if(!owner)return {ok:false,error:'This career is not yours.',code:'forbidden'}
 if(!action)return {ok:false,error:'That move is not understood.',code:'invalid'}
 try{
  const out=await mutateCareer(id,c=>{
   if(c.owner!==owner)return {error:{ok:false,error:'This career is not yours.',code:'forbidden'} satisfies Fail}
   const r=applyAction(c,action,new Date().toISOString())
   if(!r.ok)return {error:{ok:false,error:r.error,code:r.code,view:careerView(c)} satisfies Fail}
   return {career:r.career,replay:!!r.replay}
  })
  if(!out)return {ok:false,error:'Career not found.',code:'missing'}
  if('error' in out)return out.error as Fail
  return {ok:true,view:careerView(out.career),replay:out.replay}
 }catch(e){return {ok:false,error:e instanceof SaveUnavailable?UNAVAILABLE:'The move could not be saved. Try again.',code:'unavailable'}}
}

export async function marketAction(id:string,decade:number|'archive',pos:string|null,q:string|null):Promise<{ok:true;cards:CardView[];total:number}|Fail>{
 if(!await gate())return {ok:false,error:'FAN LEAGUE is not open.'}
 const owner=await viewer(false),cur=await readCareer(id)
 if(!cur||!owner||cur.career.owner!==owner)return {ok:false,error:'This career is not yours.'}
 if(decade!=='archive'&&!Number.isSafeInteger(decade))return {ok:false,error:'Choose a decade.'}
 const p=pos&&['GK','DF','MF','FW'].includes(pos)?pos:null
 return {ok:true,...marketPage(cur.career,decade,p,typeof q==='string'?q.slice(0,60):null)}
}

'use server'
import {randomBytes} from 'node:crypto'
import {acceptFriendly,closeFriendly,createFriendly,friendlyView,lockSide,MAX_OPEN,statusAt,tokenHash,type FriendlyView} from '@/lib/fan-league/friendly'
import {insertFriendly,mutateCareer,mutateFriendly,ownerIndex,readCareer,readFriendly,SaveUnavailable} from '@/lib/fan-league/store'
import {door} from '@/lib/features-server'
import {viewer} from '@/lib/fan-league/owner'
import {careerView,marketPage,startCareer,type CardView,type CareerView} from '@/lib/fan-league/server'
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

/* ───────── friendlies (appendix B §6): two careers meet once; neither is written ───────── */
async function friendlyGate():Promise<boolean>{const [a,b]=await Promise.all([door('fanLeague'),door('friendlies')]);return a.open&&b.open}

export async function inviteFriendlyAction(careerId:string):Promise<{ok:true;id:string;link:string}|Fail>{
 if(!await friendlyGate())return {ok:false,error:'Friendlies are not open.'}
 const owner=await viewer(false),cur=await readCareer(careerId,true)
 if(!owner||!cur||cur.career.owner!==owner)return {ok:false,error:'This career is not yours.'}
 const idx=await ownerIndex(owner),now=Date.now()
 const mineOpen=(await Promise.all((idx.friendlies??[]).filter(x=>x.role==='inviter').slice(0,20).map(x=>readFriendly(x.id)))).filter(x=>x&&statusAt(x.friendly,now)==='sent').length
 if(mineOpen>=MAX_OPEN)return {ok:false,error:`You have ${MAX_OPEN} invitations waiting. Cancel one or wait for an answer.`}
 const side=lockSide(cur.career,new Date(now).toISOString());if('error' in side)return {ok:false,error:side.error}
 const id=randomBytes(8).toString('hex'),token=randomBytes(18).toString('base64url')
 try{await insertFriendly(createFriendly(id,token,side,new Date(now)))}catch(e){return {ok:false,error:e instanceof SaveUnavailable?UNAVAILABLE:'The invitation could not be saved. Try again.'}}
 return {ok:true,id,link:`/all-football/fan-league/friendlies/${id}?t=${encodeURIComponent(token)}`}
}

export async function answerFriendlyAction(id:string,token:string,careerId:string|null):Promise<{ok:true;view:FriendlyView}|Fail>{
 if(!await friendlyGate())return {ok:false,error:'Friendlies are not open.'}
 if(typeof token!=='string'||token.length>64)return {ok:false,error:'This invitation link is not valid.'}
 const owner=await viewer(false),now=new Date()
 try{
  let out
  if(careerId===null){
   out=await mutateFriendly(id,f=>f.tokenHash===tokenHash(token)?closeFriendly(f,'decline',now):{ok:false,error:'This invitation link is not valid.'})
  }else{
   const cur=await readCareer(careerId,true)
   if(!owner||!cur||cur.career.owner!==owner)return {ok:false,error:'Choose one of your own careers.'}
   const side=lockSide(cur.career,now.toISOString());if('error' in side)return {ok:false,error:side.error}
   out=await mutateFriendly(id,f=>acceptFriendly(f,token,side,now))
  }
  if(!out)return {ok:false,error:'Invitation not found.'}
  if(!out.ok)return {ok:false,error:out.error}
  return {ok:true,view:friendlyView(out.friendly,owner,now.getTime())}
 }catch(e){return {ok:false,error:e instanceof SaveUnavailable?UNAVAILABLE:'The answer could not be saved. Try again.'}}
}

export async function cancelFriendlyAction(id:string):Promise<{ok:true}|Fail>{
 if(!await friendlyGate())return {ok:false,error:'Friendlies are not open.'}
 const owner=await viewer(false);if(!owner)return {ok:false,error:'This invitation is not yours.'}
 try{const out=await mutateFriendly(id,f=>f.inviter.owner===owner?closeFriendly(f,'cancel',new Date()):{ok:false,error:'This invitation is not yours.'});if(!out)return {ok:false,error:'Invitation not found.'};return out.ok?{ok:true}:{ok:false,error:out.error}}
 catch(e){return {ok:false,error:e instanceof SaveUnavailable?UNAVAILABLE:'Could not cancel. Try again.'}}
}

export async function myFriendliesAction(careerId:string):Promise<{ok:true;list:FriendlyView[]}|Fail>{
 if(!await friendlyGate())return {ok:false,error:'Friendlies are not open.'}
 const owner=await viewer(false);if(!owner)return {ok:true,list:[]}
 const idx=await ownerIndex(owner),now=Date.now()
 const all=(await Promise.all((idx.friendlies??[]).slice(0,30).map(x=>readFriendly(x.id)))).filter((x):x is NonNullable<typeof x>=>!!x).map(x=>x.friendly)
 return {ok:true,list:all.filter(f=>f.inviter.careerId===careerId||f.invitee?.careerId===careerId).map(f=>friendlyView(f,owner,now))}
}

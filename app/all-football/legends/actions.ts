'use server'
import {randomBytes} from 'node:crypto'
import {door} from '@/lib/features-server'
import {applyAction,parseAction} from '@/lib/legends/career'
import {acceptFriendly,closeFriendly,createFriendly,friendlyView,lockSide,MAX_OPEN,statusAt,tokenHash,type FriendlyView} from '@/lib/legends/friendly'
import {viewer} from '@/lib/legends/owner'
import {ctxFor,marketPage,startCareer} from '@/lib/legends/server'
import {insertFriendly,mutateCareer,mutateFriendly,ownerIndex,readCareer,readFriendly,SaveUnavailable,setStatus} from '@/lib/legends/store'
import {careerView,type CardView,type CareerView} from '@/lib/legends/view'
import {withHighlights} from '@/lib/legends/kits'

/**
 * LEGENDS MANAGER's server actions. The browser sends an intent with the revision it saw and a fresh key; the server reads who
 * is asking, loads the career, checks it is theirs, applies ONE action and saves it with compare-and-swap. Nothing the browser
 * says about money, results or clubs is believed (§2.11).
 */
type Fail={ok:false;error:string;code?:string;view?:CareerView}
const UNAVAILABLE='Saving is not available right now — nothing was changed.'
const open=async()=>(await door('fanLeague')).open
const fail=(e:unknown,what:string):Fail=>({ok:false,error:e instanceof SaveUnavailable?UNAVAILABLE:what,code:'unavailable'})

export async function createLegendsCareer(club:string):Promise<{ok:true;id:string}|Fail>{
 if(!await open())return {ok:false,error:'LEGENDS MANAGER is not open.'}
 if(typeof club!=='string'||!/^[a-z0-9-]{2,60}$/.test(club))return {ok:false,error:'Choose a club.'}
 const owner=await viewer(true);if(!owner)return {ok:false,error:UNAVAILABLE}
 try{return await startCareer(owner,club)}catch(e){return fail(e,'The career could not be saved. Try again.')}
}

export async function legendsAction(id:string,raw:unknown):Promise<{ok:true;view:CareerView;replay?:boolean;note?:string}|Fail>{
 if(!await open())return {ok:false,error:'LEGENDS MANAGER is not open.'}
 const owner=await viewer(false),action=parseAction(raw)
 if(!owner)return {ok:false,error:'This career is not yours.',code:'forbidden'}
 if(!action)return {ok:false,error:'That move is not understood.',code:'invalid'}
 try{
  const cur=await readCareer(id);if(!cur||cur.career.owner!==owner)return {ok:false,error:'This career is not yours.',code:'forbidden'}
  const ctx=await ctxFor(cur.career)
  let note:string|undefined
  const out=await mutateCareer(id,c=>{
   if(c.owner!==owner)return {error:{ok:false,error:'This career is not yours.',code:'forbidden'} satisfies Fail}
   const r=applyAction(c,action,ctx)
   if(!r.ok)return {error:{ok:false,error:r.error,code:r.code,view:careerView(c)} satisfies Fail}
   note=r.note;return {career:r.career,replay:!!r.replay}
  })
  if(!out)return {ok:false,error:'Career not found.',code:'missing'}
  if('error' in out)return out.error as Fail
  return {ok:true,view:await withHighlights(careerView(out.career),out.career),replay:out.replay,...(note?{note}:{})}
 }catch(e){return fail(e,'The move could not be saved. Try again.')}
}

export async function legendsMarket(id:string,f:{pos?:string|null;decade?:number|null;price?:number|null;q?:string|null}):Promise<{ok:true;cards:CardView[];total:number}|Fail>{
 if(!await open())return {ok:false,error:'LEGENDS MANAGER is not open.'}
 const owner=await viewer(false),cur=await readCareer(id)
 if(!cur||!owner||cur.career.owner!==owner)return {ok:false,error:'This career is not yours.'}
 const pos=f.pos&&['GK','DF','MF','FW'].includes(f.pos)?f.pos:null,decade=Number.isSafeInteger(f.decade)?f.decade:null,price=Number.isInteger(f.price)&&f.price!>=1&&f.price!<=5?f.price:null
 return {ok:true,...marketPage(cur.career,{pos,decade,price,q:typeof f.q==='string'?f.q.slice(0,60):null})}
}

export async function setCareerStatus(id:string,status:'active'|'archived'):Promise<{ok:true}|Fail>{
 if(!await open())return {ok:false,error:'LEGENDS MANAGER is not open.'}
 if(status!=='active'&&status!=='archived')return {ok:false,error:'Unknown status.'}
 const owner=await viewer(false);if(!owner)return {ok:false,error:'This career is not yours.'}
 try{return await setStatus(owner,id,status)}catch(e){return fail(e,'Could not save. Try again.')}
}

/* ───────── friendlies (§1.7.38–40): two careers meet once; neither is written ───────── */
const friendlyOpen=async()=>{const [a,b]=await Promise.all([door('fanLeague'),door('friendlies')]);return a.open&&b.open}
export async function inviteFriendly(careerId:string):Promise<{ok:true;id:string;link:string}|Fail>{
 if(!await friendlyOpen())return {ok:false,error:'Friendlies are not open.'}
 const owner=await viewer(false),cur=await readCareer(careerId,true)
 if(!owner||!cur||cur.career.owner!==owner)return {ok:false,error:'This career is not yours.'}
 const idx=await ownerIndex(owner),now=Date.now()
 const mine=(await Promise.all((idx.friendlies??[]).filter(x=>x.role==='inviter').slice(0,20).map(x=>readFriendly(x.id)))).filter(x=>x&&statusAt(x.friendly,now)==='sent').length
 if(mine>=MAX_OPEN)return {ok:false,error:`You have ${MAX_OPEN} invitations waiting. Cancel one or wait for an answer.`}
 const side=lockSide(cur.career,new Date(now).toISOString());if('error' in side)return {ok:false,error:side.error}
 const id=randomBytes(8).toString('hex'),token=randomBytes(18).toString('base64url')
 try{await insertFriendly(createFriendly(id,token,side,new Date(now)))}catch(e){return fail(e,'The invitation could not be saved. Try again.')}
 return {ok:true,id,link:`/all-football/legends/friendlies/${id}?t=${encodeURIComponent(token)}`}
}
export async function answerFriendly(id:string,token:string,careerId:string|null):Promise<{ok:true;view:FriendlyView}|Fail>{
 if(!await friendlyOpen())return {ok:false,error:'Friendlies are not open.'}
 if(typeof token!=='string'||token.length>64)return {ok:false,error:'This invitation link is not valid.'}
 const owner=await viewer(false),now=new Date()
 try{
  let out
  if(careerId===null)out=await mutateFriendly(id,f=>f.tokenHash===tokenHash(token)?closeFriendly(f,'decline',now):{ok:false,error:'This invitation link is not valid.'})
  else{
   const cur=await readCareer(careerId,true);if(!owner||!cur||cur.career.owner!==owner)return {ok:false,error:'Choose one of your own careers.'}
   const side=lockSide(cur.career,now.toISOString());if('error' in side)return {ok:false,error:side.error}
   out=await mutateFriendly(id,f=>acceptFriendly(f,token,side,now))
  }
  if(!out)return {ok:false,error:'Invitation not found.'}
  if(!out.ok)return {ok:false,error:out.error}
  return {ok:true,view:friendlyView(out.friendly,owner,now.getTime())}
 }catch(e){return fail(e,'The answer could not be saved. Try again.')}
}
export async function cancelFriendly(id:string):Promise<{ok:true}|Fail>{
 if(!await friendlyOpen())return {ok:false,error:'Friendlies are not open.'}
 const owner=await viewer(false);if(!owner)return {ok:false,error:'This invitation is not yours.'}
 try{const out=await mutateFriendly(id,f=>f.inviter.owner===owner?closeFriendly(f,'cancel',new Date()):{ok:false,error:'This invitation is not yours.'});if(!out)return {ok:false,error:'Invitation not found.'};return out.ok?{ok:true}:{ok:false,error:out.error}}
 catch(e){return fail(e,'Could not cancel. Try again.')}
}
export async function myFriendlies(careerId:string):Promise<{ok:true;list:FriendlyView[]}|Fail>{
 if(!await friendlyOpen())return {ok:false,error:'Friendlies are not open.'}
 const owner=await viewer(false);if(!owner)return {ok:true,list:[]}
 const idx=await ownerIndex(owner),now=Date.now()
 const all=(await Promise.all((idx.friendlies??[]).slice(0,30).map(x=>readFriendly(x.id)))).filter((x):x is NonNullable<typeof x>=>!!x).map(x=>x.friendly)
 return {ok:true,list:all.filter(f=>f.inviter.careerId===careerId||f.invitee?.careerId===careerId).map(f=>friendlyView(f,owner,now))}
}

import 'server-only'
import {goalClubs,goalsPass,readCandidates,readPassState} from './pipeline'
import {publishCandidate,readPolicy,readPublished,rollbackGoal,savePolicy} from './published'
import {evaluate} from './gate'
import {isDurable,updateDoc} from './storage'
import type {Candidate,Policy} from './types'

/** Plain-language reasons for the admin. Every hold states what to do, not a code. */
export const ISSUE_TEXT:Record<string,string>={
 NO_SEQUENCE:'The report names a scorer and a minute but not the move. That is a goal, not a replay.',
 SCORER_UNKNOWN:'No scorer could be read from the paragraph.',TOO_FEW_GROUNDED_STEPS:'Fewer than two touches are written down with a place.',
 TOO_MANY_STEPS:'The report describes more touches than the game plays (5). Nothing was cut.',NO_GROUNDED_LOCATION:'No phrase in the position table matches, so there is no honest place for the touch.',
 STEP_WITHOUT_EVIDENCE:'A touch has no quoted sentence that names its player.',ACTOR_AMBIGUOUS:'The finisher does not match the named scorer, or the goal is an own goal.',
 FIXTURE_NOT_FOUND:'No match in the archive on that date.',FIXTURE_CONFLICT:'Two matches on that date. Resolve the conflict first.',NOT_HEBREW_SOURCE:'The source is not Hebrew; the game prints Hebrew and no translation is invented.',
 TRUTH_REJECTED:'The game cannot read this move (position, finish or length).',REPLAY_HELD:'A replay hold is on this goal.',SOURCE_NOT_CERTIFIED:'This source is not certified for automatic publishing.',
 AUTO_PUBLISH_OFF:'Automatic publishing is off (the default).',STORAGE_NOT_DURABLE:'No durable storage is connected; nothing can be published.',DUPLICATE_OF_BUNDLED:'A curated goal for this match and finisher already exists.',
}

export async function goalsStatus(){
 const [policy,published,state,clubs]=await Promise.all([readPolicy(),readPublished(),readPassState(),goalClubs()])
 const perClub:Record<string,Record<string,number>>={},rows:Array<Pick<Candidate,'id'|'clubId'|'status'|'issues'|'minute'|'scorerAlias'|'playedOn'>&{quote:string;url:string;steps:number}>=[]
 for(const club of clubs){
  const cs=await readCandidates(club).catch(()=>[] as Candidate[]);perClub[club]={}
  for(const c of cs){perClub[club]![c.status]=(perClub[club]![c.status]??0)+1;if(rows.length<200)rows.push({id:c.id,clubId:c.clubId,status:c.status,issues:c.issues,minute:c.minute,scorerAlias:c.scorerAlias,playedOn:c.playedOn,quote:c.evidence[0]?.quote.slice(0,240)??'',url:c.evidence[0]?.url??'',steps:c.steps.length})}
 }
 return {policy,durable:isDurable(),runs:state.runs.slice(-10).reverse(),perClub,rows,published:published.rows.map(r=>({goalId:r.record.goalId,title:r.record.titleHe,clubId:r.clubId,state:r.state,publishedAt:r.publishedAt,source:r.record.sourceUrl})),events:published.events.slice(-30).reverse(),issueText:ISSUE_TEXT}
}

type Body={op?:string;club?:string;id?:string;source?:string;on?:boolean;reason?:string}
export async function goalsAction(b:Body,actor:string):Promise<{ok:boolean;error?:string;[k:string]:unknown}>{
 const on=!!b.on
 switch(b.op){
  case 'global':await savePolicy(p=>({...p,autoPublish:on}));return {ok:true}
  case 'pause':await savePolicy(p=>({...p,paused:on}));return {ok:true}
  case 'club':if(!b.club)return {ok:false,error:'club required'};await savePolicy((p:Policy)=>({...p,clubs:{...p.clubs,[b.club!]:{autoPublish:on}}}));return {ok:true}
  case 'source':{if(!b.source)return {ok:false,error:'source required'}
   await savePolicy(p=>{const old=p.sources[b.source!]??{sourceId:b.source!,enabled:false,certified:false,autoPublish:false};return {...p,sources:{...p.sources,[b.source!]:{...old,...(b.id==='certified'?{certified:on}:b.id==='enabled'?{enabled:on}:{autoPublish:on})}}}});return {ok:true}}
  case 'run':{const clubs=b.club?[b.club]:await goalClubs();const r=await goalsPass({clubs});return {ok:true,run:r}}
  case 'approve':case 'hold':case 'rollback':{
   if(b.op==='rollback'){if(!b.id)return {ok:false,error:'id required'};return rollbackGoal(b.id,actor,b.reason||'owner rollback')}
   if(!b.club||!b.id)return {ok:false,error:'club and id required'}
   const cs=await readCandidates(b.club),c=cs.find(x=>x.id===b.id);if(!c)return {ok:false,error:'No such candidate.'}
   if(b.op==='hold'){await updateDoc<Candidate[]>(`candidates-${b.club}`,[],have=>have.map(x=>x.id===b.id&&x.status!=='published'?{...x,status:'held' as const,issues:[...new Set([...x.issues])]}:x));return {ok:true}}
   const r=await publishCandidate({...c,status:evaluate(c,{policy:await readPolicy(),durable:isDurable()}).status},actor,{manual:true})
   if(r.ok)await updateDoc<Candidate[]>(`candidates-${b.club}`,[],have=>have.map(x=>x.id===b.id?{...x,status:'published' as const}:x))
   return r.ok?{ok:true,already:r.already}:{ok:false,error:r.error,issues:r.issues}
  }
  default:return {ok:false,error:'Unknown operation.'}
 }
}

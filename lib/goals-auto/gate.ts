import matchesFile from '@/content/manual/matches.json'
import goalsFile from '@/content/manual/goals.json'
import {readTruth,type GoalSourceRecord} from '@/lib/game/replay/truth'
import {replayHeld} from '@/lib/game/replay/holds'
import {MAX_TOUCHES} from '@/lib/game/goal-zones'
import {existsSync,readFileSync} from 'node:fs'
import path from 'node:path'
import {WORKER_ROUTE_CLUB,type Candidate,type IssueCode,type Policy} from './types'

/**
 * The only door a candidate walks through to become a playable goal. Confidence never appears here: a candidate is
 * publishable because every hard check passed, and a failed hard check cannot be outvoted (spec §0, acceptance 4–7).
 * The checks that publish are the same ones the bundled goals pass (`readTruth`, holds, MAX_TOUCHES).
 */
type MatchRow={playedOn:string;homeClubSlug:string;awayClubSlug:string;homeScore:number|null;awayScore:number|null;competitionSlug:string;stage?:string;status?:string;sourceUrl?:string}
const US='הפועל-תל-אביב'
export type Fixture={playedOn:string;opponentHe:string;competitionHe:string;scoreHe:string;homeAway:'home'|'away'}

/** The fixtures a candidate may attach to. Only Hapoel Tel Aviv has a match archive in the Worker data today. */
type PackMatch={date:string;competition?:string;home:string;away:string;score?:string}
/** Any other club's fixtures: its own pack's match list (date, both sides, score) — one match on that date or none. */
function packFixture(clubId:string,playedOn:string):{fixture:Fixture|null;conflict:boolean}{
 if(!/^[a-z][a-z0-9-]{1,60}$/.test(clubId))return {fixture:null,conflict:false}
 const file=path.join(process.cwd(),'club-packs',clubId,'matches.json')
 if(!existsSync(file))return {fixture:null,conflict:false}
 let rows:PackMatch[];try{rows=JSON.parse(readFileSync(file,'utf8')) as PackMatch[]}catch{return {fixture:null,conflict:false}}
 const hits=rows.filter(r=>r.date===playedOn)
 if(hits.length===0)return {fixture:null,conflict:false}
 if(hits.length>1)return {fixture:null,conflict:true}
 const r=hits[0]!
 return {conflict:false,fixture:{playedOn,opponentHe:`${r.home} – ${r.away}`,competitionHe:r.competition??'',scoreHe:(r.score??'').replace('-',':'),homeAway:'home'}}
}
export function findFixture(clubId:string,playedOn:string|null):{fixture:Fixture|null;conflict:boolean}{
 if(!playedOn)return {fixture:null,conflict:false}
 if(clubId!==WORKER_ROUTE_CLUB)return packFixture(clubId,playedOn)
 const rows=(matchesFile as unknown as {records:MatchRow[]}).records.filter(r=>r.playedOn===playedOn&&(r.homeClubSlug===US||r.awayClubSlug===US)&&r.status!=='cancelled')
 if(rows.length===0)return {fixture:null,conflict:false}
 if(rows.length>1)return {fixture:null,conflict:true}
 const r=rows[0]!,home=r.homeClubSlug===US
 return {conflict:false,fixture:{playedOn,opponentHe:(home?r.awayClubSlug:r.homeClubSlug).replace(/-/g,' '),competitionHe:r.competitionSlug.replace(/-/g,' '),scoreHe:r.homeScore===null||r.awayScore===null?'':`${r.homeScore}:${r.awayScore}`,homeAway:home?'home':'away'}}
}

const norm=(s:string)=>s.replace(/[\s'"׳״.-]+/g,'').toLowerCase()
const bundled=()=>(goalsFile as unknown as {records:{goalId:string;playedOn:string;sequence:{actorHe:string}[]}[]}).records
/** Same match day and same finisher as a bundled goal: the curated record wins and stays untouched. */
export const duplicatesBundled=(c:Candidate)=>!!c.playedOn&&c.steps.length>0&&bundled().some(g=>g.playedOn===c.playedOn&&norm(g.sequence[g.sequence.length-1]!.actorHe)===norm(c.steps[c.steps.length-1]!.actorHe))

export type GateContext={policy:Policy;durable:boolean;sourceLanguageHe?:boolean}
export type GateResult={status:Candidate['status'];issues:IssueCode[];record:GoalSourceRecord|null}

/** Issues that stop a record from ever being played. The rest only keep it from publishing itself. */
const SOFT:ReadonlySet<IssueCode>=new Set(['AUTO_PUBLISH_OFF','SOURCE_NOT_CERTIFIED','STORAGE_NOT_DURABLE','NO_GOAL_ROUTE'])

export function toRecord(c:Candidate,f:Fixture,lang:string):GoalSourceRecord{
 const last=c.steps[c.steps.length-1]!
 return {
  goalId:c.id,titleHe:`השער של ${last.actorHe}`,subtitleHe:`${f.playedOn} · דקה ${c.minute}`,playedOn:f.playedOn,competitionHe:f.competitionHe,opponentHe:f.opponentHe,scoreHe:f.scoreHe,
  narrativeHe:c.steps.map(s=>s.noteHe).join(' '),
  sequence:c.steps.map(({evidence:_e,...s})=>s),
  sourceTitle:`${c.sourceIds.join(' · ')} (${lang})`,sourceUrl:c.evidence[0]?.url??null,confidence:2,
 }
}

export function evaluate(c:Candidate,ctx:GateContext):GateResult{
 const issues:IssueCode[]=[],add=(i:IssueCode)=>{if(!issues.includes(i))issues.push(i)}
 if(c.steps.length===0){add('NO_SEQUENCE');return {status:'candidate',issues,record:null}}
 if(c.steps.length<2){add('TOO_FEW_GROUNDED_STEPS');return {status:'candidate',issues,record:null}}
 if(c.steps.length>MAX_TOUCHES)add('TOO_MANY_STEPS') // never truncated: a contiguous sub-sequence needs a contract nobody wrote
 if(!c.scorerAlias)add('SCORER_UNKNOWN')
 else if(norm(c.steps[c.steps.length-1]!.actorHe)!==norm(c.scorerAlias)&&!norm(c.steps[c.steps.length-1]!.actorHe).includes(norm(c.scorerAlias))&&!norm(c.scorerAlias).includes(norm(c.steps[c.steps.length-1]!.actorHe)))add('ACTOR_AMBIGUOUS')
 if(c.ownGoal)add('ACTOR_AMBIGUOUS')
 for(const s of c.steps)if(!s.evidence||!s.evidence.quote||!norm(s.evidence.quote).includes(norm(s.actorHe))||!s.positionHe)add('STEP_WITHOUT_EVIDENCE')
 if(c.steps.some(s=>s.evidence?.language!=='he'))add('NOT_HEBREW_SOURCE')
 const {fixture,conflict}=findFixture(c.clubId,c.playedOn)
 if(conflict)add('FIXTURE_CONFLICT');else if(!fixture)add('FIXTURE_NOT_FOUND')
 if(duplicatesBundled(c))add('DUPLICATE_OF_BUNDLED')
 let record:GoalSourceRecord|null=null
 if(fixture&&c.steps.length<=MAX_TOUCHES){
  record=toRecord(c,fixture,'he')
  if(replayHeld(record.goalId))add('REPLAY_HELD')
  if(readTruth(record).rejections.length>0)add('TRUTH_REJECTED')
 }
 if(issues.some(i=>!SOFT.has(i)))return {status:'held',issues,record:null}
 const src=c.sourceIds.map(id=>ctx.policy.sources[id])
 if(!src.every(s=>s?.certified))add('SOURCE_NOT_CERTIFIED')
 if(!(ctx.policy.autoPublish&&!ctx.policy.paused&&ctx.policy.clubs[c.clubId]?.autoPublish&&src.every(s=>s?.enabled&&s.autoPublish)))add('AUTO_PUBLISH_OFF')
 if(!ctx.durable)add('STORAGE_NOT_DURABLE')
 if(c.clubId!==WORKER_ROUTE_CLUB)add('NO_GOAL_ROUTE')
 return {status:issues.length===0?'auto_publishable':'ready_for_review',issues,record}
}

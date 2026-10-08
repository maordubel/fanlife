'use server'
import {requestClub} from '@/lib/clubs/request'
import {cleanTouches,clubGoals,goalPool} from '@/lib/clubs/goal'
import {MIN_TOUCHES,judgeSteps,type Verdict} from '@/lib/clubs/goal-model'

export type GoalVerdict=Verdict&{
 truth:{actor:string|null;side:'club'|'opponent'|'unnamed';action:string;zone:string;note:string}[]
 narrative:string;sources:{title:string;url:string|null}[]
}

/**
 * Gate 8 grading: zone practice, decided where the answer lives. Full mode needs two to five valid touches and a goal whose
 * report describes at least two; a forged or malformed sheet is refused whole. An unnamed actor is not applicable (its term
 * leaves the denominator), extra and missing touches can only lower quality, and a hint costs once. The cast, verbs, order
 * and count never left the server before this call. The hint receipt is the player's own flag (`hinted`): it can only ever
 * lower his own score, so there is nothing to forge.
 */
export async function gradeGoalReplay(slug:string,version:string,goalId:string,seed:number,touches:unknown,hinted=false):Promise<GoalVerdict|null>{
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||typeof goalId!=='string'||goalId.length>200||!Number.isSafeInteger(seed))return null
 const resolved=await requestClub(slug,8)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates.goal?.playable)return null
 const g=clubGoals(resolved.data).find(x=>x.id===goalId)
 if(!g||g.steps.length<MIN_TOUCHES)return null
 const clean=cleanTouches(touches,goalPool(resolved.data,g,seed))
 if(!clean||clean.length<MIN_TOUCHES)return null
 const v=judgeSteps(g.steps.map(s=>({actor:s.actor,action:s.action,zone:s.zone})),clean,hinted===true)
 return {...v,truth:g.steps.map(s=>({actor:s.actor,side:s.side,action:s.action,zone:s.zone,note:s.note})),narrative:g.narrative,sources:g.sources.map(id=>{const s=resolved.data.sources.find(x=>x.id===id);return {title:s?.title||id,url:s?.url||null}})}
}

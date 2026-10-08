'use server'
import {requestClub} from '@/lib/clubs/request'
import {cleanTouches,clubGoals,goalPool,judgeGoal,type GoalStepVerdict} from '@/lib/clubs/goal'

export type GoalVerdict={
 points:number;max:number;countRight:boolean;steps:GoalStepVerdict[]
 truth:{actor:string|null;side:'club'|'opponent'|'unnamed';action:string;zone:string;note:string}[]
 narrative:string;sources:{title:string;url:string|null}[]
}

/**
 * Gate 8 grading for the replay presentation: the same checks and the same judge as `gradeClubGoal`, and the report's
 * own side (club / opponent / unnamed) for each touch so the replay can dress a man in the right shirt. The cast, verbs,
 * order and count never left the server before this call.
 */
export async function gradeGoalReplay(slug:string,version:string,goalId:string,seed:number,touches:unknown):Promise<GoalVerdict|null>{
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||typeof goalId!=='string'||goalId.length>200||!Number.isSafeInteger(seed))return null
 const resolved=await requestClub(slug,8)
 if(!resolved||resolved.data.version!==version||!resolved.data.gates.goal?.playable)return null
 const g=clubGoals(resolved.data).find(x=>x.id===goalId)
 if(!g)return null
 const clean=cleanTouches(touches,goalPool(resolved.data,g,seed))
 if(!clean)return null
 const v=judgeGoal(g,clean)
 return {...v,truth:g.steps.map(s=>({actor:s.actor,side:s.side,action:s.action,zone:s.zone,note:s.note})),narrative:g.narrative,sources:g.sources.map(id=>{const s=resolved.data.sources.find(x=>x.id===id);return {title:s?.title||id,url:s?.url||null}})}
}

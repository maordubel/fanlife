/** Data contract for owner-created production briefs. A saved brief is not a running job. */
export type Brief={id:string;createdAt:string;club:string;topic:string;season:string;duration:number;status:'brief_saved';blockers:string[]}
export function validateBrief(value:unknown):Omit<Brief,'id'|'createdAt'|'status'|'blockers'>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('A production brief is required.')
 const b=value as Record<string,unknown>
 const field=(k:string,max:number,required=false)=>{const v=b[k];if(typeof v!=='string'||v.trim().length>max||(required&&!v.trim()))throw new Error(`Invalid ${k}.`);return v.trim()}
 const club=field('club',100,true),topic=field('topic',240,true),season=field('season',100)
 if(typeof b.duration!=='number'||!Number.isInteger(b.duration)||b.duration<7||b.duration>25)throw new Error('Duration must be 7–25 minutes.')
 return {club,topic,season,duration:b.duration}
}

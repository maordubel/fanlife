import {REGISTRY} from '@/lib/master/registry'

export type ResearchTurn={day:string;clubId:string}
export const researchDay=(now=new Date())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Athens',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)
export function nextResearchTurn(day:string,previous:ResearchTurn|null,ids:readonly string[]=REGISTRY.map(c=>c.id)):ResearchTurn{
 if(!ids.length)throw new Error('No clubs in the research rotation')
 if(previous&&previous.day>=day&&ids.includes(previous.clubId))return previous
 const index=previous?ids.indexOf(previous.clubId):-1
 return {day,clubId:ids[(index+1)%ids.length]!}
}

import 'server-only'
import {loadClub} from '@/lib/clubs/resolver'
import {readState} from '@/lib/master/store'
import {evaluationMode} from '@/lib/master/mode'
import {gateAccess} from '@/lib/clubs/access'
import {archiveDoor,archiveEventHref} from '@/lib/clubs/archive-door'
import {people,peopleFromRepo} from './registry'
import type {Person,Pos} from './model'

/**
 * A player profile's read model (18.11.2026): one person, every one of our clubs he played for. A fan sees only the clubs
 * whose archive is open to fans (rule: only the owner opens a club); the owner's preview sees every record, marked.
 * Hidden ratings never leave the server (rule 4) — the page shows Legends stars, which the game already shows.
 */
export type ProfileStint={club:string;clubName:string;open:boolean;name:string;years:string;from:number|null;to:number|null;positions:Pos[];apps:number|null;goals:number|null;stars:number|null;archiveHref:string|null}
export type Profile={id:string;canonicalId:string;name:string;aliases:string[];stints:ProfileStint[];hidden:number;clubs:number;stars:number|null;qid:string|null}
const POS_WORD:Record<Pos,string>={GK:'Goalkeeper',DF:'Defender',MF:'Midfielder',FW:'Forward'}
export const posWord=(p:Pos)=>POS_WORD[p]
const yearsOf=(f:number|null,t:number|null)=>f&&t?(f===t?`${f}`:`${f}–${t}`):f?`from ${f}`:t?`until ${t}`:'years not recorded'

export async function profileFor(id:string,owner:boolean):Promise<Profile|null>{
 const reg=await people().catch(()=>peopleFromRepo())
 const p:Person|null=reg.resolve(id);if(!p)return null
 const [state]=await Promise.all([readState().catch(()=>null)])
 const preview=evaluationMode()
 const stints:ProfileStint[]=[]
 for(const s of p.stints){
  const control=state?.clubs.find(c=>c.id===s.club)
  const open=gateAccess(control?{status:control.status,gates:control.gates}:null,12,preview).allowed
  if(!open&&!owner)continue
  const loaded=await loadClub(s.club).catch(()=>null)
  const entry=loaded?archiveDoor(loaded.data).player(s.eid):null
  stints.push({club:s.club,clubName:loaded?.data.identity.name??control?.name??s.club,open,name:s.name,years:yearsOf(s.from,s.to),from:s.from,to:s.to,positions:s.pos,apps:s.apps,goals:s.goals,stars:s.stars,archiveHref:open?archiveEventHref(s.club,entry,'en'):null})
 }
 if(!stints.length)return null
 const shown=stints.filter(s=>s.stars!==null).map(s=>s.stars!)
 return {id,canonicalId:p.id,name:p.name,aliases:p.aliases.slice(0,6),stints,hidden:p.stints.length-stints.length,clubs:new Set(stints.map(s=>s.club)).size,stars:shown.length?Math.max(...shown):null,qid:p.qid}
}

/** the profile address of a club record — the one link every game and the archive use */
export const profileHref=(personId:string)=>`/players/${personId}`
/** the person id a club record belongs to (null when the generated file does not hold it yet) */
export async function personIdOf(club:string,eid:string):Promise<string|null>{const reg=await people().catch(()=>peopleFromRepo());return reg.personOf(club,eid)?.id??null}

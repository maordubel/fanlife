import type {ClubSummary} from './summary'
import type {Job} from './types'

/**
 * The Editor's Desk inbox (plan §4): deterministic rules over the same read models the detail screens use, so the
 * overview can never report a number its destination does not show. No AI, no scoring — a rule, a club, a reason
 * and the one place that resolves it. Ordered by priority, then club name.
 */
export type AttentionItem={id:string;priority:1|2|3;club:string|null;clubName:string|null;title:string;reason:string;href:string;cta:string}
export type DeskHealth={storage:{durable:boolean;kind:string;error?:string};measurement:'connected'|'evaluation'|'not-connected';runnerPinned:boolean|null}

export const deskHref=(section:string,q:Record<string,string|undefined>={})=>{const p=new URLSearchParams({section});for(const [k,v] of Object.entries(q))if(v)p.set(k,v);return `/master/admin?${p}`}

export function attention(summaries:ClubSummary[],jobs:Job[],health:DeskHealth):AttentionItem[]{
 const out:AttentionItem[]=[]
 const add=(x:AttentionItem)=>out.push(x)
 if(!health.storage.durable)add({id:'storage',priority:1,club:null,clubName:null,title:health.storage.error?'Storage is not answering':'Your changes are not being saved',reason:health.storage.error||'No storage is connected, so changes are lost when the server restarts.',href:deskHref('operations',{view:'storage'}),cta:'Fix storage'})
 for(const s of summaries){
  const c={club:s.id,clubName:s.name}
  if(s.control.status==='live'&&!s.activation.allowed)add({id:`activation:${s.id}`,priority:1,...c,title:'A live club has a game that does not work',reason:s.activation.reasons[0]||'A game that is switched on cannot be played.',href:deskHref('clubs',{club:s.id,view:'readiness'}),cta:'Fix it'})
  if(s.archive.health==='profiles-missing'||s.archive.health==='profile-unreadable')add({id:`profile:${s.id}`,priority:1,...c,title:'The list of websites to read is broken',reason:s.archive.error||'The research settings for this club are missing or cannot be read.',href:deskHref('data',{club:s.id}),cta:'Open the websites'})
  if(s.research.changedSources>0)add({id:`changed:${s.id}`,priority:2,...c,title:`${s.research.changedSources} page${s.research.changedSources===1?'':'s'} changed since you checked`,reason:'Look at the new copy and say if it is still right.',href:deskHref('clubs',{club:s.id,view:'evidence'}),cta:'Check the new copy'})
  if(s.research.findingsPending>0)add({id:`findings:${s.id}`,priority:2,...c,title:`Check ${s.research.findingsPending} new fact${s.research.findingsPending===1?'':'s'}`,reason:'Read from public websites. Answer Yes, No or Later for each one.',href:deskHref('clubs',{club:s.id,view:'evidence'}),cta:'Check them now'})
  if(s.archive.blocked>0)add({id:`blocked:${s.id}`,priority:3,...c,title:`${s.archive.blocked} website page${s.archive.blocked===1?'':'s'} refused us`,reason:'We do not force our way in. Nothing to do unless you want to try a different website.',href:deskHref('data',{club:s.id}),cta:'See which'})
  if(s.archive.needsParser>0)add({id:`parser:${s.id}`,priority:3,...c,title:`${s.archive.needsParser} saved page${s.archive.needsParser===1?'':'s'} we cannot read yet`,reason:'Nothing to do now. They are kept, and are read once a developer adds a reader for that website.',href:deskHref('data',{club:s.id}),cta:'See them'})
  if(s.data&&s.data.dataPlayable>0&&!s.control.gatesOn.length)add({id:`gates:${s.id}`,priority:3,...c,title:'This club is ready to open',reason:`${s.data.dataPlayable} game${s.data.dataPlayable===1?' is':'s are'} ready to play, and none is switched on.`,href:deskHref('clubs',{club:s.id,view:'launch'}),cta:'Open the games'})
 }
 const failed=jobs.filter(j=>j.status==='failed')
 for(const j of failed.slice(0,10)){const s=summaries.find(x=>x.id===j.clubId);add({id:`job:${j.id}`,priority:2,club:j.clubId,clubName:s?.name||j.clubId,title:'A research run failed',reason:(j.error||'No error was recorded.').slice(0,240),href:deskHref('data',{club:j.clubId}),cta:'See what went wrong'})}
 if(health.measurement==='not-connected')add({id:'measurement',priority:3,club:null,clubName:null,title:'Visitor counting is off',reason:'No visits are being counted, so Audience shows “not connected”, not zero.',href:deskHref('audience'),cta:'Set it up'})
 if(health.runnerPinned===false)add({id:'runner',priority:3,club:null,clubName:null,title:'The weekly reader cannot see websites added here',reason:'In GitHub, set the variable FAN_LIFE_RESEARCH_URL and the secret FAN_LIFE_CRON_SECRET.',href:deskHref('operations',{view:'schedules'}),cta:'Fix the schedule'})
 return out.sort((a,b)=>a.priority-b.priority||(a.clubName||'').localeCompare(b.clubName||''))
}

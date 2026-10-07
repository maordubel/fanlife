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
 if(!health.storage.durable)add({id:'storage',priority:1,club:null,clubName:null,title:health.storage.error?'Storage is connected but refusing reads':'Changes are not being kept',reason:health.storage.error||'No durable store is connected: control-room changes last until this server instance restarts.',href:deskHref('operations',{view:'storage'}),cta:'Open the storage map'})
 for(const s of summaries){
  const c={club:s.id,clubName:s.name}
  if(s.control.status==='live'&&!s.activation.allowed)add({id:`activation:${s.id}`,priority:1,...c,title:'Published club fails its activation check',reason:s.activation.reasons[0]||'A switched-on gate is not playable.',href:deskHref('clubs',{club:s.id,view:'readiness'}),cta:'Open readiness'})
  if(s.archive.health==='profiles-missing'||s.archive.health==='profile-unreadable')add({id:`profile:${s.id}`,priority:1,...c,title:'Research profile cannot be read',reason:s.archive.error||'The profile dataset is missing or unreadable on this server.',href:deskHref('data',{club:s.id}),cta:'Open sources'})
  if(s.research.changedSources>0)add({id:`changed:${s.id}`,priority:2,...c,title:`${s.research.changedSources} source${s.research.changedSources===1?'':'s'} changed after review`,reason:'The new snapshot waits beside the reviewed one until you compare them.',href:deskHref('clubs',{club:s.id,view:'evidence'}),cta:'Compare'})
  if(s.research.findingsPending>0)add({id:`findings:${s.id}`,priority:2,...c,title:`${s.research.findingsPending} finding${s.research.findingsPending===1?'':'s'} to decide`,reason:'Collected and unreviewed. Nothing reaches a game until you approve it and a pack is built.',href:deskHref('clubs',{club:s.id,view:'evidence'}),cta:'Review'})
  if(s.archive.blocked>0)add({id:`blocked:${s.id}`,priority:3,...c,title:`${s.archive.blocked} source endpoint${s.archive.blocked===1?'':'s'} refused`,reason:'Recorded, not bypassed. A refusal waits for a different source or a configuration change.',href:deskHref('data',{club:s.id}),cta:'Inspect sources'})
  if(s.archive.needsParser>0)add({id:`parser:${s.id}`,priority:3,...c,title:`${s.archive.needsParser} document${s.archive.needsParser===1?'':'s'} stored without a parser`,reason:'Kept and fingerprinted; a tested parser can read them later without fetching again.',href:deskHref('data',{club:s.id}),cta:'Open parser backlog'})
  if(s.data&&s.data.dataPlayable>0&&!s.control.gatesOn.length)add({id:`gates:${s.id}`,priority:3,...c,title:'Playable data, no gate switched on',reason:`${s.data.dataPlayable} gate${s.data.dataPlayable===1?' is':'s are'} playable from the compiled pack.`,href:deskHref('clubs',{club:s.id,view:'readiness'}),cta:'Choose gates'})
 }
 const failed=jobs.filter(j=>j.status==='failed')
 for(const j of failed.slice(0,10)){const s=summaries.find(x=>x.id===j.clubId);add({id:`job:${j.id}`,priority:2,club:j.clubId,clubName:s?.name||j.clubId,title:'Research job failed',reason:(j.error||'No error was recorded.').slice(0,240),href:deskHref('data',{club:j.clubId}),cta:'Inspect the run'})}
 if(health.measurement==='not-connected')add({id:'measurement',priority:3,club:null,clubName:null,title:'Audience measurement is not connected',reason:'No first-party events are being stored, so the Audience desk can only say "not connected" — never zero visitors.',href:deskHref('audience'),cta:'Open Audience'})
 if(health.runnerPinned===false)add({id:'runner',priority:3,club:null,clubName:null,title:'The scheduled collector cannot see sources added here',reason:'Set the GitHub variable FAN_LIFE_RESEARCH_URL and the secret FAN_LIFE_CRON_SECRET so each run pins the control room’s sources.',href:deskHref('operations',{view:'schedules'}),cta:'Open schedules'})
 return out.sort((a,b)=>a.priority-b.priority||(a.clubName||'').localeCompare(b.clubName||''))
}

import type {ClubSummary} from './summary'
/**
 * The three layers' wording, shared by the server read model and the admin's client screens (no server-only import).
 */
/** covered of total, and what remains. `total`/`remaining` are null when the universe is unknown — never a guessed figure. */
export type Progress={covered:number;total:number|null;remaining:number|null}
/**
 * Data-ready, publish-configured and published are three different facts (audit F20):
 *  no-data · choose-gates (playable data, no gate switched on) · gates-not-playable (a switched-on gate lacks data)
 *  · blocked (activation fails for engine/pack reasons) · ready-to-publish · published · live-blocked
 */
export type PublishState='no-data'|'choose-gates'|'gates-not-playable'|'blocked'|'ready-to-publish'|'published'|'live-blocked'
export const PUBLISH_LABEL:Record<PublishState,string>={'no-data':'No playable data yet','choose-gates':'Choose gates to publish','gates-not-playable':'A switched-on gate has no playable data','blocked':'Blocked by the activation check','ready-to-publish':'Ready to publish','published':'Published','live-blocked':'Live but failing the activation check'}
export function publishState(s:Pick<ClubSummary,'data'|'control'|'activation'>):PublishState{
 const playable=s.data?.dataPlayable||0,on=s.control.gatesOn
 if(s.control.status==='live')return s.activation.allowed?'published':'live-blocked'
 if(!playable)return 'no-data'
 if(!on.length)return 'choose-gates'
 if(s.data&&on.some(n=>!s.data!.gates.find(g=>g.number===n)?.dataPlayable))return 'gates-not-playable'
 return s.activation.allowed?'ready-to-publish':'blocked'
}
/** "3 of 10 · 7 remaining", or "3 so far · total unknown" — no percentage is ever derived from an unknown total. */
export const progressText=(p:Progress,unit='')=>p.total===null?`${p.covered}${unit} so far · total unknown`:`${p.covered} of ${p.total}${unit}${p.remaining?` · ${p.remaining} remaining`:''}`
/** Overview counts per layer (audit F20): data-ready, publish-configured, published — never folded into one figure. */
export function overviewCounts(sums:Pick<ClubSummary,'data'|'control'|'publication'|'activation'>[]){
 return {
  dataReady:sums.filter(s=>(s.data?.dataPlayable||0)>0).length,
  chooseGates:sums.filter(s=>s.publication.state==='choose-gates').length,
  configured:sums.filter(s=>s.control.gatesOn.length>0).length,
  readyToPublish:sums.filter(s=>s.publication.state==='ready-to-publish').length,
  published:sums.filter(s=>s.publication.state==='published').length,
  liveBlocked:sums.filter(s=>s.publication.state==='live-blocked').length,
 }
}

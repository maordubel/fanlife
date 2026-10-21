import type {Fixture} from '@/lib/fixtures/types'
import {PRODUCTS,momentFor,offerHref,isCompanion,type Offer} from './registry'

/**
 * OfferPolicy — at most ONE companion offer, and only for a verified fixture.
 *  · within 3 hours before kick-off, or live (up to 2 h after): OFFSIDES ("kickoff_live")
 *  · from 3 days to 3 hours before kick-off: DUBID ("before_round")
 *  · a fixture with only a date (no time), a postponed one, or none: nothing
 * Pure: no clock, no network. The caller passes `now`.
 */
export const HOUR=3_600_000
export function offerFor(f:Fixture|null|undefined,now:Date):Offer|null{
 if(!f||f.status!=='scheduled'||f.dateOnly)return null
 const t=Date.parse(f.kickoff);if(!Number.isFinite(t))return null
 const until=t-now.getTime()
 const want=until<=3*HOUR&&until>=-2*HOUR?'offsides':until>3*HOUR&&until<=72*HOUR?'dubid':null
 if(!want)return null
 const p=PRODUCTS.find(x=>x.id===want)
 if(!p||!p.enabled||!isCompanion(p.id)||p.heldOut.includes(f.clubId))return null
 const moment=momentFor(p.id);if(!moment)return null
 return {product:p.id,name:p.name,line:p.line,cta:p.cta,moment,href:offerHref(p.id,f.clubId,moment)}
}
/** the single soonest eligible offer across fixtures */
export function bestOffer(fixtures:readonly Fixture[],now:Date):{fixture:Fixture;offer:Offer}|null{
 const live=[...fixtures].sort((a,b)=>Date.parse(a.kickoff)-Date.parse(b.kickoff))
 for(const f of live){const offer=offerFor(f,now);if(offer)return {fixture:f,offer}}
 return null
}

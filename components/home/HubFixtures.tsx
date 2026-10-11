import 'server-only'
import type {ReactNode} from 'react'
import {FixtureRotator,type RotatorItem,type RotatorCopy} from '@/components/home/FixtureRotator'
import {getFixtureFeed} from '@/lib/fixtures/service'
import {rotationOrder} from '@/lib/fixtures/rotation'
import {livery} from '@/lib/club-livery'

/**
 * The hub's live-data half (performance audit, 11.10.2026). The provider used to be awaited before the hub sent its first
 * byte — on a cold server that was every club's fixture fetch, up to the 8 s timeout. These two server components are
 * rendered inside <Suspense>, so the cover, LIFE, the clubs and the market stream at once and the match card follows.
 * Nothing here invents: a club with no confirmed match is a "To be confirmed" card (rule 98).
 */
type Club={id:string}
async function itemsFor(open:readonly Club[],locale:string):Promise<RotatorItem[]>{
 const now=new Date(),feed=await getFixtureFeed(now).catch(()=>null)
 const items:RotatorItem[]=(feed?rotationOrder(feed.fixtures,now):[]).flatMap(f=>{
  const l=livery(f.clubId)
  if(!l)return []
  return [{clubId:f.clubId,club:l.name,opponent:f.opponent,initials:l.initials,primary:l.primary,on:l.on,type:l.type,pattern:l.pattern,kickoff:f.kickoff,dateOnly:f.dateOnly,clubSide:f.clubSide,competition:f.competition,venue:f.venue,href:`/clubs/${f.clubId}/meetings?vs=${encodeURIComponent(f.opponent)}&lang=${locale}`,tag:f.phase}]
 })
 // every club is on the roll (owner, 7.10.2026): a club with no confirmed match says so, nothing is guessed
 for(const c of open)if(!items.some(x=>x.clubId===c.id)){const l=livery(c.id);if(l)items.push({clubId:c.id,club:l.name,opponent:'',initials:l.initials,primary:l.primary,on:l.on,type:l.type,pattern:l.pattern,kickoff:'',dateOnly:true,clubSide:'home',competition:null,venue:null,href:`/clubs/${c.id}?lang=${locale}`,tag:'tbc'})}
 return items
}

/** `none` is what the strip says when no match is confirmed (the evaluation notice in preview, else nothing — the strip hides). */
export async function HubStop({open,locale,stopPress,vs,none}:{open:readonly Club[];locale:string;stopPress:string;vs:string;none:ReactNode}){
 const first=(await itemsFor(open,locale)).find(x=>x.tag!=='tbc')
 return first?<div className="mag-stop-in"><b>{stopPress}</b><span>{first.club} {vs} {first.opponent}</span></div>:<>{none}</>
}

export async function HubNextUp({open,locale,copy,title}:{open:readonly Club[];locale:string;copy:RotatorCopy;title:string}){
 const items=await itemsFor(open,locale)
 if(!items.length)return null
 return <section className="mag-section mag-next-section" id="next" aria-labelledby="next-h">
  <h2 className="mag-kicker" id="next-h">{title}</h2>
  <FixtureRotator items={items} copy={copy} locale={locale}/>
 </section>
}

/** Holds the section's place while the feed is on its way, so the clubs below do not jump. */
export function HubNextUpWaiting({title}:{title:string}){
 return <section className="mag-section mag-next-section" id="next" aria-labelledby="next-h" aria-busy="true">
  <h2 className="mag-kicker" id="next-h">{title}</h2>
  <div className="mag-fixture empty" style={{minBlockSize:'9rem'}}/>
 </section>
}

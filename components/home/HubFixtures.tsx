import 'server-only'
import type {ReactNode} from 'react'
import {FixtureRotator,type RotatorItem,type RotatorCopy} from '@/components/home/FixtureRotator'
import {crestUrl} from '@/ecosystem/crests/index.mjs'
import {getFixtureFeed} from '@/lib/fixtures/service'
import {rotationOrder} from '@/lib/fixtures/rotation'
import {livery} from '@/lib/club-livery'
import {companionFor} from '@/lib/universe/discovery'
import {getCatalog} from '@/lib/universe/catalog'
import {goHref} from '@/lib/ecosystem/links'
import {StopRotator,type StopItem} from '@/components/home/StopRotator'

/**
 * The hub's live-data half (performance audit, 11.10.2026). The provider used to be awaited before the hub sent its first
 * byte — on a cold server that was every club's fixture fetch, up to the 8 s timeout. These two server components are
 * rendered inside <Suspense>, so the cover, LIFE, the clubs and the market stream at once and the match card follows.
 * Nothing here invents: a club with no confirmed match is a "To be confirmed" line (rule 98).
 */
type Club={id:string}
async function itemsFor(open:readonly Club[],locale:string):Promise<RotatorItem[]>{
 const now=new Date(),feed=await getFixtureFeed(now).catch(()=>null)
 const items:RotatorItem[]=(feed?rotationOrder(feed.fixtures,now):[]).flatMap(f=>{
  const l=livery(f.clubId)
  if(!l)return []
  return [{clubId:f.clubId,club:l.name,opponent:f.opponent,opponentCrest:crestUrl(f.opponent),initials:l.initials,primary:l.primary,on:l.on,type:l.type,pattern:l.pattern,kickoff:f.kickoff,dateOnly:f.dateOnly,clubSide:f.clubSide,competition:f.competition,venue:f.venue,href:`/clubs/${f.clubId}/meetings?vs=${encodeURIComponent(f.opponent)}&lang=${locale}`,tag:f.phase}]
 })
 // every club is on the roll (owner, 7.10.2026): a club with no confirmed match says so, nothing is guessed
 for(const c of open)if(!items.some(x=>x.clubId===c.id)){const l=livery(c.id);if(l)items.push({clubId:c.id,club:l.name,opponent:'',initials:l.initials,primary:l.primary,on:l.on,type:l.type,pattern:l.pattern,kickoff:'',dateOnly:true,clubSide:'home',competition:null,venue:null,href:`/clubs/${c.id}?lang=${locale}`,tag:'tbc'})}
 return items
}

/** `none` is what the strip says when no match is confirmed (the evaluation notice in preview, else nothing — the strip hides). */
export async function HubStop({open,locale,stopPress,vs,none,last,next}:{open:readonly Club[];locale:string;stopPress:string;vs:string;none:ReactNode;last:string;next:string}){
 const now=new Date(),feed=await getFixtureFeed(now).catch(()=>null),names=new Map(open.map(c=>[c.id,livery(c.id)?.name??'']))
 const day=new Intl.DateTimeFormat(locale==='en'?'en-GB':locale,{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'})
 const lasts:StopItem[]=(feed?.results??[]).filter(r=>names.get(r.clubId)).sort((a,b)=>Date.parse(b.kickoff)-Date.parse(a.kickoff)).map(r=>({kind:'last' as const,tag:last,
  text:`${r.home} ${r.homeScore}–${r.awayScore} ${r.away}`,href:`/clubs/${r.clubId}?lang=${locale}`}))
 const nexts:StopItem[]=(feed?rotationOrder(feed.fixtures,now):[]).filter(f=>names.get(f.clubId)).map(f=>({kind:'next' as const,tag:next,
  text:`${f.home} ${vs} ${f.away} · ${day.format(new Date(f.kickoff))}`,href:`/clubs/${f.clubId}?lang=${locale}`}))
 // Last and Next take turns, soonest and latest first; at most ten lines so a turn comes round in under a minute
 const items:StopItem[]=[]
 for(let i=0;items.length<10&&(i<lasts.length||i<nexts.length);i++){if(lasts[i])items.push(lasts[i]!);if(nexts[i]&&items.length<10)items.push(nexts[i]!)}
 return items.length?<StopRotator items={items} label={stopPress}/>:<>{none}</>
}

/** The section head of "Next up — for real": a kicker and the title in the weekly's script, red. */
function Head({title,kicker}:{title:string;kicker:string}){
 return <div className="wkh-sechead"><p className="wk-banner wkh-red">{kicker}</p><h2 className="wk-logo red wkh-title" id="next-h">{title}</h2></div>
}

export async function HubNextUp({open,locale,copy,title}:{open:readonly Club[];locale:string;copy:RotatorCopy;title:string}){
 const items=await itemsFor(open,locale)
 if(!items.length)return null
 return <section className="wkh-next" id="next" aria-labelledby="next-h">
  <Head title={title} kicker={copy.kicker}/>
  <FixtureRotator items={items} copy={copy} locale={locale}/>
 </section>
}

/** Holds the section's place while the feed is on its way, so the sections below do not jump. */
export function HubNextUpWaiting({title,kicker}:{title:string;kicker:string}){
 return <section className="wkh-next" id="next" aria-labelledby="next-h" aria-busy="true">
  <Head title={title} kicker={kicker}/>
  <div className="wk-coupon wkh-coupon wkh-coupon-wait"/>
 </section>
}

/**
 * The matchday card (Connected Football, 27.10.2026): ONE companion action, and only one the target can really do —
 * the same match on OFFSIDES near kick-off, or the club's DUBID league with an open round (lib/universe/discovery.ts).
 * The match is context; the promise names the league and the round. Nothing true to offer, or a catalog that did not
 * answer → no card at all.
 */
export async function HubMatchday({open,locale,kicker}:{open:readonly Club[];locale:string;kicker:string}){
 const now=new Date(),[feed,cat]=await Promise.all([getFixtureFeed(now).catch(()=>null),getCatalog().catch(()=>null)])
 if(!feed||!cat)return null
 const ids=new Set(open.map(c=>c.id)),hit=companionFor(feed.fixtures.filter(f=>ids.has(f.clubId)),cat,now)
 if(!hit)return null
 const l=livery(hit.fixture.clubId),a=hit.action
 const href=goHref(a.href,`matchday-${a.family}`,hit.fixture.clubId)??a.href
 return <section className="wkh-lm wkh-uv" aria-label={a.copy.title} data-testid="hub-matchday" data-family={a.family} data-reason={a.reasonCode}>
  <p className="wk-banner wkh-red">{a.family==='dubid'?a.copy.kicker:kicker}</p>
  <p className="wkh-uv-line"><b>{l?.name??hit.fixture.clubId}</b> {hit.fixture.home} – {hit.fixture.away}</p>
  <p className="wkh-uv-line"><b>{a.copy.title}</b> {a.copy.line}</p>
  <a className="wk-btn min-h-tap" href={href} data-moment={a.family==='dubid'?'before_round':'kickoff_live'}>{a.copy.cta}</a>
 </section>
}

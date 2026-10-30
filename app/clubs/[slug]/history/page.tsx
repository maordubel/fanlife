import {clubSubMetadata} from '@/lib/seo/club'
import Link from 'next/link'
import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import type {CSSProperties,ReactNode} from 'react'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {Badge} from '@/components/clubs/Badge'
import {ClubFlavour} from '@/components/clubs/ClubFlavour'
import {GateArt,ShirtMark} from '@/components/clubs/ClubGateWall'
import {Plate} from '@/components/weekly/Plate'
import {readState} from '@/lib/master/store'
import {loadClub,resolveClubId} from '@/lib/clubs/resolver'
import {gateAccess} from '@/lib/clubs/access'
import {evaluationMode} from '@/lib/master/mode'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {uiLocale} from '@/lib/clubs/locale'
import {SHARED_GATES,gateAvailability,sharedGate,type GateKey} from '@/lib/clubs/gates'
import {clubWorld,worldFor,worldPublishers} from '@/lib/clubs/world'
import {clubHref} from '@/lib/clubs/club-href'
import {kitViews} from '@/lib/clubs/gate-content'
import {belovedOf,wallNumbers} from '@/lib/clubs/beloved'
import {clubAwayData,hasClubAway} from '@/lib/away-days/club'
import {crestFor} from '@/lib/clubs/crest'
import {gameCopy} from '@/lib/clubs/game-copy'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'
export function generateMetadata({params}:{params:{slug:string}}){const c=REGISTRY.find(r=>r.id===params.slug);return c?clubSubMetadata({id:c.id,name:c.name,sub:'history'}):{title:en.historyTitle}}

const pad=(n:number)=>String(n).padStart(2,'0')
/** A year the sourced line itself prints — never computed, never guessed. */
const yearIn=(s?:string)=>s?/\b(1[89]\d\d|20[0-2]\d)\b/.exec(s)?.[1]??null:null

/**
 * History: the club's "Top Teams" file (rule 124). The record panel with the crest and the nicknames, a few big numbers the
 * record itself carries, how it began, the ground, the badge and the colours — every line sourced twice in the world file —
 * then "Turn to…": the archive, the timeline, the kit archive and the away days.
 */
export default async function History({params,searchParams}:{params:{slug:string};searchParams:{lang?:string}}) {
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const [state,core]=await Promise.all([readState(),loadClub(id)])
 const c=state.clubs.find(x=>x.id===id)
 if(!c)notFound()
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,reg=REGISTRY.find(r=>r.id===id)||c,theme=core?.data.theme||clubTheme(reg),w=clubWorld(id),world=worldFor(reg),games=gameCopy(locale)
 const doors=(['archive','timeline'] as const).filter(k=>core&&gateAccess(c,sharedGate(k)!.number,evaluationMode()).allowed&&gateAvailability(core.data,k).playable)
 const door={archive:copy.historyArchive,timeline:copy.historyTimeline},kits=core?kitViews(core.data).length:0
 const credit=w?worldPublishers(w):[]
 const away=id==='hapoel-tel-aviv'?'/away-days':hasClubAway(id)?clubHref(id,'away-days',locale):null,awayData=clubAwayData(id)
 const open:GateKey[]=core?SHARED_GATES.filter(g=>gateAccess(c,g.number,evaluationMode()).allowed&&gateAvailability(core.data,g.key).playable).map(g=>g.key):[]
 const num=wallNumbers(belovedOf(world.terrace,open))
 const founded=yearIn(w?.founded?.line),crest=crestFor(id)
 const heritage=w?.flavour?.find(f=>f.kind==='heritage')??null,place=w?.flavour?.find(f=>f.kind==='place')??null
 const longest=Math.max(6,...c.name.split(/\s+/).map(x=>x.length))
 const roundels:{n:string;label:string;tone:string}[]=[
  ...(founded?[{n:founded,label:copy.historyFounded,tone:'paper'}]:[]),
  ...(kits>0?[{n:String(kits),label:copy.wkkKitsOnFile,tone:'club'}]:[]),
  ...(awayData?[{n:String(awayData.counts.abroad),label:copy.wkkNightsAway,tone:'navy'},{n:String(awayData.counts.countries),label:copy.awayd_countries,tone:'cyan'}]:[]),
 ]
 type Door={key:string;href:string;title:string;sub:string;n:number|null;art:ReactNode;testid?:string}
 const turn:Door[]=[
  ...doors.map(k=>({key:k,href:clubHref(id,k,locale),title:door[k],sub:games[`blurb.${k}`],n:num[k],art:<GateArt gate={k}/>})),
  ...(kits>0?[{key:'kit-archive',href:clubHref(id,'kit-archive',locale),title:copy.historyKits,sub:copy.wkkKitsSeason.replace('{n}',String(kits)),n:null,testid:'history-kit-archive',
   art:<span className="wk-cover-art wkk-art wk-stripes" data-art="shirt"><ShirtMark className="wkk-art-shirt"/><span className="wk-burst cyan wkk-turn-burst" dir="ltr"><b className="wk-num">{kits}</b></span></span>}]:[]),
  ...(away?[{key:'away',href:away,title:copy.awayName,sub:awayData?copy.wkkAwaySince.replace('{n}',String(awayData.counts.abroad)).replace('{y}',awayData.visits[0]!.playedOn.slice(0,4)):copy.awayNote,n:null,
   art:<span className="wk-cover-art wkk-art wk-navyplate" data-art="friends"><span className="wk-speed" aria-hidden="true"/><Plate art="friends" ink="club" className="wkk-art-plate"/></span>}]:[]),
 ]
 return <ClubSurface theme={theme} clubId={id} locale={locale}><main id="main" className="wkk wkk-history club-history">
  <header className="wkk-hist-top">
   <span className="wk-tag red wkk-hist-tt">{copy.wkkTopTeams}</span><span className="wk-banner">{copy.wkkClubFile}</span>
   <span className="wk-k wkk-hist-place">{world.voice.kicker}</span>
  </header>

  <div className="wkk-hist-lead">
   <section className="wk-panel wk-lift wkk-record wk-sky" aria-labelledby="hist-h">
    <span className="wk-speed" aria-hidden="true"/>
    <span className="wk-circle wkk-record-crest">{crest?<img src={crest} alt={c.name} width={139} height={181}/>:<Badge club={{id,initials:c.initials,name:c.name}}/>}</span>
    <Plate art="kicker" ink="club" className="wkk-record-kicker"/>
    <div className="wkk-record-name">
     <p className="wk-tag ink">{copy.historyKicker}</p>
     <h1 id="hist-h" className="wk-logo wkk-record-h" style={{['--len' as string]:longest} as CSSProperties}>{c.name}</h1>
     <p className="wk-cap white wkk-record-welcome">{world.voice.welcome}</p>
    </div>
    {w&&w.nicknames.length>0&&<div className="wk-stripes wkk-record-band" data-testid="club-nicknames"><p className="wkk-sr">{copy.historyNicknames}</p>
     <ul>{w.nicknames.map((n,i)=><li key={n.text} className={`wkk-nick${i%2?' alt':''}`}><b>{n.text}</b>{n.local&&<bdi lang={n.script} dir="auto">{n.local}</bdi>}</li>)}</ul></div>}
   </section>
   <aside className="wkk-hist-side">
    {roundels.length>0&&<ul className="wkk-roundels" aria-label={copy.historyKicker}>{roundels.map(r=><li key={r.label} data-tone={r.tone}><span className="wk-roundel"><b className="wk-num" dir="ltr">{r.n}</b></span><small className="wk-k">{r.label}</small></li>)}</ul>}
    {heritage&&<ClubFlavour item={heritage} kicker={copy.flavourKicker2} label={copy.wkkDyk} variant="dyk"/>}
   </aside>
  </div>

  {!w?<p className="wk-cap white wkk-hist-empty" data-testid="history-empty">{copy.historyEmpty}</p>:<>
   <div className="wkk-hist-two">
    {w.founded&&<section className="wkk-began" aria-labelledby="began-h">
     <div className="wkk-sechead"><h2 id="began-h" className="wk-logo red sm wk-tilt">{copy.historyFounded}</h2></div>
     <div className="wk-panel shadow wkk-began-in">
      <span className="wkk-began-art wk-clubplate" aria-hidden="true"><Plate art="memo" ink="ink" className="wkk-began-plate"/><span className="wk-burst white wkk-began-burst"><span><small className="wk-k">{c.city}</small>{founded&&<b className="wk-num" dir="ltr">{founded}</b>}</span></span></span>
      <p className="wkk-began-line">{w.founded.line}</p>
     </div>
    </section>}
    {w.ground&&<section className="wkk-ground" aria-labelledby="ground-h">
     <div className="wkk-sechead"><h2 id="ground-h" className="wk-logo red sm wk-tilt">{copy.historyGround}</h2><span className="wk-k muted">{copy.wkkHomeGround} · {c.city}</span></div>
     <div className="wk-panel shadow wkk-ground-in wk-navyplate">
      <span className="wk-speed" aria-hidden="true"/>
      <svg className="wkk-stand" viewBox="0 0 220 110" aria-hidden="true"><path className="pole" d="M30 18v80M190 18v80"/><rect className="lamp" x="16" y="8" width="28" height="16"/><rect className="lamp" x="176" y="8" width="28" height="16"/><path className="roof" d="M44 52h132l8 10H36z"/><rect className="seats" x="44" y="62" width="132" height="30"/><path className="rows" d="M44 70h132M44 78h132M44 86h132"/><path className="ground" d="M8 98h204"/></svg>
      <div className="wkk-ground-t">
       <h3 className="wk-head white">{w.ground.name}</h3>
       {w.ground.local&&<p className="wkk-ground-local"><bdi lang={w.ground.script} dir="auto">{w.ground.local}</bdi></p>}
       <p className="wk-cap white">{w.ground.line}</p>
      </div>
      {place&&<p className="wk-cap white wkk-ground-flav" data-testid="club-flavour">{place.line}</p>}
     </div>
    </section>}
   </div>
   <div className="wkk-hist-cards">
    {w.emblem&&<article className="wk-panel shadow wkk-badgecard"><span className="wkk-badgecard-art wk-newsdots" aria-hidden="true">{crest?<img src={crest} alt="" width={139} height={181}/>:<Badge club={{id,initials:c.initials,name:c.name}}/>}</span><div><h2 className="wk-head red">{copy.historyEmblem}</h2><p>{w.emblem.line}</p></div></article>}
    {w.colours&&<article className="wk-panel shadow wkk-colourcard"><span className="wkk-colourcard-art wk-stripes" aria-hidden="true"><i className="a"/><i className="b"/></span><div><h2 className="wk-head red">{copy.historyColours}</h2><p>{w.colours.line}</p></div></article>}
    {w.facts.length>0&&<article className="wk-panel shadow wkk-factcard"><div><h2 className="wk-head red">{copy.historyFacts}</h2><ul className="club-factlist">{w.facts.map(f=><li key={f.id}>{f.line}{f.local&&<> <bdi lang={f.script} dir="auto">({f.local})</bdi></>}</li>)}</ul></div></article>}
   </div>
  </>}

  {turn.length>0&&<section className="wkk-turn" aria-labelledby="turn-h">
   <div className="wkk-sechead"><h2 id="turn-h" className="wk-logo red sm wk-tilt">{copy.wkkTurnTo}</h2><span className="wk-k muted">{copy.wkkTurnSub}</span></div>
   <div className="wkk-doors">{turn.map(d=><Link key={d.key} className="wk-cover wkk-door min-h-tap" href={d.href} data-testid={d.testid}>
    <span className="wkk-door-art" aria-hidden="true">{d.art}</span>
    <span className="wk-roundel wkk-door-no" aria-hidden="true">{d.n!==null?<><small className="wk-k">{copy.wallGate}</small><b className="wk-num" dir="ltr">{pad(d.n)}</b></>:<b className="wk-num">→</b>}</span>
    <span className="wkk-door-t"><b className="wk-head">{d.title} <span aria-hidden="true">→</span></b><small className="wk-k">{d.sub}</small></span>
   </Link>)}</div>
  </section>}
  {credit.length>0&&<p className="wkk-credit" data-testid="history-credit">{copy.historySources}: {credit.join(' · ')}</p>}
 </main></ClubSurface>
}

import Link from 'next/link'
import {notFound} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {Contributors,PreviewRibbon,modeQuery} from '@/components/experiences/AfFrame'
import {experienceDoor} from '@/lib/experiences/access'
import {gateReport,membersFor,parseModeQuery,type GateReport,type Mode} from '@/lib/experiences/pool'
import {ALL_FOOTBALL} from '@/lib/experiences/registry'
import {door as featureDoor} from '@/lib/features-server'
import './all-football.css'
export const dynamic='force-dynamic'
export const metadata={title:'ALL FOOTBALL',description:ALL_FOOTBALL.tagline}

const STORY={
 trivia:{kicker:'Gate 2 · The quiz stand',title:'Every club’s questions',body:'Twelve questions, three lives, a clock. Each one names the club it comes from and the source it stands on.',unit:'questions'},
 timeline:{kicker:'Gate 13 · The long line',title:'One line, many clubs',body:'Place the dates. A title in Glasgow, a final in Piraeus, a founding in Mostar — on one line.',unit:'dated moments'},
 memory:{kicker:'Gate 6 · The wall',title:'The memory wall',body:'Pairs from every archive. Match them, and each pair tells you whose story it was.',unit:'pairs'},
} as const

/**
 * ALL FOOTBALL — the world edition (owner roadmap 12.10.2026; ADR-fanlife-0009/0010). A space that is NOT a club: three
 * gates over every published club's approved records. Off for fans until the owner switches it on; the owner previews.
 */
export default async function Page({searchParams}:{searchParams:{mode?:string;a?:string;b?:string}}){
 const [door,fl]=await Promise.all([experienceDoor(),featureDoor('fanLeague')])
 if(!door.open)notFound()
 const mode=parseModeQuery(searchParams)
 const gates=ALL_FOOTBALL.gates.filter(g=>door.preview||door.features.allFootballGates.includes(g))
 const reports=await Promise.all(gates.map(g=>gateReport(g)))
 const everyone=await membersFor('trivia')
 const contributors=[...new Map(reports.flatMap(r=>r.members).map(m=>[m.id,m])).values()].sort((a,b)=>a.name.localeCompare(b.name))
 const q=modeQuery(mode),href=(g:string)=>`/all-football/${g}${q?`?${q}`:''}`
 const today=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})
 const duelChoices=everyone.clubs.map(c=>({id:c.identity.id,name:c.identity.name})).sort((a,b)=>a.name.localeCompare(b.name))
 return <Shell locale="en">
  <PreviewRibbon on={door.preview}/>
  <main id="main" className="af af-front">
   <header className="af-mast">
    <p className="af-edition"><span>The world edition</span><span>{today}</span><span>{contributors.length} clubs on the page</span></p>
    <h1>All <span>Football</span></h1>
    <p>{ALL_FOOTBALL.tagline}</p>
   </header>
   <Contributors members={contributors}/>
   <nav className="af-modes" aria-label="How the clubs are drawn">
    <ModeLink mode={{kind:'balanced'}} current={mode} title="Balanced" sub="Every club gets its share — no archive drowns the rest."/>
    <ModeLink mode={{kind:'chaos'}} current={mode} title="Open draw" sub="Everything approved, in proportion to what each club has."/>
    <form action="/all-football" method="get" aria-label="Club duel" data-current={mode.kind==='duel'||undefined}>
     <input type="hidden" name="mode" value="duel"/>
     <b>Club duel</b><small>Two clubs, one round. Their archives, nobody else’s.</small>
     <span className="af-duel-row"><label className="sr-only" htmlFor="af-a">First club</label><select id="af-a" name="a" defaultValue={mode.kind==='duel'?mode.clubs[0]:duelChoices[0]?.id}>{duelChoices.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <span aria-hidden="true">v</span><label className="sr-only" htmlFor="af-b">Second club</label><select id="af-b" name="b" defaultValue={mode.kind==='duel'?mode.clubs[1]:duelChoices[1]?.id}>{duelChoices.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <button type="submit" className="min-h-tap">Set</button></span>
    </form>
   </nav>
   <section className="af-stories" aria-label="The gates">
    {reports.map(r=><Story key={r.gate} r={r} href={href(r.gate)}/>)}
   </section>
   {fl.open?<Link className="af-league" href="/all-football/fan-league"><span className="af-kicker">The manager’s edition{fl.preview?' · owner preview':''}</span><b>FAN LEAGUE</b><small>One real club, only its own men, a whole season. Sign from other decades of the same club.</small><span aria-hidden="true">→</span></Link>:null}
   <p className="af-note">Every question, date and pair here was approved for its own club first. A club joins this page when its gate is open to fans; nothing is invented to fill a round.</p>
  </main>
 </Shell>
}
function ModeLink({mode,current,title,sub}:{mode:Mode;current:Mode;title:string;sub:string}){
 const q=modeQuery(mode)
 return <Link href={`/all-football${q?`?${q}`:''}`} aria-current={current.kind===mode.kind?'true':undefined}><b>{title}</b><small>{sub}</small></Link>
}
function Story({r,href}:{r:GateReport;href:string}){
 const s=STORY[r.gate]
 return <article className="af-story" data-closed={!r.playable||undefined}>
  <span className="af-kicker">{s.kicker}</span>
  <h2>{s.title}</h2>
  <p>{s.body}</p>
  <p className="af-figure">{r.records.toLocaleString('en-GB')}<small>{s.unit} · {r.members.length} clubs</small></p>
  {r.playable?<Link className="af-go" href={href}>Play →</Link>:<span className="af-go" aria-disabled="true">{r.reason??'Not ready'}</span>}
 </article>
}

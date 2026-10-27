import Link from 'next/link'
import {Emblem} from '@/components/legends/Brand'
import {notFound} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {PinToggle} from '@/components/fanlife/Pins'
import {Contributors,PreviewRibbon,modeQuery} from '@/components/experiences/AfFrame'
import {Plate,type PlateArt,type PlateInk} from '@/components/weekly/Plate'
import {Icon} from '@/components/weekly/Icon'
import {experienceDoor} from '@/lib/experiences/access'
import {gateReport,membersFor,parseModeQuery,type GateReport,type Mode} from '@/lib/experiences/pool'
import {ALL_FOOTBALL} from '@/lib/experiences/registry'
import {door as featureDoor} from '@/lib/features-server'
import t from '@/messages/legends/en.json'
import './all-football.css'
export const dynamic='force-dynamic'
export const metadata={title:'ALL FOOTBALL',description:ALL_FOOTBALL.tagline}

/** each gate is a little weekly (rule 124): its number, its plate, its comic picture */
const STORY={
 trivia:{no:'02',kicker:'Gate 2 · The quiz stand',title:'Every club’s questions',body:'Twelve questions, three lives, a clock. Each one names the club it comes from and the source it stands on.',unit:'questions',plate:'wk-redplate',art:'face',ink:'red'},
 timeline:{no:'13',kicker:'Gate 13 · The long line',title:'One line, many clubs',body:'Place the dates. A title in Glasgow, a final in Piraeus, a founding in Mostar — on one line.',unit:'dated moments',plate:'wk-sky',art:'memo',ink:'navy'},
 memory:{no:'06',kicker:'Gate 6 · The wall',title:'The memory wall',body:'Pairs from every archive. Match them, and each pair tells you whose story it was.',unit:'pairs',plate:'wk-greenplate',art:'fans',ink:'orange'},
} as const satisfies Record<string,{no:string;kicker:string;title:string;body:string;unit:string;plate:string;art:PlateArt;ink:PlateInk}>

/**
 * ALL FOOTBALL — the world edition (owner roadmap 12.10.2026; ADR-fanlife-0009/0010). A space that is NOT a club: three
 * gates over every published club's approved records. Off for fans until the owner switches it on; the owner previews.
 * Dressed as THE WEEKLY (rule 124): a navy masthead with the globe, the draw as a coupon, the gates as covers.
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
 const drawn=mode.kind==='balanced'?t.drawBalanced:mode.kind==='chaos'?t.drawOpen:t.drawDuel
 return <Shell locale="en">
  <PreviewRibbon on={door.preview}/>
  <main id="main" className="af af-front wkl-af">
   <header className="af-mast wkl-af-mast">
    <p className="af-edition wkl-edition"><span className="wk-k">The world edition</span><span className="wk-k wkl-edition-date">{today}</span><span className="wk-k">{contributors.length} clubs on the page</span></p>
    <div className="wkl-af-plate wk-navyplate">
     <span className="wk-speed" style={{['--sx' as string]:'82%',['--sy' as string]:'30%'}} aria-hidden="true"/>
     <span className="wkl-globe" aria-hidden="true"><Icon name="globe" size={46}/></span>
     <h1 className="wkl-af-title"><span className="wkl-af-all">All</span> <span className="wkl-af-word">Football</span></h1>
     <Plate art="fans" ink="orange" className="wkl-af-fans"/>
    </div>
    <p className="wk-k wkl-mute wkl-af-date">{today}</p>
    <p className="wkp-under"><PinToggle href="/all-football" label="ALL FOOTBALL"/></p>
    <p className="wk-cap white wkl-af-tag">{ALL_FOOTBALL.tagline}</p>
   </header>
   <div className="wkl-af-body">
    <div className="wkl-af-side">
     <section className="wk-coupon wkl-af-draw" aria-labelledby="wkl-draw-h">
      <span className="wk-scissors" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/></svg></span>
      <h2 id="wkl-draw-h" className="wk-head wkl-af-drawh">How the clubs are drawn</h2>
      <nav className="af-modes wkl-modes" aria-label="How the clubs are drawn">
       <ModeLink mode={{kind:'balanced'}} current={mode} title="Balanced" sub="Every club gets its share — no archive drowns the rest."/>
       <ModeLink mode={{kind:'chaos'}} current={mode} title="Open draw" sub="Everything approved, in proportion to what each club has."/>
       <form action="/all-football" method="get" aria-label="Club duel" data-current={mode.kind==='duel'||undefined} className="wkl-mode">
        <input type="hidden" name="mode" value="duel"/>
        <span className="wkl-mode-tick" aria-hidden="true">{mode.kind==='duel'?<Tick/>:null}</span>
        <span className="wkl-mode-t"><b className="wk-head">Club duel</b><small>Two clubs, one round. Their archives, nobody else’s.</small>
         <span className="af-duel-row"><label className="sr-only" htmlFor="af-a">First club</label><select id="af-a" name="a" defaultValue={mode.kind==='duel'?mode.clubs[0]:duelChoices[0]?.id}>{duelChoices.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <span aria-hidden="true" className="wk-head">v</span><label className="sr-only" htmlFor="af-b">Second club</label><select id="af-b" name="b" defaultValue={mode.kind==='duel'?mode.clubs[1]:duelChoices[1]?.id}>{duelChoices.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <button type="submit" className="min-h-tap wk-btn">Set</button></span></span>
       </form>
      </nav>
     </section>
     <Contributors members={contributors}/>
    </div>
    <div className="wkl-af-main">
     <header className="wkl-af-gatesh">
      <div><p className="wk-banner">{t.gatesKicker.replace('{n}',String(reports.length))}</p><h2 className="wk-logo green wkl-af-pick">{t.gatesTitle}</h2></div>
      <span className="wk-stamp wkl-af-stamp" aria-hidden="true">{drawn}</span>
     </header>
     <section className="af-stories wkl-covers" aria-label="The gates">
      {reports.map(r=><Story key={r.gate} r={r} href={href(r.gate)}/>)}
     </section>
     {fl.open?<Link className="af-league wkl-af-league wk-navyplate" href="/all-football/legends">
      <span className="wk-speed" style={{['--sx' as string]:'12%',['--sy' as string]:'50%'}} aria-hidden="true"/>
      <Emblem size={96} label=""/><span className="af-kicker">The hall of fame edition{fl.preview?' · owner preview':''}</span><b>Legends Manager</b><small>One real club. Only the men who wore its shirt. Draft seventeen legends and build a dynasty.</small><span aria-hidden="true" className="wkl-af-arrow"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></Link>:null}
     <p className="af-note wk-cap">Every question, date and pair here was approved for its own club first. A club joins this page when its gate is open to fans; nothing is invented to fill a round.</p>
    </div>
   </div>
  </main>
 </Shell>
}
const Tick=()=><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l5 5L20 6"/></svg>
function ModeLink({mode,current,title,sub}:{mode:Mode;current:Mode;title:string;sub:string}){
 const q=modeQuery(mode),on=current.kind===mode.kind
 return <Link href={`/all-football${q?`?${q}`:''}`} aria-current={on?'true':undefined} className="wkl-mode"><span className="wkl-mode-tick" aria-hidden="true">{on?<Tick/>:null}</span><span className="wkl-mode-t"><b className="wk-head">{title}</b><small>{sub}</small></span></Link>
}
function Story({r,href}:{r:GateReport;href:string}){
 const s=STORY[r.gate]
 return <article className="af-story wk-cover wkl-cover" data-gate={r.gate} data-closed={!r.playable||undefined}>
  <span className={`wk-cover-art wkl-cover-art ${s.plate}`} aria-hidden="true">
   <span className="wk-speed" style={{['--sx' as string]:'80%',['--sy' as string]:'70%'}}/>
   <Plate art={s.art} ink={s.ink} className="wkl-cover-plate"/>
   <span className="wk-cover-price"><small>Gate</small><b>{s.no}</b></span>
  </span>
  <h2 className="wk-cover-name wkl-cover-name">{s.title}</h2>
  <span className="wk-cover-foot wkl-cover-foot">
   <span className="af-kicker wk-k red">{s.kicker}</span>
   <p>{s.body}</p>
   <span className="wkl-cover-row">
    <span className="af-figure"><b className="wk-num">{r.records.toLocaleString('en-GB')}</b><small className="wk-k wkl-mute">{s.unit} · {r.members.length} clubs</small></span>
    {r.playable?<Link className="af-go wk-btn red" href={href}>Play <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></Link>:<span className="af-go wk-btn paper" aria-disabled="true">{r.reason??'Not ready'}</span>}
   </span>
  </span>
 </article>
}

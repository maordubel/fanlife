import Link from 'next/link'
import {headers} from 'next/headers'
import {redirect} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {FixtureRotator,type RotatorItem} from '@/components/home/FixtureRotator'
import {readState} from '@/lib/master/store'
import Image from 'next/image'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {gameCopy} from '@/lib/clubs/game-copy'
import {hubModel} from '@/lib/home/hub-model'
import {GateChooser} from '@/components/home/MagazineHubControls'
import {lifeEntries} from '@/lib/clubs/life/entry'
import {evaluationMode} from '@/lib/master/mode'
import {uiLocale} from '@/lib/clubs/locale'
import {getFixtureFeed} from '@/lib/fixtures/service'
import {rotationOrder} from '@/lib/fixtures/rotation'
import {livery} from '@/lib/club-livery'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'

const wear=(primary:string)=>({['--club-primary' as string]:primary})

export default async function Home({searchParams}:{searchParams:{lang?:string}}){
 const hc=headers().get('x-fan-life-club')
 if(hc)redirect(hc==='hapoel-tel-aviv'?'/ground':`/clubs/${hc}`)
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en
 const {clubs}=await readState()
 const open=clubs.filter(c=>c.status!=='paused').sort((a,b)=>a.name.localeCompare(b.name))
 const life=await lifeEntries(open,evaluationMode())
 const now=new Date()
 const gc=gameCopy(locale) as Record<string,string>,model=await hubModel(open,locale),chooser={title:copy.chooseClub,search:copy.chooserSearch,close:copy.chooserClose,none:copy.chooserNone,workshop:copy.chooserWorkshop,partial:''}
 const todayModel=model.map(m=>({...m,gates:{...m.gates,'archive-today':{...m.gates.archive!,href:m.gates.archive?.href?`${m.gates.archive.href}&today=1`:null}}}))
 const feed=await getFixtureFeed(now).catch(()=>null)
 const order=feed?rotationOrder(feed.fixtures,now):[]
 const items:RotatorItem[]=order.flatMap(f=>{
  const l=livery(f.clubId)
  if(!l)return []
  return [{clubId:f.clubId,club:l.name,opponent:f.opponent,initials:l.initials,primary:l.primary,pattern:l.pattern,kickoff:f.kickoff,dateOnly:f.dateOnly,clubSide:f.clubSide,competition:f.competition,venue:f.venue,href:`/clubs/${f.clubId}/meetings?vs=${encodeURIComponent(f.opponent)}&lang=${locale}`,tag:f.phase}]
 })
 const first=items[0]
 const date=new Intl.DateTimeFormat(locale,{dateStyle:'full',timeZone:'UTC'}).format(now)
 const stop=first?<div className="mag-stop-in"><b>{copy.stopPress}</b><span>{first.club} {copy.vs} {first.opponent}</span></div>:undefined
 const rotatorCopy={next:copy.nextUp,cta:copy.nextCta,home:copy.homeSide,away:copy.awaySide,vs:copy.vs,pause:copy.pause,play:copy.resume,live:copy.tagLive,today:copy.tagToday,soon:copy.tagSoon,later:copy.tagLater}
 return <Shell locale={locale} stop={stop}><main id="main">
  <section className="mag-cover mag-cover-poster" aria-labelledby="cover-h"><div className="mag-cover-in">
   <div className="mag-dateline"><span>{copy.coverIssue}</span><span><span className="mag-date-long">{date} · </span>{copy.coverNo}</span></div>
   <h1 className="mag-masthead" id="cover-h" dir="ltr"><span>FAN</span><span>LIFE</span></h1>
   <Image className="mag-collage" src="/brand/magazine/football-cover-collage.png" alt="" width={1254} height={1254} priority unoptimized/>
   <span className="mag-burst mag-gates-burst" aria-hidden="true"><b>{SHARED_GATES.length}</b>{copy.gates}<br/>{copy.coverStamp}</span>
   <div className="mag-rail">
    <GateChooser gate="xi" clubs={model} copy={chooser} className="mag-tease mag-tease-a"><b>{copy.teaseXiK}</b><small>{copy.teaseXi}</small></GateChooser>
    <GateChooser gate="trivia" clubs={model} copy={chooser} className="mag-tease mag-tease-b"><b>{copy.teaseQuizK}</b><small>{copy.teaseQuiz}</small></GateChooser>
   </div>
   <p className="mag-cover-bottom">{copy.coverBottom}</p>
   <p className="mag-plus"><b>{copy.plusK}</b><span>{copy.plus1}<br/>{copy.plus2}</span></p>
  </div></section>
  <nav className="mag-hubnav" aria-label={copy.primaryNav}><a href="#clubs">{copy.navClubs}</a><a href="#gates">{copy.navPlay}</a><a href="#archive">{copy.navArchive}</a></nav>
  <section className="mag-section" aria-labelledby="toc-h"><div className="mag-inside mag-toc"><p className="mag-mono" id="toc-h">{copy.tocTitle}</p><ol>{(['toc1','toc2','toc3','toc4'] as const).map((k,i)=><li key={k}><a href={['#clubs','#gates','#archive','#life-entry'][i]}><i>{String(i+1).padStart(2,'0')}</i>{copy[k]}</a></li>)}</ol></div></section>

  {/* No confirmed fixture, no section: an empty box on the front page tells a fan nothing (audit 7.10.2026). */}
  {items.length>0&&<section className="mag-section" id="next">
   <hr className="mag-rule"/>
   <div className="mag-head"><div><p className="mag-kicker">{copy.tabNext}</p><h2 className="mag-h2">{copy.nextUp}</h2></div><p className="mag-fine">{copy.nextNote}</p></div>
   <FixtureRotator items={items} copy={rotatorCopy} locale={locale}/>
  </section>}

  <section className="mag-section mag-editorial" id="clubs">
   <hr className="mag-rule"/>
   <div className="mag-head"><div><p className="mag-kicker">{copy.clubs}</p><h2 className="mag-h2">{copy.pickClub}</h2></div></div>
   <div className="mag-tiles">{open.map((c,n)=>{
    const l=livery(c.id),entry=life[c.id]
    return <div key={c.id}>
     <Link className="mag-tile" data-club={c.id} href={`/clubs/${c.id}?lang=${locale}`} style={l?wear(l.primary):undefined}>
      <span className="no" aria-label={`${copy.collectorNo} ${n+1}`}>{String(n+1).padStart(2,'0')}</span>
      {l&&<span className="mag-badge" data-livery={l.pattern} aria-hidden="true">{l.initials}</span>}
      <span><b>{c.name}</b><small>{c.city}</small></span>
     </Link>
     {entry?.href&&<Link className="mag-tile-life" href={entry.href}>{copy.lifeStrip}<span>{copy.lifeIn} →</span></Link>}
    </div>})}</div>
  </section>

  <section className="mag-section mag-editorial" id="gates">
   <hr className="mag-rule"/>
   <div className="mag-head"><div><p className="mag-kicker">{copy.gates}</p><h2 className="mag-h2">{copy.gatesTitle}</h2></div><p className="mag-fine">{copy.gatesNote}</p></div>
   <div className="mag-contents mag-contents-grid">{SHARED_GATES.map(g=><GateChooser key={g.key} gate={g.key} clubs={model} copy={chooser} className={`mag-row mag-gate mag-gate-${g.key}`}><em>{String(g.number).padStart(2,'0')}</em><span>{gc[`gate.${g.key}`]}<small>{g.key==='archive'?copy.archiveToday:copy.chooseClub}</small></span><span className="lead" aria-hidden="true"/><s>→</s></GateChooser>)}</div>
  </section>

  <section className="mag-section" id="archive"><hr className="mag-rule"/>
   <div className="mag-head"><div><p className="mag-kicker">{copy.toc3}</p><h2 className="mag-h2">{copy.archiveTitle}</h2></div></div>
   <div className="mag-tiles mag-two"><GateChooser gate="archive" clubs={model} copy={chooser} className="mag-card-cta"><b>{copy.archiveOpen}</b><small>{copy.chooseClub}</small></GateChooser>
   <GateChooser gate="archive-today" clubs={todayModel} copy={chooser} className="mag-card-cta ink"><b>{copy.archiveToday}</b><small>{copy.chooseClub}</small></GateChooser></div></section>
  <section className="mag-section" id="life-entry"><hr className="mag-rule"/>
   <div className="mag-head"><div><p className="mag-kicker">{copy.toc4}</p><h2 className="mag-h2">{copy.lifeEntryTitle}</h2></div><p className="mag-fine">{copy.lifeEntryNote}</p></div>
   <GateChooser gate="life" clubs={model} life={Object.fromEntries(open.map(c=>[c.id,life[c.id]?.href??null]))} copy={chooser} className="mag-card-cta navy"><b>{copy.lifeEntryCta}</b><small>{copy.toc4}</small></GateChooser></section>
  <section className="mag-section"><div className="mag-letter"><p className="mag-kicker" style={{color:'var(--mag-salmon)'}}>{copy.letterKicker}</p><p className="dropcap">{copy.letterBody}</p><p className="mag-sign">{copy.editor}</p></div></section>
  <section className="mag-section"><div className="mag-ps"><p className="mag-kicker">{copy.psKicker}</p><p>{copy.psBody}</p></div></section>
 </main></Shell>}

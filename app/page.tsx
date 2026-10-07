import Link from 'next/link'
import {headers} from 'next/headers'
import {redirect} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {Dye} from '@/components/master/Dye'
import {TornBlocks,PressPhoto} from '@/components/master/Poster'
import {FixtureRotator,type RotatorItem} from '@/components/home/FixtureRotator'
import {readState} from '@/lib/master/store'
import Image from 'next/image'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {hubModel} from '@/lib/home/hub-model'
import {GateChooser} from '@/components/home/MagazineHubControls'
import {lifeEntries} from '@/lib/clubs/life/entry'
import {evaluationMode} from '@/lib/master/mode'
import {uiLocale} from '@/lib/clubs/locale'
import {getFixtureFeed} from '@/lib/fixtures/service'
import {rotationOrder} from '@/lib/fixtures/rotation'
import {livery,wearLivery} from '@/lib/club-livery'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'


export default async function Home({searchParams}:{searchParams:{lang?:string}}){
 const hc=headers().get('x-fan-life-club')
 if(hc)redirect(hc==='hapoel-tel-aviv'?'/ground':`/clubs/${hc}`)
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en
 const {clubs}=await readState()
 const open=clubs.filter(c=>c.status!=='paused').sort((a,b)=>a.name.localeCompare(b.name))
 const life=await lifeEntries(open,evaluationMode())
 const now=new Date()
 const model=await hubModel(open,locale),chooser={title:copy.chooseClub,search:copy.chooserSearch,close:copy.chooserClose,none:copy.chooserNone,workshop:copy.chooserWorkshop,partial:''}
 const feed=await getFixtureFeed(now).catch(()=>null)
 const order=feed?rotationOrder(feed.fixtures,now):[]
 const items:RotatorItem[]=order.flatMap(f=>{
  const l=livery(f.clubId)
  if(!l)return []
  return [{clubId:f.clubId,club:l.name,opponent:f.opponent,initials:l.initials,primary:l.primary,on:l.on,type:l.type,pattern:l.pattern,kickoff:f.kickoff,dateOnly:f.dateOnly,clubSide:f.clubSide,competition:f.competition,venue:f.venue,href:`/clubs/${f.clubId}/meetings?vs=${encodeURIComponent(f.opponent)}&lang=${locale}`,tag:f.phase}]
 })
 // every club is on the roll (owner, 7.10.2026): a club with no confirmed match says so, nothing is guessed
 for(const c of open)if(!items.some(x=>x.clubId===c.id)){const l=livery(c.id);if(l)items.push({clubId:c.id,club:l.name,opponent:'',initials:l.initials,primary:l.primary,on:l.on,type:l.type,pattern:l.pattern,kickoff:'',dateOnly:true,clubSide:'home',competition:null,venue:null,href:`/clubs/${c.id}?lang=${locale}`,tag:'tbc'})}
 const first=items.find(x=>x.tag!=='tbc')
 const date=new Intl.DateTimeFormat(locale,{dateStyle:'full',timeZone:'UTC'}).format(now)
 const stop=first?<div className="mag-stop-in"><b>{copy.stopPress}</b><span>{first.club} {copy.vs} {first.opponent}</span></div>:undefined
 const rotatorCopy={next:copy.nextUp,cta:copy.nextCta,home:copy.homeSide,away:copy.awaySide,vs:copy.vs,pause:copy.pause,play:copy.resume,live:copy.tagLive,today:copy.tagToday,soon:copy.tagSoon,later:copy.tagLater,tbc:copy.tagTbc,tbcLine:copy.tbcLine,tbcCta:copy.tbcCta,of:copy.nextMore,prev:copy.nextPrev,fwd:copy.nextNext}
 return <Shell locale={locale} stop={stop}><main id="main">
  <section className="mag-cover mag-cover-poster" aria-labelledby="cover-h"><div className="mag-cover-in">
   <div className="mag-dateline"><span>{copy.coverIssue}</span><span><span className="mag-date-long">{date} · </span>{copy.coverNo}</span></div>
   <h1 className="mag-masthead" id="cover-h" dir="ltr"><span>FAN</span><span>LIFE</span></h1>
   <Image className="mag-cover-seal" src="/brand/fanlife/logo-192.png" alt="" width={192} height={192} priority unoptimized/>
   <Image className="mag-collage" src="/brand/magazine/football-cover-collage.png" alt="" width={1254} height={1254} priority unoptimized/>
   <span className="mag-burst mag-gates-burst" aria-hidden="true"><b>{SHARED_GATES.length}</b>{copy.gates}<br/>{copy.coverStamp}</span>
   <div className="mag-rail">
    <GateChooser gate="xi" clubs={model} copy={chooser} className="mag-tease mag-tease-a"><b>{copy.teaseXiK}</b><small>{copy.teaseXi}</small></GateChooser>
    <GateChooser gate="trivia" clubs={model} copy={chooser} className="mag-tease mag-tease-b"><b>{copy.teaseQuizK}</b><small>{copy.teaseQuiz}</small></GateChooser>
   </div>
   <p className="mag-cover-bottom">{copy.coverBottom}</p>
   <p className="mag-plus"><b>{copy.plusK}</b><span>{copy.plus1}<br/>{copy.plus2}</span></p>
  </div></section>
  <nav className="mag-hubnav" aria-label={copy.primaryNav}><a href="#life">{copy.navLife}</a><a href="#next">{copy.navNext}</a><a href="#clubs">{copy.navClubs}</a><a href="#been">{copy.navBeen}</a></nav>

  {/* THE GAME: the app's central feature, right under the cover (owner, 7.10.2026 — "the hub first, but this is the heart"). */}
  <section className="mag-section mag-game-band" id="life" aria-labelledby="life-h">
   <div className="mag-game-art" aria-hidden="true"><TornBlocks seed="life" inks={['var(--mag-green)','var(--mag-navy)','var(--mag-vermilion)']}/><PressPhoto art="father-son" className="mag-game-photo"/></div>
   <div className="mag-game-text">
    <p className="mag-kicker">{copy.lifeEntryTitle}</p>
    <h2 className="mag-game-title" id="life-h"><span className="mag-game-stamp">{copy.lifeGame}</span><span dir="ltr">LIFE</span></h2>
    <p>{copy.lifeEntryNote}</p>
    <GateChooser gate="life" clubs={model} life={Object.fromEntries(open.map(c=>[c.id,life[c.id]?.href??null]))} copy={chooser} className="mag-cta red">{copy.lifeEntryCta} →</GateChooser>
   </div>
  </section>

  {items.length>0&&<section className="mag-section mag-next-section" id="next" aria-labelledby="next-h">
   <h2 className="mag-kicker" id="next-h">{copy.nextUp}</h2>
   <FixtureRotator items={items} copy={rotatorCopy} locale={locale}/>
  </section>}

  {/* The clubs, with the editor's letter as a side column — the old football weekly's "from the editor" box (owner, 7.10.2026). */}
  <section className="mag-section mag-editorial mag-clubsrow" id="clubs">
   <div className="mag-clubsmain">
    <hr className="mag-rule"/>
    <div className="mag-head"><div><p className="mag-kicker">{copy.clubs}</p><h2 className="mag-h2">{copy.pickClub}</h2></div></div>
    <div className="mag-tiles">{open.map((c,n)=>{
     const l=livery(c.id),entry=life[c.id]
     return <div key={c.id}>
      <Link className="mag-tile" data-club={c.id} href={`/clubs/${c.id}?lang=${locale}`} style={wearLivery(l)}>
       <span className="no" aria-label={`${copy.collectorNo} ${n+1}`}>{String(n+1).padStart(2,'0')}</span>
       {l&&<span className="mag-badge" data-livery={l.pattern} aria-hidden="true">{l.initials}</span>}
       <span><b>{c.name}</b><small>{c.city}</small></span>{l&&<Dye art="shirt" soft className="mag-tile-shirt"/>}
      </Link>
      {entry?.href&&<Link className="mag-tile-life" href={entry.href}>{copy.lifeStrip}<span>{copy.lifeIn} →</span></Link>}
     </div>})}</div>
   </div>
   <aside className="mag-editor" aria-labelledby="editor-h">
    <p className="mag-editor-stamp" aria-hidden="true">{copy.letterStamp}</p>
    <p className="mag-kicker">{copy.letterKicker}</p>
    <div className="mag-editor-photo"><PressPhoto art="fan-fist"/></div>
    <h2 id="editor-h">{copy.letterTitle}</h2>
    <p className="dropcap">{copy.letterBody}</p>
    <p className="mag-editor-more">{copy.letterBody2}</p>
    <p className="mag-editor-more">{copy.letterBody3}</p>
    <p className="mag-sign">{copy.editor}</p>
   </aside>
  </section>

  <section className="mag-section mag-feature mag-feature-been" id="been" aria-labelledby="been-h">
   <div className="mag-feature-art" aria-hidden="true"><TornBlocks seed="been" inks={['var(--mag-navy)','var(--mag-salmon)']}/><PressPhoto art="fans-group" className="mag-feature-main"/><PressPhoto art="memorabilia" className="mag-feature-side"/></div>
   <div className="mag-feature-text"><p className="mag-kicker">{copy.beenKicker}</p><h2 className="mag-h2" id="been-h">{copy.beenTitle}</h2><p>{copy.beenBody}</p>
    <div className="mag-feature-ctas"><Link className="mag-cta red" href="/me/file#been">{copy.beenCta} →</Link><GateChooser gate="archive" clubs={model} copy={chooser} className="mag-cta ghost">{copy.beenPick}</GateChooser></div></div>
  </section>

  {/* A poster band after Maor's matchday posters: two players swap shirts on torn blocks of colour. Desktop only —
      on a phone it was one more long screen with nothing new to do. */}
  <section className="mag-section mag-posterband mag-desk-only" aria-labelledby="swap-h">
   <div className="mag-posterband-in"><p className="mag-kicker">{copy.swapKicker}</p><h2 className="mag-h2" id="swap-h">{copy.swapTitle}</h2><p>{copy.swapBody}</p><a className="mag-cta red" href="#clubs">{copy.chooseClub} →</a></div>
   <div className="mag-homestage mag-swapstage" aria-hidden="true"><TornBlocks seed="swap" inks={['var(--mag-green)','var(--mag-vermilion)','var(--mag-navy)']}/><PressPhoto art="shirt-swap" className="mag-swap"/></div>
  </section>
 </main></Shell>}

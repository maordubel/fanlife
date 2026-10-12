import Link from 'next/link'
import {headers} from 'next/headers'
import {redirect} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {Dye} from '@/components/master/Dye'
import {TornBlocks,PressPhoto} from '@/components/master/Poster'
import {Suspense} from 'react'
import {HubStop,HubNextUp,HubNextUpWaiting} from '@/components/home/HubFixtures'
import {readState} from '@/lib/master/store'
import Image from 'next/image'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {hubModels} from '@/lib/home/hub-model'
import {lifeEntries} from '@/lib/clubs/life/entry'
import {GateChooser} from '@/components/home/MagazineHubControls'
import {evaluationMode} from '@/lib/master/mode'
import {uiLocale} from '@/lib/clubs/locale'
import {livery,wearLivery} from '@/lib/club-livery'
import {clubWorld} from '@/lib/clubs/world'
import {BackToClub} from '@/components/clubs/BackToClub'
import {WorkshopGrid} from '@/components/home/WorkshopGrid'
import {HubDock} from '@/components/home/HubDock'
import {isOpenClub} from '@/lib/home/hub-open'
import {seedVotes,rank} from '@/lib/home/vote'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
import { Badge } from '@/components/clubs/Badge'
import {door} from '@/lib/features-server'
export const dynamic='force-dynamic'


export default async function Home({searchParams}:{searchParams:{lang?:string}}){
 const hc=headers().get('x-fan-life-club')
 if(hc)redirect(hc==='hapoel-tel-aviv'?'/ground':`/clubs/${hc}`)
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en
 const {clubs}=await readState()
 const open=clubs.filter(c=>c.status!=='paused').sort((a,b)=>a.name.localeCompare(b.name))
  const nick=(id:string)=>clubWorld(id)?.nicknames[0]?.text
 const now=new Date(),preview=evaluationMode()
 // one pass for both readings, and the LIFE doors alongside it (performance audit, 11.10.2026)
 const [{model,strict},life,af,fl]=await Promise.all([hubModels(open,locale),lifeEntries(open,preview),door('allFootball'),door('fanLeague')])
 const isOpen=(id:string)=>isOpenClub(strict.find(x=>x.id===id))
 const live=open.filter(c=>isOpen(c.id)),shop=open.filter(c=>!isOpen(c.id))
 const seed=seedVotes(shop.map(c=>c.id)),order2=rank(seed,shop.map(c=>c.id))
 const shopClubs=order2.map(id=>{const c=shop.find(x=>x.id===id)!,l=livery(id);return {id,name:c.name,city:c.city,initials:l?.initials??c.initials,pattern:l?.pattern??'',seed:seed[id]??0,href:preview?`/clubs/${id}?lang=${locale}`:null}})
 const chooser={title:copy.chooseClub,search:copy.chooserSearch,close:copy.chooserClose,none:copy.chooserNone,workshop:copy.chooserWorkshop,partial:''}
 const date=new Intl.DateTimeFormat(locale,{dateStyle:'full',timeZone:'UTC'}).format(now)
 // the provider never holds the first byte: the strip and the match card stream in when the feed answers
 const stop=<Suspense fallback={null}><HubStop open={open} locale={locale} stopPress={copy.stopPress} vs={copy.vs} none={preview?<div className="mag-stop-in"><b>{copy.stopPress}</b><span>{copy.evaluation} · {copy.evaluationNote}</span></div>:null}/></Suspense>
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
  <nav className="mag-hubnav" aria-label={copy.primaryNav}><a href="#life">{copy.navLife}</a><a href="#next">{copy.navNext}</a><a href="#clubs">{copy.navClubs}</a><a href="#market">{copy.navMarket}</a></nav>
  <HubDock clubs={open.map(c=>({id:c.id,name:c.name}))} openIds={live.map(c=>c.id)} locale={locale} copy={{title:copy.dockTitle,cont:copy.dockContinue,rounds:copy.dockRounds,file:copy.dockFile,stand:copy.dockStand,market:copy.dockMarket,sources:copy.dockSources,voted:copy.dockVoted,vote:copy.dockVote}}/>

  {/* THE GAME: the app's central feature, right under the cover (owner, 7.10.2026 — "the hub first, but this is the heart"). */}
  <section className="mag-section mag-game-band" id="life" aria-labelledby="life-h">
   <div className="mag-game-art" aria-hidden="true"><TornBlocks seed="life" inks={['var(--mag-green)','var(--mag-navy)','var(--mag-vermilion)']}/><PressPhoto art="father-son" className="mag-game-photo"/></div>
   <div className="mag-game-text">
    <p className="mag-kicker">{copy.lifeEntryTitle}</p>
    <h2 className="mag-game-title" id="life-h"><span dir="ltr">LIFE</span><span className="mag-game-stamp">{copy.lifeGameSub}</span></h2>
    <p>{copy.lifeEntryNote}</p>
    <GateChooser gate="life" clubs={model} life={Object.fromEntries(open.map(c=>[c.id,life[c.id]?.href??null]))} copy={chooser} className="mag-cta red">{copy.lifeEntryCta} →</GateChooser>
   </div>
  </section>

  <Suspense fallback={<HubNextUpWaiting title={copy.nextUp}/>}><HubNextUp open={open} locale={locale} copy={rotatorCopy} title={copy.nextUp}/></Suspense>

  {/* The clubs, with the editor's letter as a side column — the old football weekly's "from the editor" box (owner, 7.10.2026). */}
  <section className="mag-section mag-editorial mag-clubsrow" id="clubs">
   <div className="mag-clubsmain">
    <hr className="mag-rule"/>
    <div className="mag-head"><div><p className="mag-kicker">{copy.clubs}</p><h2 className="mag-h2">{copy.pickClub}</h2></div><BackToClub clubs={open.map(c=>({id:c.id,name:c.name}))} locale={locale} label={copy.backTo}/></div>
    <div className="mag-tiles mag-tiles-hub">
     {af.open&&<Link className="mag-tile is-open is-wide af-tile" href="/all-football" data-preview={af.preview||undefined}><span className="no" aria-hidden="true">∞</span><span><b>ALL FOOTBALL</b><small>Every club’s history in one room{af.preview?' · owner preview':''}</small></span><span className="mag-tile-state">Open</span></Link>}
     {fl.open&&<Link className="mag-tile is-open is-wide af-tile" href="/all-football/legends" data-preview={fl.preview||undefined}><span className="no" aria-hidden="true">LM</span><span><b>LEGENDS MANAGER</b><small>Draft one club’s immortals and build a dynasty, season after season{fl.preview?' · owner preview':''}</small></span><span className="mag-tile-state">Open</span></Link>}
     {live.map((c,n)=>{
      const l=livery(c.id)
      return <Link key={c.id} className={`mag-tile is-open${live.length%2===1&&n===live.length-1?' is-wide':''}`} data-club={c.id} href={`/clubs/${c.id}?lang=${locale}`} style={wearLivery(l)}>
       <span className="no" aria-label={`${copy.collectorNo} ${n+1}`}>{String(n+1).padStart(2,'0')}</span>
       {l&&<Badge club={l}/>}
       <span><b>{c.name}</b><small>{c.city}{nick(c.id)?` · ${nick(c.id)}`:''}</small></span>{l&&<Dye art="shirt" soft className="mag-tile-shirt"/>}
       <span className="mag-tile-state">{copy.tileOpen}</span>
      </Link>})}
     {shop.length>0&&<WorkshopGrid clubs={shopClubs} copy={{kicker:copy.hubWorkshopKicker,count:copy.voteCount,demo:copy.voteDemo,vote:copy.voteCta,voted:copy.voteVoted,leading:copy.tileLeading,preview:copy.tilePreview,shop:copy.tileWorkshop,more:copy.tileMore,less:copy.tileLess}}/>}
    </div>
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

  {/* THE MARKET: the shirt swap is the market's mark, repeated here, on the market page and at its door (owner, 9.10.2026). */}
  <section className="mag-section mag-market-band" id="market" aria-labelledby="market-h">
   <div className="mag-market-text">
    <p className="mag-kicker">{copy.marketKicker}</p>
    <h2 className="mag-market-title" id="market-h">{copy.marketTitle}</h2>
    <p>{copy.marketBody}</p>
    <ul className="mag-market-points"><li>{copy.marketPoint1}</li><li>{copy.marketPoint2}</li><li>{copy.marketPoint3}</li></ul>
    <div className="mag-feature-ctas"><Link className="mag-cta red" href="/market">{copy.marketCta} →</Link><Link className="mag-cta ghost" href="/market?view=wanted">{copy.marketWanted}</Link></div>
   </div>
   <div className="mag-market-art" aria-hidden="true"><TornBlocks seed="market" inks={['var(--mag-vermilion)','var(--mag-navy)','var(--mag-green)']}/><PressPhoto art="shirt-swap" className="mag-swap"/></div>
  </section>
 </main></Shell>}

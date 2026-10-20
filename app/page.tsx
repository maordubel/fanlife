import Link from 'next/link'
import {headers} from 'next/headers'
import {redirect} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {Plate} from '@/components/weekly/Plate'
import {Suspense} from 'react'
import {HubStop,HubNextUp,HubNextUpWaiting} from '@/components/home/HubFixtures'
import {readState} from '@/lib/master/store'
import Image from 'next/image'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {hubModels} from '@/lib/home/hub-model'
import {buildEdition,clubDay} from '@/lib/terrace/edition'
import {lifeEntries} from '@/lib/clubs/life/entry'
import {GateChooser} from '@/components/home/MagazineHubControls'
import {evaluationMode} from '@/lib/master/mode'
import {uiLocale} from '@/lib/clubs/locale'
import {livery,wearLivery} from '@/lib/club-livery'
import {clubWorld} from '@/lib/clubs/world'
import {BackToClub} from '@/components/clubs/BackToClub'
import {WorkshopGrid} from '@/components/home/WorkshopGrid'
import {SuggestClub} from '@/components/home/SuggestClub'
import {HubDock} from '@/components/home/HubDock'
import {TileStreak} from '@/components/home/TileStreak'
import {HubHero} from '@/components/home/HubHero'
import {loadClubBase} from '@/lib/clubs/resolver'
import {momentFor} from '@/lib/clubs/today'
import {isOpenClub} from '@/lib/home/hub-open'
import {seedVotes,rank} from '@/lib/home/vote'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
import { Badge } from '@/components/clubs/Badge'
import {Emblem} from '@/components/legends/Brand'
import {door} from '@/lib/features-server'
export const dynamic='force-dynamic'

const Arrow=()=><svg className="wkh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>

/**
 * THE FRONT PAGE (rule 124 · boards Hub-M / Hub-D). The hub is this week's issue of the weekly: the masthead with a fan
 * breaking the frame, the cover and its two teasers, "Inside this issue", the Top Teams sticker page, the coupon of
 * everybody's next match, LIFE, the special editions, the ballot, the shirt market, the editor's letter and the back pages.
 * The phone reads it top to bottom; the desktop lays the same sections out as a spread (CSS grid areas, app/weekly/hub.css).
 * Nothing scrolls sideways. All inks are allowed here — the hub has no rival.
 */
export default async function Home({searchParams}:{searchParams:{lang?:string}}){
 const hc=headers().get('x-fan-life-club')
 if(hc)redirect(hc==='hapoel-tel-aviv'?'/ground':`/clubs/${hc}`)
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en
 const {clubs}=await readState()
 const open=clubs.filter(c=>c.status!=='paused').sort((a,b)=>a.name.localeCompare(b.name))
  const nick=(id:string)=>clubWorld(id)?.nicknames[0]?.text
 const now=new Date(),preview=evaluationMode()
 // one pass for both readings, and the LIFE doors alongside it (performance audit, 11.10.2026)
 const [{model,strict},life,fl]=await Promise.all([hubModels(open,locale),lifeEntries(open,preview),door('fanLeague')])
 const isOpen=(id:string)=>isOpenClub(strict.find(x=>x.id===id))
 const live=open.filter(c=>isOpen(c.id)),shop=open.filter(c=>!isOpen(c.id))
 const seed=seedVotes(shop.map(c=>c.id)),order2=rank(seed,shop.map(c=>c.id))
 const shopClubs=order2.map(id=>{const c=shop.find(x=>x.id===id)!,l=livery(id);return {id,name:c.name,city:c.city,initials:l?.initials??c.initials,pattern:l?.pattern??'',seed:seed[id]??0,href:preview?`/clubs/${id}?lang=${locale}`:null}})
 const chooser={title:copy.chooseClub,search:copy.chooserSearch,close:copy.chooserClose,none:copy.chooserNone,workshop:copy.chooserWorkshop,partial:''}
 // English reads day-month-year (rule 94.5)
 const date=new Intl.DateTimeFormat(locale==='en'?'en-GB':locale,{dateStyle:'full',timeZone:'UTC'}).format(now),iso=now.toISOString().slice(0,10)
 // the provider never holds the first byte: the strip and the match card stream in when the feed answers
 const stop=<Suspense fallback={null}><HubStop open={open} locale={locale} stopPress={copy.stopPress} vs={copy.vs} last={copy.stopLast} next={copy.stopNext} none={preview?<div className="mag-stop-in"><b>{copy.stopPress}</b><span>{copy.evaluation} · {copy.evaluationNote}</span></div>:null}/></Suspense>
 const couponCopy={kicker:copy.wkhInNext,coupon:copy.wkhCoupon,cols:copy.wkhCouponCols,all:copy.wkhNextAll,note:copy.nextNote,home:copy.homeSide,away:copy.awaySide,vs:copy.vs,live:copy.tagLive,today:copy.tagToday,soon:copy.tagSoon,later:copy.tagLater,tbc:copy.tagTbc,tbcLamp:copy.wkhTbc,close:copy.chooserClose}
 const dockCopy={title:copy.dockTitle,kept:copy.wkhKept,cont:copy.dockContinue,rounds:copy.dockRounds,file:copy.dockFile,fileSub:copy.wkFileSub,stand:copy.dockStand,standSub:copy.wkhStandSub,market:copy.dockMarket,marketSub:copy.wkMarketSub,sources:copy.dockSources,sourcesSub:copy.wkSourcesSub,voted:copy.dockVoted,vote:copy.dockVote,voteSub:copy.wkhVoteSub}
 const heroClubs=await Promise.all(live.map(async c=>{const base=await loadClubBase(c.id).catch(()=>null);const m=base?momentFor(base.data,now):null;const daily=!!base&&base.data.gates.trivia.playable&&buildEdition(base.data,clubDay(base.data.identity.country,now))!==null;return {id:c.id,name:c.name,city:c.city,daily,otd:m&&m.offset===0?{title:m.title,years:m.yearsAgo}:null}}))
 const heroCopy={kicker:copy.wkhHeroK,cont:copy.dockContinue,contSub:copy.wkhHeroSub,newK:copy.wkhHeroNewK,newT:copy.wkhHeroNewT,otd:copy.todayExact,play:copy.wkhHeroDaily}
 const dockClubs=open.map(c=>({id:c.id,name:c.name})),dockOpen=live.map(c=>c.id)
 const inside=[
  {href:'#clubs',title:copy.clubs,sub:copy.wkhInClubs.replace('{n}',String(live.length)),go:'↓'},
  {href:'#next',title:copy.navNext,sub:copy.wkhInNext,go:'↓'},
  {href:'#life',title:copy.navLife,sub:`${copy.lifeEntryTitle} · ${copy.lifeGameSub}`,go:'↓'},
  {href:'#market',title:copy.navMarket,sub:copy.marketTitle,go:'↓'},
 ]
 return <Shell locale={locale} stop={stop}><main id="main" className="wkh">

  {/* THE MASTHEAD: the paper's name on a green plate, a supporter breaking the frame (board Hub-M / Hub-D). */}
  <header className="wkh-mast">
   <div className="wkh-mast-line"><p className="wk-banner wkh-green">{copy.coverIssue}</p><time className="wk-k wkh-date-d" dateTime={iso}>{date}</time><span className="wk-k">{copy.coverNo}</span></div>
   <div className="wkh-mast-plate wk-greenplate">
    <Plate art="cheer" ink="red" className="wkh-mast-fig"/>
    <Plate art="fans" ink="orange" className="wkh-mast-crowd"/>
    <h1 className="wk-logo wkh-mast-logo" dir="ltr"><span>Fan</span> <span>Life</span></h1>
    <span className="wk-roundel wkh-mast-no" aria-hidden="true"><span className="wk-k">{copy.wkhNo}</span><b className="wk-num">{copy.wkhIssueNo}</b><span className="wk-k">{copy.wkhFree}</span></span>
   </div>
   <p className="wk-k wkh-mast-tag">{copy.wkhForever}<span className="wkh-d-only"> · {copy.tagline}</span></p>
   <time className="wk-k wk-muted wkh-date-m" dateTime={iso}>{date}</time>
  </header>

  {/* THE FIRST SCREEN (H1): a new fan sees the crests and taps one; a returning fan continues where they were. */}
  <HubHero clubs={heroClubs} lang={locale==='en'?'':`?lang=${locale}`} copy={heroCopy} crests={<ul className="wkh-hero-crests">{live.map(c=>{const l=livery(c.id);return <li key={c.id}><Link className="wkh-hero-crest min-h-tap" href={`/clubs/${c.id}?lang=${locale}`} style={wearLivery(l)}><span className="wkh-disc">{l&&<Badge club={l}/>}</span><b>{c.name}</b></Link></li>})}</ul>}/>

  {/* THE MANAGER: LEGENDS MANAGER leads the page, above the gates (owner, 14.10.2026). */}
  {fl.open&&<section className="wkh-lm" aria-label={copy.wkhLmTitle}>
   <Link className="wkh-sp wkh-sp-lm wk-navyplate" href="/all-football/legends" data-preview={fl.preview||undefined}>
    <Emblem size={76} label="" className="wkh-sp-emblem"/>
    <span className="wkh-sp-t"><span className="wk-k">{copy.wkhLmK}</span><b>{copy.wkhLmTitle}</b><small>{copy.wkhLmSub}{fl.preview?` · ${copy.wkhOwnerPreview}`:''}</small></span><Arrow/>
   </Link>
  </section>}

  {/* THE COVER: orange plate, speed lines, the kicker, the two teasers that open a club chooser. */}
  <section className="wkh-cover wk-panel wk-orangeplate" aria-labelledby="cover-h">
   <span className="wk-speed wkh-cover-speed" aria-hidden="true"/>
   <span className="wk-flash wkh-cover-flash" aria-hidden="true"/>
   <Plate art="kicker" ink="green" className="wkh-cover-fig"/>
   <div className="wkh-cover-head">
    <p className="wk-banner">{copy.wkhInside.replace('{gates}',String(SHARED_GATES.length)).replace('{clubs}',String(live.length))}</p>
    <h2 className="wk-head white wkh-cover-title" id="cover-h">{copy.coverBottom.split(/(?<=\.)\s+/).map((l,i)=><span key={i}>{l} </span>)}</h2>
   </div>
   <span className="wk-burst yellow wkh-cover-burst" aria-hidden="true"><span><b className="wk-num">{SHARED_GATES.length}</b><span className="wk-head">{copy.gates}<br/>{copy.coverStamp}</span></span></span>
   <div className="wkh-teasers">
    <GateChooser gate="xi" clubs={model} copy={chooser} className="wkh-teaser"><b>{copy.teaseXiK}</b><small>{copy.teaseXi}</small></GateChooser>
    <GateChooser gate="trivia" clubs={model} copy={chooser} className="wkh-teaser"><b>{copy.teaseQuizK}</b><small>{copy.teaseQuiz}</small></GateChooser>
   </div>
   <p className="wkh-plus"><span className="wk-tag red">{copy.plusK}</span><span className="wk-k white wkh-plus-t"><span>{copy.plus1}</span><span className="wkh-plus-sep"> · </span><span>{copy.plus2}</span></span><Image className="wkh-seal" src="/brand/fanlife/logo-192.png" alt="" width={192} height={192} priority unoptimized/></p>
  </section>

  {/* THE GAME: LIFE, the app's central feature (owner, 7.10.2026). */}
  <section className="wkh-life" id="life" aria-labelledby="life-h">
   <div className="wkh-life-card wk-panel">
    <span className="wkh-life-art wk-orangeplate" aria-hidden="true"><span className="wk-speed"/><Plate art="fatherson" ink="navy"/></span>
    <div className="wkh-life-txt">
     <p className="wk-k wkh-orange">{copy.lifeEntryTitle} · {copy.lifeGameSub}</p>
     <h2 className="wk-shout wkh-life-shout" id="life-h" dir="ltr">{copy.wkhLifeShout}</h2>
     <p className="wk-small">{copy.lifeEntryNote}</p>
     <GateChooser gate="life" clubs={model} life={Object.fromEntries(open.map(c=>[c.id,life[c.id]?.href??null]))} copy={chooser} className="wkh-life-cta">{copy.lifeEntryCta} <Arrow/></GateChooser>
    </div>
   </div>
  </section>

  {/* THE MARKET, compact: one line, one button (owner, 14.10.2026). */}
  <section className="wkh-market wkh-market-mini wk-redplate" id="market" aria-labelledby="market-h">
   <span className="wk-speed wkh-market-speed" aria-hidden="true"/>
   <Plate art="swap" ink="red" className="wkh-market-art"/>
   <div className="wkh-market-txt">
    <p className="wk-k white">{copy.marketKicker}</p>
    <h2 className="wk-logo wkh-market-title" id="market-h">{copy.marketTitle}</h2>
   </div>
   <div className="wkh-market-ctas"><Link className="wk-btn paper" href="/market">{copy.marketCta} <Arrow/></Link></div>
  </section>

  {/* INSIDE THIS ISSUE: four cells on a phone, the contents column on a desktop. Never a sideways strip. */}
  <nav className="wkh-inside" aria-label={copy.insideTitle}>
   <p className="wk-banner wkh-inside-k">{copy.insideTitle}</p>
   <ol>{inside.map((x,i)=><li key={x.href}><a href={x.href} className="min-h-tap"><span className="no wk-num" aria-hidden="true">{String(i+1).padStart(2,'0')}</span><span className="t"><b>{x.title}</b><small>{x.sub}</small></span><span className="pg" aria-hidden="true">{x.go}</span></a></li>)}</ol>
  </nav>
  <HubDock part="continue" clubs={dockClubs} openIds={dockOpen} locale={locale} copy={dockCopy}/>

  {/* TOP TEAMS: the sticker page — every open club, A–Z, in its own colours. A wrapping grid, never a rail. */}
  <section className="wkh-clubs" id="clubs" aria-labelledby="clubs-h">
   <div className="wkh-clubs-head">
    <div><p className="wk-banner">{copy.pickClub}</p><h2 className="wk-logo green wkh-title" id="clubs-h">{copy.wkPickClub}</h2></div>
    <div className="wkh-clubs-side"><p className="wk-small wkh-d-only">{copy.wkhStickerNote}</p><span className="wk-stamp wkh-green">{copy.wkhStampOpen.replace('{n}',String(live.length))}</span></div>
   </div>
   <BackToClub clubs={open.map(c=>({id:c.id,name:c.name}))} locale={locale} label={copy.backTo}/>
   <div className="wkh-stickers">
    {live.map((c,n)=>{
     const l=livery(c.id)
     return <Link key={c.id} className="wkh-stk" data-club={c.id} data-club-tile="open" href={`/clubs/${c.id}?lang=${locale}`} style={wearLivery(l)}>
      <span className="wkh-stk-band" data-livery={l?.pattern}>
       <span className="wkh-stk-no wk-num" aria-hidden="true">{String(n+1).padStart(2,'0')}</span><span className="sr-only">{`${copy.collectorNo} ${n+1}`}</span>
       <span className="wkh-disc">{l&&<Badge club={l}/>}</span>
      </span>
      <span className="wkh-stk-nm"><b>{c.name}</b><small>{c.city}{nick(c.id)?` · ${nick(c.id)}`:''}</small>{heroClubs.find(h=>h.id===c.id)?.otd&&<span className="wkh-stk-otd wk-k">{copy.wkhOtdTag}</span>}<TileStreak clubId={c.id} label={copy.wkhStreak}/></span>
      <svg className="wkh-peel" viewBox="0 0 22 22" aria-hidden="true"><path className="a" d="M22 0 L22 22 L0 22 Z"/><path className="b" d="M22 0 L0 22 L1 1 Z"/></svg>
     </Link>})}
   </div>
   <p className="wk-small wkh-clubs-note wkh-m-only">{copy.wkhStickerNote}</p>
  </section>

  {/* NEXT UP — FOR REAL: the coupon, every club on the roll (streams in; rule 104). */}
  <Suspense fallback={<HubNextUpWaiting title={copy.nextUp} kicker={copy.wkhInNext}/>}><HubNextUp open={open} locale={locale} copy={couponCopy} title={copy.nextUp}/></Suspense>

  <div className="wkh-spec">
   <HubDock part="links" clubs={dockClubs} openIds={dockOpen} locale={locale} copy={dockCopy}/>
  </div>

  {/* YOUR SAY: the ballot of the clubs still in the workshop, and a club written in. */}
  <SuggestClub copy={{kicker:copy.suggestKicker,title:copy.suggestTitle,note:copy.suggestNote,label:copy.suggestLabel,placeholder:copy.suggestPlaceholder,send:copy.suggestSend,sending:copy.suggestSending,thanks:copy.suggestThanks,again:copy.suggestAgain,tooShort:copy.suggestTooShort,limit:copy.suggestLimit,failed:copy.suggestFailed,writeIn:copy.wkhWriteIn}}>
   {shop.length>0&&<WorkshopGrid clubs={shopClubs} copy={{ballot:copy.wkhBallot,question:copy.wkhBallotQ,kicker:copy.hubWorkshopKicker,count:copy.voteCount,demo:copy.voteDemo,note:copy.voteNote,vote:copy.voteCta,voted:copy.voteVoted,leading:copy.tileLeading,preview:copy.tilePreview,shop:copy.tileWorkshop,more:copy.tileMore,less:copy.tileLess,accounts:copy.voteAccounts,guests:copy.voteGuests,base:copy.voteBase,offline:copy.voteOffline,tooMany:copy.voteTooMany}}/>}
  </SuggestClub>

  {/* DEAR TERRACE: the editor's letter — the old weekly's "from the editor" box (owner, 7.10.2026). */}
  <aside className="wkh-letter" aria-labelledby="editor-h">
   <span className="wk-stamp wkh-letter-stamp" aria-hidden="true">{copy.letterStamp}</span>
   <p className="wk-k red">{copy.letterKicker}</p>
   <div className="wkh-letter-head"><span className="wk-circle wk-greenplate wkh-letter-pic" aria-hidden="true"><Plate art="fanfist" ink="green"/></span><h2 className="wk-logo green" id="editor-h">{copy.letterTitle}</h2></div>
   <p className="wkh-dropcap">{copy.letterBody}</p>
   <p>{copy.letterBody2}</p>
   <p>{copy.letterBody3}</p>
   <p className="wk-head wkh-sign">{copy.editor}</p>
  </aside>

  {/* THE BACK PAGES: where every fact in the paper comes from. */}
  <Link className="wkh-back" href="/sources">
   <svg className="wkh-lens" viewBox="-12 -12 234 234" aria-hidden="true"><path className="h" d="M132 132 L192 192"/><path className="g" d="M140 140 L188 188"/><circle className="r" cx="86" cy="86" r="62"/><path className="s" d="M52 66 A40 40 0 0 1 82 42"/></svg>
   <span className="wkh-back-t"><span className="wk-k cyan">{copy.wkhBackPages}</span><b className="wk-head">{copy.wkSources}</b><span className="wk-small">{copy.wkhSourcesSub}</span></span><Arrow/>
  </Link>
 </main></Shell>}

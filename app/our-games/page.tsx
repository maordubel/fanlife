import Link from 'next/link'
import {Shell} from '@/components/master/Shell'
import {Plate} from '@/components/weekly/Plate'
import {Emblem} from '@/components/legends/Brand'
import {GateChooser} from '@/components/home/MagazineHubControls'
import {hubModels} from '@/lib/home/hub-model'
import {lifeEntries} from '@/lib/clubs/life/entry'
import {isOpenClub} from '@/lib/home/hub-open'
import {readState} from '@/lib/master/store'
import {evaluationMode} from '@/lib/master/mode'
import {uiLocale} from '@/lib/clubs/locale'
import {door} from '@/lib/features-server'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'
export function generateMetadata(){return {title:en.ourGamesTitle}}

const Arrow=()=><svg className="wkh-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>

/**
 * OUR GAMES (owner, 14.10.2026): the two flagship features side by side — LIFE and LEGENDS MANAGER — and under them the door
 * into every open club ("each club is a world"). The bottom bar's centre tab leads here, on the hub and inside a club.
 */
export default async function OurGames({searchParams}:{searchParams:{lang?:string}}){
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,preview=evaluationMode()
 const {clubs}=await readState()
 const open=clubs.filter(c=>c.status!=='paused').sort((a,b)=>a.name.localeCompare(b.name))
 const [{model,strict},life,fl]=await Promise.all([hubModels(open,locale),lifeEntries(open,preview),door('fanLeague')])
 const live=open.filter(c=>isOpenClub(strict.find(x=>x.id===c.id)))
 const chooser={title:copy.chooseClub,search:copy.chooserSearch,close:copy.chooserClose,none:copy.chooserNone,workshop:copy.chooserWorkshop,partial:''}
 const lifeMap=Object.fromEntries(open.map(c=>[c.id,life[c.id]?.href??null]))
 const worldMap=Object.fromEntries(open.map(c=>[c.id,live.some(l=>l.id===c.id)?`/clubs/${c.id}?lang=${locale}`:null]))
 return <Shell locale={locale}><main id="main" className="wkh wkg">
  <header className="wkg-head"><p className="wk-banner">{copy.ourGamesKicker}</p><h1 className="wk-logo green wkg-title">{copy.ourGamesTitle}</h1></header>
  <div className="wkg-pair">
   <section className="wkg-card wkg-life wk-orangeplate" aria-labelledby="og-life">
    <span className="wk-speed" aria-hidden="true"/>
    <Plate art="fatherson" ink="navy" className="wkg-art"/>
    <div className="wkg-txt"><p className="wk-k white">{copy.lifeEntryTitle} · {copy.lifeGameSub}</p><h2 className="wk-shout wkg-shout" id="og-life" dir="ltr">{copy.wkhLifeShout}</h2><p className="wkg-line">{copy.ourGamesLife}</p>
     <GateChooser gate="life" clubs={model} life={lifeMap} copy={chooser} className="wk-btn paper wkg-cta">{copy.lifeEntryCta} <Arrow/></GateChooser></div>
   </section>
   <section className="wkg-card wkg-lm wk-navyplate" aria-labelledby="og-lm">
    <Emblem size={120} label="" className="wkg-emblem"/>
    <div className="wkg-txt"><p className="wk-k white">{copy.wkhLmK}</p><h2 className="wk-logo wkg-lmtitle" id="og-lm">{copy.wkhLmTitle}</h2><p className="wkg-line">{copy.wkhLmSub}</p>
     {fl.open?<Link className="wk-btn paper wkg-cta min-h-tap" href="/all-football/legends">{copy.ourGamesPlay}{fl.preview?` · ${copy.wkhOwnerPreview}`:''} <Arrow/></Link>:<span className="wk-tag ink wkg-soon">{copy.ourGamesSoon}</span>}</div>
   </section>
  </div>
  <section className="wkg-world wk-greenplate" aria-labelledby="og-world">
   <span className="wk-speed" aria-hidden="true"/>
   <Plate art="fans" ink="orange" className="wkg-crowd"/>
   <div className="wkg-wtxt"><p className="wk-k white">{copy.ourGamesWorldK.replace('{n}',String(live.length))}</p><h2 className="wk-logo wkg-wtitle" id="og-world">{copy.coverBottom}</h2>
    <GateChooser gate="life" clubs={model} life={worldMap} copy={chooser} className="wk-btn paper wkg-cta">{copy.ourGamesWorldCta} <Arrow/></GateChooser></div>
  </section>
 </main></Shell>
}

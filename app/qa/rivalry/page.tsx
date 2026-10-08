import {notFound} from 'next/navigation'
import {qaAllowed} from '@/lib/qa'
import {loadClub} from '@/lib/clubs/resolver'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {gameCopy} from '@/lib/clubs/game-copy'
import {localeDirection,uiLocale} from '@/lib/clubs/locale'
import {roundFrom} from '@/lib/rotation/round'
import {dealFile,publicFile,scopeOf} from '@/lib/clubs/blackfile-deal'
import {fixtureBinary,fixtureItems,fixtureWall} from '@/lib/clubs/rivalry-fixture'
import {rivalryModes,type ModeKey} from '@/lib/clubs/rivalry-modes'
import {ClubWall} from '@/components/clubs/gates/rivalry/ClubWall'
import {ClubBlackFile} from '@/components/clubs/gates/rivalry/ClubBlackFile'
import {ModeBar} from '@/components/clubs/gates/rivalry/ModeBar'
import {ModeLocked} from '@/components/clubs/gates/rivalry/ModeLocked'
import css from '@/components/clubs/gates/rivalry/rivalry.module.css'

export const dynamic='force-dynamic'
export const metadata={title:'QA · Rivalry'}
type Search={mode?:string;lang?:string;seed?:string;r?:string;wall?:string;ranked?:string;items?:string;binary?:string;[k:string]:string|undefined}

/**
 * Dev-only board for gate 11: the wall and the Black File played on SYNTHETIC data ("Fixture …"), so the modes can be
 * exercised end to end although no real club has ten wall candidates or sourced careers yet. `notFound()` on the live site.
 * ?wall=7 (too few names) · ?ranked=0 (no editorial order) · ?items=3 (few dated events) · ?binary=0 (no crossings)
 */
export default async function Page({searchParams}:{searchParams:Search}){
 if(!qaAllowed())notFound()
 const base=await loadClub('hapoel-tel-aviv')
 if(!base)notFound()
 const club=base.data,locale=uiLocale(searchParams.lang),copy=gameCopy(locale),round=roundFrom(searchParams)
 const num=(v:string|undefined,d:number)=>v!==undefined&&/^\d+$/.test(v)?Number(v):d
 const wall=fixtureWall(num(searchParams.wall,12),searchParams.ranked!=='0')
 const binary=num(searchParams.binary,1)===0?[]:fixtureBinary()
 const items=fixtureItems(num(searchParams.items,10))
 const modes=rivalryModes({rivals:1,meetings:0,wall,binary,items}).slice(1)
 const mode:ModeKey=searchParams.mode==='blackfile'?'blackfile':'wall'
 const info=modes.find(m=>m.key===mode)!
 const qs=(m:string)=>`?${new URLSearchParams(Object.entries({...searchParams,mode:m}).filter((e):e is [string,string]=>typeof e[1]==='string'))}`
 const again=`?${new URLSearchParams(Object.entries({...searchParams,mode,r:String(round.cursor+1)}).filter((e):e is [string,string]=>typeof e[1]==='string'))}`
 const src={binary,items}
 const file=publicFile(dealFile(src,round.seed,round.cursor),scopeOf('__fixture','fixture',round.seed,round.cursor))
 return <ClubSurface theme={club.theme} clubId={club.identity.id} locale={locale} tabbar={false}>
  <main id="main" dir={localeDirection(locale)} lang={locale} className="mag-game mx-auto min-h-screen max-w-4xl px-gutter py-6" data-testid="qa-rivalry">
   <p className={css.kicker}>QA · synthetic fixture data · never a real club</p>
   <div className={css.shell} data-mode={mode}>
    <ModeBar modes={modes} current={mode} hrefs={{meetings:qs('wall'),wall:qs('wall'),blackfile:qs('blackfile')}} copy={copy} rivals={[]} currentRival={null} rivalHref={()=>'#'}/>
    {info.state==='locked'
     ?<ModeLocked mode={info} clubName="Fixture club" copy={copy} otherHref={qs('wall')}/>
     :mode==='wall'
      ?<ClubWall club="__fixture" clubName="Fixture club" version="fixture" seed={round.seed} cursor={round.cursor} locale={locale} contentLocale="en" copy={copy} candidates={wall} playUrl={again} testMode={searchParams.fast==='1'} fixture/>
      :<ClubBlackFile club="__fixture" clubName="Fixture club" slug="__fixture" version="fixture" seed={round.seed} cursor={round.cursor} locale={locale} contentLocale="en" copy={copy} file={file} playUrl={again} fixture/>}
   </div>
  </main>
 </ClubSurface>
}

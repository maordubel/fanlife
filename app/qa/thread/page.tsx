import {notFound} from 'next/navigation'
import {qaAllowed} from '@/lib/qa'
import {loadClub} from '@/lib/clubs/resolver'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {gameCopy} from '@/lib/clubs/game-copy'
import {localeDirection,uiLocale} from '@/lib/clubs/locale'
import {roundFrom} from '@/lib/rotation/round'
import {bindFixture,publicPlan} from '@/lib/clubs/thread-data'
import {buildView} from '@/lib/clubs/thread-engine'
import {ThreadView} from '@/components/clubs/gates/timeline-thread/ThreadView'

export const dynamic='force-dynamic'
export const metadata={title:'QA · Thread'}
type Search={lang?:string;seed?:string;r?:string;locked?:string;[k:string]:string|undefined}

/**
 * Dev-only board for gate 13's Thread, played on a SYNTHETIC graph ("Fixture …") — no real club has typed, approved,
 * sourced evidence edges yet. ?locked=1 shows the honest locked screen (an empty graph). `notFound()` on the live site.
 */
export default async function Page({searchParams}:{searchParams:Search}){
 if(!qaAllowed())notFound()
 const base=await loadClub('hapoel-tel-aviv')
 if(!base)notFound()
 const club=base.data,locale=uiLocale(searchParams.lang),copy=gameCopy(locale),round=roundFrom(searchParams)
 const bound=bindFixture()
 const plan=searchParams.locked==='1'?publicPlan({...bound,graph:{nodes:[],edges:[]},view:buildView({nodes:[],edges:[]})},round.seed):publicPlan(bound,round.seed)
 const again=`?${new URLSearchParams(Object.entries({...searchParams,seed:String(round.seed),r:String(round.cursor+1)}).filter((e):e is [string,string]=>typeof e[1]==='string'))}`
 return <ClubSurface theme={club.theme} clubId={club.identity.id} locale={locale} tabbar={false}>
  <main id="main" dir={localeDirection(locale)} lang={locale} className="mag-game mx-auto min-h-screen max-w-4xl px-gutter py-6" data-testid="qa-thread">
   <p className="mag-fine">QA · synthetic fixture graph · never a real club</p>
   <ThreadView plan={plan} club="__fixture" clubName="Fixture club" slug="__fixture" version="fixture" seed={round.seed} cursor={round.cursor} locale={locale} contentLocale="en" copy={copy} playUrl={again} chronicleHref="/qa/thread" fixture/>
  </main>
 </ClubSurface>
}

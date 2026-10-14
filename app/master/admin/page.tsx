import {AdsDesk} from '@/components/master/desk/AdsDesk'
import {readPromo} from '@/lib/promo/store'
import {ProviderCheck} from '@/components/master/desk/ProviderCheck'
import {Suspense} from 'react'
import {ClubGaps} from '@/components/master/ClubGaps'
import {Admin,type AdapterInfo,type DeskSection} from '@/components/master/Admin'
import {AdminShell,MoreMenu,type Section} from '@/components/master/desk/AdminShell'
import {AudienceDesk} from '@/components/master/desk/AudienceDesk'
import {PlayersDesk} from '@/components/master/desk/PlayersDesk'
import {TaskDesk} from '@/components/master/desk/TaskDesk'
import {GamesDesk} from '@/components/master/desk/GamesDesk'
import {MarketDesk,CommunityDesk} from '@/components/master/desk/MarketDesk'
import {ExperienceCard,ExperienceDesk} from '@/components/master/desk/ExperienceDesk'
import {lightState} from '@/lib/master/lightState'
import {refreshMigrationState} from '@/lib/master/durable'
import {requireAdmin} from '@/lib/master/admin'
import {ADAPTER_LIST,adapterAvailable} from '@/lib/master/adapters'
import {readRuns} from '@/lib/research/service'
import {emptyDisplay} from '@/lib/master/lifeDisplay'
import {integrations,release,storageMap} from '@/lib/master/storageMap'
import {attentionNow} from '@/lib/master/crm/now'
import {buildDesk} from '@/lib/master/crm/desk'
import {featuresOf} from '@/lib/features'
import '../../desk.css'
export const dynamic='force-dynamic'

const SECTION_KEYS=['overview','clubs','players','games','market','community','audience','data','operations','advertising','settings','more'] as const
/** Old bookmarks keep working (rule 99 §2): `?tab=` and `?section=data&view=players` land where they always did. */
const LEGACY:Record<string,{section:Section;view?:string}>={overview:{section:'overview'},club:{section:'clubs',view:'evidence'},data:{section:'data'},display:{section:'settings'},updates:{section:'operations'},activity:{section:'operations'}}
/** sections the Admin component draws (the rest are the desk's own panels) */
const ADMIN_SECTIONS=new Set<Section>(['overview','clubs','data','audience','operations','settings'])

export default async function Page({searchParams}:{searchParams:{section?:string;tab?:string;club?:string;view?:string;days?:string;gate?:string;pc?:string;lab?:string}}){
 const session=requireAdmin('/master/admin')
 await refreshMigrationState()
 const {state,summaries,storage,items}=await attentionNow()
 const legacy=searchParams.tab?LEGACY[searchParams.tab]:undefined
 let section:Section=legacy?.section||(SECTION_KEYS.includes(searchParams.section as Section)?searchParams.section as Section:'overview')
 const view=searchParams.view||legacy?.view||null
 if(section==='data'&&view==='players')section='players'
 const club=summaries.some(s=>s.id===searchParams.club)?searchParams.club!:null
 const owner=session.role==='owner'
 const desk=await buildDesk(items)
 const counts={tasks:desk.view.open.length,blocking:desk.view.counts.blocking}
 const clubName=club?summaries.find(s=>s.id===club)!.name:null
 const features=featuresOf(state)
 const shell=(children:React.ReactNode)=><AdminShell section={section} club={club} clubName={clubName} owner={owner} counts={counts}>{children}</AdminShell>
 if(section==='more')return shell(<MoreMenu owner={owner}/>)
 if(section==='players')return shell(<Suspense fallback={<p className="desk-state" role="status">Loading players…</p>}><PlayersDesk/></Suspense>)
 if(section==='games')return shell(view==='all-football'?<ExperienceDesk features={features} lab={(['trivia','timeline','memory','league'] as const).find(g=>g===searchParams.lab)??null}/>:<GamesDesk summaries={summaries} scope={club} gate={searchParams.gate||null} experiences={<ExperienceCard features={features}/>}/>)
 if(section==='advertising')return shell(<AdsDesk initial={await readPromo()} clubs={state.clubs.map(c=>({id:c.id,name:c.name})).sort((a,b)=>a.name.localeCompare(b.name))}/>)
 if(section==='market')return shell(<MarketDesk/>)
 if(section==='community')return shell(<CommunityDesk/>)
 const runs=await readRuns()
 const initial=lightState(state),clubs=state.clubs
 const adapters:AdapterInfo[]=ADAPTER_LIST.map(a=>({...a,available:Object.fromEntries(clubs.map(c=>[c.id,adapterAvailable(a.id,c.id)]))}))
 const admin=ADMIN_SECTIONS.has(section)?section as DeskSection:'overview'
 return shell(<Suspense fallback={<p className="desk-state" role="status">Loading the desk…</p>}>
   <Admin initial={initial} summaries={summaries} adapters={adapters} runs={runs} display={state.lifeDisplay||emptyDisplay()} ads={state.ads} storage={storage} features={features}
    section={admin} view={view} club={club} attention={items}
    tasks={admin==='overview'?<TaskDesk initial={desk.view} scope={club} players={desk.players}/>:undefined}
    ops={{storage:storageMap(),integrations:integrations(),release:release()}}
    audience={admin==='audience'?<AudienceDesk days={searchParams.days} club={club} clubNames={Object.fromEntries(summaries.map(s=>[s.id,s.name]))}/>:undefined}
    gaps={admin==='clubs'&&!club?<details className="desk-more"><summary className="min-h-tap">Club gaps — what each gate still needs</summary><ClubGaps summaries={summaries}/></details>:undefined}
    provider={admin==='clubs'&&!club?<details className="desk-more"><summary className="min-h-tap">TheSportsDB check — grounds, founding years, badges and kits</summary><Suspense fallback={<p className="desk-state" role="status">Asking TheSportsDB…</p>}><ProviderCheck/></Suspense></details>:undefined}/>
  </Suspense>)
}

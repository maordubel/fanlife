import {FinalWhistleDesk} from '@/components/master/desk/FinalWhistleDesk'
import {MatchdayDesk} from '@/components/master/desk/MatchdayDesk'
import {FIXTURE_TEAMS} from '@/lib/fixtures/teams'
import {AdsDesk} from '@/components/master/desk/AdsDesk'
import {TopAdDesk} from '@/components/master/desk/TopAdDesk'
import {DEFAULT_TOP_AD} from '@/lib/top-ad'
import {readPromo} from '@/lib/promo/store'
import {ProviderCheck} from '@/components/master/desk/ProviderCheck'
import {Suspense} from 'react'
import {ClubGaps} from '@/components/master/ClubGaps'
import {Admin,type AdapterInfo,type DeskSection} from '@/components/master/Admin'
import {AdminShell,MoreMenu,type Section} from '@/components/master/desk/AdminShell'
import {AudienceDesk} from '@/components/master/desk/AudienceDesk'
import {PlayersDesk} from '@/components/master/desk/PlayersDesk'
import {ResearchDesk} from '@/components/master/desk/ResearchDesk'
import {TaskDesk} from '@/components/master/desk/TaskDesk'
import {GamesDesk} from '@/components/master/desk/GamesDesk'
import {MissionsCard, MissionsDesk} from '@/components/master/desk/MissionsDesk'
import {MarketDesk,CommunityDesk} from '@/components/master/desk/MarketDesk'
import {ExperienceCard,ExperienceDesk} from '@/components/master/desk/ExperienceDesk'
import {lightState} from '@/lib/master/lightState'
import {readState,storageInfo} from '@/lib/master/store'
import {allSummaries} from '@/lib/master/summary'
import {refreshMigrationState} from '@/lib/master/durable'
import {requireAdmin} from '@/lib/master/admin'
import {ADAPTER_LIST,adapterAvailable} from '@/lib/master/adapters'
import {readRuns} from '@/lib/research/service'
import {emptyDisplay} from '@/lib/master/lifeDisplay'
import {integrations,release,storageMap} from '@/lib/master/storageMap'
import {deskNow} from '@/lib/master/crm/now'
import {featuresOf} from '@/lib/features'
import {ConnectedDesk} from '@/components/master/desk/ConnectedDesk'
import {StoriesDesk} from '../stories/desk'
import {deskTab} from '@/lib/stories/banners'
import '../../desk.css'
import '../../research-desk.css'
export const dynamic='force-dynamic'

const SECTION_KEYS=['overview','clubs','research','players','games','studio','market','community','audience','data','operations','advertising','settings','more'] as const
/** Old bookmarks keep working (rule 99 §2): `?tab=` and `?section=data&view=players` land where they always did. */
const LEGACY:Record<string,{section:Section;view?:string}>={overview:{section:'overview'},club:{section:'clubs',view:'evidence'},data:{section:'data'},display:{section:'settings'},updates:{section:'operations'},activity:{section:'operations'}}
/** sections the Admin component draws (the rest are the desk's own panels) */
const ADMIN_SECTIONS=new Set<Section>(['overview','clubs','data','audience','operations','settings'])

type Params={section?:string;tab?:string;club?:string;view?:string;days?:string;gate?:string;pc?:string;lab?:string}
type Overview=Promise<Awaited<ReturnType<typeof deskNow>>>

export default async function Page({searchParams}:{searchParams:Params}){
 const session=requireAdmin('/master/admin')
 const legacy=searchParams.tab?LEGACY[searchParams.tab]:undefined
 let section:Section=legacy?.section||(SECTION_KEYS.includes(searchParams.section as Section)?searchParams.section as Section:'overview')
 const view=searchParams.view||legacy?.view||null
 if(section==='data'&&view==='players')section='players'
 const owner=session.role==='owner'
 const state=searchParams.club?await readState():undefined
 const overview=section==='overview'?deskNow(state):null
 const scoped=state?.clubs.find(c=>c.id===searchParams.club)
 const club=scoped?.id??null
 return <AdminShell section={section} club={club} clubName={scoped?.name??null} owner={owner}
  renderOverviewBadge={overview?()=> <Suspense fallback={null}><OverviewBadge overview={overview}/></Suspense>:undefined}>
  <Suspense key={JSON.stringify([section,view,club,searchParams.days,searchParams.gate,searchParams.lab])}
   fallback={<p className="desk-state" role="status">Loading the desk…</p>}>
   <DeskContent section={section} view={view} club={club} owner={owner} searchParams={searchParams} overview={overview} scopedState={state}/>
  </Suspense>
 </AdminShell>
}

async function OverviewBadge({overview}:{overview:Overview}){
 const {desk}=await overview
 const count=desk.view.open.length
 return count>0?<em className="desk-count" data-hot={desk.view.counts.blocking>0||undefined} aria-label={`${count} open`}>{count}</em>:null
}

async function DeskContent({section,view,club,owner,searchParams,overview,scopedState}:{
 section:Section;view:string|null;club:string|null;owner:boolean;searchParams:Params;overview:Overview|null;scopedState?:Awaited<ReturnType<typeof readState>>
}){
 if(section==='more')return <MoreMenu owner={owner}/>
 if(section==='players')return <PlayersDesk/>
 if(section==='research')return <ResearchDesk/>
 if(section==='studio')return <StoriesDesk view={deskTab(view)}/>
 if(section==='market')return <MarketDesk/>
 if(section==='community')return <CommunityDesk/>
 if(section==='operations')await refreshMigrationState()
 const overviewData=await overview
 const state=overviewData?.state??scopedState??await readState()
 const features=featuresOf(state)
 if(section==='games'&&view==='all-football')return <ExperienceDesk features={features} lab={(['trivia','timeline','memory','league'] as const).find(g=>g===searchParams.lab)??null}/>
 if(section==='games'&&view==='missions')return <MissionsDesk features={features}/>
 if(section==='advertising'){const named=state.clubs.map(c=>({id:c.id,name:c.name,status:c.status})).sort((a,b)=>a.name.localeCompare(b.name));return <><Suspense fallback={<p className="desk-state" role="status">Checking DUBID and OFFSIDES…</p>}><ConnectedDesk clubs={named}/></Suspense><AdsDesk initial={await readPromo()} clubs={named}/><TopAdDesk initial={state.ads??DEFAULT_TOP_AD}/></>}
 const [summaries,runs]=await Promise.all([
  overviewData?.summaries??(['clubs','data','games','settings'].includes(section)?allSummaries(state):[]),
  section==='data'&&club?readRuns(club):[],
 ])
 if(section==='games')return <GamesDesk summaries={summaries} scope={club} gate={searchParams.gate||null} experiences={<><ExperienceCard features={features}/><div className="crm-exps"><MissionsCard features={features}/></div></>}/>
 const storage=overviewData?.storage??storageInfo()
 const initial=lightState(state),clubs=state.clubs
 const adapters:AdapterInfo[]=section==='clubs'&&club?ADAPTER_LIST.map(a=>({...a,available:{[club]:adapterAvailable(a.id,club)}})):[]
 const admin=ADMIN_SECTIONS.has(section)?section as DeskSection:'overview'
 return <Admin initial={initial} summaries={summaries} adapters={adapters} runs={runs} display={state.lifeDisplay||emptyDisplay()} ads={state.ads} storage={storage} features={features}
    section={admin} view={view} club={club} attention={overviewData?.items??[]}
    tasks={overviewData?<TaskDesk initial={overviewData.desk.view} scope={club} players={overviewData.desk.players}/>:undefined}
    ops={{storage:storageMap(),integrations:integrations(),release:release()}}
    audience={admin==='audience'?<Suspense fallback={<p className="desk-state" role="status">Loading performance…</p>}><AudienceDesk days={searchParams.days} club={club} clubNames={Object.fromEntries(clubs.map(s=>[s.id,s.name]))}/></Suspense>:undefined}
    finalWhistle={admin==='operations'?<><FinalWhistleDesk clubs={state.clubs.map(c=>({id:c.id,name:c.name,live:c.status==='live',provider:FIXTURE_TEAMS.some(t=>t.clubId===c.id)})).sort((a,b)=>a.name.localeCompare(b.name))}/><MatchdayDesk clubs={state.clubs.map(c=>({id:c.id,name:c.name,provider:FIXTURE_TEAMS.some(t=>t.clubId===c.id)})).sort((a,b)=>a.name.localeCompare(b.name))}/></>:undefined}
    gaps={admin==='clubs'&&!club?<details className="desk-more"><summary className="min-h-tap">Club gaps — what each gate still needs</summary><ClubGaps summaries={summaries}/></details>:undefined}
    provider={admin==='clubs'&&!club?<details className="desk-more"><summary className="min-h-tap">TheSportsDB check — grounds, founding years, badges and kits</summary><Suspense fallback={<p className="desk-state" role="status">Asking TheSportsDB…</p>}><ProviderCheck/></Suspense></details>:undefined}/>
}

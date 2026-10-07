import {Suspense} from 'react'
import {ClubGaps} from '@/components/master/ClubGaps'
import {Admin,type AdapterInfo,type DeskSection} from '@/components/master/Admin'
import {AdminShell,MoreMenu,type Section} from '@/components/master/desk/AdminShell'
import {AudienceDesk} from '@/components/master/desk/AudienceDesk'
import {lightState} from '@/lib/master/lightState'
import {readState,storageInfo} from '@/lib/master/store'
import {requireAdmin} from '@/lib/master/admin'
import {allSummaries} from '@/lib/master/summary'
import {ADAPTER_LIST,adapterAvailable} from '@/lib/master/adapters'
import {readRuns} from '@/lib/research/service'
import {emptyDisplay} from '@/lib/master/lifeDisplay'
import {attention} from '@/lib/master/attention'
import {integrations,release,storageMap} from '@/lib/master/storageMap'
import {portalConfigured} from '@/lib/portal/env'
import {evaluationMode} from '@/lib/master/mode'
import '../../desk.css'
export const dynamic='force-dynamic'

const SECTION_KEYS=['overview','clubs','data','audience','operations','settings','more'] as const
/** Old bookmarks (`?tab=`) keep working: each maps to its place on the desk (plan §3). */
const LEGACY:Record<string,{section:DeskSection;view?:string}>={overview:{section:'overview'},club:{section:'clubs',view:'evidence'},data:{section:'data'},display:{section:'settings'},updates:{section:'operations'},activity:{section:'operations'}}

export default async function Page({searchParams}:{searchParams:{section?:string;tab?:string;club?:string;view?:string;days?:string}}){
 const session=requireAdmin('/master/admin')
 const state=await readState()
 const storage=storageInfo()
 const [summaries,runs]=await Promise.all([allSummaries(state),readRuns()])
 const legacy=searchParams.tab?LEGACY[searchParams.tab]:undefined
 const section:Section=legacy?.section||(SECTION_KEYS.includes(searchParams.section as Section)?searchParams.section as Section:'overview')
 const club=summaries.some(s=>s.id===searchParams.club)?searchParams.club!:null
 const view=searchParams.view||legacy?.view||null
 const initial=lightState(state),clubs=state.clubs
 const adapters:AdapterInfo[]=ADAPTER_LIST.map(a=>({...a,available:Object.fromEntries(clubs.map(c=>[c.id,adapterAvailable(a.id,c.id)]))}))
 const measurement=evaluationMode()?'evaluation':portalConfigured()?'connected':'not-connected'
 const inbox=attention(summaries,state.jobs,{storage,measurement,runnerPinned:process.env.CRON_SECRET?null:false})
 const clubName=club?summaries.find(s=>s.id===club)!.name:null
 const owner=session.role==='owner'
 return <AdminShell section={section} club={club} clubName={clubName} owner={owner}>
  {section==='more'?<MoreMenu owner={owner}/>:
  <Suspense fallback={<p className="desk-state" role="status">Loading the desk…</p>}>
   <Admin initial={initial} summaries={summaries} adapters={adapters} runs={runs} display={state.lifeDisplay||emptyDisplay()} storage={storage}
    section={section} view={view} club={club} attention={inbox}
    ops={{storage:storageMap(),integrations:integrations(),release:release()}}
    audience={section==='audience'?<AudienceDesk days={searchParams.days} club={club} clubNames={Object.fromEntries(summaries.map(s=>[s.id,s.name]))}/>:undefined}
    gaps={section==='clubs'&&!club?<ClubGaps summaries={summaries}/>:undefined}/>
  </Suspense>}
 </AdminShell>
}

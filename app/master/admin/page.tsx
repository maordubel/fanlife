import {Suspense} from 'react'
import {Shell} from '@/components/master/Shell'
import {ClubGaps} from '@/components/master/ClubGaps'
import {Admin,type AdapterInfo} from '@/components/master/Admin'
import {lightState} from '@/lib/master/lightState'
import {readState,storageInfo} from '@/lib/master/store'
import {requireAdmin} from '@/lib/master/admin'
import {LogoutButton} from '@/components/master/LogoutButton'
import {allSummaries} from '@/lib/master/summary'
import {ADAPTER_LIST,adapterAvailable} from '@/lib/master/adapters'
import {readRuns} from '@/lib/research/service'
import {emptyDisplay} from '@/lib/master/lifeDisplay'
export const dynamic='force-dynamic'

export default async function Page(){
 const session=requireAdmin('/master/admin')
 const state=await readState()
 const [summaries,runs]=await Promise.all([allSummaries(state),readRuns()])
 // evidence arrays are paged on demand (audit A17); the page ships the light state only
 const initial=lightState(state),clubs=state.clubs
 const adapters:AdapterInfo[]=ADAPTER_LIST.map(a=>({...a,available:Object.fromEntries(clubs.map(c=>[c.id,adapterAvailable(a.id,c.id)]))}))
 return <Shell><main id="main">
  <nav className="mag-adminnav" aria-label="Control room sections"><a href="#gaps">What is missing</a><a href="#controls">Controls</a><a href="/master/admin?tab=display#controls">LIFE display</a><a href="/master/core">Club data</a><a href="/master/exchange">Shirt economy</a><a href="/master/test-lab">Test lab</a>{session.role==='owner'&&<LogoutButton/>}</nav>
  <ClubGaps summaries={summaries}/>
  <Suspense fallback={<p className="muted" role="status">Loading the control room…</p>}><Admin initial={initial} summaries={summaries} adapters={adapters} runs={runs} display={state.lifeDisplay||emptyDisplay()} storage={storageInfo()}/></Suspense>
 </main></Shell>
}

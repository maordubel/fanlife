import Link from 'next/link'
import {notFound} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {PreviewRibbon} from '@/components/experiences/AfFrame'
import {AnswerFriendly,FriendlyResult} from '@/components/fan-league/Friendlies'
import {door} from '@/lib/features-server'
import {viewer} from '@/lib/fan-league/owner'
import {friendlyView,tokenHash} from '@/lib/fan-league/friendly'
import {ownerIndex,readFriendly} from '@/lib/fan-league/store'
import '../../../all-football.css'
import '../../fan-league.css'
export const dynamic='force-dynamic'
export const metadata={title:'FAN LEAGUE · friendly',robots:{index:false}}

/** an invitation opens for the two managers in it, or for whoever holds the link's token — anyone else gets a 404 */
export default async function Page({params,searchParams}:{params:{id:string};searchParams:{t?:string}}){
 const [fl,fr]=await Promise.all([door('fanLeague'),door('friendlies')]);if(!fl.open||!fr.open)notFound()
 const [owner,cur]=await Promise.all([viewer(false),readFriendly(params.id)])
 if(!cur)notFound()
 const f=cur.friendly,token=typeof searchParams.t==='string'?searchParams.t.slice(0,64):'',holds=!!token&&f.tokenHash===tokenHash(token)
 const party=!!owner&&(owner===f.inviter.owner||owner===f.invitee?.owner)
 if(!party&&!holds)notFound()
 const view=friendlyView(f,owner,Date.now())
 const careers=owner&&holds?(await ownerIndex(owner)).careers.map(c=>({id:c.id,clubName:c.clubName,decade:c.decade})):[]
 return <Shell locale="en">
  <PreviewRibbon on={fl.preview||fr.preview}/>
  <main id="main" className="af flg">
   <p className="af-back-row"><Link className="af-back" href="/all-football/fan-league">← FAN LEAGUE</Link></p>
   {view.role==='inviter'&&view.status!=='completed'?<section className="flg-card"><p className="af-label">Your invitation</p><h2>Waiting for an answer</h2><p className="flg-fine">Status: {view.status}. Your {view.home.decade}s {view.home.name} eleven is locked in.</p></section>
    :view.status==='completed'&&!holds?<section className="flg-card"><p className="af-label">Full time · friendly</p><FriendlyResult f={view}/></section>
    :<AnswerFriendly initial={view} token={token} careers={careers}/>}
  </main>
 </Shell>
}

import Link from 'next/link'
import {notFound} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {PreviewRibbon} from '@/components/experiences/AfFrame'
import {CareerApp} from '@/components/fan-league/CareerApp'
import {door} from '@/lib/features-server'
import {viewer} from '@/lib/fan-league/owner'
import {careerView} from '@/lib/fan-league/server'
import {readCareer} from '@/lib/fan-league/store'
import {livery,wearLivery} from '@/lib/club-livery'
import '../../../all-football.css'
import '../../fan-league.css'
export const dynamic='force-dynamic'
export const metadata={title:'FAN LEAGUE · career',robots:{index:false}}

/** a career is private: only its owner opens it — anyone else gets a 404, never a hint that it exists */
export default async function Page({params}:{params:{id:string}}){
 const [d,fr]=await Promise.all([door('fanLeague'),door('friendlies')]);if(!d.open)notFound()
 const [owner,cur]=await Promise.all([viewer(false),readCareer(params.id)])
 if(!owner||!cur||cur.career.owner!==owner)notFound()
 const l=livery(cur.career.clubId)
 return <Shell locale="en">
  <PreviewRibbon on={d.preview}/>
  <main id="main" className="af flg flg-career" style={wearLivery(l)}>
   <p className="af-back-row"><Link className="af-back" href="/all-football/fan-league">← FAN LEAGUE</Link></p>
   <CareerApp initial={careerView(cur.career)} friendlies={fr.open}/>
  </main>
 </Shell>
}

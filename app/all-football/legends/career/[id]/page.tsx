import Link from 'next/link'
import {notFound} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {PreviewRibbon} from '@/components/experiences/AfFrame'
import {CareerApp} from '@/components/legends/CareerApp'
import {door} from '@/lib/features-server'
import {LegendDoorsProvider} from '@/components/legends/CardLinks'
import {readState} from '@/lib/master/store'
import {gateAccess} from '@/lib/clubs/access'
import {evaluationMode} from '@/lib/master/mode'
import {viewer} from '@/lib/legends/owner'
import {decadesOf} from '@/lib/legends/server'
import {markEntered,readCareer} from '@/lib/legends/store'
import {careerView} from '@/lib/legends/view'
import {clubKit,withHighlights} from '@/lib/legends/kits'
import {careerShirts} from '@/lib/legends/shirts'
import {livery,wearLivery} from '@/lib/club-livery'
import '../../../all-football.css'
import '../../styles'
export const dynamic='force-dynamic'
export const metadata={title:'Legends Manager · career',robots:{index:false}}

/** a career is private: only its manager opens it — anyone else gets a 404, never a hint that it exists (S04) */
export default async function Page({params}:{params:{id:string}}){
 const [d,fr,pr,state]=await Promise.all([door('fanLeague'),door('friendlies'),door('profiles'),readState().catch(()=>null)]);if(!d.open)notFound()
 // the doors a card may draw (22.11.2026): a club's archive only where gate 12 is open to this visitor, a profile only behind its switch
 const preview=evaluationMode(),archives=(state?.clubs??[]).filter(c=>gateAccess({status:c.status,gates:c.gates},12,preview).allowed).map(c=>c.id)
 const [owner,cur]=await Promise.all([viewer(false),readCareer(params.id)])
 if(!owner||!cur||cur.career.owner!==owner)notFound()
 void markEntered(owner,params.id).catch(()=>{})
 const [initial,kit,shirts]=await Promise.all([withHighlights(careerView(cur.career),cur.career),clubKit(cur.career.clubId),careerShirts(cur.career.clubId)])
 return <Shell locale="en">
  <PreviewRibbon on={d.preview}/>
  <main id="main" className="af lgm lgm-in" style={wearLivery(livery(cur.career.clubId))}>
   <p className="af-back-row"><Link className="af-back" href="/all-football/legends">← Legends Manager</Link></p>
   <LegendDoorsProvider doors={{profiles:pr.open,archives}}><CareerApp initial={initial} wardrobe={kit?.wardrobe??{home:[],away:[]}} friendlies={fr.open} decades={decadesOf(cur.career)} shirts={shirts}/></LegendDoorsProvider>
  </main>
 </Shell>
}

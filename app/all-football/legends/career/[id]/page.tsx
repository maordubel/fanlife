import Link from 'next/link'
import {notFound} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {PreviewRibbon} from '@/components/experiences/AfFrame'
import {CareerApp} from '@/components/legends/CareerApp'
import {door} from '@/lib/features-server'
import {viewer} from '@/lib/legends/owner'
import {decadesOf} from '@/lib/legends/server'
import {readCareer} from '@/lib/legends/store'
import {careerView} from '@/lib/legends/view'
import {clubKit,withHighlights} from '@/lib/legends/kits'
import {livery,wearLivery} from '@/lib/club-livery'
import '../../../all-football.css'
import '../../legends.css'
export const dynamic='force-dynamic'
export const metadata={title:'Legends Manager · career',robots:{index:false}}

/** a career is private: only its manager opens it — anyone else gets a 404, never a hint that it exists (S04) */
export default async function Page({params}:{params:{id:string}}){
 const [d,fr]=await Promise.all([door('fanLeague'),door('friendlies')]);if(!d.open)notFound()
 const [owner,cur]=await Promise.all([viewer(false),readCareer(params.id)])
 if(!owner||!cur||cur.career.owner!==owner)notFound()
 const [initial,kit]=await Promise.all([withHighlights(careerView(cur.career),cur.career),clubKit(cur.career.clubId)])
 return <Shell locale="en">
  <PreviewRibbon on={d.preview}/>
  <main id="main" className="af lgm lgm-in" style={wearLivery(livery(cur.career.clubId))}>
   <p className="af-back-row"><Link className="af-back" href="/all-football/legends">← Legends Manager</Link></p>
   <CareerApp initial={initial} wardrobe={kit?.wardrobe??{home:[],away:[]}} friendlies={fr.open} decades={decadesOf(cur.career)}/>
  </main>
 </Shell>
}

import Link from 'next/link'
import {Shell} from '@/components/master/Shell'
import {requireAdmin} from '@/lib/master/admin'
import {readState} from '@/lib/master/store'
import {CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {REGISTRY} from '@/lib/master/registry'
import {LIFE_SOON_PATH} from '@/lib/life/lock/paths'
export const dynamic='force-dynamic'

/**
 * The owner's own door into LIFE while it is closed (owner, 24.11.2026). Everyone else meets Coming soon on every LIFE
 * address; with the control-room cookie these links open the game itself. Bookmark this page.
 */
export default async function Page(){
 requireAdmin('/master/life')
 const state=await readState().catch(()=>null)
 const status=(id:string)=>state?.clubs.find(c=>c.id===id)?.status??'—'
 const clubs=REGISTRY.filter(c=>CORE_CLUB_IDS.includes(c.id))
 return <Shell><main id="main" className="section">
  <p className="eyebrow">CONTROL ROOM · LIFE · OWNER ONLY</p>
  <h1>LIFE is closed to the public.</h1>
  <p className="spaced">Every LIFE address shows fans <Link href={LIFE_SOON_PATH}>Coming soon</Link>. With your control-room session these links open the game. The lock is in code, not a switch: opening LIFE to fans is a code change.</p>
  <div className="gates">
   {clubs.map(c=><Link className="gate" key={c.id} href={`/clubs/${c.id}/life`}><div><h3>{c.name} · LIFE</h3><p>{c.city} · club status: {status(c.id)}</p></div><b>↗</b></Link>)}
   <Link className="gate" href="/life"><div><h3>THE WORKER LIFE (Hapoel, original)</h3><p>/life</p></div><b>↗</b></Link>
   <a className="gate" href="/life/voxel/lab.html"><div><h3>Voxel lab</h3><p>Every room, every skin</p></div><b>↗</b></a>
   <Link className="gate" href="/qa/life-rush"><div><h3>RUSH missions (QA)</h3><p>/qa/life-rush</p></div><b>↗</b></Link>
  </div>
 </main></Shell>
}

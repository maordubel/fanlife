import Link from 'next/link'
import {notFound} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {PreviewRibbon} from '@/components/experiences/AfFrame'
import {Emblem} from '@/components/legends/Brand'
import {LegendsReveal} from '@/components/legends/Reveal'
import {Careers,ClubRoll,type ClubOption} from '@/components/legends/FrontDoor'
import {GAME_VALUES} from '@/components/legends/LegendCard'
import {door} from '@/lib/features-server'
import {LEGENDS_RULES as R} from '@/lib/legends/config'
import {viewer} from '@/lib/legends/owner'
import {legendsClubs} from '@/lib/legends/server'
import {activeCount,canSave,ownerIndex} from '@/lib/legends/store'
import '../all-football.css'
import './styles'
export const dynamic='force-dynamic'
export const metadata={title:'Legends Manager',description:'One club. Only the men who wore its shirt. Draft seventeen legends, run the club, and build a dynasty season after season.',
 openGraph:{title:'Legends Manager · FAN LIFE',images:[{url:'/legends/brand/og.png',width:1200,height:630,alt:'Legends Manager'}]},icons:{icon:'/legends/brand/logo-128.webp',apple:'/legends/brand/logo-256.webp'}}

/**
 * LEGENDS MANAGER — the front door (owner rulebook V1.0, 12.10.2026; replaces FAN LEAGUE behind the same switch). The owner
 * previews while it is off.
 */
export default async function Page({searchParams}:{searchParams?:{club?:string}}){
 const d=await door('fanLeague');if(!d.open)notFound()
 const [owner,clubs,af]=await Promise.all([viewer(false),legendsClubs(),door('allFootball')])
 const idx=owner?await ownerIndex(owner):{v:1 as const,careers:[]}
 const rows=idx.careers.map(c=>({id:c.id,clubName:c.clubName,season:c.season,phase:c.phase,status:c.status}))
 const options:ClubOption[]=clubs.map(c=>({club:c.club,name:c.name,ready:c.verdict==='READY',held:c.held,reason:c.reasons[0]??null,men:c.men,primary:null}))
 const openClubs=options.filter(o=>o.ready&&!o.held).length
 return <Shell locale="en">
  <PreviewRibbon on={d.preview}/>
  <LegendsReveal/>
  <main id="main" className="af lgm">
   <header className="lgm-hero">
    <p className="lgm-edition"><span>ALL FOOTBALL presents</span><span>{openClubs} clubs · their immortals</span></p>
    <Emblem size={340} eager/>
    <h1 className="lgm-hero-name"><span>Legends</span> Manager</h1>
    <p className="lgm-motto">One club. Only the men who wore its shirt. Your dynasty.</p>
    <p className="lgm-lede">Draft seventeen legends from a single club’s whole history, take the board’s money, and run the side season after season — the windows, the team sheet, the touchline, the table.</p>
    {af.open?<p className="af-back-row"><Link className="af-back" href="/all-football">← ALL FOOTBALL</Link></p>:null}
   </header>
   {!canSave()?<p className="lgm-error" role="status">Saving is not available on this server right now, so a career cannot be started. Nothing is lost.</p>:null}
   {rows.length?<Careers rows={rows} max={R.maxActiveCareers}/>:null}
   <ClubRoll clubs={options} canStart={canSave()} full={activeCount(idx)>=R.maxActiveCareers} initial={typeof searchParams?.club==='string'?searchParams.club:null}/>
   <section className="lgm-code" aria-labelledby="lgm-code-h">
    <h2 id="lgm-code-h">The code of the legends</h2>
    <ol>
     <li><b>One club, its own men.</b> Every legend you sign played for your club. Nobody crosses from another — not in the draft, not in a window, not in a friendly.</li>
     <li><b>The founding draft.</b> Seventeen picks and an optional eighteenth, €52M, quotas of GK 2 · DF 6 · MF 6 · FW 3. Before each pick you choose the line; three men are offered — premium, squad and bargain — and three rerolls are yours for the whole draft.</li>
     <li><b>The board backs you.</b> Confirm the squad and the board adds €8M for the first window. Every season after, a grant of €4–10M by results — smaller when the coffers are full.</li>
     <li><b>Two windows a season.</b> Buy and sell inside your club’s history. Sold before he has played for you, a man never makes you money.</li>
     <li><b>The touchline.</b> Watch the quick result or stand at the touchline: up to three stops a match, three changes, tactics you can turn. Cards, bans and injuries are real and carry on.</li>
     <li><b>Stars, not numbers.</b> {GAME_VALUES}</li>
    </ol>
    <p className="lgm-fine">A signing is a time machine: “a 1980s legend” means his recorded years at the club touch the 1980s. It is a fantasy, never a transfer that happened.</p>
   </section>
  </main>
 </Shell>
}

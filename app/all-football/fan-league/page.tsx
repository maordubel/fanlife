import Link from 'next/link'
import {notFound} from 'next/navigation'
import {Shell} from '@/components/master/Shell'
import {PreviewRibbon} from '@/components/experiences/AfFrame'
import {NewCareer,type ClubOption} from '@/components/fan-league/NewCareer'
import {door} from '@/lib/features-server'
import {viewer} from '@/lib/fan-league/owner'
import {leagueClubs} from '@/lib/fan-league/server'
import {canSave,ownerIndex} from '@/lib/fan-league/store'
import '../all-football.css'
import './fan-league.css'
export const dynamic='force-dynamic'
export const metadata={title:'FAN LEAGUE',description:'The heritage manager: one real club, players only from its own history, a season against other clubs.'}

/**
 * FAN LEAGUE — the front door (owner roadmap PR10–14; ADR-fanlife-0011). Behind the `fanLeague` switch; the owner previews.
 */
export default async function Page(){
 const d=await door('fanLeague');if(!d.open)notFound()
 const [owner,clubs,af]=await Promise.all([viewer(false),leagueClubs(),door('allFootball')])
 const mine=owner?(await ownerIndex(owner)).careers:[]
 const options:ClubOption[]=clubs.map(c=>({club:c.club,name:c.name,verdict:c.verdict,held:c.held,reason:c.verdict==='BLOCK'?c.reasons[0]??null:null,decades:c.decades.filter(x=>x.canField).map(x=>({decade:x.decade,men:x.men,full:x.full}))}))
 return <Shell locale="en">
  <PreviewRibbon on={d.preview}/>
  <main id="main" className="af flg">
   <header className="flg-mast">
    <p className="af-edition"><span>ALL FOOTBALL · the manager’s edition</span><span>{options.filter(o=>o.verdict!=='BLOCK'&&!o.held).length} clubs in the league</span></p>
    <h1>Fan <span>League</span></h1>
    <p>One real club. Only men who wore its shirt. Build a side from one decade, strengthen it from the others, and take it through a season.</p>
    {af.open?<p className="af-back-row"><Link className="af-back" href="/all-football">← ALL FOOTBALL</Link></p>:null}
   </header>
   {!canSave()?<p className="flg-error" role="status">Saving is not available on this server right now, so a career cannot be started. Nothing is lost.</p>:null}
   {mine.length?<section className="flg-mine" aria-labelledby="flg-mine-h"><h2 id="flg-mine-h"><span>Your careers</span></h2>
    <ul>{mine.map(c=><li key={c.id}><Link className="min-h-tap" href={`/all-football/fan-league/career/${c.id}`}><b>{c.clubName}</b><small>Home decade {c.decade}s · {c.status==='finished'?'season over':'in season'}</small><span aria-hidden="true">→</span></Link></li>)}</ul>
   </section>:null}
   <NewCareer clubs={options}/>
   <aside className="flg-rules" aria-label="The rules">
    <h2><span>The house rules</span></h2>
    <ol>
     <li><b>Your club, and only your club.</b> Every man you sign played for it. Nobody comes from another club — not in a window, not in a friendly.</li>
     <li><b>A signing is a time machine.</b> “A 1990s man” means his recorded years at the club touch the 1990s. It is a fantasy, never a transfer that happened.</li>
     <li><b>Two windows.</b> Before the first round, and once more at the halfway mark. A sale brings back 80%.</li>
     <li><b>Every result is played on the server</b> from the match log — the goals, the minutes, who scored.</li>
    </ol>
   </aside>
  </main>
 </Shell>
}

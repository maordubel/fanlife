import {headers} from 'next/headers'
import {notFound} from 'next/navigation'
import {ClubSurface} from '@/components/clubs/ClubSurface'
import {GateTickets,type GateState} from '@/components/clubs/GateTickets'
import {Dye} from '@/components/master/Dye'
import {readState} from '@/lib/master/store'
import {loadClub,resolveClubId} from '@/lib/clubs/resolver'
import {gateAccess} from '@/lib/clubs/access'
import {evaluationMode} from '@/lib/master/mode'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme} from '@/lib/clubs/theme'
import {uiLocale} from '@/lib/clubs/locale'
import {SHARED_GATES,gateAvailability} from '@/lib/clubs/gates'
import {gameCopy} from '@/lib/clubs/game-copy'
import {livery} from '@/lib/club-livery'
import {PLAY_GROUPS} from '@/lib/clubs/play-groups'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'
export const dynamic='force-dynamic'
export function generateMetadata({params}:{params:{slug:string}}){const c=REGISTRY.find(r=>r.id===params.slug);return {title:c?`${en.playTitle} · ${c.name}`:en.playTitle}}

/** Play: every gate, grouped by how long it takes — Quick, Deep, From the archive. */
export default async function Play({params,searchParams}:{params:{slug:string};searchParams:{lang?:string}}) {
 const id=resolveClubId(headers().get('host'),params.slug,evaluationMode())
 if(!id)notFound()
 const [state,core]=await Promise.all([readState(),loadClub(id)])
 const c=state.clubs.find(x=>x.id===id)
 if(!c)notFound()
 const locale=uiLocale(searchParams.lang),copy=locale==='he'?he:en,games=gameCopy(locale),lv=livery(id),theme=core?.data.theme||clubTheme(REGISTRY.find(r=>r.id===id)||c)
 const states:GateState[]=core?SHARED_GATES.map(g=>({key:g.key,allowed:gateAccess(c,g.number,evaluationMode()).allowed,playable:gateAvailability(core.data,g.key).playable})):[]
 const anyOpen=states.some(s=>s.allowed&&s.playable)
 const note={quick:copy.playQuickNote,deep:copy.playDeepNote,archive:copy.playArchiveNote},title={quick:copy.playQuick,deep:copy.playDeep,archive:copy.playArchive}
 return <ClubSurface theme={theme} clubId={id} locale={locale}><main id="main" className="mag-home club-play">
  <section className="mag-section"><div className="mag-head mag-homehead"><div><p className="mag-kicker">{copy.playKicker}</p><h1 className="mag-h2">{copy.playTitle}</h1></div><Dye art="net-keeper" className="mag-homenet"/></div>
   {!core||!anyOpen?<div className="panel"><p>{core?copy.playNone:copy.workshopNote}</p></div>
   :PLAY_GROUPS.map(gr=><div key={gr.id} className="club-group" data-group={gr.id}><div className="mag-head"><div><p className="mag-kicker">{title[gr.id]}</p><p className="mag-fine">{note[gr.id]}</p></div></div><GateTickets clubId={id} states={states} keys={gr.keys} locale={locale} games={games} pattern={lv?.pattern} closedNote={c.status==='paused'?copy.paused:games.comingSoon} feature={gr.id==='quick'?2:0}/></div>)}
  </section>
 </main></ClubSurface>
}

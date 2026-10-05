import Link from 'next/link'
import {Mark} from '@/components/master/Shell'
import type {Club} from '@/lib/master/types'
import type {LifeEntry} from '@/lib/clubs/life/entry'
import {clubTheme,themeStyle} from '@/lib/clubs/theme'
import {REGISTRY} from '@/lib/master/registry'

export function ClubCard({club,index,life}:{club:Club;index:number;life?:LifeEntry}) {
 const theme=clubTheme(REGISTRY.find(r=>r.id===club.id)||club)
 return <div className="club-card club-theme" data-club={club.id} data-pattern={theme.pattern} style={themeStyle(theme)}>
  <Link className="club-card-main" href={`/clubs/${club.id}`}>
  <div className="card-top"><small>{String(index+1).padStart(2,'0')} / {club.country}</small><span className={`badge ${club.status}`}>{club.status==='live'?'OPEN GATES':club.status.toUpperCase()}</span></div>
  <div className="club-art"><Mark club={club} theme={theme}/><span>{club.city.toUpperCase()}</span></div><h3>{club.name}</h3>
  <p>{club.status==='live'?'Thirteen gates, one life, generations of memories.':'A new world taking shape through research and local stories.'}</p>
  <div className="card-bottom"><span>{club.status==='live'?`${club.gates.length} gates + LIFE`:'In the workshop'}</span><b>Explore the world ↗</b></div>
 </Link>
  {life&&(life.href?<Link className="club-card-life" data-life-entry={life.state} href={life.href}>Play LIFE ↗</Link>:<span className="club-card-life off" data-life-entry="workshop">LIFE · in the workshop</span>)}
 </div>
}

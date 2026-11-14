import type {Club} from '@/lib/master/types'
import {clubTheme,type ClubTheme} from '@/lib/clubs/theme'
import {crestFor} from '@/lib/clubs/crest'

/** A club's crest where we hold one (owner, 14.11.2026: every club with its crest), else its initials on its own colour.
 *  Its own module: client screens (the control room) draw it, and Shell reads the server store. */
export function Mark({club,theme}:{club:Club;theme?:ClubTheme}) {
 const crest=crestFor(club.id)
 if(crest)return <span className="club-mark club-mark-crest" aria-label={club.name}><img src={crest} alt="" width={64} height={64} loading="lazy" decoding="async" style={{inlineSize:'100%',blockSize:'100%',objectFit:'contain'}}/></span>
 const identity=theme||clubTheme(club)
 return <span className="club-mark" style={{background:identity.primary,color:identity.onPrimary}} aria-label={`${club.name} · ${club.initials}`}>{club.initials}<small>FAN LIFE</small></span>
}

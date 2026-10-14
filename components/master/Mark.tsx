import type {Club} from '@/lib/master/types'
import {clubTheme,type ClubTheme} from '@/lib/clubs/theme'

/** A club's initials on its own colour. Its own module: client screens (the control room) draw it, and Shell reads the server store. */
export function Mark({club,theme}:{club:Club;theme?:ClubTheme}) {
 const identity=theme||clubTheme(club)
 return <span className="club-mark" style={{background:identity.primary,color:identity.onPrimary}} aria-label={`${club.name} · ${club.initials}`}>{club.initials}<small>FAN LIFE</small></span>
}

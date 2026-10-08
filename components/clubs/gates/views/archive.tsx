import {notFound} from 'next/navigation'
import {ClubArchive,type ArchiveTab} from '@/components/clubs/gates/archive/ClubArchive'
import {buildEntries,encodeArchive} from '@/lib/clubs/entities'
import {gateAvailability} from '@/lib/clubs/gates'
import {rumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {forbiddenColor} from '@/lib/clubs/theme'
import {kitViews} from '@/lib/clubs/gate-content'
import type {GateView} from '../types'

const TABS:ArchiveTab[]=['today','time','dig','search','mine']
/**
 * Gate 12 · the Living Archive. The server projects the club's approved archive into entries (lib/clubs/entities.ts) and
 * sends them in a compact wire form; the client presenter owns the five modes. URLs keep working:
 *   ?q=… opens Search · ?today=1 opens Today · ?event=<id> opens that entry's sheet (unknown id → 404) · ?tab=… picks a mode.
 */
export const view:GateView=({club,locale,copy,round,searchParams})=>{
 const entries=buildEntries(club),wire=encodeArchive(entries,club.sources)
 if(searchParams.event&&!entries.some(e=>e.id===searchParams.event))notFound()
 const q=(searchParams.q||'').slice(0,100),asked=searchParams.tab as ArchiveTab|undefined
 const tab:ArchiveTab=q?'search':searchParams.today?'today':TABS.includes(asked as ArchiveTab)?asked!:'today'
 const playable=(k:'xi'|'derby')=>gateAvailability(club,k).playable
 const hasRival=!!club.rivals?.length
 return <ClubArchive club={club.identity.id} clubName={club.identity.name} version={club.version} locale={locale} contentLocale={club.locales.content} copy={copy}
  wire={wire} seed={round.seed} initial={{tab,q,event:searchParams.event||null}}
  links={{xi:playable('xi')?`/clubs/${club.identity.id}/xi?lang=${locale}`:null,derby:hasRival&&playable('derby')?`/clubs/${club.identity.id}/derby?lang=${locale}`:null}}
  wardrobe={rumbleWardrobe(kitViews(club),hex=>forbiddenColor(club.theme,hex))}/>
}

import {notFound} from 'next/navigation'
import {ClubArchive,type ArchiveTab} from '@/components/clubs/gates/archive/ClubArchive'
import {archiveProjection} from '@/lib/clubs/archive-door'
import {gateAvailability} from '@/lib/clubs/gates'
import {rumbleWardrobe} from '@/lib/clubs/rumble-kit'
import {forbiddenColor} from '@/lib/clubs/theme'
import {kitViews} from '@/lib/clubs/gate-content'
import type {GateView} from '../types'

const TABS:ArchiveTab[]=['today','time','dig','search','mine']
/**
 * Gate 12 · the Living Archive. The server projects the club's approved archive into entries (lib/clubs/entities.ts) and
 * sends them in a compact wire form; the client presenter owns the five modes. URLs keep working:
 *   ?q=… opens Search · ?today=1 opens Today · ?event=<id> opens that entry's sheet (unknown id → 404) · ?tab=… picks a mode ·
 *   ?player= / ?match=&on=&score= / ?name=&y= open the entry a game names (lib/clubs/archive-door.ts), else search the name.
 */
export const view:GateView=({club,locale,copy,round,searchParams,allowed})=>{
 const {wire,ids,door}=archiveProjection(club)
 if(searchParams.event&&!ids.has(searchParams.event))notFound()
 // 12.11.2026 — the door every gate links through: ?player=<id> · ?match=<id>&on=<day>&score=<x-y> · ?name=<printed name>&y=<year>.
 // The entry opens when the archive holds it; otherwise the name (when given) is searched — a game's link never ends on a 404.
 const year=Number(searchParams.y)||null,named=(searchParams.name||'').slice(0,100)
 const resolved=searchParams.event||door.player(searchParams.player)||door.match({id:searchParams.match,on:searchParams.on,score:searchParams.score})||door.name(named,year)
 const q=(searchParams.q||(resolved?'':named)).slice(0,100),asked=searchParams.tab as ArchiveTab|undefined
 const tab:ArchiveTab=q?'search':searchParams.today?'today':TABS.includes(asked as ArchiveTab)?asked!:'today'
 // switched on for this club AND playable from its data — the same two checks the target page makes (review F04)
 const playable=(k:'xi'|'derby')=>allowed(k)&&gateAvailability(club,k).playable
 const hasRival=!!club.rivals?.length
 return <ClubArchive club={club.identity.id} clubName={club.identity.name} version={club.version} locale={locale} contentLocale={club.locales.content} copy={copy}
  wire={wire} seed={round.seed} initial={{tab,q,event:resolved||null}}
  links={{xi:playable('xi')?`/clubs/${club.identity.id}/xi?lang=${locale}`:null,derby:hasRival&&playable('derby')?`/clubs/${club.identity.id}/derby?lang=${locale}`:null}}
  wardrobe={rumbleWardrobe(kitViews(club),hex=>forbiddenColor(club.theme,hex))}/>
}

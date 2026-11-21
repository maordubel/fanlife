import {notFound} from 'next/navigation'
import {ClubArchive,type ArchiveTab} from '@/components/clubs/gates/archive/ClubArchive'
import {archiveProjection} from '@/lib/clubs/archive-door'
import {gateAvailability} from '@/lib/clubs/gates'
import {clubWardrobe} from '@/lib/clubs/kit-wardrobe'
import type {GateView} from '../types'
import {door as featureDoor} from '@/lib/features-server'
import {people,peopleFromRepo} from '@/lib/people/registry'
import {MatchReport} from '@/components/clubs/gates/archive/MatchReport'

const TABS:ArchiveTab[]=['today','time','index','dig','search','mine']
/**
 * Gate 12 · the Living Archive. The server projects the club's approved archive into entries (lib/clubs/entities.ts) and
 * sends them in a compact wire form; the client presenter owns the five modes. URLs keep working:
 *   ?tab=index opens the Index (seasons · opponents · competitions · players A–Z, 17.11.2026) · ?q=… opens Search · ?today=1 opens Today · ?event=<id> opens that entry's sheet (unknown id → 404) · ?tab=… picks a mode ·
 *   ?player= / ?match=&on=&score= / ?name=&y= open the entry a game names (lib/clubs/archive-door.ts), else search the name.
 */
export const view:GateView=async({club,locale,copy,round,searchParams,allowed})=>{
 if(searchParams.report){
  const match=club.matches?.find(f=>f.id===searchParams.report&&f.status==='approved')
  if(!match)notFound()
  return <MatchReport match={match} club={club} locale={locale} event={searchParams.event}/>
 }
 const {wire,ids,door,index}=archiveProjection(club)
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
 // People Registry (18.11.2026): a player entry opens his one profile across every club, when profiles are open (or the owner previews)
 const profiles=(await featureDoor('profiles')).open?await peopleFor(club.identity.id,ids):undefined
 return <ClubArchive club={club.identity.id} clubName={club.identity.name} version={club.version} locale={locale} contentLocale={club.locales.content} copy={copy}
  wire={wire} index={index} seed={round.seed} initial={{tab,q,event:resolved||null}}
  links={{xi:playable('xi')?`/clubs/${club.identity.id}/xi?lang=${locale}`:null,derby:hasRival&&playable('derby')?`/clubs/${club.identity.id}/derby?lang=${locale}`:null,...(profiles?{profiles}:{})}}
  wardrobe={clubWardrobe(club)}/>
}

/** entry id → person id for this club's player entries (a player entry's id is his record id) */
async function peopleFor(clubId:string,ids:ReadonlySet<string>):Promise<Record<string,string>>{
 const reg=await people().catch(()=>peopleFromRepo()),out:Record<string,string>={}
 for(const id of ids){const p=reg.personOf(clubId,id);if(p)out[id]=p.id}
 return out
}

import {ClubMemory} from '@/components/clubs/gates/memory/ClubMemory'
import {eligibleArchive} from '@/lib/clubs/archive'
import {clubMemory} from '@/lib/clubs/games'
import type {GateView} from '../types'

/**
 * Gate 6 · the Memory Wall. The server deals the wall (six pairs from the club's own record) and resolves, ONCE,
 * which pairs have a real entry in the club's living archive — a link is drawn only for those, never to nothing.
 */
export const view:GateView=({club,locale,copy,round,gameKey,searchParams})=>{
 const memory=clubMemory(club,round.seed,round.cursor),held=new Set(eligibleArchive(club).map(f=>f.id))
 const links:Record<string,string>={}
 for(const p of memory.pairs)if(held.has(p.id))links[p.id]=`/clubs/${club.identity.id}/archive?${new URLSearchParams({event:p.id,lang:locale})}`
 return <ClubMemory key={gameKey} round={memory} club={club.identity.id} clubName={club.identity.name} version={club.version} seed={round.seed} cursor={round.cursor}
  locale={locale} contentLocale={club.locales.content} copy={copy} links={links} autostart={searchParams.go==='1'}/>
}

import {ClubDerby} from '@/components/clubs/gates/derby/ClubDerby'
import {rivalsOf} from '@/lib/clubs/gate-content'
import {wallOf} from '@/lib/clubs/derby-model'
import {meetingsBetween} from '@/lib/fixtures/meetings'
import type {GateView} from '../types'

/** Gate 11 · Rivalry Wall — the approved rival and the meetings the archives document, nothing else. */
export const view:GateView=async({club,locale,copy,round,searchParams})=>{
 const rival=rivalsOf(club)[0];if(!rival)return null
 const value=rival.value as {name:string;aliases?:unknown;note?:unknown}
 const aliases=Array.isArray(value.aliases)?value.aliases.filter((a):a is string=>typeof a==='string'):[]
 const meetings=wallOf(await meetingsBetween(club.identity.id,value.name,aliases))
 const tab=searchParams.play==='1'?'call':(['wall','call','record'] as const).find(k=>k===searchParams.tab)??'wall'
 return <ClubDerby club={club.identity.id} clubName={club.identity.name} rival={value.name} rivalNote={typeof value.note==='string'&&value.note?value.note:null} meetings={meetings} version={club.version} seed={round.seed} cursor={round.cursor} locale={locale} contentLocale={club.locales.content} copy={copy} initialTab={tab} autoStart={searchParams.play==='1'}/>
}

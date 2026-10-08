import {DerbyWall} from '@/components/clubs/games/DerbyWall'
import {rivalsOf} from '@/lib/clubs/gate-content'
import {meetingsBetween,tallyOf} from '@/lib/fixtures/meetings'
import type {GateView} from '../types'
export const view:GateView=async({club,locale,copy})=>{
 const rival=rivalsOf(club)[0];if(!rival)return null
 const aliases=Array.isArray((rival.value as {aliases?:unknown}).aliases)?((rival.value as {aliases?:string[]}).aliases||[]):[]
 const ms=await meetingsBetween(club.identity.id,rival.value.name,aliases),t=tallyOf(ms)
 return <DerbyWall rival={rival.value.name} meetings={ms} tally={t} copy={{sub:copy.derbySub,rival:copy.derbyRival,meetings:copy.derbyMeetings,none:copy.derbyNone,won:copy.derbyWon,drawn:copy.derbyDrawn,lost:copy.derbyLost,goals:copy.derbyGoals,biggest:copy.derbyBiggest,decade:copy.derbyDecade,more:copy.derbyMore}} locale={locale} contentLocale={club.locales.content}/>
}

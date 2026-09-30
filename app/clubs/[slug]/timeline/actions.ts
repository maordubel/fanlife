'use server'
import {requestClub} from '@/lib/clubs/request'
import {clubTimeline} from '@/lib/clubs/timeline'
/** Re-resolve the server tenant on every move; stale or cross-club payloads fail closed. */
export async function placeCard(slug:string,version:string,cardId:string,seed:number,placed:number,slot:number,cursor:number) {
 if(typeof slug!=='string'||slug.length>100||typeof version!=='string'||typeof cardId!=='string')return null
 const resolved=await requestClub(slug)
 if(!resolved||resolved.data.version!==version)return null
 const game=clubTimeline(resolved.data)
 if(!game.available)return null
 const verdict=game.gradeInsert(seed,placed,slot,cursor)
 return verdict?.card.id===cardId?verdict:null
}

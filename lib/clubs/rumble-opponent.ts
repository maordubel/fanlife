import 'server-only'
import {requestClub} from '@/lib/clubs/request'
import {ratedPool,dealDraft,checkFive,type Opponent,type Rated} from '@/lib/clubs/rumble'
import {decodeDuel} from '@/lib/clubs/rumble-duel'
/**
 * Who a player faces in gate 9: the classic rival from his own club, an AI rival from ANOTHER club (`vs`), or a friend's locked five
 * (`duel`, a link). The opponent is rebuilt here from the page's own parameters — the browser never names a rating or a card it did not
 * see — and a friend's five is only accepted if the board its seed deals really offered it and it fits the budget.
 */
export async function opponentFor(slug:string,own:Rated[],vs?:string,duel?:string):Promise<Opponent|null>{
 if(duel){
  const t=decodeDuel(duel);if(!t)return null
  const a=await requestClub(t.c,9);if(!a||!a.data.gates['royal-rumble']?.playable)return null
  const pool=ratedPool(a.data),offered=new Set(dealDraft(pool,t.s).flat().map(c=>c.id))
  if(!t.p.every(id=>offered.has(id)))return null
  const cards=checkFive(pool,t.p);return cards?{kind:'locked',cards,club:t.c}:null
 }
 if(vs&&vs!==slug){
  const b=await requestClub(vs,9);if(!b||!b.data.gates['royal-rumble']?.playable)return null
  return {kind:'club',pool:ratedPool(b.data)}
 }
 return {kind:'self'}
}

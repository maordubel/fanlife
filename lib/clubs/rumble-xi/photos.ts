import 'server-only'
import type {ClubData} from '@/lib/clubs/contract'
import type {Rated} from '@/lib/clubs/rumble'
import {resolvePlayer} from '@/lib/archive/player-master'
import {playerShirt} from '@/lib/kit/playerShirt'
/**
 * Hapoel Tel Aviv's men wear the ORIGINAL shirt of their period — a photograph from the kit archive (owner, 24.9.2026: the original shirt first, our drawing only
 * when there is no photograph). THE WORKER's resolver does the choosing (`playerShirt`: exact season → same season, other variant → inside his spell → ±1 season);
 * a drawing it falls back to is not used here: the card then wears the club's documented kit by the Rumble's own rule. Matching a card to the master record is
 * by his exact archive name (rule 7).
 */
export type CardPhoto={src:string;label:string}
export function hapoelPhotos(data:ClubData,pool:readonly Pick<Rated,'id'|'position'>[]):Record<string,CardPhoto>{
 if(data.identity?.id!=='hapoel-tel-aviv')return {}
 const names=new Map((data.players||[]).map(f=>[f.value.id,f.value.name])),out:Record<string,CardPhoto>={}
 for(const c of pool){const name=names.get(c.id);const m=name?resolvePlayer(name):null;if(!m)continue
  const s=playerShirt(m,{keeper:c.position==='GK'});if(s.kind!=='photo')continue
  out[c.id]={src:s.src,label:`${s.seasonLabel}${s.approx?' ≈':''}`}}
 return out
}

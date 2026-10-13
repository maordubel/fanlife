import 'server-only'
import {kitViews} from '@/lib/clubs/gate-content'
import {loadClub} from '@/lib/clubs/resolver'

/**
 * The marks a club's documented shirts carry — maker and sponsor, by kit id — so the squad cards can print the shirt the
 * way the archive records it (the wardrobe the Royal Rumble hands over keeps only colours and a design). Lettered on the cloth,
 * never a logo (rule 25); a kit with neither is left out.
 */
export type KitMarks=Record<string,{maker:string|null;sponsor:string|null}>
export async function kitMarks(club:string):Promise<KitMarks>{
 const r=await loadClub(club).catch(()=>null);if(!r)return {}
 return Object.fromEntries(kitViews(r.data).filter(k=>k.maker||k.sponsor).map(k=>[k.id,{maker:k.maker?.trim()||null,sponsor:k.sponsor?.trim()||null}]))
}

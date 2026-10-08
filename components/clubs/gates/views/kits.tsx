import {KitStudio} from '@/components/clubs/gates/kits/KitStudio'
import {livery} from '@/lib/club-livery'
import {collectionOf,gate4Playable,studioLimits} from '@/lib/clubs/kit-collection'
import type {GateView} from '../types'

/** Gate 5 · The Kit Studio — the club's documented shirts as a collection, and a free designer for your own FAN DESIGN. */
export const view:GateView=({club,locale,copy,searchParams})=>{
 const rows=collectionOf(club),kit=typeof searchParams.kit==='string'?searchParams.kit:null
 return <KitStudio club={club.identity.id} clubName={club.identity.name} locale={locale} contentLocale={club.locales.content} copy={copy} monogram={livery(club.identity.id)?.initials??''} limits={studioLimits(club)} rows={rows} gate4={gate4Playable(club)} focusKit={kit&&rows.some(r=>r.id===kit)?kit:null}/>
}

import {KitStudio} from '@/components/clubs/gates/kits/KitStudio'
import {livery} from '@/lib/club-livery'
import {collectionOf,gate4Playable,identityOf,studioLimits} from '@/lib/clubs/kit-collection'
import {clubKitPhoto} from '@/lib/clubs/kitArchive'
import {cfsPhoto} from '@/lib/clubs/kit-cfs'
import type {GateView} from '../types'

/**
 * Gate 5 · The Kit Studio — a free studio in the club's own approved colours, the club's documented shirts as a shelf, and an
 * earned collection from Build the Kit. Three separate things (KS-R01): none of them is a market, and nothing here sells.
 */
export const view:GateView=({club,locale,copy,searchParams})=>{
 const rows=collectionOf(club),kit=typeof searchParams.kit==='string'?searchParams.kit:null
 const photos:Record<string,string>={};for(const r of rows)if(r.open){const p=clubKitPhoto(club.identity.id,r.id)??cfsPhoto(club.identity.id,r.season,r.variant);if(p)photos[r.id]=p}
 const shared=typeof searchParams.design==='string'?searchParams.design.slice(0,1200):null
 return <KitStudio club={club.identity.id} clubName={club.identity.name} locale={locale} contentLocale={club.locales.content} copy={copy} monogram={livery(club.identity.id)?.initials??''} limits={studioLimits(club)} identity={identityOf(club)} rows={rows} gate4={gate4Playable(club)} focusKit={kit&&rows.some(r=>r.id===kit)?kit:null} sharedDesign={shared} photos={photos}/>
}

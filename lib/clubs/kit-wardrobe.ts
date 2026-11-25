import 'server-only'

import type {ClubData} from './contract'
import {kitViews,type KitView} from './gate-content'
import {kitPartsFor} from './kit-parts'
import {kitArt} from './kit-sources'
import {rumbleWardrobe} from './rumble-kit'

export function kitVisual(club:string,kit:KitView){
 const art=kitArt(club,kit.id,kit.season,kit.type,kit.also)
 return {svg:art?.svg,parts:kitPartsFor(club,kit)}
}

export function clubWardrobe(club:ClubData,_forbidden?: (hex:string)=>boolean){
 return rumbleWardrobe(kitViews(club),()=>false,kit=>kitVisual(club.identity.id,kit))
}

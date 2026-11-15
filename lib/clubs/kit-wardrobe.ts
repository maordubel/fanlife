import 'server-only'

import type {ClubData} from './contract'
import {kitViews,type KitView} from './gate-content'
import {kitPartsFor} from './kit-parts'
import {kitArt} from './kit-sources'
import {rumbleWardrobe} from './rumble-kit'
import {forbiddenColor} from './theme'

export function kitVisual(club:string,kit:KitView){
 const art=kitArt(club,kit.id,kit.season,kit.type,kit.also)
 return {svg:art?.svg,parts:kitPartsFor(club,kit)}
}

export function clubWardrobe(club:ClubData,forbidden=(hex:string)=>forbiddenColor(club.theme,hex)){
 return rumbleWardrobe(kitViews(club),forbidden,kit=>kitVisual(club.identity.id,kit))
}

import 'server-only'

import aek from '@/content/manual/kit-aek-athens.json'
import celtic from '@/content/manual/kit-archive-celtic.json'
import panathinaikos from '@/content/manual/kit-archive-panathinaikos.json'
import stPauli from '@/content/manual/kit-archive-st-pauli.json'
import zrinjski from '@/content/manual/kit-archive-zrinjski-mostar.json'
import olympiacos from '@/content/manual/kit-archive-olympiacos.json'
import hta from '@/content/manual/kit-archive-hapoel-tel-aviv.json'
import hapoelPetahTikva from '@/content/manual/kit-archive-hapoel-petah-tikva.json'

/**
 * The picture files that belong to a club's kits: the catalogue's source image, our SVG drawing and the small icon, each served from
 * `public/club-kits/<club>/` (built by `scripts/kits/make-club-kits.py` and `export-kit-*.mjs`, see docs/fanlife/41-aek-kit-archive.md).
 * A kit finds its files by id (the catalogue kits of a wave keep their `cof-k-NN` id) and otherwise by season and type, so a kit the
 * club pack already held from another source still shows the catalogue's picture of the same shirt.
 */
export type KitArtRow={id:string;season:string;type:string;euro:boolean;image?:string|null;shirt?:{artwork?:unknown}}
type Row=KitArtRow
type Art={image:string|null;svg:string;icon:string;illustrated:boolean}
const FILES:Record<string,Row[]>={
 'aek-athens':aek.kits as Row[],celtic:celtic.kits as Row[],panathinaikos:panathinaikos.kits as Row[],'st-pauli':stPauli.kits as Row[],
 'zrinjski-mostar':zrinjski.kits as Row[],'hapoel-petah-tikva':hapoelPetahTikva.kits as Row[],olympiacos:olympiacos.kits as Row[],'hapoel-tel-aviv':hta.kits as Row[],
}
const art=(club:string,r:Row):Art=>({image:r.image??null,svg:`/club-kits/${club}/svg/${r.id}.svg`,icon:`/club-kits/${club}/icons/${r.id}.svg`,illustrated:!!r.shirt?.artwork})
/** Prefer a real photo; otherwise show a record-specific illustration when available. */
export function kitArchiveImage(photo:string|null|undefined,artwork:Art|null):string|null{
 return photo??(artwork?.illustrated?artwork.svg:artwork?.image)??null
}
/** An exact id wins. Fallback is safe only if the season and type identify one candidate. */
export function matchKitArt(rows:readonly Row[],club:string,kitId:string,season:string,type:string,also:readonly string[]=[]):Row|null{
 const idOf=(s:string)=>s.startsWith(`${club}:`)?s.slice(club.length+1):s
 const exact=rows.find(r=>r.id===idOf(kitId))
 if(exact)return exact
 const ids=new Set(also.map(idOf)),aliased=rows.filter(r=>ids.has(r.id))
 if(aliased.length)return aliased.length===1?aliased[0]!:null
 const candidates=rows.filter(r=>r.season===season&&r.type.toLowerCase()===type.toLowerCase()&&!r.euro&&r.image)
 return candidates.length===1?candidates[0]!:null
}
export function kitArt(club:string,kitId:string,season:string,type:string,also:readonly string[]=[]):Art|null{
 const rows=FILES[club];if(!rows)return null
 const hit=matchKitArt(rows,club,kitId,season,type,also)
 return hit?art(club,hit):null
}
export const clubHasKitArt=(club:string)=>Object.hasOwn(FILES,club)

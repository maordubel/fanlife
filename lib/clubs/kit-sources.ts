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
type Row={id:string;season:string;type:string;euro:boolean;image?:string|null}
type Art={image:string|null;svg:string;icon:string}
const FILES:Record<string,Row[]>={
 'aek-athens':aek.kits as Row[],celtic:celtic.kits as Row[],panathinaikos:panathinaikos.kits as Row[],'st-pauli':stPauli.kits as Row[],
 'zrinjski-mostar':zrinjski.kits as Row[],'hapoel-petah-tikva':hapoelPetahTikva.kits as Row[],olympiacos:olympiacos.kits as Row[],'hapoel-tel-aviv':hta.kits as Row[],
}
const art=(club:string,r:Row):Art=>({image:r.image??null,svg:`/club-kits/${club}/svg/${r.id}.svg`,icon:`/club-kits/${club}/icons/${r.id}.svg`})
export function kitArt(club:string,kitId:string,season:string,type:string):Art|null{
 const rows=FILES[club];if(!rows)return null
 const id=kitId.replace(`${club}:`,'')
 const hit=rows.find(r=>r.id===id)??rows.find(r=>r.season===season&&r.type===type.toLowerCase()&&!r.euro&&r.image)
 return hit?art(club,hit):null
}
export const clubHasKitArt=(club:string)=>Object.hasOwn(FILES,club)

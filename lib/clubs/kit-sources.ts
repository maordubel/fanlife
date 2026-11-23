import 'server-only'

import aekSvg from '@/public/club-kits/aek-athens/svg/index.json'
import ahlySvg from '@/public/club-kits/al-ahly/svg/index.json'
import atalantaSvg from '@/public/club-kits/atalanta/svg/index.json'
import celticSvg from '@/public/club-kits/celtic/svg/index.json'
import petahSvg from '@/public/club-kits/hapoel-petah-tikva/svg/index.json'
import htaSvg from '@/public/club-kits/hapoel-tel-aviv/svg/index.json'
import haifaSvg from '@/public/club-kits/maccabi-haifa/svg/index.json'
import olympiacosSvg from '@/public/club-kits/olympiacos/svg/index.json'
import panathinaikosSvg from '@/public/club-kits/panathinaikos/svg/index.json'
import rajaSvg from '@/public/club-kits/raja-casablanca/svg/index.json'
import pauliSvg from '@/public/club-kits/st-pauli/svg/index.json'
import wydadSvg from '@/public/club-kits/wydad-casablanca/svg/index.json'
import zrinjskiSvg from '@/public/club-kits/zrinjski-mostar/svg/index.json'
import fenerbahceSvg from '@/public/club-kits/fenerbahce/svg/index.json'
import partizanSvg from '@/public/club-kits/partizan-belgrade/svg/index.json'
import {kitTypeKey} from './kit-model'

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
export type KitArtRow={id:string;season:string;type:string;euro:boolean;image?:string|null;indexed?:boolean;readUnsure?:boolean;reference?:string}
type Row=KitArtRow
type Art={image:string|null;svg:string;icon:string;preview:string|null;approximate:boolean;reference:string|null}
const CATALOGUE:Record<string,Row[]>={
 'aek-athens':aek.kits as Row[],celtic:celtic.kits as Row[],panathinaikos:panathinaikos.kits as Row[],'st-pauli':stPauli.kits as Row[],
 'zrinjski-mostar':zrinjski.kits as Row[],'hapoel-petah-tikva':hapoelPetahTikva.kits as Row[],olympiacos:olympiacos.kits as Row[],'hapoel-tel-aviv':hta.kits as Row[],
}
const INDEX:Record<string,readonly Omit<Row,'euro'>[]>={
 'aek-athens':aekSvg.kits,
 fenerbahce:fenerbahceSvg.kits,
 'partizan-belgrade':partizanSvg.kits,
 'al-ahly':ahlySvg.kits,
 'atalanta':atalantaSvg.kits,
 'celtic':celticSvg.kits,
 'hapoel-petah-tikva':petahSvg.kits,
 'hapoel-tel-aviv':htaSvg.kits,
 'maccabi-haifa':haifaSvg.kits,
 'olympiacos':olympiacosSvg.kits,
 'panathinaikos':panathinaikosSvg.kits,
 'raja-casablanca':rajaSvg.kits,
 'st-pauli':pauliSvg.kits,
 'wydad-casablanca':wydadSvg.kits,
 'zrinjski-mostar':zrinjskiSvg.kits,
}

// The generated index lists shipped drawings. The catalogue supplies photos and specific competition variants.
const FILES:Record<string,Row[]>=Object.fromEntries(Object.entries(INDEX).map(([club,rows])=>{
 const catalogue=new Map(CATALOGUE[club]?.map(row=>[row.id,row])??[])
 return [club,rows.map(row=>({...row,euro:false,...catalogue.get(row.id),indexed:true}))]
}))
const art=(club:string,r:Row):Art=>({image:r.image??null,svg:`/club-kits/${club}/svg/${r.id}.svg`,icon:`/club-kits/${club}/icons/${r.id}.svg`,preview:club==='atalanta'?`/club-kits/${club}/previews/${r.id}.webp`:null,approximate:!!r.readUnsure,reference:r.reference??null})
const seasonKey=(season:string)=>season.replace(/\s/g,'').replace(/[-–]/g,'/').replace(/\/(\d{2})(\d{2})$/,'/$2')
/** An exact id wins. Fallback is safe only if the season and type identify one candidate. */
export function matchKitArt(rows:readonly Row[],club:string,kitId:string,season:string,type:string,also:readonly string[]=[]):Row|null{
 const idOf=(s:string)=>s.startsWith(`${club}:`)?s.slice(club.length+1):s
 const exact=rows.find(r=>r.id===idOf(kitId))
 if(exact)return exact
 const ids=new Set(also.map(idOf)),aliased=rows.filter(r=>ids.has(r.id))
 if(aliased.length)return aliased.length===1?aliased[0]!:null
 if(['atalanta','fenerbahce','partizan-belgrade'].includes(club))return null
 const candidates=rows.filter(r=>seasonKey(r.season)===seasonKey(season)&&kitTypeKey(r.type)===kitTypeKey(type)&&!r.euro&&(r.indexed||r.image))
 return candidates.length===1?candidates[0]!:null
}
export function kitArt(club:string,kitId:string,season:string,type:string,also:readonly string[]=[]):Art|null{
 const rows=FILES[club];if(!rows)return null
 const hit=matchKitArt(rows,club,kitId,season,type,also)
 return hit?art(club,hit):null
}
export const clubHasKitArt=(club:string)=>Object.hasOwn(FILES,club)

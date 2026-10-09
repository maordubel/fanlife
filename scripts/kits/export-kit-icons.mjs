// One small shirt icon per kit, from the CC0 football-kit-icons outlines, recoloured with the kit's measured colours.
// node scripts/kits/export-kit-icons.mjs <club> [data.json]
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
const club=process.argv[2];if(!club){console.error('usage: export-kit-icons.mjs <club> [data.json]');process.exit(1)}
const data=JSON.parse(readFileSync(process.argv[3]||`content/manual/kit-archive-${club}.json`,'utf8'))
const T={plain:'plain_red',stripes:'stripes_gold_maroon',pinstripes:'stripes_gold_maroon',hoops:'hoops_blue_navy','half-and-half':'halves_black_red',sash:'sash_white_red','chest band':'band_gold_maroon',diagonal:'diagonal_white_red','contrasting sleeves':'sleeves_blue_navy',gradient:'plain_red',graphic:'plain_red'}
const tpl=Object.fromEntries([...new Set(Object.values(T))].map(n=>[n,readFileSync(`scripts/kits/icon-templates/${n}.svg`,'utf8')]))
mkdirSync(`public/club-kits/${club}/icons`,{recursive:true})
let n=0
for(const k of data.kits){
  const name=T[k.shirt.design]||'plain_red',src=tpl[name],fills=[...new Set([...src.matchAll(/fill="(#[0-9a-fA-F]{3,6})"/g)].map(m=>m[1]))]
  const hexes=k.shirt.colours.map(c=>k.shirt.hex[c]);const want=fills.length>1?[hexes[0],hexes[1]||hexes[0]]:[hexes[0]]
  let svg=src;fills.forEach((f,i)=>{svg=svg.split(`fill="${f}"`).join(`fill="@@${i}"`)});want.forEach((h,i)=>{svg=svg.split(`fill="@@${i}"`).join(`fill="${h}"`)})
  svg=svg.replace('<?xml version="1.0" encoding="UTF-8" standalone="no"?>','<?xml version="1.0" encoding="UTF-8"?>\n<!-- Shirt outline: dwdyer/football-kit-icons, CC0 1.0. Colours: measured from the kit drawing. -->').replace('height="100%" width="100%"','height="112" width="127"').replace(/(<svg[^>]*>)/,`$1<title>${club} ${k.type} ${k.season}</title>`)
  writeFileSync(`public/club-kits/${club}/icons/${k.id}.svg`,svg);n++
}
console.log(club,n,'icons')

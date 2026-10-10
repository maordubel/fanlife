/**
 * Which crest prints on each Hapoel Tel Aviv shirt of the archive: the era the season belongs to (content/manual/crest-versions.json — the club's own
 * history page) and the artwork of that era (lib/kit/crestMarks.ts), the dark/light variant by the shirt's own base colour (rule 25: the variant follows
 * the cloth). An era with no artwork prints no crest (rule 25: print it or leave the slot empty). Writes content/manual/kit-crests-hapoel-tel-aviv.json.
 * Usage: npx tsx scripts/kits/hta-crests.ts
 */
import {readFileSync,writeFileSync} from 'node:fs'
import {crestArt} from '../../lib/kit/crestMarks'
const timeline=(JSON.parse(readFileSync('content/manual/crest-versions.json','utf8')) as {records:{fromYear:number;imageKey:string|null}[]}).records
const keyFor=(year:number)=>{const row=[...timeline].filter(r=>r.fromYear<=year).sort((a,b)=>b.fromYear-a.fromYear)[0];return row?row.imageKey:null}
const kits=(JSON.parse(readFileSync('content/manual/kit-archive-hapoel-tel-aviv.json','utf8')) as {kits:{season:string;type:string;shirt:{colours:string[]}}[]}).kits
const out:Record<string,string|null>={}
for(const k of kits){
 const year=Number(k.season.slice(0,4)),base=k.shirt.colours[0]??'white',dark=['red','black','navy','maroon','blue','grey'].includes(base)
 out[`${k.season}|${k.type}`]=crestArt(keyFor(year),dark,year)
}
writeFileSync('content/manual/kit-crests-hapoel-tel-aviv.json',JSON.stringify(out,null,1))
console.log(Object.entries(out).map(([k,v])=>`${k} ${v}`).join('\n'))

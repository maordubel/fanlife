// One standalone SVG per kit of a club: node scripts/kits/export-kit-svgs.mjs <club> [data.json]
// The drawing is scripts/kits/kit-render.js (the same code the archive page inlines); the crest is embedded so the file stands alone.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
const club=process.argv[2];if(!club){console.error('usage: export-kit-svgs.mjs <club> [data.json]');process.exit(1)}
const data=JSON.parse(readFileSync(process.argv[3]||`content/manual/kit-archive-${club}.json`,'utf8'))
const SPONSOR_TYPE=readFileSync('content/manual/sponsor-type.json','utf8')
const MARKS=readFileSync('content/manual/maker-marks.json','utf8')
const RESOLVE_SRC=src=>{const f='public'+src,ext=src.split('.').pop();const mime={webp:'image/webp',svg:'image/svg+xml',png:'image/png'}[ext]||'application/octet-stream';return existsSync(f)?`data:${mime};base64,`+readFileSync(f).toString('base64'):src}
globalThis.__resolve=RESOLVE_SRC
const {kitSVG}=new Function('const RESOLVE=globalThis.__resolve;const SPONSOR_TYPE='+SPONSOR_TYPE+';const MARKS='+MARKS+';'+readFileSync('scripts/kits/kit-render.js','utf8')+';return {kitSVG}')()
const crestFile=`public/club-kits/${club}/crest-96.png`
const crest=existsSync(crestFile)?'data:image/png;base64,'+readFileSync(crestFile).toString('base64'):null
mkdirSync(`public/club-kits/${club}/svg`,{recursive:true})
let n=0
// a club with an era crest table (Hapoel Tel Aviv: kit-crests-<club>.json) prints the crest of each shirt's own era; an era with no artwork prints none (rule 25)
const eraFile=`content/manual/kit-crests-${club}.json`,era=existsSync(eraFile)?JSON.parse(readFileSync(eraFile,'utf8')):null
const eraCrest=p=>{if(!p)return null;const f=`public/club-kits/${club}/crests/${p.split('/').pop()}`;return existsSync(f)?'data:image/png;base64,'+readFileSync(f).toString('base64'):null}
for(const k of data.kits){
  const svg=kitSVG({...k,crest:era?eraCrest(era[`${k.season}|${k.type}`]):crest},`${club} ${k.type} ${k.season}`).replace('<svg ','<svg xmlns:xlink="http://www.w3.org/1999/xlink" ')
  writeFileSync(`public/club-kits/${club}/svg/${k.id}.svg`,svg);n++
}
console.log(club,n,'svgs',crest?'with crest':'no crest')

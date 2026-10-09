// One standalone SVG per kit of a club: node scripts/kits/export-kit-svgs.mjs <club> [data.json]
// The drawing is scripts/kits/kit-render.js (the same code the archive page inlines); the crest is embedded so the file stands alone.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
const club=process.argv[2];if(!club){console.error('usage: export-kit-svgs.mjs <club> [data.json]');process.exit(1)}
const data=JSON.parse(readFileSync(process.argv[3]||`content/manual/kit-archive-${club}.json`,'utf8'))
const SPONSOR_TYPE=readFileSync('content/manual/sponsor-type.json','utf8')
const MARKS=readFileSync('content/manual/maker-marks.json','utf8')
const {kitSVG}=new Function('const SPONSOR_TYPE='+SPONSOR_TYPE+';const MARKS='+MARKS+';'+readFileSync('scripts/kits/kit-render.js','utf8')+';return {kitSVG}')()
const crestFile=`public/club-kits/${club}/crest-96.png`
const crest=existsSync(crestFile)?'data:image/png;base64,'+readFileSync(crestFile).toString('base64'):null
mkdirSync(`public/club-kits/${club}/svg`,{recursive:true})
let n=0
for(const k of data.kits){
  const svg=kitSVG({...k,crest},`${club} ${k.type} ${k.season}`).replace('<svg ','<svg xmlns:xlink="http://www.w3.org/1999/xlink" ')
  writeFileSync(`public/club-kits/${club}/svg/${k.id}.svg`,svg);n++
}
console.log(club,n,'svgs',crest?'with crest':'no crest')

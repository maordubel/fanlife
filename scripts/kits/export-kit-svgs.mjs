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
let n=0;const index=[]
// a club with an era crest table (Hapoel Tel Aviv: kit-crests-<club>.json) prints the crest of each shirt's own era; an era with no artwork prints none (rule 25)
const eraFile=`content/manual/kit-crests-${club}.json`,era=existsSync(eraFile)?JSON.parse(readFileSync(eraFile,'utf8')):null
// the club's own copy first, then the brand library the table points at (17.11.2026: only 4 of the 12 era crests had a club copy, so 43 Hapoel shirts printed none)
const eraCrest=p=>{if(!p)return null;const f=[`public/club-kits/${club}/crests/${p.split('/').pop()}`,`public${p}`].find(x=>existsSync(x));return f?'data:image/png;base64,'+readFileSync(f).toString('base64'):null}
for(const k of data.kits){
  const label=`${club} ${k.type} ${k.season}`,attr=(n,v)=>v==null||v===''?'':` data-${n}="${String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}"`
  // every drawing is tagged with its club, season, type, maker, sponsor and where it was read from, so a file can be found and filtered without the data
  const tags=attr('club',club)+attr('kit',k.id)+attr('season',k.season)+attr('type',k.type)+attr('design',k.shirt.design)+attr('maker',k.maker)+attr('sponsor',k.sponsor)+attr('origin',k.origin)+attr('read-unsure',k.readUnsure?'true':'false')+attr('reference',k.sourceUrl)
  const shirtCrest=k.crestOmitted?null:era?eraCrest(era[`${k.season}|${k.type}`]):crest
  const svg=kitSVG({...k,crest:shirtCrest},label)
    .replace('<svg ','<svg xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"'+tags+' ')
    .replace(/<g data-layer="([a-z-]+)"/g,'<g id="layer-$1" inkscape:groupmode="layer" inkscape:label="$1" data-layer="$1"').replace(/(<svg [^>]*>)/,`$1<title>${label.replace(/[&<>]/g,'')}${k.sponsor?' · '+String(k.sponsor).replace(/[&<>]/g,''):''}</title>`)
  index.push({id:k.id,season:k.season,type:k.type,design:k.shirt.design,maker:k.maker??null,sponsor:k.sponsor??null,origin:k.origin,readUnsure:!!k.readUnsure,crest:!!(shirtCrest||k.shirt.artwork?.crestSrc),...(k.sourceUrl?{reference:k.sourceUrl}:{}),...(k.assetSources&&Object.keys(k.assetSources).length?{assetSources:k.assetSources}:{})})
  writeFileSync(`public/club-kits/${club}/svg/${k.id}.svg`,svg);n++
}
writeFileSync(`public/club-kits/${club}/svg/index.json`,JSON.stringify({club,count:n,kits:index})+'\n')
console.log(club,n,'svgs',crest?'with crest':'no crest')
// a redrawn shirt is a new URL at the edge (see stamp-kit-art-version.mjs)
const {stamp}=await import('./stamp-kit-art-version.mjs');stamp()

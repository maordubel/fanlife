/**
 * kits:svgs — a drawing for EVERY approved kit of every open club (12.11.2026).
 *
 * The kit archives (content/manual/kit-archive-<club>.json) already draw the catalogue shirts with their measured colours. Every
 * other approved kit in a club's compiled pack (Football Kit Archive, club launches, the research waves) had no drawing. This adds
 * them, through the same renderer (scripts/kits/kit-render.js, via export-kit-svgs.mjs): the shirt in its documented design and
 * colours, the maker's mark (a real mark where content/manual/maker-marks.json holds one, else lettered) and the sponsor lettered
 * (rule 25: never a redrawn logo). A kit whose record names no colour is NOT drawn — a guess at a shirt is not a shirt (rule 11);
 * the run lists how many were skipped for that reason. An archive kit always wins over a pack kit of the same season and type.
 *
 * Output: content/generated/kit-svgs/<club>.json (the joined list the export reads) → public/club-kits/<club>/svg/*.svg + index.json
 *   npm run kits:svgs [-- --club raja-casablanca]
 */
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import sharp from 'sharp'
process.env.FANLIFE_PRECOMPILED='off'
const arg=(k:string)=>{const i=process.argv.indexOf('--'+k);return i<0?null:process.argv[i+1]??null}
/** the colour words the records use → the ink they are drawn in (shades of the magazine's own palette where one exists) */
const INK:Record<string,string>={
 white:'#ffffff',cream:'#f1e8cf',ivory:'#f4ecd8',black:'#111111',red:'#c8102e',crimson:'#a6192e',maroon:'#7a1f2b',burgundy:'#6d1a36',claret:'#7b1e3a',
 green:'#00874f',emerald:'#00874f','dark green':'#00543c','light green':'#5cb85c',lime:'#9bd13f',teal:'#008080',
 blue:'#1f4ea8','royal blue':'#1f4ea8','navy':'#14213d','navy blue':'#14213d','sky blue':'#6cace4',skyblue:'#6cace4','light blue':'#6cace4',
 coral:'#f2735f',yellow:'#f2c500',gold:'#c9a227',golden:'#c9a227',orange:'#f26b21',purple:'#5b2a86',violet:'#5b2a86',pink:'#e8749a',
 grey:'#8a8d8f',gray:'#8a8d8f',silver:'#b8bcc0',charcoal:'#36454f',brown:'#6b4226',beige:'#d8c9a3',turquoise:'#30b7c0',
}
const DESIGNS=new Set(['stripes','hoops','pinstripes','half-and-half','sash','chest band','diagonal','contrasting sleeves','gradient','graphic'])
function design(raw:unknown):string{
 const s=String(raw||'').toLowerCase()
 if(/pin ?stripe/.test(s))return 'pinstripes'
 if(/hoop/.test(s))return 'hoops'
 if(/stripe/.test(s))return 'stripes'
 if(/sash|diagonal band/.test(s))return 'sash'
 if(/half|halves/.test(s))return 'half-and-half'
 if(/chest ?band|band/.test(s))return 'chest band'
 if(/diagonal/.test(s))return 'diagonal'
 if(/sleeve/.test(s))return 'contrasting sleeves'
 if(/gradient|fade/.test(s))return 'gradient'
 if(/graphic|pattern|print/.test(s))return 'graphic'
 return DESIGNS.has(s)?s:'plain'
}
const words=(raw:unknown):string[]=>String(raw||'').toLowerCase().split(/[\/,&+]| and /).map(w=>w.trim()).filter(w=>!!INK[w])
const real=(v:unknown)=>typeof v==='string'&&v.trim()&&!/^(-|none|unbranded|unknown|n\/a|in-?house|in house|own|homemade|maroc)$/i.test(v.trim())?v.trim():null

async function main(){
 const {loadClub,CORE_CLUB_IDS}=await import('@/lib/clubs/resolver')
 const {kitViews}=await import('@/lib/clubs/gate-content')
 const only=arg('club'),out:Record<string,{drawn:number;fromArchive:number;fromPack:number;noColour:number}>={}
 mkdirSync('content/generated/kit-svgs',{recursive:true})
 for(const club of CORE_CLUB_IDS){
  if(only&&club!==only)continue
  const data=(await loadClub(club))!.data
  // the archive file: kit-archive-<club>.json, or AEK's own kit-<club>.json (same shape)
  const archivePath=[`content/manual/kit-archive-${club}.json`,`content/manual/kit-${club}.json`].find(p=>existsSync(p))??''
  const archive=existsSync(archivePath)?JSON.parse(readFileSync(archivePath,'utf8')) as {kits:Record<string,unknown>[]}:{kits:[]}
  const visibleIds=club==='atalanta'?new Set(kitViews(data).map(k=>k.id)):null
  if(visibleIds)archive.kits=archive.kits.filter(k=>visibleIds.has(`${club}:${k.id}`))
  const have=new Set(archive.kits.map(k=>`${k.season}|${k.type}`))
  // a pack record that carries an archive kit's own id is that same shirt under another label (e.g. 'home 2'): one id, one drawing (17.11.2026)
  const ids=new Set(archive.kits.map(k=>String(k.id)))
  const kits:Record<string,unknown>[]=[...archive.kits]
  let fromPack=0,noColour=0
  for(const f of (data.kits||[])){
   if(f.status!=='approved')continue
   if(visibleIds&&!visibleIds.has(f.id))continue
   const v=f.value as unknown as Record<string,any>,season=String(v.season||''),type=String(v.type||'home')
   if(!season||(!visibleIds&&have.has(`${season}|${type}`))||ids.has(String(f.id).split(':').pop()!.replace(/[^a-z0-9_-]/gi,'-')))continue
   const cols=words(v.construction?.colors??v.colors??v.colours??v.shirt?.colours)
   if(!cols.length){noColour++;continue}
   have.add(`${season}|${type}`)
   const sh=v.shorts&&words(v.shorts.colour)[0],so=v.socks&&words(v.socks.colour)[0]
   kits.push({id:String(f.id).split(':').pop()!.replace(/[^a-z0-9_-]/gi,'-'),origin:'pack',season,kind:'season',type,euro:false,
    shirt:{design:design(v.construction?.design??v.design),colours:cols,hex:Object.fromEntries(cols.map(c=>[c,INK[c]!])),measured:{},...(visibleIds?{artwork:{omitUnmeasuredGraphics:true}}:{})},
    ...(sh?{shorts:{colour:sh,hex:INK[sh],trim:null,trimHex:null}}:{}),...(so?{socks:{colour:so,hex:INK[so],trim:null,trimHex:null,bands:false}}:{}),
    maker:real(v.manufacturer??v.maker),sponsor:real(v.sponsor),shortsSponsor:null,sources:f.sources,readUnsure:!!visibleIds,
    ...(visibleIds?{crestOmitted:season<'1993/94'||season>='2026/27'||!['home','away','third'].includes(type.toLowerCase())}:{})})
   fromPack++
  }
  // the owner's own corrections win over every other source (rule 18), field by field
  const fixes=(JSON.parse(readFileSync('content/manual/kit-owner-corrections.json','utf8')) as Record<string,Record<string,Record<string,unknown>>>)[club]??{}
  for(const k of kits){const fx=fixes[String(k.id)];if(fx)Object.assign(k,fx,{ownerCorrected:true})}
  if(visibleIds&&kits.length!==visibleIds.size)throw new Error(`${club}: ${visibleIds.size-kits.length} visible kits need documented artwork`)
  const file=`content/generated/kit-svgs/${club}.json`
  writeFileSync(file,JSON.stringify({club,kits})+'\n')
  execFileSync('node',['scripts/kits/export-kit-svgs.mjs',club,file],{stdio:'inherit'})
  if(visibleIds){
   execFileSync('node',['scripts/kits/export-kit-icons.mjs',club,file],{stdio:'inherit'})
   const root=`public/club-kits/${club}`
   mkdirSync(`${root}/previews`,{recursive:true})
   for(const kit of kits){
    await sharp(`${root}/svg/${kit.id}.svg`).resize(360,400,{fit:'inside'}).webp({quality:88}).toFile(`${root}/previews/${kit.id}.webp`)
   }
  }
  out[club]={drawn:kits.length,fromArchive:archive.kits.length,fromPack,noColour}
  console.log(`[${club}] ${kits.length} drawings (${archive.kits.length} archive + ${fromPack} pack); ${noColour} approved kits name no colour and are not drawn`)
 }
 const summary='content/generated/kit-svgs/summary.json'
 writeFileSync(summary,JSON.stringify(only&&existsSync(summary)?{...JSON.parse(readFileSync(summary,'utf8')),...out}:out,null,1)+'\n')
}
main().catch(e=>{console.error(e);process.exit(1)})

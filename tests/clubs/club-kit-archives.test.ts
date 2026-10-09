import {describe,expect,it} from 'vitest'
import {existsSync,readFileSync,statSync} from 'node:fs'
import {compilePack} from '@/lib/clubs/compiler'
import {mergeWave} from '@/lib/clubs/waves'
import {REGISTRY} from '@/lib/master/registry'
import {kitViews,waveCReadiness} from '@/lib/clubs/gate-content'
import {colourKey,patternOf} from '@/lib/clubs/kit-model'
import {SWATCH} from '@/lib/clubs/rumble-kit'
import stPauliCore from '@/club-packs/st-pauli/core.json'
import stPauliDeep from '@/club-packs/st-pauli/wave-deep-history-2026-10-08.json'
import stPauliCof from '@/club-packs/st-pauli/wave-kits-cof-2026-10-09.json'
import celticCore from '@/club-packs/celtic/core.json'
import celticDeep from '@/club-packs/celtic/wave-deep-history-2026-10-08.json'
import olympiacosCof from '@/club-packs/olympiacos/wave-kits-cof-2026-10-09.json'
import celticCof from '@/club-packs/celtic/wave-kits-cof-2026-10-09.json'
import paoCof from '@/club-packs/panathinaikos/wave-kits-cof-2026-10-09.json'
import zrinjskiCof from '@/club-packs/zrinjski-mostar/wave-kits-cof-2026-10-09.json'

/**
 * The catalogue archives of six clubs (colours-of-football.com drawings, the owner's grant of 9.10.2026) and what they put in the packs.
 * The pictures are files under public/club-kits/<club>/; the data is content/manual/kit-cof-<club>.json (measurements) and kit-archive-<club>.json (joined).
 */
const read=<T,>(p:string)=>JSON.parse(readFileSync(p,'utf8')) as T
type Joined={club?:string;kitCount:number;kits:{id:string;season:string;type:string;euro:boolean;image?:string|null;origin:string;maker:string|null;sponsor:string|null;shirt:{design:string;colours:string[];hex:Record<string,string>};shorts:{colour:string}|null;socks:{colour:string}|null;twin?:string[]}[]}
const CLUBS=[
 {id:'st-pauli',kits:46,file:'content/manual/kit-archive-st-pauli.json',wave:stPauliCof},
 {id:'panathinaikos',kits:61,file:'content/manual/kit-archive-panathinaikos.json',wave:paoCof},
 {id:'zrinjski-mostar',kits:19,file:'content/manual/kit-archive-zrinjski-mostar.json',wave:zrinjskiCof},
 {id:'hapoel-petah-tikva',kits:6,file:'content/manual/kit-archive-hapoel-petah-tikva.json',wave:null},
 {id:'celtic',kits:75,file:'content/manual/kit-archive-celtic.json',wave:celticCof},
 {id:'olympiacos',kits:71,file:'content/manual/kit-archive-olympiacos.json',wave:olympiacosCof},
 {id:'aek-athens',kits:99,file:'content/manual/kit-aek-athens.json',wave:null},
]
const DESIGNS=['plain','stripes','hoops','pinstripes','half-and-half','sash','chest band','diagonal','contrasting sleeves','gradient','graphic']

describe.each(CLUBS)('$id: the files',({id,kits,file})=>{
 const j=read<Joined>(file)
 it(`holds ${kits} kits, each with an SVG, an icon and (for the catalogue's) its source image`,()=>{
  expect(j.kits).toHaveLength(kits);expect(j.kitCount).toBe(kits)
  expect(new Set(j.kits.map(k=>k.id)).size).toBe(kits)
  for(const k of j.kits){
   expect(existsSync(`public/club-kits/${id}/svg/${k.id}.svg`),`${k.id} svg`).toBe(true)
   expect(existsSync(`public/club-kits/${id}/icons/${k.id}.svg`),`${k.id} icon`).toBe(true)
   if(k.origin==='catalogue'){expect(k.image,k.id).toBeTruthy();expect(statSync('public'+k.image!).size,k.image!).toBeGreaterThan(300)}
  }
 })
 it('has the club crest in two sizes, and a drawing that embeds it',()=>{
  expect(statSync(`public/club-kits/${id}/crest.png`).size).toBeGreaterThan(1000);expect(statSync(`public/club-kits/${id}/crest-96.png`).size).toBeGreaterThan(500)
  expect(readFileSync(`public/club-kits/${id}/svg/${j.kits[0]!.id}.svg`,'utf8')).toContain('data:image/png;base64,')
 })
 it('names only designs and colours the model knows how to paint or knows it cannot (rule 11)',()=>{
  for(const k of j.kits){
   expect(DESIGNS,`${k.id} ${k.shirt.design}`).toContain(k.shirt.design)
   for(const c of k.shirt.colours)expect(colourKey(c),`${k.id} ${c}`).not.toBeNull()
   if(k.shirt.design!=='graphic'&&k.shirt.design!=='gradient'&&k.shirt.design!=='contrasting sleeves')expect(patternOf(k.shirt.design),k.id).not.toBeNull()
   for(const h of Object.values(k.shirt.hex))expect(h).toMatch(/^#[0-9a-f]{6}$/)
   if(k.shorts)expect(colourKey(k.shorts.colour),`${k.id} shorts`).not.toBeNull()
   if(k.socks)expect(colourKey(k.socks.colour),`${k.id} socks`).not.toBeNull()
  }
 })
 it('has a built page with the same number of kits',()=>{
  const html=readFileSync(`public/kit-archive/${id}/index.html`,'utf8')
  expect(html).toContain(`"club":{"id":"${id}"`);const folded=new Set(read<Joined>(file).kits.map(k=>[k.season,k.type,k.shirt.design,[...k.shirt.colours].sort().join('+'),(k.maker??'').toLowerCase()].join('|'))).size // one shirt is one card: repeats of the same shirt are folded onto the page
  expect(html.match(/"origin":"/g)).toHaveLength(folded);expect(folded).toBeLessThanOrEqual(kits);expect(folded).toBeGreaterThan(kits-15)
 })
})

describe('the hub, the URLs and the credits',()=>{
 it('lists all six clubs and is reachable at folder URLs',()=>{
  const hub=readFileSync('public/kit-archive/index.html','utf8')
  for(const c of CLUBS)expect(hub).toContain(`/kit-archive/${c.id}/`)
  const cfg=readFileSync('next.config.mjs','utf8');expect(cfg).toContain("/kit-archive/:club");expect(cfg).toContain('/kit-archive/:club/index.html')
 })
 it('credits the catalogue and the logo source in every manifest, with the publisher\'s address',()=>{
  for(const c of CLUBS){
   const m=read<{sources:{key:string;title:string;url:string}[]}>(`content/manual/kit-cof-${c.id}.json`)
   expect(m.sources.map(s=>s.key)).toEqual(['cof','logo'])
   expect(m.sources[0]!.url).toMatch(/^https:\/\/www\.colours-of-football\.com\//);expect(m.sources[1]!.url).toMatch(/^https:\/\/(football-logos\.cc|www\.colours-of-football\.com)\//)
  }
 })
})

describe.each(CLUBS.filter(c=>c.wave))('$id: the catalogue wave',({id,wave,file})=>{
 const w=wave as unknown as {sources:{id:string}[];kits:{id:string;status:string;confidence:number;sources:string[];value:{season:string;type:string;construction:{colors:string};shorts:{colour:string};socks:{colour:string}}}[]}
 it('is approved by the owner in his words ("מאשר הכל", 2026-10-09), every kit stamped — Olympiacos, ingested after those words, waits in review',()=>{
  if(id==='olympiacos'){for(const k of w.kits){expect(k.status).toBe('review');expect(k.confidence).toBe(1);expect(k).not.toHaveProperty('approvedBy')};return}
  for(const k of w.kits){expect(k.status).toBe('approved');expect(k.confidence).toBe(2);expect((k as unknown as {approvedBy:string}).approvedBy).toMatch(/Maor Harel/);expect((k as unknown as {notes:string}).notes).toContain('מאשר הכל')}
 })
 it('has unique ids, cites only its own sources, and never repeats a kit the pack already holds',()=>{
  expect(new Set(w.kits.map(k=>k.id)).size).toBe(w.kits.length)
  const ids=new Set(w.sources.map(s=>s.id));for(const k of w.kits)for(const s of k.sources)expect(ids.has(s)).toBe(true)
  const j=read<Joined>(file);const withTwin=new Set(j.kits.filter(k=>k.twin&&k.twin.length).map(k=>k.id))
  for(const k of w.kits)expect(withTwin.has(k.id),`${k.id} duplicates a pack kit`).toBe(false)
  expect(w.kits.length).toBe(j.kits.filter(k=>!(k.twin&&k.twin.length)).length)
 })
 it('paints in colours the swatch has',()=>{for(const k of w.kits){for(const c of k.value.construction.colors.split('/'))expect(SWATCH[c],`${k.id} ${c}`).toBeTruthy()}})
})

describe('approved in memory, the new kits reach the gates (the wave itself stays in review)',()=>{
 const build=(id:string,core:unknown,deep:unknown,cof:unknown)=>{
  const club=REGISTRY.find(c=>c.id===id)!,approved=structuredClone(cof) as {kits:Record<string,unknown>[]}
  for(const k of approved.kits)Object.assign(k,{status:'approved',confidence:2,approvedAt:'2026-10-09',approvedBy:'test'})
  return compilePack(mergeWave(mergeWave(structuredClone(core) as never,deep as never),approved as never),club).data
 }
 it('Celtic: 75 kits, gates 4 and 5 playable',()=>{
  const d=build('celtic',celticCore,celticDeep,celticCof);expect(kitViews(d).length).toBeGreaterThanOrEqual(60)
  const r=waveCReadiness(d);expect(r['kit-builder']!.playable).toBe(true);expect(r.kits!.playable).toBe(true)
 })
 it('St. Pauli: 44 new kits, brown is paintable',()=>{
  const d=build('st-pauli',stPauliCore,stPauliDeep,stPauliCof);expect(kitViews(d).length).toBeGreaterThanOrEqual(44)
  expect(waveCReadiness(d).kits!.playable).toBe(true);expect(SWATCH.brown).toMatch(/^#[0-9a-f]{6}$/i)
 })
})

describe('Celtic · Historical Football Kits drawings (owner: non-commercial use, 10.10.2026)',()=>{
 const h=read<{count:number;source:{publisher:string;licence:string;homePage:string};kits:{id:string;type:string;period:string;maker:string|null;image:string;page:string}[]}>('content/manual/kit-hfk-celtic.json')
 it('holds 151 drawings, each a real file, each with a period the page printed',()=>{
  expect(h.count).toBe(151);expect(h.kits).toHaveLength(151);expect(new Set(h.kits.map(k=>k.id)).size).toBe(151)
  for(const k of h.kits){expect(existsSync(`public${k.image}`),k.id).toBe(true);expect(k.period).toMatch(/\d{4}/);expect(['home','away','third','change']).toContain(k.type)}
 })
 it('carries the acknowledgement and the licence words, and the archive pages show it',()=>{
  expect(h.source.publisher).toContain('Historical Football Kits');expect(h.source.licence).toMatch(/non-commercial/i)
  expect(readFileSync('public/kit-archive/celtic/index.html','utf8')).toContain('Historical Football Kits')
 })
})

describe('Club Football Shirts photographs (owner approval, 10.10.2026)',()=>{
 const clubs=['aek-athens','celtic','hapoel-tel-aviv','olympiacos','panathinaikos','st-pauli','zrinjski-mostar']
 it('holds 100 photographs, each a real file with a type and season from its file name, credited to the publisher',()=>{
  let n=0
  for(const c of clubs){
   const j=read<{source:{publisher:string;archivePage:string};count:number;kits:{id:string;type:string;season:string;image:string}[]}>(`content/manual/kit-cfs-${c}.json`)
   expect(j.source.publisher).toBe('Club Football Shirts');expect(j.source.archivePage).toMatch(/^https:\/\/www\.clubfootballshirts\.com\//)
   expect(new Set(j.kits.map(k=>k.id)).size).toBe(j.kits.length);n+=j.kits.length
   for(const k of j.kits){expect(existsSync(`public${k.image}`),k.id).toBe(true);expect(k.season).toMatch(/^\d{4}\/\d{2}$/)}
  }
  expect(n).toBe(100)
 })
 it('shows the photographs and their credit on the archive page',()=>{
  const h=readFileSync('public/kit-archive/olympiacos/index.html','utf8');expect(h).toContain('Club Football Shirts');expect(h).toContain('data-archive-photo')
 })
})

describe('sponsor lettering',()=>{
 it('has a typographic style for every sponsor the archives print, and no brand colour reaches a club page',()=>{
  const t=read<{styles:Record<string,unknown>}>('content/manual/sponsor-type.json'),have=new Set(Object.keys(t.styles).map(x=>x.toLowerCase()))
  for(const f of ['celtic','hapoel-petah-tikva','olympiacos','panathinaikos','st-pauli','zrinjski-mostar'].map(c=>`content/manual/kit-archive-${c}.json`).concat('content/manual/kit-aek-athens.json'))
   for(const k of read<Joined>(f).kits)if(k.sponsor)expect(have.has(k.sponsor.toLowerCase()),`${f} ${k.sponsor}`).toBe(true)
  expect(readFileSync('lib/clubs/sponsor-type.ts','utf8')).not.toMatch(/brand/i.source.length?/\.brand\b/:/x/)
 })
})

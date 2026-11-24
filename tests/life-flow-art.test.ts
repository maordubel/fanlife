import {beforeEach,describe,expect,it,vi} from 'vitest'
import {existsSync,readFileSync,readdirSync} from 'node:fs'
vi.mock('server-only',()=>({}))
// the private bucket, as the operator test mocks the durable store: folders of names, and a switch that refuses everything
const bucket=new Map<string,string[]>(),asked:string[]=[]
let refuse=false
vi.mock('@/lib/stories/media',()=>({
 listNames:async(dir:string)=>{asked.push(dir);if(refuse)throw new Error('storage refused');return bucket.get(dir)??[]},
 signedUpload:async(p:string)=>`https://storage.test/upload/${p}`,
 signedDownload:async(paths:string[])=>{if(refuse)throw new Error('storage refused');return Object.fromEntries(paths.map(p=>[p,`https://storage.test/get/${p}`]))},
}))
vi.mock('@/lib/stories/store',()=>({listJobs:async()=>[],getJob:async()=>null,updateJob:async()=>{throw new Error('no job')}}))
vi.mock('@/lib/master/durable',()=>({durable:()=>null}))
const {flowQueue,flowUrls,LIB_STEM,LIB_DIR,libPath,LIFE_STEM,LIFE_DIR,lifePath,LIFE_ANSWER}=await import('@/lib/stories/flowOperator')
const {buildLifeLibrary,serialise,STYLE,NEGATIVES,OUT}=await import('@/scripts/life/flow/life-library')
const {parseLifeStem,CLUB_TOWN,LIFE_TOWNS}=await import('@/lib/life/flowArtSpec')
const {lifeArt,clubLifeArt}=await import('@/lib/life/flowArt')
const {REGISTRY}=await import('@/lib/master/registry')
const {STATIC_CLUB_IDS}=await import('@/lib/clubs/resolver-ids')
const src=(p:string)=>readFileSync(p,'utf8')
const lib=buildLifeLibrary(),pieces=lib.pieces
// CORE_CLUB_IDS (lib/clubs/resolver.ts) is the static packs minus the review-only ones; read the list without loading the archive
const review=(src('lib/clubs/resolver.ts').match(/REVIEW_CLUB_IDS:string\[\]=\[([^\]]*)\]/)?.[1]??'').split(',').map(s=>s.trim().replace(/['"]/g,'')).filter(Boolean)
const CORE=STATIC_CLUB_IDS.filter(id=>!review.includes(id))
beforeEach(()=>{bucket.clear();asked.length=0;refuse=false})

describe('LIFE\'s picture order for Flow (scripts/life/flow/life-library.json, rule life-flow-art)',()=>{
 it('is on disk exactly what the generator writes',()=>{
  expect(src(OUT)).toBe(serialise(lib))
 })
 it('is a lean first order, every piece named for LIFE and never for the films\' library',()=>{
  expect(pieces.length).toBeGreaterThanOrEqual(60)
  expect(pieces.length).toBeLessThanOrEqual(100)
  expect(new Set(pieces.map(p=>p.stem)).size).toBe(pieces.length)
  for(const p of pieces){
   expect(LIFE_STEM.test(p.stem),p.stem).toBe(true)
   expect(LIB_STEM.test(p.stem),p.stem).toBe(false)
   expect(p.stem.endsWith('-kr'),p.stem).toBe(false)
   expect(['1:1','16:9']).toContain(p.aspect)
   expect(p.priority).toBeGreaterThanOrEqual(1)
   const s=parseLifeStem(p.stem)
   expect(s,p.stem).not.toBeNull()
   expect({use:s!.use,town:s!.town,club:s!.club}).toEqual({use:p.use,town:p.town,club:p.club})
  }
  for(const bad of ['life-x-fl1-kr','ppl-referee-fl1-kr','../life-facade-ath-01-fl1','life-facade-ath-01-fl1.png','life-Facade-ath-fl1','life-facade-ath-01'])expect(LIFE_STEM.test(bad),bad).toBe(false)
  expect(lifePath('life-skyline-ath-fl1')).toBe('library/life/life-skyline-ath-fl1.png')
  expect(LIFE_DIR).not.toBe(LIB_DIR)
 })
 it('carries the one LIFE look and the hard negatives in every prompt',()=>{
  for(const w of ['blue-hour dusk after rain','wet reflective ground','warm amber-orange street lamps','natural colour','high detail'])expect(STYLE).toContain(w)
  for(const w of ['No text','no letters','no numbers','no signs with writing','no logos','no crests','no sponsor marks','no flags','no real person\'s likeness','no yellow paint','no yellow clothing'])expect(NEGATIVES).toContain(w)
  for(const p of pieces){
   expect(p.prompt,p.stem).toContain(STYLE)
   expect(p.prompt.endsWith(NEGATIVES),p.stem).toBe(true)
   expect(p.prompt.length,p.stem).toBeLessThanOrEqual(2400) // the door cuts a prompt there
  }
 })
 it('names no club, no ground, no brand and no person',()=>{
  const banned=new Set<string>(['Coca-Cola','Pepsi','Nike','Adidas','Puma','Umbro','Kappa','Panini','Amstel','Heineken','Carlsberg','OPAP','Emirates','Vodafone','Paradise','Toumba'])
  for(const c of REGISTRY)banned.add(c.name)
  const generic=new Set(['stadium','stadion','park','arena','ground'])
  for(const id of readdirSync('club-packs')){
   const f=`club-packs/${id}/world.json`
   if(!existsSync(f))continue
   const w=JSON.parse(src(f)) as {ground?:{name?:string;local?:string;line?:string};nicknames?:{text?:string;local?:string}[]}
   for(const n of [w.ground?.name,w.ground?.local]){
    if(!n)continue
    banned.add(n)
    for(const t of n.split(/[\s-]+/))if(t.length>=5&&!generic.has(t.toLowerCase()))banned.add(t)
   }
   // the people a ground is named for, as the pack's own line gives them (capitalised words after "Named for" / "The … Stadium")
   for(const m of (w.ground?.line??'').matchAll(/(?:Named for|The) ((?:[A-Z][a-z]+ ){1,2})(?:Stadium|,)/g))for(const t of m[1]!.trim().split(' '))if(t.length>=5)banned.add(t)
   for(const n of w.nicknames??[])for(const t of [n.text,n.local])if(t&&t.length>=5)banned.add(t)
  }
  expect(banned.size).toBeGreaterThan(30)
  for(const p of pieces){
   const low=p.prompt.toLowerCase()
   for(const b of banned)expect(low.includes(b.toLowerCase()),`${p.stem} names "${b}"`).toBe(false)
   expect(/\b(19|20)\d\d\b(?!s)/.test(p.prompt),`${p.stem} carries a year`).toBe(false)
  }
 })
 it('draws a ground for every core club, two for the four, and claims a look only where the pack names the ground',()=>{
  expect(CORE.length).toBeGreaterThanOrEqual(13)
  const grounds=pieces.filter(p=>p.use==='stadium')
  for(const id of CORE){
   const own=grounds.filter(p=>p.club===id)
   expect(own.length,id).toBe(['hapoel-tel-aviv','olympiacos','panathinaikos','aek-athens'].includes(id)?2:1)
   expect(CLUB_TOWN[id],id).toBeTruthy()
   for(const p of own){
    expect(p.aspect).toBe('16:9')
    expect(p.confidence,p.stem).toBe(existsSync(`club-packs/${id}/world.json`)?'specific':'generic')
    if(p.confidence==='generic')expect(p.prompt,p.stem).toMatch(/^A city football ground with tall floodlights/)
    // a plate never risks a rival's colour: neutral seats and trim, and no colour word of its own beyond steel and brick
    expect(p.prompt,p.stem).toContain('neutral grey and bare concrete')
    const subject=p.prompt.replace(STYLE,'').replace(NEGATIVES,'')
    expect(/\b(green|blue|yellow|orange|purple|black-and|white-and)\b/i.test(subject),p.stem).toBe(false)
   }
  }
  expect(grounds.every(p=>CORE.includes(p.club!))).toBe(true)
 })
 it('gives every town its walls, its skyline and its district map',()=>{
  const n=(use:string,town:string)=>pieces.filter(p=>p.use===use&&p.town===town).length
  for(const t of LIFE_TOWNS){
   expect(n('facade',t),t).toBeGreaterThanOrEqual(t==='ath'||t==='tlv'?4:2)
   if(t==='eur')continue
   expect(n('skyline',t),t).toBe(1)
   expect(n('aerial',t),t).toBe(1)
  }
  for(const p of pieces){
   if(p.use==='facade'){expect(p.aspect).toBe('1:1');expect(p.prompt).toContain('front-on orthographic elevation');expect(p.prompt).toContain('no perspective')}
   if(p.use==='aerial')expect(p.aspect).toBe('1:1')
   if(p.use==='skyline'||p.use==='story')expect(p.aspect).toBe('16:9')
   if(p.use==='story')expect(p.prompt).toContain('never a face')
  }
  expect(new Set(Object.values(CLUB_TOWN)).size).toBe(LIFE_TOWNS.length-1) // every town but the generic set has a club
 })
})

describe('the Flow door answers LIFE\'s order beside the films\' library (lib/stories/flowOperator.ts)',()=>{
 it('lists the LIFE pieces not stored yet, most valuable first, and never a stored one',async()=>{
  const stored=[pieces[0]!.stem,pieces[5]!.stem]
  bucket.set(LIFE_DIR,stored.map(s=>`${s}.png`))
  const shuffled=[...pieces].reverse()
  const q=await flowQueue([],[],shuffled)
  expect(q.life.length).toBe(Math.min(LIFE_ANSWER,pieces.length-2))
  for(const s of stored)expect(q.life.some(p=>p.stem===s)).toBe(false)
  for(let i=1;i<q.life.length;i++)expect(q.life[i]!.priority).toBeGreaterThanOrEqual(q.life[i-1]!.priority)
  expect(q.life[0]!.priority).toBe(1)
  expect(Object.keys(q.life[0]!).sort()).toEqual(['aspect','priority','prompt','stem','use'])
  expect(q.life.every(p=>p.prompt.endsWith(NEGATIVES))).toBe(true)
  // a name that is not a LIFE piece is never asked for, whatever the request says
  const odd=await flowQueue([],[],[{stem:'ppl-referee-fl1-kr',prompt:'a long enough prompt to pass the length check'},{stem:'life-../x-fl1',prompt:'a long enough prompt to pass the length check'}])
  expect(odd.life).toEqual([])
 })
 it('hands a LIFE piece an upload link into library/life only',async()=>{
  const stem=pieces[0]!.stem
  expect(await flowUrls({life:true,names:[stem]})).toEqual({urls:{[stem]:`https://storage.test/upload/library/life/${stem}.png`}})
  await expect(flowUrls({life:true,names:['ppl-referee-fl1-kr']})).rejects.toThrow('Unknown LIFE piece.')
  await expect(flowUrls({lib:true,names:[stem]})).rejects.toThrow('Unknown library piece.')
  expect(await flowUrls({lib:true,names:['ppl-referee-fl1-kr']})).toEqual({urls:{'ppl-referee-fl1-kr':'https://storage.test/upload/library/flow/ppl-referee-fl1-kr.png'}})
 })
 it('leaves the films\' library answer as it was',async()=>{
  const spec=JSON.parse(src('scripts/football-stories/studio/cinema/flow_library.json')) as {pieces:{stem:string;aspect?:string;prompt:string}[]}
  const drawn=spec.pieces.slice(0,3).map(p=>`${p.stem}.png`)
  bucket.set(LIB_DIR,drawn)
  bucket.set(LIFE_DIR,[`${spec.pieces[4]!.stem}.png`]) // a LIFE folder never counts for the films' library
  const expected=spec.pieces.slice(3).map(p=>({stem:p.stem,aspect:p.aspect==='16:9'?'16:9':'1:1',prompt:p.prompt.slice(0,2400)}))
  const alone=await flowQueue([],spec.pieces)
  expect(alone.library).toEqual(expected)
  expect(alone.life).toEqual([])
  expect(asked).toEqual([LIB_DIR]) // with no LIFE order sent, the LIFE folder is not even listed
  const both=await flowQueue([],spec.pieces,pieces)
  expect(both.library).toEqual(expected)
  expect(both.jobs).toEqual([])
  expect(both.classified).toEqual([])
  const o=src('lib/stories/flowOperator.ts')
  expect(o).toContain('export const LIB_STEM=/^(ppl|sup|obj|era|doc|ins|layer|sky|ground|city)-[a-z0-9-]{2,70}-fl\\d-kr$/')
  expect(o).toContain("export const LIB_DIR='library/flow'")
  expect(libPath('ppl-referee-fl1-kr')).toBe('library/flow/ppl-referee-fl1-kr.png')
  const r=src('app/api/master/stories/flow/route.ts')
  expect(r).toContain('Array.isArray(b.library)?b.library as LibPiece[]:[]')
  expect(r).toContain('Array.isArray(b.life)?b.life as LifeNeed[]:[]')
 })
})

describe('the game\'s reader (lib/life/flowArt.ts)',()=>{
 it('returns what is stored, by use, town and club, and nothing that is not a LIFE piece',async()=>{
  bucket.set(LIFE_DIR,['life-facade-ath-01-fl1.png','life-facade-eur-01-fl1.png','life-stadium-olympiacos-a-fl1.png','life-skyline-ath-fl1.png','life-aerial-ath-fl1.png','life-story-first-walk-fl1.png','ppl-referee-fl1-kr.png','notes.txt','life-facade-zzz-01-fl1.png'])
  const all=await lifeArt()
  expect(all.map(a=>a.stem).sort()).toEqual(['life-aerial-ath-fl1','life-facade-ath-01-fl1','life-facade-eur-01-fl1','life-skyline-ath-fl1','life-stadium-olympiacos-a-fl1','life-story-first-walk-fl1'])
  expect(all.every(a=>a.url.startsWith('https://storage.test/get/library/life/'))).toBe(true)
  expect((await lifeArt({use:'facade',town:'ath'})).map(a=>a.stem)).toEqual(['life-facade-ath-01-fl1'])
  expect((await lifeArt({club:'olympiacos'})).map(a=>a.stem)).toEqual(['life-stadium-olympiacos-a-fl1'])
  const oly=await clubLifeArt('olympiacos')
  expect(oly.facades.map(a=>a.stem)).toEqual(['life-facade-ath-01-fl1'])
  expect(oly.stadium.length).toBe(1)
  expect(oly.skyline?.stem).toBe('life-skyline-ath-fl1')
  expect(oly.aerial?.stem).toBe('life-aerial-ath-fl1')
  expect(Object.keys(oly.story)).toEqual(['first-walk'])
  const celtic=await clubLifeArt('celtic') // a town with no walls yet wears the generic European set
  expect(celtic.facades.map(a=>a.stem)).toEqual(['life-facade-eur-01-fl1'])
  expect(celtic.stadium).toEqual([])
  expect(celtic.skyline).toBeNull()
  expect(asked.every(d=>d===LIFE_DIR)).toBe(true)
 })
 it('fails soft: storage that refuses is an empty answer, never an error',async()=>{
  refuse=true
  expect(await lifeArt()).toEqual([])
  expect(await clubLifeArt('hapoel-tel-aviv')).toEqual({facades:[],stadium:[],skyline:null,aerial:null,story:{}})
 })
})

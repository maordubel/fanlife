import {mkdtemp,readFile,rm} from 'node:fs/promises'
import {readdirSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {archiveParserFor,parserFor,type ArchiveDocInput} from '@/lib/research/parsers'
import {researchLinker} from '@/lib/research/archive-link'
import {activeObservations,archiveStatus,collectArchive,readObservations} from '@/lib/research/archive'
import {exportArchiveStaging} from '@/lib/research/staging'
import {packageAdapter} from '@/lib/master/adapters/package'
import {dir,writeJson} from '@/lib/research/store'
import type {ArchiveSource} from '@/lib/research/contract'

const names=['Ronnie Simpson','James Craig','Thomas Gemmell','Robert Murdoch','Billy McNeill','John Clark','Jimmy Johnstone','William Wallace','Stevie Chalmers','Bertie Auld','Robert Lennox']
const celtic:ArchiveDocInput={
 url:'https://www.thecelticwiki.com/1967-05-25-celtic-2-1-inter-milan-european-cup/',title:'1967-05-25: Celtic 2-1 Inter Milan, European Cup',
 html:`<h3>Match Details</h3><h3>Celtic Team</h3><p><b>Manager:</b> Jock Stein<br>${names.join(', ')}<br><b>Reserve:</b> John Fallon</p>
 <p>Scorers:</p><ul><li>63&#8242; Tommy Gemmell 1-1</li><li>84&#8242; Stevie Chalmers 2-1</li></ul><h3>Inter Milan</h3>`,
 providerKey:'thecelticwiki:pages:101',meta:{slug:null,categories:[],parent:null}
}
const union:ArchiveDocInput={
 ...celtic,url:'https://www.immerunioner.de/spieler.php?getid=84',title:'Lutz Hendel | immerunioner.de',providerKey:'immer-unioner:html:/spieler.php?getid=84',
 html:'<table><tr><th>Saison</th><th>Einsätze</th><th>Tore</th></tr><tr><td>DDR-Liga Staffel B 1975/76</td><td>3 (22)</td><td>0</td></tr><tr><td>FDGB-Pokal 1975/76</td><td>0 (2)</td><td>-</td></tr></table>'
}

describe('document readers',()=>{
 it('extracts Celtic’s result, starters and scorer list, keeping the manager and reserve out of the eleven',()=>{
  const parser=archiveParserFor('celticwiki-football-v1')!,result=parser.parse(celtic)
  expect(result.observations[0]?.match).toMatchObject({on:'1967-05-25',away:'Inter Milan',homeGoals:2,awayGoals:1,lineup:names,scorers:[{minute:'63'},{minute:'84'}]})
  expect(parser.parse({...celtic,title:celtic.title+' – Pictures',html:'<p>Photos</p>'}).observations).toEqual([])
  expect(parser.parse({...celtic,title:celtic.title?.replace('05-25','02-30')||null}).observations).toEqual([])
  expect(parser.parse({...celtic,html:celtic.html.replace('Ronnie Simpson, ','')}).observations[0]?.match?.lineup).toBeUndefined()
 })
 it('reads documented Union appearances, not the fixture totals in parentheses',()=>{
  const p=archiveParserFor('immerunioner-v1')!.parse(union).observations[0]
  expect(p).toMatchObject({recordType:'player',nameAsReported:'Lutz Hendel',stats:[
   {season:'1975/76',competition:'DDR-Liga Staffel B',appearances:3,goals:0},{season:'1975/76',competition:'FDGB-Pokal',appearances:0,goals:null}
  ]})
  expect(archiveParserFor('immerunioner-v1')!.parse({...union,url:'https://www.immerunioner.de/listen.php'}).observations).toEqual([])
 })
 it('reads a Partizan season result from its own match block and rejects an impossible day',()=>{
  const doc={...celtic,url:'https://partizanopedia.rs/4647.html',title:'1946/47 - Partizanopedia',
   html:'<h3>Prvenstvo:</h3><h3>Partizan - Pobeda 1:0 (1:0)</h3></br><p>25. avgust 1946. Stadion CDJA</p><h3>Partizan - Dinamo 1:2</h3><p>31. februar 1947.</p>'}
  const observations=archiveParserFor('partizanopedia-v1')!.parse(doc).observations
  expect(observations).toHaveLength(2)
  expect(observations[1]?.match).toMatchObject({on:'1946-08-25',home:'Partizan',away:'Pobeda',season:'1946/47'})
 })
 it('reads DFB’s mens result with its matching fixture link, rejecting the same template for another team',()=>{
  const html='<div class="c-MatchTable-row"><div id="match_2419392">Sunday, 2026-11-08 17:30</div><div class="c-MatchTable-team--home"><a href="/team">SC Freiburg</a></div><div class="c-MatchTable-score"><a href="/en/data-center/bundesliga/2026-2027/9-matchday/2419392">2 : 0</a></div><div class="c-MatchTable-team--away"><a href="/union">1. FC Union Berlin</a></div></div>'
  const parse=archiveParserFor('dfb-club-results-v1')!
  expect(parse.parse({...union,html}).observations[0]?.match).toMatchObject({on:'2026-11-08',home:'SC Freiburg',away:'1. FC Union Berlin',homeGoals:2,awayGoals:0,season:'2026/27'})
  expect(parse.parse({...union,html:html.replace('1. FC Union Berlin','1. FC Union Berlin Women')}).observations).toEqual([])
  expect(parse.parse({...union,html:html.replace('match_2419392','match_0000')}).observations).toEqual([])
 })
 it('requires the source’s season label and same-season player row for NFT',()=>{
  const html='<table><tr><th></th><th>Name</th><th>Day of Birth</th><th>Land of Origin</th><th>Position</th><th>Season</th><th>M</th><th>G</th></tr><tr><td></td><td>Kralj , Branko</td><td>1924-03-10</td><td>Yugoslavia</td><td>Goalkeeper</td><td>1953/54</td><td>16</td><td>0</td></tr></table>'
  const doc={...celtic,title:'Dinamo Zagreb (1953/54) | National Football Teams',html}
  const p=archiveParserFor('national-football-teams-squad-v1')!.parse(doc).observations[0]
  expect(p).toMatchObject({nameAsReported:'Kralj, Branko',lookupNames:['Branko Kralj'],positions:['GK'],stats:[{season:'1953/54',appearances:16,goals:0}]})
  expect(archiveParserFor('national-football-teams-squad-v1')!.parse({...doc,html:html.replace('1953/54','1954/55')}).observations).toEqual([])
 })
 it('reads the PAO club scorecard only when the research job has one target',()=>{
  const html='<div class="match-score"><div class="gridrow"><div><span class="event-category font">SUPER LEAGUE</span><span class="event-date">Sunday 20/09/2026 | 19:30</span></div><div class="teams"><span class="teamname">KALAMATA</span><span class="results-mx white-c">0 - 1</span><span class="teamname">PANATHINAIKOS</span></div></div></div>'
  const parse=parserFor('pao-official','match-detail')!
  expect(parse(Buffer.from(html),{url:'https://www.pao.gr/en/match/106013/',subjects:['match-1']}).observations[0]).toMatchObject({subject:'match-1',value:{on:'2026-09-20',homeGoals:0,awayGoals:1}})
  expect(parse(Buffer.from(html),{url:'https://www.pao.gr/en/match/106013/',subjects:['match-1','match-2']}).observations).toEqual([])
 })
 it('links the exact date, sides and score, and holds conflicting scores and same-name players',()=>{
  const observation={...archiveParserFor('celticwiki-football-v1')!.parse(celtic).observations[0]!,providerId:'thecelticwiki'}
  const row={id:'europe-67',section:'matches' as const,value:{on:'1967-05-25',home:'Celtic FC',away:'Inter Milan',score:'2-1'}}
  expect(researchLinker([row])(observation)).toEqual({canonicalId:'europe-67',identityState:'linked'})
  expect(researchLinker([row,{...row,id:'other',value:{...row.value,score:'0-1'}}])(observation)).toEqual({canonicalId:null,identityState:'conflict'})
  const p={...archiveParserFor('immerunioner-v1')!.parse(union).observations[0]!,providerId:'immer-unioner'}
  expect(researchLinker(['p-first','p-second'].map(id=>({id,section:'players',value:{name:'Lutz Hendel'}})))(p)).toEqual({canonicalId:null,identityState:'ambiguous'})
 })
 it('has a tested catalogue or extraction route and explicit unsupported formats across every repository profile',()=>{
  const gaps:string[]=[]
  for(const file of readdirSync('research-profiles')){
   const profile=JSON.parse(readFileSync(path.join('research-profiles',file),'utf8'))
   for(const source of profile.archive as ArchiveSource[]){
    const parser=archiveParserFor(source.parserId)
    if(!parser)gaps.push(source.providerId)
    else expect(typeof parser.parse).toBe('function')
   }
  }
  expect(gaps.sort()).toEqual(['hajduk-official','hns-semafor','rsssf-greece','wikipedia-dinamo-records','wikipedia-hajduk-records'].sort())
 })
})

describe('archive recovery into the editor desk',()=>{
 let scratch:string
 beforeEach(async()=>{scratch=await mkdtemp(path.join(tmpdir(),'archive-readers-'));vi.stubEnv('RESEARCH_DATA_DIR',scratch)})
 afterEach(async()=>{vi.unstubAllEnvs();await rm(scratch,{force:true,recursive:true})})
 it('reads saved Celtic match reports ahead of the WordPress index and stages the match detail',async()=>{
  const source:ArchiveSource={providerId:'thecelticwiki',familyId:'thecelticwiki-editorial',publisher:'The Celtic Wiki',reader:'wordpress-rest',origin:'https://www.thecelticwiki.com',role:'mixed',locale:'en',collections:['pages'],allowedPathPrefixes:['/wp-json/wp/v2/'],parserId:'celticwiki-football-v1',budget:{perPage:25,maxRequests:3,minDelayMs:0,timeoutMs:1000,maxResponseBytes:50000},retention:{rawBody:'metadata-only',downloadImages:false}}
  const club='celtic-example'
  await writeJson(path.join(dir(club),'archive-docs.json'),{[celtic.providerKey]:{providerId:source.providerId,providerKey:celtic.providerKey,collection:'pages',url:celtic.url,parse:'needs-parser',title:celtic.title,snapshot:null}})
  const reads:URL[]=[]
  const transport:typeof fetch=async input=>{
   const url=new URL(String(input));if(url.pathname==='/robots.txt')return new Response('',{status:404})
   reads.push(url)
   const row={id:101,link:celtic.url,title:{rendered:celtic.title},content:{rendered:celtic.html}}
   return Response.json(url.searchParams.get('include')?[row,{...row,id:102}]:[])
  }
  await collectArchive(club,[source],{maxRequests:2,fetchImpl:transport})
  expect(reads.map(u=>[u.searchParams.get('include'),u.searchParams.get('page')])).toEqual([['101',null],[null,'1']])
  expect(activeObservations(await readObservations(club))).toHaveLength(1)
  await exportArchiveStaging(club,[source])
  const research=await packageAdapter.collect({id:'job',clubId:club,query:'backfill',status:'queued',attempts:0,createdAt:'2026-11-21'})
  expect(research.findings[0]).toMatchObject({field:'match',approved:false,archiveMatch:{on:'1967-05-25',lineup:names,scorers:[{minute:'63'},{minute:'84'}]}})
 })
 it('revisits an old HTML document, stages its exact citation, and avoids requeueing unchanged evidence',async()=>{
  const source:ArchiveSource={providerId:'immer-unioner',familyId:'immer-unioner',publisher:'Immer Unioner',reader:'html',origin:'https://www.immerunioner.de',role:'mixed',locale:'de',seeds:['/listen.php'],allowedPathPrefixes:['/'],parserId:'immerunioner-v1',budget:{perPage:1,maxRequests:3,minDelayMs:0,timeoutMs:1000,maxResponseBytes:50000},retention:{rawBody:'metadata-only',downloadImages:false}}
  const club='union-example',url=union.url,id=union.providerKey
  await writeJson(path.join(dir(club),'archive-docs.json'),{[id]:{providerId:source.providerId,providerKey:id,collection:'html',url,parse:'needs-parser',title:union.title,snapshot:null}})
  const urls:string[]=[]
  const transport:typeof fetch=async input=>{
   const href=String(input);urls.push(href)
   return new Response(href===url?`<title>${union.title}</title>${union.html}`:'<title>Lists</title>',{headers:{'content-type':'text/html'}})
  }
  expect((await archiveStatus(club,[source])).waitingForRead).toBe(1)
  await collectArchive(club,[source],{maxRequests:2,fetchImpl:transport})
  expect(urls).toContain(url)
  expect(activeObservations(await readObservations(club))).toHaveLength(1)
  const stage=await exportArchiveStaging(club,[source])
  const sites=JSON.parse(await readFile(path.join(stage.dir,'sources.json'),'utf8'))
  const players=JSON.parse(await readFile(path.join(stage.dir,'archive-players.json'),'utf8'))
  expect(sites.find((s:{id:string})=>s.id===players[0].sourceIds[0]).url).toBe(url)
  const research=await packageAdapter.collect({id:'job',clubId:club,query:'backfill',status:'queued',attempts:0,createdAt:'2026-11-21'})
  expect(research.findings[0]).toMatchObject({field:'player',value:'Lutz Hendel',approved:false,record:{seasonStats:[{appearances:3},{appearances:0}]}})
  expect((await exportArchiveStaging(club,[source])).manifest.researchVersion).toBe(stage.manifest.researchVersion)
 })
})

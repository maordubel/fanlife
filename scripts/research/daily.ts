import {existsSync} from 'node:fs'
import {appendFile} from 'node:fs/promises'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
import {REGISTRY} from '@/lib/master/registry'
import {readJson,writeJson} from '@/lib/research/store'
import {readDailyWave,dailyWavePath} from '@/lib/clubs/daily-wave'
import {activeObservations,readObservations} from '@/lib/research/archive'
import {collectClub} from '@/lib/research/service'
import {loadClubProfile} from '@/lib/research/profiles'
import {nextResearchTurn,researchDay,type ResearchTurn} from '@/lib/research/daily-rotation'
import {blankWave,dailyFact,dailyFetch,dailySource,KIT_PAGES,kitRecords,readBiography,wikiCategory,wikiTitle} from '@/lib/research/daily-evidence'
import {extendDailyWave,fromArchive,fromScoreFeed,OBJECT,type Addition} from '@/lib/research/daily-project'
import {fromWikiSeason} from '@/lib/research/daily-wiki-season'
import {openFootball} from '@/lib/research/openfootball'

type Cursor={pending:string[];continuation:string|null;complete:boolean}
type SavedTurn=ResearchTurn&{runUrl?:string}
const STATE='research-data/daily-state.json'
const reportPath=(id:string)=>join('research-data','daily-reports',id+'.json')
const argv=process.argv.slice(2),option=(name:string)=>{const i=argv.indexOf(name);return i<0?undefined:argv[i+1]}
const server=['--require','./scripts/master/server-only.cjs','--import','tsx']
const wikiOrigin='https://en.wikipedia.org'
const emptyCursor:Cursor={pending:[],continuation:null,complete:false}
const depth=Number(option('--league-depth')||30)
const collectOnly=argv.includes('--collect-only'),backfill=argv.includes('--backfill')

type WikiPage={title:string;source:string;latest:{id:number};content_model:string}
async function wikiPage(title:string):Promise<WikiPage|null>{
 // Wikimedia's public API gateway supplies page source. Keep the website's /w/ exclusion intact.
 const url=new URL('/core/v1/wikipedia/en/page/'+encodeURIComponent(title.replaceAll(' ','_')),'https://api.wikimedia.org')
 try{
  const captured=await dailyFetch(url)
  if(!captured.type?.includes('json'))throw new Error('Wikimedia API did not return JSON')
  const info=JSON.parse(captured.text) as WikiPage
  if(!info.latest?.id||info.content_model!=='wikitext'||typeof info.source!=='string')throw new Error('Wikimedia page did not provide its revision and source')
  return info
 }catch(e){
  if(e instanceof Error&&/HTTP 404\b/.test(e.message))return null
  throw e
 }
}
async function roster(clubId:string,clubNames:string[],day:string):Promise<Addition[]>{
 const title=wikiTitle(clubId)
 if(!title)return []
 const file=join('research-data','daily-roster-cursors',clubId+'.json')
 let cursor=await readJson<Cursor>(file,emptyCursor)
 if(cursor.complete){cursor={...emptyCursor}}
 if(!cursor.pending.length){
  const category=clubId==='fenerbahce'?'Fenerbahçe S.K. footballers':title+' players'
  const first=new URL('/wiki/Category:'+encodeURIComponent(category.replaceAll(' ','_')),wikiOrigin)
  const url=cursor.continuation?new URL(cursor.continuation):first
  if(url.origin!==first.origin||url.pathname!==first.pathname)throw new Error('Wikipedia category continuation changed origin or page')
  const list=wikiCategory((await dailyFetch(url)).text,url)
  cursor={pending:list.members,continuation:list.next,complete:false}
  if(!cursor.pending.length)throw new Error('No player article was returned for the club category')
 }
 const selected=cursor.pending.slice(0,backfill?36:12)
 const pending=cursor.pending.slice(selected.length)
 const out:Addition[]=[]
 for(const article of selected){
  const p=await wikiPage(article)
  if(!p)continue
  const bio=readBiography(p.title,p.source,clubNames)
  if(!bio||bio.fromYear!==null&&bio.fromYear>Number(day.slice(0,4)))continue
  const url=new URL('/w/index.php',wikiOrigin);url.searchParams.set('oldid',String(p.latest.id))
  const source=dailySource(url.href,p.title,'English Wikipedia',day)
  out.push({section:'players',source,fact:dailyFact('player','wiki:'+p.title,{...bio,...(!bio.positions.length?{archiveOnly:true}:{})},source)})
 }
 await writeJson(file,{...cursor,pending,complete:!pending.length&&!cursor.continuation})
 return out
}

async function shirts(clubId:string,clubNames:string[],day:string):Promise<Addition[]>{
 const slug=KIT_PAGES[clubId]
 if(!slug)return []
 const origin='https://www.footballkitarchive.com'
 let body:string
 try{body=(await dailyFetch(new URL('/'+slug+'-kits/',origin))).text}
 catch(e){
  const msg=e instanceof Error?e.message:''
  const location=/Redirect to (\S+) — the same origin/.exec(msg)?.[1]
  if(!location)throw e
  const target=new URL(location,origin)
  if(target.origin!==origin||!new RegExp('^/'+slug+'-kits-t\\d+/$').test(target.pathname))throw e
  body=(await dailyFetch(target)).text
 }
 const records=kitRecords(body,slug,clubNames,day)
 if(!records.length)throw new Error('The catalogue returned no checked first-team kit labels')
 return records.map(x=>({...x,section:'kits'}))
}
async function seasons(clubId:string,clubNames:string[],day:string):Promise<Addition[]>{
 const title=wikiTitle(clubId)?.replace(/\s+\(football\)$/i,'')
 if(!title)return []
 const year=Number(day.slice(0,4)),current=Number(day.slice(5,7))>=7?year:year-1
 const file=join('research-data','daily-season-cursors',clubId+'.json')
 const cursor=await readJson(file,{nextYear:current-1})
 const next=cursor.nextYear<1888?current-1:Math.min(cursor.nextYear,current-1)
 const span=backfill?10:3
 const expected=new Map([current,...Array.from({length:span},(_,i)=>next-i)].filter(y=>y>=1888).map(y=>{
  const season=`${y}/${String(y+1).slice(-2)}`
  return [`${season.replace('/','–')} ${title} season`,season]
 }))
 const out:Addition[]=[]
 for(const [title,season] of expected){
  const page=await wikiPage(title)
  if(!page)continue
  const url=new URL('/w/index.php',wikiOrigin);url.searchParams.set('oldid',String(page.latest.id))
  out.push(...fromWikiSeason(page.source,season,clubNames,dailySource(url.href,page.title,'English Wikipedia',day)))
 }
 await writeJson(file,{nextYear:next-span})
 return out
}

const child=(file:string,args:string[],timeout:number)=>{
 const out=spawnSync(process.execPath,[...server,file,...args],{stdio:'inherit',timeout,env:{...process.env,FANLIFE_PRECOMPILED:'off'}})
 if(out.status!==0)throw new Error(out.error?`${file.split('/').at(-1)} · ${(out.error as NodeJS.ErrnoException).code||'process error'}`:`Source adapter exited with status ${out.status}`)
}
async function main(){
 const previous=await readJson<SavedTurn|null>(STATE,null)
 const chosen=option('--club'),daily=nextResearchTurn(researchDay(),previous)
 const club=REGISTRY.find(c=>c.id===(chosen||daily.clubId))
 if(!club)throw new Error('Unknown club')
 if(collectOnly&&!chosen)throw new Error('Collection-only runs require an explicit club')
 if(!Number.isInteger(depth)||depth<1||depth>150)throw new Error('League depth must be between 1 and 150')
 const day=daily.day
 const out=process.env.GITHUB_OUTPUT
 if(out)await appendFile(out,`club_id=${club.id}\nday=${day}\n`)
 if(argv.includes('--select')){
  console.log(JSON.stringify({day,clubId:club.id,next:nextResearchTurn(researchDay(new Date(Date.now()+86_400_000)),daily).clubId}));return
 }
 // A manual retry processes the same club; an explicit manual club never moves the rotation.
 const reports:{step:string;state:'ok'|'gap'|'skipped';info:string}[]=[]
 const attempt=async(step:string,task:()=>Promise<string>|string)=>{
  try{reports.push({step,state:'ok',info:await task()})}
  catch(e){
   const info=(e instanceof Error?e.message:String(e)).slice(0,300)
   reports.push({step,state:'gap',info})
   console.warn(`${club.id} · ${step}: ${info}`)
  }
 }
 const home=existsSync(join('club-packs',club.id,'ingest.json'))?join('club-packs',club.id):join('research-staging',club.id)
 const cfg=await readJson<{names:string[];uefa?:boolean}>(join(home,'ingest.json'),{names:[]})
 const names=[...new Set([club.name,wikiTitle(club.id)||club.name,...cfg.names])]
 const profile=await loadClubProfile(club.id),additions:Addition[]=[]
 if(profile?.archive.length){
  await attempt('Historical archives',async()=>{
   const made=await collectClub(club.id,{maxRequests:backfill?40:22})
   return `${made.run.counts.documentsRead} pages read, ${made.run.counts.recordsExtracted} observations, ${made.run.counts.blockedEndpoints} refused`
  })
  const observations=activeObservations(await readObservations(club.id))
  additions.push(...fromArchive(observations,new Map(profile.archive.map(s=>[s.providerId,s])),names,day))
 }else reports.push({step:'Historical archives',state:'skipped',info:'No additional archive profile. The shared match, squad and kit sources still run.'})
 if(cfg.uefa!==false)await attempt('UEFA match reports',()=>{child('scripts/ingest/club-wave.ts',['--club',club.id,'--max','20','--backfill','30','--refresh','12'],600_000);return 'Finished the bounded UEFA pull'})
 await attempt('Recent league and cup results',()=>{child('scripts/ingest/clubs/league-lineups.ts',['--club',club.id,'--max','12'],240_000);return 'Refreshed up to 12 recent fixtures'})
 await attempt('Historical results, elevens and scorers',()=>{child('scripts/ingest/clubs/league-lineups.ts',['--club',club.id,'--max',String(depth),'--history'],540_000);return `Continued from the historical results checkpoint, up to ${depth} fixtures`})
 if(club.id==='celtic')await attempt('Scottish season archive',()=>{
  const year=Number(day.slice(0,4))
  child('scripts/ingest/clubs/history-scotland.ts',['--club',club.id,'--from',String(year-1),'--to',String(year)],180_000)
  return 'Refreshed the two most recent seasons'
 })
 if(club.id==='olympiacos')await attempt('Greek historical careers',()=>{
  child('scripts/ingest/clubs/olympiacos-history-fetch.ts',[],180_000)
  child('scripts/ingest/clubs/olympiacos-history-players.ts',[],180_000)
  return 'Updated checked career details'
 })
 for(const file of ['wave-league-lineups-2026-10-10.json','wave-auto.json','wave-history-scotland.json']){
  const native=await readJson<unknown>(join(home,file),null)
  additions.push(...fromScoreFeed(OBJECT(native),day,names))
 }
 await attempt('Historical players',async()=>{const found=await roster(club.id,names,day);additions.push(...found);return `${found.length} documented senior club stints`})
 await attempt('Season archives, scoresheets and shirt metadata',async()=>{
  const found=await seasons(club.id,names,day)
  additions.push(...found)
  return `${found.filter(f=>f.section==='seasons').length} checked seasons and ${found.filter(f=>f.section==='matches').length} dated results`
 })
 await attempt('Kit archive',async()=>{const found=await shirts(club.id,names,day);additions.push(...found);return `${found.length} documented kit references`})
 if(backfill)await attempt('Open league season datasets',async()=>{
  const found=await openFootball(club.id,names,day)
  if(!found)return 'No league in this source is mapped to this club'
  additions.push(...found.result)
  if('stopped' in found)throw new Error(`${found.result.length} checked fixtures retained. ${found.stopped}`)
  return `${found.result.length} dated results across ${found.files} competition files; ${found.unavailable} historical files unavailable`
 })
 const old=readDailyWave(club.id)||blankWave(club.id),update=extendDailyWave(old,additions)
 if(update.wave.sources.length&&JSON.stringify(update.wave)!==JSON.stringify(old))await writeJson(dailyWavePath(club.id),update.wave)
 if(!collectOnly){
  child('scripts/people/build.ts',['--club',club.id],300_000)
  await attempt('Prices for newly eligible cards',()=>{child('scripts/rumble/build-prices-v3.ts',['daily',club.id],300_000);return 'Existing prices preserved'})
 }
 const {loadClub}=await import('@/lib/clubs/resolver')
 const result=await loadClub(club.id)
 if(update.wave.sources.length&&!result)throw new Error('The club cannot read its published research wave')
 if(result?.diagnostics.some(d=>d.record.includes('daily-')&&['ENTITY_INELIGIBLE','SOURCE_INVALID','SOURCE_MISSING','HUMAN_REVIEW','FACT_INVALID','PLAYER_INELIGIBLE'].includes(d.code)))throw new Error('The club compiler refused a draft daily record')
 if(!collectOnly&&update.added.matches)await attempt('Head-to-head ledger',()=>{child('scripts/archive/build-head-to-head.ts',['--club',club.id],360_000);return 'Rebuilt the club fixture ledger'})
 const runUrl=process.env.GITHUB_SERVER_URL&&process.env.GITHUB_REPOSITORY&&process.env.GITHUB_RUN_ID?`${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`:undefined
 const report={day,clubId:club.id,runUrl,added:update.added,heldDays:update.held,steps:reports,dataVersion:result?.data.version??null,
  uncertainties:result?.diagnostics.filter(d=>d.code.startsWith('DAILY_')).slice(0,40)??[],
  featureInputs:result?{players:result.data.players?.length||0,matches:result.data.matches?.length||0,seasons:result.data.seasons?.length||0,kits:result.data.kits?.length||0}:null}
 await writeJson(reportPath(club.id),report)
 if(!chosen)await writeJson(STATE,{day,clubId:club.id,runUrl})
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`## ${club.name} — ${day}\n\nNew evidence: ${Object.entries(update.added).map(([k,v])=>`${v} ${k}`).join(', ')}.\n\n${reports.map(r=>`- ${r.step}: ${r.state} — ${r.info.replace(/\r?\n/g,' ')}`).join('\n')}\n`)
 console.log(JSON.stringify(report))
}
void main().catch(e=>{console.error(e);process.exitCode=1})

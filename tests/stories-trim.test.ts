import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import {isBig,trimDue,GRACE_HOURS} from '@/lib/stories/trim'
import {newJob,validateBrief,type Job} from '@/lib/stories/jobs'
import {trimJobMedia} from '@/lib/stories/media'

const brief=validateBrief({club_id:'celtic',season:'1999/00',duration:5},new Map([['celtic','Celtic']]))
const base=(id:string)=>newJob(id,brief,{club_id:'celtic',club_name:'Celtic',primary:'#007744',on_primary:'#FFFFFF',bans:['red']},'owner','key-'+id)
const now=new Date('2026-11-11T12:00:00Z')
const uploaded=(id:string,hoursAgo:number):Job=>({...base(id),state:'ready',upload:{state:'done',videoId:'abcdefghijk',visibility:'public',publishAt:null,at:new Date(+now-hoursAgo*3600_000).toISOString(),by:'owner',note:null}})
const post=(state:string)=>({id:'p-'+state,state} as unknown as NonNullable<Job['social']>['posts'][number])

describe('after-YouTube trim (owner, 11.11.2026)',()=>{
 it('takes only uploaded films, after the grace hours, with no post still waiting for a file',()=>{
  const ok=uploaded('job-ok-0001',GRACE_HOURS+1)
  const fresh=uploaded('job-fresh-01',1)
  const notUp={...base('job-none-001'),state:'ready'} as Job
  const waiting={...uploaded('job-wait-001',48),social:{posts:[post('sent'),post('scheduled')]}} as Job
  const sending={...uploaded('job-send-001',48),social:{posts:[post('sending')]}} as Job
  const settled={...uploaded('job-done-001',48),social:{posts:[post('sent'),post('failed'),post('manual')]}} as Job
  const already={...uploaded('job-trim-001',48),trim:{at:now.toISOString(),bytes:1,files:1}} as Job
  expect(trimDue([ok,fresh,notUp,waiting,sending,settled,already],now).map(j=>j.id)).toEqual(['job-ok-0001','job-done-001'])
 })
 it('counts video, audio and archives as big; never pictures, captions or JSON',()=>{
  for(const n of ['master.mp4.part0','master.part3','preview.mp4','short-0.mp4','voice.wav','package.zip','reel.mov'])expect(isBig(n,1000)).toBe(true)
  for(const n of ['thumb-0.jpg','contact.png','captions.srt','captions.vtt','job.json'])expect(isBig(n,1000)).toBe(false)
  expect(isBig('thumb-huge.png',20*1024*1024)).toBe(true)
  expect(isBig('script.json',20*1024*1024)).toBe(false)
 })
})

describe('trimJobMedia',()=>{
 beforeEach(()=>{vi.stubEnv('FAN_LIFE_STORE_URL','https://storage.test');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-key')})
 afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})
 it('deletes the big files only and reports what it freed',async()=>{
  const deleted:string[]=[]
  vi.stubGlobal('fetch',vi.fn(async(url:string,init:{method:string;body:string})=>{
   const b=JSON.parse(init.body)
   if(url.includes('/object/list/')){
    const rows=b.prefix==='jobs/job-ok-0001'
     ?[{name:'master.mp4.part0',id:'1',metadata:{size:45*1048576}},{name:'thumb-0.jpg',id:'2',metadata:{size:200000}},{name:'shorts',id:null}]
     :[{name:'short-0.mp4',id:'3',metadata:{size:9*1048576}},{name:'captions.srt',id:'4',metadata:{size:900}}]
    return new Response(JSON.stringify(rows))
   }
   deleted.push(...b.prefixes);return new Response('[]')
  }))
  expect(await trimJobMedia('job-ok-0001')).toEqual({bytes:54*1048576,files:2})
  expect(deleted.sort()).toEqual(['jobs/job-ok-0001/master.mp4.part0','jobs/job-ok-0001/shorts/short-0.mp4'])
 })
})

describe('the studio talks through Cloudflare (11.11.2026)',()=>{
 it('every Python call to the site sends a User-Agent — Python\'s default is refused with error 1010',()=>{
  for(const p of ['scripts/football-stories/studio/worker.py','scripts/football-stories/studio/cleanup.py','scripts/football-stories/matchday/vlog_auto.py','scripts/football-stories/studio/cinema/library.py']){
   const s=readFileSync(p,'utf8')
   const calls=(s.match(/Request\([^\n]*\/api\/master\//g)??[]).length
   expect(calls,p).toBeGreaterThan(0)
   expect(s.split('FanLife-Studio/1.0').length-1,p).toBeGreaterThanOrEqual(p.endsWith('cleanup.py')?1:calls)
  }
  expect(readFileSync('scripts/football-stories/studio/cleanup.py','utf8')).toContain("call('trim')")
 })
})

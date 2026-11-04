import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {claim,finish,mediaPath,newJob,nextForWorker,noteLine,ownerAct,report,validateBrief,StoryError,type Job} from '@/lib/stories/jobs'

const clubs=new Map([['hapoel-tel-aviv','Hapoel Tel Aviv'],['olympiacos','Olympiacos']])
const palette={club_id:'hapoel-tel-aviv',club_name:'Hapoel Tel Aviv',primary:'#B02D10',on_primary:'#FFFFFF',bans:['yellow']}
const brief=validateBrief({club_id:'hapoel-tel-aviv',season:'1999/00',duration:12},clubs)
const job=(over:Partial<Job>={},at='2026-11-02T08:00:00Z')=>({...newJob('job-0000001',brief,palette,'owner','key-00000001',new Date(at)),...over}) as Job
const src=(p:string)=>readFileSync(p,'utf8')

describe('Football Stories — the brief',()=>{
 it('accepts the documented lengths and defaults to private, automatic, collage',()=>{
  for(const d of [0.5,1,2,3,5,7,12,25])expect(validateBrief({club_id:'olympiacos',season:'2014/15',duration:d},clubs).duration).toBe(d)
  expect(brief).toMatchObject({privacy:'private',review:'auto',visual_style:'collage',voice:'auto',crowd:'soft',club_name:'Hapoel Tel Aviv'})
  expect(validateBrief({club_id:'olympiacos',season:'2014/15',duration:5,crowd:'off'},clubs).crowd).toBe('off')
 })
 it('refuses an unknown club, a malformed season, an odd length and a past or zone-less schedule',()=>{
  expect(()=>validateBrief({club_id:'nobody',season:'1999/00',duration:12},clubs)).toThrow(StoryError)
  for(const season of ['1999','1999/01','99/00','1999-00'])expect(()=>validateBrief({club_id:'olympiacos',season,duration:12},clubs)).toThrow(/Season/)
  for(const duration of [4,6,6.5,26,0])expect(()=>validateBrief({club_id:'olympiacos',season:'1999/00',duration},clubs)).toThrow(/Duration/)
  expect(()=>validateBrief({club_id:'olympiacos',season:'1999/00',duration:12,privacy:'scheduled',publish_at:'2020-01-01T10:00:00Z'},clubs)).toThrow(/hour ahead/)
  expect(()=>validateBrief({club_id:'olympiacos',season:'1999/00',duration:12,privacy:'scheduled',publish_at:'2099-01-01T10:00'},clubs)).toThrow(/time zone/)
  expect(validateBrief({club_id:'olympiacos',season:'1999/00',duration:12,privacy:'scheduled',publish_at:'2099-01-01T10:00:00+02:00'},clubs).publish_at).toBe('2099-01-01T10:00:00+02:00')
 })
})

describe('Football Stories — the owner’s actions',()=>{
 it('pauses, resumes, cancels and retries only from states where that makes sense',()=>{
  const p=ownerAct(job(),{action:'pause'},'owner');expect(p.state).toBe('paused')
  expect(ownerAct(p,{action:'resume'},'owner').state).toBe('queued')
  expect(()=>ownerAct(job(),{action:'resume'},'owner')).toThrow(/not paused/)
  expect(ownerAct(job({state:'running'}),{action:'cancel'},'owner').state).toBe('cancel_requested')
  expect(ownerAct(job(),{action:'cancel'},'owner').state).toBe('cancelled')
  expect(()=>ownerAct(job({state:'cancelled'}),{action:'cancel'},'owner')).toThrow()
  expect(()=>ownerAct(job({state:'ready'}),{action:'retry'},'owner')).toThrow(/failed or cancelled/)
  const r=ownerAct(job({state:'failed',error:{code:'X',message:'y',retryable:true}}),{action:'retry'},'owner');expect(r).toMatchObject({state:'queued',error:null})
 })
 it('approves a script only when one is waiting',()=>{
  expect(()=>ownerAct(job(),{action:'approve_script'},'owner')).toThrow()
  const a=ownerAct(job({state:'needs_review',stage:'script',brief:{...brief,review:'script'}}),{action:'approve_script'},'owner')
  expect(a.state).toBe('queued');expect(a.brief.review).toBe('auto')
 })
 it('records an upload only as YouTube shows it, and never twice',()=>{
  const ready=job({state:'ready'})
  expect(()=>ownerAct(job(),{action:'upload_started'},'owner')).toThrow(/finished film/)
  const s=ownerAct(ready,{action:'upload_started'},'owner');expect(s.upload.state).toBe('in_progress')
  expect(()=>ownerAct(s,{action:'upload_started'},'owner')).toThrow(/already/)
  expect(()=>ownerAct(s,{action:'upload_done',videoId:'short',visibility:'private'},'owner')).toThrow(/11 characters/)
  const d=ownerAct(s,{action:'upload_done',videoId:'dQw4w9WgXcQ',visibility:'private'},'owner')
  expect(d.upload).toMatchObject({state:'done',videoId:'dQw4w9WgXcQ',visibility:'private'})
  expect(()=>ownerAct(d,{action:'upload_done',videoId:'aaaaaaaaaaa',visibility:'public'},'owner')).toThrow(/different video/)
  expect(()=>ownerAct(d,{action:'upload_reset'},'owner')).toThrow(/cannot be reset/)
  expect(()=>ownerAct(d,{action:'cancel'},'owner')).not.toThrow()
  const u=ownerAct(s,{action:'upload_uncertain',note:'browser closed mid-upload'},'owner');expect(u.upload.state).toBe('uncertain')
  expect(ownerAct(u,{action:'upload_reset'},'owner').upload.state).toBe('none')
 })
})

describe('Football Stories — the worker contract',()=>{
 const now=new Date('2026-11-02T09:00:00Z')
 it('takes the oldest queued film, and re-takes a running one only after its lease ran out',()=>{
  const a=job({},'2026-11-02T07:00:00Z'),b=job({id:'job-0000002'},'2026-11-02T06:00:00Z')
  expect(nextForWorker([a,b],now)?.id).toBe('job-0000002')
  const live=job({id:'job-0000003',state:'running',lease:{worker:'w1',until:'2026-11-02T10:00:00Z'}},'2026-11-02T01:00:00Z')
  const dead=job({id:'job-0000004',state:'running',lease:{worker:'w1',until:'2026-11-02T08:00:00Z'}},'2026-11-02T02:00:00Z')
  expect(nextForWorker([live],now)).toBeNull()
  expect(nextForWorker([live,dead,a],now)?.id).toBe('job-0000004')
  expect(nextForWorker([job({state:'paused'}),job({state:'ready'})],now)).toBeNull()
 })
 it('refuses progress and results from a worker that does not hold the lease',()=>{
  const c=claim(job(),'w1',now)
  expect(c).toMatchObject({state:'running',attempts:1});expect(c.lease?.worker).toBe('w1')
  expect(()=>report(c,'w2',{stage:'voice',progress:0.3,message:'x'},now)).toThrow(/does not hold/)
  expect(()=>finish(c,'w2',{state:'ready'},now)).toThrow(/does not hold/)
  expect(()=>report(c,'w1',{stage:'nonsense' as never,progress:0.3,message:'x'},now)).toThrow()
 })
 it('tells the worker to stop when the owner paused or cancelled, and never moves progress backwards',()=>{
  const c=claim(job(),'w1',now)
  const r1=report(c,'w1',{stage:'edit',progress:0.6,message:'Rendering'},now)
  expect(r1.control).toBe('continue')
  expect(report(r1.job,'w1',{stage:'edit',progress:0.5,message:'x'},now).job.progress).toBe(0.6)
  const cancelled=report({...r1.job,state:'cancel_requested'},'w1',{stage:'mix',progress:0.8,message:'x'},now)
  expect(cancelled.control).toBe('cancel');expect(cancelled.job.state).toBe('cancelled');expect(cancelled.job.lease).toBeNull()
  expect(report({...r1.job,state:'paused'},'w1',{stage:'mix',progress:0.8,message:'x'},now).control).toBe('pause')
 })
 it('finishes with a stable error code and whether a retry is safe',()=>{
  const c=claim(job(),'w1',now)
  const f=finish(c,'w1',{state:'failed',error:{code:'VOICE_HTTP_401',message:'bad key',retryable:false}},now)
  expect(f).toMatchObject({state:'failed',lease:null,error:{code:'VOICE_HTTP_401',retryable:false}})
  const ok=finish(c,'w1',{state:'ready',stage:'done',qa:{ok:true,checks:[]}},now);expect(ok.progress).toBe(1)
 })
 it('lets a worker write only inside its own job folder',()=>{
  expect(mediaPath('job-0000001','master.000.part')).toBe('jobs/job-0000001/master.000.part')
  for(const bad of ['../x','a/b','.hidden','Master.mp4',''])expect(()=>mediaPath('job-0000001',bad)).toThrow()
  expect(()=>mediaPath('../etc','x.mp4')).toThrow()
 })
})

describe('Football Stories — a focused film, the owner’s quotes and pictures',()=>{
 it('accepts a focus window, refuses a backwards or malformed one',()=>{
  expect(validateBrief({club_id:'olympiacos',season:'2023/24',duration:5,focus_from:'2024-03-07',focus_to:'2024-03-14'},clubs)).toMatchObject({focus_from:'2024-03-07',focus_to:'2024-03-14'})
  expect(()=>validateBrief({club_id:'olympiacos',season:'2023/24',duration:5,focus_from:'2024-03-14',focus_to:'2024-03-07'},clubs)).toThrow(/before it ends/)
  expect(()=>validateBrief({club_id:'olympiacos',season:'2023/24',duration:5,focus_from:'7.3.2024'},clubs)).toThrow(/Focus/)
 })
 it('takes quotes and headlines only in the documented shape, each with an https source',()=>{
  expect(noteLine('quote | Bill Shankly | Liverpool manager | It is much more important than that. | https://example.org/x')).toMatchObject({kind:'quote'})
  expect(noteLine('press | The Times | 2024-03-15 | A night | https://example.org/y')).toMatchObject({kind:'press'})
  for(const bad of ['quote | a | b | c | http://x.org','press | o | 15/03/2024 | h | https://x.org','rumour | a | b | c | https://x.org','quote | a | b | https://x.org'])expect(noteLine(bad)).toBeNull()
  expect(()=>validateBrief({club_id:'olympiacos',season:'2023/24',duration:5,notes:'quote | a | b | c | https://x.org\nwhatever'},clubs)).toThrow(/line 2/)
 })
 it('holds a film for the owner’s pictures, and records pictures only before it starts',()=>{
  const held=newJob('job-0000002',validateBrief({club_id:'olympiacos',season:'2023/24',duration:5,hold:true},clubs),palette,'owner','key-00000002')
  expect(held.state).toBe('paused')
  expect(nextForWorker([held])).toBeNull()
  const withArt=ownerAct(held,{action:'art_added',files:[{name:'el-kaabi-header.png',illustrated:true}]},'owner')
  expect(withArt.brief.art).toEqual([{name:'el-kaabi-header.png',illustrated:true}])
  expect(()=>ownerAct(held,{action:'art_added',files:[{name:'../x.png',illustrated:false}]},'owner')).toThrow(StoryError)
  const running=claim(ownerAct(withArt,{action:'resume'},'owner'),'w-1')
  expect(()=>ownerAct(running,{action:'art_added',files:[{name:'late.png',illustrated:false}]},'owner')).toThrow(/before the film starts/)
  expect(mediaPath('job-0000002','art-el-kaabi-header.png')).toBe('jobs/job-0000002/art-el-kaabi-header.png')
 })
 it('lets the owner’s art door sign uploads only for the owner, and only before the film starts',()=>{
  const s=src('app/api/master/stories/[id]/art/route.ts')
  expect(s).toMatch(/if\(!adminFromRequest\(r\)\)return json/)
  expect(s).toMatch(/sameOrigin\(r\)/)
  expect(s).toMatch(/\['queued','paused'\]\.includes\(cur\.job\.state\)/)
 })
})

describe('Football Stories — access',()=>{
 it('keeps the studio and its routes behind the owner login, and the worker door behind the cron secret',()=>{
  expect(src('app/master/admin/page.tsx')).toMatch(/requireAdmin\('\/master\/admin'\)/)
  for(const f of ['app/api/master/stories/route.ts','app/api/master/stories/[id]/route.ts']){
   const s=src(f)
   expect(s.match(/adminFromRequest\(r\)/g)?.length).toBeGreaterThanOrEqual(2)
   expect(s).toMatch(/sameOrigin\(r\)/)
  }
  const w=src('app/api/master/stories/worker/route.ts')
  expect(w).toMatch(/if\(!cronAuthorized\(r\)\)return json\(\{error:'Not authorised.'\},401\)/)
  expect(w).not.toMatch(/adminFromRequest/)
 })
 it('never sends the storage key to the browser, and keeps renders in a private bucket',()=>{
  expect(src('lib/stories/media.ts')).toMatch(/^import 'server-only'/)
  expect(src('app/master/stories/stories-desk.tsx')).not.toMatch(/SERVICE_ROLE|service_role|supabase/i)
  const mig=src('supabase/migrations/20261102090000_worker_stories_bucket.sql')
  expect(mig).toMatch(/'worker-stories', 'worker-stories', false/)
  expect(mig).not.toMatch(/create policy/i)
 })
})

// 4.11.2026 — owner: "I don't see any video studio in the admin". The studio is an area of the desk, it starts a film
// within a minute (the listener), and it shows whether it can work.
it('the studio is an area of the desk, on the phone bar too',()=>{
  expect(src('lib/master/crm/areas.ts')).toMatch(/key:'studio'/)
  expect(src('components/master/desk/AdminShell.tsx')).toMatch(/BAR=\[[^\]]*'studio'/)
  expect(src('app/master/admin/page.tsx')).toMatch(/section==='studio'\)return shell\(<StoriesDesk/)
  expect(src('next.config.mjs')).toMatch(/source: '\/master\/stories', destination: '\/master\/admin\?section=studio'/)
})
it('the listener starts the worker and keeps itself alive',()=>{
  const w=src('.github/workflows/stories-watch.yml')
  expect(w).toMatch(/actions: write/)
  expect(w).toMatch(/gh workflow run stories-worker\.yml/)
  expect(w).toMatch(/gh workflow run stories-watch\.yml/)
  expect(w).toMatch(/"op":\\"peek\\"|op\\":\\"peek/)
})
it('the worker compiles the club archives it researches from',()=>{
  expect(src('.github/workflows/stories-worker.yml')).toMatch(/npm run clubs:precompile/)
})
it('a heartbeat carries only a provider, a yes/no, a model and a note',async()=>{
  const {cleanHeartbeat}=await import('@/lib/stories/health')
  const h=cleanHeartbeat({writer:{provider:'gemini',ok:true,model:'gemini-2.5-pro',note:'fine',key:'AIza-secret'}},'listen-1')!
  expect(h.writer).toEqual({provider:'gemini',ok:true,model:'gemini-2.5-pro',note:'fine'})
  expect(JSON.stringify(h)).not.toMatch(/secret/)
  expect(cleanHeartbeat({writer:{provider:'evil'}})).toBeNull()
})


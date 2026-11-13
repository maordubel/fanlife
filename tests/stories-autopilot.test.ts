import {describe,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {finish,claim,newJob,ownerAct,validateBrief,type Job} from '@/lib/stories/jobs'
import {addRound,decidePitch,type PitchDay} from '@/lib/stories/pitches'
import {PREVIEW_ATTEMPTS,PREVIEW_CLAIM_MS,PUBLISH_LATE_MS,WINDOW_MS,athens,autopilotDue,cancelByOwner,noticeSent,pendingNotices,pickPitch,pipelineBusy,
 previewDelivered,previewFailed,previewHour,previewSent,previewText,publishTime,scorePitches,startAutopilot,tickJob,youtubeResult,youtubeUploaded,
 OPERATOR_PUBLISH_MS,operatorDue,operatorPublished,operatorStuck,type TickCtx} from '@/lib/stories/autopilot'
import {cancelLink,signCancel,verifyCancel} from '@/lib/stories/autopilotToken'
import {UNUPLOADED_DAYS,trimLog,unuploadedDue} from '@/lib/stories/trim'

const CLUBS=new Map([['celtic','Celtic'],['aek','AEK'],['olympiacos','Olympiacos']])
const brief=(club='celtic')=>validateBrief({club_id:club,season:'1999/00',duration:5},CLUBS)
const base=(id:string,at:Date,club='celtic')=>newJob(id,brief(club),{club_id:club,club_name:CLUBS.get(club)!,primary:'#007744',on_primary:'#FFFFFF',bans:[]},'owner','key-'+id,at)
const D=(s:string)=>new Date(s)
const raw=(director:string,club:string,extra:Record<string,unknown>={})=>({director,club_id:club,kind:'season',season:'2003/04',title:`${club} title`,logline:`${club} logline`,cold_open:'A cold open.',acts:['one','two','three'],why:'because',...extra})
const DIRECTORS=JSON.parse(JSON.stringify((await import('@/lib/stories/directors')).DIRECTORS.map(d=>d.id))) as string[]
function day(date:string,rows:unknown[]):PitchDay{const out=addRound(null,date,rows,CLUBS,new Set(),null,D(date+'T05:00:00Z'));expect(out.refused).toEqual([]);return out.day}
const SECRET='s'.repeat(40)

/** a film the autopilot picked, rendered and passed by QA */
function ready(now:Date,over:Partial<Job>={}):Job{
 const days=[day(now.toISOString().slice(0,10),[raw(DIRECTORS[0]!,'celtic')])]
 let j=startAutopilot(base('job-auto-0001',now),pickPitch(days,[],now)!,now)
 j=finish(claim(j,'w1',now),'w1',{state:'ready',qa:{ok:true,checks:[]},artefacts:{master:{chunks:[{path:'jobs/job-auto-0001/master.000.part',bytes:9}],bytes:9,sha256:'x'},preview:{path:'jobs/job-auto-0001/preview.mp4',bytes:38_000_000},thumbnails:[{path:'jobs/job-auto-0001/thumb-0.jpg',bytes:5}]},youtube:{title:'The Night It Turned'}},now)
 return {...j,...over}
}
const ctx=(now:Date,over:Partial<TickCtx>={}):TickCtx=>({on:true,telegram:true,youtube:false,worker:'r1',now,desk:'https://x.test/desk',...over})
/** preview sent and delivered at `at` → the job in its window */
function inWindow(at:Date){
 const c=tickJob(ready(D('2026-11-11T20:00:00Z')),ctx(at));expect(c.effect).toBe('preview')
 return previewDelivered(previewSent(c.job,'r1',at),'r1',at)
}

describe('autopilot · the pick (owner, 12.11.2026)',()=>{
 const now=D('2026-11-12T06:00:00Z')
 it('prefers a club not filmed recently, then known art, then what the pitch carries — and says why',()=>{
  const days=[day('2026-11-12',[raw(DIRECTORS[0]!,'celtic'),raw(DIRECTORS[1]!,'aek'),raw(DIRECTORS[2]!,'olympiacos',{kind:'match',match_ids:['m:1']})])]
  const filmed={...base('job-old-00001',D('2026-11-10T06:00:00Z'),'celtic'),state:'ready'} as Job
  const art={...base('job-art-00001',D('2026-09-01T06:00:00Z'),'aek'),state:'ready',log:[{at:'2026-09-01T07:00:00Z',text:'Drive: 14 pictures (3 from the story\'s own packs)'}]} as Job
  const s=scorePitches(days,[filmed,art],now)
  expect(s.map(x=>x.pitch.club_id)).toEqual(['aek','olympiacos','celtic'])
  expect(s[0]!.why.join(' ')).toMatch(/AEK was last filmed 30 day[\s\S]*14 pictures known/)
  expect(s[2]!.why[0]).toMatch(/Celtic was last filmed 2 day/)
  expect(scorePitches(days,[filmed,art],now)).toEqual(s)  // deterministic: no model, no clock but `now`
 })
 it('never picks a pitch the owner passed, an event already filmed, a made pitch or a stale one',()=>{
  const d=day('2026-11-12',[raw(DIRECTORS[0]!,'celtic'),raw(DIRECTORS[1]!,'aek')])
  const passed=decidePitch(d,d.rounds[0]!.pitches[0]!.id,'passed','owner',null)
  expect(scorePitches([passed],[],now).map(x=>x.pitch.club_id)).toEqual(['aek'])
  // the same event pitched again by another director after the owner passed it
  const again=day('2026-11-12',[raw(DIRECTORS[2]!,'celtic')])
  expect(scorePitches([again,{...passed,date:'2026-11-05'}],[],now).map(x=>x.pitch.club_id)).toEqual([])
  const made=decidePitch(d,d.rounds[0]!.pitches[1]!.id,'made','owner','job-x')
  expect(scorePitches([made],[],now).map(x=>x.pitch.club_id)).toEqual(['celtic'])
  const film={...base('job-film-0001',now,'celtic'),brief:{...brief('celtic'),season:'2003/04'}} as Job
  expect(scorePitches([d],[film],now).map(x=>x.pitch.club_id)).toEqual(['aek'])
  expect(pickPitch([day('2026-11-09',[raw(DIRECTORS[0]!,'celtic')])],[],now)).toBeNull()
 })
 it('does not pick while a film is in production, waiting, or riding the autopilot — and once a day',()=>{
  expect(pipelineBusy([])).toBe(false)
  expect(pipelineBusy([base('job-queue-001',now)])).toBe(true)
  expect(pipelineBusy([{...base('job-ready-001',now),state:'ready'} as Job])).toBe(false)
  const r=ready(now)
  expect(pipelineBusy([r])).toBe(true)
  expect(autopilotDue([],false,now)).toBe(false)
  expect(autopilotDue([],true,now)).toBe(true)
  const done={...r,autopilot:{...r.autopilot!,state:'handoff' as const}}
  expect(autopilotDue([done],true,now)).toBe(false)             // picked today already
  expect(autopilotDue([done],true,D('2026-11-13T06:00:00Z'))).toBe(true)
 })
})

describe('autopilot · the window (Europe/Athens, across the clock change)',()=>{
 it('opens at 10:00 Athens on both sides of the change, and not in the evening',()=>{
  expect(previewHour(D('2027-03-27T07:59:00Z'))).toBe(false)  // 09:59 EET (UTC+2)
  expect(previewHour(D('2027-03-27T08:00:00Z'))).toBe(true)   // 10:00 EET
  expect(previewHour(D('2027-03-28T06:59:00Z'))).toBe(false)  // 09:59 EEST (UTC+3), the morning after the change
  expect(previewHour(D('2027-03-28T07:00:00Z'))).toBe(true)   // 10:00 EEST
  expect(previewHour(D('2026-10-25T07:59:00Z'))).toBe(false)  // back to EET: 09:59
  expect(previewHour(D('2026-10-25T08:00:00Z'))).toBe(true)
  expect(previewHour(D('2026-11-12T18:00:00Z'))).toBe(false)  // 20:00 Athens: waits for the morning
  expect(athens(D('2027-03-28T07:00:00Z'))).toEqual({date:'2027-03-28',hour:10,hm:'10:00'})
 })
 it('publishes two full hours after the message, to the minute, stated in Athens time',()=>{
  const sent=D('2027-03-28T07:03:20Z')
  const at=publishTime(sent)
  expect(+at-+sent).toBeGreaterThanOrEqual(WINDOW_MS)
  expect(+at-+sent).toBeLessThan(WINDOW_MS+2*60_000)
  expect(athens(at).hm).toBe('12:05')
  // two real hours even when the wall clock jumps inside them (01:30 UTC → the clock goes 03:00 → 04:00 at 01:00 UTC)
  const night=D('2027-03-27T23:30:00Z')
  expect(+publishTime(night)-+night).toBe(WINDOW_MS+60_000)
  expect(athens(publishTime(night)).hm).toBe('04:31')
 })
 it('a film ready after 10:00 is sent at once and still gets its two hours; the message states the real time',()=>{
  const at=D('2026-11-12T13:20:00Z')  // 15:20 Athens
  const c=tickJob(ready(D('2026-11-12T13:15:00Z')),ctx(at))
  expect(c.effect).toBe('preview')
  const sent=previewSent(c.job,'r1',at)
  expect(sent.autopilot!.preview.publishAt).toBe('2026-11-12T15:21:00.000Z')
  const text=previewText(sent,cancelLink('https://x.test',SECRET,sent)!,null)
  expect(text).toMatch(/The Night It Turned[\s\S]*Celtic[\s\S]*About 5 minutes[\s\S]*At <b>17:21<\/b> Athens time[\s\S]*Cancel publishing/)
  expect(text).toMatch(/operator in the browser on your computer/)  // the hand-off is said, not hidden
  expect(text).toMatch(/Picked because:/)
 })
 it('waits for 10:00: a film ready at night is not sent before the morning',()=>{
  const j=ready(D('2026-11-11T20:00:00Z'))
  expect(tickJob(j,ctx(D('2026-11-12T07:55:00Z'))).effect).toBeNull()   // 09:55 Athens
  expect(tickJob(j,ctx(D('2026-11-12T08:02:00Z'))).effect).toBe('preview')
 })
})

describe('autopilot · every tick is safe to run twice',()=>{
 const ten=D('2026-11-12T08:02:00Z')
 it('claims the preview once; a second tick does nothing until the claim runs out',()=>{
  const a=tickJob(ready(D('2026-11-11T20:00:00Z')),ctx(ten))
  expect(a.effect).toBe('preview')
  const b=tickJob(a.job,ctx(D('2026-11-12T08:09:00Z'),{worker:'r2'}))
  expect(b.effect).toBeNull();expect(b.job).toBe(a.job)
  const c=tickJob(a.job,ctx(new Date(+ten+PREVIEW_CLAIM_MS+1),{worker:'r2'}))
  expect(c.effect).toBe('preview');expect(c.job.autopilot!.preview.attempts).toBe(2)
 })
 it('the reports repeat without changing anything, and only the claiming runner is heard',()=>{
  const a=tickJob(ready(D('2026-11-11T20:00:00Z')),ctx(ten)).job
  expect(()=>previewSent(a,'r2',ten)).toThrow(/does not hold/)
  const s1=previewSent(a,'r1',ten),s2=previewSent(s1,'r1',D('2026-11-12T08:05:00Z'))
  expect(s2).toBe(s1)
  const d1=previewDelivered(s1,'r1',ten),d2=previewDelivered(d1,'r1',D('2026-11-12T08:06:00Z'))
  expect(d1.autopilot!.state).toBe('window');expect(d2).toBe(d1)
  const w=tickJob(d1,ctx(D('2026-11-12T09:00:00Z')))
  expect(w.effect).toBeNull();expect(w.job).toBe(d1)   // inside the window: nothing
 })
 it('hands the film over once at the end of the window, with one notice, sent once',()=>{
  const w=inWindow(ten),end=D('2026-11-12T10:03:00Z')
  expect(tickJob(w,ctx(D('2026-11-12T10:02:59Z'))).job).toBe(w)
  const h=tickJob(w,ctx(end)).job
  expect(h.autopilot!.state).toBe('handoff');expect(h.upload.state).toBe('none')
  expect(pendingNotices([h]).map(n=>n.key)).toEqual(['handoff'])
  expect(tickJob(h,ctx(D('2026-11-12T10:10:00Z'))).job).toBe(h)
  const n=noticeSent(h,'handoff',end)
  expect(pendingNotices([n])).toEqual([]);expect(noticeSent(n,'handoff',end)).toBe(n)
  expect(h.log.at(-1)!.text).toMatch(/Autopilot: the two hours passed without a cancel/)
 })
 it('with the YouTube uploader configured: private first, public only if still not cancelled, and the truth is recorded',()=>{
  const w=inWindow(ten),end=D('2026-11-12T10:03:00Z')
  const p=tickJob(w,ctx(end,{youtube:true}))
  expect(p.effect).toBe('publish_youtube');expect(p.job.autopilot!.state).toBe('publishing')
  expect(tickJob(p.job,ctx(D('2026-11-12T10:10:00Z'),{youtube:true})).effect).toBeNull()
  const up=youtubeUploaded(p.job,'r1','abcdefghijk',end)
  expect(up.go).toBe(true);expect(up.job.upload).toMatchObject({state:'done',videoId:'abcdefghijk',visibility:'private'})
  // an API project Google has not audited: YouTube keeps it private — never reported as published
  const locked=youtubeResult(up.job,'r1',{videoId:'abcdefghijk',privacy:'private'},{desk:'d'},end)
  expect(locked.autopilot!.state).toBe('handoff');expect(pendingNotices([locked])[0]!.text).toMatch(/kept it private/)
  const live=youtubeResult(up.job,'r1',{videoId:'abcdefghijk',privacy:'public'},{desk:'d'},end)
  expect(live.autopilot!.state).toBe('published');expect(live.upload.visibility).toBe('public')
  expect(youtubeResult(live,'r1',{privacy:'public'},{desk:'d'},end)).toBe(live)
  // cancelled while the upload ran: it stays private
  const cancelled=cancelByOwner(p.job,end)
  expect(youtubeUploaded(cancelled,'r1','abcdefghijk',end).go).toBe(false)
 })
})

describe('autopilot · what never publishes',()=>{
 const ten=D('2026-11-12T08:02:00Z'),end=D('2026-11-12T10:03:00Z')
 it('no preview delivered → no publish, however much time passes',()=>{
  const claimed=tickJob(ready(D('2026-11-11T20:00:00Z')),ctx(ten)).job
  const sent=previewSent(claimed,'r1',ten)                      // stamped, but the message never arrived
  for(const t of [end,D('2026-11-12T16:00:00Z')]){const x=tickJob(sent,ctx(t));expect(x.job.autopilot!.state).not.toBe('handoff');expect(x.effect).not.toBe('publish_youtube')}
  const failed=previewFailed(sent,'r1','RuntimeError',ten)
  expect(failed.autopilot!.preview).toMatchObject({sentAt:null,publishAt:null,deliveredAt:null,claim:null})
  expect(tickJob(failed,ctx(end)).effect).toBe('preview')       // it tries again; nothing was scheduled
  let j=failed
  for(let i=1;i<PREVIEW_ATTEMPTS;i++)j=previewFailed(tickJob(j,ctx(end)).job,'r1','x',end)
  const stopped=tickJob(j,ctx(end)).job
  expect(stopped.autopilot!.state).toBe('stopped');expect(stopped.autopilot!.stop!.reason).toMatch(/preview could not be delivered/)
  expect(tickJob(ready(ten),ctx(ten,{telegram:false})).effect).toBeNull()   // Telegram not linked: nothing is sent
 })
 it('the switch off: no preview, no publish — and a window that lapsed is never published late',()=>{
  expect(tickJob(ready(D('2026-11-11T20:00:00Z')),ctx(ten,{on:false})).effect).toBeNull()
  const w=inWindow(ten)
  expect(tickJob(w,ctx(end,{on:false})).job).toBe(w)
  expect(tickJob(w,ctx(end,{on:false,youtube:true})).effect).toBeNull()
  const late=tickJob(w,ctx(new Date(Date.parse(w.autopilot!.preview.publishAt!)+PUBLISH_LATE_MS+1)))
  expect(late.job.autopilot!.state).toBe('stopped')
 })
 it('QA failed, a failed or reviewed film: the ride stops and says so',()=>{
  const bad=ready(ten,{qa:{ok:false,checks:[]}})
  const s=tickJob(bad,ctx(ten))
  expect(s.effect).toBeNull();expect(s.job.autopilot!.stop!.reason).toMatch(/checks did not pass/)
  expect(tickJob({...ready(ten),state:'needs_review'},ctx(ten)).job.autopilot!.state).toBe('stopped')
  expect(tickJob({...ready(ten),state:'failed',error:{code:'SCRIPT_INVALID',message:'x',retryable:false}},ctx(ten)).job.autopilot!.stop!.reason).toMatch(/SCRIPT_INVALID/)
  expect(tickJob({...ready(ten),state:'running'},ctx(ten)).effect).toBeNull()  // still rendering: untouched
 })
 it('cancelled by the owner: nothing publishes, the cancel is confirmed once, a second tap changes nothing',()=>{
  const w=inWindow(ten)
  const c=cancelByOwner(w,D('2026-11-12T09:00:00Z'))
  expect(c.autopilot!.state).toBe('cancelled_by_owner');expect(c.state).toBe('ready')   // the film itself stays
  expect(pendingNotices([c])[0]!.text).toMatch(/Publishing cancelled/)
  expect(cancelByOwner(c,end)).toBe(c)
  const t=tickJob(c,ctx(end,{youtube:true}))
  expect(t.effect).toBeNull();expect(t.job).toBe(c)
  expect(()=>cancelByOwner(tickJob(w,ctx(end)).job,end)).toThrow(/two hours have passed/)
  expect(()=>cancelByOwner(base('job-plain-001',ten),ten)).toThrow(/not on the autopilot/)
 })
})

describe('autopilot · the signed cancel link',()=>{
 const now=Date.parse('2026-11-12T08:05:00Z'),exp=Date.parse('2026-11-12T10:03:00Z'),id='job-auto-0001'
 const sig=signCancel(SECRET,id,exp)
 it('valid until the window ends, for this job and this purpose only',()=>{
  expect(verifyCancel(SECRET,id,exp,sig,now)).toBe(true)
  expect(verifyCancel(SECRET,id,exp,sig,exp)).toBe(true)
  expect(verifyCancel(SECRET,id,exp,sig,exp+1)).toBe(false)                       // expired
  expect(verifyCancel(SECRET,'job-auto-0002',exp,sig,now)).toBe(false)            // another job
  expect(verifyCancel(SECRET,id,exp+60_000,sig,now)).toBe(false)                  // a stretched expiry
  expect(verifyCancel(SECRET,id,exp,sig.slice(0,-1)+(sig.endsWith('0')?'1':'0'),now)).toBe(false)  // tampered
  expect(verifyCancel(SECRET,id,exp,'',now)).toBe(false)
  expect(verifyCancel('t'.repeat(40),id,exp,sig,now)).toBe(false)                 // another secret
  expect(verifyCancel('short',id,exp,signCancel(SECRET,id,exp),now)).toBe(false)
  expect(verifyCancel(SECRET,id,now+30*86_400_000,signCancel(SECRET,id,now+30*86_400_000),now)).toBe(false)  // never a long-lived link
  expect(()=>signCancel('short',id,exp)).toThrow()
 })
 it('is signed with the scheduler\'s existing secret and opens one page',()=>{
  const j=previewSent(tickJob(ready(D('2026-11-11T20:00:00Z')),ctx(D('2026-11-12T08:02:00Z'))).job,'r1',D('2026-11-12T08:02:00Z'))
  const url=new URL(cancelLink('https://x.test/',SECRET,j)!)
  expect(url.pathname).toBe('/studio-cancel')
  expect(verifyCancel(SECRET,url.searchParams.get('job')!,Number(url.searchParams.get('exp')),url.searchParams.get('sig')!,now)).toBe(true)
  expect(cancelLink('https://x.test',SECRET,ready(D('2026-11-12T08:00:00Z')))).toBeNull()  // no window yet: no link
  const store=readFileSync('lib/stories/autopilotStore.ts','utf8'),page=readFileSync('app/studio-cancel/page.tsx','utf8'),route=readFileSync('app/api/stories/autopilot/cancel/route.ts','utf8')
  for(const src of [store,page,route])expect(src).toMatch(/process\.env\.CRON_SECRET/)
 })
 it('a GET never cancels: the page only reads, and only the POST calls cancelByOwner',()=>{
  const page=readFileSync('app/studio-cancel/page.tsx','utf8'),route=readFileSync('app/api/stories/autopilot/cancel/route.ts','utf8')
  expect(page).not.toMatch(/cancelByOwner|updateJob/)
  expect(page).toMatch(/<form method="post" action="\/api\/stories\/autopilot\/cancel">/)
  const get=route.slice(route.indexOf('export function GET'))
  expect(get).not.toMatch(/cancelByOwner|updateJob/);expect(get).toMatch(/405/)
  expect(route.slice(0,route.indexOf('export function GET'))).toMatch(/verifyCancel\([\s\S]*cancelByOwner/)
 })
})

describe('retention · a film nobody uploaded (owner, 12.11.2026: seven days)',()=>{
 const now=D('2026-11-20T12:00:00Z'),old=new Date(+now-UNUPLOADED_DAYS*86_400_000-1000).toISOString(),young=new Date(+now-(UNUPLOADED_DAYS-1)*86_400_000).toISOString()
 const film=(id:string,over:Partial<Job>={}):Job=>({...ready(D('2026-11-01T08:00:00Z')),id,autopilot:null,updatedAt:old,...over})
 it('takes a ready film untouched for seven days — on a fake clock',()=>{
  expect(UNUPLOADED_DAYS).toBe(7)
  const j=film('job-stale-001')
  expect(unuploadedDue([j],new Date(Date.parse(old)+UNUPLOADED_DAYS*86_400_000-1))).toEqual([])
  expect(unuploadedDue([j],new Date(Date.parse(old)+UNUPLOADED_DAYS*86_400_000)).map(x=>x.id)).toEqual(['job-stale-001'])
  expect(unuploadedDue([film('job-young-001',{updatedAt:young})],now)).toEqual([])
 })
 it('never a job mid-render, in the cancel window, uploading, already trimmed, or with a post still waiting',()=>{
  const win=inWindow(D('2026-11-12T08:02:00Z'))
  const rows=[film('job-ok-000001'),film('job-run-00001',{state:'running',lease:{worker:'w',until:old}}),film('job-queue-001',{state:'queued'}),film('job-lease-001',{lease:{worker:'w',until:old}}),
   {...win,id:'job-window-01',updatedAt:old},{...ready(D('2026-11-01T08:00:00Z')),id:'job-prod-0001',updatedAt:old},
   film('job-upl-00001',{upload:{...ready(now).upload,state:'in_progress'}}),film('job-unc-00001',{upload:{...ready(now).upload,state:'uncertain'}}),film('job-done-0001',{upload:{...ready(now).upload,state:'done'}}),
   film('job-trim-0001',{trim:{at:old,bytes:1,files:1}}),film('job-post-0001',{social:{posts:[{id:'p',state:'scheduled'}]} as unknown as Job['social']}),film('job-nomaster1',{artefacts:null}),film('job-failed-01',{state:'failed'}),
   film('job-review-01',{state:'needs_review'}),film('job-cancel-01',{autopilot:{...win.autopilot!,state:'cancelled_by_owner'}})]
  expect(unuploadedDue(rows,now).map(j=>j.id)).toEqual(['job-ok-000001','job-review-01','job-cancel-01'])
 })
 it('says plainly what happened',()=>{
  expect(trimLog({at:old,bytes:230*1048576,files:7,reason:'unuploaded'})).toMatch(/media removed after 7 days without upload — re-render to get it back[\s\S]*230 MB/)
  expect(trimLog({at:old,bytes:1048576,files:1})).toMatch(/after the YouTube upload/)
  expect(readFileSync('app/api/master/stories/worker/route.ts','utf8')).toMatch(/unuploadedDue\(jobs\)[\s\S]*reason:'unuploaded'/)
 })
})

describe('autopilot · the browser operator closes the ride (owner, 12.11.2026)',()=>{
 const at=D('2026-11-12T08:00:00Z'),end=new Date(+publishTime(at)+60_000),desk={desk:'https://x.test/desk'}
 const approved=()=>{const h=tickJob(inWindow(at),ctx(end)).job;expect(h.autopilot!.state).toBe('handoff');expect(h.autopilot!.publish!.mode).toBe('handoff');return h}
 it('is due only for an approved film, with the switch on, for one day, and never after a cancel or a hand upload',()=>{
  const h=approved()
  expect(operatorDue(h,true,end)).toBe(true)
  expect(operatorDue(h,false,end)).toBe(false)                                   // the switch is the owner's
  expect(operatorDue(h,true,new Date(+end+OPERATOR_PUBLISH_MS+3600_000))).toBe(false) // never a day late
  expect(operatorDue(inWindow(at),true,at)).toBe(false)                          // the two hours are his
  expect(operatorDue(cancelByOwner(inWindow(at),at),true,end)).toBe(false)
  expect(operatorDue({...h,qa:{ok:false,checks:[]}},true,end)).toBe(false)
  const claimed=ownerAct(h,{action:'upload_started'},'Studio operator',end)
  expect(operatorDue(claimed,true,end)).toBe(false)                              // a second run finds it taken
  // the API uploader's own failure is not the operator's to retry
  const api=youtubeResult(tickJob(inWindow(at),ctx(end,{youtube:true})).job,'r1',{error:'boom'},desk,end)
  expect(api.autopilot!.state).toBe('handoff');expect(operatorDue(api,true,end)).toBe(false)
 })
 it('public on YouTube ends it as published and tells the owner once; private or unfinished asks for his hand',()=>{
  const h=noticeSent(approved(),'handoff',end),started=ownerAct(h,{action:'upload_started'},'Studio operator',end)
  const pub=operatorPublished(ownerAct(started,{action:'upload_done',videoId:'abcdefghijk',visibility:'public'},'Studio operator',end),desk,end)
  expect(pub.autopilot!.state).toBe('published');expect(pendingNotices([pub]).map(n=>n.key)).toEqual(['published'])
  expect(pendingNotices([pub])[0]!.text).toMatch(/youtu\.be\/abcdefghijk/);expect(operatorPublished(pub,desk,end)).toBe(pub)
  const priv=operatorPublished(ownerAct(started,{action:'upload_done',videoId:'abcdefghijk',visibility:'private'},'Studio operator',end),desk,end)
  expect(priv.autopilot!.state).toBe('handoff');expect(pendingNotices([priv])[0]!.text).toMatch(/Set it to Public/)
  const stuck=operatorStuck(ownerAct(started,{action:'upload_uncertain',note:'the dialog closed'},'Studio operator',end),desk,end)
  expect(pendingNotices([stuck]).map(n=>n.key)).toEqual(['operator_stuck']);expect(operatorDue(stuck,true,end)).toBe(false)
 })
})

import {execFileSync} from 'node:child_process'
import {readFileSync,readdirSync} from 'node:fs'
import path from 'node:path'
import {describe,expect,it} from 'vitest'
import {DIRECTORS,DIRECTOR_IDS,HOUSE_SOUL,directorOfOption} from '@/lib/stories/directors'
import {claim,driveLink,finish,newJob,newSpecialJob,validateBrief,validateClassified,validateVlog,jobKind,StoryError,type ClassifiedFile,type Job} from '@/lib/stories/jobs'
import {classifiedIndex} from '@/lib/stories/classifiedIndex'
import {EMPTY_DESK,addRound,decidePitch,eventKey,markDispatched,noteRun,pitchBrief,requestPitches,shouldDispatch,takenEvents} from '@/lib/stories/pitches'
import {classifiedBanner,deskTab,directorsBanner,docsBanner,marketingBanner,plainError,vlogBanner,type Facts} from '@/lib/stories/banners'
import type {Health} from '@/lib/stories/health'

const STUDIO=path.join(process.cwd(),'scripts','football-stories','studio')
const clubs=new Map([['aek-athens','AEK Athens'],['celtic','Celtic'],['olympiacos','Olympiacos']])
const palette={club_id:'aek-athens',club_name:'AEK Athens',primary:'#15130F',on_primary:'#FFFFFF',bans:[]}
const now=new Date('2026-11-04T08:00:00Z')

describe('the three directors — one definition, mirrored for the screen',()=>{
 it('names, taglines, tastes and owner facets match studio/directors.py, and the soul lines are soul.py’s own',()=>{
  const py=JSON.parse(execFileSync('python3',['-c','import json,directors,soul;print(json.dumps({"d":directors.DIRECTORS,"s":soul.SOUL}))'],{cwd:STUDIO,encoding:'utf8'})) as {d:Record<string,string>[];s:{who:string;feels:string[];demands:string[]}}
  expect(DIRECTORS.map(d=>d.id)).toEqual(py.d.map(d=>d.id))
  expect([...DIRECTOR_IDS]).toEqual(py.d.map(d=>d.id))
  for(const d of DIRECTORS){
   const p=py.d.find(x=>x.id===d.id)!
   expect({name:d.name,tagline:d.tagline,pitch_taste:d.pitch_taste,owner_facet:d.owner_facet}).toEqual({name:p.name,tagline:p.tagline,pitch_taste:p.pitch_taste,owner_facet:p.owner_facet})
  }
  expect(HOUSE_SOUL.who).toBe(py.s.who)
  for(const x of HOUSE_SOUL.feels)expect(py.s.feels).toContain(x)
  for(const x of HOUSE_SOUL.demands)expect(py.s.demands).toContain(x)
 })
 it('an option finds its director by id or by name',()=>{
  expect(directorOfOption({director:'terrace'})?.name).toBe('The Terrace')
  expect(directorOfOption({angle:'The Trailer Cut'})?.id).toBe('trailer')
  expect(directorOfOption({angle:'Chronicle'})).toBeNull()
 })
})

describe('a film from a pitch — the pitching director first',()=>{
 const brief=validateBrief({club_id:'aek-athens',kind:'match',season:'2002/03',match_ids:['m:2002-10-02:real'],duration:5,lead_director:'trailer'},clubs)
 it('takes a known director and refuses another',()=>{
  expect(brief.lead_director).toBe('trailer')
  expect(validateBrief({club_id:'aek-athens',season:'2002/03',duration:5},clubs).lead_director).toBeNull()
  expect(()=>validateBrief({club_id:'aek-athens',season:'2002/03',duration:5,lead_director:'spielberg'},clubs)).toThrow(/director/)
 })
 it('puts his script first without renumbering any',()=>{
  const opts=DIRECTORS.map((d,i)=>({n:i+1,angle:d.name,director:d.id,title:`T${i}`,hook:'h',chapters:['a'],words:600,opening:'o'}))
  const f=finish(claim(newJob('job-desk-0001',brief,palette,'owner','key-desk-0001',now),'w',now),'w',{state:'needs_review',stage:'script',options:opts},now)
  expect(f.options!.map(o=>o.director)).toEqual(['trailer','broadcaster','terrace'])
  expect(f.options![0]!.n).toBe(3)
 })
 it('drops a director id it does not know from an option',()=>{
  const f=finish(claim(newJob('job-desk-0002',brief,palette,'owner','key-desk-0002',now),'w',now),'w',{state:'needs_review',stage:'script',options:[{n:1,angle:'x',director:'nobody' as never,title:'t',hook:'h',chapters:[],words:1,opening:''}]},now)
  expect(f.options![0]!.director).toBeUndefined()
 })
})

const FILE:ClassifiedFile={file:'file01',number:'01',title:'THE BOTTLE',tone:'LAUGH',year:2002,episode:'file01-the-bottle.json',script:'docs/x.md',script_version:'draft 2, 4.11.2026',approved_in_file:false,minutes:5.2,beats:40,panels:{have:20,roles:24,missing:['P03']},shorts:3}
describe('CLASSIFIED — the owner’s click is part of the request',()=>{
 it('refuses without the tick, refuses a draft that changed, records who/when/which',()=>{
  expect(()=>validateClassified({file:'file01',script_version:FILE.script_version},[FILE],'owner',now)).toThrow(/approve/)
  expect(()=>validateClassified({file:'file01',approved:true,script_version:'draft 1'},[FILE],'owner',now)).toThrow(/changed/)
  expect(()=>validateClassified({file:'file02',approved:true},[FILE],'owner',now)).toThrow(/Unknown FILE/)
  expect(()=>validateClassified({file:'file02',approved:true,script_version:null},[{...FILE,file:'file02',episode:null,script_version:null}],'owner',now)).toThrow(/no episode script/)
  const x=validateClassified({file:'file01',approved:true,script_version:FILE.script_version,telegram:false},[FILE],'owner',now)
  expect(x.spec).toMatchObject({approved:true,approved_by:'owner',approved_at:now.toISOString(),script_version:FILE.script_version,episode:FILE.episode,telegram:false})
  const j=newSpecialJob('job-cl-00001','classified',x,palette,'owner','key-cl-00001',now)
  expect(jobKind(j)).toBe('classified');expect(j.state).toBe('queued');expect(j.brief.season).toBe('FILE 01')
  expect(j.log[0]!.text).toMatch(/approved by owner/)
 })
 it('reads the real panel map and episodes, never the demo cut',()=>{
  const dir=path.join(process.cwd(),'scripts','football-stories','comic')
  const manifest=JSON.parse(readFileSync(path.join(dir,'classified_manifest.json'),'utf8'))
  const eps=readdirSync(path.join(dir,'episodes')).map(name=>({name,json:JSON.parse(readFileSync(path.join(dir,'episodes',name),'utf8'))}))
  const idx=classifiedIndex(manifest,eps)
  const f1=idx.find(x=>x.file==='file01')!
  expect(f1.episode).not.toMatch(/demo/)
  expect(f1.script_version).toBeTruthy()
  expect(f1.panels.have+f1.panels.missing.length).toBe(f1.panels.roles)
  expect(f1.panels.have).toBeGreaterThan(0)
  for(const f of idx)if(!f.episode)expect(f.script_version).toBeNull()
 })
})

describe('VLOG — a match from the archive and a Drive link',()=>{
 const m={id:'m:2026-10-01:paok',date:'2026-10-01',season:'2026/27',competition:'Super League',home:'AEK Athens',away:'PAOK',score:'4–0'}
 const find=(c:string,id:string)=>c==='aek-athens'&&id===m.id?m:null
 it('takes a folder or a single clip and refuses anything else',()=>{
  expect(driveLink('https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp?usp=sharing')).toBe('https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp')
  expect(driveLink('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view')).toBe('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view')
  expect(()=>driveLink('https://evil.example/x')).toThrow(StoryError)
  expect(()=>driveLink('')).toThrow(/Drive/)
 })
 it('checks the match, the length and the notes',()=>{
  const ok={club_id:'aek-athens',match_id:m.id,drive_folder:'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp',notes:'We stood behind the goal.'}
  const x=validateVlog(ok,clubs,find)
  expect(x.spec).toMatchObject({minutes:4,telegram:true,match:m,club_name:'AEK Athens'})
  expect(x.brief).toMatchObject({season:'2026/27',match_ids:[m.id]})
  expect(()=>validateVlog({...ok,match_id:'m:x:y'},clubs,find)).toThrow(/match/)
  expect(()=>validateVlog({...ok,minutes:7},clubs,find)).toThrow(/Length/)
  expect(()=>validateVlog({...ok,notes:'x'.repeat(4001)},clubs,find)).toThrow(/4,000/)
  expect(()=>validateVlog({...ok,club_id:'nope'},clubs,find)).toThrow(/club/)
  expect(jobKind(newSpecialJob('job-vl-00001','vlog',x,palette,'owner','key-vl-00001',now))).toBe('vlog')
 })
})

const raw=(director:string,club_id:string,extra:Record<string,unknown>={})=>({director,club_id,kind:'match',season:'2002/03',match_ids:[`${club_id}:m`],title:'A night',logline:'It happened.',cold_open:'Rain.',acts:['I','II','III'],why:'Because.',...extra})
describe('the directors’ pitches',()=>{
 it('one pitch per director, three clubs, nothing taken — and says what it refused',()=>{
  const taken=new Set([eventKey({club_id:'olympiacos',kind:'match',match_ids:['olympiacos:m']})])
  const r=addRound(null,'2026-11-04',[raw('broadcaster','aek-athens'),raw('terrace','aek-athens',{match_ids:['aek-athens:x']}),raw('trailer','olympiacos'),raw('trailer','celtic'),raw('nobody','celtic')],clubs,taken,'run-1',now)
  expect(r.saved.map(p=>p.director)).toEqual(['broadcaster','trailer'])
  expect(r.refused.join(' | ')).toMatch(/another director’s pitch this round|another director's pitch this round/)
  expect(r.refused.join(' | ')).toMatch(/already pitched or filmed/)
  expect(r.refused.join(' | ')).toMatch(/Unknown director/)
  expect(r.day.rounds).toHaveLength(1)
  expect(r.saved[0]!.id).toBe('2026-11-04-broadcaster-0')
 })
 it('knows what was filmed and pitched',()=>{
  const day=addRound(null,'2026-11-04',[raw('broadcaster','aek-athens')],clubs,new Set(),null,now).day
  const job=newJob('job-p-000001',validateBrief({club_id:'celtic',season:'2002/03',duration:5},new Map([['celtic','Celtic']])),palette,'o','k-p-000001',now)
  const t=takenEvents([day],[job])
  expect(t.pitched[0]).toMatchObject({director:'broadcaster',club_id:'aek-athens',event:'aek-athens|match|aek-athens:m'})
  expect(t.films[0]!.event).toBe('celtic|season|2002/03')
 })
 it('make or pass, once',()=>{
  const day=addRound(null,'2026-11-04',[raw('terrace','celtic')],clubs,new Set(),null,now).day
  const id=day.rounds[0]!.pitches[0]!.id
  const made=decidePitch(day,id,'made','owner','job-1',now)
  expect(made.rounds[0]!.pitches[0]).toMatchObject({state:'made',job_id:'job-1',decided_by:'owner'})
  expect(()=>decidePitch(made,id,'passed','owner',null,now)).toThrow(/already being made/)
  expect(()=>decidePitch(day,'nope','passed','owner',null,now)).toThrow(/No such pitch/)
 })
 it('becomes a one-click documentary brief the studio accepts: his one script, straight to the film',()=>{
  const p=addRound(null,'2026-11-04',[raw('trailer','aek-athens')],clubs,new Set(),null,now).saved[0]!
  const b=validateBrief(pitchBrief(p),clubs)
  expect(b).toMatchObject({scripts:1,review:'auto',lead_director:'trailer',kind:'match',match_ids:['aek-athens:m'],duration:5})
  expect(b.topic.length).toBeLessThanOrEqual(240)
 })
 it('the owner’s ask is started once, again after 40 minutes, and not before the writer is back',()=>{
  const asked=requestPitches(EMPTY_DESK,'owner',now)
  expect(()=>requestPitches(asked,'owner',new Date(now.getTime()+60_000))).toThrow(/few minutes ago/)
  expect(shouldDispatch(asked,now)).toBe(true)
  const sent=markDispatched(asked,now)
  expect(shouldDispatch(sent,new Date(now.getTime()+60_000))).toBe(false)
  expect(shouldDispatch(sent,new Date(now.getTime()+41*60_000))).toBe(true)
  const waiting=noteRun(sent,{state:'waiting',retryAt:'2026-11-04T08:07:00Z',saved:1},now)
  expect(waiting.request?.dispatchedAt).toBeNull()
  expect(shouldDispatch(waiting,now)).toBe(false)
  expect(shouldDispatch(waiting,new Date('2026-11-04T08:08:00Z'))).toBe(true)
  const done=noteRun(waiting,{state:'done',saved:3},now)
  expect(done.request).toBeNull();expect(done.last).toMatchObject({state:'done',saved:3})
  // a scheduled run that has to wait is retried by itself, with nobody asking
  expect(noteRun(EMPTY_DESK,{state:'waiting',retryAt:'2026-11-04T08:07:00Z'},now).request?.by).toBe('schedule')
 })
})

const health=(o:Partial<Health>={}):Health=>({listener:{ok:true,at:now.toISOString()},writer:{provider:'gemini',ok:true,model:'gemini-2.5-flash'},storage:{ok:true},...o})
const facts=(o:Partial<Facts>={}):Facts=>({now:now.getTime(),health:health(),jobs:[],classified:[FILE],pitchDesk:EMPTY_DESK,lights:null,plan:null,...o})
describe('the banners — computed, never guessed',()=>{
 it('a documentary runs when the worker, the writer and storage are there',()=>{
  expect(docsBanner(facts()).run).toBe('yes')
  expect(docsBanner(facts({health:null})).needs.every(n=>n.light==='unknown')).toBe(true)
  expect(docsBanner(facts({health:null})).run).toBe('wait')
  const down=docsBanner(facts({health:health({listener:{ok:false,at:'2026-11-04T06:00:00Z'}})}))
  expect(down.run).toBe('no');expect(down.headline).toMatch(/Worker/)
  expect(docsBanner(facts({health:health({writer:{provider:'none',ok:false}})})).headline).toMatch(/GEMINI_API_KEY/)
 })
 it('a job waiting for Google says until when',()=>{
  const j={...newJob('job-w-000001',validateBrief({club_id:'celtic',season:'2002/03',duration:5},clubs),palette,'o','k-w-000001',now),notBefore:'2026-11-04T09:30:00Z'} as Job
  const b=docsBanner(facts({jobs:[j]}))
  expect(b.run).toBe('wait');expect(b.headline).toMatch(/back by/)
 })
 it('CLASSIFIED needs the episode and the tick; a panel gap only warns',()=>{
  expect(classifiedBanner(facts(),{file:null,approved:false}).run).toBe('wait')
  expect(classifiedBanner(facts(),{file:'file01',approved:false}).run).toBe('no')
  const ok=classifiedBanner(facts(),{file:'file01',approved:true})
  expect(ok.run).toBe('yes');expect(ok.needs.find(n=>n.label==='Panels')?.light).toBe('wait')
  expect(classifiedBanner(facts({classified:null}),{file:'file01',approved:true}).needs.some(n=>n.label==='Episodes'&&n.light==='unknown')).toBe(true)
  expect(classifiedBanner(facts({classified:[{...FILE,episode:null,script_version:null}]}),{file:'file01',approved:true}).run).toBe('no')
 })
 it('VLOG needs the match and the footage',()=>{
  expect(vlogBanner(facts(),{match:false,drive:false}).run).toBe('wait')
  expect(vlogBanner(facts(),{match:true,drive:true}).run).toBe('yes')
 })
 it('marketing: no lights is “not connected”, not “off”; nothing finished is “nothing to post”',()=>{
  const b=marketingBanner(facts())
  expect(b.needs.find(n=>n.label==='Social runner')?.light).toBe('unknown')
  expect(b.needs.find(n=>n.label==='Social plan')?.light).toBe('unknown')
  expect(b.run).toBe('no')
  expect(marketingBanner(facts({plan:[]})).needs.find(n=>n.label==='Social plan')?.text).toMatch(/0 FAN LIFE/)
 })
 it('directors: a waiting round says until when; an unreadable desk is not connected',()=>{
  const w=directorsBanner(facts({pitchDesk:{request:null,last:{at:now.toISOString(),state:'waiting',saved:1,retryAt:'2026-11-04T09:07:00Z',note:null}}}))
  expect(w.run).toBe('wait');expect(w.headline).toMatch(/until/)
  expect(directorsBanner(facts({pitchDesk:null})).run).toBe('wait')
  expect(directorsBanner(facts()).run).toBe('yes')
 })
 it('a tab in the URL, plain words for an error code',()=>{
  expect(deskTab('vlog')).toBe('vlog');expect(deskTab('nope')).toBe('docs');expect(deskTab(undefined)).toBe('docs')
  expect(plainError('WRITER_QUOTA_DAY','x')).toMatch(/midnight Pacific/)
  expect(plainError('SOMETHING','its own message')).toBe('its own message')
 })
})

import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {memoryStore,useDurableStore} from '@/lib/master/durable'
import {saveSnapshot} from '@/lib/research/store'
import {documentDate,goalsPass,htmlToText,readCandidates,readPassState,textOf} from '@/lib/goals-auto/pipeline'
import {savePolicy,resetPublishedCache} from '@/lib/goals-auto/published'
import {sha} from '@/lib/goals-auto/extract'

const PAGE=`<html><head><title>הפועל ת"א – לוקומוטיב</title></head><body><p>20.11.2001 · הפועל תל אביב 2:1 לוקומוטיב מוסקבה</p><p>בדקה 78 שמעון גרשון נגח וכבש. בן לוז כדרר באגף ימין. בן לוז הרים מאחורי ההגנה. שמעון גרשון נגח בנקודת הפנדל.</p><p>סיכום: ניצחון חשוב.</p></body></html>`
let tmp='';const prev=process.env.RESEARCH_DATA_DIR
beforeAll(()=>{tmp=mkdtempSync(path.join(tmpdir(),'goals-'));process.env.RESEARCH_DATA_DIR=tmp})
afterAll(()=>{process.env.RESEARCH_DATA_DIR=prev;rmSync(tmp,{recursive:true,force:true})})
beforeEach(async()=>{useDurableStore(memoryStore());resetPublishedCache()
 const body=Buffer.from(PAGE);await saveSnapshot('hapoel-tel-aviv',{hash:sha(PAGE),url:'https://example.org/report-1',fetchedAt:'2026-10-11T07:00:00Z',status:200,contentType:'text/html',bytes:body.length,etag:null,lastModified:null},body)})

describe('text helpers',()=>{
 it('strips markup and reads WordPress bodies',()=>{
  expect(htmlToText('<p>a&nbsp;b</p><script>x()</script><p>c</p>')).toBe('a b\n\nc')
  expect(textOf(JSON.stringify([{title:{rendered:'כותרת'},content:{rendered:'<p>גוף</p>'}}]))).toEqual({title:'כותרת',text:'גוף'})
  expect(textOf('plain text, not a page')).toBeNull()
 })
 it('takes a document date only when exactly one is written in its opening',()=>{
  expect(documentDate('20.11.2001 משחק')).toBe('2001-11-20');expect(documentDate('20.11.2001 ו-4.12.2001')).toBeNull();expect(documentDate('בלי תאריך')).toBeNull()
 })
})

describe('the daily pass',()=>{
 it('reads stored pages only, finds the goal, and never publishes while the policy is off (default)',async()=>{
  const run=await goalsPass({clubs:['hapoel-tel-aviv'],now:new Date('2026-10-11T08:00:00Z')})
  expect(run.state).toBe('ok');expect(run.counts).toMatchObject({snapshots:1,candidates:1,withSequence:1,published:0})
  const [c]=await readCandidates('hapoel-tel-aviv');expect(c).toMatchObject({status:'ready_for_review',playedOn:'2001-11-20'});expect(c!.issues).toContain('AUTO_PUBLISH_OFF')
 })
 it('a second pass over unchanged pages adds nothing and says so honestly (acceptance 1)',async()=>{
  await goalsPass({clubs:['hapoel-tel-aviv'],now:new Date('2026-10-11T08:00:00Z')})
  const again=await goalsPass({clubs:['hapoel-tel-aviv'],now:new Date('2026-10-11T08:15:00Z')})
  expect(again.state).toBe('nothing-to-do');expect((await readCandidates('hapoel-tel-aviv')).length).toBe(1)
  const s=await readPassState();expect(Object.keys(s.plans)).toHaveLength(1)
 })
 it('a paused pipeline reads nothing',async()=>{
  await savePolicy(p=>({...p,paused:true}))
  expect((await goalsPass({clubs:['hapoel-tel-aviv']})).state).toBe('paused')
  await savePolicy(p=>({...p,paused:false}))
 })
})

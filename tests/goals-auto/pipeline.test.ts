import {describe,expect,it} from 'vitest'
import {extractCandidates,mergeCandidates,minuteOf,detectLanguage,PHRASE_ZONE} from '@/lib/goals-auto/extract'
import {evaluate} from '@/lib/goals-auto/gate'
import {DEFAULT_POLICY,type Candidate,type Policy} from '@/lib/goals-auto/types'

const base={clubId:'hapoel-tel-aviv',sourceId:'wiki-he',url:'https://example.org/report',fetchedAt:'2026-10-11T08:00:00Z',playedOn:'2001-11-20',opponentHe:'לוקומוטיב מוסקבה'}
const THREE='בדקה 78 שמעון גרשון נגח וכבש. בן לוז כדרר באגף ימין. בן לוז הרים מאחורי ההגנה. שמעון גרשון נגח בנקודת הפנדל.'
const on:Policy={autoPublish:true,paused:false,sources:{'wiki-he':{sourceId:'wiki-he',enabled:true,certified:true,autoPublish:true}},clubs:{'hapoel-tel-aviv':{autoPublish:true}}}
const one=(body:string,extra={}):Candidate=>extractCandidates({...base,body,...extra})[0]!

describe('goal text extraction',()=>{
 it('reads minutes in three languages and refuses a bare number',()=>{
  expect(minuteOf('בדקה ה-89 נכנס הכדור')).toBe('89');expect(minuteOf('στο 90+3\' σκόραρε')).toBe('90+3');expect(minuteOf('scored in the 45+2 min')).toBe('45+2')
  expect(minuteOf('הקבוצה שיחקה 11 שחקנים')).toBeNull()
 })
 it('detects the language of the paragraph',()=>{expect(detectLanguage('שמעון גרשון כבש')).toBe('he');expect(detectLanguage('He scored a fine goal late on')).toBe('en');expect(detectLanguage('Ο παίκτης σκόραρε στο τέλος')).toBe('el')})
 it('learns phrase→zone only from phrases the bundled archive always puts in one zone',()=>{expect(PHRASE_ZONE.get('אגף ימין')).toBe('D2');expect(PHRASE_ZONE.has('בתוך הרחבה')).toBe(false)})
 it('two passes over the same page give the same ids (acceptance 1)',()=>{
  const a=extractCandidates({...base,body:THREE}),b=extractCandidates({...base,body:THREE,fetchedAt:'2026-10-12T08:00:00Z'})
  expect(a.map(c=>c.id)).toEqual(b.map(c=>c.id));expect(a.length).toBe(1)
 })
 it('merges a second source into one candidate with both evidence links (acceptance 3)',()=>{
  const a=one(THREE),b=one(THREE,{sourceId:'club-site',url:'https://example.org/other'})
  const m=mergeCandidates(a,b);expect(m.evidence.length).toBe(2);expect(m.sourceIds.sort()).toEqual(['club-site','wiki-he'])
 })
})

describe('the publication gate',()=>{
 it('scorer and minute alone can never become a replay (acceptance 4)',()=>{
  const c=one('בדקה 78 שמעון גרשון כבש בנגיחה.');const r=evaluate(c,{policy:on,durable:true})
  expect(r.issues).toContain('NO_SEQUENCE');expect(r.record).toBeNull();expect(r.status).toBe('candidate')
 })
 it('a grounded sequence stays unpublished when the policy is off (default)',()=>{
  const c=one(THREE);expect(c.steps.length).toBe(3)
  const r=evaluate(c,{policy:DEFAULT_POLICY,durable:true})
  expect(r.status).toBe('ready_for_review');expect(r.issues).toEqual(expect.arrayContaining(['AUTO_PUBLISH_OFF','SOURCE_NOT_CERTIFIED']))
 })
 it('publishes only when every switch and every hard check agrees',()=>{
  const c=one(THREE);expect(evaluate(c,{policy:on,durable:true})).toMatchObject({status:'auto_publishable',issues:[]})
  expect(evaluate(c,{policy:on,durable:false}).issues).toContain('STORAGE_NOT_DURABLE')
  expect(evaluate(c,{policy:{...on,paused:true},durable:true}).issues).toContain('AUTO_PUBLISH_OFF')
  expect(evaluate(c,{policy:{...on,clubs:{}},durable:true}).status).toBe('ready_for_review')
 })
 it('a fixture conflict or a missing fixture holds it, whatever else is true',()=>{
  const c=one(THREE,{playedOn:'1999-01-01'});const r=evaluate(c,{policy:on,durable:true});expect(r.status).toBe('held');expect(r.issues).toContain('FIXTURE_NOT_FOUND')
 })
 it('a non-Hebrew source never publishes a Hebrew narrative (no invented translation)',()=>{
  const c=one(THREE);const en={...c,steps:c.steps.map(s=>({...s,evidence:{...s.evidence,language:'en' as const}}))}
  expect(evaluate(en,{policy:on,durable:true}).issues).toContain('NOT_HEBREW_SOURCE')
 })
 it('an ambiguous finisher or an own goal is held',()=>{
  const c=one(THREE);expect(evaluate({...c,scorerAlias:'דני כהן'},{policy:on,durable:true}).issues).toContain('ACTOR_AMBIGUOUS')
  expect(evaluate({...c,ownGoal:true},{policy:on,durable:true}).status).toBe('held')
 })
 it('more than five touches is held, never truncated (acceptance 7)',()=>{
  const c=one(THREE),s=c.steps,six=[...s,...s].map((x,i)=>({...x,step:i+1}))
  const r=evaluate({...c,steps:six},{policy:on,durable:true});expect(r.issues).toContain('TOO_MANY_STEPS');expect(r.status).toBe('held');expect(r.record).toBeNull()
 })
 it('a step whose quote does not name its actor is held',()=>{
  const c=one(THREE),bad={...c,steps:c.steps.map((s,i)=>i===0?{...s,evidence:{...s.evidence,quote:'משפט אחר לגמרי'}}:s)}
  expect(evaluate(bad,{policy:on,durable:true}).issues).toContain('STEP_WITHOUT_EVIDENCE')
 })
 it('a goal the bundled archive already holds is left to the curated record',()=>{
  const c=one('בדקה 89 שמעון גרשון כבש. בן לוז כדרר באגף ימין. בן לוז הרים מאחורי ההגנה. שמעון גרשון בעט בנקודת הפנדל.',{playedOn:'2001-10-18'})
  expect(evaluate(c,{policy:on,durable:true}).issues).toContain('DUPLICATE_OF_BUNDLED')
 })
})

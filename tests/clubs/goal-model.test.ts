import {describe,it,expect} from 'vitest'
import {MAX_GOAL_TOUCHES} from '@/lib/clubs/goal'
import {GOAL_MOUTH,MAX_TOUCHES,RUN_MAX,addTouch,buildTimeline,endsOnGoal,finalFrame,isFull,moveTouch,percentOf,pointsFor,removeAt,removeLast,runIndices,setVerb,shareText,stateAt,suggestVerb,tierOf,totals,wire,zonePercent,type Draft} from '@/lib/clubs/goal-model'

const t=(actor:string,action:'pass'|'shot'|'header'|'cross'|'dribble'|'throughBall'|'save',zone:string)=>({actor,action,zone})

describe('gate 8 draft rules',()=>{
 it('holds at most as many touches as the server accepts',()=>{
  expect(MAX_TOUCHES).toBe(MAX_GOAL_TOUCHES)
  let d:Draft=[]
  for(let i=0;i<9;i++)d=addTouch(d,t('A','pass','B3'))
  expect(d).toHaveLength(MAX_TOUCHES);expect(isFull(d)).toBe(true)
 })
 it('refuses an unknown verb or zone and never mutates',()=>{
  const d:Draft=[t('A','pass','B3')]
  expect(addTouch(d,t('A','pass','Z9'))).toBe(d)
  expect(addTouch(d,{actor:'A',action:'volley' as never,zone:'B2'})).toBe(d)
  expect(d).toEqual([t('A','pass','B3')])
 })
 it('removes, moves and re-verbs one touch without touching the others',()=>{
  const d:Draft=[t('A','pass','B3'),t('B','cross','D2'),t('C','shot','C1')]
  expect(removeAt(d,1).map(x=>x.actor)).toEqual(['A','C'])
  expect(removeAt(d,7)).toBe(d);expect(removeLast([])).toEqual([])
  expect(moveTouch(d,0,'A4')[0]!.zone).toBe('A4');expect(moveTouch(d,0,'B3')).toBe(d);expect(moveTouch(d,0,'nope')).toBe(d)
  expect(setVerb(d,2,'header')[2]!.action).toBe('header');expect(setVerb(d,2,'shot')).toBe(d)
 })
 it('wires only a complete, valid draft',()=>{
  expect(wire([])).toBeNull()
  expect(wire([t('A','pass','B3'),t('','shot','C1')])).toEqual([t('A','pass','B3'),t('','shot','C1')])
 })
 it('suggests a verb from the shirt\'s own placement and nothing else',()=>{
  expect(suggestVerb(null,'C1')).toBe('shot')
  expect(suggestVerb(null,'B3')).toBe('pass')
  expect(suggestVerb('A3','D2')).toBe('cross')
  expect(suggestVerb('C4','B2')).toBe('throughBall')
 })
})

describe('gate 8 geometry',()=>{
 it('puts a second touch in one zone beside the first, not on it',()=>{
  const [a,b]=pointsFor(['B2','B2'])
  expect(a).not.toEqual(b)
 })
 it('maps board points and zones into the visible view',()=>{
  const z=zonePercent('A1')!
  expect(z.left).toBeGreaterThanOrEqual(0);expect(z.top).toBeGreaterThanOrEqual(0)
  expect(z.left+z.width).toBeLessThanOrEqual(100);expect(z.top+z.height).toBeLessThanOrEqual(100)
  expect(zonePercent('nope')).toBeNull()
  const g=percentOf(GOAL_MOUTH);expect(g.top).toBeGreaterThan(0);expect(g.top).toBeLessThan(20)
 })
})

describe('gate 8 replay timeline',()=>{
 const steps=[{zone:'B4',action:'pass' as const},{zone:'C3',action:'throughBall' as const},{zone:'C1',action:'shot' as const}]
 it('is deterministic and ends on the final frame',()=>{
  const a=buildTimeline(steps),b=buildTimeline(steps)
  expect(a).toEqual(b)
  const f=finalFrame(a)
  expect(f.done).toBe(true);expect(f.reached).toBe(3);expect(f.goal).toBe(true);expect(f.ball).toEqual(GOAL_MOUTH)
 })
 it('only takes the ball to the net when the last touch is a shot or a header',()=>{
  expect(endsOnGoal({action:'shot'})).toBe(true);expect(endsOnGoal({action:'header'})).toBe(true)
  expect(endsOnGoal({action:'pass'})).toBe(false);expect(endsOnGoal(undefined)).toBe(false)
  const noShot=buildTimeline([{zone:'B4',action:'pass'},{zone:'C3',action:'cross'}])
  expect(noShot.scores).toBe(false);expect(finalFrame(noShot).goal).toBe(false)
 })
 it('walks from the first touch to the last in order',()=>{
  const tl=buildTimeline(steps)
  expect(stateAt(tl,0).reached).toBe(1)
  let last=1
  for(let ms=0;ms<=tl.total;ms+=40){const f=stateAt(tl,ms);expect(f.reached).toBeGreaterThanOrEqual(last);last=f.reached}
  expect(last).toBe(3)
 })
 it('handles an empty sequence',()=>{expect(stateAt(buildTimeline([]),0).done).toBe(true)})
 it('faster speed is shorter',()=>{expect(buildTimeline(steps,2).total).toBeLessThan(buildTimeline(steps,1).total)})
})

describe('gate 8 run',()=>{
 it('deals up to three goals, never the same twice in a run, and wraps',()=>{
  expect(runIndices(0,0)).toEqual([])
  expect(runIndices(2,0)).toEqual([0,1])
  expect(runIndices(7,0)).toEqual([0,1,2]);expect(runIndices(7,1)).toEqual([3,4,5]);expect(runIndices(7,2)).toEqual([6,0,1])
  for(let r=0;r<20;r++)expect(new Set(runIndices(5,r)).size).toBe(Math.min(RUN_MAX,5))
 })
 it('adds a run up and names a tier',()=>{
  expect(totals([{id:'a',title:'a',points:5,max:8},{id:'b',title:'b',points:3,max:12}])).toEqual({points:8,max:20})
  expect(tierOf(8,8)).toBe('perfect');expect(tierOf(5,8)).toBe('strong');expect(tierOf(1,8)).toBe('keep');expect(tierOf(0,0)).toBe('keep')
 })
 it('shares the result without the archive\'s answer',()=>{
  const s=shareText({club:'X',title:'T',points:4,max:8,touches:[{actor:'A',actionWord:'Pass'},{actor:'',actionWord:'Shot'}],unnamed:'Unnamed',url:'https://x/y'})
  expect(s).toContain('4/8');expect(s).toContain('2. Unnamed — Shot');expect(s.endsWith('https://x/y')).toBe(true)
 })
})

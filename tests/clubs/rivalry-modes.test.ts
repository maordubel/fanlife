import {describe,expect,it} from 'vitest'
import {modeFrom,rivalList,rivalryModes} from '@/lib/clubs/rivalry-modes'
import {coverageOf,recordOf,resultOf,shootoutOf,wallOf,type MeetingLike} from '@/lib/clubs/derby-model'

const m=(on:string|null,home:string,away:string,hg:number,ag:number,extra:Partial<MeetingLike>={}):MeetingLike=>({on,year:on?Number(on.slice(0,4)):null,home,away,homeGoals:hg,awayGoals:ag,competition:'League',from:['A'],us:'home',...extra})

describe('DE-R01 rivals',()=>{
 it('several rivalries, roles from the record, none promoted by position',()=>{
  const list=rivalList([{id:'1',value:{name:'Zeta'}},{id:'2',value:{name:'Alpha',role:'secondary'}},{id:'3',value:{name:'Mid',role:'primary',type:'city derby',period:'1950–'}},{id:'4',value:{name:'zeta'}}])
  expect(list.map(r=>[r.name,r.role])).toEqual([['Mid','primary'],['Alpha','secondary'],['Zeta','contextual']])
  expect(list[0]?.type).toBe('city derby')
  expect(rivalList([{id:'x',value:{name:'Only'}}])[0]?.role).toBe('contextual')
  expect(rivalList([{id:'x',value:{}}])).toEqual([])
 })
 it('parses the mode from the URL',()=>{
  expect(modeFrom('wall')).toBe('wall');expect(modeFrom('blackfile')).toBe('blackfile');expect(modeFrom('x')).toBe('meetings');expect(modeFrom(undefined)).toBe('meetings')
 })
})

describe('§2.4 an approved rival alone opens only the archive',()=>{
 const base={rivals:1,meetings:0,wall:[],binary:[],items:[]}
 it('wall and Black File stay locked',()=>{
  const [meet,wall,file]=rivalryModes(base)
  expect(meet?.state).toBe('limited')
  expect(wall).toMatchObject({state:'locked',have:0,need:10,blocker:'WALL_CANDIDATES_SHORT'})
  expect(file).toMatchObject({state:'locked',have:0,have2:0,need2:4})
 })
 it('no approved rival locks the archive',()=>expect(rivalryModes({...base,rivals:0})[0]).toMatchObject({state:'locked',blocker:'RIVAL_NOT_APPROVED'}))
 it('meetings open the archive; ten candidates open the wall; dated items open the Black File with exact counts',()=>{
  const wall=Array.from({length:10},(_,i)=>({id:`c${i}`,name:`C${i}`}))
  const items=Array.from({length:6},(_,i)=>({id:`e${i}`,title:`E${i}`,on:`201${i}-03-0${i+1}`}))
  const [meet,w,f]=rivalryModes({rivals:2,meetings:5,wall,binary:[],items})
  expect(meet?.state).toBe('open');expect(w?.state).toBe('open');expect(f).toMatchObject({state:'limited',have:0,have2:3,need2:4})
 })
})

describe('DE-R02 coverage and scope',()=>{
 const list=wallOf([m('2001-01-01','A','B',2,1),m('1999-05-05','B','A',0,0,{us:'away',competition:'Cup'}),m(null,'A','B',1,3,{competition:''}),m('2010-09-09','A','B',1,1,{us:null})])
 it('states what it covers and never claims completeness',()=>{
  const c=coverageOf(list)
  expect(c).toMatchObject({n:4,counted:3,dated:3,undated:1,noCompetition:1,first:1999,last:2010,complete:false})
  expect(c.competitions).toEqual(['Cup','League'])
 })
 it('the record counts only what states a side',()=>{
  const r=recordOf(list)
  expect(r.tally.played).toBe(3);expect(r.unstated).toBe(1)
 })
})

describe('DE-R03 club perspective and shoot-outs',()=>{
 it('W/D/L is from the club side',()=>{
  const l=wallOf([m('2001-01-01','A','B',2,1),m('2002-01-01','B','A',2,1,{us:'away'}),m('2003-01-01','A','B',1,1)])
  expect(l.map(resultOf)).toEqual(['W','L','D'])
 })
 it('a shoot-out is kept apart and never changes the result',()=>{
  const [x]=wallOf([m('2001-01-01','A','B',1,1,{shootout:{home:3,away:4}})])
  expect(resultOf(x!)).toBe('D')
  expect(shootoutOf(x!)).toEqual({us:3,them:4,won:false})
  expect(x?.hg).toBe(1)
  const [y]=wallOf([m('2001-01-01','B','A',0,0,{us:'away',shootout:{home:2,away:4}})])
  expect(shootoutOf(y!)).toEqual({us:4,them:2,won:true})
  expect(resultOf(y!)).toBe('D')
  const [z]=wallOf([m('2001-01-01','A','B',0,0)])
  expect(shootoutOf(z!)).toBeNull()
  const [u]=wallOf([m('2001-01-01','A','B',0,0,{us:null,shootout:{home:3,away:1}})])
  expect(shootoutOf(u!)).toBeNull()
 })
})

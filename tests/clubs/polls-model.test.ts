import {describe,it,expect} from 'vitest'
import {SLIP,NUMBERS,POSITION_CODES,REASONS,cleanName,typeName,clearPick,debatesDone,emptySlip,filled,isComplete,nextOpen,poolFor,setPick,setReason,shareText,slipKey,validateSlip,validateVotes,xiIds} from '@/lib/clubs/polls-model'
import {pollKey} from '@/lib/clubs/activity'
import type {ClubPlayer} from '@/lib/clubs/contract'

const P=(id:string,name:string,positions:ClubPlayer['positions']):ClubPlayer=>({id,name,aliases:[],positions,fromYear:2000,toYear:2005})
const players=[P('a','Alpha Keeper',['GK']),P('b','Beta Back',['DF']),P('c','Cee Mid',['MF']),P('d','Dee Forward',['FW']),P('e','Ee Utility',['MF','FW']),P('f','Eff Unknown',[])]

describe('gate 7 · the slip',()=>{
 it('has eight lines in a fixed order, each with reasons that belong to it',()=>{
  expect(SLIP.map(q=>q.id)).toEqual(['favourite','keeper','centreback','midfield','striker','cult','number','position'])
  for(const q of SLIP)expect(REASONS[q.id]!.length,q.id).toBeGreaterThanOrEqual(3)
  expect(NUMBERS[0]).toBe(1);expect(NUMBERS.at(-1)).toBe(99);expect(POSITION_CODES).toHaveLength(8)
 })
 it('keeps its storage per club, and never the shared debates key',()=>{
  expect(slipKey('olympiacos')).not.toBe(slipKey('hapoel-tel-aviv'))
  expect(slipKey('olympiacos')).toContain('olympiacos');expect(slipKey('olympiacos')).not.toBe(pollKey('olympiacos'))
 })
 it('marks, changes and clears a line; a new pick drops the old reason',()=>{
  let s=setPick(emptySlip(),'keeper','a');s=setReason(s,'keeper','calm')
  expect(s.reasons.keeper).toBe('calm')
  expect(setPick(s,'keeper','a').reasons.keeper).toBe('calm')
  s=setPick(s,'keeper','b');expect(s.picks.keeper).toBe('b');expect(s.reasons.keeper).toBeUndefined()
  expect(setReason(emptySlip(),'keeper','calm').reasons).toEqual({})
  expect(setReason(setPick(emptySlip(),'keeper','a'),'keeper','not-a-reason').reasons).toEqual({})
  const once=setReason(setPick(emptySlip(),'keeper','a'),'keeper','calm');expect(setReason(once,'keeper','calm').reasons).toEqual({})
  expect(clearPick(s,'keeper').picks).toEqual({})
  expect(setPick(emptySlip(),'nope','a')).toEqual(emptySlip())
 })
 it('counts, completes and aims at the next open line',()=>{
  let s=emptySlip();expect(nextOpen(s)).toBe('favourite')
  for(const q of SLIP)s=setPick(s,q.id,q.kind==='player'?'a':q.kind==='number'?'9':'ST')
  expect(filled(s)).toBe(8);expect(isComplete(s)).toBe(true);expect(nextOpen(s)).toBeNull()
  s=clearPick(s,'striker');expect(nextOpen(s,'cult')).toBe('striker');expect(nextOpen(s,'midfield')).toBe('striker')
 })
})

describe('gate 7 · a device save is untrusted',()=>{
 it('keeps only what this build still offers',()=>{
  const s=validateSlip({v:1,picks:{favourite:'a',keeper:'ghost',centreback:'b',number:'09',striker:7,position:'ST',cult:'f'},reasons:{favourite:'heart',centreback:'calm',position:'me',keeper:'calm'},name:'  Dana\n<b>  K  '},players)
  expect(s.picks).toEqual({favourite:'a',centreback:'b',position:'ST',cult:'f'})
  expect(s.reasons).toEqual({favourite:'heart',position:'me'})
  expect(s.name).toBe('Danab K')
 })
 it('rejects numbers outside 1-99 and unknown position codes',()=>{
  const s=validateSlip({picks:{number:'100',position:'LB'}},players);expect(s.picks).toEqual({})
  expect(validateSlip({picks:{number:'99'}},players).picks.number).toBe('99')
  expect(validateSlip({picks:{number:'1'}},players).picks.number).toBe('1')
 })
 it('falls back to an empty slip on junk',()=>{
  for(const junk of [null,undefined,'x',5,[],{picks:[]},{picks:'x',reasons:3}])expect(validateSlip(junk,players)).toEqual(emptySlip())
 })
 it('caps and cleans the name; typing keeps a trailing space',()=>{
  expect(cleanName('x'.repeat(60))).toHaveLength(24);expect(cleanName(5)).toBe('')
  expect(typeName('Dana ')).toBe('Dana ');expect(typeName('a<b>\u0007c')).toBe('abc')
 })
})

describe('gate 7 · the picker pool',()=>{
 const none=new Set<string>()
 it('opens on the question position, and a chip off shows everyone',()=>{
  expect(poolFor(players,{q:'',pos:'GK',mine:false},none).map(p=>p.id)).toEqual(['a'])
  expect(poolFor(players,{q:'',pos:'FW',mine:false},none).map(p=>p.id)).toEqual(['d','e'])
  expect(poolFor(players,{q:'',pos:null,mine:false},none)).toHaveLength(6)
 })
 it('searches the whole roster when a position chip is off, and narrows to my XI',()=>{
  expect(poolFor(players,{q:'beta',pos:null,mine:false},none).map(p=>p.id)).toEqual(['b'])
  expect(poolFor(players,{q:'',pos:null,mine:true},new Set(['c','d'])).map(p=>p.id)).toEqual(['c','d'])
 })
 it('reads my XI from the XI save, ignoring junk',()=>{
  const ids=xiIds({formation:'4-4-2',picks:{GK:'a',D2:'b',D3:'ghost'},captain:null,twelfth:'c'},players)
  expect(ids).toEqual(expect.arrayContaining(['a','b','c']));expect(ids).not.toContain('ghost')
  expect(xiIds('junk',players)).toEqual([]);expect(xiIds(null,players)).toEqual([])
 })
})

describe('gate 7 · debates keep the shared flat map',()=>{
 const debates=[{id:'d1',choices:[{id:'x'},{id:'y'}]},{id:'d2',choices:[{id:'z'}]}]
 it('keeps votes only for a live debate and a live choice',()=>{
  expect(validateVotes({d1:'x',d2:'nope',d3:'z'},debates)).toEqual({d1:'x'})
  expect(validateVotes(null,debates)).toEqual({});expect(validateVotes([],debates)).toEqual({})
 })
 it('is done only when every debate has an answer, and never for none',()=>{
  expect(debatesDone({d1:'x'},debates)).toBe(false);expect(debatesDone({d1:'x',d2:'z'},debates)).toBe(true);expect(debatesDone({},[])).toBe(false)
 })
})

describe('gate 7 · the share text is a slip, not a score',()=>{
 it('prints the club, the lines and the link — and no count, rank or percentage',()=>{
  const t=shareText({club:'Olympiacos',title:'Terrace vote',name:'Dana',rows:[{label:'Your goalkeeper',value:'Alpha Keeper'},{label:'The number on your back',value:'#9'}],url:'https://x/y'})
  expect(t.split('\n')[0]).toBe('FAN LIFE · Olympiacos · Terrace vote · Dana')
  expect(t).toContain('Your goalkeeper: Alpha Keeper');expect(t.endsWith('https://x/y')).toBe(true)
  expect(t).not.toMatch(/%|rank|votes|most/i)
  expect(shareText({club:'C',title:'T',name:'',rows:[],url:'u'}).split('\n')[0]).toBe('FAN LIFE · C · T')
 })
})

import {describe,expect,it} from 'vitest'
import {hash} from '@/lib/clubs/rumble-rng'
import {attackDir,endsChange,LENGTH,periodOf,toWorld} from '@/lib/highlights/pitch'
import {ballAt,goalGraphicFor,sceneFor,storyOf} from '@/lib/highlights/scenes'
import {shirtArt,teamMark} from '@/lib/highlights/board'
import {rumbleReel} from '@/lib/highlights/rumble'
import {momentsOf,legendsReel} from '@/lib/legends/reel'
import type {Moment,PixelKit,Reel,ReelTeam} from '@/lib/highlights/types'
import type {ClothSpec} from '@/lib/clubs/kit-model'
import type {MatchEventRow} from '@/lib/legends/types'
import type {ShowScript} from '@/lib/clubs/rumble-show'

/* invented placeholder sides — no real people */
const kit=(shirt:string,second:string|null=null):PixelKit=>({shirt,second,pattern:second?'stripes':'plain',shorts:'#FFFFFF',socks:shirt})
const POS=['GK','DF','DF','DF','DF','MF','MF','MF','FW','FW','FW'] as const
const side=(p:string,k:PixelKit):ReelTeam=>({name:`${p} Town`,code:p.slice(0,3).toUpperCase(),kit:k,keeper:kit('#151515'),lineup:POS.map((pos,i)=>({id:`${p}${i}`,no:i+1,name:`Player ${p}${i}`,pos,kit:pos==='GK'?kit('#151515'):k}))})
const reelOf=(moments:Moment[],mine:0|1|null=0):Reel=>({id:'r',seed:7,teams:[side('aa',kit('#D7261E')),side('bb',kit('#1C2F93','#FFFFFF'))],moments,final:[1,1],pens:null,mine})
const ev=(seq:number,minute:number,kind:MatchEventRow['kind'],s:0|1|null,player?:string,detail?:string):MatchEventRow=>({seq,minute,kind,side:s,...(player?{player}:{}),...(detail?{detail}:{})})

describe('the full pitch: each side its own end, and the ends change at half-time',()=>{
 it('home attack the right-hand goal in the first half and the left in the second; extra time changes again',()=>{
  expect(attackDir(10,0)).toBe(1);expect(attackDir(10,1)).toBe(-1)
  expect(attackDir(45,0)).toBe(1);expect(attackDir(46,0)).toBe(-1);expect(attackDir(90,1)).toBe(1)
  expect(attackDir(100,0)).toBe(1);expect(attackDir(110,0)).toBe(-1)
  expect([20,60,100,115].map(periodOf)).toEqual([0,1,2,3])
  expect(endsChange(30,60)).toBe('half-time');expect(endsChange(60,95)).toBe('extra-time');expect(endsChange(100,110)).toBe('extra-time-interval')
  expect(endsChange(10,40)).toBeNull();expect(endsChange(30,100)).toBeNull();expect(endsChange(null,60)).toBeNull()
 })
 it('a goal ends in the right-hand net before half-time and in the left-hand net after it — for the other side the reverse',()=>{
  for(let i=0;i<40;i++){
   const r={...reelOf([]),seed:hash(`p${i}`)},s=(i%2) as 0|1
   for(const [minute,want] of [[20,s?0:LENGTH],[70,s?LENGTH:0],[118,s?LENGTH:0]] as const){
    const sc=sceneFor(r,{minute,side:s,kind:'goal',score:s?[0,1]:[1,0]},i),goal=sc.cues.find(q=>q.kind==='goal')!,b=ballAt(sc.ball,goal.t),w=toWorld(b.x,b.y,sc.dir)
    expect(sc.dir).toBe(attackDir(minute,s))
    expect(Math.abs(w.L-want),`minute ${minute} side ${s}: the ball crossed at ${w.L.toFixed(1)}`).toBeLessThan(3)
    expect(w.D).toBeGreaterThan(28);expect(w.D).toBeLessThan(40)
   }
  }
 })
 it('both elevens are on the ground: the rest of the side fills it, unnamed, never anybody twice, never a bench man',()=>{
  const r=reelOf([]);r.teams[0].lineup.push({id:'sub1',no:12,name:'Player sub',pos:'FW',kit:r.teams[0].kit,bench:true})
  for(let i=0;i<30;i++){const sc=sceneFor({...r,seed:i},{minute:30,side:(i%2) as 0|1,kind:'save',player:'aa9',score:[0,0]},i)
   const men=sc.actors.filter(a=>a.team>=0),pids=men.map(a=>a.pid)
   expect(new Set(pids).size).toBe(pids.length);expect(men.length).toBeGreaterThanOrEqual(18);expect(pids).not.toContain('sub1')
   for(const a of men.filter(x=>x.extra))expect(a.name).toBe('')
  }
 })
})

describe('set pieces are scenes of their own, from the engine’s detail',()=>{
 it('a goal or a chance marked penalty / free-kick / corner plays as that set piece; a missed penalty is never a block',()=>{
  const evs=[ev(1,12,'goal',0,'aa9','penalty'),ev(2,30,'chance',1,'bb9','penalty'),ev(3,41,'goal',1,'bb10','free-kick'),ev(4,45,'half-time',null),ev(5,60,'chance',0,'aa8','corner'),ev(6,77,'goal',0,'aa10')]
  for(let seed=0;seed<30;seed++){
   const ms=momentsOf(evs,seed)
   expect(ms.map(m=>m.shape).slice(0,4)).toEqual(['penalty','penalty','free-kick','corner'])
   expect(['save','miss','post']).toContain(ms[1]!.kind)
   // a log that marks set pieces marks all of them: its other goals are open play
   expect(['penalty','free-kick','corner']).not.toContain(ms[4]!.shape)
   expect(ms.map(m=>m.score)).toEqual([[1,0],[1,0],[1,1],[1,1],[2,1]])
  }
 })
 it('an older log with no marks keeps the seeded shapes it always had',()=>{
  const evs=[ev(1,12,'goal',0,'aa9'),ev(2,30,'chance',1,'bb9'),ev(3,60,'goal',1,'bb10')]
  const ms=momentsOf(evs,99);expect(ms).toHaveLength(3)
  for(const m of ms)expect(m.shape).toBeDefined()
  expect(JSON.stringify(momentsOf(evs,99))).toBe(JSON.stringify(ms))
 })
 it('the scenes: a penalty from the spot with the keeper on his line, a free kick with a wall at 9.15 m, a corner from the flag',()=>{
  const r=reelOf([])
  for(let i=0;i<30;i++){
   const pen=sceneFor({...r,seed:i},{minute:20,side:0,kind:(['goal','save','miss'] as const)[i%3]!,shape:'penalty',score:[0,0]},i)
   expect(pen.variant).toBe('from the penalty spot');const b0=pen.ball[0]!;expect(Math.abs(b0.y-11)).toBeLessThan(.01);expect(Math.abs(Math.abs(b0.x-34))).toBeLessThan(.01)
   expect(pen.actors.some(a=>a.role==='ref')).toBe(true)
   // the ball waits on the spot (the quadrant, the free-kick mark) until it is struck
   const k=pen.cues.find(q=>q.kind==='kick')!,bk=ballAt(pen.ball,k.t-.05);expect(Math.hypot(bk.x-34,bk.y-11)).toBeLessThan(.05)
   const fk=sceneFor({...r,seed:i},{minute:20,side:0,kind:'save',shape:'free-kick',score:[0,0]},i)
   expect(fk.variant).toMatch(/free kick/);const f0=fk.ball[0]!,wall=fk.actors.filter(a=>a.id==='d3'||a.id==='d4')
   for(const a of wall)expect(Math.hypot(a.keys[0]!.x-f0.x,a.keys[0]!.y-f0.y)).toBeGreaterThan(8.6)
   const co=sceneFor({...r,seed:i},{minute:20,side:0,kind:'goal',shape:'corner',score:[1,0]},i),c0=co.ball[0]!
   expect(co.variant).toMatch(/corner/);expect(c0.y).toBeLessThan(1);expect(Math.min(c0.x,68-c0.x)).toBeLessThan(1)
   const ck=co.cues.find(q=>q.kind==='kick')!,cb=ballAt(co.ball,ck.t-.05);expect(Math.hypot(cb.x-c0.x,cb.y-c0.y)).toBeLessThan(.05)
   const fkk=fk.cues.find(q=>q.kind==='kick')!,fb=ballAt(fk.ball,fkk.t-.05);expect(Math.hypot(fb.x-f0.x,fb.y-f0.y)).toBeLessThan(.05)
  }
 })
})

describe('a goal graphic after every goal, both sides',()=>{
 it('ours plays the film, theirs the muted card — and a neutral reel plays the film for both',()=>{
  const ms:Moment[]=[{minute:10,side:0,kind:'goal',player:'aa9',score:[1,0]},{minute:20,side:1,kind:'goal',player:'bb9',score:[1,1]},{minute:50,side:1,kind:'goal',player:'bb9',score:[1,2]},{minute:80,side:1,kind:'goal',player:'bb9',score:[1,3]}]
  for(const mine of [0,1,null] as const){
   const r=reelOf(ms,mine),st=storyOf(r)
   st.filter(m=>m.kind==='goal').forEach((m,i)=>{const g=goalGraphicFor(r,m,sceneFor(r,m,i),r.moments)
    expect(g,`goal ${m.minute} for ${mine}`).not.toBeNull()
    if(mine===null||m.side===mine)expect(g!.kind).toBe('film');else expect(g!.kind).toBe('against')
   })
  }
  const r=reelOf(ms,0),third=goalGraphicFor(r,ms[3]!,sceneFor(r,ms[3]!,3),ms)
  expect(third).toEqual({kind:'against',hattrick:true})
  expect(goalGraphicFor(r,{minute:5,side:0,kind:'save',score:[0,0]},sceneFor(r,{minute:5,side:0,kind:'save',score:[0,0]},0),ms)).toBeNull()
 })
})

describe('crests and shirts on the boards, with their fallbacks',()=>{
 const cloth:ClothSpec={base:'red',trim:'white',pattern:'stripe-wide',collar:'round',collarInk:'base',sleeveInk:'base',maker:'Maker',sponsor:'Sponsor',crest:true,name:null,number:null}
 it('a crest file prints the crest; none prints the colour chip',()=>{
  const t=side('aa',kit('#D7261E'))
  expect(teamMark({...t,crest:'/crests/x.png'})).toEqual({kind:'crest',src:'/crests/x.png'})
  expect(teamMark(t).kind).toBe('chip')
 })
 it('a documented garment prints with its maker and sponsor; a man’s back carries his name and number; none falls to the pixel kit',()=>{
  const t={...side('aa',kit('#D7261E')),crest:'/crests/x.png',cloth},p={...t.lineup[9]!,cloth}
  const front=shirtArt(t);expect(front.kind).toBe('cloth');if(front.kind==='cloth'){expect(front.spec.sponsor).toBe('Sponsor');expect(front.crest).toBe('/crests/x.png')}
  const back=shirtArt(t,p,true);expect(back.kind==='cloth'&&back.spec.number).toBe(10);expect(back.kind==='cloth'&&back.spec.name).toBe('AA9')
  const bare=shirtArt(side('aa',kit('#D7261E')));expect(bare.kind).toBe('pixel')
  const noCrest=shirtArt({...t,crest:null});expect(noCrest.kind==='cloth'&&noCrest.spec.crest).toBe(false)
 })
 it('a LEGENDS reel carries the club crest it can find and each man’s documented garment when the wardrobe can draw it',()=>{
  const evs=[ev(1,10,'goal',0,'h9')]
  const xi=(c:string)=>POS.map((pos,i)=>({id:`${c}${i}`,name:`Player ${c}${i}`,pos,from:1990,to:1995}))
  const career={clubId:'celtic',teams:[{club:'celtic',name:'Celtic'},{club:'nowhere',name:'Nowhere'}]} as never
  const f={id:'f1',round:1,home:'celtic',away:'nowhere',result:{goals:[1,0],pens:null,events:evs,seed:3,sides:[{formation:'4-3-3',xi:xi('h')},{formation:'4-4-2',xi:xi('a')}]}} as never
  const wardrobe={home:[{id:'k1',season:'1992-93',design:'stripes',colours:['green','white']}],away:[]}
  const r=legendsReel(career,f,{celtic:{wardrobe,primary:'#1F6B3B',cloth:{k1:cloth}}})!
  expect(r.teams[0].crest).toBe('/crests/celtic.png');expect(r.teams[1].crest).toBeNull()
  expect(r.teams[0].cloth).toEqual(cloth);expect(r.teams[0].lineup[5]!.cloth).toEqual(cloth);expect(r.teams[1].cloth).toBeNull()
 })
})

describe('the Royal Rumble still plays',()=>{
 it('a Rumble script becomes a reel whose scenes build, and its line-up board can draw a documented shirt',()=>{
  const men=(s:'us'|'them')=>(['GK','DF','MF','FW','FW'] as const).map((position,i)=>({id:`${s}${i}`,name:`Player ${s}${i}`,position,price:1,fromYear:1990,toYear:1994,side:s,x:0,y:0}))
  const script={us:men('us'),them:men('them'),final:{us:1,them:0},play:{moves:[{minute:12,side:'us',end:'goal',shooter:'us3',steps:[{kind:'through'}],score:{us:1,them:0}},{minute:50,side:'them',end:'save',shooter:'them3',keeper:'us0',steps:[{kind:'cross'}],score:{us:1,them:0}}]}} as unknown as ShowScript
  const wardrobe={home:[{id:'k1',season:'1992-93',design:'hoops',colours:['green','white']}],away:[]}
  const r=rumbleReel(script,wardrobe,{us:{name:'Us FC',primary:'#1F6B3B'},them:{name:'Them FC',primary:'#1C2F93'}},5)
  expect(r.moments.map(m=>m.kind)).toEqual(['goal','save'])
  expect(r.teams[0].cloth?.pattern).toBe('hoops');expect(r.teams[1].cloth).toBeNull()
  const sc=storyOf(r).map((m,i)=>sceneFor(r,m,i));expect(sc).toHaveLength(2);for(const s of sc)expect(s.duration).toBeGreaterThan(1)
  expect(goalGraphicFor(r,r.moments[0]!,sc[0]!,r.moments)?.kind).toBe('film')
 })
})

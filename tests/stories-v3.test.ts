import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
import {claim,finish,newJob,ownerAct,validateBrief,StoryError,type Job} from '@/lib/stories/jobs'
import {findMatches,type Catalog} from '@/lib/stories/catalog'

const clubs=new Map([['aek','AEK Athens'],['olympiacos','Olympiacos']])
const palette={club_id:'aek',club_name:'AEK Athens',primary:'#15130F',on_primary:'#FFFFFF',bans:[]}
const now=new Date('2026-11-04T08:00:00Z')

describe('Studio v3 — what a film can be about',()=>{
 it('takes one match, a tie of two to eight, a season and a rivalry over a span of years',()=>{
  expect(validateBrief({club_id:'aek',kind:'match',season:'2002/03',match_ids:['m:2002-10-02:real'],duration:5},clubs)).toMatchObject({kind:'match',match_ids:['m:2002-10-02:real'],scripts:3,drive:true})
  expect(()=>validateBrief({club_id:'aek',kind:'match',season:'2002/03',match_ids:[],duration:5},clubs)).toThrow(/one match/)
  expect(()=>validateBrief({club_id:'aek',kind:'tie',season:'2002/03',match_ids:['a:1:x'],duration:5},clubs)).toThrow(/two to eight/)
  expect(validateBrief({club_id:'aek',kind:'tie',season:'2002/03',match_ids:['a:1:x','a:2:x'],duration:7},clubs).match_ids).toHaveLength(2)
  expect(()=>validateBrief({club_id:'aek',kind:'rivalry',season:'2002/03',opponent:'Olympiacos',duration:10},clubs)).toThrow(/spans years/)
  expect(()=>validateBrief({club_id:'aek',kind:'rivalry',season:'1971–2026',duration:10},clubs)).toThrow(StoryError)
  expect(validateBrief({club_id:'aek',kind:'rivalry',season:'1971–2026',opponent:'Olympiacos',duration:10},clubs)).toMatchObject({opponent:'Olympiacos',match_ids:[]})
  expect(()=>validateBrief({club_id:'aek',kind:'film',season:'2002/03',duration:5},clubs)).toThrow(/kind/)
  expect(()=>validateBrief({club_id:'aek',kind:'match',season:'2002/03',match_ids:['<script>'],duration:5},clubs)).toThrow(/match/)
 })
 it('takes every look and feeling on the cards, and nothing else',()=>{
  for(const visual_style of ['collage','papercut','archive','night'])expect(validateBrief({club_id:'aek',season:'2002/03',duration:7,visual_style},clubs).visual_style).toBe(visual_style)
  for(const tone of ['auto','triumph','heartbreak','underdog','rivalry','nostalgia','drama'])expect(validateBrief({club_id:'aek',season:'2002/03',duration:7,tone},clubs).tone).toBe(tone)
  expect(()=>validateBrief({club_id:'aek',season:'2002/03',duration:7,tone:'angry'},clubs)).toThrow(/tone/)
  expect(validateBrief({club_id:'aek',season:'2002/03',duration:7,scripts:1,drive:false,reel_to_telegram:true},clubs)).toMatchObject({scripts:1,drive:false,reel_to_telegram:true})
 })
})

describe('Studio v3 — three scripts, one click',()=>{
 const brief=validateBrief({club_id:'aek',kind:'match',season:'2002/03',match_ids:['m:2002-10-02:real'],duration:5},clubs)
 const base=newJob('job-v3-0001',brief,palette,'owner','key-v3-0001',now)
 const opts=[1,2,3].map(n=>({n,angle:['Chronicle','From the stands','The turning point'][n-1]!,title:`T${n}`,hook:'h',chapters:['a','b'],words:600,opening:'o'}))
 it('keeps the three options the worker wrote, cleaned and at most three',()=>{
  const f=finish(claim(base,'w1',now),'w1',{state:'needs_review',stage:'script',options:[...opts,{...opts[0]!,n:4}]},now)
  expect(f.options).toHaveLength(3);expect(f.options![1]).toMatchObject({n:2,angle:'From the stands'})
  expect(f.progress).toBe(0)
 })
 it('queues the chosen script and refuses a script that is not on the table',()=>{
  const f=finish(claim(base,'w1',now),'w1',{state:'needs_review',stage:'script',options:opts},now)
  const c=ownerAct(f,{action:'choose_script',option:2},'owner',now)
  expect(c).toMatchObject({state:'queued'});expect(c.brief.choice).toBe(2)
  expect(()=>ownerAct(f,{action:'choose_script',option:9},'owner',now)).toThrow(/Unknown script/)
  expect(()=>ownerAct(base,{action:'choose_script',option:1},'owner',now)).toThrow(/no scripts/)
  expect(()=>ownerAct(f,{action:'approve_script'},'owner',now)).toThrow()
 })
})

describe('Studio v3 — the catalog',()=>{
 const m=(id:string,date:string,tags:string[],o='Real Madrid',season='2002/03')=>({id,date,season,competition:'Champions League',stage:null,home:'AEK Athens',away:o,score:'3–3',outcome:'draw' as const,opponent:o,side:'home' as const,scorers:true,tags})
 const cat:Catalog={club_id:'aek',seasons:{'2002/03':3,'2001/02':1},opponents:[],matches:[m('a','2002-09-01',[]),m('b','2002-10-02',['europe','goals']),m('c','2003-05-01',['final'],'Olympiacos'),m('d','2001-11-01',['derby'],'Olympiacos','2001/02')]}
 it('puts finals, derbies and European nights first, and filters by season, tag, opponent and text',()=>{
  expect(findMatches(cat,{}).matches.map(x=>x.id)).toEqual(['c','b','d','a'])
  expect(findMatches(cat,{tag:'big'}).matches.map(x=>x.id)).toEqual(['c','b','d'])
  expect(findMatches(cat,{season:'2001/02'}).matches.map(x=>x.id)).toEqual(['d'])
  expect(findMatches(cat,{opponent:'Olympiacos'}).total).toBe(2)
  expect(findMatches(cat,{q:'real'}).total).toBe(2)
  expect(findMatches(cat,{order:'new',limit:500}).matches).toHaveLength(4)
 })
 it('ships a catalog for every club the studio offers, each match the research stage can read',()=>{
  const idx=JSON.parse(readFileSync('content/generated/stories-seasons.json','utf8')).clubs as Record<string,Record<string,number>>
  for(const [club,seasons] of Object.entries(idx)){
   const c=JSON.parse(readFileSync(`content/generated/stories/${club}.json`,'utf8')) as Catalog
   expect(c.club_id).toBe(club)
   expect(c.matches.length).toBe(Object.values(seasons).reduce((a,b)=>a+b,0))
   expect(new Set(c.matches.map(x=>x.id)).size).toBe(c.matches.length)
  }
 })
 it('keeps the wizard on cards and chips, with no sideways scrolling',()=>{
  const s=readFileSync('app/master/stories/stories-desk.tsx','utf8')+readFileSync('app/master/stories/studio.module.css','utf8')
  expect(s).not.toMatch(/overflow-x|snap-x/)
  expect(s).toMatch(/choose_script/)
 })
})

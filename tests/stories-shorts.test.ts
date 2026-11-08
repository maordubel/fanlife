import {describe,expect,it} from 'vitest'
import {claim,finish,flowFiles,jobKind,newSpecialJob,ownerAct,validateShort,type FlowPack,type Palette,type VlogMatch} from '@/lib/stories/jobs'
import {DESK_TABS} from '@/lib/stories/banners'

// 8.11.2026 — owner: "the studio prepares everything each kind of video needs, recommends the matches it knows most about"
const clubs=new Map([['olympiacos','Olympiacos']])
const match:VlogMatch={id:'olympiacos:a-m-2024-05-29-olympiacos-fiorentina',date:'2024-05-29',season:'2023/24',competition:'UEFA Europa Conference League',home:'Olympiacos',away:'Fiorentina',score:'1–0'}
const find=(_c:string,id:string)=>id===match.id?match:null
const palette:Palette={club_id:'olympiacos',club_name:'Olympiacos',primary:'#C8102E',on_primary:'#FFFFFF',bans:[]}
const pack:FlowPack={title:'The 116th minute',narration:'So.',characters:[{id:'kaabi',role:'striker',prompt:'sheet',model:'Nano Banana',aspect:'9:16',credits:0}],
 clips:[{beat:1,file:'clip-0.mp4',prompt:'clip',model:'Omni Flash',aspect:'9:16',credits:18,seconds:6,ingredients:['kaabi']}],
 stills:[{beat:0,file:'still-0.jpg',prompt:'still',model:'Nano Banana',aspect:'9:16',credits:0}],credits:18,steps:['Open Flow'],
 story:{tag:'FAN LIFE · SHORTS',beats:[{say:'So.',still:0},{say:'One nil.',clip:0}]}}

describe('animated Shorts on Google Flow',()=>{
 it('is a match from the archive, 20 or 30 seconds',()=>{
  const {spec,brief}=validateShort({club_id:'olympiacos',match_id:match.id},clubs,find)
  expect(spec.seconds).toBe(30);expect(brief.match_ids).toEqual([match.id])
  expect(()=>validateShort({club_id:'olympiacos',match_id:'nope:x'},clubs,find)).toThrow(/match/)
  expect(()=>validateShort({club_id:'olympiacos',match_id:match.id,seconds:45},clubs,find)).toThrow(/20 or 30/)
 })
 it('stops with its Flow pack, takes the files into their slots, then queues the edit',()=>{
  let j=newSpecialJob('aaaaaaaa-1111','short',validateShort({club_id:'olympiacos',match_id:match.id},clubs,find),palette,'owner','k1')
  expect(jobKind(j)).toBe('short')
  j=claim(j,'w1')
  j=finish(j,'w1',{state:'needs_review',stage:'graphics',flow:pack})
  expect(j.state).toBe('needs_review');expect(j.flow?.credits).toBe(18);expect(flowFiles(j.flow!)).toEqual(['clip-0.mp4','still-0.jpg'])
  expect(()=>ownerAct(j,{action:'flow_ready'},'owner')).toThrow(/missing/)
  expect(()=>ownerAct(j,{action:'flow_added',files:['clip-9.mp4']},'owner')).toThrow(/slots/)
  j=ownerAct(j,{action:'flow_added',files:['clip-0.mp4','still-0.jpg']},'owner')
  j=ownerAct(j,{action:'flow_ready'},'owner')
  expect(j.state).toBe('queued');expect(j.flow).toBeTruthy()
 })
 it('never takes a documentary picture upload',()=>{
  const j=newSpecialJob('aaaaaaaa-2222','short',validateShort({club_id:'olympiacos',match_id:match.id},clubs,find),palette,'owner','k2')
  expect(()=>ownerAct(j,{action:'art_added',files:[{name:'a.png',illustrated:false}]},'owner')).toThrow()
 })
 it('has its own tab, and the Ideas tab comes first',()=>{
  expect(DESK_TABS[0]).toBe('ideas');expect(DESK_TABS).toContain('shorts')
 })
})

import {describe,expect,it} from 'vitest'
import {newJob,type Job} from '@/lib/stories/jobs'
import {deliverables} from '@/lib/stories/deliverables'

const now=new Date('2026-11-10T08:00:00Z')
const palette={club_id:'hapoel-tel-aviv',club_name:'Hapoel Tel Aviv',primary:'#B02D10',on_primary:'#FFFFFF',bans:[]}
const film=(over:Partial<Job>={}):Job=>({...newJob('0f1e2d3c-aaaa-bbbb-cccc-000000000002',{club_id:'hapoel-tel-aviv',club_name:'Hapoel Tel Aviv',season:'2004/05',topic:'',duration:5,visual_style:'collage',voice:'auto',review:'auto',privacy:'private',publish_at:null,kind:'match',match_ids:['hta:m-1'],tone:'auto'},palette,'owner','key-12345678',now),state:'ready',...over})
const short=(id:string,match:string,state:Job['state']='ready'):Job=>({...newJob(id,{club_id:'hapoel-tel-aviv',club_name:'Hapoel Tel Aviv',season:'2004/05',topic:'',duration:0.5,visual_style:'mixed',voice:'auto',review:'auto',privacy:'private',publish_at:null,kind:'match',match_ids:[match],tone:'auto'},palette,'owner','key-87654321',now),kind:'short',state})

describe('The production standard: film · Shorts · Reel · animated Short',()=>{
 it('reads each of the four from the jobs',()=>{
  const j=film({upload:{state:'done',videoId:'AW2N4A39fBM',visibility:'scheduled',publishAt:null,at:null,by:null,note:null},
   artefacts:{shorts:[{path:'p',bytes:1,hook:'h',seconds:20}]},
   social:{posts:[{platform:'instagram',media:{kind:'short',index:0},state:'scheduled'},{platform:'facebook',media:{kind:'short',index:0},state:'sent'}] as never}})
  expect(deliverables(j,[short('0f1e2d3c-aaaa-bbbb-cccc-000000000003','hta:m-1')]).map(d=>d.done)).toEqual([true,true,true,true])
 })
 it('a Reel needs both Instagram and Facebook; a failed post or a thumbnail does not count; a cancelled Short does not count',()=>{
  const j=film({social:{posts:[{platform:'instagram',media:{kind:'short',index:0},state:'failed'},{platform:'facebook',media:{kind:'thumbnail',index:0},state:'sent'}] as never}})
  const d=deliverables(j,[short('0f1e2d3c-aaaa-bbbb-cccc-000000000004','hta:m-1','cancelled')])
  expect(d.map(x=>x.done)).toEqual([false,false,false,false])
  expect(d[3]!.detail).toBe('not made')
 })
})

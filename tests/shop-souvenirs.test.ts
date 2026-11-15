import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
vi.mock('@/lib/shop/store',()=>({readShop:async()=>({settings:{open:true,shopId:1,popupUrl:'',margin:45,matches:{}},products:[],audit:[]}),updateShop:vi.fn(),forgetPublicShop:()=>{}}))
vi.mock('@/lib/shop/build',()=>({client:vi.fn(),pressProduct:vi.fn()}))
vi.mock('@/lib/shop/personal/render',()=>({renderSouvenir:vi.fn()}))
vi.mock('@/lib/legends/owner',()=>({viewer:async()=>'me'}))
vi.mock('@/lib/legends/store',()=>({readCareer:async(id:string)=>id==='mine'?{career:{owner:'me',clubId:'hapoel-tel-aviv',clubName:'Hapoel Tel Aviv',history:[{ordinal:4,place:1,of:14,points:78,w:24,d:6,l:4,champion:true}],
 teams:[{ai:false,lineup:{formation:'4-3-3',xi:Array.from({length:11},(_,i)=>`c${i}`),captain:'c5'},cards:Object.fromEntries(Array.from({length:11},(_,i)=>[`c${i}`,{name:`Card Man${i}`,from:1990,to:1995}]))}]}}:id==='theirs'?{career:{owner:'someone',clubId:'hapoel-tel-aviv'}}:null}))
vi.mock('@/lib/fanlife/catalog',()=>({fanShirtMap:async()=>({'a-1':{slug:'a-1',club:'hapoel-tel-aviv',variant:'home',seasonLabel:'1985/86',kitId:null,kit:null},'b-2':{slug:'b-2',club:'hapoel-tel-aviv',variant:'away',seasonLabel:'2002/03',kitId:null,kit:null}})}))
vi.mock('@/lib/clubs/resolver',()=>({loadClub:async()=>({data:{identity:{name:'Hapoel Tel Aviv'},kits:[],matches:[
 {value:{id:'m1',name:'הפועל תל אביב 1–2 מכבי תל אביב',on:'1993-01-23',competition:'ליגה לאומית',home:'הפועל תל אביב',away:'מכבי תל אביב',homeGoals:1,awayGoals:2}},
 {value:{id:'m2',name:'AE Larissa 0-2 Olympiacos',on:'2025-10-18',competition:'Super League'}}]}})}))
import {POST,GET} from '@/app/api/shop/personal/souvenir/route'
import {cleanLine} from '@/lib/shop/personal/sign'

const post=(b:unknown)=>POST(new Request('http://x/api/shop/personal/souvenir',{method:'POST',body:JSON.stringify({dry:true,...b as object})}))
const specOf=async(r:Response)=>{const j=await r.json();return JSON.parse(Buffer.from(new URL(j.proof,'http://x').searchParams.get('s')!,'base64url').toString())}
describe('FAN LIFE souvenirs',()=>{
 it('frames a first match from the record, with his age and gate — and reads a score from the name when that is all there is',async()=>{
  const s=await specOf(await post({kind:'first',club:'hapoel-tel-aviv',match:'m1',age:8,gate:'5',who:'Noam Levi'}))
  expect([s.w,s.hg,s.ag,s.age,s.gate,s.who]).toEqual(['first',1,2,8,'5','Noam Levi'])
  const t=await specOf(await post({kind:'first',club:'hapoel-tel-aviv',match:'m2',age:400}))
  expect([t.home,t.away,t.hg,t.ag,t.age]).toEqual(['AE Larissa','Olympiacos',0,2,null])
  expect((await post({kind:'first',club:'hapoel-tel-aviv',match:'nope'})).status).toBe(422)
 })
 it('prints only the season of his own career',async()=>{
  const s=await specOf(await post({kind:'legends',club:'hapoel-tel-aviv',career:'mine'}))
  expect([s.pts,s.champ,s.n.length,s.n.find((m:{cap?:boolean})=>m.cap).name]).toEqual([78,true,11,'Man5'])
  expect((await post({kind:'legends',club:'hapoel-tel-aviv',career:'theirs'})).status).toBe(403)
 })
 it('frames shirts from the catalogue only, the first on the card',async()=>{
  const s=await specOf(await post({kind:'shirts',slugs:['b-2','a-1','forged'],note:'The one Dad kept'}))
  expect([s.hero.s,s.rest.length,s.note]).toEqual(['2002/03',1,'The one Dad kept'])
  expect((await post({kind:'shirts',slugs:['forged']})).status).toBe(422)
 })
 it('refuses what cannot be printed',async()=>{
  expect((await post({kind:'first',club:'hapoel-tel-aviv',match:'m1',line:'<b>hi</b>'})).status).toBe(422)
  expect((await post({kind:'nothing'})).status).toBe(422)
  expect(cleanLine('“Three cities. Same scarf.”')).toEqual({ok:true,value:'Three cities. Same scarf.'})
 })
 it('lists the years and the matches of a year for the picker',async()=>{
  expect((await (await GET(new Request('http://x?club=hapoel-tel-aviv'))).json()).years).toEqual([2025,1993])
  expect((await (await GET(new Request('http://x?club=hapoel-tel-aviv&year=1993'))).json()).matches.map((m:{id:string})=>m.id)).toEqual(['m1'])
 })
})

import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
vi.mock('@/lib/shop/store',()=>({readShop:async()=>({settings:{open:true,shopId:1,popupUrl:'https://shop.fanlife.dubelteam.com',margin:45,matches:{}},products:[],audit:[]}),updateShop:vi.fn(),forgetPublicShop:()=>{}}))
vi.mock('@/lib/shop/build',()=>({client:vi.fn(),pressProduct:vi.fn()}))
vi.mock('@/lib/shop/personal/render',()=>({renderXI:vi.fn(),PRINT:{w:3600,h:4800}}))
const players=Array.from({length:14},(_,i)=>({value:{id:`p${i}`,name:`Player ${i}`}}))
vi.mock('@/lib/clubs/resolver',()=>({loadClub:async()=>({data:{identity:{name:'Hapoel Tel Aviv'},players}})}))
import {POST} from '@/app/api/shop/personal/route'
import {FORMATIONS} from '@/lib/game/formations'
import {cleanManager} from '@/lib/shop/personal/sign'

const picks=Object.fromEntries(FORMATIONS['4-3-3']!.slots.map((s,i)=>[s.slotId,`p${i}`]))
const post=(b:unknown)=>POST(new Request('http://x/api/shop/personal',{method:'POST',body:JSON.stringify(b)}))
describe('the supporter’s XI print',()=>{
 it('signs a proof for a full eleven of the club’s own men',async()=>{
  const r=await post({club:'hapoel-tel-aviv',formation:'4-3-3',picks,captain:'p5',manager:'Maor',dry:true});const j=await r.json()
  expect(r.status).toBe(200);expect(j.proof).toMatch(/^\/api\/shop\/personal\/art\?s=.+&sig=/)
 })
 it('refuses an incomplete XI, a stranger and a bad manager name',async()=>{
  expect((await post({club:'hapoel-tel-aviv',formation:'4-3-3',picks:{...picks,GK:'nobody'},dry:true})).status).toBe(422)
  expect((await post({club:'hapoel-tel-aviv',formation:'4-3-3',picks,manager:'<script>',dry:true})).status).toBe(422)
  expect((await post({club:'nowhere',formation:'4-3-3',picks,dry:true})).status).toBe(422)
 })
 it('keeps manager names clean',()=>{
  expect(cleanManager('  Maor  Harel ')).toEqual({ok:true,value:'Maor Harel'});expect(cleanManager('')).toEqual({ok:true,value:null})
  expect(cleanManager('a<b').ok).toBe(false)
 })
})

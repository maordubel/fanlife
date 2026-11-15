import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
vi.mock('@/lib/shop/store',()=>({readShop:async()=>({settings:{open:true,shopId:1,popupUrl:'https://shop.fanlife.dubelteam.com',margin:45,matches:{}},products:[],audit:[]}),updateShop:vi.fn(),forgetPublicShop:()=>{}}))
vi.mock('@/lib/shop/build',()=>({client:vi.fn(),pressProduct:vi.fn()}))
vi.mock('@/lib/shop/personal/render',()=>({renderXI:vi.fn(),PRINT:{w:3600,h:4800}}))
const players=Array.from({length:14},(_,i)=>({value:{id:`p${i}`,name:i===0?'משה סיני':`Player ${i}`,aliases:i===0?['Moshe Sinai']:[],fromYear:null,toYear:null}}))
vi.mock('@/lib/clubs/resolver',()=>({loadClub:async()=>({data:{identity:{name:'Hapoel Tel Aviv'},players}})}))
import {POST} from '@/app/api/shop/personal/route'
import {FORMATIONS} from '@/lib/game/formations'
import {cleanManager} from '@/lib/shop/personal/sign'
import {linesOf,type XIPrintSpec} from '@/lib/shop/personal/xi-poster'
const specOf=(proof:string)=>JSON.parse(Buffer.from(new URL(proof,'http://x').searchParams.get('s')!,'base64url').toString()) as XIPrintSpec

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
 it('carries the chosen look, prints names in Latin when the archive has it, and shows the tee as a tee',async()=>{
  const j=await (await post({club:'hapoel-tel-aviv',formation:'4-3-3',picks,template:'dream',dry:true})).json(),spec=specOf(j.proof)
  expect(spec.v).toBe('dream');expect(spec.n.some(m=>m.name==='Moshe Sinai')).toBe(true)
  expect((await (await post({club:'hapoel-tel-aviv',formation:'4-3-3',picks,template:'nope',dry:true})).json()).proof).toBeTruthy()
  expect(specOf((await (await post({club:'hapoel-tel-aviv',formation:'4-3-3',picks,template:'nope',dry:true})).json()).proof).v).toBe('touchline')
  expect((await (await post({club:'hapoel-tel-aviv',formation:'4-3-3',picks,product:'tee',dry:true})).json()).proof).toMatch(/&l=tee-proof$/)
  const lines=linesOf(spec.n);expect(lines.map(l=>l.length)).toEqual([3,3,4,1])
 })
 it('keeps manager names clean',()=>{
  expect(cleanManager('  Maor  Harel ')).toEqual({ok:true,value:'Maor Harel'});expect(cleanManager('')).toEqual({ok:true,value:null})
  expect(cleanManager('a<b').ok).toBe(false)
 })
})

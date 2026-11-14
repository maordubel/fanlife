import {vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {describe,expect,it} from 'vitest'
import {KIND_SPECS} from '@/lib/shop/kinds'
import {areasOf,bestVariants,brandPlace,isGarment,pickProvider} from '@/lib/shop/plan'
import type {PVariant} from '@/lib/shop/printify'

const v=(id:number,w:number,h:number,pos='front'):PVariant=>({id,title:String(id),options:{},placeholders:[{position:pos,width:w,height:h}]})
describe('quality first, size by size',()=>{
 it('keeps the poster sizes the picture prints sharp, in its own shape',()=>{
  const pic={width:3000,height:4000}
  const got=bestVariants(KIND_SPECS.poster,[v(1,3600,2700),v(2,3300,4200),v(3,5400,7200),v(4,10800,14400)],pic)
  expect(got.variants.map(x=>x.id)).toEqual([2,3]);expect(got.quality).toBeGreaterThanOrEqual(.5)
 })
 it('when nothing is sharp keeps what passes the floor, else the sharpest one',()=>{
  const pic={width:800,height:600}
  expect(bestVariants(KIND_SPECS.puzzle,[v(1,4200,3300),v(2,9000,6000)],pic).variants.map(x=>x.id)).toEqual([1])
  expect(bestVariants(KIND_SPECS.puzzle,[v(1,9000,6000),v(2,12000,8000)],{width:300,height:200}).variants.map(x=>x.id)).toEqual([1])
 })
 it('puts the back its own picture when there are two',()=>{
  const vs=[{id:1,title:'',options:{},placeholders:[{position:'front',width:4000,height:4500},{position:'back',width:4000,height:4500}]}]
  const back={library:{id:'bbb',name:'b.png'}}
  const areas=areasOf(KIND_SPECS.tee,vs,{sides:'both',backArt:back})
  expect(areas.map(([s])=>s[0])).toEqual(['front','back']);expect(areas[1]![1].art).toEqual(back);expect(areas[0]![1].art).toBeUndefined()
 })
 it('places the FAN LIFE seal whole, small under the collar',()=>{
  const sheet={w:4000,h:4500,position:'back',variantIds:[1]}
  const at=brandPlace(sheet,{width:512,height:512},'backNeck');expect(at.scale).toBeLessThan(.2);expect(at.y).toBeLessThan(.15)
  expect(isGarment('tee')).toBe(true);expect(isGarment('mug')).toBe(false);expect(isGarment('more','Unisex Garment-Dyed Hoodie')).toBe(true)
 })
 it('asks for Printify Choice first — top-rated printers',()=>{
  expect(pickProvider([{id:1,title:'Print Clever'},{id:2,title:'Printify Choice'}])!.id).toBe(2)
 })
})
describe('the pictures follow where the design prints',()=>{
 it('leads with the back for a back print, keeps fronts only for a front print',async()=>{
  const {mockups}=await import('@/lib/shop/build')
  const l=[{src:'f.jpg?camera_label=front',is_default:true},{src:'b.jpg?camera_label=back',is_default:false}]
  expect(mockups(l,'back').images[0]).toContain('b.jpg');expect(mockups(l,'front').images).toEqual(['f.jpg?camera_label=front'])
  expect(mockups(l,'both').backImage).toContain('b.jpg')
 })
})

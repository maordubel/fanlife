import {describe,expect,it} from 'vitest'
import {KIND_SPECS} from '@/lib/shop/kinds'
import {LIBRARY,picturesFor,titleOf} from '@/lib/shop/library'
import {launchSet,matchBlueprint,pickProvider,pickVariants,place,price,sheets} from '@/lib/shop/plan'
import {isPublic,KINDS,type ShopProduct} from '@/lib/shop/types'

const bp=(id:number,title:string)=>({id,title,brand:'',model:'',images:[]})
const v=(id:number,color:string,size:string,w=3000,h=4000)=>({id,title:`${color} / ${size}`,options:{color,size},placeholders:[{position:'front',width:w,height:h}]})

describe('the shop: pictures come from the library, never invented',()=>{
 it('reads only printable artwork from the Drive inventory',()=>{
  expect(LIBRARY.length).toBeGreaterThan(100)
  for(const p of LIBRARY){expect(p.name).toMatch(/\.(png|jpe?g)$/i);expect(p.folder).not.toMatch(/Shared Brands|Product_Concepts|source-frames/)}
 })
 it('gives a club its own shelf first, then FAN LIFE’s',()=>{
  const oly=picturesFor('olympiacos');expect(oly[0]!.subject).toBe('olympiacos');expect(oly.some(p=>p.subject==='fanlife')).toBe(true)
  expect(oly.some(p=>p.subject==='hapoel-tel-aviv')).toBe(false)
 })
 it('never drafts a picture marked for a rights check',()=>{
  const ids=new Set(LIBRARY.filter(p=>p.review).map(p=>p.id))
  for(const s of ['fanlife','olympiacos','hapoel-tel-aviv','zrinjski-mostar'])for(const d of launchSet(s,'2026-11-12T00:00:00Z'))expect('library' in d.art&&ids.has(d.art.library.id)).toBe(false)
  expect(launchSet('fanlife','x').every(d=>d.status==='draft'&&!d.visible)).toBe(true)
 })
 it('titles a product from its file name',()=>{expect(titleOf('03-matchday-walk.png')).toBe('Matchday Walk')})
})
describe('the shop: Printify decisions',()=>{
 it('matches a kind by catalogue title and skips the wrong cousins',()=>{
  const list=[bp(1,'Kids Heavy Cotton™ Tee'),bp(2,'Unisex Jersey Short Sleeve Tee'),bp(3,'AOP Tote Bag'),bp(4,'Cotton Canvas Tote Bag'),bp(5,'Travel Mug'),bp(6,'Ceramic Mug 11oz')]
  expect(matchBlueprint(KIND_SPECS.tee,list)!.id).toBe(2);expect(matchBlueprint(KIND_SPECS.tote,list)!.id).toBe(4);expect(matchBlueprint(KIND_SPECS.mug,list)!.id).toBe(6)
  expect(matchBlueprint(KIND_SPECS.puzzle,list)).toBeNull()
 })
 it('prefers a European printer and falls back to the first',()=>{
  expect(pickProvider([{id:1,title:'Monster Digital'},{id:2,title:'Print Clever'}])!.id).toBe(2);expect(pickProvider([{id:9,title:'Somebody'}])!.id).toBe(9);expect(pickProvider([])).toBeNull()
 })
 it('keeps garments light and adult-sized, and caps the list',()=>{
  const got=pickVariants(KIND_SPECS.tee,[v(1,'White','M'),v(2,'Black','M'),v(3,'Natural','5XL'),v(4,'Natural','L')]);expect(got.map(x=>x.id)).toEqual([1,4])
 })
 it('groups print areas by shape',()=>{
  const s=sheets(KIND_SPECS.poster,[v(1,'','12x16',3600,4800),v(2,'','18x24',5400,7200),v(3,'','11x17',3300,5100)]);expect(s).toHaveLength(2);expect(s[0]!.variantIds).toEqual([1,2])
 })
 it('fills a poster when the shapes are close and never stretches',()=>{
  const sheet={w:3600,h:4800,position:'front',variantIds:[1]}
  expect(place(KIND_SPECS.poster,sheet,{width:3000,height:4000})).toEqual({x:.5,y:.5,scale:1})
  expect(place(KIND_SPECS.poster,sheet,{width:4000,height:4000}).scale).toBeCloseTo(1.333,2)      // square on 3:4 — fills, sides trimmed
  const wide=place(KIND_SPECS.poster,sheet,{width:4000,height:1000});expect(wide.scale).toBeLessThanOrEqual(.94)   // a banner is shown whole
 })
 it('shows a chest print whole, sat high',()=>{
  const at=place(KIND_SPECS.tee,{w:4000,h:5000,position:'front',variantIds:[1]},{width:2000,height:3000})
  expect(at.scale).toBeLessThan(.8);expect(at.y).toBeLessThanOrEqual(.5);expect(at.scale/(2000/3000)*(4000/5000)).toBeLessThanOrEqual(1)
 })
 it('prices at cost plus margin, rounded up to .99',()=>{expect(price(1234,45)).toBe(1799);expect(price(100,45)).toBe(499);expect(price(2000,0)).toBe(1999)})
 it('shows the public only a live, switched-on product with a link and a picture',()=>{
  const base:ShopProduct={id:'a',subject:'fanlife',kind:'poster',art:{library:{id:'x',name:'x.png'}},title:'t',description:'d',status:'live',visible:true,createdAt:'',updatedAt:'',printify:{productId:'1',blueprintId:1,providerId:1,images:['https://i/1.jpg'],priceFrom:1999,currency:'USD',url:'https://s.printify.me/p',publishedAt:'x'}}
  expect(isPublic(base)).toBe(true);expect(isPublic({...base,visible:false})).toBe(false);expect(isPublic({...base,status:'ready'})).toBe(false);expect(isPublic({...base,printify:{...base.printify!,url:null}})).toBe(false)
  expect(KINDS.every(k=>KIND_SPECS[k])).toBe(true)
 })
})

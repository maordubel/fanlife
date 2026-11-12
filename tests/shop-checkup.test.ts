import {describe,it,expect,vi,beforeEach} from 'vitest'
import type {ShopDoc,ShopProduct} from '@/lib/shop/types'
vi.mock('server-only',()=>({}))
const base=(over:Partial<ShopProduct>):ShopProduct=>({id:'p1',subject:'fanlife',kind:'sticker',art:{library:{id:'x',name:'x.png'}},title:'Crest sticker',description:'',status:'live',visible:true,createdAt:'2026-11-12T10:00:00Z',updatedAt:'2026-11-12T10:00:00Z',
 printify:{productId:'pf1',blueprintId:1,providerId:1,images:['old.jpg'],priceFrom:499,currency:'USD',url:'https://fanlife.printify.me/product/1',publishedAt:'2026-11-12T10:00:00Z'},...over})
let doc:ShopDoc
const api={shops:vi.fn(),product:vi.fn()}
vi.mock('@/lib/shop/store',()=>({readShop:async()=>structuredClone(doc),printifyToken:async()=>'t'.repeat(50),
 updateShop:async(_by:string,_w:string,fn:(d:ShopDoc)=>void)=>{fn(doc);return doc}}))
vi.mock('@/lib/shop/build',()=>({client:async()=>api,pressProduct:vi.fn(async(id:string)=>{const p=doc.products.find(x=>x.id===id)!;p.status='live';return p})}))
beforeEach(()=>{api.shops.mockReset();api.product.mockReset()
 doc={v:1,settings:{open:true,shopId:7,shopTitle:'FAN LIFE',channel:'storefront',popupUrl:'',margin:45,matches:{}},products:[],audit:[]}
 api.shops.mockResolvedValue([{id:7,title:'FAN LIFE',sales_channel:'storefront'}])})

describe('the shop check-up',()=>{
 it('re-reads the listing address and pictures from Printify',async()=>{
  doc.products=[base({})];api.product.mockResolvedValue({external:{handle:'https://fan-life.printify.me/product/1'},images:[{src:'new.jpg',is_default:true}]})
  const {shopCheckup}=await import('@/lib/shop/checkup');const h=await shopCheckup()
  expect(h.ok).toBe(true);expect(h.repaired).toBe(1);expect(doc.products[0]!.printify!.url).toContain('fan-life');expect(doc.products[0]!.printify!.images[0]).toBe('new.jpg')
 })
 it('hides a product deleted in Printify, so the site never sells a dead link',async()=>{
  const {PrintifyError}=await import('@/lib/shop/printify')
  doc.products=[base({})];api.product.mockRejectedValue(new PrintifyError(404,'gone'))
  const {shopCheckup}=await import('@/lib/shop/checkup');const h=await shopCheckup()
  expect(doc.products[0]!.visible).toBe(false);expect(doc.products[0]!.printify).toBeUndefined();expect(h.notes.join()).toMatch(/deleted in Printify/)
 })
 it('presses again a press that stopped half-way, and never shows anything itself',async()=>{
  doc.products=[base({id:'p2',status:'building',visible:false,printify:undefined,updatedAt:'2026-11-01T00:00:00Z'})]
  const {shopCheckup}=await import('@/lib/shop/checkup');await shopCheckup()
  expect(doc.products[0]!.status).toBe('live');expect(doc.products[0]!.visible).toBe(false);expect(doc.products[0]!.retries).toBe(1)
 })
 it('goes red when the store is not the Pop-Up store',async()=>{
  api.shops.mockResolvedValue([{id:7,title:'Old',sales_channel:'custom_integration'}])
  const {shopCheckup}=await import('@/lib/shop/checkup');const h=await shopCheckup()
  expect(h.ok).toBe(false);expect(h.notes[0]).toMatch(/not the Pop-Up store/)
 })
})

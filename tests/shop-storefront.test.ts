import {describe,expect,it,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {shelfOf} from '@/lib/shop/types'
import {fitTitle,listingOf} from '@/lib/shop/plan'

describe('the storefront shelves',()=>{
 it('puts every product on a shelf a supporter shops by',()=>{
  expect(shelfOf('framed')).toBe('wall');expect(shelfOf('hoodie')).toBe('wear');expect(shelfOf('kids-tee')).toBe('kids');expect(shelfOf('mug')).toBe('home')
  expect(shelfOf('more','Double Sided Flag')).toBe('gear');expect(shelfOf('more','Knitted Scarf')).toBe('gear');expect(shelfOf('more','Baby Bib')).toBe('kids')
  expect(shelfOf('more','Beach Towel')).toBe('home');expect(shelfOf('more','Unisex Garment-Dyed T-shirt')).toBe('wear');expect(shelfOf('sticker')).toBe('small')
 })
})
describe('listings within marketplace limits',()=>{
 it('keeps a title within 60 characters and never cuts the product name',()=>{
  const t=fitTitle('The Night The Whole Stand Caught Fire Under The Floodlights Of Piraeus','Unisex Heavy Cotton Tee')
  expect(t.length).toBeLessThanOrEqual(60);expect(t.endsWith(' · Unisex Heavy Cotton Tee')).toBe(true)
 })
 it('writes at most 13 tags of at most 20 characters, the club first',()=>{
  const l=listingOf({title:'X · Poster',subject:'panathinaikos',kind:'poster'},{name:'Panathinaikos',city:'Athens'},'Poster')
  expect(l.tags.length).toBeLessThanOrEqual(13);expect(l.tags.every(t=>t.length<=20)).toBe(true);expect(l.tags[0]).toBe('Panathinaikos')
 })
})
describe('automatic fitting to the product’s shape',()=>{
 it('extends a square picture on paper to a mug’s wide wrap with the paper colour, nothing cropped',async()=>{
  const sharp=(await import('sharp')).default
  const png=await sharp({create:{width:400,height:400,channels:3,background:{r:244,g:236,b:216}}}).composite([{input:await sharp({create:{width:200,height:200,channels:3,background:{r:20,g:20,b:20}}}).png().toBuffer(),left:100,top:100}]).png().toBuffer()
  const realFetch=globalThis.fetch;globalThis.fetch=(async()=>new Response(new Uint8Array(png))) as typeof fetch
  try{const {extendToShape}=await import('@/lib/shop/build');const out=await extendToShape('https://x/y.png',2.4)
   const meta=await sharp(Buffer.from(out!,'base64')).metadata();expect(Math.abs(meta.width!/meta.height!-2.4)).toBeLessThan(.02)
   const {data}=await sharp(Buffer.from(out!,'base64')).raw().toBuffer({resolveWithObject:true});expect(Math.abs(data[0]!-244)).toBeLessThan(6)
  }finally{globalThis.fetch=realFetch}
 })
})
describe('quality gate and sale',()=>{
 it('reads a product’s sharpness and keeps blurred prints out of the shop',async()=>{
  const {qualityOf,isPublic}=await import('@/lib/shop/types')
  const p={visible:true,status:'live',printify:{url:'u',images:['i'],quality:.11},error:''} as never
  expect(qualityOf(p)).toBe(.11);expect(isPublic(p)).toBe(false)
  const old={visible:true,status:'live',printify:{url:'u',images:['i']},error:'On sale, but this picture is small for a canvas (43% of the print size) — it may print soft.'} as never
  expect(qualityOf(old)).toBe(.43);expect(isPublic(old)).toBe(true)
 })
})

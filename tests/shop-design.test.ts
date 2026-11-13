import {describe,expect,it} from 'vitest'
import {removePlainBackground} from '@/lib/shop/cutout'
import {KIND_SPECS} from '@/lib/shop/kinds'
import {listingOf,place,printAreas,shadedSpec,sheets,sidesOf,sizedSpec} from '@/lib/shop/plan'
import type {PVariant} from '@/lib/shop/printify'

const tee=(id:number,color:string,back=true):PVariant=>({id,title:`${color} / M`,options:{color,size:'M'},placeholders:[{position:'front',width:3600,height:4800},...(back?[{position:'back',width:3600,height:4800}]:[])]} as PVariant)

describe('print on the back',()=>{
 it('prints front, back or both — and only where the product has a back',()=>{
  expect(sidesOf(KIND_SPECS.tee,[tee(1,'White')],{sides:'both'})).toEqual([['front'],['back']])
  expect(sidesOf(KIND_SPECS.tee,[tee(1,'White')],{sides:'back'})).toEqual([['back']])
  expect(sidesOf(KIND_SPECS.mug,[tee(1,'White',false)],{sides:'back'})).toEqual([['front']])
 })
 it('merges front and back of the same variant into one print area',()=>{
  const v=[tee(1,'White'),tee(2,'Natural')],spec=KIND_SPECS.tee,pic={width:3000,height:3000}
  const placed=[...sheets(spec,v,['front']),...sheets(spec,v,['back'])].map(sh=>({sheet:sh,imageId:'img',...place(spec,sh,pic)}))
  const areas=printAreas(placed);expect(areas).toHaveLength(1);expect(areas[0]!.variant_ids).toEqual([1,2]);expect(areas[0]!.placeholders.map(p=>p.position)).toEqual(['front','back'])
 })
 it('starts a back print below the collar',()=>{
  const sh={w:3600,h:4800,position:'back',variantIds:[1]},sf={...sh,position:'front'}
  expect(place(KIND_SPECS.tee,sh,{width:3000,height:3000}).y).toBeGreaterThan(place(KIND_SPECS.tee,sf,{width:3000,height:3000}).y)
 })
})
describe('size, colours and price',()=>{
 it('a badge is small, full is wide, automatic keeps the kind',()=>{
  expect(sizedSpec(KIND_SPECS.tee,{size:'badge'}).scale).toBe(.3);expect(sizedSpec(KIND_SPECS.tee,{size:'auto'})).toBe(KIND_SPECS.tee)
 })
 it('dark colours swap the palette; every colour lifts the cap; non-garments are untouched',()=>{
  expect(shadedSpec(KIND_SPECS.tee,{shades:'dark'}).colors!.test('Black')).toBe(true);expect(shadedSpec(KIND_SPECS.tee,{shades:'dark'}).colors!.test('White')).toBe(false)
  expect(shadedSpec(KIND_SPECS.tee,{shades:'all'}).colors).toBeUndefined();expect(shadedSpec(KIND_SPECS.poster,{shades:'dark'})).toBe(KIND_SPECS.poster)
 })
})
describe('remove a plain background',()=>{
 it('clears the paper around the art and keeps paper-coloured pixels inside it',()=>{
  const w=20,h=20,d=new Uint8ClampedArray(w*h*4)
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,ring=x>=5&&x<15&&y>=5&&y<15&&!(x>=8&&x<12&&y>=8&&y<12),c=ring?[20,20,20]:[244,236,216];d[i]=c[0]!;d[i+1]=c[1]!;d[i+2]=c[2]!;d[i+3]=255}
  const share=removePlainBackground({data:d,width:w,height:h})
  expect(share).toBeCloseTo((400-100)/400,1);expect(d[(0*w+0)*4+3]).toBe(0);expect(d[(10*w+10)*4+3]).toBe(255);expect(d[(6*w+6)*4+3]).toBe(255)
 })
})
describe('listing text that sells',()=>{
 it('names the club, its city and what it is, and says it is fan art',()=>{
  const l=listingOf({title:'Stand on fire · Poster',subject:'olympiacos',kind:'poster'},{name:'Olympiacos',city:'Piraeus'},'Poster')
  expect(l.description).toMatch(/Olympiacos supporters from Piraeus/);expect(l.description).toMatch(/not an official club product/);expect(l.tags).toContain('Olympiacos gift');expect(l.tags.length).toBeLessThanOrEqual(13)
 })
})
describe('exact colours from the printer',()=>{
 it('a chosen list overrides the light/dark choice and lifts the cap to 100',async()=>{
  const {shadedSpec}=await import('@/lib/shop/plan');const {KIND_SPECS}=await import('@/lib/shop/kinds')
  const sp=shadedSpec(KIND_SPECS.tee,{shades:'light',colors:['Heather Navy','Kelly Green'],sizes:['M','L']})
  expect(sp.colors!.test('kelly green')).toBe(true);expect(sp.colors!.test('White')).toBe(false);expect(sp.sizes!.test('XL')).toBe(false);expect(sp.maxVariants).toBe(100)
 })
 it('knows the common garment colours and calls light and dark right',async()=>{
  const {swatch,isLight}=await import('@/lib/shop/colours')
  expect(swatch('Black')).toBe('#111111');expect(swatch('Unknown Glitter')).toBeNull();expect(isLight('Natural')).toBe(true);expect(isLight('Navy')).toBe(false)
describe('a picture that is already cut out',()=>{
 it('is recognised by its transparent border',async()=>{
  const {transparentBorder}=await import('@/lib/shop/cutout');const w=10,h=10,d=new Uint8ClampedArray(w*h*4)
  expect(transparentBorder({data:d,width:w,height:h})).toBe(true);d.fill(255);expect(transparentBorder({data:d,width:w,height:h})).toBe(false)
 })
})

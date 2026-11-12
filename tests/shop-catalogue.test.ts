import {describe,expect,it} from 'vitest'
import {catalogueSpec,groupOf} from '@/lib/shop/kinds'
import {draftOf,shortTitle} from '@/lib/shop/plan'

describe('the whole Printify catalogue in the builder',()=>{
 it('puts every product on a shelf a supporter understands',()=>{
  expect(groupOf('Matte Vertical Posters')).toBe('Wall art');expect(groupOf('Knitted Scarf')).toBe('Accessories')
  expect(groupOf('Dad Hat with Leather Patch')).toBe('Hats');expect(groupOf('Baby Short Sleeve Bodysuit')).toBe('Kids & baby')
  expect(groupOf('Beach Towels')).toBe('Home');expect(groupOf('Pint Glass, 16oz')).toBe('Drinkware');expect(groupOf('Unknown Gizmo')).toBe('Other')
 })
 it('prints garments and bags chest-sized on light colours, everything else edge to edge',()=>{
  expect(catalogueSpec('Unisex Garment-Dyed T-shirt').scale).toBeLessThan(1);expect(catalogueSpec('Unisex Garment-Dyed T-shirt').colors?.test('White')).toBe(true)
  expect(catalogueSpec('Garden & House Banner').scale).toBe(1);expect(catalogueSpec('Garden & House Banner').colors).toBeUndefined()
  expect(catalogueSpec('Baby Short Sleeve Bodysuit').sizes).toBeUndefined()
 })
 it('drafts a catalogue product with its own id and a short name',()=>{
  const d=draftOf('fanlife',{id:'1abcdefghijklmnop',name:'crest.png'},'more','2026-11-12T00:00:00Z',{id:1234,title:'Knitted Scarf (EU)'})
  expect(d.id).toMatch(/\.more-1234$/);expect(d.title).toBe('Crest · Knitted Scarf');expect(d.blueprint?.id).toBe(1234)
  expect(shortTitle('Mug 11oz (EU)')).toBe('Mug 11oz')
 })
})

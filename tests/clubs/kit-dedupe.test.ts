import {describe,it,expect,vi} from 'vitest'
vi.mock('server-only',()=>({}))
import {dedupeKits,kitViews,type KitView} from '@/lib/clubs/gate-content'
import {loadClub} from '@/lib/clubs/resolver'

const kit=(id:string,over:Partial<KitView>={}):KitView=>({id,season:'2020/21',type:'home',maker:'adidas',design:'stripes',sponsor:null,colours:['red','white'],sources:[id],...over})

describe('one shirt is one card',()=>{
 it('folds the catalogue\'s second image and a source\'s twin into the richest record, and keeps every id',()=>{
  const out=dedupeKits([kit('a-v2',{sponsor:null}),kit('a',{sponsor:'Stoiximan',shorts:{colour:'white',trim:null}}),kit('uefa-a',{design:null,colours:['red'],maker:null})])
  expect(out).toHaveLength(1);expect(out[0]!.id).toBe('a');expect(out[0]!.sponsor).toBe('Stoiximan');expect(out[0]!.also?.sort()).toEqual(['a-v2','uefa-a'])
 })
 it('ignores colour order and spelling, and sees stripes and pinstripes as one family',()=>{
  expect(dedupeKits([kit('a'),kit('b',{colours:['white','red'],design:'pinstripes'})])).toHaveLength(1)
  expect(dedupeKits([kit('a',{colours:['grey']}),kit('b',{colours:['gray']})])).toHaveLength(1)
 })
 it('keeps two shirts that differ in design, maker, type or season',()=>{
  expect(dedupeKits([kit('a',{design:'plain'}),kit('b',{design:'contrasting sleeves'})])).toHaveLength(2)
  expect(dedupeKits([kit('a'),kit('b',{maker:'Puma'})])).toHaveLength(2)
  expect(dedupeKits([kit('a'),kit('b',{type:'away'})])).toHaveLength(2)
  expect(dedupeKits([kit('a'),kit('b',{season:'2021/22'})])).toHaveLength(2)
  expect(dedupeKits([kit('a',{colours:['red','white']}),kit('b',{colours:['green','white']})])).toHaveLength(2)
 })
 it('leaves no catalogue club with two records of one maker, design and colour set in a season and type',async()=>{
  for(const id of ['aek-athens','celtic','olympiacos','panathinaikos','st-pauli','zrinjski-mostar','hapoel-petah-tikva','hapoel-tel-aviv']){
   const seen=new Set<string>()
   for(const k of kitViews((await loadClub(id))!.data)){
    const key=`${k.season}|${k.type}|${k.design}|${[...k.colours].sort().join('+')}|${(k.maker??'').toLowerCase()}`
    expect(seen.has(key),`${id} ${key}`).toBe(false);seen.add(key)
   }
  }
 },120000)
})

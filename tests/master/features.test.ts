import {describe,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {applyFeaturePatch,DEFAULT_FEATURES,featureDoor,featuresOf,validateFeaturePatch} from '@/lib/features'
import {nsKey,splitKey} from '@/lib/master/crm/refs'

describe('feature switches (ADR-0012)',()=>{
 it('an old state file reads as all off, with every gate listed',()=>{
  expect(featuresOf(null)).toEqual(DEFAULT_FEATURES)
  expect(featuresOf({features:undefined})).toMatchObject({allFootball:false,fanLeague:false,friendlies:false})
  expect(featuresOf({features:{allFootball:true,allFootballGates:['trivia','nope' as never]}})).toMatchObject({allFootball:true,allFootballGates:['trivia']})
 })
 it('a patch is strict: unknown keys and wrong types are refused by name',()=>{
  expect(validateFeaturePatch({fanLeague:'yes'})).toEqual({ok:false,error:'fanLeague must be true or false.'})
  expect(validateFeaturePatch({rumble:true})).toEqual({ok:false,error:'Unknown switch: rumble.'})
  expect(validateFeaturePatch({allFootballGates:['goal']}).ok).toBe(false)
  expect(validateFeaturePatch({})).toEqual({ok:false,error:'Nothing to change.'})
  const v=validateFeaturePatch({allFootball:true,allFootballGates:['memory','memory']})
  expect(v).toEqual({ok:true,patch:{allFootball:true,allFootballGates:['memory']}})
 })
 it('applying a patch keeps the other switches and stamps the time',()=>{
  const next=applyFeaturePatch(DEFAULT_FEATURES,{fanLeague:true},'2026-10-12T10:00:00.000Z')
  expect(next).toMatchObject({fanLeague:true,allFootball:false,friendlies:false,updatedAt:'2026-10-12T10:00:00.000Z'})
 })
 it('off = owner preview only; on = everyone',()=>{
  expect(featureDoor(false,false)).toEqual({open:false,preview:false})
  expect(featureDoor(false,true)).toEqual({open:true,preview:true})
  expect(featureDoor(true,false)).toEqual({open:true,preview:false})
 })
 it('the control-room API saves switches through mutate with an audit line',()=>{
  const src=readFileSync('app/api/master/[...action]/route.ts','utf8')
  expect(src).toMatch(/a==='features'.*validateFeaturePatch.*mutate.*audit\(s,'features\.updated'/s)
 })
 it('namespaced keys round-trip and refuse malformed input',()=>{
  expect(splitKey(nsKey('olympiacos','q-12'))).toEqual({clubId:'olympiacos',id:'q-12'})
  expect(splitKey(nsKey('a','b~c'))).toEqual({clubId:'a',id:'b~c'})
  expect(splitKey('~x')).toBeNull();expect(splitKey('x~')).toBeNull();expect(splitKey('plain')).toBeNull()
 })
})

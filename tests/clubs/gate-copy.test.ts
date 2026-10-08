import {describe,it,expect} from 'vitest'
import {readdirSync,readFileSync} from 'node:fs'
import {GATE_CATALOGS,gameCopy} from '@/lib/clubs/game-copy'

describe('gate copy catalogues',()=>{
 it('every gate file has the same keys in English and Hebrew, and no key lives in two files',()=>{
  const dir='messages/games/gates',files=readdirSync(dir).filter(f=>f.endsWith('.en.json'))
  const seen=new Map<string,string>()
  for(const f of files){
   const en=JSON.parse(readFileSync(`${dir}/${f}`,'utf8')),he=JSON.parse(readFileSync(`${dir}/${f.replace('.en.','.he.')}`,'utf8'))
   expect(Object.keys(he).sort(),f).toEqual(Object.keys(en).sort())
   for(const k of Object.keys(en)){expect(seen.has(k),`${k} in ${f} and ${seen.get(k)}`).toBe(false);seen.set(k,f);expect(Object.keys(GATE_CATALOGS.base.en).includes(k),`${k} also in the shared catalogue`).toBe(false)}
  }
  expect(files.length).toBe(GATE_CATALOGS.en.length)
 })
 it('merged copy answers for both locales',()=>{expect(gameCopy('en')['gate.xi']).toBeTruthy();expect(gameCopy('he')['gate.xi']).toBeTruthy()})
})

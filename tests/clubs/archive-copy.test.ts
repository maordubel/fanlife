import {describe,expect,it} from 'vitest'
import {readFileSync,readdirSync} from 'node:fs'
import en from '@/messages/games/gates/archive.en.json'
import he from '@/messages/games/gates/archive.he.json'
import {gameCopy} from '@/lib/clubs/game-copy'

const DIR='components/clubs/gates/archive',FILES=readdirSync(DIR).filter(f=>/\.tsx$/.test(f)).map(f=>readFileSync(`${DIR}/${f}`,'utf8')).join('\n')

describe('gate 12 copy',()=>{
 it('every literal ar.* key a presenter asks for exists in English and Hebrew',()=>{
  const used=new Set([...FILES.matchAll(/['"`](ar\.[A-Za-z.]+)['"`]/g)].map(m=>m[1]!))
  expect(used.size).toBeGreaterThan(40)
  for(const k of used)if(!k.endsWith('.')){expect(k in en,`${k} missing in en`).toBe(true);expect(k in he,`${k} missing in he`).toBe(true)}
 })
 it('dynamic keys resolve for every value they can take',()=>{
  const c=gameCopy('en') as Record<string,string>
  for(const t of ['today','time','dig','search','mine'])expect(c[`ar.tab.${t}`],t).toBeTruthy()
  for(const f of ['all','moment','player'])expect(c[`ar.filter.${f}`],f).toBeTruthy()
  for(const p of ['day','year','unknown'])expect(c[`ar.sheet.precision.${p}`],p).toBeTruthy()
 })
 it('every catalogue string is used by a presenter (no dead copy)',()=>{
  const dynamic=['ar.tab.','ar.filter.','ar.sheet.precision.']
  for(const k of Object.keys(en))if(!dynamic.some(d=>k.startsWith(d)))expect(FILES.includes(`'${k}'`)||FILES.includes(`"${k}"`)||FILES.includes(`\`${k}\``),`${k} unused`).toBe(true)
 })
 it('keeps the placeholders of both languages identical',()=>{
  for(const k of Object.keys(en))expect([...(he as Record<string,string>)[k]!.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort(),k).toEqual([...(en as Record<string,string>)[k]!.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort())
 })
})

import {describe,expect,it} from 'vitest'
import {saveName} from '@/lib/legends/saves'

describe('save names (owner, 14.10.2026)',()=>{
 it('every new save of one owner wears a different name, even for the same club', ()=>{
  const taken:string[]=[]
  for(let i=0;i<30;i++){const nm=saveName('Olympiacos',`${(i*7919+13).toString(16).padStart(16,'a')}`,taken);expect(taken).not.toContain(nm);taken.push(nm)}
  expect(new Set(taken).size).toBe(30)
 })
 it('is stable for an id and starts with the club',()=>{
  expect(saveName('Celtic','abcdef0123456789',[])).toBe(saveName('Celtic','abcdef0123456789',[]))
  expect(saveName('Celtic','abcdef0123456789',[])).toMatch(/^Celtic · /)
 })
})

import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {REGISTRY} from '@/lib/master/registry'
import {LAYOUTS,PATTERNS,signatureFor} from '@/lib/club-signature'
const css=readFileSync('app/magazine.css','utf8')
describe('club signatures',()=>{
 it('every club has its own pattern × layout, deterministically',()=>{
  const seen=new Map<string,string>()
  for(const c of REGISTRY){const s=signatureFor(c.id),k=`${s.pattern}/${s.layout}`;expect(signatureFor(c.id)).toEqual(s);expect(seen.get(k),`${c.id} shares ${k} with ${seen.get(k)}`).toBeUndefined();seen.set(k,c.id)}
 })
 it('the five built clubs keep five different mastheads',()=>{expect(new Set(['hapoel-tel-aviv','olympiacos','panathinaikos','zrinjski-mostar','hapoel-petah-tikva'].map(i=>signatureFor(i).layout)).size).toBe(5)})
 it('CSS draws every pattern and every layout (a new value without a style fails here)',()=>{
  for(const p of PATTERNS.filter(p=>p!=='solid'))expect(css).toContain(`.mag-band[data-livery='${p}']`)
  for(const l of LAYOUTS)expect(css).toContain(`[data-sig-layout='${l}'] .mag-sig`)
 })
 it('the signature block carries no colour of its own',()=>{const block=css.slice(css.indexOf('club signature: pattern')).replace(/\/\*[\s\S]*?\*\//g,'');expect(block).not.toMatch(/#[0-9a-f]{3,8}\b/i);expect(block).not.toMatch(/\b(?:yellow|gold|amber|orange)\b/i);expect(block).not.toMatch(/\b(?:left|right)\s*:/)})
})

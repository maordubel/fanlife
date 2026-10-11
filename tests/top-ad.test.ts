import {describe,it,expect} from 'vitest'
import {readFileSync,readdirSync,statSync} from 'node:fs'
import path from 'node:path'
import {topAdAllowedOn,TOP_AD_SRC,DEFAULT_TOP_AD} from '@/lib/top-ad'

// The Dubel top ad (owner, 11.10.2026): Monetag In-Page Push, zone 11100824, ONE format only.
describe('the Dubel top ad',()=>{
 const file=readFileSync('public/dubel-top-ad.js','utf8')
 it('is the one script, one zone, one host, with the master switch',()=>{
  expect(TOP_AD_SRC).toBe('/dubel-top-ad.js')
  expect(file).toContain('var ADS_ENABLED = true;')
  expect(file).toContain('var ZONE = "11100824";')
  expect(file).toContain('var SRC = "https://nap5k.com/tag.min.js";')
  expect(file).toContain('hasAttribute("data-no-ads")')
  expect(file.match(/https?:\/\/[^"'\s]+/g)).toEqual(['https://nap5k.com/tag.min.js'])
  expect(DEFAULT_TOP_AD.topAd).toBe(true)
 })
 it('never appears in the control room, a game, LIFE or the API',()=>{
  for(const p of ['/master/admin','/master/login','/kits/admin','/qa/stats','/api/master/state','/life','/clubs/olympiacos/life','/clubs/olympiacos/trivia','/clubs/hapoel-tel-aviv/royal-rumble','/clubs/olympiacos/blind-cow?lang=en','/xi','/trivia/general','/goal','/blind-cow','/timeline','/c/abc123'])
   expect(topAdAllowedOn(p),p).toBe(false)
 })
 it('appears on the hub and the club reading pages',()=>{
  for(const p of ['/','/clubs/olympiacos','/clubs/olympiacos/','/clubs/olympiacos/play','/clubs/olympiacos/history','/clubs/olympiacos/terrace','/market','/sources','/me'])
   expect(topAdAllowedOn(p),p).toBe(true)
 })
 it('no other ad network is wired anywhere in the app',()=>{
  const walk=(d:string):string[]=>readdirSync(d).flatMap(n=>{const f=path.join(d,n);return statSync(f).isDirectory()?(n==='node_modules'?[]:walk(f)):[f]})
  const files=['app','components','lib','public'].flatMap(walk).filter(f=>/\.(tsx?|js|mjs|html)$/.test(f)&&!f.startsWith('public/life/')&&!f.startsWith('public/kit-archive'))
  for(const f of files){const s=readFileSync(f,'utf8');expect(/monetag|n6wxm|popunder|propellerads|adsterra/i.test(s)&&f!=='public/dubel-top-ad.js'&&f!=='lib/top-ad.ts'&&f!=='components/master/TopAdControl.tsx',f).toBe(false)}
  const layout=readFileSync('app/layout.tsx','utf8')
  expect(layout).toContain('<script src={TOP_AD_SRC} defer />')
  expect(layout).toContain('data-no-ads={topAd?undefined:""}')
 })
})

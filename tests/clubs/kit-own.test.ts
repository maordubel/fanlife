import {describe,it,expect,vi} from 'vitest'
import {readFileSync} from 'node:fs'
vi.mock('server-only',()=>({}))
import {fanShirts,shirtSlugFor,cfsShirtSlug} from '@/lib/fanlife/catalog'
import {cfsFor} from '@/lib/clubs/kit-cfs'
import {loadClub} from '@/lib/clubs/resolver'
import {kitViews} from '@/lib/clubs/gate-content'
import {variantOf} from '@/lib/clubs/kit-model'

/** the catalogue the market, closet and auction read: every slug valid and unique, photographs where the club has them, and "I have it" wired wherever a shirt is shown */
describe('shirt catalogue × Club Football Shirts × "I have it"',()=>{
 it('has unique slugs inside the database rule, and a photograph on every season and type Club Football Shirts shows (its own, or a better cut-out of the same shirt)',async()=>{
  const all=await fanShirts(),slugs=all.map(s=>s.slug)
  expect(new Set(slugs).size).toBe(slugs.length)
  for(const s of slugs)expect(s,s).toMatch(/^[a-z0-9][a-z0-9-]{2,63}$/)
  for(const club of ['aek-athens','celtic','olympiacos','panathinaikos','st-pauli','zrinjski-mostar']){
   for(const k of cfsFor(club)!.kits)expect(all.some(s=>s.club===club&&(s.src===k.image||(s.seasonLabel===k.season&&variantOf(s.variant)===variantOf(k.type)&&!!s.src))),`${club} ${k.id}`).toBe(true)
  }
 },120000)
 it('gives a documented kit its closet slug, and a photograph without a kit its own',async()=>{
  const d=(await loadClub('olympiacos'))!.data,kit=kitViews(d)[0]!
  const slug=await shirtSlugFor('olympiacos',{id:kit.id,season:kit.season,type:kit.type})
  expect(slug).toMatch(/^olympiacos--|^[a-z]+--/)
  const ph=cfsFor('olympiacos')!.kits[0]!
  expect(await cfsShirtSlug('olympiacos',ph.image)).toBeTruthy()
 },120000)
 it('mounts the bar on the archive cards and photographs, the gate 5 shirt sheet and the gate 4 reveal, and the static dialog links to it',()=>{
  expect(readFileSync('app/clubs/[slug]/kit-archive/page.tsx','utf8')).toMatch(/KitOwnBar[\s\S]*KitOwnBar/)
  expect(readFileSync('components/clubs/gates/kits/KitStudio.tsx','utf8')).toContain('KitOwnBar')
  expect(readFileSync('components/clubs/gates/kit-builder/KitBuilder.tsx','utf8')).toContain('KitOwnBar')
  expect(readFileSync('public/kit-archive/celtic/index.html','utf8')).toContain('data-own-link')
 })
})

import {describe,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme,forbiddenColor} from '@/lib/clubs/theme'
import {LEGENDS_PAINT,bannerPaint,legendsHref} from '@/lib/legends/banner'

const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8')
const hexOf={navy:LEGENDS_PAINT.navy,ink:null,vermilion:LEGENDS_PAINT.vermilion,bronze:LEGENDS_PAINT.bronze,paper:null} as const

describe('LEGENDS MANAGER banner on a club home (12.10.2026)',()=>{
 it('never wears a colour the club bans (rule 95)',()=>{
  for(const r of REGISTRY){
   const t=clubTheme(r),p=bannerPaint(t)
   for(const k of [p.night,p.star,p.bronze]){const hex=hexOf[k];if(hex)expect(forbiddenColor(t,hex),`${r.id} wears ${k}`).toBe(false)}
  }
 })
 it('steps aside when a club bans red: the star goes bronze',()=>{
  const t=clubTheme(REGISTRY.find(r=>r.id==='hapoel-tel-aviv')!)
  const red={...t,rivalForbiddenColors:[LEGENDS_PAINT.vermilion]}
  expect(bannerPaint(red).star).not.toBe('vermilion')
  const blue={...t,rivalForbiddenColors:[LEGENDS_PAINT.navy]}
  expect(bannerPaint(blue).night).toBe('ink')
 })
 it('sends the fan to the front door with the club chosen',()=>{
  expect(legendsHref('aek-athens')).toBe('/all-football/legends?club=aek-athens#lgm-roll-h')
  expect(read('components/legends/FrontDoor.tsx')).toContain('initial')
  expect(read('app/all-football/legends/page.tsx')).toMatch(/initial=\{/)
 })
 it('is behind the fanLeague door and this club’s readiness, and streams (rule 104)',()=>{
  const b=read('components/legends/ClubBanner.tsx')
  expect(b).toContain("door('fanLeague')");expect(b).toContain('legendsReadyFor(');expect(b).toContain("verdict!=='READY'");expect(b).toContain('bannerPaint(')
  expect(b).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  const page=read('app/clubs/[slug]/page.tsx')
  expect(page).toMatch(/<Suspense fallback=\{null\}><LegendsBanner /)
  // the banner reads one club's catalog, not the whole roll
  expect(read('lib/legends/server.ts')).toMatch(/export async function legendsReadyFor\(club:string\)[^]*?catalogFor\(club\)/)
 })
})

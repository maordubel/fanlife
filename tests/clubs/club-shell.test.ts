import {describe,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme,contrast} from '@/lib/clubs/theme'
import {SHARED_GATES} from '@/lib/clubs/gates'
import {CLUB_TABS,clubHref,tabHref,tabOfSegment} from '@/lib/clubs/club-href'
import {PLAY_GROUPS,PICKABLE,todaysPick} from '@/lib/clubs/play-groups'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'

const read=(p:string)=>readFileSync(join(process.cwd(),p),'utf8')
describe('club app shell',()=>{
 it('has five tabs and none of them is a hub page',()=>{
  expect(CLUB_TABS).toEqual(['home','play','life','history','terrace'])
  for(const t of CLUB_TABS)expect(tabHref('olympiacos',t)).toMatch(/^\/clubs\/olympiacos(\/(play|life|history|terrace))?$/)
 })
 it('keeps ?lang on every link when the language is not English',()=>{
  expect(clubHref('olympiacos','play','en')).toBe('/clubs/olympiacos/play')
  expect(clubHref('olympiacos','play','he')).toBe('/clubs/olympiacos/play?lang=he')
  expect(clubHref('olympiacos','','he')).toBe('/clubs/olympiacos?lang=he')
 })
 it('puts every gate under a tab, and unknown segments under Play',()=>{
  expect(tabOfSegment(undefined)).toBe('home')
  for(const g of SHARED_GATES)expect(CLUB_TABS).toContain(tabOfSegment(g.key))
  expect(tabOfSegment('timeline')).toBe('history')
  expect(tabOfSegment('polls')).toBe('terrace')
  expect(tabOfSegment('trivia')).toBe('play')
  expect(tabOfSegment('meetings')).toBe('terrace')
 })
 it('Play groups hold every gate exactly once',()=>{
  const keys=PLAY_GROUPS.flatMap(g=>[...g.keys]).sort()
  expect(keys).toEqual(SHARED_GATES.map(g=>g.key).sort())
  expect(new Set(keys).size).toBe(13)
 })
 it("today's pick is deterministic, per club and per day, and only from open rounds",()=>{
  const open=['trivia','memory','xi','kits','archive'] as const
  const a=todaysPick('olympiacos',open,'2026-10-08')
  expect(a).toBe(todaysPick('olympiacos',open,'2026-10-08'))
  expect(PICKABLE).toContain(a)
  expect(open).toContain(a)
  expect(todaysPick('olympiacos',['kits','archive'],'2026-10-08')).toBeNull()
  const days=new Set(Array.from({length:30},(_,i)=>todaysPick('olympiacos',open,`2026-11-${String(i+1).padStart(2,'0')}`)))
  expect(days.size).toBeGreaterThan(1)
 })
 it("every club's tab bar reads: ink bar with paper type, and the club badge's own ink reads on its colour",()=>{
  for(const r of REGISTRY){const t=clubTheme(r);expect(contrast(t.primary,t.onPrimary),r.id).toBeGreaterThanOrEqual(4.5)}
 })
 it('English and Hebrew carry the same shell keys',()=>{
  for(const k of Object.keys(en).filter(k=>/^(club|play|history|terrace|home(Today|Rounds|Matchday|Voice|NextTitle|HistoryCta|PlayCta|LifeCta))|^backTo$|^manifestDescription$/.test(k)))expect(he,k).toHaveProperty(k)
  expect(Object.keys(en).sort()).toEqual(Object.keys(he).sort())
 })
 it('the layout draws the chrome once; ClubSurface no longer draws a tab bar',()=>{
  const surface=read('components/clubs/ClubSurface.tsx'),layout=read('app/clubs/[slug]/layout.tsx')
  expect(surface).not.toMatch(/TabBar/)
  expect(surface).toMatch(/data-chrome/)
  expect(layout).toMatch(/ClubTabBar/)
  expect(layout).toMatch(/generateMetadata/)
  expect(layout).toMatch(/generateViewport/)
 })
 it('no club page uses the hub shell',()=>{
  for(const p of ['page.tsx','meetings/page.tsx','play/page.tsx','history/page.tsx','terrace/page.tsx'])expect(read(`app/clubs/[slug]/${p}`),p).not.toMatch(/components\/master\/Shell/)
 })
 it('the club app stylesheet uses logical properties only',()=>{
  const css=read('app/club-app.css')
  expect(css).not.toMatch(/(^|[\s{;])(left|right|margin-left|margin-right|padding-left|padding-right|border-left|border-right)\s*:/m)
  expect(css).not.toMatch(/text-align:\s*(left|right)/)
 })
})

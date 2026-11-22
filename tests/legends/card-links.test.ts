import {readFileSync} from 'node:fs'
import {describe,expect,it,vi} from 'vitest'
import React,{createElement as h_} from 'react'
;(globalThis as {React?:typeof React}).React=React
import {renderToStaticMarkup} from 'react-dom/server'
vi.mock('server-only',()=>({}))
import {LegendCard} from '@/components/legends/LegendCard'
import {LegendDoorsProvider} from '@/components/legends/CardLinks'
import {recordFacts,personOfRecord} from '@/lib/people/by-record'
import {peopleFromRepo} from '@/lib/people/registry'
import type {CardView} from '@/lib/legends/view'

const man=(over:Partial<CardView>={}):CardView=>({id:'zz:p-1',person:'pl_00000000aa',name:'Test Player',pos:'MF',price:3,stars:4,attrs:{},from:1990,to:1996,decades:[1990],rec:{club:'zz',apps:120,goals:14,clubs:2},...over})
const html=(c:CardView,doors={profiles:true,archives:['zz']})=>renderToStaticMarkup(h_(LegendDoorsProvider,{doors,children:h_(LegendCard,{c})}))

describe('a player\'s card carries his archive record and the doors to it (owner, 22.11.2026)',()=>{
 it('shows the recorded games, goals and clubs, and links to the archive sheet and the profile',()=>{
  const h=html(man())
  expect(h).toContain('120 games · 14 goals · 2 of our clubs')
  expect(h).toContain('href="/clubs/zz/archive?event=zz%3Ap-1&amp;lang=en"')
  expect(h).toMatch(/href="\/players\/[^"]+"/)
 })
 it('never draws a door to a closed room: no archive link for a closed club, no profile link behind the switch',()=>{
  const h=html(man(),{profiles:false,archives:[]})
  expect(h).not.toContain('legend-card-doors');expect(h).toContain('120 games')
  expect(html(man(),{profiles:false,archives:['zz']})).not.toContain('/players/')
  expect(html(man(),{profiles:true,archives:['other']})).not.toContain('/archive?')
 })
 it('says nothing it does not know: an unrecorded count is left out, and a one-club man with no counts has no record line',()=>{
  expect(html(man({rec:{club:'zz',apps:null,goals:9,clubs:1}}))).toContain('>9 goals<')
  expect(html(man({rec:{club:'zz',apps:null,goals:null,clubs:1}}))).not.toContain('legend-card-record')
  expect(html(man({rec:undefined}))).not.toContain('legend-card-doors')
 })
 it('a compact card stays compact',()=>{
  expect(renderToStaticMarkup(h_(LegendDoorsProvider,{doors:{profiles:true,archives:['zz']},children:h_(LegendCard,{c:man(),compact:true})}))).not.toContain('legend-card')
 })
 it('the facts come from the people registry, record by record',()=>{
  const p=peopleFromRepo().people.find(x=>new Set(x.stints.map(s=>s.club)).size>1)!,s=p.stints[0]!
  const f=recordFacts(s.eid)!
  expect(f).toMatchObject({person:p.id,club:s.club,apps:s.apps,goals:s.goals});expect(f.clubs).toBeGreaterThan(1)
  expect(personOfRecord(s.eid)).toBe(p.id);expect(recordFacts('no-such-record')).toBeNull()
 })
 it('the career page tells the cards which doors are open',()=>{
  expect(readFileSync('app/all-football/legends/career/[id]/page.tsx','utf8')).toMatch(/LegendDoorsProvider doors=\{\{profiles:pr\.open,archives\}\}/)
 })
})

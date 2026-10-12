import {describe,expect,it} from 'vitest'
import {loadClub} from '@/lib/clubs/resolver'
import {sanitizeBank} from '@/lib/clubs/trivia-bank'
import {isLatin,brand,enClub,enCompetition} from '@/lib/trivia/names'
import {levelOf,difficultyOf} from '@/lib/trivia/levels'
import {stratifiedCap} from '@/lib/experiences/pool'
import {SOMBRE} from '@/lib/trivia/forge'

const CLUBS=['hapoel-tel-aviv','celtic','aek-athens']

describe('Question Forge — FAN LIFE trivia is English and climbs four levels (rule 109)',()=>{
 for(const id of CLUBS)it(`${id}: every printed string is Latin, ids unique, four levels, the sanitizer keeps ≥99%`,async()=>{
  const r=(await loadClub(id))!,{questions,pools}=r.data.trivia
  expect(questions.length).toBeGreaterThan(1000)
  for(const q of questions){
   const opts=[...(q.distractors??[]),...(q.pool?pools[q.pool]??[]:[]),...(Array.isArray(q.answer)?q.answer:[String(q.answer)])]
   expect(isLatin(q.prompt+q.explanation+opts.join('')),q.id).toBe(true)
   expect(SOMBRE.test(q.prompt),q.prompt).toBe(false)
  }
  expect(new Set(questions.map(q=>q.id)).size).toBe(questions.length)
  const lv=new Set(questions.filter(q=>q.template.startsWith('fl-')).map(q=>levelOf(q.difficulty)))
  expect([...lv].sort()).toEqual(['Easy','Expert','Hard','Medium'])
  const {questions:kept}=sanitizeBank(questions,pools)
  expect(kept.length/questions.length).toBeGreaterThan(0.99)
  for(const q of questions.filter(q=>q.template.startsWith('fl-')))expect(q.facets).toContain(`club:${id}`)
  for(const [k,v] of Object.entries(pools))expect(new Set(v.map(x=>x.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase())).size,k).toBe(v.length)
 },120_000)
 it('Hapoel plays the English forge bank in FAN LIFE, never the Hebrew Worker bank',async()=>{
  const r=(await loadClub('hapoel-tel-aviv'))!
  expect(r.data.trivia.questions.every(q=>q.template.startsWith('fl-'))).toBe(true)
 },120_000)
 it('a false honour statement names a season the complete list does not hold',async()=>{
  const r=(await loadClub('celtic'))!
  const tfs=r.data.trivia.questions.filter(q=>q.template==='fl-honour-tf')
  const trueSeasons=new Set(tfs.filter(q=>q.answer==='true').map(q=>q.prompt.replace(/ in (\d{4}\/\d{2})\.$/,'|$1')))
  for(const q of tfs.filter(q=>q.answer==='false'))expect(trueSeasons.has(q.prompt.replace(/ in (\d{4}\/\d{2})\.$/,'|$1'))).toBe(false)
 },120_000)
})

describe('names and levels',()=>{
 it('dictionaries render, unknowns are not guessed',()=>{
  expect(enClub('מכבי חיפה')).toBe('Maccabi Haifa')
  expect(enClub('קבוצה שאינה במילון')).toBeNull()
  expect(enCompetition('2-bundesliga')).toBe('2. Bundesliga')
  expect(brand('umbro')).toBe('Umbro');expect(brand('BRT')).toBe('BRT');expect(brand('-')).toBeNull();expect(brand('Unbranded')).toBeNull()
 })
 it('levels map onto the engine scale',()=>{
  expect([1,2,3,4].map(l=>difficultyOf(l as 1)).map(levelOf)).toEqual(['Easy','Medium','Hard','Expert'])
 })
 it('the ALL FOOTBALL cap keeps every level and rotates templates',()=>{
  const xs=Array.from({length:2000},(_,i)=>({id:`q${i}`,difficulty:2+(i%4),template:`t${i%7}`,facets:[`level:${1+(i%4)}`]}))
  const got=stratifiedCap(xs,300,'v1')
  expect(got.length).toBe(300);expect(new Set(got.map(x=>x.id)).size).toBe(300)
  const by=[1,2,3,4].map(l=>got.filter(x=>x.facets[0]===`level:${l}`).length)
  expect(by).toEqual([75,90,75,60])
  expect(stratifiedCap(xs,300,'v1').map(x=>x.id)).toEqual(got.map(x=>x.id))
  const skew=[...xs.slice(0,40),...Array.from({length:1000},(_,i)=>({id:`e${i}`,difficulty:5,template:'t',facets:['level:4']}))]
  expect(stratifiedCap(skew,300,'v1').length).toBe(300)
 })
})

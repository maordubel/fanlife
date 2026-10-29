import {describe,it,expect,beforeAll} from 'vitest'
import {CORE_CLUB_IDS,loadClub} from '@/lib/clubs/resolver'
import type {ClubData} from '@/lib/clubs/contract'
import {canonClub,clubCore,competitionOn} from '@/lib/trivia/club-names'
import {clubMystery} from '@/lib/clubs/mystery'
import {nameTokens,leaks,publicText} from '@/lib/clubs/mystery-rules'
import {claimOf} from '@/lib/clubs/trivia-bank'
import {personName} from '@/lib/clubs/players'

/**
 * Content round 28.10.2026 — one printed name per club, era-true competitions, options from the same stage of the club's
 * life, a season never inside its own question, Blind Cow puzzles counted from the archive and printed in English.
 */
const clubs=new Map<string,ClubData>()
beforeAll(async()=>{for(const id of CORE_CLUB_IDS)clubs.set(id,(await loadClub(id))!.data)},180000)
const NONLATIN=/[Ͱ-Ͽἀ-῿Ѐ-ӿ֐-׿]/

describe('one printed name per club',()=>{
 it('exonyms, registry capitals and legal affixes fold to the name a reader knows',()=>{
  expect(canonClub('AEK Athen')).toBe('AEK Athens');expect(canonClub('PAOK Saloniki')).toBe('PAOK')
  expect(canonClub('FK ŽELJEZNIČAR')).toBe('Željezničar');expect(canonClub('ZŽeljezničar')).toBe('Željezničar')
  expect(canonClub('Rangers FC')).toBe('Rangers');expect(canonClub('SV Werder Bremen')).toBe('Werder Bremen')
  expect(canonClub('Heart of Midlothian')).toBe('Hearts');expect(canonClub('B. Dortmund')).toBe('Borussia Dortmund')
  expect(canonClub('Motherwell. Scottish Cup Final')).toBe('Motherwell')
 })
 it('identity tokens are never stripped: VfB Leipzig is not RB Leipzig',()=>{
  expect(clubCore('VfB Leipzig')).not.toBe(clubCore('RB Leipzig'));expect(canonClub('VfB Stuttgart')).toBe('VfB Stuttgart')
 })
 it('a register index form prints as the man is known',()=>{expect(personName('Forrest, James')).toBe('James Forrest');expect(personName('Scott Brown')).toBe('Scott Brown')})
})

describe('a competition under the name it carried on the night',()=>{
 it('European Cup before 1992, UEFA Cup before 2009, and the reverse',()=>{
  expect(competitionOn('UEFA Champions League','1971-06-02','Greece')).toBe('European Cup')
  expect(competitionOn('UEFA Europa League','2003-04-10','Scotland')).toBe('UEFA Cup')
  expect(competitionOn('UEFA Cup','2014-07-17','Israel')).toBe('UEFA Europa League')
  expect(competitionOn("Cup Winners' Cup",'1997-10-02','Greece')).toBe("European Cup Winners' Cup")
  expect(competitionOn('Super League','2020-11-21','Greece')).toBe('Greek Super League')
  expect(competitionOn('FA Cup - Final - Final','2026-05-23','Scotland')).toBe('Scottish Cup final')
 })
})

describe('the forged bank, club by club',()=>{
 for(const id of CORE_CLUB_IDS)it(`${id}: no option set holds one club twice, no season sits inside its own question`,()=>{
  const qs=clubs.get(id)!.trivia.questions
  for(const q of qs.filter(q=>q.template==='fl-match-opponent')){
   const cores=[q.answer as string,...(q.distractors??[])].map(clubCore)
   expect(new Set(cores).size,q.prompt).toBe(cores.length)
  }
  for(const q of qs.filter(q=>q.template==='fl-match-season'))expect(q.prompt,q.prompt).not.toContain(q.answer as string)
  for(const q of qs.filter(q=>q.template==='event-date-check')){const c=claimOf(q.prompt),t=claimOf(q.explanation);expect(c&&t).toBeTruthy();expect(q.prompt).not.toMatch(/\d{4}-\d{2}-\d{2}/)}
 })
 it('a false honour names each wrong season once',()=>{
  for(const d of clubs.values()){const ps=d.trivia.questions.filter(q=>q.template==='fl-honour-tf'&&q.answer==='false').map(q=>q.prompt);expect(new Set(ps).size).toBe(ps.length)}
 })
})

describe('Blind Cow from the archive',()=>{
 for(const id of CORE_CLUB_IDS)it(`${id}: every playable puzzle reads in English and never names its man; a counted one ends on one`,()=>{
  const d=clubs.get(id)!,game=clubMystery(d),men=new Map((d.players??[]).map(f=>[f.value.id,f.value]))
  for(const f of d.mysteries){
   const e=game.evaluations.get(f.id);if(!e?.practice.ok)continue
   for(const c of f.value.clues)expect(NONLATIN.test(c.label+c.value),`${f.id}: ${c.value}`).toBe(false)
   const t=men.get(f.value.targetPlayerId)!;for(const c of f.value.clues)expect(leaks(publicText(c),nameTokens({id:t.id,name:t.name,aliases:t.aliases}))).toBeNull()
   if(f.id.includes(':arch-m-')){expect(e.practice.kind).toBe('unique');expect(f.value.remaining!.at(-1)).toBe(1);expect(f.value.clues.every(c=>c.sources.length>0)).toBe(true)}
  }
 })
 it('the archive opens Blind Cow where written puzzles were too few',()=>{
  for(const id of ['panathinaikos','olympiacos','aek-athens','celtic','zrinjski-mostar'])expect(clubMystery(clubs.get(id)!).poolSize,id).toBeGreaterThanOrEqual(30)
  for(const id of ['panathinaikos','olympiacos','aek-athens','celtic','zrinjski-mostar'])expect(clubMystery(clubs.get(id)!).competitiveSize,id).toBeGreaterThan(0)
 })
})

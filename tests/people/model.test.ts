import {describe,expect,it} from 'vitest'
import {buildRegistry,candidates,isPersonId,linkKey,publicStint,type Link,type Stint} from '@/lib/people/model'
import {decide} from '@/scripts/people/wikidata-links'

/** invented clubs and men only (fixtures never name real people) */
let n=0
const st=(club:string,eid:string,name:string,o:Partial<Stint>={}):Stint=>({key:`${club}:${eid}`,club,eid,id:`pl_${(++n).toString(16).padStart(10,'0')}`,name,aliases:[],pos:['MF'],from:2000,to:2004,apps:null,goals:null,rating:70,reputation:60,stars:3,archiveOnly:false,...o})
const link=(a:Stint,b:Stint,verdict:'same'|'different',basis:Link['basis']='owner',evidence='owner'):Link=>({a:a.key,b:b.key,verdict,basis,evidence,on:'2026-11-18'})

describe('People Registry — one person across clubs, never by a name alone', () => {
 it('Given two clubs sharing a name, When nothing is decided, Then they stay two people and the pair is queued', () => {
  const a=st('north-fc','n1','Arno Velt'),b=st('south-fc','s1','Arno Velt')
  const r=buildRegistry([a,b],[])
  expect(r.people).toHaveLength(2)
  expect(r.queue.map(q=>q.key)).toEqual([linkKey(a.key,b.key)])
 })
 it('Given a same verdict, Then one person with both stints, the smallest id, and every id resolves to him', () => {
  const a=st('north-fc','n2','Bern Ostra',{from:1998,to:2001}),b=st('south-fc','s2','Bern Ostra',{from:2002,to:2006,stars:4.25})
  const r=buildRegistry([a,b],[link(a,b,'same','wikidata','Q1')])
  expect(r.people).toHaveLength(1)
  const p=r.people[0]!
  expect(p.stints.map(s=>s.club)).toEqual(['north-fc','south-fc'])
  expect(p.id).toBe([a.id,b.id].sort()[0])
  expect(r.resolve(a.id)?.id).toBe(p.id);expect(r.resolve(b.id)?.id).toBe(p.id)
  expect(p.stars).toBe(4.25);expect(p.qid).toBe('Q1');expect(r.queue).toHaveLength(0)
 })
 it('Given links across three clubs, Then the verdicts chain into one person', () => {
  const a=st('a-fc','a','Cael Dorn'),b=st('b-fc','b','Cael Dorn'),c=st('c-fc','c','Cael Dorn')
  const r=buildRegistry([a,b,c],[link(a,b,'same'),link(b,c,'same')])
  expect(r.people).toHaveLength(1);expect(r.queue).toHaveLength(0);expect(r.counts.multiClub).toBe(1)
 })
 it('Given a different verdict, Then two people and nothing queued', () => {
  const a=st('a-fc','d1','Dain Ruu',{from:1980,to:1985}),b=st('b-fc','d2','Dain Ruu',{from:2019,to:2023})
  const r=buildRegistry([a,b],[link(a,b,'different')])
  expect(r.people).toHaveLength(2);expect(r.queue).toHaveLength(0)
 })
 it('Given a later verdict for the same pair (the desk after the repository), Then the later one wins', () => {
  const a=st('a-fc','e1','Eon Pask'),b=st('b-fc','e2','Eon Pask')
  expect(buildRegistry([a,b],[link(a,b,'same'),link(a,b,'different')]).people).toHaveLength(2)
  expect(buildRegistry([a,b],[link(a,b,'different'),link(a,b,'same')]).people).toHaveLength(1)
 })
 it('Given two records at ONE club with one name, Then no cross-club candidate (that is the in-club merge desk)', () => {
  expect(candidates([st('a-fc','f1','Fenn Lo'),st('a-fc','f2','Fenn Lo')])).toEqual([])
 })
 it('Given a shared one-word alias, Then it is no candidate unless it is the whole name on both sides', () => {
  expect(candidates([st('a-fc','g1','Gael Morra',{aliases:['Gael']}),st('b-fc','g2','Gael Tinto',{aliases:['Gael']})])).toEqual([])
  expect(candidates([st('a-fc','g3','Nanu'),st('b-fc','g4','Nanu')])).toHaveLength(1)
 })
 it('Given diacritics and case, Then the written name still matches (fold, not fuzzy)', () => {
  expect(candidates([st('a-fc','h1','Ivo Šarić'),st('b-fc','h2','IVO SARIC')])).toHaveLength(1)
  expect(candidates([st('a-fc','h3','Ivo Saric'),st('b-fc','h4','Ivo Sarics')])).toHaveLength(0)
 })
 it('Given a stint, Then the public form carries no hidden rating (rule 4)', () => {
  const p=publicStint(st('a-fc','i1','Jon Ek'))
  expect('rating' in p).toBe(false);expect('reputation' in p).toBe(false);expect(p.stars).toBe(3)
 })
 it('person ids have one shape', () => {expect(isPersonId('pl_0123456789')).toBe(true);expect(isPersonId('p_0123456789')).toBe(false)})
})

describe('Wikidata decides only what it proves', () => {
 const a=st('a-fc','w1','Kai Merro'),b=st('b-fc','w2','Kai Merro')
 it('one item lists both clubs → same', () => {expect(decide(a,b,[{q:'Q9',clubs:['a-fc','b-fc']}],'2026-11-18')?.verdict).toBe('same')})
 it('two items, one club each → different', () => {expect(decide(a,b,[{q:'Q1',clubs:['a-fc']},{q:'Q2',clubs:['b-fc']}],'2026-11-18')?.verdict).toBe('different')})
 it('two items both list both clubs → undecided', () => {expect(decide(a,b,[{q:'Q1',clubs:['a-fc','b-fc']},{q:'Q2',clubs:['a-fc','b-fc']}],'x')).toBeNull()})
 it('one item, one club only → undecided', () => {expect(decide(a,b,[{q:'Q1',clubs:['a-fc']}],'x')).toBeNull()})
 it('nothing found → undecided', () => {expect(decide(a,b,[],'x')).toBeNull()})
})

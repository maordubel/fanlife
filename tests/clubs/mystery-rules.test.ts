import {describe,it,expect} from 'vitest'
import {evaluate,ladder,leaks,nameTokens,scopeProblem,weighted,supportedVersion,duelOutcome,pastDeadline,resolveGuess,homonyms,isRepeatGuess,revealIsReplay,tally,type RuleClue,type RuleMystery,type RuleTarget} from '@/lib/clubs/mystery-rules'

const target: RuleTarget = {id: 'p1', name: 'Yossi Benayoun', aliases: ['יוסי בניון', 'Josef Benayoun']}
const fam = ['A', 'B', 'C', 'D', 'E']
const clue = (i: number, over: Partial<RuleClue> = {}): RuleClue => ({id: `c${i}`, label: `L${i}`, value: `Fact number ${i} about the era`, sources: ['s1'], type: 'club', family: fam[i % 3]!, facet: `f${i}`, factKey: `k${i}`, ...over})
const ten = (over: Partial<RuleMystery> = {}): RuleMystery => ({id: 'm', clues: Array.from({length: 10}, (_, i) => clue(i + 1)), remaining: [200, 90, 40, 20, 9, 4, 2, 1, 1, 1], ...over})
const ok = (m: RuleMystery) => evaluate(m, target)

describe('BC-R10 · the score is named by its version', () => {
 it('30 s elapsed + 3 clues shown + 2 wrong guesses = 70 s weighted under version 1', () => {
  expect(weighted({rawElapsedMs: 30_000, cluesShown: 3, wrongGuesses: 2}, 1)).toBe(70_000)
  expect(weighted({rawElapsedMs: 30_000, cluesShown: 1, wrongGuesses: 0}, 1)).toBe(30_000)
 })
 it('rejects an unknown rules version instead of using the latest formula', () => {
  expect(weighted({rawElapsedMs: 30_000, cluesShown: 3, wrongGuesses: 2}, 2)).toBeNull()
  expect(supportedVersion(2)).toBe(false); expect(supportedVersion(1)).toBe(true); expect(supportedVersion('1')).toBe(false)
  expect(evaluate(ten(), target, {runtime: true, scoringVersion: 2}).competitive.blockers.map(b => b.code)).toContain('VERSION_UNSUPPORTED')
 })
})

describe('BC-R06 · competitive eligibility', () => {
 it('opens a ten-clue, three-family, strictly narrowing mystery that ends on one', () => {
  const e = ok(ten()); expect(e.competitive.blockers).toEqual([]); expect(e.competitive.ok).toBe(true); expect(e.practice.kind).toBe('unique')
 })
 it('four text clues never open competitive — and never practice either', () => {
  const m: RuleMystery = {id: 'm4', clues: [1, 2, 3, 4].map(i => ({id: `c${i}`, label: 'L', value: `plain prose ${i}`, sources: ['s']}))}
  const e = ok(m); expect(e.competitive.ok).toBe(false); expect(e.practice.ok).toBe(false)
  expect(e.competitive.blockers.map(b => b.code)).toContain('BLIND_COW_NOT_UNIQUE')
 })
 it('five prose clues with no ladder is a practice EXPLORATION, still not competitive', () => {
  const m: RuleMystery = {id: 'm5', clues: [1, 2, 3, 4, 5].map(i => ({id: `c${i}`, label: 'L', value: `plain prose ${i}`, sources: ['s']}))}
  const e = ok(m); expect(e.practice.ok).toBe(true); expect(e.practice.kind).toBe('exploration'); expect(e.competitive.ok).toBe(false); expect(e.finalCandidates).toBeNull()
 })
 it('refuses ten clues that stop at two candidates', () => {
  const e = ok(ten({remaining: [200, 90, 40, 20, 9, 6, 4, 3, 2, 2]}))
  expect(e.competitive.ok).toBe(false); expect(e.competitive.blockers.some(b => /2 candidates/.test(b.detail))).toBe(true)
 })
 it('refuses fewer than three evidence families, a duplicate fact and a missing source', () => {
  expect(ok(ten({clues: ten().clues.map(c => ({...c, family: 'A'}))})).competitive.blockers.some(b => /famil/.test(b.detail))).toBe(true)
  expect(ok(ten({clues: ten().clues.map((c, i) => i === 3 ? {...c, factKey: 'k2'} : c)})).competitive.ok).toBe(false)
  const e = ok(ten({clues: ten().clues.map((c, i) => i === 2 ? {...c, sources: []} : c)})); expect(e.competitive.blockers.map(b => b.code)).toContain('SOURCE_UNCHECKED')
 })
 it('needs a functioning authoritative service', () => {
  expect(evaluate(ten(), target, {runtime: false, scoringVersion: 1}).competitive.blockers.map(b => b.code)).toContain('RUNTIME_UNAVAILABLE')
 })
})

describe('BC-R04 · the narrowing ladder', () => {
 it('per-prefix counts never increase', () => {
  const e = ok(ten({remaining: [200, 90, 95, 20, 9, 4, 2, 1, 1, 1]}))
  expect(e.ladder[2]!.note).toBe('widens'); expect(e.practice.ok).toBe(false); expect(e.competitive.ok).toBe(false)
 })
 it('a clue that narrows nothing before uniqueness is redundant; after uniqueness it is merely settled', () => {
  const e = ok(ten({remaining: [200, 90, 90, 20, 9, 4, 2, 1, 1, 1]}))
  expect(e.ladder[2]!.note).toBe('redundant'); expect(e.competitive.ok).toBe(false)
  expect(ok(ten()).ladder[8]!.note).toBe('settled')
 })
 it('adjacent same-facet clues are rejected', () => {
  const m = ten({clues: ten().clues.map((c, i) => i === 4 ? {...c, facet: 'f4'} : c)})
  m.clues[3]!.facet = 'f4'
  const e = ok(m); expect(e.ladder[4]!.note).toBe('same-facet'); expect(e.competitive.ok).toBe(false)
 })
 it('a ladder is computed from the counts, not invented when they are missing', () => {
  const l = ladder({id: 'x', clues: ten().clues}); expect(l.every(r => r.remaining === null && r.note === 'unknown')).toBe(true)
 })
 it('practice allows up to three candidates and no more', () => {
  expect(ok(ten({remaining: [200, 90, 40, 20, 9, 6, 5, 4, 3, 3]})).practice.kind).toBe('exploration')
  expect(ok(ten({remaining: [200, 90, 40, 20, 9, 6, 5, 5, 4, 4]})).practice.ok).toBe(false)
 })
 it('tally counts mysteries per blocker code', () => {
  const t = tally([ok(ten()), ok(ten({remaining: [200, 90, 40, 20, 9, 6, 4, 3, 2, 2]}))], 'competitive')
  expect(t).toMatchObject({open: 1, of: 2}); expect(t.codes[0]).toMatchObject({code: 'BLIND_COW_NOT_UNIQUE', count: 1})
 })
})

describe('BC-R08 · name leakage', () => {
 it('catches the full name, a part, an alias, a Latin spelling and an accent-stripped form', () => {
  const tokens = nameTokens(target)
  expect(leaks('He is Yossi Benayoun', tokens)).toBeTruthy()
  expect(leaks('known as בניון', tokens)).toBeTruthy()
  expect(leaks('Josef the midfielder', tokens)).toBeTruthy()
  expect(leaks('Benayoún', tokens)).toBeTruthy()
  expect(leaks('Played in the 2000s for the club', tokens)).toBeNull()
 })
 it('checks picture alt text, not just the visible line; a server-only clue id is not public text', () => {
  expect(ok(ten({clues: ten().clues.map((c, i) => i === 0 ? {...c, media: ['photo of Yossi']} : c)})).competitive.blockers.map(b => b.code)).toContain('AMBIGUOUS_IDENTITY')
  expect(ok(ten({clues: ten().clues.map((c, i) => i === 0 ? {...c, id: 'clue-benayoun-1'} : c)})).practice.ok).toBe(true)
 })
 it('a short ordinary word is not a leak', () => {
  expect(leaks('Born in Ashdod, plays for Hapoel', nameTokens({id: 'x', name: 'Ofir Ben', aliases: []}))).toBeNull()
 })
})

describe('BC-R03 · scope', () => {
 it('a shirt number needs its season; a career total is refused', () => {
  expect(scopeProblem(clue(1, {type: 'shirt_number', facet: 'shirt', value: 'Wore number 10'}))).toMatch(/season/)
  expect(scopeProblem(clue(1, {type: 'shirt_number', facet: 'shirt', value: 'Wore number 10 in 2021/22'}))).toBeNull()
  expect(scopeProblem(clue(1, {value: 'לבש את מספר 10', type: 'shirt_number', scope: {season: '2021/22'}}))).toBeNull()
  expect(scopeProblem(clue(1, {value: 'סה"כ 120 שערים בהפועל'}))).toMatch(/career total/)
  expect(scopeProblem(clue(1, {value: 'scored 50 goals in total'}))).toMatch(/career total/)
 })
 it('a European claim needs its competition', () => {
  expect(scopeProblem(clue(1, {type: 'goal', facet: 'goal', value: 'Scored in Europe', factKey: undefined}))).toMatch(/competition/)
  expect(scopeProblem(clue(1, {type: 'goal', facet: 'goal', value: 'Scored in Europe', scope: {competition: 'Europa League'}}))).toBeNull()
 })
 it('a scope problem blocks the mystery', () => {
  const e = ok(ten({clues: ten().clues.map((c, i) => i === 5 ? {...c, type: 'shirt_number', facet: 'shirt', value: 'Wore number 7'} : c)}))
  expect(e.practice.ok).toBe(false); expect(e.competitive.ok).toBe(false)
 })
})

describe('BC-R13 · duel outcomes and the 120 s limit', () => {
 const s = (status: 'solved' | 'gave_up' | 'timeout' | 'playing', weightedMs: number | null) => ({status, weightedMs})
 it('a solver beats a non-solver; lower weighted time wins; equal is a tie; two non-solvers have no winner', () => {
  expect(duelOutcome(s('solved', 90_000), s('gave_up', null))).toBe('a')
  expect(duelOutcome(s('timeout', null), s('solved', 119_000))).toBe('b')
  expect(duelOutcome(s('solved', 40_000), s('solved', 41_000))).toBe('a')
  expect(duelOutcome(s('solved', 41_000), s('solved', 40_000))).toBe('b')
  expect(duelOutcome(s('solved', 40_000), s('solved', 40_000))).toBe('tie')
  expect(duelOutcome(s('gave_up', null), s('timeout', null))).toBe('none')
  expect(duelOutcome(s('playing', null), s('solved', 1))).toBe('open')
 })
 it('closes a run past 120 s and not a moment before', () => {
  expect(pastDeadline(1000, 1000 + 120_000, 1)).toBe(false); expect(pastDeadline(1000, 1000 + 120_001, 1)).toBe(true)
  expect(pastDeadline(1000, 9e9, 99)).toBe(false)
 })
})

describe('BC-R09/R11 · idempotent events and a guess that is an id', () => {
 it('a repeated wrong guess is the same guess; a replayed reveal changes nothing', () => {
  expect(isRepeatGuess(['p2'], 'p2')).toBe(true); expect(isRepeatGuess(['p2'], 'p3')).toBe(false)
  expect(revealIsReplay(3, 2)).toBe(true); expect(revealIsReplay(3, 3)).toBe(false)
 })
 it('resolves a verified alias, never an ambiguous name', () => {
  const list = [{id: 'a', name: 'Dan Cohen', aliases: ['דן כהן']}, {id: 'b', name: 'Dan Cohen', aliases: []}, {id: 'c', name: 'Yoni Levi', aliases: ['Jonathan Levi']}]
  expect(resolveGuess('jonathan levi', list)).toEqual({kind: 'one', id: 'c'})
  expect(resolveGuess('דן כהן', list)).toEqual({kind: 'one', id: 'a'})
  expect(resolveGuess('dan cohen', list)).toEqual({kind: 'ambiguous', ids: ['a', 'b']})
  expect(resolveGuess('nobody', list)).toEqual({kind: 'none'}); expect(resolveGuess('  ', list)).toEqual({kind: 'none'})
  expect([...homonyms(list)].sort()).toEqual(['a', 'b'])
 })
})

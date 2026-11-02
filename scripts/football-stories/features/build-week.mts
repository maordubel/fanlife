/**
 * FAN LIFE feature videos · the week's plan (owner, 2.11.2026: challenge Shorts + feature explainers, clubs in rotation,
 * 7 Shorts + 1 film a week, produced automatically and sent to Telegram for approval).
 *
 * Every Short is ONE club and ONE challenge read straight from that club's approved archive through the FAN LIFE
 * trivia forge (English, confidence ≥ 2, exact dates — rule 109) and the Blind Cow mysteries (UEFA-approved, rule 102).
 * Nothing from before 1980 (owner, 27.10.2026). Nothing is written that the archive does not hold.
 * The weekly film explains one FAN LIFE feature; its words are in explainers.json, its pictures are captured from the
 * live site when it renders.
 *
 *   node --require ./scripts/master/server-only.cjs --import tsx scripts/football-stories/features/build-week.mts [YYYY-Www]
 * → scripts/football-stories/features/weeks/<week>.json
 */
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {loadClubBase} from '../../../lib/clubs/resolver'
import {smartTags, type Topic} from '../../../lib/marketing/tags'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SITE = 'https://fanlife.dubelteam.com'
// the control room's published (`live`) clubs — the same list the social plan markets (build-plan.mts, 30.10.2026)
export const PUBLISHED = ['hapoel-tel-aviv', 'zrinjski-mostar', 'hapoel-petah-tikva', 'olympiacos', 'panathinaikos', 'aek-athens', 'st-pauli', 'celtic']

// ── which week ─────────────────────────────────────────────────────────────────────────────────────────────────────
function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y = t.getUTCFullYear()
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7)
  return `${y}-W${String(w).padStart(2, '0')}`
}
function nextMonday(from: Date): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const add = ((8 - (d.getUTCDay() || 7)) % 7) || 7
  d.setUTCDate(d.getUTCDate() + add)
  return d
}
const arg = process.argv[2]
const monday = arg ? (() => { const [y, w] = arg.split('-W').map(Number); const j4 = new Date(Date.UTC(y, 0, 4)); const m = new Date(j4); m.setUTCDate(j4.getUTCDate() - ((j4.getUTCDay() || 7) - 1) + (w - 1) * 7); return m })() : nextMonday(new Date())
const WEEK = isoWeek(monday)
const WEEKNO = Number(WEEK.split('-W')[1]) + Number(WEEK.slice(0, 4)) * 53

// ── deterministic choice ───────────────────────────────────────────────────────────────────────────────────────────
const h = (s: string) => { let x = 2166136261; for (const c of s) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) } return x >>> 0 }
const pick = <T,>(list: readonly T[], seed: string) => list[h(seed) % list.length]!
const shuffle = <T,>(list: readonly T[], seed: string) => [...list].map((v, i) => ({v, k: h(seed + ':' + i)})).sort((a, b) => a.k - b.k).map(x => x.v)

// ── the archive ────────────────────────────────────────────────────────────────────────────────────────────────────
type Q = {id: string; template: string; type: string; prompt: string; answer: string; explanation: string; difficulty?: number; pool?: string; distractors?: string[]; facets?: string[]; source?: {title?: string; url?: string}}
const latin = (s: string) => !/[Ͱ-ϿЀ-ӿ֐-׿؀-ۿ]/.test(s)
const YEARS = /\b(1[89]\d\d|20\d\d)(?:\/\d\d)?\b|\b(1[89]\d)0s\b/g
const modern = (...t: string[]) => [...t.join(' ').matchAll(YEARS)].every(m => Number(m[1] || (m[2] + '0')) >= 1980)
// a betting sponsor is not something to put in front of a 15-year-old as a question
const BETTING = /bet|casino|stoiximan|dafabet|novibet|interwetten|tipico|bwin|pamestoixima|winner\.co|1xbet|sbobet/i
const big = (q: Q) => ['final', 'derby', 'europe'].some(f => q.facets?.some(x => x === f || x.startsWith(f)))

type Club = {id: string; name: string; primary: string; on: string; secondary: string; qs: Q[]; pools: Record<string, string[]>; mysteries: any[]; players: Map<string, any>; timeline: any[]}
const clubs: Club[] = []
for (const id of PUBLISHED) {
  const r = await loadClubBase(id)
  if (!r) continue
  const d: any = r.data
  const qs = (d.trivia.questions as Q[]).filter(q => latin(q.prompt + q.answer + q.explanation) && modern(q.prompt, q.answer, q.explanation) && !BETTING.test(q.prompt + q.answer))
  clubs.push({id, name: d.identity.name, primary: d.theme.primary, on: d.theme.onPrimary || '#FFFFFF', secondary: d.theme.secondary,
    qs, pools: d.trivia.pools, mysteries: d.mysteries.filter((m: any) => m.status === 'approved' && (m.confidence ?? 0) >= 2),
    players: new Map(d.players.map((p: any) => [p.id, p.value])), timeline: d.timeline.filter((t: any) => t.status === 'approved' && (t.confidence ?? 0) >= 2)})
}

function options(q: Q, c: Club, seed: string): string[] | null {
  const pool = (q.distractors?.length ? q.distractors : (q.pool ? c.pools[q.pool] : [])) ?? []
  const wrong = [...new Set(pool.filter(x => x && x !== q.answer && latin(x) && modern(x)))]
  if (wrong.length < 3) return null
  return shuffle([q.answer, ...shuffle(wrong, seed).slice(0, 3)], seed + ':o')
}

// ── the seven challenge kinds, one a day ───────────────────────────────────────────────────────────────────────────
type Short = Record<string, unknown> & {kind: string; club: string}
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const KINDS = ['quiz', 'whoami', 'score', 'order', 'scorer', 'tf', 'decade'] as const
const TEMPLATES: Record<string, string[]> = {quiz: ['fl-match-opponent', 'fl-player-position'], score: ['fl-match-score'], scorer: ['fl-match-scorer', 'fl-goal-finisher'], tf: ['fl-match-tf', 'fl-honour-tf'], decade: ['fl-player-decade']}
const HOOKS: Record<string, string[]> = {
  quiz: ['Only real {club} fans get this one', '{club} fans: 5 seconds. Go.', 'If you know, you know. {club} edition'],
  whoami: ['Five clues. One {club} player. Who is it?', '{club} fans — name him before the last clue', 'How many clues do you need? {club} edition'],
  score: ['Guess the score. {club} edition', 'You were there? Then you know the score'],
  order: ['Put these {club} nights in order', 'Oldest first. {club} fans only'],
  scorer: ['Who scored it? {club} edition', 'One goal. One name. {club} fans, go'],
  tf: ['True or false? {club} fans only', 'Fact or fake? {club} edition'],
  decade: ['Which decade? {club} edition', '{club} fans: when did he play for you?'],
}
const TOPIC: Record<string, Topic[]> = {quiz: ['quiz'], whoami: ['quiz', 'nerds'], score: ['guess'], order: ['year'], scorer: ['goals', 'quiz'], tf: ['quiz'], decade: ['year']}
const GATE: Record<string, string> = {quiz: 'trivia', whoami: 'blind-cow', score: 'trivia', order: 'timeline', scorer: 'trivia', tf: 'trivia', decade: 'trivia'}

function fromTrivia(kind: string, c: Club, seed: string): Short | null {
  const all = c.qs.filter(q => TEMPLATES[kind].includes(q.template) && (q.difficulty ?? 3) <= 4)
  const ranked = [...all.filter(big), ...all.filter(q => !big(q))]
  if (!ranked.length) return null
  for (let i = 0; i < 12; i++) {
    const q = pick(ranked.slice(0, Math.max(20, Math.ceil(ranked.length / 3))), seed + i)
    if (q.type === 'tf') return {kind, club: c.id, prompt: q.prompt, options: ['True', 'False'], answer: q.answer === 'true' ? 'True' : 'False', explanation: q.explanation, source: q.source ?? null, qid: q.id}
    const o = options(q, c, seed + i)
    if (o) return {kind, club: c.id, prompt: q.prompt, options: o, answer: q.answer, explanation: q.explanation, source: q.source ?? null, qid: q.id}
  }
  return null
}
function whoami(c: Club, seed: string): Short | null {
  const ok = c.mysteries.filter(m => {
    const p = c.players.get(m.value.targetPlayerId)
    return p && latin(p.name) && (p.fromYear ?? 0) >= 1980 && m.value.clues.length >= 3 && m.value.clues.every((x: any) => latin(x.value))
  })
  if (!ok.length) return null
  const m = pick(ok, seed)
  const p = c.players.get(m.value.targetPlayerId)
  // the vaguest clue first, the giveaway last (shirt number, debut) — the order the game itself plays them in
  const clues = m.value.clues.slice(0, 5).map((x: any) => ({label: x.label, value: x.value}))
  return {kind: 'whoami', club: c.id, prompt: 'Who am I?', clues, answer: p.name, explanation: `${p.name} — ${c.name}${p.fromYear ? `, ${p.fromYear}–${p.toYear ?? ''}` : ''}.`, source: null, qid: m.id}
}
function order_(c: Club, seed: string): Short | null {
  const ev = c.timeline.map(t => t.value).filter((v: any) => v.on && /^\d{4}-\d\d-\d\d$/.test(v.on) && Number(v.on.slice(0, 4)) >= 1980 && latin(v.title) && v.title.length <= 60)
  const byYear = new Map<string, any>()
  for (const v of shuffle(ev, seed)) if (!byYear.has(v.on.slice(0, 4))) byYear.set(v.on.slice(0, 4), v)
  const four = [...byYear.values()].slice(0, 4)
  if (four.length < 4) return null
  const shown = shuffle(four, seed + ':shown')
  const sorted = [...four].sort((a, b) => a.on.localeCompare(b.on))
  return {kind: 'order', club: c.id, prompt: 'Oldest first. Put them in order.', items: shown.map(v => v.title),
    answer: sorted.map(v => `${v.title} (${v.on.slice(0, 4)})`).join(' → '), order: sorted.map(v => shown.indexOf(v)), years: sorted.map(v => v.on.slice(0, 4)), explanation: '', source: null}
}

const rot = shuffle(clubs.map(c => c.id), WEEK).map(id => clubs.find(c => c.id === id)!)
const shorts: Short[] = []
KINDS.forEach((kind, i) => {
  const used = new Set(shorts.map(s => s.club))
  // a different club every day while there are clubs left; a club without the data for this kind passes its turn
  const order = Array.from({length: rot.length}, (_, k) => rot[(i + k + WEEKNO) % rot.length])
  for (const c of [...order.filter(c => !used.has(c.id)), ...order.filter(c => used.has(c.id))]) {
    const seed = `${WEEK}:${kind}:${c.id}`
    const s = kind === 'whoami' ? whoami(c, seed) : kind === 'order' ? order_(c, seed) : fromTrivia(kind, c, seed)
    if (!s) continue
    const hook = pick(HOOKS[kind], seed).replaceAll('{club}', c.name).replace('Five clues', `${['One', 'Two', 'Three', 'Four', 'Five'][((s as any).clues?.length ?? 5) - 1]} clues`)
    const gate = GATE[kind]
    const url = `${SITE}/clubs/${c.id}/${gate}`
    const tags = smartTags({clubs: [c.id], topics: TOPIC[kind], max: 7})
    shorts.push({...s, day: DAYS[i], hook, clubName: c.name, primary: c.primary, on: c.on, secondary: c.secondary, url, gate,
      title: `${hook} #Shorts`.slice(0, 95),
      caption: `${hook} 👀\nAnswer in the comments before the reveal — then play the full round on FAN LIFE (link in bio).\n\n${tags} #Shorts`,
      comment: `Answer: ${s.answer}${s.explanation ? `\n${s.explanation}` : ''}\nPlay the full ${c.name} round: ${url}`,
      tags})
    break
  }
})

// ── the film of the week: one feature, explained ───────────────────────────────────────────────────────────────────
const EXPL = JSON.parse(readFileSync(path.join(HERE, 'explainers.json'), 'utf8')) as {order: string[]; features: Record<string, any>}
const feature = EXPL.order[WEEKNO % EXPL.order.length]
const fclubs = shuffle(PUBLISHED, WEEK + ':film')
const film = {feature, ...EXPL.features[feature], clubs: fclubs.map(id => ({id, name: clubs.find(c => c.id === id)?.name ?? id, primary: clubs.find(c => c.id === id)?.primary}))}

const out = {week: WEEK, monday: monday.toISOString().slice(0, 10), built: new Date().toISOString(), shorts, film}
mkdirSync(path.join(HERE, 'weeks'), {recursive: true})
writeFileSync(path.join(HERE, 'weeks', `${WEEK}.json`), JSON.stringify(out, null, 2) + '\n')
console.log(`${WEEK}: ${shorts.length} shorts (${shorts.map(s => `${s.day} ${s.kind}/${s.club}`).join(', ')}) · film: ${feature}`)

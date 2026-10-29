/**
 * FAN LIFE social plan v4 (owner, 29.10.2026): 45 days from 29.10, 17 slots a day, "easier text, smarter tags, real
 * copy-paste". Every post carries its own smart tags (lib/marketing/tags.ts), a short label, and — where there is an
 * answer — a first comment, so the caption never gives the answer away and the comments do the talking.
 * New in v4: 17:30 Guess the score and 22:30 Guess the year (both from the approved archive).
 * Built on plan v3 (owner, 27.10.2026). Three voices, a picture on every post, nothing from before 1980.
 *   FAN LIFE (the lead publisher) — 08 On this day · 10 a gate of the app · 14 story quiz · 16 nerds only ·
 *     18 Royal Rumble / Legends Manager on alternate days · 20 spicy · 22 did you know; 12:00 did you know on Sun/Wed/Fri.
 *   DUBID — how it works, in its own branding, 12:00 Mon/Thu; a round that opens: live slot 13:00.
 *   OFFSIDES — how it works, in its own branding, 12:00 Tue/Sat; today's arenas: live slot 15:00.
 *   Matches and results (not marketing): live slots 09:00 results · 11:00 next up — composed at send time from the
 *   fixture feed (lib/marketing/live.ts), or quiet.
 * The data slots come from the clubs' approved archives through the FAN LIFE trivia forge (English, confidence ≥ 2,
 * exact dates — rule 109). Writes supabase/marketing/0008_marketing_plan_v4.sql and scripts/marketing/plan-v4.json.
 * Run: node --require ./scripts/master/server-only.cjs --import tsx scripts/marketing/build-plan.mts
 */
import {readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {loadClubBase, CORE_CLUB_IDS} from '../../lib/clubs/resolver'
import {smartTags, type Topic} from '../../lib/marketing/tags'

const HERE = path.dirname(fileURLToPath(import.meta.url))
// kit: the template for this post and its data. Crest NAMES only (crestName, homeCrestName, awayCrestName): the picture
// resolves them through the shared crest library (ecosystem/crests) when it is drawn.
type Kit = {t: string; data: Record<string, unknown>}
// tags: smart hashtags · label: the one-word header line · comment: the first comment (answers live here, never in the
// caption) · comment_label: when the second box is not a comment (a story's second frame) · how: one line for stories
type Item = {app: string; hook: string; body: string; visual: string; url?: string; kit: Kit; tags?: string; label?: string; comment?: string; comment_label?: string; how?: string}
const pickOf = <T,>(list: readonly T[], seed: string) => list[h(seed) % list.length]!

// ── the archive, read through the forge ────────────────────────────────────────────────────────────────────────────
type Q = {id: string; template: string; type: string; prompt: string; answer: string; explanation: string; pool?: string; topic?: string; facets?: string[]; factIds?: string[]; source?: {url?: string}}
type Club = {id: string; name: string; qs: Q[]; pools: Record<string, string[]>}
type Ev = {club: string; name: string; y: number; m: number; d: number; text: string; derby: boolean; final: boolean; europe: boolean; margin: number; goals: number; won: boolean | null; fact: string; comp?: string; opp?: string; home?: string; away?: string; score?: string}
const MON: Record<string, number> = {Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12}
const MONTH = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const latin = (s: string) => !/[Ͱ-ϿЀ-ӿ֐-׿؀-ۿ]/.test(s)
const clubs: Club[] = []
for (const id of CORE_CLUB_IDS) {
  const r = await loadClubBase(id)
  if (!r) continue
  const t = r.data.trivia as unknown as {questions: Q[]; pools: Record<string, string[]>}
  clubs.push({id, name: r.data.identity.name, qs: t.questions.filter(q => latin(q.prompt + q.answer + q.explanation)), pools: t.pools})
}
// Owner, 27.10.2026: nothing from before 1980. Every year a text names (and the first year of a season) is 1980 or later.
const YEARS = /\b(1[89]\d\d|20\d\d)(?:\/\d\d)?\b|\b(1[89]\d)0s\b/g
export const modern = (...texts: string[]) => [...texts.join(' ').matchAll(YEARS)].every(m => Number(m[1] || (m[2] + '0')) >= 1980)
const NAME = Object.fromEntries(clubs.map(c => [c.id, c.name]))
const has = (q: Q, f: string) => !!q.facets?.includes(f)

const events: Ev[] = []
const seen = new Set<string>()
const RX = /^(.+?) (\d+)-(\d+) (.+?), (?:(.+?), )?(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})\.$/
for (const c of clubs) for (const q of c.qs) {
  const fact = q.factIds?.[0]
  if (!fact || seen.has(fact) || !modern(q.prompt, q.answer, q.explanation)) continue
  if (q.template === 'fl-match-score' || q.template === 'fl-match-opponent') {
    const m = q.explanation.match(RX)
    if (!m || !MON[m[7]]) continue
    seen.add(fact)
    const [, home, hs, as, away, comp, d, mon, y] = m
    const us = home.includes(c.name) ? 'h' : away.includes(c.name) ? 'a' : null
    const H = +hs, A = +as
    events.push({club: c.id, name: c.name, y: +y, m: MON[mon], d: +d, fact,
      text: `${home} ${hs}-${as} ${away}${comp ? ` (${comp})` : ''}`,
      derby: has(q, 'derby') || q.topic === 'derby', final: has(q, 'final'), europe: has(q, 'kind:europe'),
      margin: Math.abs(H - A), goals: H + A, won: us === null ? null : us === 'h' ? H > A : A > H,
      comp: comp || '', opp: us === 'h' ? away : us === 'a' ? home : undefined, home, away, score: `${hs}–${as}`})
  } else if (q.template === 'event-date-check' && q.answer === 'true') {
    const m = q.explanation.match(/^(.+?) — (\d{4})-(\d{2})-(\d{2})\.?$/)
    if (!m || /\d+-\d+/.test(m[1])) continue
    seen.add(fact)
    events.push({club: c.id, name: c.name, y: +m[2], m: +m[3], d: +m[4], fact, text: m[1], derby: false, final: false, europe: false, margin: 0, goals: 0, won: null})
  }
}

// deterministic choice: a stable hash of the day and the slot — the same plan every time it is built
const h = (s: string) => { let x = 2166136261; for (const ch of s) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0; return x }
const weight = (e: Ev) => (e.derby && e.won ? 50 : 0) + (e.final ? 40 : 0) + (e.europe ? 20 : 0) + (e.won ? e.margin * 4 : 0) + (e.margin === 0 && e.goals === 0 ? 0 : 0) + (2026 - e.y) / 10

// a row line that fits the ticket: the full result, or — for long names — the score from the club's side and the opponent
function shortLine(e: Ev) {
  if (!e.home) return e.text.length <= 42 ? e.text : e.text.slice(0, 39).replace(/\s+\S*$/, '') + '...'
  const full = `${e.home} ${e.score} ${e.away}`
  if (full.length <= 38 || !e.opp) return full
  const [a, b] = e.score!.split('–'), home = e.home.includes(e.name)
  return `${home ? a : b}–${home ? b : a} ${home ? 'v' : 'at'} ${e.opp}`
}
function onThisDay(y: number, m: number, d: number): Item {
  const pick = (list: Ev[]) => {
    const per = new Map<string, Ev>()
    for (const e of list.sort((a, b) => weight(b) - weight(a) || a.fact.localeCompare(b.fact))) if (!per.has(e.club)) per.set(e.club, e)
    return [...per.values()].slice(0, 5).sort((a, b) => a.y - b.y)
  }
  let rows = pick(events.filter(e => e.m === m && e.d === d && e.y < y))
  let exact = true
  if (rows.length < 2) {
    exact = false
    const t = Date.UTC(2001, m - 1, d)
    rows = pick(events.filter(e => e.y < y && Math.abs(Date.UTC(2001, e.m - 1, e.d) - t) <= 3 * 864e5))
  }
  if (rows.length < 2) throw Error('no on-this-day rows')
  const line = (e: Ev) => exact ? `${e.y} · ${e.name}: ${e.text} — ${y - e.y} years ago` : `${e.d} ${MONTH[e.m]} ${e.y} · ${e.name}: ${e.text}`
  const big = rows.find(r => r.derby) || rows.find(r => r.final) || rows.find(r => r.europe)
  return {app: 'fanlife', label: 'On this day', tags: smartTags({clubs: rows.map(r => r.club), topics: ['otd', ...(big?.derby ? ['derby' as Topic] : big?.europe ? ['europe' as Topic] : [])]}),
    hook: exact ? pickOf([`On this day: ${rows.length} clubs, ${rows.length} nights nobody forgets. 🗓`, `On this day, ${d} ${MONTH[m]}. Which of these were you at?`, `On this day: ${rows.length} clubs, one date in the archive. 🗓`], `otd${m}.${d}`) : `This week in history — ${rows.length} clubs, one week. 🗓`,
    body: `${rows.map(line).join('\n')}\n\nWhich one were you at? Comment the year 👇\nEvery club here has its whole archive on FAN LIFE (link in bio).`,
    visual: `T9-OTD On this day: ${rows.length} clubs as ticket stubs, crests from the shared library.`,
    kit: {t: 'T9-OTD', data: {date: `${d} ${MONTH[m].slice(0, 3).toUpperCase()}`, exact, footerLabel: 'FROM THE FAN LIFE ARCHIVE',
      rows: rows.map(e => ({year: e.y, club: e.name, crestName: e.name, line: shortLine(e),
        ago: (exact ? `${y - e.y} YEARS AGO` : `${e.d} ${MONTH[e.m].slice(0, 3).toUpperCase()} ${e.y}`) + (e.comp ? ` · ${e.comp.toUpperCase()}` : '')}))}}}
}

// a question whose prompt already holds its answer ("… in the Premiership 2018/19. Which campaign?") is not asked
const fair = (q: Q) => typeof q.answer === "string" && !q.prompt.toLowerCase().includes(q.answer.toLowerCase()) && modern(q.prompt, q.answer, q.explanation)
const qPick = (filter: (q: Q, c: Club) => boolean, seed: string, used: Set<string>, clubOrder: string[]) => {
  for (const cid of clubOrder) {
    const c = clubs.find(x => x.id === cid)!
    const list = c.qs.filter(q => !used.has(q.id) && fair(q) && filter(q, c))
    if (!list.length) continue
    const q = list[h(seed + cid) % list.length]
    used.add(q.id)
    return {q, c}
  }
  return null
}
const optionsFor = (q: Q, c: Club, seed: string) => {
  // an opponent question draws its decoys from the same club's opponents in the same competition and era,
  // so the right answer cannot be spotted as the only club from that league
  const ev = q.template === 'fl-match-opponent' ? events.find(e => e.fact === q.factIds?.[0]) : undefined
  const near = ev ? [...new Set(events.filter(e => e.club === c.id && e.comp === ev.comp && Math.abs(e.y - ev.y) <= 8 && e.opp).map(e => e.opp!))] : []
  const pool = near.length >= 4 ? near : (q.pool && c.pools[q.pool]) || []
  const words = (s: string) => s.split(/\s+/).length
  const shape = (x: string) => !x.includes(',') && Math.abs(words(x) - words(q.answer)) <= (words(q.answer) > 2 ? 1 : 0)
  const wrong = pool.filter(x => x !== q.answer && latin(x) && shape(x))
  const pickd: string[] = []
  for (let i = 0; pickd.length < 3 && i < wrong.length * 3 && wrong.length; i++) { const w = wrong[h(seed + i) % wrong.length]; if (!pickd.includes(w)) pickd.push(w) }
  if (pickd.length < 3 || !modern(...pickd)) return null
  const opts = [...pickd, q.answer].sort((a, b) => h(seed + a) - h(seed + b))
  return opts
}
const wrapLines = (t: string, max: number) => {
  const out: string[] = []; let line = ''
  for (const w of t.split(' ')) { if (line && (line + ' ' + w).length > Math.ceil(t.length / max) + 6) { out.push(line); line = w } else line = line ? line + ' ' + w : w }
  if (line) out.push(line)
  return out.length <= max ? out : [t]
}
const L = (q: Q) => Number(q.facets?.find(f => f.startsWith('level:'))?.slice(6) || 0)
const MC = (q: Q) => q.type === 'mcq' || q.type === 'year'
const used = new Set<string>()

function nerds(n: number): Item {
  const order = [...clubs.map(c => c.id)].sort((a, b) => h(`n${n}${a}`) - h(`n${n}${b}`))
  let got: {q: Q; c: Club} | null = null, opts: string[] | null = null
  for (let t = 0; t < 30 && !opts; t++) {
    got = qPick(q => L(q) >= (t < 15 ? 4 : 3) && MC(q) && !/derby/i.test(q.prompt) && (t >= 10 || has(q, 'editorial:2026-10-21') || has(q, 'archive-depth')) && q.prompt.length < 130, `nerd${n}.${t}`, used, order)
    if (got) opts = optionsFor(got.q, got.c, `nerd${n}`)
  }
  if (!got || !opts) throw Error('no nerds question for day ' + n)
  const url = `https://fanlife.dubelteam.com/clubs/${got.c.id}/trivia`
  return {app: 'fanlife', url, label: 'Nerds only', tags: smartTags({clubs: [got.c.id], topics: ['nerds']}),
    hook: pickOf([`Nerds only. ${got.c.name} — no Googling. 🤓`, `Only proper ${got.c.name} fans get this one.`, `Expert level. ${got.c.name}. Ten seconds. Go.`, `${got.c.name} fans: this one splits the terrace.`], `nh${n}`),
    body: `${got.q.prompt}\n\n${opts!.map((o, i) => `${'ABCD'[i]}) ${o}`).join('\n')}\n\nComment A, B, C or D 👇 The answer is in the comments.`,
    comment: `✅ ${got.q.answer}. ${got.q.explanation}\n\nThousands more like this, Expert level: ${url}`,
    visual: 'T10-NERDS Nerds only: the question and four answers, the club crest.',
    kit: {t: 'T10-NERDS', data: {club: {id: got.c.id, name: got.c.name}, crestName: got.c.name, question: got.q.prompt, options: opts, level: 'EXPERT'}}}
}
function quiz(n: number): Item {
  const order = [...clubs.map(c => c.id)].sort((a, b) => h(`q${n}${a}`) - h(`q${n}${b}`))
  for (let tries = 0; tries < 20; tries++) {
    const got = qPick(q => (L(q) === 2 || L(q) === 3) && q.type === 'mcq' && !/derby/i.test(q.prompt) && q.prompt.length < 120, `quiz${n}.${tries}`, used, order)
    if (!got) break
    const opts = optionsFor(got.q, got.c, `quiz${n}`)
    if (!opts || opts.some(o => o.length > 24)) continue
    const url = `https://fanlife.dubelteam.com/clubs/${got.c.id}/trivia`
    return {app: 'fanlife', url, label: 'Story quiz', tags: smartTags({clubs: [got.c.id], topics: ['quiz'], max: 4}),
      how: `Story: add the Quiz sticker with these four answers, tick ✅ ${got.q.answer}. Frame 2: paste the second box + a link sticker.`,
      hook: got.q.prompt,
      body: `${opts.map((o, i) => `${'ABCD'[i]}) ${o}`).join('\n')}\n✅ ${got.q.answer}`,
      comment_label: 'Frame 2', comment: `${got.q.explanation}\n\nMore ${got.c.name} questions on FAN LIFE 👆`,
      visual: 'T5-B Story quiz: the question, the four answers, the IG quiz sticker in the empty frame.',
      kit: {t: 'T5-B', data: {club: got.c.id, hook: wrapLines(got.q.prompt, 3), options: opts}}}
  }
  throw Error('no quiz for day ' + n)
}
const spicyUsed = new Set<string>()
function spicy(n: number): Item {
  const kinds = ['derby', 'rout', 'final', 'kit', 'goalfest'] as const
  const kind = kinds[n % kinds.length]
  const order = [...clubs.map(c => c.id)].sort((a, b) => h(`s${n}${a}`) - h(`s${n}${b}`))
  if (kind === 'kit') {
    const got = qPick(q => q.template === 'fl-kit-sponsor', `kit${n}`, used, order)
    // the picture shows the shirt, sponsor and all — so the question is the SEASON, and the season stays off the picture
    const sm = got?.q.prompt.match(/^From the shirt rail: (.+?), (\d{4}\/\d{2}), (\w+)\./)
    if (got && sm) return {app: 'fanlife', url: `https://fanlife.dubelteam.com/clubs/${got.c.id}`, label: 'Shirt quiz', tags: smartTags({clubs: [got.c.id], topics: ['shirt']}),
      hook: pickOf([`Name the season. ${sm[1]}, ${sm[3]} shirt. 👕`, `Shirt collectors: which season is this ${sm[1]} ${sm[3]}?`, `Still got this one in the wardrobe? Which season?`], `sq${n}`),
      body: `${sm[1]} · ${sm[3]} shirt · sponsor: ${got.q.answer}\n\nComment the season 👇 Answer in the comments.`,
      comment: `✅ ${sm[2]}. ${got.q.explanation}\n\nEvery shirt, every season — the kit archive is on FAN LIFE.`,
      visual: 'T11-SPICY with the archive shirt, the season hidden.',
      kit: {t: 'T11-SPICY', data: {club: {id: got.c.id, name: got.c.name}, shirtFor: {club: got.c.id, text: got.q.prompt}, home: `${sm[1]} · ${sm[3]} shirt`.toUpperCase(), sponsor: 'Which season? Answer in the comments.', boxTitle: 'SHIRT QUIZ', date: 'THE SHIRT ARCHIVE · NAME THE SEASON', sticker: 'yours', line: 'Which season? Answer in the comments.'}}}
  }
  for (const cid of order) {
    const pool = events.filter(e => e.club === cid && !spicyUsed.has(e.fact) && e.won === true &&
      (kind === 'derby' ? e.derby && e.margin >= 2 : kind === 'rout' ? e.margin >= 6 : kind === 'final' ? e.final : e.goals >= 8))
    if (!pool.length) continue
    pool.sort((a, b) => (kind === 'goalfest' ? b.goals - a.goals : b.margin - a.margin) || a.fact.localeCompare(b.fact))
    const e = pool[h(`sp${n}`) % Math.min(pool.length, 6)]
    spicyUsed.add(e.fact)
    const when = `${e.d} ${MONTH[e.m]} ${e.y}`
    const hook = kind === 'derby' ? `Derby memory ${e.name} fans never let the neighbours forget.`
      : kind === 'rout' ? `${e.margin} goals clear. ${e.name} were not in the mood to be polite.`
      : kind === 'final' ? `Final. ${e.name}. Some days the archive just glows.`
      : `${e.goals} goals in one afternoon. ${e.name} supporters went home hoarse.`
    return {app: 'fanlife', url: `https://fanlife.dubelteam.com/clubs/${e.club}`, label: 'Spicy',
      tags: smartTags({clubs: [e.club], topics: [kind === 'derby' ? 'derby' : kind === 'final' ? 'final' : 'goals', ...(e.europe ? ['europe' as Topic] : [])]}),
      hook, body: `${when}: ${e.text}.\n\nWere you there — or is it a story your dad still tells? 👇\nThe whole archive, match by match, is on FAN LIFE (link in bio).`,
      visual: 'T11-SPICY: the score on split-flap tiles, both crests, the date on a ticket stub.',
      kit: {t: 'T11-SPICY', data: {club: {id: e.club, name: e.name}, home: (e.home || '').toUpperCase(), away: (e.away || '').toUpperCase(), score: e.score, homeCrestName: e.home, awayCrestName: e.away,
        date: `${when.toUpperCase()}${e.comp ? ' · ' + e.comp.toUpperCase() : ''}`,
        moment: kind === 'derby' ? 'moment-derby' : kind === 'final' ? 'moment-final' : e.europe ? 'moment-away' : 'moment-goal',
        sticker: kind === 'derby' ? 'derby' : kind === 'goalfest' ? 'goal' : 'wow',
        line: kind === 'derby' ? 'A derby they still talk about.' : kind === 'rout' ? `${e.margin} goals clear.` : kind === 'final' ? 'A final to frame.' : `${e.goals} goals in one afternoon.`}}}
  }
  return nerds(100 + n)
}

// ── did you know: one sourced line from the archive (heritage, goals, finishes, honours, shirts) ──────────────────────
const FACT_TEMPLATES = ['fl-heritage-name', 'fl-heritage-origin', 'fl-heritage-connection', 'fl-heritage-crest', 'fl-heritage-ground', 'fl-goal-finisher', 'fl-season-finish', 'fl-honour-season', 'fl-match-scorer', 'fl-kit-sponsor']
const factUsed = new Set<string>(), factTpl: Record<string, number> = {}, factClub: Record<string, number> = {}
function fact(n: number): Item {
  const order = [...clubs.map(c => c.id)].sort((a, b) => (factClub[a] ?? 0) - (factClub[b] ?? 0) || h(`f${n}${a}`) - h(`f${n}${b}`))
  for (const cid of order) for (const tpl of [...FACT_TEMPLATES].sort((a, b) => (factTpl[a] ?? 0) - (factTpl[b] ?? 0) || h(`ft${n}${a}`) - h(`ft${n}${b}`))) {
    const c = clubs.find(x => x.id === cid)!
    const list = c.qs.filter(q => q.template === tpl && !factUsed.has(q.explanation) && modern(q.prompt, q.answer, q.explanation) && q.explanation.length >= 40 && q.explanation.length <= 170 && /\b(19[89]\d|20\d\d)\b/.test(q.explanation)
      && (tpl !== 'fl-match-scorer' || has(q, 'final')))
    if (!list.length) continue
    const q = list[h(`fact${n}${cid}`) % list.length]
    factUsed.add(q.explanation); factTpl[tpl] = (factTpl[tpl] ?? 0) + 1; factClub[cid] = (factClub[cid] ?? 0) + 1
    const text = q.explanation.replace(/\s+/g, ' ').trim()
    return {app: 'fanlife', url: `https://fanlife.dubelteam.com/clubs/${c.id}`, label: 'Did you know', tags: smartTags({clubs: [c.id], topics: [tpl === 'fl-kit-sponsor' ? 'shirt' : 'fact']}),
      hook: pickOf([`Did you know? ${c.name} edition. 💡`, `Save this for your next pub quiz: ${c.name}.`, `${c.name} fans — who knew this one?`, `One for the ${c.name} archive nerds.`], `fh${n}`),
      body: `${text}\n\nTag a ${c.name} fan who didn't know this 👇\nThousands more, match by match, on FAN LIFE (link in bio).`,
      visual: 'L-FACT Did you know: the fact, the club crest.',
      kit: {t: 'L-FACT', data: {club: {id: c.id, name: c.name}, crestName: c.name, fact: text, kicker: `${c.name.toUpperCase()} · FROM THE ARCHIVE`, label: 'FAN LIFE · DID YOU KNOW'}}}
  }
  throw Error('no fact for ' + n)
}


// ── v4 engagement: Guess the score (17:30) and Guess the year (22:30) — the answer only in the first comment ─────────
const guessUsed = new Set<string>(), matchKey = (e: Ev) => `${e.y}-${e.m}-${e.d}-${e.home}-${e.away}`
function guessScore(n: number): Item {
  const order = [...clubs.map(c => c.id)].sort((a, b) => h(`g${n}${a}`) - h(`g${n}${b}`))
  for (const cid of order) {
    const pool = events.filter(e => e.club === cid && e.home && e.score && !guessUsed.has(matchKey(e)) && !spicyUsed.has(e.fact) && (e.derby || e.final || e.europe || e.margin >= 3) && e.goals <= 9)
    if (!pool.length) continue
    pool.sort((a, b) => weight(b) - weight(a) || a.fact.localeCompare(b.fact))
    const e = pool[h(`gs${n}`) % Math.min(pool.length, 10)]!
    guessUsed.add(matchKey(e))
    const when = `${e.d} ${MONTH[e.m]} ${e.y}`
    return {app: 'fanlife', url: `https://fanlife.dubelteam.com/clubs/${e.club}`, label: 'Guess the score',
      tags: smartTags({clubs: [e.club], topics: ['guess', ...(e.derby ? ['derby' as Topic] : e.europe ? ['europe' as Topic] : e.final ? ['final' as Topic] : [])]}),
      hook: pickOf([`Guess the score. ${e.home} v ${e.away}. ⚽`, `${e.home} v ${e.away}, ${e.y}. What was the score?`, `Proper ${e.name} fans know this score by heart.`], `gh${n}`),
      body: `${when}${e.comp ? ` · ${e.comp}` : ''}\n${e.home} ?–? ${e.away}\n\nComment your guess 👇 Exact score = bragging rights. Answer in the comments.`,
      comment: `✅ It finished ${e.home} ${e.score} ${e.away} — ${when}.\n\nThe whole ${e.name} archive, match by match, on FAN LIFE.`,
      visual: 'T11-SPICY Guess the score: both crests, the score hidden.',
      kit: {t: 'T11-SPICY', data: {club: {id: e.club, name: e.name}, home: e.home!.toUpperCase(), away: e.away!.toUpperCase(), score: '?–?', homeCrestName: e.home, awayCrestName: e.away,
        date: `${when.toUpperCase()}${e.comp ? ' · ' + e.comp.toUpperCase() : ''}`, shout: 'GUESS!', boxTitle: 'GUESS THE SCORE', moment: pickOf(['moment-radio', 'moment-kid', 'moment-goal'], `gm${n}`), line: 'Comment your guess. Answer in the comments.'}}}
  }
  return nerds(300 + n)
}
function guessYear(n: number): Item {
  const order = [...clubs.map(c => c.id)].sort((a, b) => (factClub[a] ?? 0) - (factClub[b] ?? 0) || h(`y${n}${a}`) - h(`y${n}${b}`))
  for (const cid of order) {
    const c = clubs.find(x => x.id === cid)!
    const list = c.qs.filter(q => FACT_TEMPLATES.includes(q.template) && !factUsed.has(q.explanation) && modern(q.prompt, q.answer, q.explanation)
      && q.explanation.length >= 40 && q.explanation.length <= 160 && (q.explanation.match(/\b(19[89]\d|20[0-2]\d)\b/g) || []).length === 1 && !/\d{4}\/\d{2}/.test(q.explanation))
    if (!list.length) continue
    const q = list[h(`year${n}${cid}`) % list.length]!
    factUsed.add(q.explanation); factClub[cid] = (factClub[cid] ?? 0) + 1
    const text = eraNames(q.explanation.replace(/\s+/g, ' ').trim()), year = text.match(/\b(19[89]\d|20[0-2]\d)\b/)![1]!
    const blank = text.replace(year, '____')
    return {app: 'fanlife', url: `https://fanlife.dubelteam.com/clubs/${c.id}`, label: 'Guess the year',
      tags: smartTags({clubs: [c.id], topics: ['year']}),
      hook: pickOf([`Guess the year. ${c.name} fans only. 🗓`, `Fill the gap — what year was it?`, `${c.name} fans: name the year without Googling.`], `yh${n}`),
      body: `${blank}\n\nComment the year 👇 Answer in the comments.`,
      comment: `✅ ${year}. ${text}\n\nThousands more from the ${c.name} archive on FAN LIFE.`,
      visual: 'L-FACT Guess the year: the line with the year blanked, the club crest.',
      kit: {t: 'L-FACT', data: {club: {id: c.id, name: c.name}, crestName: c.name, fact: blank, kicker: `${c.name.toUpperCase()} · GUESS THE YEAR`, label: 'FAN LIFE · COMMENT THE YEAR', shout: 'WHAT YEAR?'}}}
  }
  return fact(700 + n)
}

// ── FAN LIFE gates (10:00) — one gate of the app, with the club it opens on ─────────────────────────────────────────
type Gate = {key: string; gate: string; name: string; plate: string; headline: string; body: [string, string]; hook: string; post: string}
const GATES: Gate[] = [
  {key: 'trivia', gate: 'GATE 2', name: 'TRIVIA WING', plate: 'memo', headline: 'Four levels. One club. The real archive.', body: ['Easy, Medium, Hard, Expert.', 'Every question comes from the club’s own records.'],
    hook: 'How well do you really know {club}?', post: 'The Trivia wing: four levels, from Easy to Expert. Every question is built from the club’s own sourced archive — no guessing, only facts.'},
  {key: 'blind-cow', gate: 'GATE 10', name: 'BLIND COW', plate: 'keeper', headline: 'Clue after clue. Name the player.', body: ['A season, a shirt number, a match he played.', 'The fewer clues you need, the better.'],
    hook: 'Blind Cow: who is the {club} player?', post: 'Clue after clue — season, number, a match — name the player as fast as you can. Every clue comes from the archive.'},
  {key: 'goal', gate: 'GATE 8', name: 'GOAL RECONSTRUCTION', plate: 'kicker', headline: 'Rebuild a famous goal, touch by touch.', body: ['Drag the players, pass, shoot.', 'Then see how it really went in.'],
    hook: 'Some {club} goals stay forever. Rebuild one.', post: 'Gate 8: rebuild a historic goal touch by touch — drag the players, pass, shoot. Then watch the original move.'},
  {key: 'xi', gate: 'GATE 1', name: 'ALL-TIME XI', plate: 'swap', headline: 'Eleven from the whole history. Your call.', body: ['Pick the greatest eleven, any era.', 'No ratings, no referee. Just you.'],
    hook: 'Your all-time {club} XI. Go.', post: 'Gate 1: eleven players from the club’s whole history. Build it, share it, and let the comments do the arguing.'},
  {key: 'lineup', gate: 'GATE 3', name: 'HISTORICAL LINE-UP', plate: 'fans', headline: 'Name the eleven that started that night.', body: ['A real match, a real team sheet.', 'How many can you place?'],
    hook: 'One {club} night. Eleven names. Can you place them?', post: 'Gate 3: a real match from the archive and its real starting eleven. Fill the team sheet, place by place.'},
  {key: 'kit-builder', gate: 'GATE 4', name: 'KIT BUILDER', plate: 'scarf', headline: 'Build the shirt. Season, maker, sponsor.', body: ['Five parts, one shirt, one season.', 'Can you dress the team of that year?'],
    hook: 'Can you build the {club} shirt of that season?', post: 'Gate 4: the shirt in parts — body, sleeves, sponsor, maker, crest. Put the season back together.'},
  {key: 'memory', gate: 'GATE 6', name: 'MEMORY', plate: 'memo', headline: 'Turn two cards. Match the facts.', body: ['Pairs drawn from the club’s real archive.', 'Fewer turns, sharper memory.'],
    hook: 'A memory game made of {club} history.', post: 'Gate 6: every pair on the board is a sourced fact from the club’s archive. Turn two, match them, clear the board.'},
  {key: 'polls', gate: 'GATE 7', name: 'TERRACE VOTE', plate: 'fans', headline: 'Best keeper? Greatest night? You decide.', body: ['Vote with the terrace on the big debates.', 'One device, one ballot.'],
    hook: 'The {club} terrace is voting. Where do you stand?', post: 'Gate 7: the big supporters’ debates, put to a vote. One device, one ballot — the terrace decides.'},
  {key: 'timeline', gate: 'GATE 13', name: 'TIMELINE', plate: 'bootball', headline: 'Put the club’s big days in order.', body: ['Drop each card into its place in history.', 'How well do you know the years?'],
    hook: 'Put {club}’s big days in the right order.', post: 'Gate 13: the club’s dates as cards. Place each one on the line — the archive checks every answer.'},
  {key: 'derby', gate: 'GATE 11', name: 'THE DERBY', plate: 'scarf', headline: 'Every meeting with the old rival, on one wall.', body: ['Wins, draws and the nights nobody forgets.', 'Know your derby better than they do.'],
    hook: 'The {club} derby, every meeting on one wall.', post: 'Gate 11: the rivalry as the archive records it — every meeting, every result, all in one place.'},
  {key: 'archive', gate: 'GATE 12', name: 'LIVING ARCHIVE', plate: 'memo', headline: 'Matches, players, shirts. All of it.', body: ['The club’s history, sourced and searchable.', 'Mark the matches you were at.'],
    hook: 'Were you there? The {club} archive remembers.', post: 'Gate 12: the living archive — matches, players and shirts, every record sourced. Stamp “I was there” on the nights you saw.'},
  {key: 'kits', gate: 'GATE 5', name: 'SHIRT COLLECTION', plate: 'swap', headline: 'The club’s shirts, season by season.', body: ['Home, away, third — the whole rail.', 'Which one is still in your wardrobe?'],
    hook: 'Which {club} shirt is still in your wardrobe?', post: 'Gate 5: the shirt rail — the club’s kits, season by season, drawn from the records.'},
  {key: 'life', gate: 'A SUPPORTER’S LIFE', name: 'LIFE', plate: 'fans', headline: 'Grow up with your club, one match at a time.', body: ['Matchdays, friends, promises, choices.', 'Every choice changes the story.'],
    hook: 'A whole life as a {club} supporter. Start with the first match.', post: 'LIFE is a supporter’s life simulation inside FAN LIFE: the first match, the friends, the promises. Every choice changes the story.'},
]
function gate(n: number): Item {
  const g = GATES[(n - 1) % GATES.length]!
  const c = clubs[(n * 3 + Math.floor((n - 1) / GATES.length)) % clubs.length]!
  const fill = (s: string) => s.replace('{club}', c.name)
  return {app: 'fanlife', url: `https://fanlife.dubelteam.com/clubs/${c.id}/${g.key}`, hook: fill(g.hook), label: `Gate · ${g.name.charAt(0)}${g.name.slice(1).toLowerCase()}`,
    tags: smartTags({clubs: [c.id], topics: [g.key === 'kits' || g.key === 'kit-builder' ? 'shirt' : g.key === 'derby' ? 'derby' : g.key === 'trivia' || g.key === 'memory' ? 'quiz' : 'gate']}),
    body: `${g.post}\n\nFree, on the ${c.name} page — link in bio. Tell us your score 👇`,
    visual: `L-GATE ${g.name}: the gate's name, a comic plate, the club.`,
    kit: {t: 'L-GATE', data: {club: {id: c.id, name: c.name}, crestName: c.name, gate: g.gate, name: g.name, plate: g.plate, headline: g.headline, body: g.body, label: `${c.name.toUpperCase()} · ${g.gate}`}}}
}

// ── 18:00: the two big games of FAN LIFE, on alternate days ──────────────────────────────────────────────────────────
type Pitch = {headline: string; body: [string, string]; hook: string; post: string}
const RUMBLE: Pitch[] = [
  {headline: 'Three names. One pick. Build the eleven.', body: ['Choose a line — the reels deal three players.', 'The big name, the middle price, or a bargain?'],
    hook: 'Royal Rumble: three players, one pick, your eleven.', post: 'Choose the line you want to fill, the reels deal three men from three price tiers, you sign one. Again and again, until the eleven is done.'},
  {headline: 'Every legend has a price. The budget won’t stretch.', body: ['An eleven on €33–35M, a five on €15M.', 'Spend on the stars, then fill the gaps smart.'],
    hook: 'The budget is hard. The legends are expensive.', post: 'Royal Rumble gives you a hard budget — around €33–35M for an eleven, €15M for five-a-side. Every man in the club’s archive has his price.'},
  {headline: 'Three spins per draft. Use them well.', body: ['Don’t like the trio? Spin again.', 'Three spins have to last the whole draft.'],
    hook: 'Three spins. Twenty decisions. One eleven.', post: 'Don’t like the three men on the reels? Spin. But you get three spins for the whole draft — choose your moment.'},
  {headline: 'Five-a-side or a full eleven?', body: ['Two formats, one archive of your club.', 'Any man in the club’s history can be dealt.'],
    hook: 'Five-a-side or the full eleven — which suits you?', post: 'Two formats in Royal Rumble: five-a-side for a quick draft, the full eleven for the long one. Every player in the archive is in the deck.'},
  {headline: 'Your eleven against your mate’s.', body: ['Send the link — he drafts the same deal.', 'Then the result settles it.'],
    hook: 'Send the link. Same deal. Better eleven wins.', post: 'Draft your eleven, then send the link: your mate gets the same deal and builds his. The match settles it.'},
  {headline: 'Keeper first, or the striker? You choose.', body: ['Pick which line to fill before every slot.', 'The game only stops a squad that can’t be finished.'],
    hook: 'Keeper first or striker first? Royal Rumble lets you choose.', post: 'Before every pick you choose the line — goalkeeper, defence, midfield or attack. Plan the budget, keep the squad possible.'},
]
const LEGENDS: Pitch[] = [
  {headline: 'Manage your club’s legends through a season.', body: ['Draft from your club’s own history.', 'Then take them through a whole league.'],
    hook: 'Legends Manager: your club’s greatest men, one season.', post: 'Draft a squad from your club’s own legends, then manage them through a full league season against the other clubs’ legends.'},
  {headline: 'Watch it live. Change it at half-time.', body: ['The match stops at 45, 60 and 75 minutes.', 'Your subs, your shape, your season.'],
    hook: 'Watch the match live. Change it at half-time.', post: 'In Legends Manager the match plays live and stops at 45, 60 and 75 minutes — your changes, your decisions, then the whistle.'},
  {headline: 'Who wears the armband?', body: ['Pick a captain — he lifts the side.', 'Stars tell you who’s who. Numbers stay hidden.'],
    hook: 'Who wears the armband in your legends XI?', post: 'Name your captain and your vice-captain. Players are shown in stars, not numbers — trust your football, not a spreadsheet.'},
  {headline: 'The board sets the budget. Spend it right.', body: ['Season tickets and the board fund the squad.', 'Windows after round 2 and at halfway.'],
    hook: 'The board gave you a budget. Don’t waste it.', post: 'Season tickets and the board set your money. Transfer windows open after round 2 and again at halfway — build, sell, rebuild.'},
  {headline: 'Know the other legends before you face them.', body: ['Every rival club plays with its own history.', 'Scout their squads, their stars, their last XI.'],
    hook: 'Scout the other legends before kick-off.', post: 'Every club in the league plays with its own history. Open their squads, see their stars and their last eleven, then pick yours.'},
  {headline: 'Challenge a friend to a friendly.', body: ['Send the link — your eleven against his.', 'One match. Played once.'],
    hook: 'Your legends against your mate’s. One friendly.', post: 'Send a friendly link from your career: your eleven against his, played once by the match engine. No excuses afterwards.'},
]
function bigGame(n: number): Item {
  const lm = n % 2 === 1, list = lm ? LEGENDS : RUMBLE, p = list[Math.floor((n - 1) / 2) % list.length]!
  const c = clubs[(n * 5) % clubs.length]!
  return {app: 'fanlife', url: lm ? 'https://fanlife.dubelteam.com/all-football/legends' : `https://fanlife.dubelteam.com/clubs/${c.id}/royal-rumble`, hook: p.hook,
    label: lm ? 'Legends Manager' : 'Royal Rumble', tags: smartTags({clubs: lm ? [] : [c.id], topics: [lm ? 'legends' : 'rumble']}),
    body: `${p.post}\n\n${lm ? 'Legends Manager — free on FAN LIFE. Pick your club and kick off (link in bio).' : `Royal Rumble is gate 9 on every club page — try it with ${c.name} (link in bio).`}\nShow us your eleven 👇`,
    visual: `L-GATE ${lm ? 'LEGENDS MANAGER' : 'ROYAL RUMBLE'}: the game's name, a comic plate.`,
    kit: {t: 'L-GATE', data: {...(lm ? {brand: 'legends'} : {club: {id: c.id, name: c.name}, crestName: c.name}), gate: lm ? 'FAN LIFE · THE BIG GAME' : 'GATE 9', name: lm ? 'LEGENDS MANAGER' : 'ROYAL RUMBLE', plate: lm ? 'dribbler' : 'bootball', shout: lm ? 'KICK OFF!' : 'SPIN!', headline: p.headline, body: p.body,
      label: lm ? 'LEGENDS MANAGER · FAN LIFE' : `${c.name.toUpperCase()} · GATE 9`}}}
}

// ── DUBID and OFFSIDES, in their own branding: how the game works (12:00, fixed weekdays) ─────────────────────────────
type System = {title: [string, string]; sub: string; points: [string, string][]; line: string; hook: string; post: string}
const DUBID: System[] = [
  {title: ['ONE FROM', 'EVERY CLUB'], sub: 'THE ONLY RULE THAT MATTERS', points: [['One player per club', 'Even from the club you can’t stand.'], ['Pick a captain', 'His points are multiplied. Choose well.'], ['Beat the lock', 'Lineups lock at the round’s first kick-off.']],
    line: 'FANTASY, NEIGHBOURHOOD STYLE.', hook: 'One player from every club. That’s the whole rule.', post: 'DUBID is round-by-round fantasy football with one rule: one player from each club. Pick a captain, lock in before the first kick-off, climb the table.'},
  {title: ['DUBID 5', 'OR DUBID 11'], sub: 'TWO WAYS TO PLAY EVERY ROUND', points: [['DUBID 5 · The Street', 'Five players, one budget. Pick 5, beat everyone.'], ['DUBID 11 · The League', 'A full lineup, one player from every club.'], ['Every round, a new table', 'Play one, or play both.']],
    line: 'PICK 5. OR BUILD 11.', hook: 'Five players or a full eleven? DUBID has both.', post: 'DUBID 5: five players and a budget. DUBID 11: a full lineup with one player from every club and a captain. Every round, both tables.'},
  {title: ['EACH LEAGUE', 'ITS OWN GAME'], sub: 'ISRAEL · GREECE', points: [['Israeli Premier League', 'Its own rounds, table and history.'], ['Greek Super League', 'Its own rounds, table and history.'], ['Pick your league', 'Then pick your players.']],
    line: 'KNOW THE LEAGUE? PROVE IT.', hook: 'Israel or Greece? In DUBID every league is its own game.', post: 'DUBID runs the Israeli Premier League and the Greek Super League — each with its own rounds, its own table and its own history.'},
  {title: ['YOUR MATES', 'ONE TABLE'], sub: 'PRIVATE LEAGUES', points: [['Make a private league', 'For the group chat, the office, the family.'], ['Everyone picks every round', 'One player from every club, a captain each.'], ['The table settles it', 'Round after round, all season.']],
    line: 'SETTLE IT EVERY ROUND.', hook: 'Make a DUBID league for your mates. Settle it every round.', post: 'Open a private league in DUBID, send it to your friends, and let the table settle who really knows the league.'},
]
const OFFSIDES: System[] = [
  {title: ['YOU CALLED', 'IT. PROVE IT.'], sub: 'PREDICTION ARENAS WITH YOUR MATES', points: [['Open an arena', 'Send the link to the group chat.'], ['Predict before kick-off', 'Exact score, half-time, first scorer.'], ['Flash questions live', 'A few seconds to answer, mid-match.']],
    line: 'FREE. NO REAL MONEY.', hook: 'You always call the score. Now it counts.', post: 'OFFSIDES: open an arena, send the link, and everyone predicts before kick-off — exact score, half-time, first scorer. Flash questions pop up live.'},
  {title: ['90 MINUTES', 'OF TOLD YOU SO'], sub: 'EVERY MATCH IS A GAME', points: [['Classic arena', 'Your calls, locked in before kick-off.'], ['Live arena', 'Questions while the match runs.'], ['The table doesn’t lie', 'Points decide who really knows.']],
    line: 'BRAGGING RIGHTS ONLY.', hook: 'Every match is 90 minutes of “told you so”.', post: 'Two kinds of arena on OFFSIDES: classic, where every call is locked before kick-off, and live, where the questions come during the match.'},
  {title: ['THE STREAK', 'STARTS TODAY'], sub: 'COME BACK EVERY MATCHDAY', points: [['Build a streak', 'Play matchday after matchday.'], ['Points for every call', 'Exact score, half-time, who scores first.'], ['A free simulation', 'No real money. Ever.']],
    line: 'FREE TO PLAY.', hook: 'The streak starts with today’s match.', post: 'OFFSIDES rewards the ones who come back: points for every call and a streak that grows matchday after matchday. A free simulation — no real money.'},
  {title: ['YOUR GROUP', 'CHAT, RANKED'], sub: 'FRIENDS · ARENAS · TABLES', points: [['Invite your mates', 'One link, one arena.'], ['Everyone predicts', 'Calls lock at the first whistle.'], ['One winner', 'The table settles the argument.']],
    line: 'WHO KNOWS FOOTBALL?', hook: 'Your group chat, ranked by who actually knows football.', post: 'Send one link and your group is in the same arena. Everyone predicts, the calls lock at the whistle, and the table settles it.'},
]
const sysCount = {dubid: 0, offsides: 0}
function system(app: 'dubid' | 'offsides'): Item {
  const list = app === 'dubid' ? DUBID : OFFSIDES, s = list[sysCount[app]++ % list.length]!
  return {app, hook: s.hook, label: 'How it works', tags: app === 'dubid' ? '#DUBID #FantasyFootball #FPL #IsraeliFootball #SuperLeagueGreece' : '#OFFSIDES #FootballPredictions #PredictTheScore #MatchDay', body: `${s.post}\n\n${app === 'dubid' ? 'DUBID — free fantasy football. Pick before the lock.' : 'OFFSIDES — a free prediction game. No real money, only bragging rights.'}`,
    visual: `L-${app.toUpperCase()}-SYSTEM How it works, in ${app.toUpperCase()}'s own branding.`,
    kit: {t: `L-${app.toUpperCase()}-SYSTEM`, data: {app, title: s.title, sub: s.sub, points: s.points, line: s.line, label: app === 'dubid' ? 'DUBID · FANTASY FOOTBALL' : 'FREE PREDICTION GAME · NO REAL MONEY'}}}
}

// ── 19:00: one carousel a day for one open club (owner, 27.10.2026) — its history, its gates in FAN LIFE, or plain
//    love for its supporters. Every line from the club's own sourced world file or archive, nothing before 1980. ─────
type World = {voice?: {welcome?: string; kicker?: string}; nicknames?: {text: string}[]; ground?: {name?: string; line?: string}; colours?: {line?: string}; flavour?: {line?: string; text?: string}[]; facts?: {line: string}[]}
const world = (id: string): World => { try { return JSON.parse(readFileSync(path.join(HERE, '../../club-packs', id, 'world.json'), 'utf8')) } catch { return {} } }
const lineOf = (f: {line?: string; text?: string}) => f.line || f.text || ''
type Slide = {t: string; data: Record<string, unknown>}
function carousel(n: number): Item {
  const c = clubs[(n * 5 + 3) % clubs.length]!, w = world(c.id), theme = ['history', 'gates', 'love'][n % 3]!
  const nickFull = w.nicknames?.[0]?.text || c.name, nick = nickFull.replace(/^The /, ''), club = {id: c.id, name: c.name}, base = {club, crestName: c.name}
  const tags = smartTags({clubs: [c.id], topics: [theme === 'love' ? 'love' : theme === 'history' ? 'otd' : 'gate']})
  const slides: Slide[] = []
  let hook = '', body = ''
  if (theme === 'history') {
    const mine = events.filter(e => e.club === c.id && e.home && e.won && e.y >= 1980).sort((a, b) => weight(b) - weight(a) || b.y - a.y)
    const pick: Ev[] = []
    for (const e of mine) if (pick.length < 4 && !pick.some(p => p.y === e.y)) pick.push(e)
    if (pick.length < 3) return carouselGates(n, c, w, tags)
    pick.sort((a, b) => a.y - b.y)
    const of = pick.length + 2
    hook = `${pick.length} nights every ${c.name} fan still talks about. Which one were you at?`
    slides.push({t: 'L-SLIDE', data: {...base, s: 'cover', n: 1, of, kicker: (w.voice?.kicker || c.name).toUpperCase(), title: `${pick.length} nights every ${nick} fan remembers`}})
    pick.forEach((e, i) => slides.push({t: 'L-SLIDE', data: {...base, s: 'night', n: i + 2, of, year: e.y, score: e.score, teams: `${e.home} v ${e.away}`,
      line: `${e.d} ${MONTH[e.m]!.toUpperCase()} ${e.y}${e.comp ? ' · ' + e.comp.toUpperCase() : ''}`, note: e.derby ? 'A DERBY TO REMEMBER.' : e.final ? 'A FINAL TO FRAME.' : e.europe ? 'A EUROPEAN NIGHT.' : e.margin >= 3 ? `${e.margin} GOALS CLEAR.` : 'THE NIGHT IT WENT OUR WAY.', label: `${c.name.toUpperCase()} · FROM THE ARCHIVE`}}))
    slides.push({t: 'L-SLIDE', data: {...base, s: 'cta', n: of, of, title: `Every ${c.name} night, match by match — on FAN LIFE.`}})
    body = `${pick.map(e => `${e.y} · ${e.home} ${e.score} ${e.away}${e.comp ? ` (${e.comp})` : ''}`).join('\n')}\n\nSwipe through, then tell us in the comments: which one were you at — and who were you with?\nThe whole ${c.name} archive, match by match, is on FAN LIFE (link in bio).`
  } else if (theme === 'gates') return carouselGates(n, c, w, tags)
  else {
    const lines = [w.ground?.line, w.colours?.line, ...(w.flavour || []).map(lineOf), ...(w.facts || []).map(f => f.line)].filter((x): x is string => !!x && modern(x))
    if (lines.length < 2) return carouselGates(n, c, w, tags)
    const of = Math.min(lines.length, 3) + 2
    hook = `${w.voice?.welcome || `This one is for the ${c.name} fans.`} A love letter to ${nickFull.replace(/^The /, 'the ')}.`
    slides.push({t: 'L-SLIDE', data: {...base, s: 'cover', n: 1, of, kicker: (w.voice?.kicker || c.name).toUpperCase(), title: w.voice?.welcome || `For the ${c.name} fans.`}})
    const bigs = [w.ground?.name || nickFull, nickFull, (w.nicknames?.[1]?.text || c.name)]
    lines.slice(0, 3).forEach((l, i) => slides.push({t: 'L-SLIDE', data: {...base, s: 'love', n: i + 2, of, big: bigs[i] || c.name, line: l, shout: ['HOME!', 'OURS!', 'FOREVER!'][i], label: `${c.name.toUpperCase()} · FAN LIFE`}}))
    slides.push({t: 'L-SLIDE', data: {...base, s: 'cta', n: of, of, title: `${c.name} has its own home on FAN LIFE. Come in.`}})
    body = `${lines.slice(0, 3).join('\n\n')}\n\nTag the ${c.name} fan who needs to see this. ❤️\nYour club has its own home on FAN LIFE — trivia, the archive, the shirts, a supporter's life (link in bio).`
  }
  return {app: 'fanlife', url: `https://fanlife.dubelteam.com/clubs/${c.id}`, hook, body, tags, label: `Carousel · ${theme}`, visual: `Carousel · ${theme} · ${c.name}: ${slides.length} slides in the club's colours.`, kit: {t: 'L-CAROUSEL', data: {club}, slides} as unknown as Kit}
}
function carouselGates(n: number, c: Club, w: World, tags: string): Item {
  const club = {id: c.id, name: c.name}, base = {club, crestName: c.name}
  const pick = [0, 1, 2, 3].map(i => GATES[(n + i * 3) % GATES.length]!)
  const of = pick.length + 2, slides: Slide[] = []
  slides.push({t: 'L-SLIDE', data: {...base, s: 'cover', n: 1, of, kicker: 'FAN LIFE · YOUR CLUB, YOUR GAMES', title: `4 ways to be ${/^[AEIOU]/.test(c.name) ? 'an' : 'a'} ${c.name} fan today`}})
  for (const g of pick) slides.push({t: 'L-GATE', data: {...base, gate: g.gate, name: g.name, plate: g.plate, headline: g.headline, body: g.body, label: `${c.name.toUpperCase()} · ${g.gate}`}})
  slides.push({t: 'L-SLIDE', data: {...base, s: 'cta', n: of, of, title: `All ${GATES.length} gates are open on the ${c.name} page. Free.`}})
  return {app: 'fanlife', url: `https://fanlife.dubelteam.com/clubs/${c.id}`, tags, label: 'Carousel · gates', hook: `${c.name} fans: 4 games built from your own club's history.`,
    body: `${pick.map(g => `${g.name.charAt(0)}${g.name.slice(1).toLowerCase()} — ${g.headline}`).join('\n')}\n\nWhich one are you starting with? Every question, card and shirt comes from the ${c.name} archive.\nFree on FAN LIFE (link in bio).`,
    visual: `Carousel · gates · ${c.name}: ${slides.length} slides.`, kit: {t: 'L-CAROUSEL', data: {club}, slides} as unknown as Kit}
}

// ── the plan: even hours fixed, odd hours live (composed at send time, or quiet) ─────────────────────────────────────
// The archive files European competitions under their present names; a post says what the competition was called
// in that year (European Cup before 1992/93, UEFA Cup before 2009/10). Same competition, the name of its time.
const YR = /\b(1[89]\d\d|20\d\d)\b/
function eraNames(text: string) {
  return text.split('\n').map(line => {
    const y = Number(line.match(YR)?.[1] || 0)
    if (!y) return line
    let l = line
    if (y < 1992) l = l.replace(/UEFA Champions League/g, 'European Cup')
    if (y < 2009) l = l.replace(/UEFA Europa League/g, 'UEFA Cup')
    return l
  }).join('\n')
}
type Row = {day: number; at: string; format: string; kind: string; main: Item}
const rows: Row[] = []
// v4: 45 days from 29.10.2026, 17 slots a day. Live slots on 09/11/13/15 (composed at send time, or quiet).
export const DAYS = 45
const LIVE: [string, string, string, string][] = [['09:00', 'results', 'fanlife', 'Results'], ['11:00', 'fixtures', 'fanlife', 'Next up'], ['13:00', 'dubid', 'dubid', 'DUBID round'], ['15:00', 'offsides', 'offsides', 'OFFSIDES today']]
const safeOTD = (y: number, m: number, d: number, n: number) => { try { return onThisDay(y, m, d) } catch { return fact(500 + n) } }
for (let n = 1; n <= DAYS; n++) {
  const dt = new Date(Date.UTC(2026, 9, 28 + n))
  const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate(), dow = dt.getUTCDay()
  const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const slot = (t: string, format: string, main: Item, kind = 'fixed') => rows.push({day: n, at: `${date} ${t}`, format, kind, main})
  const otd = safeOTD(y, m, d, n)
  if ((otd.kit.data.rows as unknown[] | undefined)?.length === 1) throw Error('one-row OTD')
  slot('08:00', 'post', otd)
  slot('10:00', 'post', gate(n))
  slot('12:00', 'post', dow === 1 || dow === 4 ? system('dubid') : dow === 2 || dow === 6 ? system('offsides') : fact(n))
  slot('14:00', 'story', quiz(n))
  slot('16:00', 'post', nerds(n))
  slot('17:00', 'post', gate(n + 15)) // launch phase (owner, 27.10.2026): more exposure — a second gate, another club
  slot('17:30', 'post', guessScore(n))
  slot('18:00', 'post', bigGame(n))
  slot('19:00', 'carousel', carousel(n))
  slot('20:00', 'post', spicy(n))
  slot('21:00', 'story', quiz(n + 60)) // a second story quiz, another club
  slot('22:00', 'post', fact(100 + n))
  slot('22:30', 'post', guessYear(n))
  for (const [t, kind, app, label] of LIVE) slot(t, 'post', {app, label, hook: `(${kind}: composed at send time)`, body: '', visual: `live ${kind}`, kit: {t: 'L-CARD', data: {hook: kind}}}, kind)
}
for (const r of rows) if (r.kind === 'fixed' && (!r.main.tags || r.main.tags.split(' ').length > 8)) throw Error(`tags: ${r.at}`)

const eraUpper = (t: string, y: number) => y && y < 1992 ? t.replace(/UEFA CHAMPIONS LEAGUE/g, 'EUROPEAN CUP') : y && y < 2009 ? t.replace(/UEFA EUROPA LEAGUE/g, 'UEFA CUP') : t
const eraDeep = (x: unknown, year = 0): unknown => typeof x === 'string'
  ? eraUpper(eraNames(year && !YR.test(x) ? `${year} ${x}` : x).replace(year && !YR.test(x) ? `${year} ` : '', ''), Number(x.match(YR)?.[1] || year))
  : Array.isArray(x) ? x.map(v => eraDeep(v, year))
  : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, eraDeep(v, Number((x as {year?: number}).year) || year)])) : x
for (const r of rows) { r.main.hook = eraNames(r.main.hook); r.main.body = eraNames(r.main.body); if (r.main.comment) r.main.comment = eraNames(r.main.comment); r.main.kit.data = eraDeep(r.main.kit.data) as Record<string, unknown>; const sl = (r.main.kit as {slides?: Kit[]}).slides; if (sl) for (const k of sl) k.data = eraDeep(k.data) as Record<string, unknown> }
for (const r of rows) if (r.kind === 'fixed' && !modern(r.main.hook, r.main.body, r.main.comment || '', JSON.stringify(r.main.kit))) throw Error(`pre-1980 content in ${r.at}`)
const J = (x: unknown) => `'${JSON.stringify(x).replace(/'/g, "''")}'::jsonb`
const sql = [`-- generated by scripts/marketing/build-plan.mts — do not edit by hand. FAN LIFE plan v4 (owner, 29.10.2026).`,
  `-- 45 days from 29.10.2026, 17 slots a day: the fixed plan (FAN LIFE leads; DUBID and OFFSIDES in their own branding on`,
  `-- fixed weekdays), each post with its picture's kit, its smart tags and — where there is an answer — a first comment.`,
  `-- Live slots 09/11/13/15 are composed at send time from real data, or skipped. Nothing from before 1980.`,
  `-- Every row still waiting and still ahead is replaced; what was already sent is never touched.`,
  `begin;`,
  `delete from marketing.posts where status in ('pending', 'skipped', 'failed') and send_at > now();`,
  `insert into marketing.posts (day, send_at, format, kind, main) values`,
  rows.map(r => `  (${r.day}, (timestamp '${r.at}') at time zone 'Asia/Jerusalem', '${r.format}', '${r.kind}', ${J(r.main)})`).join(',\n'),
  `on conflict (send_at) do nothing;`,
  `-- and a slot inserted for a moment already past is not sent late`,
  `delete from marketing.posts where status = 'pending' and send_at < now() - interval '5 minutes';`,
  `commit;`, ''].join('\n')
writeFileSync(path.join(HERE, '../../supabase/marketing/0008_marketing_plan_v4.sql'), sql)
writeFileSync(path.join(HERE, 'plan-v4.json'), JSON.stringify(rows, null, 1))

/**
 * FAN LIFE social plan v2 (owner, 26.10.2026): a FIXED marketing plan, FAN LIFE as the lead voice, the other apps
 * promoted on a fixed weekday rotation, and four data slots a day drawn from the clubs' own approved archives
 * through the FAN LIFE trivia forge (English, confidence ≥ 2, exact dates — rule 109):
 *   08:00 On this day (several clubs at once) · 16:00 Nerds only · 18:00 Story quiz · 20:00 Spicy.
 * Matches and results are NOT in this plan any more: they are Final Whistle and Today's Football.
 *
 * Writes supabase/marketing/0006_marketing_plan_v2.sql (updates the 30 days in place, by send_at; a post already
 * sent is never touched). Run: node --require ./scripts/master/server-only.cjs --import tsx scripts/marketing/build-plan.mts
 */
import {execSync} from 'node:child_process'
import {writeFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {loadClubBase, CORE_CLUB_IDS} from '../../lib/clubs/resolver'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const pools = JSON.parse(execSync(`python3 -c "import json,sys;sys.path.insert(0,'${HERE}');import content as c;print(json.dumps({k:getattr(c,k) for k in ['CAROUSEL','GAMEDAY','REELS','STORIES','DEEP','MORNING','NIGHT']},ensure_ascii=False))"`).toString())
type Item = {app: string; hook: string; body: string; visual: string; url?: string; format?: string}
const FORMAT: Record<string, string> = {CAROUSEL: 'carousel', REELS: 'reel', STORIES: 'story', NIGHT: 'text'}
const it = (t: string[], k = ''): Item => ({app: t[0] === 'all' ? 'fanlife' : t[0], hook: t[1], body: t[2], visual: t[3], format: FORMAT[k] || 'post'})
const usedCopy = new Set<string>()

// ── the archive, read through the forge ────────────────────────────────────────────────────────────────────────────
type Q = {id: string; template: string; type: string; prompt: string; answer: string; explanation: string; pool?: string; topic?: string; facets?: string[]; factIds?: string[]; source?: {url?: string}}
type Club = {id: string; name: string; qs: Q[]; pools: Record<string, string[]>}
type Ev = {club: string; name: string; y: number; m: number; d: number; text: string; derby: boolean; final: boolean; europe: boolean; margin: number; goals: number; won: boolean | null; fact: string; comp?: string; opp?: string}
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
const NAME = Object.fromEntries(clubs.map(c => [c.id, c.name]))
const has = (q: Q, f: string) => !!q.facets?.includes(f)

const events: Ev[] = []
const seen = new Set<string>()
const RX = /^(.+?) (\d+)-(\d+) (.+?), (?:(.+?), )?(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})\.$/
for (const c of clubs) for (const q of c.qs) {
  const fact = q.factIds?.[0]
  if (!fact || seen.has(fact)) continue
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
      comp: comp || '', opp: us === 'h' ? away : us === 'a' ? home : undefined})
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
  const line = (e: Ev) => exact ? `${e.y} · ${e.name}: ${e.text} — ${y - e.y} years ago` : `${e.d} ${MONTH[e.m]} ${e.y} · ${e.name}: ${e.text}`
  return {app: 'fanlife',
    hook: exact ? `On this day, ${d} ${MONTH[m]} — ${rows.length} clubs, one date.` : `This week in history — ${rows.length} clubs.`,
    body: `${rows.map(line).join('\n')}\n\nWhich one would you have been at? Every one of these clubs has its own archive in FAN LIFE.`,
    visual: `T1 Quote card. "ON THIS DAY" stamp, the ${rows.length} club names stacked as ticket stubs.`}
}

// a question whose prompt already holds its answer ("… in the Premiership 2018/19. Which campaign?") is not asked
const fair = (q: Q) => typeof q.answer === "string" && !q.prompt.toLowerCase().includes(q.answer.toLowerCase())
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
  if (pickd.length < 3) return null
  const opts = [...pickd, q.answer].sort((a, b) => h(seed + a) - h(seed + b))
  return opts
}
const L = (q: Q) => Number(q.facets?.find(f => f.startsWith('level:'))?.slice(6) || 0)
const MC = (q: Q) => q.type === 'mcq' || q.type === 'year'
const used = new Set<string>()

function nerds(n: number): Item {
  const order = [...clubs.map(c => c.id)].sort((a, b) => h(`n${n}${a}`) - h(`n${n}${b}`))
  let got: {q: Q; c: Club} | null = null, opts: string[] | null = null
  for (let t = 0; t < 30 && !opts; t++) {
    got = qPick(q => L(q) === 4 && MC(q) && !/derby/i.test(q.prompt) && (has(q, 'editorial:2026-10-21') || has(q, 'archive-depth')) && q.prompt.length < 170, `nerd${n}.${t}`, used, order)
    if (got) opts = optionsFor(got.q, got.c, `nerd${n}`)
  }
  if (!got || !opts) throw Error('no nerds question for day ' + n)
  return {app: 'fanlife', url: `https://fanlife.dubelteam.com/clubs/${got.c.id}/trivia`,
    hook: `Nerds only. ${got.c.name} — no Googling.`,
    body: `${got.q.prompt}${opts ? '\n\n' + opts.map((o, i) => `${'ABCD'[i]}) ${o}`).join('\n') : ''}\n\nAnswer in the first comment (or the next story frame): ${got.q.answer}. ${got.q.explanation}\n\nThousands more like this — Expert level, ${got.c.name} trivia on FAN LIFE.`,
    visual: 'T2 App feature card. "NERDS ONLY" stamp, the question as the feature.'}
}
function quiz(n: number): Item {
  const order = [...clubs.map(c => c.id)].sort((a, b) => h(`q${n}${a}`) - h(`q${n}${b}`))
  for (let tries = 0; tries < 20; tries++) {
    const got = qPick(q => (L(q) === 2 || L(q) === 3) && q.type === 'mcq' && !/derby/i.test(q.prompt) && q.prompt.length < 120, `quiz${n}.${tries}`, used, order)
    if (!got) break
    const opts = optionsFor(got.q, got.c, `quiz${n}`)
    if (!opts || opts.some(o => o.length > 24)) continue
    return {app: 'fanlife', url: `https://fanlife.dubelteam.com/clubs/${got.c.id}/trivia`,
      hook: got.q.prompt,
      body: `Instagram quiz sticker — four answers:\n${opts.map((o, i) => `${'ABCD'[i]}) ${o}`).join('\n')}\nMark the right one: ${got.q.answer}.\n\nFrame 2: "${got.q.explanation}" + link sticker → ${got.c.name} trivia on FAN LIFE.`,
      visual: 'T5 Story frame. The question on top; the IG quiz sticker goes in the empty frame.'}
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
    if (got) return {app: 'fanlife', url: `https://fanlife.dubelteam.com/clubs/${got.c.id}`,
      hook: `Spicy one for the shirt collectors: who was on the front?`,
      body: `${got.q.prompt.replace(/^From the shirt rail: /, '')}\n\nAnswer: ${got.q.explanation}\n\nEvery shirt, every season — the kit archive and the shirt market are on FAN LIFE.`,
      visual: 'T4 Kit card. A real archive shirt; the sponsor answer in the museum label.'}
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
    return {app: 'fanlife', url: `https://fanlife.dubelteam.com/clubs/${e.club}`,
      hook, body: `${when}: ${e.text}.\n\nWere you there — or is it a story your dad still tells? Tell us in the comments.\nThe whole archive, match by match, is on FAN LIFE.`,
      visual: 'T1 Quote card. Big score as the hook, the date in Courier on a ticket stub.'}
  }
  return nerds(100 + n)
}

// ── the fixed rotation of the other apps (12:00), by weekday in Israel ──────────────────────────────────────────────
const FUCKYOU: Item[] = [
  ['Weekend list ready? Write it before kick-off, not after.', 'FUCK YOU is the list every supporter keeps in his head. The referee, the VAR room, the striker who missed from a metre.\nWrite it. Keep it. Never name a private person.', 'T6 Meme card, FUCK YOU variant: black, torn white letters.'],
  ['Everyone has one name on the list. Only clubs, officials and bad decisions.', 'Your FUCK YOU list, saved for the season. Vent where it belongs — not in the family group chat.', 'T6 Meme card, FUCK YOU variant.'],
  ['The 90th-minute penalty that wasn’t. Add it.', 'Some moments deserve a list. FUCK YOU keeps it for you, season after season.', 'T6 Meme card, FUCK YOU variant, speech bubble.'],
  ['Before the derby: write it down. After the derby: read it out loud.', 'FUCK YOU — the supporter’s venting list. No private people, ever. Clubs, calls, cup draws: fair game.', 'T6 Meme card, FUCK YOU variant.'],
  ['Top 3 on your list this season? Comment. Keep it clean of real people.', 'Make yours on FUCK YOU and share the card.', 'T6 Meme card, FUCK YOU variant.'],
].map(([hook, body, visual]) => ({app: 'fuckyou', hook, body, visual}))
const byApp = (app: string) => (['CAROUSEL', 'GAMEDAY', 'REELS', 'STORIES', 'DEEP', 'MORNING'] as const)
  .flatMap(k => (pools[k] as string[][]).filter(t => t[0] === app).map(t => it(t, k)))
  .filter(x => !/{home}|{away}|odds/i.test(x.hook + x.body))
const PARTNER: Record<number, {app: string; why: string}> = {
  0: {app: 'theworker', why: 'Sunday: Hapoel history day'}, 1: {app: 'dubid', why: 'Monday: the round’s points'},
  2: {app: 'offsides', why: 'Tuesday: European nights'}, 3: {app: 'theworker', why: 'Wednesday: Hapoel archive'},
  4: {app: 'dubid', why: 'Thursday: lock your lineup before the weekend'}, 5: {app: 'fuckyou', why: 'Friday: the weekend list'},
  6: {app: 'offsides', why: 'Saturday: matchday predictions'},
}
const partnerCount: Record<string, number> = {}
function partner(dow: number): Item {
  const {app} = PARTNER[dow]
  const list = app === 'fuckyou' ? FUCKYOU : byApp(app)
  for (let k = 0; k < list.length; k++) {
    const i = partnerCount[app] = (partnerCount[app] ?? -1) + 1
    const x = list[i % list.length]
    if (!usedCopy.has(x.hook) || k === list.length - 1) { usedCopy.add(x.hook); return x }
  }
  return list[0]
}
const fanFirst = (k: string, n: number) => {
  const all = (pools[k] as string[][]).map(t => it(t, k)).filter(x => !/{home}|{away}|odds/i.test(x.hook + x.body))
  const fl = all.filter(x => x.app === 'fanlife'), rest = all.filter(x => x.app !== 'fanlife')
  // FAN LIFE leads: two of every three are FAN LIFE, the third goes to another app
  const x = n % 3 === 2 && rest.length ? rest[Math.floor(n / 3) % rest.length] : fl[(n - Math.floor(n / 3)) % fl.length]
  usedCopy.add(x.hook)
  return x
}

// ── the plan ───────────────────────────────────────────────────────────────────────────────────────────────────────
type Row = {day: number; at: string; format: string; main: Item}
const rows: Row[] = []
for (let n = 1; n <= 30; n++) {
  const dt = new Date(Date.UTC(2026, 9, 25 + n))
  const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate(), dow = dt.getUTCDay()
  const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const slot = (t: string, format: string, main: Item) => rows.push({day: n, at: `${date} ${t}`, format, main})
  const c10 = fanFirst('CAROUSEL', n - 1), r14 = fanFirst('REELS', n - 1), p12 = partner(dow)
  slot('08:00', 'post', onThisDay(y, m, d))
  slot('10:00', 'carousel', c10)
  slot('12:00', p12.format || 'post', p12)
  slot('14:00', 'reel', r14)
  slot('16:00', 'post', nerds(n))
  slot('18:00', 'story', quiz(n))
  slot('20:00', 'post', spicy(n))
  slot('22:00', 'text', fanFirst('NIGHT', n - 1))
}

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
for (const r of rows) { r.main.hook = eraNames(r.main.hook); r.main.body = eraNames(r.main.body) }
const J = (x: unknown) => `'${JSON.stringify(x).replace(/'/g, "''")}'::jsonb`
const sql = [`-- generated by scripts/marketing/build-plan.mts — do not edit by hand. FAN LIFE plan v2 (26.10.2026).`,
  `-- Fixed plan: every row is 'fixed'; matches and results moved to Final Whistle and Today's Football.`,
  `-- Updates by send_at, and only rows still waiting: a post that went out is history.`,
  `insert into marketing.posts (day, send_at, format, kind, main) values`,
  rows.map(r => `  (${r.day}, (timestamp '${r.at}') at time zone 'Asia/Jerusalem', '${r.format}', 'fixed', ${J(r.main)})`).join(',\n'),
  `on conflict (send_at) do update set day = excluded.day, format = excluded.format, kind = 'fixed', main = excluded.main,`,
  `  variants = null, fallback = null, fallback_format = null`,
  `  where marketing.posts.status in ('pending', 'skipped', 'failed') and marketing.posts.send_at > now();`, ''].join('\n')
const out = path.join(HERE, '../../supabase/marketing/0006_marketing_plan_v2.sql')
writeFileSync(out, sql)
writeFileSync(path.join(HERE, 'plan-v2.json'), JSON.stringify(rows, null, 1))
console.log('rows', rows.length, 'events', events.length, 'clubs', clubs.map(c => `${c.id}:${c.qs.length}`).join(' '))

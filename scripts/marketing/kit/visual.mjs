/** FAN LIFE Social Kit v2 (The Weekly, owner 26.10.2026) → the picture that goes with a Telegram post.
 *  A post built by scripts/marketing/build-plan.mts carries its own `kit` ({t, data}): the template and the archive
 *  data it was made from — that is drawn as is. Any other post is read back out of its message (app, hook,
 *  `Visual: T<n> …`) and drawn with that copy. Team crests come from the one crest library of the universe
 *  (ecosystem/crests — OFFSIDES' library), the club's own file only where the library has none. Shirts come from
 *  the FAN LIFE kit archive (public/club-kits). Anything it cannot draw → [] and the post still goes out as text. */
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import {design} from './source/design.mjs'
import {designLive, fits} from './live.mjs'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const sharp = createRequire(import.meta.url)('sharp')
const TYPE = JSON.parse(readFileSync(path.join(ROOT, 'assets/type-paths.json'), 'utf8'))
const REPO = path.resolve(ROOT, '../../..')
const PHOTO = path.join(ROOT, 'assets/stadium.jpg')
// art round 2 (owner, 27.10.2026): the T1 window wears one of six drawn moments instead of the one stadium photo,
// chosen by what the post is about. The tone layer prints under the line; the template's two inks colour both.
const MOMENTS = ['moment-goal', 'moment-final', 'moment-away', 'moment-derby', 'moment-kid', 'moment-radio']
  .filter(n => existsSync(path.join(ROOT, 'assets', n + '-line.png')))
export function momentFor(hook) {
  if (!MOMENTS.length) return null
  const h = String(hook || '').toLowerCase(), pick = n => MOMENTS.includes(n) ? n : null
  return (/derby/.test(h) && pick('moment-derby')) || (/final|cup|trophy|title|champion|double/.test(h) && pick('moment-final'))
    || (/away|trip|travel|abroad|road/.test(h) && pick('moment-away')) || (/radio|listen|heard/.test(h) && pick('moment-radio'))
    || (/kid|child|first|young|father|son|daughter/.test(h) && pick('moment-kid')) || (/goal|scor|net/.test(h) && pick('moment-goal'))
    || MOMENTS[[...h].reduce((a, c) => a + c.charCodeAt(0), 0) % MOMENTS.length]
}
async function momentPng(name) {
  const file = path.join(tmpdir(), `fanlife-${name}.png`)
  if (!existsSync(file)) {
    const at = s => path.join(ROOT, 'assets', `${name}-${s}.png`)
    writeFileSync(file, await sharp(at('tone')).composite([{input: at('line')}]).png().toBuffer())
  }
  return file
}

const APPS = {'FAN LIFE': 'fanlife', 'THE WORKER': 'worker', DUBID: 'dubid', OFFSIDES: 'offsides', 'FUCK YOU': 'fuckyou', 'DUBEL TEAM': 'dubel'}
const SWAP = {'—': '-', '–': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '→': '>', '×': 'x', '…': '...'}
const unhtml = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')

/** Keep only what the kit's fonts can print (emoji, Hebrew → gone); collapse spaces. */
export function printable(s, font = 'Weekly Head') {
  const g = {...TYPE['Weekly Body'].glyphs, ...TYPE[font].glyphs}
  return [...String(s)].map(c => (g[c] ? c : g[SWAP[c]] ? SWAP[c] : ' ')).join('').replace(/\s+/g, ' ').trim()
}

/** Greedy wrap into at most `max` lines of roughly `width` characters. null when it does not fit. */
export function wrap(s, max = 3, width = 16) {
  const words = s.split(' '), out = []
  let line = ''
  for (const w of words) {
    if (!line) line = w
    else if ((line + ' ' + w).length <= width) line += ' ' + w
    else { out.push(line); line = w }
  }
  if (line) out.push(line)
  return out.length <= max ? out : null
}

/** Shortest honest headline: the whole hook if it wraps, else its first sentence/clause. */
function headline(hook, max = 3, width = 16) {
  const up = printable(hook).toUpperCase()
  if (!/[A-Z0-9]/.test(up)) return null
  const head = up.split(/[:—-]\s/)[0]
  const tries = [up, up.split(/:\s/).slice(1).join(': '), up.split(/(?<=[.!?])\s/)[0], head.includes(' ') ? head : ''].filter(t => /[A-Z0-9]/.test(t || ''))
  for (const t of tries) for (const w of [width, width + 3, width + 6, width + 9]) { const r = wrap(t, max, w); if (r) return r }
  return null
}

/** Cut at a word boundary and say so. */
const clip = (s, n) => s.length <= n ? s : s.slice(0, n - 3).replace(/\s+\S*$/, '') + '...'

/** A real archive shirt (THE WORKER's photographed fronts) with the season, maker and sponsor the Kit Master records.
 *  Chosen by the post's own words, so the same post always shows the same shirt. null when nothing qualifies. */
let SHIRTS
function shirtFor(seed) {
  if (!SHIRTS) {
    try {
      const repo = path.resolve(ROOT, '../../..')
      const photos = JSON.parse(readFileSync(path.join(repo, 'content/manual/kit-photos.json'), 'utf8')).records
      const kits = JSON.parse(readFileSync(path.join(repo, 'content/generated/kit-master.json'), 'utf8')).kits
      const by = new Map(kits.map(k => [`${k.seasonLabel}|${k.variant}`, k]))
      SHIRTS = photos.filter(p => p.confidence >= 2 && !p.special && !p.seasonAmbiguous).map(p => {
        const k = by.get(`${p.seasonLabel}|${p.variant}`), f = k?.fields || {}
        const maker = f.maker?.confidence >= 2 ? printable(f.maker.value?.name || '', 'Weekly Caps') : ''
        const sponsor = f.sponsor?.confidence >= 2 ? printable(f.sponsor.value?.name || '', 'Weekly Caps') : ''
        return maker && sponsor ? {file: path.join(repo, 'public/kits', p.file), season: p.seasonLabel, maker: maker.toUpperCase(), sponsor: sponsor.toUpperCase()} : null
      }).filter(Boolean)
    } catch { SHIRTS = [] }
  }
  if (!SHIRTS.length) return null
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return SHIRTS[h % SHIRTS.length]
}

/** What the message says, read back out of the site's own render. */
export function readPost(msg) {
  const text = unhtml(msg)
  const lines = text.split('\n')
  const app = APPS[(String(msg).match(/📌[^<\n]*<b>([^<]+)<\/b>/)?.[1] || (lines[1] || '').split('·').pop() || '').trim()] || 'fanlife'
  const hookAt = lines.findIndex(l => l.includes('HOOK'))
  const hook = (hookAt >= 0 ? (lines[hookAt + 1] || '').trim() : '').replace(/^(Wallpaper|Story background):\s*/i, '').replace(/^[“"](.*)[”"]$/, '$1')
  const visual = (text.match(/Visual:\s*(T\d)\s*([^.\n]*)/) || [])
  const real = text.match(/Real match:\s*(.+?)\s+[–-]\s+(.+?)\s+·\s+(\d{1,2}\.\d{1,2})\s+(\d{1,2}:\d{2})/)
  const postAt = lines.findIndex(l => l.includes('✍️'))
  const body = postAt >= 0 ? lines.slice(postAt + 2).filter(l => l.trim() && !l.startsWith('👉') && !l.startsWith('#') && !l.startsWith('🎨')) : []
  return {app, hook, template: visual[1] || null, variant: (visual[2] || '').trim(), match: real ? {home: real[1], away: real[2], date: real[3], time: real[4]} : null, body}
}

/** Which kit layouts to draw for a post, with their data. */
export function plan(post) {
  const {app, hook, template, variant, match, body} = post
  if (!template) return []
  if (match) {
    const team = s => { const n = printable(s).toUpperCase(); return n.length <= 20 ? [n] : wrap(n, 2, 14) || [n.slice(0, 20)] }
    return [{t: 'T5-A', data: {home: team(match.home), away: team(match.away), time: match.time, competition: `MATCHDAY / ${match.date}`}}]
  }
  const label = Object.keys(APPS).find(k => APPS[k] === app) || 'DUBEL TEAM'
  const h = headline(hook, 3, template === 'T1' || template === 'T8' ? 20 : 16) || (template === 'T5' ? [label] : null)
  if (!h) return []
  const firstBody = clip(printable(body.find(l => l !== hook) || '', 'Weekly Body'), 54)
  switch (template) {
    case 'T1': return [{t: 'T1', data: {hook: h, body: firstBody, photo: PHOTO, moment: momentFor(hook)}}]
    case 'T2': return [{t: 'T2', data: {feature: h, body: (wrap(firstBody, 2, 28) || []).slice(0, 2), noPlaceholders: true}}]
    case 'T3': return [{t: 'T3', data: {masthead: label, line: printable(hook, 'Weekly Caps').slice(0, 60)}}]
    case 'T4': { const k = shirtFor(hook); return k ? [{t: 'T4', data: k}] : [{t: 'T1', data: {hook: h, body: firstBody, photo: PHOTO, moment: momentFor(hook)}}] }
    case 'T5': {
      const v = /countdown/i.test(variant) ? 'T5-C' : /wallpaper|lock/i.test(variant) ? 'T5-D' : 'T5-B'
      return [{t: v, data: {hook: h}}]
    }
    case 'T6': {
      const up = printable(hook).toUpperCase(), said = printable(firstBody).toUpperCase()
      const top = up.length <= 30 ? up : app === 'fuckyou' ? 'FUCK YOU.' : 'TALK TO US.'
      const bubble = up.length <= 30 ? (said && said.length <= 40 ? said : 'YOUR ANSWER?') : clip(up, 40)
      return [{t: 'T6-BUBBLE', data: {hook: top, bubble}}]
    }
    case 'T7': {
      const steps = body.map(l => l.match(/^Slide\s*\d+:\s*(.+)$/i)?.[1]).filter(Boolean)
      const from = steps.length >= 4 ? 1 : 0
      const slides = steps.slice(from, from + 3).map(s => ({headline: headline(s, 2, 14) || [clip(printable(s).toUpperCase(), 16)], body: ''}))
      const deck = [{t: 'T7-1', data: {cover: h}}]
      if (slides.length === 3) for (let i = 0; i < 3; i++) deck.push({t: `T7-${i + 2}`, data: {slides, noPlaceholders: true}})
      deck.push({t: 'T7-5', data: {noPlaceholders: true}})
      return deck
    }
    case 'T8': return [{t: 'T8', data: {hook: h, frame: PHOTO}}]
    default: return []
  }
}

// ── crests and shirts ──────────────────────────────────────────────────────────────────────────────────────────────
let LIB
const OWN = {'AEK Athens': 'aek-athens', Celtic: 'celtic', Olympiacos: 'olympiacos', Panathinaikos: 'panathinaikos', 'FC St. Pauli': 'st-pauli',
  'St. Pauli': 'st-pauli', 'Hapoel Petah Tikva': 'hapoel-petah-tikva', 'Hapoel Tel Aviv': 'hapoel-tel-aviv', 'Zrinjski Mostar': 'zrinjski-mostar'}
const CACHE = path.join(tmpdir(), 'fanlife-crests')
const MISSED = new Set() // a crest the library could not hand over is not asked for twice in one run
/** A local PNG path for a team's crest, or null. Library first; the club's own file where the library has none. */
export async function crestPath(name) {
  if (!name) return null
  LIB ??= await import('../../../ecosystem/crests/index.mjs')
  const slug = LIB.crestSlug(name)
  if (slug && !MISSED.has(slug)) {
    const file = path.join(CACHE, slug + '.png')
    if (existsSync(file)) return file
    try {
      const r = await fetch(`${LIB.CREST_BASE}/${slug}.png`, {signal: AbortSignal.timeout(8000)})
      const buf = r.ok ? Buffer.from(await r.arrayBuffer()) : null
      if (buf && buf.subarray(1, 4).toString() === 'PNG') { mkdirSync(CACHE, {recursive: true}); writeFileSync(file, buf); return file }
    } catch { /* the club's own file, or no crest */ }
    MISSED.add(slug)
  }
  const own = OWN[name] && path.join(REPO, 'public/crests', OWN[name] + '.png')
  return own && existsSync(own) ? own : null
}
/** "Celtic, 2015/16, third" → a PNG of that shirt from the FAN LIFE kit archive, or null. */
async function shirtPath({club, text}) {
  const m = String(text || '').match(/(\d{4}\/\d{2}), (home|away|third|fourth|goalkeeper)/i)
  if (!m || !/^[a-z0-9-]+$/.test(club || '')) return null
  try {
    const idx = JSON.parse(readFileSync(path.join(REPO, 'public/club-kits', club, 'svg/index.json'), 'utf8'))
    const k = idx.kits.find(x => x.season === m[1] && x.type === m[2].toLowerCase())
    if (!k) return null
    const file = path.join(tmpdir(), `fanlife-shirt-${club}-${k.id}.png`)
    if (!existsSync(file)) writeFileSync(file, await sharp(path.join(REPO, 'public/club-kits', club, 'svg', k.id + '.svg'), {density: 160}).resize(760, 760, {fit: 'contain', background: {r: 0, g: 0, b: 0, alpha: 0}}).png().toBuffer())
    return file
  } catch { return null }
}
async function resolveAssets(data) {
  const d = structuredClone(data)
  if (d.crestName) d.crest = await crestPath(d.crestName)
  if (d.homeCrestName) d.homeCrest = await crestPath(d.homeCrestName)
  if (d.awayCrestName) d.awayCrest = await crestPath(d.awayCrestName)
  if (Array.isArray(d.rows)) for (const r of d.rows) {
    if (r.crestName) r.crest = await crestPath(r.crestName)
    if (r.homeCrestName) r.homeCrest = await crestPath(r.homeCrestName)
    if (r.awayCrestName) r.awayCrest = await crestPath(r.awayCrestName)
  }
  if (d.shirtFor) { d.shirt = await shirtPath(d.shirtFor); if (!d.shirt) { d.score = String(d.shirtFor.text.match(/\d{4}\/\d{2}/)?.[0] || ''); d.away = 'THE SHIRT ARCHIVE' } }
  for (const k of ['crestName', 'homeCrestName', 'awayCrestName', 'shirtFor']) delete d[k]
  for (const k of ['crest', 'homeCrest', 'awayCrest']) if (d[k] === null) delete d[k]
  if (Array.isArray(d.rows)) for (const r of d.rows) { for (const k of ['crestName', 'homeCrestName', 'awayCrestName']) delete r[k]; for (const k of ['crest', 'homeCrest', 'awayCrest']) if (!r[k]) delete r[k] }
  return d
}
const APP_OF = {fanlife: 'fanlife', theworker: 'worker', worker: 'worker', dubid: 'dubid', offsides: 'offsides', fuckyou: 'fuckyou', all: 'fanlife'}

/** PNG buffers for one Telegram message (and, when the plan made it, the post's own kit). Never throws.
 *  Every post gets a picture (owner, 27.10.2026): when its own layout cannot be drawn, its app's L-CARD is. */
export let lastError = null
const png = d => sharp(Buffer.from(d.svg)).png({compressionLevel: 9}).toBuffer()
export async function drawKit(kit, fallbackApp = 'fanlife') {
  const app = APP_OF[kit.data.app] || fallbackApp
  const data = await resolveAssets(kit.data)
  const d = kit.t.startsWith('L-') ? designLive(kit.t, app, data) : design(kit.t, app, data, true)
  if (!fits(d)) throw Error(`${kit.t}: text runs off the picture`)
  return png(d)
}
async function card(post) {
  const hook = printable(post.hook || 'Football. Forever.')
  const app = ['dubid', 'offsides'].includes(post.app) ? post.app : 'fanlife'
  return png(designLive('L-CARD', app, {hook: hook || 'Football. Forever.', seed: hook.length}))
}
export async function visualsFor(msg, kit = null) {
  lastError = null
  const post = readPost(msg)
  try {
    // a carousel: one picture per slide, in order, sent as one album (owner, 27.10.2026)
    if (Array.isArray(kit?.slides) && kit.slides.length) { const out = []; for (const k of kit.slides.slice(0, 10)) out.push(await drawKit(k, post.app || 'fanlife')); return out }
    if (kit?.t && kit.data) return [await drawKit(kit, post.app || 'fanlife')]
    const out = []
    for (const {t, data} of plan(post)) {
      if (data.moment) data.photo = await momentPng(data.moment)
      delete data.moment
      if (data.file) { data.shirt = path.join(tmpdir(), `dubel-shirt-${process.pid}.png`); writeFileSync(data.shirt, await sharp(data.file).png().toBuffer()) }
      const d = design(t, post.app, data, true)
      if (!fits(d)) throw Error(`${t}: text runs off the picture`)
      out.push(await png(d))
    }
    if (out.length) return out
    throw Error('no layout for this post')
  } catch (e) {
    lastError = String(e?.stack || e?.message || e).slice(0, 400)
    try { return [await card(post)] } catch (e2) {
      lastError += ` · card: ${String(e2?.message || e2).slice(0, 160)}`
      return []
    }
  }
}

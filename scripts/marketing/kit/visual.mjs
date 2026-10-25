/** DUBEL TEAM social kit → the picture that goes with a Telegram post.
 *  Reads the post as the site rendered it (app label, hook, the real match, `Visual: T<n> …`) and draws the
 *  matching kit template with that copy. Pure: message in, PNG buffers out. Anything it cannot draw → [] and the
 *  post still goes out as text. The kit itself is the owner's DUBEL TEAM Social Kit v1 (25.10.2026), vendored here. */
import {readFileSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createRequire} from 'node:module'
import {design} from './source/design.mjs'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const sharp = createRequire(import.meta.url)('sharp')
const TYPE = JSON.parse(readFileSync(path.join(ROOT, 'assets/type-paths.json'), 'utf8'))
const PHOTO = path.join(ROOT, 'assets/stadium.jpg')

const APPS = {'FAN LIFE': 'fanlife', 'THE WORKER': 'worker', DUBID: 'dubid', OFFSIDES: 'offsides', 'FUCK YOU': 'fuckyou', 'DUBEL TEAM': 'dubel'}
const SWAP = {'—': '-', '–': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '→': '>', '×': 'x', '…': '...'}
const unhtml = s => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')

/** Keep only what the kit's fonts can print (emoji, Hebrew → gone); collapse spaces. */
export function printable(s, font = 'Anton') {
  const g = TYPE[font].glyphs
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
        const maker = f.maker?.confidence >= 2 ? printable(f.maker.value?.name || '', 'Courier Prime') : ''
        const sponsor = f.sponsor?.confidence >= 2 ? printable(f.sponsor.value?.name || '', 'Courier Prime') : ''
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
  const app = APPS[(lines[1] || '').split('·').pop().trim()] || 'dubel'
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
  const firstBody = printable(body.find(l => l !== hook) || '', 'Archivo').slice(0, 70)
  switch (template) {
    case 'T1': return [{t: 'T1', data: {hook: h, body: firstBody, photo: PHOTO}}]
    case 'T2': return [{t: 'T2', data: {feature: h, body: (wrap(firstBody, 2, 28) || []).slice(0, 2), noPlaceholders: true}}]
    case 'T3': return [{t: 'T3', data: {masthead: label, line: printable(hook, 'Courier Prime').slice(0, 60)}}]
    case 'T4': { const k = shirtFor(hook); return k ? [{t: 'T4', data: k}] : [{t: 'T1', data: {hook: h, body: firstBody, photo: PHOTO}}] }
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

/** PNG buffers for one Telegram message. Never throws. */
export async function visualsFor(msg) {
  try {
    const post = readPost(msg)
    const out = []
    for (const {t, data} of plan(post)) {
      if (data.file) { data.shirt = path.join(tmpdir(), `dubel-shirt-${process.pid}.png`); writeFileSync(data.shirt, await sharp(data.file).png().toBuffer()) }
      const d = design(t, post.app, data, true)
      if (d.bounds.some(b => b.x < 0 || b.x + b.width > d.width || b.y < 0 || b.y + b.height > d.height)) return []
      out.push(await sharp(Buffer.from(d.svg)).png({compressionLevel: 9, palette: false}).toBuffer())
    }
    return out
  } catch (e) {
    console.log(`visual skipped: ${String(e?.message || e).slice(0, 160)}`)
    return []
  }
}

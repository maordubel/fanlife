/** Real feature imagery for the v4 pictures: crests, the club's own shirts from the kit archive, LIFE in-game shots,
 *  the gates' own comic plates, Legends Manager's own art. Everything is a local file (file:// URL for the page). */
import {existsSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import sharp from 'sharp'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const KIT = path.dirname(HERE)
export const REPO = path.resolve(KIT, '../../..')
export const url = f => (f ? pathToFileURL(f).href : null)
const CACHE = path.join(tmpdir(), 'fanlife-v4')
export const CLUBS = JSON.parse(readFileSync(path.join(KIT, 'config/clubs.json'), 'utf8'))
const BY_NAME = Object.fromEntries(Object.entries(CLUBS).map(([id, v]) => [v.name.toLowerCase(), id]))

/** a club's id from {club:{id|name}}, a crestName, or the start of a label ("FC ST. PAULI · GATE 10") */
export function clubId(d) {
  const id = d?.club?.id || (typeof d?.club === 'string' ? d.club : null)
  if (id && CLUBS[id]) return id
  const name = String(d?.club?.name || d?.crestName || String(d?.label || '').split('·')[0] || '').trim().toLowerCase()
  return BY_NAME[name] || (name === 'fc st. pauli' ? 'st-pauli' : null)
}

const hex = s => s.slice(1).match(/../g).map(x => parseInt(x, 16))
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()
export const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t))
export const lum = h => { const [r, g, b] = hex(h).map(v => v / 255); return .2126 * r + .7152 * g + .0722 * b }

/** the club's palette for a post: ground, text on it, the strip and the hot accent */
export function paint(id) {
  const c = id && CLUBS[id]
  if (!c) return {bg: '#121212', on: '#FFFBF2', s1: '#FFFBF2', s2: '#D71920', hot: '#FF5A4E', light: false, name: null}
  const p = c.primary, light = lum(p) > .55, dark = lum(p) < .06
  const bg = dark ? '#161616' : light ? p : mix(p, '#000000', .12)
  return {bg, on: light ? '#15130F' : '#FFFBF2', s1: light ? '#15130F' : '#FFFBF2', s2: dark ? '#FFFBF2' : p, hot: light ? '#15130F' : '#FFFBF2', light, name: c.name, primary: p}
}

let crestFn
export async function crest(name) {
  if (!name) return null
  crestFn ??= (await import('../visual.mjs')).crestPath
  try { return url(await crestFn(name)) } catch { return null }
}

/** up to n of the club's home shirts, spread across the eras, rendered from the kit archive's own SVGs */
export async function shirts(id, n = 3, pick = null) {
  const dir = path.join(REPO, 'public/club-kits', id || '', 'svg')
  if (!id || !existsSync(path.join(dir, 'index.json'))) return []
  const kits = JSON.parse(readFileSync(path.join(dir, 'index.json'), 'utf8')).kits.filter(k => k.type === 'home')
  const year = k => parseInt(String(k.season).slice(0, 4), 10)
  const byYear = [...new Map(kits.filter(k => year(k)).sort((a, b) => year(a) - year(b)).map(k => [year(k), k])).values()]
  let chosen = pick ? byYear.filter(k => pick.includes(String(year(k)))) : []
  if (!chosen.length && byYear.length) { const step = (byYear.length - 1) / Math.max(1, n - 1); chosen = Array.from({length: Math.min(n, byYear.length)}, (_, i) => byYear[Math.round(i * step)]) }
  mkdirSync(CACHE, {recursive: true})
  const out = []
  for (const k of chosen) {
    const f = path.join(CACHE, `kit-${id}-${k.id}.png`)
    if (!existsSync(f)) {
      // the shirt only: the archive draws some kits with shorts and socks beside the shirt, so crop to the top-left mass
      const png = await sharp(path.join(dir, k.id + '.svg'), {density: 170}).resize(700, 700, {fit: 'contain', background: {r: 0, g: 0, b: 0, alpha: 0}}).png().toBuffer()
      writeFileSync(f, await shirtOnly(png))
    }
    out.push({src: url(f), year: String(year(k)), season: k.season})
  }
  return out
}

/** crop a full kit drawing (shirt, then shorts below and socks to the right) to the shirt alone */
async function shirtOnly(png) {
  const {data, info} = await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject: true})
  const W = info.width, H = info.height, a = (x, y) => data[(y * W + x) * 4 + 3] > 20
  const col = x => { for (let y = 0; y < H; y++) if (a(x, y)) return true; return false }
  const row = (y, x1) => { for (let x = 0; x < x1; x++) if (a(x, y)) return true; return false }
  let x0 = 0; while (x0 < W && !col(x0)) x0++
  let x1 = x0; while (x1 < W && col(x1)) x1++            // first run of columns with ink = the shirt (+ shorts)
  let y0 = 0; while (y0 < H && !row(y0, x1)) y0++
  let y1 = y0; while (y1 < H && row(y1, x1)) y1++          // first run of rows inside it = the shirt
  if (x1 - x0 < 40 || y1 - y0 < 40) return png
  return sharp(png).extract({left: x0, top: y0, width: x1 - x0, height: y1 - y0}).png().toBuffer()
}

/** a LIFE in-game shot of the club's own world (stand, tunnel, scarf, ticket) */
export function lifeShot(id, which = 'stand') {
  const f = path.join(REPO, 'public/life/town/shots', id || 'olympiacos', which + '.webp')
  return existsSync(f) ? url(f) : url(path.join(REPO, 'public/life/town/shots/olympiacos', which + '.webp'))
}

const GATE_ART = {'ALL-TIME XI': 'gate-xi', 'TRIVIA WING': 'gate-trivia', 'HISTORICAL LINE-UP': 'gate-lineup', 'KIT BUILDER': 'gate-kit-builder',
  'SHIRT COLLECTION': 'gate-kits', MEMORY: 'gate-memory', 'TERRACE VOTE': 'gate-polls', 'GOAL RECONSTRUCTION': 'gate-goal',
  'ROYAL RUMBLE': 'gate-royal-rumble', 'BLIND COW': 'gate-blind-cow', 'THE DERBY': 'gate-derby', 'LIVING ARCHIVE': 'gate-archive',
  TIMELINE: 'gate-timeline', LIFE: 'gate-life', 'LEGENDS MANAGER': 'gate-legends'}
/** the gate's own comic plate (line + tone), as it appears on the club page */
export function plate(name, fallback = 'kicker') {
  const key = GATE_ART[String(name || '').toUpperCase()] || fallback
  const line = path.join(KIT, 'assets', key + '-line.png'), tone = path.join(KIT, 'assets', key + '-tone.png')
  return existsSync(line) ? {line: url(line), tone: existsSync(tone) ? url(tone) : null} : null
}

export const brand = {
  fanlife: url(path.join(REPO, 'public/brand/fanlife/logo-mono.webp')),
  legends: url(path.join(REPO, 'public/legends/brand/logo-512.webp')),
  dubid: url(path.join(KIT, 'assets/brand/dubid-logo.png')),
  offsides: url(path.join(KIT, 'assets/brand/offsides-logo.png')),
}
export const legendsFx = n => url(path.join(REPO, 'public/legends/fx', n + '-still.webp'))
export const local = p => (p && !/^(https?:|file:|data:)/.test(p) ? url(path.isAbsolute(p) ? p : path.join(KIT, p)) : p)

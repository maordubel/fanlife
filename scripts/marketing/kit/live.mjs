/** FAN LIFE social plan v3 (owner, 27.10.2026) — the layouts the Social Kit v2 does not have, drawn with the same
 *  Weekly canvas (glyph outlines, two inks, tickets, bursts), so a picture renders identically here and on Vercel
 *  without a single installed font.
 *
 *  FAN LIFE (the lead voice): L-GATE (one gate of the app), L-FACT (did you know), L-FIXTURES (next up),
 *  L-RESULTS (full time).
 *  DUBID and OFFSIDES speak in their OWN branding — their real logos (assets/brand), their own night grounds and
 *  accents, never "on FAN LIFE": L-DUBID-ROUND (a round is open), L-DUBID-SYSTEM, L-OFFSIDES-TODAY (today's
 *  arenas), L-OFFSIDES-SYSTEM.
 *  L-CARD is the safety net: any post whose own picture cannot be drawn still goes out with its app's card. */
import {createRequire} from 'node:module'
import {existsSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {Canvas, measure} from './source/weekly.mjs'
const QR = createRequire(import.meta.url)('qrcode')
import {clubField, crestMedal, ownColour, paintFor, ribbon, LOGOS} from './poster.mjs'

export const LIVE_TEMPLATES = ['L-SLIDE', 'L-GATE', 'L-FACT', 'L-FIXTURES', 'L-RESULTS', 'L-DUBID-ROUND', 'L-DUBID-SYSTEM', 'L-OFFSIDES-TODAY', 'L-OFFSIDES-SYSTEM', 'L-CARD']
const W = 1080, H = 1350
const PLATES = ['kicker', 'keeper', 'dribbler', 'fans', 'memo', 'scarf', 'swap', 'bootball']
// art round 2 (owner, 27.10.2026): one drawing per gate, found by the gate's printed name — the plan already in the
// database names its gates this way, so a post scheduled before the art arrived gets it without being rebuilt.
const KIT = path.dirname(fileURLToPath(import.meta.url))
const has = name => existsSync(path.join(KIT, 'assets', name + '-line.png'))
const GATE_ART = {'ALL-TIME XI': 'gate-xi', 'TRIVIA WING': 'gate-trivia', 'HISTORICAL LINE-UP': 'gate-lineup', 'KIT BUILDER': 'gate-kit-builder',
  'SHIRT COLLECTION': 'gate-kits', MEMORY: 'gate-memory', 'TERRACE VOTE': 'gate-polls', 'GOAL RECONSTRUCTION': 'gate-goal',
  'ROYAL RUMBLE': 'gate-royal-rumble', 'BLIND COW': 'gate-blind-cow', 'THE DERBY': 'gate-derby', 'LIVING ARCHIVE': 'gate-archive',
  TIMELINE: 'gate-timeline', LIFE: 'gate-life', 'LEGENDS MANAGER': 'gate-legends'}
export const gateArt = d => [GATE_ART[String(d.name || '').toUpperCase()], d.plate].find(n => n && has(n)) || 'kicker'
/** which of the three covers a carousel's first slide wears (gates · a club's nights · love for the fans) */
const coverArt = d => { const k = /YOUR GAMES/i.test(d.kicker || '') ? 'cover-gates' : /\bnights?\b/i.test(d.title || '') ? 'cover-history' : 'cover-love'; return has(k) ? k : null }
// the FAN LIFE safety-net card: its 840 × 500 window is the moments' own shape (2048 × 1250)
const CARD_ART = ['moment-goal', 'moment-final', 'moment-away', 'moment-derby', 'moment-kid', 'moment-radio'].filter(has)
const LOGO = {dubid: 'assets/brand/dubid-logo.png', offsides: 'assets/brand/offsides-logo.png'}
// brand grounds: DUBID's night navy with its cream line-art; OFFSIDES' stadium navy with its orange
const GROUND = {dubid: '#16203F', offsides: '#0E1A33'}

/** the largest size at which `s` fits `max` on one line (never below `min`) */
const fitSize = (s, n, font, max, min) => { let size = n; while (measure(s, size, font) > max && size > min) size -= .5; return size }

function brandTop(c, app, title, sub) {
  c.rect(0, 0, W, H, GROUND[app], {border: false, shadow: false})
  c.halftone(0, 0, W, H, c.paper, .06)
  c.image(LOGO[app], 36, 34, 300, 300, {contain: true, raw: true, id: 'app-logo'})
  c.text(title[0], 372, 150, 92, 'Shrikhand', c.paper, {max: 670, min: 40, stroke: 4, shadow: true, tag: 'title'})
  if (title[1]) c.text(title[1], 372, 252, 92, 'Shrikhand', c.accent, {max: 670, min: 40, stroke: 4, shadow: true, tag: 'title'})
  if (sub) c.text(sub, 376, 314, 26, 'Weekly Caps', c.paper, {max: 660, min: 16})
}
function brandFoot(c, label) {
  const y = H - 118
  c.ticket(64, y, W - 128, 76)
  c.text(c.app.url.toUpperCase(), 120, y + 49, 24, 'Weekly Caps', c.ink, {max: W - 224, min: 15, tag: 'footer-url'})
  if (label) c.text(label, 64, y - 20, 21, 'Weekly Caps', c.paper, {max: W - 128, min: 17})
}
/** numbered points on paper tickets */
function points(c, list, y0, h = 150) {
  list.slice(0, 3).forEach((p, i) => {
    const y = y0 + i * (h + 22)
    c.ticket(64, y, W - 128, h)
    c.circle(150, y + h / 2, 44, c.accent)
    c.text(String(i + 1), 150, y + h / 2 + 20, 56, 'Ultra', c.on(c.accent), {anchor: 'middle', max: 70})
    c.text(p[0], 222, y + 62, 40, 'Weekly Head', c.ink, {max: W - 128 - 190, min: 26})
    c.text(p[1], 222, y + h - 34, 30, 'Weekly Body 600', c.ink, {max: W - 128 - 190, min: 30, tag: 'reading'})
  })
}
/** one match on a ticket: crests at both ends, the names, and a second line (time, competition) */
function matchRow(c, x, y, w, h, r, score = null) {
  c.ticket(x, y, w, h)
  const cs = Math.min(h - 40, 124), big = h >= 170
  const left = x + 50, right = x + w - 22
  if (r.homeCrest) c.image(r.homeCrest, left, y + (h - cs) / 2, cs, cs, {contain: true, id: 'home-crest'})
  if (r.awayCrest) c.image(r.awayCrest, right - cs, y + (h - cs) / 2, cs, cs, {contain: true, id: 'away-crest'})
  const tx = left + cs + 22, tw = right - cs - 22 - tx - (score ? 196 : 0)
  const names = `${r.home} v ${r.away}`
  c.text(names, tx, y + h * .47, big ? 50 : 38, 'Weekly Head', c.ink, {max: tw, min: 22})
  c.text(r.line, tx, y + h * .47 + (big ? 56 : 44), big ? 28 : 24, 'Weekly Caps', c.ink, {max: tw, min: 15})
  if (score) { const lh = Math.min(h - 28, 104); c.lamp(score, right - cs - 22 - 184, y + (h - lh) / 2, 174, lh) }
}

export function designLive(t, app, d) {
  const brand = t.startsWith('L-DUBID') ? 'dubid' : t.startsWith('L-OFFSIDES') ? 'offsides' : t === 'L-CARD' && LOGO[app] ? app : null
  const c = new Canvas(W, H, brand || 'fanlife', true, t === 'L-FIXTURES' || t === 'L-RESULTS' ? {clubs: d.clubs || []} : d, t)
  if (brand) c.accent = c.color(brand === 'dubid' ? c.P.cyan : c.P.orange)
  else c.halftone()

  if (t === 'L-SLIDE') {
    // one slide of a club carousel (owner, 27.10.2026): cover · a night · a line of love · the way in
    const paint = paintFor(d), count = d.of ? `${d.n}/${d.of}` : null
    if (d.s === 'cover' || d.s === 'cta') {
      const f = clubField(c, paint, 0, 0, W, H)
      c.header()
      const art = d.s === 'cover' ? coverArt(d) : null
      if (d.s === 'cover' && art) {
        // the cover drawing fills the top two thirds (its bottom third is empty by brief); the crest goes small
        c.plate(art, 60, 100, W - 120, 1170)
        if (d.crest) crestMedal(c, d.crest, W - 150, 210, 110)
        if (d.kicker) { const kw = Math.min(900, measure(String(d.kicker).toUpperCase(), 30, 'Weekly Caps') + 80); c.rect(W / 2 - kw / 2, 822, kw, 58, c.ink, {border: false}); c.text(d.kicker, W / 2, 862, 30, 'Weekly Caps', c.paper, {anchor: 'middle', max: 860, min: 16}) }
        c.rect(64, 880, 952, 300, c.paper, {sw: 4})
        c.fitted(d.title, 104, 980, {n: 76, min: 40, max: 872, maxLines: 3, step: 1.08})
        c.stick('swipe', 910, 1210, 96, {fill: c.P.cyan}) || c.burst(910, 1210, 96, 'SWIPE!', {fill: c.P.cyan, n: 34})
      } else if (d.s === 'cover') {
        crestMedal(c, d.crest, W / 2, 520, 230)
        if (d.kicker) { const kw = Math.min(900, measure(String(d.kicker).toUpperCase(), 30, 'Weekly Caps') + 80); c.rect(W / 2 - kw / 2, 790, kw, 58, c.ink, {border: false}); c.text(d.kicker, W / 2, 830, 30, 'Weekly Caps', c.paper, {anchor: 'middle', max: 860, min: 16}) }
        c.rect(64, 880, 952, 300, c.paper, {sw: 4})
        c.fitted(d.title, 104, 980, {n: 76, min: 40, max: 872, maxLines: 3, step: 1.08})
        c.stick('swipe', 910, 1210, 96, {fill: c.P.cyan}) || c.burst(910, 1210, 96, 'SWIPE!', {fill: c.P.cyan, n: 34})
      } else {
        c.circle(W / 2, 470, 236, c.ink, {border: false})
        c.image('assets/brand/fanlife-logo.png', W / 2 - 230, 240, 460, 460, {contain: true, raw: true, id: 'fanlife-logo-big'})
        if (d.crest) crestMedal(c, d.crest, W - 170, 640, 104)
        c.rect(64, 790, 952, 300, c.paper, {sw: 4})
        c.fitted(d.title, 104, 890, {n: 66, min: 38, max: 872, maxLines: 3, step: 1.08})
        c.footer({label: d.label || null})
      }
    } else if (d.s === 'night') {
      const f = clubField(c, paint, 0, 0, W, 560)
      c.header()
      if (d.crest) crestMedal(c, d.crest, W - 150, 150, 110)
      c.text(String(d.year), 64, 520, 230, 'Ultra', f.on, {max: 700, min: 110, stroke: 8, shadow: true, tag: 'night-year'})
      if (d.score) { c.lamp(d.score, 64, 610, 952, 200); c.fitted(d.teams, 64, 880, {n: 52, min: 30, max: 952, maxLines: 2, step: 1.1}) }
      else c.fitted(d.teams, 64, 680, {n: 64, min: 34, max: 952, maxLines: 4, step: 1.1})
      c.ticket(64, 1000, 952, 80)
      c.text(d.line || '', 121, 1052, 28, 'Weekly Caps', c.ink, {max: 875, min: 16})
      if (d.note) c.text(d.note, 64, 1150, 34, 'Weekly Head', c.accent, {max: 952, min: 22})
      c.footer({label: d.label || null})
    } else if (d.s === 'love') {
      clubField(c, paint, 0, 0, W, 640)
      c.header()
      if (d.crest) crestMedal(c, d.crest, W - 175, 400, 150)
      c.burst(200, 380, 120, d.shout || 'WE LOVE IT!', {fill: c.P.cyan, n: 30})
      // the name on an ink tag, so it reads on any shirt — white, yellow or green
      const bw = Math.min(952, measure(String(d.big || ''), 76, 'Shrikhand') + 70)
      c.rect(48, 520, bw, 104, c.ink, {border: false})
      c.text(d.big || '', 80, 598, 76, 'Shrikhand', c.paper, {max: 900, min: 34, tag: 'love-big'})
      c.rect(64, 700, 952, 390, c.paper, {sw: 4})
      c.add(`<rect x="64" y="700" width="24" height="390" fill="${ownColour(c, paint)}"/>`)
      c.fitted(d.line, 120, 800, {n: 56, min: 34, max: 860, maxLines: 5, step: 1.16})
      c.footer({label: d.label || null})
    } else throw Error('Unknown slide ' + d.s)
    if (count && d.s !== 'cover') c.text(count, W - 70, H - 150, 26, 'Weekly Caps', d.s === 'cover' || d.s === 'cta' ? c.paper : c.ink, {anchor: 'end', max: 120})
  } else if (t === 'L-GATE') {
    // the club's colours, its crest, the gate's number big, the comic plate, the name on a ribbon
    const paint = d.brand === 'legends' ? null : paintFor(d)
    const f = clubField(c, paint, 0, 0, W, 820)
    c.header()
    if (d.brand === 'legends') c.image(LOGOS.legends, W - 360, 20, 330, 330, {contain: true, raw: true, id: 'legends-logo'})
    else if (d.crest) crestMedal(c, d.crest, W - 150, 150, 118)
    const num = String(d.gate || '').match(/\d+/)?.[0]
    if (num) {
      c.text('GATE', 70, 330, 40, 'Weekly Caps', f.on, {max: 300})
      c.text(num, 58, 600, num.length > 1 ? 290 : 330, 'Ultra', f.on, {max: 420, min: 120, stroke: 8, shadow: true, tag: 'gate-number'})
    } else c.text(String(d.gate || ''), 70, 330, 34, 'Weekly Caps', f.on, {max: 560, min: 18})
    c.plate(gateArt(d), num ? 430 : 300, 250, num ? 600 : 720, 470)
    ribbon(c, d.name, 760, {fill: c.accent, text: c.paper})
    // the hand-drawn sticker where one says the same thing (art round 2): FREE! on a gate, LEGENDS on Legends Manager
    { const st = d.sticker !== undefined ? d.sticker : d.name === 'LIFE' ? 'new' : !d.shout ? 'free' : d.shout === 'KICK OFF!' ? 'legends' : null
      if (!(st && c.stick(st, 925, 905, 104, {fill: c.P.cyan}))) c.burst(925, 905, 104, d.shout || 'PLAY FREE!', {fill: c.P.cyan, n: 36}) }
    c.fitted(d.headline, 64, 990, {n: 62, min: 38, max: 760, maxLines: 2, step: 1.05})
    ;(d.body || []).slice(0, 2).forEach((s, i) => c.text(s, 64, 1124 + i * 42, 31, 'Weekly Body 600', c.ink, {max: 952, min: 30, tag: 'reading'}))
    c.footer({label: d.label || null})
  } else if (t === 'L-FACT') {
    // the year huge on the club's colours, the crest on a medal, the fact on a paper card
    const paint = paintFor(d), f = clubField(c, paint, 0, 0, W, 620)
    c.header()
    if (d.crest) crestMedal(c, d.crest, W - 175, 360, 150)
    c.burst(190, 335, 116, d.shout || 'DID YOU KNOW?', {fill: c.P.cyan, n: 30})
    const year = String(d.fact || '').match(/(19[89]\d|20\d\d)(\/\d\d)?/)?.[0]
    if (year) c.text(year, 64, 590, year.length > 4 ? 150 : 190, 'Ultra', f.on, {max: 700, min: 90, stroke: 7, shadow: true, tag: 'fact-year'})
    c.rect(64, 690, 952, 400, c.paper, {sw: 4})
    c.add(`<rect x="64" y="690" width="24" height="400" fill="${ownColour(c, paint)}"/>`)
    c.fitted(d.fact, 120, 800, {n: 78, min: 40, max: 860, maxLines: 4, step: 1.14})
    if (d.kicker) c.text(d.kicker, 64, 1170, 30, 'Weekly Caps', c.ink, {max: 952, min: 18})
    c.footer({label: d.label || null})
  } else if (t === 'L-FIXTURES' || t === 'L-RESULTS') {
    const rows = d.rows || []
    if (rows.length < 1 || rows.length > 6) throw Error(`${t} needs 1–6 rows`)
    c.header()
    c.masthead(t === 'L-RESULTS' ? 'FULL TIME' : 'NEXT UP', 64, 326, 99, 700)
    // today's matches wear the hand-drawn TONIGHT sticker (art round 2); any other day keeps the date roundel
    if (!(t === 'L-FIXTURES' && d.dayTop === 'TODAY' && c.stick('tonight', 880, 360, 125, {fill: c.P.cyan}))) {
      c.circle(935, 363, 75, c.P.cyan)
      c.text(d.dayTop, 935, 356, 34, 'Ultra', c.ink, {anchor: 'middle', max: 120, min: 18})
      c.text(d.dayBottom, 935, 398, 23, 'Ultra', c.ink, {anchor: 'middle', max: 120, min: 14})
    }
    const start = 455, hh = Math.min(250, (1170 - start) / rows.length)
    rows.forEach((r, i) => matchRow(c, 64, start + i * hh, 952, hh - 15, r, t === 'L-RESULTS' ? r.score : null))
    // one or two matches leave half a page: a moment drawing fills it (art round 2) — a kid at the turnstile before,
    // the terrace going up after
    { const free = 1170 - (start + rows.length * hh); if (free >= 360) c.plate(t === 'L-RESULTS' ? 'moment-goal' : 'moment-kid', 64, start + rows.length * hh + 10, 952, free - 30, c.P.paper) }
    c.footer({label: d.label || 'FROM THE FAN LIFE CLUBS'})
  } else if (t === 'L-DUBID-ROUND') {
    brandTop(c, 'dubid', [`ROUND ${d.round}`, 'IS OPEN'], 'PICK YOUR PLAYERS BEFORE THE LOCK')
    const rows = d.leagues || []
    if (!rows.length || rows.length > 4) throw Error('L-DUBID-ROUND needs 1–4 leagues')
    const hh = Math.min(240, 560 / rows.length)
    rows.forEach((r, i) => {
      const y = 400 + i * (hh + 18)
      c.ticket(64, y, 952, hh)
      c.text(r.name, 120, y + hh * .46, hh >= 200 ? 56 : 46, 'Weekly Head', c.ink, {max: 640, min: 26})
      c.text(r.line, 120, y + hh * .46 + 46, 26, 'Weekly Caps', c.ink, {max: 640, min: 15})
      c.circle(900, y + hh / 2, Math.min(62, hh / 2 - 12), c.accent)
      c.text(`GW ${r.round}`, 900, y + hh / 2 + 10, 28, 'Weekly Caps', c.paper, {anchor: 'middle', max: 100, min: 14})
    })
    c.burst(870, 1080, 118, 'DUBID 5 & 11', {fill: c.P.paper, n: 32})
    c.text('ONE PLAYER FROM EVERY CLUB.', 64, 1100, 34, 'Weekly Head', c.paper, {max: 650, min: 22})
    brandFoot(c, d.label || null)
  } else if (t === 'L-DUBID-SYSTEM' || t === 'L-OFFSIDES-SYSTEM') {
    const b = t === 'L-DUBID-SYSTEM' ? 'dubid' : 'offsides'
    brandTop(c, b, d.title, d.sub)
    points(c, d.points || [], 400)
    c.burst(870, 1080, 118, d.shout || 'FREE TO PLAY', {fill: c.P.paper, n: 32})
    if (d.line) c.text(d.line, 64, 1100, 34, 'Weekly Head', c.paper, {max: 650, min: 22})
    brandFoot(c, d.label || null)
  } else if (t === 'L-OFFSIDES-TODAY') {
    // OFFSIDES' own "Today's Central Arenas" story (src/admin/CentralArenasStudio.jsx), as a post: night stage, gold
    // foil headline, glass match cards with both crests, a gold JOIN THE BATTLE plate with the QR to the app
    const rows = d.rows || []
    if (!rows.length || rows.length > 5) throw Error('L-OFFSIDES-TODAY needs 1–5 matches')
    const GOLD1 = '#F7E6AE', GOLD2 = '#D6B25E', CHALK = '#F4F1E8'
    c.add(`<defs><linearGradient id="os-stage" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1630"/><stop offset="1" stop-color="#050A18"/></linearGradient>
      <radialGradient id="os-flood" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#2D4B8E" stop-opacity=".75"/><stop offset="1" stop-color="#0B1630" stop-opacity="0"/></radialGradient>
      <linearGradient id="os-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD1}"/><stop offset="1" stop-color="${GOLD2}"/></linearGradient>
      <linearGradient id="os-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121E3A" stop-opacity=".94"/><stop offset="1" stop-color="#091022" stop-opacity=".94"/></linearGradient></defs>`)
    c.add(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#os-stage)"/><rect x="0" y="0" width="${W}" height="${H}" fill="url(#os-flood)"/>`)
    // floodlight beams from the two top corners
    c.add(`<path d="M-40 -40L380 700L120 760Z M${W + 40} -40L${W - 380} 700L${W - 120} 760Z" fill="${GOLD1}" opacity=".07"/>`)
    c.halftone(0, 0, W, H, CHALK, .04)
    c.image(LOGO.offsides, W / 2 - 110, 24, 220, 220, {contain: true, raw: true, id: 'app-logo'})
    const head = d.headline || 'TODAY’S CENTRAL ARENAS'
    c.text(head, W / 2, 318, 74, 'Shrikhand', GOLD1, {anchor: 'middle', max: W - 120, min: 38, stroke: 3, shadow: true, tag: 'title'})
    c.text('PICK YOUR BATTLE · JOIN THE CHAOS', W / 2, 362, 24, 'Weekly Caps', CHALK, {anchor: 'middle', max: 900, min: 14})
    const top = 392, bottom = H - 260, rh = Math.min(232, (bottom - top) / rows.length) - 16
    rows.forEach((r, i) => {
      const y = top + i * (rh + 16), x = 56, w = W - 112
      c.add(`<rect x="${x}" y="${y}" width="${w}" height="${rh}" rx="22" fill="url(#os-glass)" stroke="${GOLD1}" stroke-opacity=".35" stroke-width="1.6"/>`)
      const cs = Math.min(112, rh * .5), cy = y + rh * .42, lx = x + w * .15, rx = x + w * .85
      for (const [cx, src] of [[lx, r.homeCrest], [rx, r.awayCrest]]) {
        c.add(`<circle cx="${cx}" cy="${cy}" r="${cs * .62}" fill="${CHALK}" opacity=".96"/>`)
        if (src) c.image(src, cx - cs / 2, cy - cs / 2, cs, cs, {contain: true, id: 'match-crest'})
      }
      if (r.league) c.text(String(r.league), W / 2, y + 34, 18, 'Weekly Caps', CHALK, {anchor: 'middle', max: w * .46, min: 12})
      c.text('VS', W / 2, y + rh * .48, 42, 'Shrikhand', GOLD1, {anchor: 'middle', max: 160})
      if (r.ko) c.text(r.ko, W / 2, y + rh * .7, 26, 'Ultra', '#7CF29A', {anchor: 'middle', max: 200, min: 14})
      const ny = Math.min(y + rh - 18, cy + cs * .62 + 36)
      c.text(r.home, lx, ny, 30, 'Weekly Head', CHALK, {anchor: 'middle', max: w * .3, min: 16})
      c.text(r.away, rx, ny, 30, 'Weekly Head', CHALK, {anchor: 'middle', max: w * .3, min: 16})
      if (r.arenas) c.text(`${r.arenas} ARENA${r.arenas === 1 ? '' : 'S'} OPEN`, W / 2, y + rh - 12, 20, 'Weekly Caps', GOLD1, {anchor: 'middle', max: w * .3, min: 12})
    })
    const by = H - 232
    c.add(`<rect x="56" y="${by}" width="${W - 112}" height="160" rx="22" fill="url(#os-gold)"/>`)
    c.text('JOIN THE BATTLE', 92, by + 76, 60, 'Shrikhand', '#2A1D04', {max: 640, min: 30})
    c.text('OFFSIDES.DUBELTEAM.COM', 96, by + 122, 26, 'Weekly Caps', '#2A1D04', {max: 640, min: 14, tag: 'footer-url'})
    const qr = QR.create('https://offsides.dubelteam.com').modules, qs = 128, cell = qs / qr.size, qx = W - 92 - qs, qy = by + 16
    let path = ''
    for (let yy = 0; yy < qr.size; yy++) for (let xx = 0; xx < qr.size; xx++) if (qr.get(yy, xx)) path += `M${(qx + xx * cell).toFixed(2)} ${(qy + yy * cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`
    c.add(`<rect x="${qx - 8}" y="${qy - 8}" width="${qs + 16}" height="${qs + 16}" rx="10" fill="#FFFFFF"/><path d="${path}" fill="#000000"/>`)
    c.text('PREDICT THE CHAOS · VIRTUAL FLAMES · NOT REAL-MONEY', W / 2, H - 34, 20, 'Weekly Caps', CHALK, {anchor: 'middle', max: 960, min: 12})
  } else if (t === 'L-CARD') {
    if (brand) {
      brandTop(c, brand, [brand === 'dubid' ? 'DUBID' : 'OFFSIDES'], null)
      c.rect(64, 420, 952, 640, c.paper, {sw: 3})
      c.fitted(d.hook, 96, 540, {n: 74, min: 40, max: 888, maxLines: 5, step: 1.1})
      brandFoot(c, null)
    } else {
      clubField(c, paintFor(d), 0, 0, W, 760)
      c.header()
      { const pool = app === 'fanlife' && CARD_ART.length ? CARD_ART : PLATES; c.plate(pool[(d.seed || 0) % pool.length], 120, 230, 840, 500) }
      c.burst(930, 300, 100, 'FAN LIFE', {fill: c.P.cyan, n: 34})
      c.fitted(d.hook, 64, 880, {n: 74, min: 40, max: 952, maxLines: 4, step: 1.08})
      c.footer()
    }
  } else throw Error('Unknown live template ' + t)
  // paper grain (art round 2): grass under the matchday posts, terrace concrete under the love letters, newsprint elsewhere
  if (!c.transparent) c.grain(t === 'L-FIXTURES' || t === 'L-RESULTS' ? 'grass' : t === 'L-SLIDE' && d.s === 'love' ? 'terrace' : 'newsprint', t === 'L-FIXTURES' || t === 'L-RESULTS' ? .07 : .1)
  return c.finish(t + ' / ' + c.app.label)
}

export const fits = d => !d.bounds.some(b => b.x < 0 || b.x + b.width > d.width || b.y < 0 || b.y + b.height > d.height)
export {fitSize}

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
import {Canvas, measure} from './source/weekly.mjs'

export const LIVE_TEMPLATES = ['L-GATE', 'L-FACT', 'L-FIXTURES', 'L-RESULTS', 'L-DUBID-ROUND', 'L-DUBID-SYSTEM', 'L-OFFSIDES-TODAY', 'L-OFFSIDES-SYSTEM', 'L-CARD']
const W = 1080, H = 1350
const PLATES = ['kicker', 'keeper', 'dribbler', 'fans', 'memo', 'scarf', 'swap', 'bootball']
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

  if (t === 'L-GATE') {
    c.header()
    c.text(String(d.gate), 64, 238, 30, 'Weekly Caps', c.ink, {max: 640})
    c.text(d.name, 64, 372, 104, 'Shrikhand', c.accent, {max: 760, min: 46, stroke: 4, shadow: true, tag: 'gate-name'})
    c.rect(64, 430, 952, 470, c.paper, {sw: 3})
    c.halftone(70, 436, 940, 458)
    c.plate(PLATES.includes(d.plate) ? d.plate : 'kicker', 78, 444, 924, 442)
    c.burst(900, 470, 118, d.shout || 'PLAY FREE!', {n: 40})
    c.fitted(d.headline, 64, 984, {n: 64, min: 40, max: 952, maxLines: 2, step: 1.05})
    ;(d.body || []).slice(0, 2).forEach((s, i) => c.text(s, 64, 1124 + i * 42, 31, 'Weekly Body 600', c.ink, {max: 952, min: 30, tag: 'reading'}))
    c.footer({label: d.label || null})
  } else if (t === 'L-FACT') {
    c.header()
    c.burst(250, 360, 176, 'DID YOU KNOW?', {fill: c.P.cyan, n: 40})
    if (d.crest) c.image(d.crest, 770, 250, 220, 220, {contain: true, id: 'club-crest'})
    c.rect(64, 580, 952, 520, c.paper, {sw: 3})
    c.halftone(70, 586, 940, 508)
    c.fitted(d.fact, 96, 690, {n: 66, min: 40, max: 888, maxLines: 5, step: 1.12})
    if (d.kicker) c.text(d.kicker, 64, 1166, 30, 'Weekly Caps', c.ink, {max: 952, min: 18})
    c.footer({label: d.label || null})
  } else if (t === 'L-FIXTURES' || t === 'L-RESULTS') {
    const rows = d.rows || []
    if (rows.length < 1 || rows.length > 6) throw Error(`${t} needs 1–6 rows`)
    c.header()
    c.masthead(t === 'L-RESULTS' ? 'FULL TIME' : 'NEXT UP', 64, 326, 99, 700)
    c.circle(935, 363, 75, c.P.cyan)
    c.text(d.dayTop, 935, 356, 34, 'Ultra', c.ink, {anchor: 'middle', max: 120, min: 18})
    c.text(d.dayBottom, 935, 398, 23, 'Ultra', c.ink, {anchor: 'middle', max: 120, min: 14})
    const start = 455, hh = Math.min(250, (1170 - start) / rows.length)
    rows.forEach((r, i) => matchRow(c, 64, start + i * hh, 952, hh - 15, r, t === 'L-RESULTS' ? r.score : null))
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
    brandTop(c, 'offsides', ['TODAY’S', 'ARENAS'], d.sub || 'PREDICT BEFORE KICK-OFF')
    const rows = d.rows || []
    if (!rows.length || rows.length > 5) throw Error('L-OFFSIDES-TODAY needs 1–5 matches')
    const hh = Math.min(220, 640 / rows.length)
    rows.forEach((r, i) => matchRow(c, 64, 400 + i * (hh + 12), 952, hh, r))
    brandFoot(c, d.label || null)
  } else if (t === 'L-CARD') {
    if (brand) {
      brandTop(c, brand, [brand === 'dubid' ? 'DUBID' : 'OFFSIDES'], null)
      c.rect(64, 420, 952, 640, c.paper, {sw: 3})
      c.fitted(d.hook, 96, 540, {n: 74, min: 40, max: 888, maxLines: 5, step: 1.1})
      brandFoot(c, null)
    } else {
      c.header()
      c.rect(64, 260, 952, 470, c.paper, {sw: 3})
      c.halftone(70, 266, 940, 458)
      c.plate(PLATES[(d.seed || 0) % PLATES.length], 78, 274, 924, 442)
      c.fitted(d.hook, 64, 840, {n: 72, min: 40, max: 952, maxLines: 4, step: 1.08})
      c.footer()
    }
  } else throw Error('Unknown live template ' + t)
  return c.finish(t + ' / ' + c.app.label)
}

export const fits = d => !d.bounds.some(b => b.x < 0 || b.x + b.width > d.width || b.y < 0 || b.y + b.height > d.height)
export {fitSize}

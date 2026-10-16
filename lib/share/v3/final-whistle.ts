import type {FinalResult} from '@/lib/fixtures/types'
import {artFor, dateLine, emotionLine, outcomeOf} from '@/lib/final-whistle/presentation'
import {SHARE_FONTS, type FontKey, type Measure, type Rendered, type ShareAssets} from './render'
import {auditColours, onColour, shareClub, sharePalette, type InkMode} from './theme'

/**
 * FINAL WHISTLE EDITION (spec 16.10.2026) — the story card for a REAL, verified result. It is deliberately not one of the
 * 24 composer templates: those are filled in by a person from a game, this one is filled only by the verifier, from a
 * `FinalResult`. Same renderer family (fonts, palette, rival-colour audit), its own composition. Client-safe, no DOM.
 *
 * Zones (1080×1920): 0–250 colour only · masthead 260–440 · FULL TIME 450–640 · score 650–925 · teams 945–1080 ·
 * match line 1090–1160 · picture 1160–1455 · emotion 1465–1550 · invitation 1560–1650 · 1670–1920 colour only.
 * Home is always on the left and away on the right; the club the card is for is the one wearing its colour.
 */
export const FINAL_WHISTLE_FOOTER_DOMAIN = 'FanLife.DubelTeam.com'
export const FINAL_WHISTLE_SIZE = {w: 1080, h: 1920} as const
export type FinalWhistleData = {club: string; result: FinalResult; inkMode?: InkMode; sample?: boolean}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[c]!))
const f = (k: FontKey) => SHARE_FONTS[k]

export function renderFinalWhistle(d: FinalWhistleData, {assets, measure}: {assets: ShareAssets; measure: Measure}): Rendered {
  const {w: W, h: H} = FINAL_WHISTLE_SIZE, club = shareClub(d.club)
  if (!club) throw new Error('Unknown club')
  const r = d.result, P = sharePalette(club, d.inkMode), out: string[] = [], warnings: string[] = []
  const outcome = outcomeOf(r)
  if (!outcome) throw new Error('Cannot draw a result whose outcome is not decided')
  if (r.clubId !== club.id) warnings.push('The result belongs to a different club.')
  const add = (s: string) => { out.push(s) }
  const homeIsUs = r.clubSide === 'home'
  const tx = (s: string, x: number, y: number, n: number, k: FontKey, colour: string, max: number, anchor = 'start', field = '', min = 18) => {
    let at = n; while (measure(s, at, k) > max && at > min) at -= .5
    if (measure(s, at, k) > max + .5) warnings.push(`Shorten ${field || 'text'}; it exceeds its print area.`)
    add(`<text x="${x}" y="${y}" font-family="${f(k).family}" font-weight="${f(k).weight}" font-size="${at}" fill="${colour}" text-anchor="${anchor}"${field ? ` data-field="${field}"` : ''}>${esc(s)}</text>`)
    return at
  }
  const torn = (x: number, y: number, w: number, h: number, c: string, seed = 0) => {
    const j = (i: number) => ((i * 37 + seed * 17) % 11) - 5
    const top = Array.from({length: 9}, (_, i) => `L${x + (w * (i + 1)) / 10} ${y + 6 + j(i) * 1.6}`).join(' ')
    const bottom = Array.from({length: 9}, (_, i) => `L${x + w - (w * (i + 1)) / 10} ${y + h - 6 + j(i + 4) * 1.6}`).join(' ')
    const shape = `M${x} ${y + 8} ${top} L${x + w} ${y + 4} L${x + w} ${y + h - 4} ${bottom} L${x} ${y + h - 8} Z`
    add(`<path d="${shape}" fill="${c}"/>`)
    if (P.pattern !== 'plain') add(`<path d="${shape}" fill="url(#club-print)" opacity=".16"/>`)
  }
  const pat = (() => {
    let s = ''
    if (P.pattern === 'stripes') s = `<path d="M0 0V24" stroke="${P.paper}" stroke-width="5"/>`
    if (P.pattern === 'diagonal') s = `<path d="M-6 6L6 -6M0 24L24 0M18 30L30 18" stroke="${P.paper}" stroke-width="3"/>`
    if (P.pattern === 'rules') s = `<path d="M0 12H24" stroke="${P.paper}" stroke-width="2"/>`
    return `<pattern id="club-print" width="24" height="24" patternUnits="userSpaceOnUse">${s}</pattern>`
  })()

  add(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Full time: ${esc(r.home)} ${r.homeScore}–${r.awayScore} ${esc(r.away)}" data-template="25-final-whistle" data-format="story" data-club="${club.id}" data-theme-version="3" data-event="${esc(r.providerEventId)}" data-outcome="${outcome}">`)
  add(`<defs><style>${assets.fontCss}</style><filter id="club-mono" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/></filter>${pat}<filter id="grain" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="1" seed="7"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".08"/></feComponentTransfer></filter><clipPath id="art-clip"><rect x="0" y="1160" width="${W}" height="295"/></clipPath></defs>`)
  add(`<rect width="${W}" height="${H}" fill="${P.paper}"/>`)
  // 0–250: colour and texture only (Instagram keeps this band for its own interface)
  torn(-20, -10, W + 40, 262, P.slabHead, 1)

  // masthead
  add(`<image filter="url(#club-mono)" href="${esc(assets.logo)}" x="64" y="264" width="176" height="176" preserveAspectRatio="xMidYMid meet"/>`)
  add(`<line x1="268" y1="270" x2="268" y2="436" stroke="${P.ink}" stroke-width="3"/>`)
  tx('FAN LIFE', 296, 384, 128, 'display', P.ink, W - 64 - 296, 'start', 'masthead')
  tx('FINAL WHISTLE EDITION', 298, 426, 28, 'mono', P.ink, W - 64 - 298, 'start', 'edition')

  // FULL TIME on one line
  const unit = 100, wFull = measure('FULL', unit, 'display'), wTime = measure('TIME', unit, 'display'), gap = 22
  const ft = Math.min(200, ((W - 128 - gap) / (wFull + wTime)) * unit)
  const xFull = (W - (((wFull + wTime) * ft) / unit + gap)) / 2
  add(`<text x="${xFull}" y="620" font-family="${f('display').family}" font-size="${ft}" fill="${P.red}" data-field="fulltime.0">FULL</text>`)
  add(`<text x="${xFull + (wFull * ft) / unit + gap}" y="620" font-family="${f('display').family}" font-size="${ft}" fill="${P.ink}" data-field="fulltime.1">TIME</text>`)
  add(`<path d="M64 640 L${W - 64} 636 L${W - 64} 646 L64 649 Z" fill="${P.red}"/>`)

  // the score: home left, away right, never swapped
  const colHome = 284, colAway = 796
  const hs = String(r.homeScore), as = String(r.awayScore)
  tx(hs, colHome, 922, 430, 'condensed', homeIsUs ? P.red : P.ink, 440, 'middle', 'score.home', 120)
  tx(as, colAway, 922, 430, 'condensed', homeIsUs ? P.ink : P.red, 440, 'middle', 'score.away', 120)
  add(`<rect x="${W / 2 - 42}" y="786" width="84" height="34" fill="${P.ink}"/>`)

  // teams: label, name (one or two lines), underline in the club's own colour for ours and grey for theirs
  const side = (label: string, name: string, cx: number, ours: boolean) => {
    const x0 = cx - 220, max = 440, text = name.toUpperCase()
    add(`<text x="${x0}" y="966" font-family="${f('mono').family}" font-size="24" fill="${P.ink}" data-field="label.${label.toLowerCase()}">${label}</text>`)
    add(`<line x1="${x0 + 92}" y1="958" x2="${x0 + max}" y2="958" stroke="${P.ink}" stroke-width="2"/>`)
    if (measure(text, 66, 'condensed') <= max) tx(text, x0, 1030, 66, 'condensed', P.ink, max, 'start', `team.${label.toLowerCase()}`, 42)
    else {
      const words = text.split(/\s+/); let at = 52, rows: string[] = []
      const wrap = (n: number) => { const a: string[] = []; let row = ''; for (const wd of words) { const next = row ? `${row} ${wd}` : wd; if (row && measure(next, n, 'condensed') > max) { a.push(row); row = wd } else row = next } if (row) a.push(row); return a }
      rows = wrap(at); while (rows.length > 2 && at > 42) { at -= 1; rows = wrap(at) }
      if (rows.length > 2) warnings.push(`Shorten team.${label.toLowerCase()}; it needs more than two lines.`)
      rows.slice(0, 2).forEach((row, i) => tx(row, x0, 1006 + i * at * .98, at, 'condensed', P.ink, max, 'start', `team.${label.toLowerCase()}.${i}`, 42))
    }
    add(`<rect x="${x0}" y="1070" width="${max}" height="10" fill="${ours ? P.primary : P.muted}"/>`)
  }
  side('HOME', r.home, colHome, homeIsUs)
  side('AWAY', r.away, colAway, !homeIsUs)

  // the match line: competition · date, and the honest stamp for extra time or penalties
  const line = [r.competition, dateLine(r.kickoff)].filter(Boolean).join(' · ')
  tx(line.toUpperCase(), W / 2, 1116, 26, 'mono', P.ink, W - 128, 'middle', 'meta')
  if (r.finalStatus !== 'FT') {
    const label = r.finalStatus === 'AET' ? 'AFTER EXTRA TIME' : r.penalties ? `PENALTIES ${r.penalties.home}–${r.penalties.away}` : 'PENALTIES'
    tx(label, W / 2, 1148, 24, 'display', P.red, W - 128, 'middle', 'status')
  }

  // the picture: a terrace only when the club won — a loss or a draw never gets the celebration
  torn(0, 1170, W, 290, P.slabA, 2)
  add(`<g clip-path="url(#art-clip)"><image filter="url(#club-mono)" href="${esc(assets.art[artFor(outcome)])}" x="0" y="1160" width="${W}" height="295" preserveAspectRatio="xMidYMid slice"/></g>`)

  // the line under it, then the invitation and the one address
  tx(emotionLine(outcome, r.competitionKind, r.finalStatus), W / 2, 1532, 64, 'display', P.ink, W - 128, 'middle', 'emotion', 40)
  add(`<line x1="64" y1="1584" x2="${W / 2 - 230}" y2="1584" stroke="${P.red}" stroke-width="5"/><line x1="${W / 2 + 230}" y1="1584" x2="${W - 64}" y2="1584" stroke="${P.ink}" stroke-width="5"/>`)
  tx('EXPLORE YOUR CLUB', W / 2, 1594, 26, 'mono', P.ink, 440, 'middle', 'invite')
  tx(FINAL_WHISTLE_FOOTER_DOMAIN, W / 2, 1644, 56, 'body', P.ink, W - 128, 'middle', 'footer')

  // 1670–1920: colour and texture only; a design sample says so
  torn(-20, 1664, W + 40, 276, P.slabHead, 3)
  if (d.sample) tx('DESIGN SAMPLE · NOT A REAL RESULT', W / 2, 1720, 24, 'mono', onColour(P.slabHead), W - 128, 'middle', 'sample')
  add('</svg>')
  const svg = out.join('\n')
  for (const c of auditColours(svg, club)) warnings.push(`Forbidden club colour in graphic: ${c}`)
  return {svg, warnings, palette: P, size: {w: W, h: H}}
}

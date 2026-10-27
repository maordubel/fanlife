/** FAN LIFE poster language (owner, 27.10.2026: "logos, crests, graphics, joy, love of football").
 *  The club's own colours worn the way its shirt wears them (stripes, hoops, sash, halves, checks — a sunburst for a
 *  plain shirt), its crest on a medal, the FAN LIFE badge, and a printed ribbon. Built only from Canvas primitives, so it
 *  renders the same on Vercel with no installed font. Colours still pass the club's rival policy (rule 95). */
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {Canvas, ROOT} from './source/weekly.mjs'
import {family} from './source/policy.mjs'

const CLUBS = JSON.parse(readFileSync(path.join(ROOT, 'config/clubs.json'), 'utf8'))
const BY_NAME = Object.fromEntries(Object.entries(CLUBS).map(([id, v]) => [v.name.toLowerCase(), id]))

/** A club's livery by id, by name, or by the name at the start of a label ("FC ST. PAULI · GATE 10"); null when unknown. */
export function paintFor(d) {
  const id = d?.club?.id || (typeof d?.club === 'string' ? d.club : null)
  if (id && CLUBS[id]) return {id, ...CLUBS[id]}
  const name = (d?.club?.name || d?.crestName || String(d?.label || '').split('·')[0] || '').trim().toLowerCase()
  const hit = BY_NAME[name]
  return hit ? {id: hit, ...CLUBS[hit]} : null
}

const hex = s => s.slice(1).match(/../g).map(x => parseInt(x, 16))
const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t))

/** The club's shirt as a field: its colour, the way it is worn, rays and a halftone on top. */
/** The club's own colour is never a rival's (rule 95): it is worn as it is, unless that club's policy bans its family. */
export function ownColour(c, paint) {
  const p = paint?.primary
  return p && !c.policy.bans.includes(family(p)) ? p : c.color(p || c.accent)
}
export function clubField(c, paint, x, y, w, h, {rays = true} = {}) {
  const base = ownColour(c, paint), shade = mix(base, '#000000', .28), light = c.paper
  const id = 'clip' + c.ids++
  c.add(`<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#${id})">`)
  c.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${base}"/>`)
  const p = paint?.pattern || 'solid', band = 96
  if (p === 'stripes') for (let i = 1; i * band < w; i += 2) c.add(`<rect x="${x + i * band}" y="${y}" width="${band}" height="${h}" fill="${light}" opacity=".9"/>`)
  else if (p === 'hoops') for (let i = 1; i * band < h; i += 2) c.add(`<rect x="${x}" y="${y + i * band}" width="${w}" height="${band}" fill="${light}" opacity=".9"/>`)
  else if (p === 'sash') c.add(`<path d="M${x + w * .25} ${y}L${x + w * .55} ${y}L${x + w * .9} ${y + h}L${x + w * .6} ${y + h}Z" fill="${light}" opacity=".92"/>`)
  else if (p === 'halves') c.add(`<rect x="${x + w / 2}" y="${y}" width="${w / 2}" height="${h}" fill="${light}" opacity=".9"/>`)
  else if (p === 'checks') for (let i = 0; i * band < w; i++) for (let j = 0; j * band < h; j++) if ((i + j) % 2) c.add(`<rect x="${x + i * band}" y="${y + j * band}" width="${band}" height="${band}" fill="${light}" opacity=".9"/>`)
  if (rays) {
    const cx = x + w * .62, cy = y + h * .42, R = Math.hypot(w, h)
    let d = ''
    for (let i = 0; i < 24; i += 2) {
      const a0 = i * Math.PI / 12, a1 = (i + 1) * Math.PI / 12
      d += `M${cx} ${cy}L${cx + Math.cos(a0) * R} ${cy + Math.sin(a0) * R}L${cx + Math.cos(a1) * R} ${cy + Math.sin(a1) * R}Z`
    }
    c.add(`<path d="${d}" fill="${p === 'solid' ? shade : '#000000'}" opacity="${p === 'solid' ? .55 : .08}"/>`)
  }
  c.add('</g>')
  c.halftone(x, y, w, h, c.ink, .1)
  c.add(`<rect x="${x}" y="${y + h - 10}" width="${w}" height="10" fill="${c.ink}"/>`)
  return {base, on: paint?.on === '#151515' ? c.ink : c.paper}
}

/** A crest on a printed medal: ink ring, paper face, the crest in its own colours. */
export function crestMedal(c, crest, cx, cy, r) {
  c.circle(cx, cy, r, c.paper, {sw: 6})
  c.circle(cx, cy, r - 14, 'none', {shadow: false, sw: 2})
  if (crest) c.image(crest, cx - r * .68, cy - r * .68, r * 1.36, r * 1.36, {contain: true, id: 'club-crest'})
}

/** A ribbon of ink across the poster, tilted, carrying a name in the club's colour. */
export function ribbon(c, s, y, {fill = c.ink, text = c.paper, tilt = -3, n = 108} = {}) {
  c.add(`<g transform="rotate(${tilt} ${c.w / 2} ${y})">`)
  c.add(`<rect x="-40" y="${y - 82}" width="${c.w + 80}" height="150" fill="${c.ink}" transform="translate(8 8)"/>`)
  c.add(`<rect x="-40" y="${y - 82}" width="${c.w + 80}" height="150" fill="${fill}"/>`)
  c.add('</g>')
  c.text(s, c.w / 2, y + 30, n, 'Shrikhand', text, {anchor: 'middle', max: c.w - 120, min: 44, stroke: 4, shadow: true, rotate: tilt, tag: 'ribbon'})
}

export const LOGOS = {fanlife: 'assets/brand/fanlife-logo.png', legends: 'assets/brand/legends-logo.png'}

/** Behind the FAN LIFE badge of the kit's own templates: the club's colours for a one-club post, the badge's own
 *  red, green and blue for a post about many clubs. The height leaves each template's content where it was drawn. */
const BAND = {'T10-NERDS': 505, 'T11-SPICY': 470, 'T9-OTD': 236}
Canvas.prototype.band = function band() {
  const h = BAND[this.template]
  if (!h || this.banded) return
  this.banded = true
  const paint = this.primaryClub ? paintFor({club: {id: this.primaryClub}}) : null
  if (paint) {
    clubField(this, paint, 0, 0, this.w, h)
    if (this.template === 'T10-NERDS') crestMedal(this, null, 860, 340, 122) // the crest prints on paper, never on its own colour
    return
  }
  this.add(`<rect x="0" y="0" width="${this.w}" height="${h}" fill="${this.P.navy}"/>`)
  this.add(`<path d="M0 ${h * .55}L${this.w} 0L${this.w} ${h * .28}L0 ${h * .83}Z" fill="${this.P.red}"/>`)
  this.add(`<path d="M0 ${h}L${this.w} ${h * .4}L${this.w} ${h * .62}L0 ${h}Z" fill="${this.P.green}"/>`)
  this.halftone(0, 0, this.w, h, this.ink, .12)
  this.add(`<rect x="0" y="${h - 10}" width="${this.w}" height="10" fill="${this.ink}"/>`)
}

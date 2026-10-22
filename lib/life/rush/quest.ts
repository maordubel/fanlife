/**
 * LIFE · RUSH — the quest layer. A mission is not one dash any more: it is a short story told in steps,
 * played in an open place (ADR-fanlife-0013, RUSH 2).
 *
 * Every template gets a recipe here, and a script may ask for one of its versions (`spec.beat`):
 * the same kickoff run is a boy fetching his friend from the corner, a worker grabbing his scarf after
 * the shift, a man who stops for the old one at the corner. What a recipe adds to a level:
 *  · steps, in order — meet somebody, collect what you need, buy the ticket, stop the car for a mate, the gate;
 *  · extras on the way — stickers in the side streets, a knot of people singing — that buy a few seconds;
 *  · the people who walk with you (an escort: too far and he stops and waits);
 *  · things to bang (a bin, a shutter) that turn a steward's head.
 *
 * Pure and deterministic: the same spec builds the same quest. Nothing here names a club, a rival or a ground.
 */
import {look, SIDE, sidePave, type Escort, type Level, type Look, type Pickup, type PickupKind, type Step} from './level'
import type {MissionSpec} from './spec'

const step = (o: Partial<Step> & Pick<Step, 'kind' | 'x' | 'z' | 'key'>): Step => ({r: 2.2, npc: null, say: null, cost: 0, hold: 0, group: 0, joins: false, leaves: false, reveals: false, ...o})

/** who walks with you, by who he is */
const ESCORT: Record<Escort['who'], {pace: number; leash: number; look: Partial<Look>}> = {
  friend: {pace: 8.8, leash: 40, look: {kit: true, scarf: true, cap: false}},
  dad: {pace: 5.6, leash: 10, look: {kit: false, scarf: true, beard: true, size: 1.06}},
  visitor: {pace: 5.4, leash: 10, look: {kit: false, scarf: true, cap: true}},
  child: {pace: 4.4, leash: 8, look: {kit: true, scarf: true, cap: false, beard: false}},
  elder: {pace: 3.3, leash: 7, look: {kit: false, scarf: true, cap: true, beard: false}},
}

export function applyQuest(l: Level, spec: MissionSpec, r: () => number): void {
  const beat = spec.beat ?? null
  const cs = [...l.crossings].sort((a, b) => b - a)
  const sx = () => (r() < 0.5 ? -1 : 1)
  const steps: Step[] = []
  const pickups: Pickup[] = []
  const used: {x: number; z: number}[] = [l.start, {x: l.goal.x, z: l.goal.z}]
  const free = (x: number, z: number, d = 6) => used.every(u => Math.hypot(u.x - x, u.z - z) > d)
  const mark = (x: number, z: number) => { used.push({x, z}); return {x, z} }

  /* ── places on the street ── */
  const corner = (cz: number, s: number) => mark(s * (l.walk + 3), sidePave(cz))
  const sideSpot = (cz: number, s: number, far = r()) => {
    for (let k = 0; k < 12; k++) { const x = s * (l.walk + 6 + (0.15 + far * 0.85) * (SIDE - l.walk - 10)), z = sidePave(cz); if (free(x, z, 4)) return mark(x, z); far = r() }
    return mark(s * (SIDE - 4), sidePave(cz))
  }
  const shop = (za: number, zb: number, s = sx()) => mark(s * (l.walk - 1.4), za + (zb - za) * (0.3 + r() * 0.4))
  const mainSpot = (za: number, zb: number) => { for (let k = 0; k < 12; k++) { const x = sx() * (l.half + 1 + r() * (l.walk - l.half - 2)), z = za + (zb - za) * r(); if (free(x, z, 5)) return mark(x, z) } return mark(l.walk - 2, (za + zb) / 2) }
  const goalStep = (key: string) => step({kind: 'goal', x: l.goal.x, z: l.goal.z, r: l.goal.r, key})
  const need = (kind: PickupKind, at: {x: number; z: number}) => pickups.push({...at, kind, step: steps.length})
  const extras = (n: number, kind: PickupKind) => {
    if (l.place !== 'street') return
    for (let i = 0; i < n; i++) {
      const cz = cs[i % cs.length]!
      const at = i % 2 === 0 ? sideSpot(cz, sx()) : mainSpot(cz + 9, cz + 34)
      pickups.push({...at, kind, step: null})
    }
  }
  const rings = (n: number) => {
    if (l.place !== 'street') return
    for (let i = 0; i < n; i++) {
      const cz = cs[(i + 1) % cs.length]!, s = i % 2 ? -1 : 1, x = s * (l.walk + 10 + r() * 14), z = cz - 5.4
      l.rings.push({x, z, r: 1.6}); mark(x, z)
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + r(); l.standers.push({x: x + Math.cos(a) * 2.2, z: z + Math.sin(a) * 1.2, face: 0, look: look(r, {kit: true, scarf: true}), role: 'fan'}) }
    }
  }
  const escort = (who: Escort['who']) => { const e = ESCORT[who]; l.escort = {who, pace: e.pace, leash: e.leash, look: look(r, e.look)} }
  const person = (o: Partial<Look> = {}) => look(r, o)

  /* ── the recipes ── */
  switch (spec.template) {
    case 'kickoff-run':
    case 'new-ground': {
      if (spec.template === 'new-ground') {
        steps.push(step({kind: 'talk', ...shop(cs[1]!, cs[2]!), key: 'obj.steward', say: 'npc.steward.way', npc: person({kit: false, cap: true})}))
      } else if (beat === 'coach') {
        need('bag', sideSpot(cs[0]!, sx(), 0.9)); steps.push(step({kind: 'collect', x: 0, z: 0, key: 'obj.bag'}))
        steps.push(step({kind: 'talk', ...shop(cs[0]!, cs[1]!), key: 'obj.window', say: 'npc.window', cost: 6, npc: person({kit: false})}))
      } else if (beat === 'shift') {
        need('scarf', sideSpot(cs[0]!, sx(), 0.95)); steps.push(step({kind: 'collect', x: 0, z: 0, key: 'obj.scarf'}))
        escort('friend')
        steps.push(step({kind: 'talk', ...corner(cs[1]!, sx()), key: 'obj.mate', say: 'npc.mate.shift', joins: true, npc: l.escort!.look}))
      } else if (beat === 'march') {
        steps.push(step({kind: 'talk', ...corner(cs[0]!, sx()), key: 'obj.elder', say: 'npc.elder.go', npc: person({kit: false, cap: true, scarf: true})}))
      } else {
        escort('friend')
        steps.push(step({kind: 'talk', ...corner(cs[0]!, sx()), key: 'obj.friend', say: 'npc.friend', joins: true, npc: l.escort!.look}))
        steps.push(step({kind: 'talk', ...shop(cs[1]!, cs[2]!), key: 'obj.ticket', say: 'npc.kiosk', cost: 8, npc: person({kit: false})}))
      }
      steps.push(goalStep(spec.template === 'new-ground' ? 'obj.newgate' : beat === 'coach' ? 'obj.platform' : 'obj.gate'))
      extras(6, 'sticker'); rings(2)
      break
    }
    case 'bottle-run': {
      for (let i = 0; i < 6; i++) { const cz = cs[i % cs.length]!; need('bottle', i < 3 ? sideSpot(cz, i % 2 ? -1 : 1) : mainSpot(cz + 10, cz + 40)) }
      steps.push(step({kind: 'collect', x: 0, z: 0, key: 'obj.bottles'}))
      steps.push(step({kind: 'talk', ...mark(l.walk - 1.4, l.goal.z + 22), key: 'obj.kiosk', say: 'npc.kiosk.bottles', npc: person({kit: false})}))
      steps.push(goalStep('obj.home.shirt'))
      extras(4, 'sticker'); rings(1)
      break
    }
    case 'lead-the-way': {
      // who you lead: your father (a boy leads him), a visitor, somebody's first time, your father grown old
      const who: Escort['who'] = beat === 'dad' || beat === 'child' || beat === 'elder' ? beat : 'visitor'
      const words = beat === 'newcomer' || beat === 'child' || beat === 'dad' || beat === 'elder' ? beat : 'visitor'
      escort(who)
      steps.push(step({kind: 'talk', ...mark(sx() * 3.2, 6), key: `obj.meet.${words}`, say: `npc.meet.${words}`, joins: true, npc: l.escort!.look}))
      steps.push(step({kind: 'talk', ...shop(cs[1]!, cs[2]!), key: `obj.shop.${words}`, say: `npc.shop.${words}`, cost: 6, npc: person({kit: false})}))
      steps.push(goalStep('obj.gate.together'))
      extras(4, 'sticker'); rings(2)
      break
    }
    case 'errands': {
      const kinds: PickupKind[] = ['paint', 'cloth', 'tape', 'roll']
      kinds.forEach((k, i) => need(k, i < 3 ? sideSpot(cs[i]!, i % 2 ? 1 : -1) : mainSpot(cs[0]! + 10, cs[0]! + 50)))
      steps.push(step({kind: 'collect', x: 0, z: 0, key: 'obj.items'}))
      steps.push(goalStep('obj.clubroom'))
      extras(4, 'sticker'); rings(1)
      break
    }
    case 'banner-march': {
      cs.forEach(cz => steps.push(step({kind: 'reach', ...corner(cz, sx()), r: 3.4, key: 'obj.gather', group: 4, npc: person({kit: true, scarf: true})})))
      steps.push(goalStep('obj.stand'))
      extras(4, 'sticker')
      break
    }
    case 'tifo-carry': {
      for (let i = 0; i < 2; i++) need('roll', sideSpot(cs[i]!, i ? -1 : 1, 0.4))
      steps.push(step({kind: 'collect', x: 0, z: 0, key: 'obj.rolls'}))
      steps.push(goalStep('obj.stand'))
      break
    }
    case 'away-day':
    case 'cup-final-trip': {
      const stops = spec.template === 'away-day' ? [-330, -820] : [-520]
      for (const z of stops) {
        l.areas.push({x0: l.half - 1.5, x1: l.half + 3.6, z0: z - 26, z1: z + 26})
        steps.push(step({kind: 'stop', x: l.half + 1.8, z, r: 16, hold: 1.2, leaves: true, key: beat === 'lift' ? 'obj.lift' : 'obj.mate.road', say: beat === 'lift' ? 'npc.lift' : 'npc.mate.road', npc: person({kit: true, scarf: true})}))
      }
      steps.push(goalStep('obj.ground'))
      break
    }
    case 'sneak-in':
    case 'derby-banner-raid': {
      const steal = spec.template === 'derby-banner-raid'
      if (!steal) steps.push(step({kind: 'talk', ...mark(sx() * (5 + r() * 4), 4), key: 'obj.kid', say: 'npc.kid.gap', npc: person({kit: true, size: 0.94})}))
      // a bin between every two lines of stewards: bang it and their heads turn
      const lines = [...new Set(l.patrols.map(p => p.pts[0]![1]))].sort((a, b) => b - a)
      for (let i = 0; i < lines.length; i++) { const z = (lines[i]! + (lines[i + 1] ?? l.goal.z + 4)) / 2 + (r() - 0.5) * 3; l.noises.push(mark((i % 2 ? -1 : 1) * (l.half - 2.2), z)) }
      if (!steal) for (let i = 0; i < 3; i++) { const z = -8 - r() * (l.goal.z * -1 - 18), x = (r() - 0.5) * (l.half * 2 - 6); if (free(x, z, 3)) pickups.push({...mark(x, z), kind: 'coin', step: null}) }
      steps.push(goalStep(steal ? 'obj.storeroom' : 'obj.gap'))
      break
    }
    case 'europe-night':
    case 'title-night':
    case 'where-you-stood':
    case 'sticker-swap': {
      const spot = spec.template === 'where-you-stood'
      if (spec.template === 'sticker-swap') l.kids = true
      const n = spot ? 1 : 2
      const tg = l.targets[0]!
      for (let i = 0; i < n; i++) {
        let x = 0, z = 0
        for (let k = 0; k < 20; k++) { x = (r() - 0.5) * (l.half * 2 - 6); z = l.start.z - 8 - r() * Math.max(6, (l.start.z - tg.z) - 14); if (free(x, z, 5)) break }
        mark(x, z)
        l.standers = l.standers.filter(p => Math.hypot(p.x - x, p.z - z) > 1.3)
        const key = spot ? 'obj.oldman' : spec.template === 'sticker-swap' ? 'obj.ask.kid' : 'obj.ask'
        const say = spot ? 'npc.oldman' : spec.template === 'sticker-swap' ? `npc.ask.kid.${i}` : `npc.ask.${i}`
        steps.push(step({kind: 'talk', x, z, key, say, reveals: true, npc: person({kit: spec.template !== 'europe-night', size: 1})}))
      }
      steps.push(step({kind: 'goal', x: tg.x, z: tg.z, r: 1.8, key: spot ? 'obj.spot' : spec.template === 'sticker-swap' ? 'obj.find.kid' : spec.template === 'title-night' ? 'obj.find.dad' : 'obj.find'}))
      break
    }
    default:
      steps.push(goalStep('obj.gate'))
  }
  // a good turn nobody asked for (RUSH 4): at the far end of a side street, or at the edge of a crowd —
  // never on the route the planner and the bot walk, never a step
  if (l.place === 'street' && cs.length) {
    const cz = cs[Math.floor(r() * cs.length)]!, x = sx() * (l.side - 4), z = sidePave(cz)
    if (l.side && free(x, z, 8)) l.favours.push({...mark(x, z), kind: r() < 0.5 ? 'lost-kid' : 'bag'})
  } else if (l.place === 'crowd') {
    for (let k = 0; k < 20; k++) {
      const x = sx() * (l.half - 2.5), z = l.goal.z + 4 + r() * Math.max(4, l.start.z - 6 - l.goal.z - 4)
      if (!free(x, z, 7)) continue
      l.favours.push({...mark(x, z), kind: r() < 0.5 ? 'lost-kid' : 'bag'})
      break
    }
  }
  l.steps = steps
  l.pickups = pickups
  // nobody stands where somebody waits for you, or on top of a thing you have to pick up
  const keepClear = [...steps.filter(x => x.npc).map(x => ({x: x.x, z: x.z, d: 1.6})), ...pickups.map(p => ({x: p.x, z: p.z, d: 1.2})), ...l.favours.map(f => ({x: f.x, z: f.z, d: 1.8}))]
  l.standers = l.standers.filter(p => keepClear.every(c => Math.hypot(c.x - p.x, c.z - p.z) > c.d))
}

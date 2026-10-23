/**
 * LIFE · hands — different work feels different in the hands (owner's spec, 22.10.2026, §1 §5 §7).
 */
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {JOB_HANDS, handsFor, limitMs, plan, score, type HandsAction} from '@/lib/life/universal/hands'

const side = readFileSync('lib/life/universal/content/side.ts', 'utf8')
const jobIds = [...side.matchAll(/\{id: '([a-z-]+)', room: '/g)].map(m => `job-${m[1]}`)
const ACTIONS = ['stack', 'sort', 'wash', 'tray', 'deliver', 'direct', 'invoice', 'assemble', 'unpack', 'hang', 'stencil', 'stitch', 'frame', 'tune', 'open', 'tie', 'compare'] as const
/** how much a plan asks of the hands: things to place, rubs to make, movements, pairs to check */
const effort = (p: ReturnType<typeof plan>) => p.items.length + p.zones.reduce((n, z) => n + z.need, 0) + p.steps.length

describe('LIFE · hands', () => {
  it('reads the job list out of side.ts', () => expect(jobIds.length).toBeGreaterThanOrEqual(15))

  it('every job of side.ts maps to something you do with your hands, or to its own game', () => {
    for (const id of jobIds) expect(JOB_HANDS[id], id).toBeTruthy()
    for (const id of Object.keys(JOB_HANDS)) expect(jobIds, `${id} is no longer a job`).toContain(id)
  })

  it('the jobs the spec names as work never share an action (crates, bottles, car, table, papers, gate, invoices, workshop, box, flags, radio)', () => {
    const work = ['job-crates', 'job-bottles', 'job-carwash', 'job-table', 'job-leaflets', 'job-queue', 'job-invoice', 'job-tins', 'job-boxes', 'job-flags', 'job-radio']
    const acts = work.map(id => handsFor(id) ?? JOB_HANDS[id])
    expect(new Set(acts).size).toBe(work.length)
    expect(acts).not.toContain('carry')
  })

  it('a screenplay play reaches a craft by naming it', () => {
    expect(handsFor('r-ter-stencil')).toBe('stencil')
    expect(handsFor('scarf-stitch')).toBe('stitch')
    expect(handsFor('f20-photo')).toBe('frame')
    expect(handsFor('job-kickwall')).toBeNull()
    expect(handsFor('f09-penalty')).toBeNull()
  })

  it('every action has work to do, a place for it, one interruption and an after', () => {
    for (const a of ACTIONS) {
      const p = plan(a as HandsAction, `t-${a}`, 15)
      expect(p.title, a).toBeTruthy(); expect(p.after, a).toBeTruthy(); expect(p.interrupt.say, a).toBeTruthy()
      expect(p.limit, a).toBeGreaterThanOrEqual(15); expect(p.limit, a).toBeLessThanOrEqual(65)
      if (p.kind === 'place') {
        expect(p.items.length, a).toBeGreaterThan(2)
        const ids = new Set(p.targets.map(t => t.id))
        for (const it2 of [...p.items, ...(p.interrupt.item ? [p.interrupt.item] : [])]) expect(ids.has(it2.to), `${a}: ${it2.label} → ${it2.to}`).toBe(true)
      }
      if (p.kind === 'zones') {
        expect(p.zones.length, a).toBeGreaterThan(2)
        if (p.interrupt.zone) expect(p.zones.map(z => z.id), a).toContain(p.interrupt.zone)
      }
      if (p.kind === 'motion') {
        expect(p.steps.length, a).toBeGreaterThanOrEqual(4)
        expect(p.interrupt.step, a).toBeTruthy()
        for (const st of p.steps) expect(['up', 'down', 'left', 'right'], `${a}: ${st.label}`).toContain(st.dir)
      }
      if (p.kind === 'compare') {
        const ids = new Set(p.targets.map(t => t.id))
        expect(p.items.length, a).toBeGreaterThan(2)
        for (const it2 of [...p.items, p.interrupt.item!]) { expect(ids.has(it2.to), it2.label).toBe(true); expect(it2.pair?.length).toBe(2); expect(it2.back).toBeTruthy() }
      }
    }
  })

  it('opening, tying and comparing in the story open the work the line describes, not a borrowed game', () => {
    for (const id of ['drawer-pull', 'packet-open', 'packet-tear', 'letter-open', 'wardrobe-lend', 'S02:wear', 'S02:carry']) expect(handsFor(id), id).toBe('open')
    for (const id of ['scarf-tie', 'laces-tie', 'armband-tie']) expect(handsFor(id), id).toBe('tie')
    for (const id of ['swap-check', 'job-swap', 'S07:me', 'S10:fair', 'S38:check']) expect(handsFor(id), id).toBe('compare')
    // a mended scarf is still sewn, a scarf you only carry is still carried
    expect(handsFor('scarf-stitch')).toBe('stitch'); expect(handsFor('scarf-mend')).toBe('stitch'); expect(handsFor('scarf-carry')).toBeNull()
    // the counting jobs stay counting: the tin is counted, the coins on the sill are counted
    expect(handsFor('job-drawer')).toBeNull(); expect(handsFor('S04:alone')).toBeNull()
    // and the story files no longer ask for a radio or a clap where the line opens or ties
    const master = ['childhood', 'early', 'late'].map(f => readFileSync(`lib/life/universal/screenplay/master/${f}.ts`, 'utf8')).join('\n')
    const plays = [...master.matchAll(/hands\('([a-z]+)', '([a-z-]+)'/g)].map(m => ({game: m[1]!, id: m[2]!}))
    for (const want of ['drawer-pull', 'scarf-tie', 'packet-open', 'packet-tear', 'swap-check', 'wardrobe-lend']) {
      const pl = plays.find(x => x.id === want)
      expect(pl, want).toBeTruthy()
      expect(['tune', 'clap'], `${want} still borrows ${pl!.game}`).not.toContain(pl!.game)
      expect(handsFor(want), want).not.toBeNull()
    }
    // each opens its own thing: the drawer is a drawer, the packet a packet, the wardrobe a wardrobe
    expect(plan('open', 'drawer-pull', 8).subject).toBe('drawer')
    expect(plan('open', 'packet-open', 10).subject).toBe('packet')
    expect(plan('open', 'wardrobe-lend', 40).subject).toBe('wardrobe')
    expect(plan('tie', 'scarf-tie', 8).subject).toBe('scarf')
    expect(plan('compare', 'S07:me', 8).subject).toBe('tickets')
  })

  it('the short version asks clearly less of the same work, and feels the same', () => {
    for (const a of ACTIONS) {
      if (a === 'frame' || a === 'tune') continue
      for (const age of [8, 15, 30]) {
        const full = plan(a as HandsAction, `job-${a}`, age), short = plan(a as HandsAction, `job-${a}`, age, {scope: 'short'})
        expect(short.scope).toBe('short'); expect(full.scope).toBe('full')
        expect(short.kind, a).toBe(full.kind); expect(short.title, a).toBe(full.title)
        expect(effort(short), `${a} @${age}: short ${effort(short)} vs full ${effort(full)}`).toBeLessThanOrEqual(Math.floor(effort(full) * 0.75))
        expect(effort(short), a).toBeGreaterThanOrEqual(2)
      }
    }
    // the delivery is fewer doors, the wash fewer rubs, the stencil fewer letters
    expect(plan('deliver', 'job-leaflets', 30, {scope: 'short'}).targets.length).toBeLessThan(plan('deliver', 'job-leaflets', 30).targets.length)
    expect(plan('stencil', 'r-ter-stencil', 20, {scope: 'short'}).zones.length).toBeLessThan(plan('stencil', 'r-ter-stencil', 20).zones.length)
  })

  it('the photograph frames the people actually in the scene', () => {
    const three = plan('frame', 'f20-photo', 20, {people: ['Dad', 'Mum', 'Ofir']})
    expect(three.items.map(i => i.label)).toEqual(['Dad', 'Mum', 'Ofir'])
    expect(three.items.filter(i => i.to === 'out')).toHaveLength(1)
    const shy = three.items.find(i => i.to === 'out')!.label
    expect(three.interrupt.say).toContain(shy)
    expect(three.after).not.toContain(shy)
    const two = plan('frame', 'f20-photo', 20, {people: ['Dad', 'Ofir', 'Dad']})
    expect(two.items.map(i => i.label)).toEqual(['Dad', 'Ofir'])
    expect(two.items.some(i => i.to === 'out')).toBe(false)
    expect(two.after).toContain('Dad and Ofir')
    // nobody to name: the stock gang, not a blank picture
    expect(plan('frame', 'f20-photo', 20, {people: []}).items.length).toBe(4)
    expect(plan('frame', 'f20-photo', 20, {people: ['Dad']}).items.length).toBe(4)
  })

  it('a comparison never has the same answer for every pair', () => {
    for (let i = 0; i < 60; i++) for (const id of [`swap-check-${i}`, `S07:me`, `S38:x${i}`]) {
      const p = plan('compare', id, 10 + (i % 20), {scope: i % 2 ? 'short' : 'full'})
      expect(new Set(p.items.map(x => x.to)).size, id).toBe(2)
    }
  })

  it('the play effect brings its scope and the scene its people to the minigame', () => {
    const life = readFileSync('components/clubs/life/LifeGame.tsx', 'utf8'), tsx = readFileSync('components/clubs/life/MiniGame.tsx', 'utf8')
    expect(life).toMatch(/scope=\{\(overlay\.d as \{scope\?: unknown\}\)\.scope === 'short'/)
    expect(life).toMatch(/people=\{scene\?\.actors\.map\(a => a\.name\)\}/)
    expect(tsx).toMatch(/scope: props\.scope/)
    // every hands movement keeps a way that needs no drag: press and hold, or the keyboard
    expect(tsx).toMatch(/className=\{g\.hold\}/)
    expect(tsx).toMatch(/KEY_DIR\[e\.key\]/)
  })

  it('the same job on the same day opens the same way; another id or another age may not', () => {
    for (const a of ACTIONS) expect(JSON.stringify(plan(a as HandsAction, 'job-x', 12))).toBe(JSON.stringify(plan(a as HandsAction, 'job-x', 12)))
    const variants = new Set(Array.from({length: 24}, (_, i) => plan('wash', `job-carwash-${i}`, 30).variant))
    expect([...variants].sort()).toEqual(['dust', 'mud'])
    expect(plan('deliver', 'job-leaflets', 15).targets.length).toBeLessThan(plan('deliver', 'job-leaflets', 30).targets.length)
  })

  it('stacking puts heavy at the bottom and glass on top', () => {
    const p = plan('stack', 'job-crates', 20)
    for (const it2 of p.items) expect(it2.to).toBe(it2.mark === 'heavy' ? 'bottom' : it2.mark === 'light' ? 'top' : 'middle')
  })

  it('the verdict reads what the hands did — never the clock or the assist mode', () => {
    expect(score(true, 0)).toBe('good'); expect(score(true, 1)).toBe('good'); expect(score(true, 3)).toBe('ok'); expect(score(false, 0)).toBe('slip')
    const src = readFileSync('lib/life/universal/hands.ts', 'utf8')
    const body = src.slice(src.indexOf('export function score'), src.indexOf('/** the meter'))
    expect(body).not.toMatch(/assist|reduced|time|clock|limit/)
    const p = plan('sort', 'job-bottles', 10)
    expect(limitMs(p, true)).toBeGreaterThan(limitMs(p, false))
  })

  it('the minigame opens the hands work for a job and paints only with the club tokens', () => {
    const tsx = readFileSync('components/clubs/life/MiniGame.tsx', 'utf8'), css = readFileSync('components/clubs/life/MiniGame.module.css', 'utf8')
    expect(tsx).toMatch(/handsFor\(props\.id\)/)
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(css).not.toMatch(/\brgb\(/)
  })
})

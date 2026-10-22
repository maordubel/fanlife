/**
 * LIFE · hands — different work feels different in the hands (owner's spec, 22.10.2026, §1 §5 §7).
 */
import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {JOB_HANDS, handsFor, limitMs, plan, score, type HandsAction} from '@/lib/life/universal/hands'

const side = readFileSync('lib/life/universal/content/side.ts', 'utf8')
const jobIds = [...side.matchAll(/\{id: '([a-z-]+)', room: '/g)].map(m => `job-${m[1]}`)
const ACTIONS = ['stack', 'sort', 'wash', 'tray', 'deliver', 'direct', 'invoice', 'assemble', 'unpack', 'hang', 'stencil', 'stitch', 'frame', 'tune'] as const

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
    }
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

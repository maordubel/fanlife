import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
// @ts-expect-error — plain ESM module, no types
import {readPost, plan, visualsFor, printable, drawKit} from '../../scripts/marketing/kit/visual.mjs'

const msg = (app: string, hook: string, visual: string, extra = '', body: string[] = []) =>
  `🗓 <b>Day 1/30 · 26.10 · 14:00</b>\n📌 Post · <b>${app}</b>\n📱 x\n${extra}\n🪝 <b>HOOK</b>\n<b>${hook}</b>\n\n✍️ <b>POST</b>\n${hook}\n\n${body.join('\n')}\n\n👉 https://x\n\n#a\n\n🎨 <i>Visual: ${visual}. x</i>`

describe('DUBEL TEAM kit visuals', () => {
  it('reads the app, hook, template and the real match back out of the message', () => {
    const p = readPost(msg('FAN LIFE', 'Today: A vs B. Ready?', 'T5 Match poster', '⚽ Real match: Hapoel Tel Aviv – Maccabi Haifa · 02.11 20:30\n'))
    expect(p).toMatchObject({app: 'fanlife', template: 'T5', match: {home: 'Hapoel Tel Aviv', away: 'Maccabi Haifa', date: '02.11', time: '20:30'}})
    expect(plan(p)[0]).toMatchObject({t: 'T5-A', data: {time: '20:30', home: ['HAPOEL TEL AVIV']}})
  })
  it('never prints an emoji or a placeholder the kit cannot draw', () => {
    expect(printable('Wallpaper 🧨 “x” ש')).toBe('Wallpaper “x”')
    const w = plan(readPost(msg('OFFSIDES', 'Wallpaper: 🧨', 'T5 Wallpaper 9:16')))
    expect(w[0]).toMatchObject({t: 'T5-D', data: {hook: ['OFFSIDES']}})
    for (const t of ['T2', 'T7 Carousel']) for (const s of plan(readPost(msg('DUBID', 'How to play DUBID', t, '', ['Slide 1: a', 'Slide 2: b', 'Slide 3: c', 'Slide 4: d'])))) if (s.t !== 'T7-1') expect(s.data.noPlaceholders).toBe(true)
  })
  it('draws PNGs: one card, a five-slide carousel, and the app card for a post without a template', async () => {
    const one = await visualsFor(msg('THE WORKER', 'Hapoel isn’t a team. It’s a class.', 'T1 Quote card'))
    expect(one).toHaveLength(1)
    expect(one[0].subarray(1, 4).toString()).toBe('PNG')
    const deck = await visualsFor(msg('DUBID', 'How to play DUBID in 30 seconds', 'T7 Carousel', '', ['Slide 1: Pick one player from every club', 'Slide 2: Pick a captain', 'Slide 3: Players score', 'Slide 4: A table against the whole country']))
    expect(deck).toHaveLength(5)
    expect(await visualsFor('no template here')).toHaveLength(1)
  }, 30_000)
  it('draws every layout the v3 plan uses', async () => {
    const rows: {at: string; main: {app: string; kit: {t: string; data: unknown}}}[] = JSON.parse(readFileSync('scripts/marketing/plan-v3.json', 'utf8'))
    const ts = ['T9-OTD', 'T10-NERDS', 'T5-B', 'T11-SPICY', 'L-GATE', 'L-FACT', 'L-DUBID-SYSTEM', 'L-OFFSIDES-SYSTEM']
    for (const t of ts) {
      const r = rows.find(x => x.main.kit.t === t)!
      expect(r, t).toBeTruthy()
      const png = await drawKit(r.main.kit, r.main.app)
      expect(png.subarray(1, 4).toString(), t).toBe('PNG')
    }
  }, 120_000)
  it('marketing rule: crests and shirts keep their own colours — never two-ink black and white', async () => {
    // @ts-expect-error — plain ESM module, no types
    const {Canvas} = await import('../../scripts/marketing/kit/source/weekly.mjs')
    const c = new Canvas(1080, 1350, 'fanlife', true, {club: 'celtic'}, 'T10-NERDS')
    c.image('assets/stadium.jpg', 0, 0, 100, 100, {id: 'club-crest'})
    c.image('assets/stadium.jpg', 0, 0, 100, 100, {id: 'shirt-slot'})
    for (const id of ['club-crest', 'shirt-slot']) expect(c.items.find((x: string) => x.includes(`id="${id}"`))).not.toContain('filter=')
  })
})

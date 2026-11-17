import {describe, expect, it} from 'vitest'
import {existsSync, readFileSync} from 'node:fs'

// the v4 page builder needs no browser: it returns HTML; render.mjs (Actions only) turns it into PNG and MP4
const load = () => import('../../scripts/marketing/kit/v4/templates.mjs')

const samples: [string, Record<string, unknown>][] = [
  ['L-GATE', {club: {id: 'aek-athens', name: 'AEK Athens'}, gate: 'GATE 5', name: 'SHIRT COLLECTION', headline: 'The club’s shirts, season by season.', body: ['Home, away, third.']}],
  ['L-GATE', {club: {id: 'olympiacos', name: 'Olympiacos'}, gate: 'COMING SOON', name: 'LIFE', headline: 'Your city. Your club. Your life.', body: ['In build.']}],
  ['L-GATE', {gate: 'FAN LIFE · THE BIG GAME', name: 'LEGENDS MANAGER', brand: 'legends', headline: 'Who wears the armband?', body: ['Pick a captain.']}],
  ['L-FACT', {club: {id: 'celtic', name: 'Celtic'}, fact: 'Your first Celtic match. Who took you?', kicker: 'CELTIC · FROM FATHER TO SON'}],
  ['T10-NERDS', {club: {id: 'olympiacos', name: 'Olympiacos'}, level: 'EXPERT', question: 'Which season?', options: ['1999/00', '2001/02', '2002/03', '2020/21']}],
  ['L-DEBATE', {left: {club: 'hapoel-tel-aviv', name: 'Hapoel Tel Aviv'}, right: {club: 'zrinjski-mostar', name: 'Zrinjski Mostar'}, question: 'Best away following in Europe?'}],
  ['T9-OTD', {date: '14 NOV', rows: [{ago: '24 YEARS AGO · UEFA CUP', club: 'Celtic', line: 'Blackburn 0–2 Celtic', year: 2002}]}],
  ['T11-SPICY', {club: {id: 'zrinjski-mostar'}, date: '2 NOVEMBER 2023', home: 'ČELIK ZENICA', away: 'ZRINJSKI MOSTAR', score: '0–6', line: '6 goals clear.'}],
  ['L-FILM', {title: 'Nil–Three at Half-Time. Then This.', kicker: 'WATCH TONIGHT'}],
  ['L-SLIDE', {s: 'cover', n: 1, of: 5, club: {id: 'aek-athens'}, title: 'Welcome to the Union’s house.', kicker: 'ATHENS'}],
  ['L-BINGO', {club: {id: 'celtic'}, cells: Array.from({length: 16}, (_, i) => `Moment ${i + 1}`)}],
  ['L-ZOOM', {s: 'zoom', club: {id: 'celtic'}}],
  ['L-TIER', {club: {id: 'celtic'}}],
  ['L-SHOP', {title: 'Football. Forever. · T-shirt', price: 2399, currency: 'USD', subject: 'fanlife', kind: 'tee'}],
  ['L-SHOP', {title: 'Scarf Up · Mug', price: 699, card: 'v4/art/shop/football-forever-tee-white.jpg', stage: 2}], ['L-SHOP', {title: 'THE KICK · Hoodie', price: 5799, cut: 'v4/art/shop/football-forever-tee-black-cut.png', stage: 1}], ['L-SHOP', {title: 'Match and Fans · T-shirt', price: 2699, photo: 'v4/art/shop/football-forever-tee-white.jpg'}],
  ['L-TEE', {look: 'back', price: 2399}], ['L-TEE', {look: 'fold', price: 2399}], ['L-TEE', {look: 'look', price: 2399}],
  ['L-FRAME', {club: {id: 'celtic'}, manager: 'Dad', names: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'], format: 'framed'}],
  ['L-GTA', {art: 'cover-life', n: 1, mission: 'The march', headline: 'The whole street sings.'}], ['L-GTA', {art: 'next-generation', headline: 'Keep close, kid.'}],
  ['L-FILM', {club: {id: 'panathinaikos'}, title: 'Καλημέρα, Παναθηναϊκέ', cta: 'Δες το τώρα', channel: 'Ποδοσφαιρικά Παραμύθια'}],
  ['L-ARTICLE', {title: 'LIFE: An Open-World Football Fan Game', lede: 'Football supporters have never had one of their own.'}],
]

describe('social pictures v4', () => {
  it('builds a page for every planned template, feed and story, with the house fonts', async () => {
    const {page} = await load()
    for (const [t, d] of samples) {
      for (const story of [false, true]) {
        const html = await page(t, 'fanlife', d, {story})
        expect(html, t).toBeTruthy()
        expect(html).toContain('@font-face{font-family:Archivo')
        expect(html).toContain(`height:${story ? 1920 : 1350}px`)
        expect(html).not.toMatch(/style="[^"]*"[^>]*\sstyle="/) // one style attribute per element (a second is ignored)
      }
    }
  }, 60_000) // every template × feed/story with fonts inlined: ~5 s alone, longer on a loaded CI runner

  it('every feature post carries a dare and a call to action', async () => {
    const {page, dareFor} = await load()
    for (const t of ['L-GATE', 'L-FACT', 'T10-NERDS', 'L-BINGO', 'L-ZOOM', 'T9-OTD', 'L-FILM']) expect(dareFor(t, {}), t).not.toBe('')
    const html = await page('L-GATE', 'fanlife', samples[0]![1])
    expect(html).toContain('class="dare"')
    expect(html).toContain('class="btn"')
  })

  it('returns null for a template it does not draw, so the v2 picture is used', async () => {
    const {page} = await load()
    expect(await page('L-OFFSIDES-TODAY', 'offsides', {})).toBeNull()
  })

  it('the sender prefers the pictures drawn ahead and exposes the story', () => {
    const v = readFileSync('scripts/marketing/kit/visual.mjs', 'utf8')
    expect(v).toContain('kit?.v4?.png')
    expect(v).toContain('export async function storyFor')
  })

  it('ships its migration, workflow and fonts', () => {
    expect(readFileSync('supabase/migrations/20261114110000_worker_marketing_v4.sql', 'utf8')).toContain("p.kind = 'fixed'")
    expect(readFileSync('.github/workflows/marketing-pictures.yml', 'utf8')).toContain('prerender.mjs')
    for (const f of ['archivo-latin-wdth-italic.woff2', 'shrikhand-latin-400-normal.woff2', 'ultra-latin-400-normal.woff2', 'OFL.txt']) expect(existsSync(`scripts/marketing/kit/v4/fonts/${f}`), f).toBe(true)
  })
})

describe('social cleanup', () => {
  it('flags repeats (keeps the first), test posts and empty posts — nothing else', async () => {
    // @ts-expect-error plain ESM
    const {flag} = await import('../../scripts/marketing/social-cleanup.mjs')
    const items = [
      {id: 'a', t: '2026-11-01', text: 'Who scored for Olympiacos against Rangers? Answer in the comments', pic: true},
      {id: 'b', t: '2026-11-02', text: 'Who scored for Olympiacos against Rangers? Answer in the comments https://x.y', pic: true},
      {id: 'c', t: '2026-11-03', text: 'test', pic: true},
      {id: 'd', t: '2026-11-04', text: '', pic: false},
      {id: 'e', t: '2026-11-05', text: 'A completely different post about Celtic shirts and the archive', pic: true},
    ]
    const f = flag(items, (x: {text: string}) => x.text, (x: {pic: boolean}) => x.pic)
    expect(f.map((x: {id: string}) => x.id).sort()).toEqual(['b', 'c', 'd'])
  })

  it('the shop campaign fills a random live product, the film a confirmed id, the frame campaign waits for its feature', async () => {
    const pre = await import('../../scripts/marketing/kit/v4/prerender.mjs')
    const list = [{id: 'a', title: 'Celtic 7-1 · Mug', subject: 'fanlife', kind: 'mug', printify: {images: ['x'], priceFrom: 699, currency: 'USD'}}, {id: 'b', title: 'THE KICK · Hoodie', subject: 'fanlife', kind: 'hoodie', printify: {images: ['y'], priceFrom: 5799, currency: 'USD'}}]
    const used = new Set<string>()
    const one = pre.pickProduct(list, used, () => 0), two = pre.pickProduct(list, used, () => 0)
    expect(one.id).not.toBe(two.id)
    const f = pre.shopFill(list[1]!)
    expect(pre.fillWords('{product} — from {price}', f.words)).toBe('THE KICK · Hoodie — from $57.99')
    expect(f.data.kicker).toBe('The FAN LIFE shop · Hoodie')
    expect(pre.HOLDS['frame-xi']).toBe('app/api/shop/personal/route.ts')
    expect(pre.HOLD_ART['frame-xi']!.test('frame-xi-celtic.jpg')).toBe(true)
    const imgs = ['https://x/a.jpg?camera_label=front', 'https://x/b.jpg?camera_label=size-chart', 'https://x/c.jpg?camera_label=person-1-front', 'https://x/d.jpg?camera_label=close-up']
    expect(pre.pickArt(imgs, 0).scene).toContain('person-1') // a real scene first
    expect(pre.pickArt(imgs.filter(u => !u.includes('person')), 1)).toMatchObject({scene: null, studio: imgs[0], detail: imgs[3]}) // or the studio shot, cut clean
    expect(pre.pickArt(imgs.slice(0, 2), 0).scene).toBe(null) // never the size chart
    expect(pre.ytId('https://youtu.be/I9HYkLFJaeI')).toBe('I9HYkLFJaeI')
    expect(readFileSync('scripts/marketing/kit/v4/prerender.mjs', 'utf8')).toMatch(/maxres\$\{k\}\.jpg/) // a frame of the film, never the thumbnail
    const {page} = await load()
    expect(await page('L-FILM', 'fanlife', {club: {id: 'panathinaikos'}, title: 'Καλημέρα'}, {})).toContain('lang="el"')
    expect(await page('L-FILM', 'fanlife', {club: {id: 'panathinaikos'}, title: 'x'}, {})).not.toContain('--s2:#D71920')
    for (const f of ['cover-life', 'cover-fanlife', 'next-generation', 'panels-wide', 'panels-graffiti']) expect(existsSync(`scripts/marketing/kit/v4/art/life-gta/${f}.jpg`), f).toBe(true)
  })
})

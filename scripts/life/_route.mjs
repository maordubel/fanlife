import { chromium } from 'playwright'
const WHERE = process.argv[2] ?? 'route'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const p = await b.newPage({ viewport: { width: 1000, height: 640 } })
p.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 160)))
await p.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' })
await p.evaluate((WHERE) => {
  const e = [
    { t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' },
    { t: 'chapter.entered', chapter: '1986' }, { t: 'moved', to: WHERE },
    { t: 'flag.raised', flag: 'onboard:street' }, { t: 'flag.raised', flag: 'onboard:moved' },
    { t: 'flag.raised', flag: 'onboard:acted' },
  ]
  localStorage.setItem('the-worker:life:probe', '1')
  localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events: e, savedAt: new Date().toISOString() }))
}, WHERE)
await p.goto('http://127.0.0.1:3000/life', { waitUntil: 'domcontentloaded' })
await p.waitForSelector('canvas')
await p.waitForTimeout(8000)
console.log('start', JSON.stringify(await p.evaluate(() => window.__life?.debug.where())))
await p.keyboard.down('ArrowRight')
await p.waitForTimeout(1800)
await p.keyboard.up('ArrowRight')
await p.waitForTimeout(700)
console.log('after right', JSON.stringify(await p.evaluate(() => window.__life?.debug.where())))
await p.screenshot({ path: `data/life-shots/scale-${WHERE}.png` })
await b.close()

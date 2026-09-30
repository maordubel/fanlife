import { chromium } from 'playwright'

/**
 * 11.3.1991 — מאור נתקע, ואסור שזה יקרה.
 *
 * His report, 6.9.2026: no permission from Rachel, the evening arrives, and there is
 * nothing left to press. This reproduces that exact save — homework done, asked, refused,
 * standing in the STREET when the clock passes eight — and then asserts the two things
 * that must be true of every 1991 night: `derby:over` is eventually raised wherever he is
 * standing, and the chapter can be finished afterwards.
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const page = await browser.newPage({ viewport: { width: 420, height: 800 } })
const errors = []
page.on('pageerror', (err) => errors.push(String(err).slice(0, 200)))

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('the-worker:life:probe', '1')
  localStorage.setItem(
    'the-worker:life',
    JSON.stringify({
      version: 3,
      identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
      year: 1991,
      events: [
        { t: 'flag.raised', flag: 'life:opening' },
        { t: 'flag.raised', flag: 'prologue:done' },
        { t: 'chapter.entered', chapter: '1986' },
        { t: 'chapter.entered', chapter: '1990' },
        { t: 'chapter.entered', chapter: '1991' },
        // the exact biography he described: school done, homework done, asked, told no
        ...['onboard:street', 'onboard:moved', 'onboard:acted', 'school:done', 'hw:given', 'hw:done', 'asked:mum', 'permission:no', 'saw:ussNight'].map(
          (flag) => ({ t: 'flag.raised', flag }),
        ),
      ],
      savedAt: new Date().toISOString(),
    }),
  )
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(2500)

// stand in the street — the room that used to have no way out of the evening
await page.evaluate(() => window.__life?.debug.goTo('street'))
await page.waitForTimeout(2500)
const before = await page.evaluate(() => ({
  where: window.__life?.debug.where(),
  derbyOver: Boolean(window.__life?.snapshot?.().state?.flags?.['derby:over']),
}))
console.log('start:', JSON.stringify(before.where), 'derby:over =', before.derbyOver)

// push the clock past tip-off and then past the curfew, the way an evening does
for (const jump of [60 * 7, 60 * 2, 60]) {
  await page.evaluate((m) => window.__life?.debug.jump(m), jump)
  await page.waitForTimeout(2200)
  const now = await page.evaluate(() => {
    const state = window.__life?.snapshot?.().state
    return {
      minute: state?.minute,
      scene: window.__life?.debug.where()?.scene,
      derbyOver: Boolean(state?.flags?.['derby:over']),
      heardStreet: Boolean(state?.flags?.['heard:street']),
      chapterDone: Boolean(state?.chapterDone),
    }
  })
  console.log(`after +${jump}m:`, JSON.stringify(now))
}

const end = await page.evaluate(() => {
  const state = window.__life?.snapshot?.().state
  return { derbyOver: Boolean(state?.flags?.['derby:over']), objective: window.__life?.snapshot?.().objectiveHe ?? null }
})
console.log('RESULT derby:over =', end.derbyOver, '| objective =', end.objective)
console.log('page errors:', errors.length ? errors : 'none')
console.log(end.derbyOver ? 'PASS — the night resolved and the day can be finished' : 'FAIL — still stuck')
await browser.close()
process.exit(end.derbyOver ? 0 : 1)

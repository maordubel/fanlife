/**
 * סרטון של ההליכה — כי ריצוד ורציפות לא נראים בצילום סטטי.
 *
 * הדף נטען **פעם אחת**, המוט נתפס ומוחזק, והפריימים נלקחים תוך כדי. זה חשוב: כל טעינה
 * מחדש הייתה מאפסת את המצב ומראה קפיצות שהמשחק לא עושה. מה שנשמר כאן הוא בדיוק מה
 * שהעין רואה על הטלפון.
 *
 *   node scripts/life/film-city.mjs 'mission=bagForTheSteward' 90 out.mp4
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const query = process.argv[2] ?? 'mission=bagForTheSteward'
const frames = Number(process.argv[3] ?? 90)
const out = process.argv[4] ?? '/tmp/cityproof/walk'
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true })
page.on('console', (m) => { if (m.type() === 'error' && !/TUNNEL|googl|pagead/.test(m.text())) console.log('C', m.text().slice(0, 160)) })
await page.goto(`http://localhost:3311/city?${query}`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-ready="1"]', { timeout: 25000 }).catch(() => console.log('NOT READY'))
await page.waitForTimeout(1200)

// **המוט נתפס במרכזו המדויק.** תפיסה בקירוב מוסיפה רכיב אופקי קבוע, והמצלמה מסתובבת
// לאט לאורך כל הסרטון — מה שנראה כאילו הרחוב עצמו נסחף. המרכז נמדד מהאלמנט עצמו.
const stick = await page.evaluate(() => {
  const deck = document.querySelector('[data-life="deck"]')
  if (!deck) return null
  const pads = [...deck.querySelectorAll('*')].filter((el) => {
    const r = el.getBoundingClientRect()
    return r.width > 70 && r.height > 70 && Math.abs(r.width - r.height) < 24
  })
  const pad = pads.sort((a, b) => a.getBoundingClientRect().x - b.getBoundingClientRect().x)[0]
  if (!pad) return null
  const r = pad.getBoundingClientRect()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
})
const sx = stick?.x ?? 70
const sy = stick?.y ?? 760
console.log('stick at', sx.toFixed(0), sy.toFixed(0))
await page.mouse.move(sx, sy)
await page.mouse.down()
await page.mouse.move(sx, sy - 58, { steps: 4 })

for (let i = 0; i < frames; i += 1) {
  await page.screenshot({ path: `${out}/${String(i).padStart(3, '0')}.png` })
  if (i % 15 === 0) {
    const along = await page.evaluate(() => document.querySelector('[data-along]')?.getAttribute('data-along'))
    console.log(`frame ${i}  along ${along} m`)
  }
}
await page.mouse.up()
await browser.close()

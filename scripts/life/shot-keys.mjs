/**
 * הצילומים של שלושת המפתחות — the cast card, the transition, and the waiting strip.
 *
 *   node scripts/life/shot-keys.mjs [http://127.0.0.1:3000]
 *
 * Three features that only exist on the glass. If they are not photographed they are not
 * finished, and this project has shipped a bare room once already.
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})

async function open(page, chapter, where, extra = []) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([chapter, where, extra]) => {
      const events = [
        { t: 'flag.raised', flag: 'life:opening' },
        { t: 'flag.raised', flag: 'prologue:done' },
        { t: 'chapter.entered', chapter },
        { t: 'moved', to: where },
        { t: 'flag.raised', flag: 'onboard:street' },
        { t: 'flag.raised', flag: 'onboard:moved' },
        { t: 'flag.raised', flag: 'onboard:acted' },
        { t: 'flag.raised', flag: 'life:knows:hall' },
        { t: 'flag.raised', flag: 'saw:road' },
        ...extra.map((flag) => ({ t: 'flag.raised', flag })),
      ]
      localStorage.setItem('the-worker:life:probe', '1')
      localStorage.setItem(
        'the-worker:life',
        JSON.stringify({
          version: 3,
          identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
          year: 1991,
          events,
          savedAt: new Date().toISOString(),
        }),
      )
    },
    [chapter, where, extra],
  )
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 20000 })
  await page.waitForTimeout(3200)
}

// ------------------------------------------------------- 1 · a cast introduction ----
{
  const page = await browser.newPage({ viewport: { width: 900, height: 620 } })
  await open(page, '1986', 'kiosk')
  await page.evaluate(() => window.__life?.talk('rafi-a4'))
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'data/life-shots/key-cast.png' })
  console.log('cast card:', await page.evaluate(() => Boolean(document.querySelector('[data-life="cast-card"]'))))
  await page.close()
}

// ---------------------------------------------------------- 2 · a transition cut ----
{
  const page = await browser.newPage({ viewport: { width: 900, height: 620 } })
  await open(page, '1991', 'street')
  // the promenade: street → Ussishkin, south to north, with no hour window on it
  await page.evaluate(() => window.__life?.goTo('ussishkin'))
  // the walk, the doorway dwell, the fade, and only then the film
  let caught = false
  for (let i = 0; i < 24 && !caught; i += 1) {
    await page.waitForTimeout(500)
    caught = await page.evaluate(() => Boolean(document.querySelector('[data-life="film-cut"]')))
    if (caught) await page.screenshot({ path: 'data/life-shots/key-film.png' })
  }
  console.log('film cut:', caught)
  await page.close()
}

// ------------------------------------------------------------ 3 · the waiting strip --
{
  const page = await browser.newPage({ viewport: { width: 900, height: 620 } })
  // the chapter flag is what the clock beat waits behind; without it there is nothing
  // to wait for, which is also correct — a banner with no subject is wallpaper.
  await open(page, 'a4-shirt', 'kiosk', ['life:a:d4', 'own:shopnews:a4-shirt'])
  await page.waitForTimeout(2600)
  // a card may be up (a cast introduction); tap it away so the strip is the subject
  for (let i = 0; i < 4; i += 1) {
    await page.mouse.click(450, 310)
    await page.waitForTimeout(400)
  }
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'data/life-shots/key-waiting.png' })
  console.log('waiting strip:', await page.evaluate(() => Boolean(document.querySelector('[data-life="waiting"]'))))
  await page.close()
}

await browser.close()

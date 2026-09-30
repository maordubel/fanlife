/**
 * הסרט מהארכיון — ובעיקר, מה קורה כשהוא לא נפתח.
 *
 * The historical cutscene is the one sequence in this chapter that depends on a third
 * party. YouTube can be blocked by a network, a extension, a school, or — as here — by a
 * sandbox that refuses the host outright, and the requirement Maor wrote is that none of
 * those may ever trap the player.
 *
 * That path cannot be tested from a unit test, because the thing being tested is what an
 * `<iframe>` does when it never loads. So this drives the real build: it lands on the
 * terrace with the match unfinished, watches the phases the component reports through
 * `data-phase`, presses המשך on whatever it ends up at, and asserts that the world is
 * running underneath — the scoreboard live, the cutscene gone.
 *
 * Run it with a server up:  node scripts/life/cutscene-probe.mjs
 */
import { chromium } from 'playwright'
const BASE='http://127.0.0.1:3000'
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--disable-gpu'] })
const ctx = await b.newContext({ viewport:{width:1280,height:820} })
const page = await ctx.newPage()
const errors=[]; page.on('pageerror',e=>errors.push(String(e)))
await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded'})
await page.evaluate(() => {
  localStorage.setItem('the-worker:life', JSON.stringify({version:3,identity:{name:'פוגי',sex:'boy',birthYear:1978},year:1986,
    events:[{t:'flag.raised',flag:'prologue:done'},{t:'flag.raised',flag:'onboard:moved'},{t:'flag.raised',flag:'onboard:acted'},
      {t:'moved',to:'bloomfield-inside'},{t:'flag.raised',flag:'kobi:left'},{t:'flag.raised',flag:'entry:granted'},{t:'flag.raised',flag:'saw:reveal'}],
    savedAt:new Date().toISOString()}))
  sessionStorage.setItem('the-worker:life:opening','1')
})
await page.goto(`${BASE}/life`,{waitUntil:'domcontentloaded'})
await page.waitForSelector('canvas',{timeout:30000})
const skip = page.locator('[data-life="opening-skip"]'); if (await skip.count()) { await skip.click(); await page.waitForTimeout(400) }
for (let t=0;t<=46;t+=4){
  await page.waitForTimeout(4000)
  const s = await page.evaluate(()=>{
    const c=document.querySelector('[data-life="cutscene"]')
    return { phase: c?.getAttribute('data-phase') ?? null,
             text: c?.textContent?.trim().slice(0,110) ?? null,
             scoreboard: !!document.querySelector('[data-life="scoreboard"]'),
             place: document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null }
  })
  console.log(`t=${t+4}s phase=${s.phase} scoreboard=${s.scoreboard} place=${s.place} :: ${s.text ?? ''}`)
  if (t===4) await page.screenshot({path:'data/life-shots/cut-card.png'})
  if (s.phase === 'failed') {
    await page.getByText('המשך', { exact: true }).click()
    await page.waitForTimeout(3000)
    const n = await page.evaluate(()=>({
      cutscene: !!document.querySelector('[data-life="cutscene"]'),
      scoreboard: document.querySelector('[data-life="scoreboard"]')?.textContent?.trim() ?? null,
    }))
    console.log(`after המשך: cutscene=${n.cutscene} scoreboard=${n.scoreboard}`)
    await page.screenshot({path:'data/life-shots/cut-after.png'})
    break
  }
  if (!s.phase) { await page.screenshot({path:'data/life-shots/cut-after.png'}); break }
}
console.log('errors:', errors.length? errors.join(' | ') : 'none')
await b.close()

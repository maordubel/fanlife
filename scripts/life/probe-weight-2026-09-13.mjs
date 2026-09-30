/**
 * כמה באמת יורד לטלפון עד שרואים חדר — נמדד ברשת, לא מוערך.
 *
 * הבדיקה סופרת כל תשובה שהדפדפן קיבל עד לרגע שהמשחק מצייר, ומפרידה בין JS, גרפיקה
 * וכל השאר. זה המספר שמאור מרגיש כשהוא אומר "לוקח מלא זמן".
 */
import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:3, hasTouch:true })
const hits = []
p.on('response', async (r) => {
  const u = r.url()
  if (!u.startsWith('http://localhost')) return
  try { hits.push({ u, n: (await r.body()).length, t: r.request().resourceType() }) } catch {}
})
const t0 = Date.now()
await p.goto('http://localhost:3311/', { waitUntil:'domcontentloaded' })
await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('the-worker:life:probe','1') })
hits.length = 0
await p.goto('http://localhost:3311/life', { waitUntil:'networkidle' })
for (let i=0;i<40;i++){
  await p.waitForTimeout(600)
  await p.mouse.click(195,420).catch(()=>{})
  if (await p.evaluate(()=>!!document.querySelector('[data-life="deck"]'))) break
}
await p.waitForTimeout(2500)
const ms = Date.now()-t0
const sum = (f) => hits.filter(f).reduce((s,h)=>s+h.n,0)
const art = sum(h=>/\/life\/art\//.test(h.u))
const js  = sum(h=>/\.js(\?|$)/.test(h.u))
const rest= sum(()=>true) - art - js
console.log(JSON.stringify({
  seconds:+(ms/1000).toFixed(1), requests:hits.length,
  artMB:+(art/1048576).toFixed(2), jsMB:+(js/1048576).toFixed(2), restMB:+(rest/1048576).toFixed(2),
  totalMB:+((art+js+rest)/1048576).toFixed(2),
  webp: hits.filter(h=>/\.webp$/.test(h.u)).length, png: hits.filter(h=>/\/life\/art\/.*\.png$/.test(h.u)).length,
  failed: hits.filter(h=>h.n===0 && /\/life\/art\//.test(h.u)).length,
}, null, 1))
await p.screenshot({ path:'/tmp/weight.png' })
await b.close()

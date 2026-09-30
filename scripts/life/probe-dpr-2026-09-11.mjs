/**
 * כמה פיקסלים אמיתיים יש בקנבס — נמדד, לא מוצהר.
 *
 * זאת הבדיקה שגילתה שכל המשחק הדו־ממדי צויר בשליש רזולוציה: חוצץ של 390×842 נמתח על
 * מסך של 1170×2526. היחס בין `canvas.width` לרוחב ה-CSS חייב להיות צפיפות הפיקסלים
 * של המכשיר; כל דבר אחר הוא טשטוש שאי אפשר לפצות עליו בשום גרפיקה.
 */
import { chromium } from 'playwright'
const dpr = Number(process.argv[2] ?? 3)
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=swiftshader','--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:dpr, hasTouch:true })
await p.goto('http://localhost:3311/life', { waitUntil:'networkidle' }).catch(()=>{})
await p.waitForTimeout(6000)
const read = async () => p.evaluate(() => {
  const c = document.querySelector('canvas'); if (!c) return null
  const r = c.getBoundingClientRect()
  return { dpr: devicePixelRatio, cssW: Math.round(r.width), cssH: Math.round(r.height),
           bufW: c.width, bufH: c.height, ratio: +(c.width / r.width).toFixed(2) }
})
console.log('פתיחה   ', JSON.stringify(await read()))
await p.setViewportSize({ width: 430, height: 932 })
await p.waitForTimeout(1500)
console.log('אחרי שינוי', JSON.stringify(await read()))
await p.screenshot({ path: process.argv[3] ?? '/tmp/dpr.png' })
await b.close()

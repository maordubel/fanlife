/**
 * ביקורת פרופורציות — every body in every room, measured in metres, from the live game.
 *
 *   node scripts/life/scale-audit.mjs [http://127.0.0.1:3000]
 *
 * A `size` in `scenes.ts` can be right on its own and wrong beside the man next to it, and
 * the only place that shows is the glass. This opens every room in every era it has, asks
 * the running scene how tall each body is actually being drawn (`__life.debug.bodies()`),
 * converts that to metres against the room's own metre, and flags anybody outside the
 * range a human being comes in.
 *
 * The ranges are deliberately wide. This is not a style check — it is looking for the man
 * drawn at ninety centimetres and the child drawn at one metre eighty.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const OUT = 'data/life-shots/scale'
mkdirSync(OUT, { recursive: true })

/** [room, chapter] — every room in a chapter that actually uses it */
const ROOMS = [
  ['bedroom', 'a4-shirt'], ['home', 'a4-shirt'], ['kitchen', 'a4-shirt'],
  ['street', 'a4-shirt'], ['kiosk', 'a4-shirt'], ['pitch', 'a2-alley'],
  ['ussishkin-outside', 'a3-hall'], ['ussishkin-hall', 'a3-hall'],
  ['street', '1986'], ['kiosk', '1986'], ['route', '1986'],
  ['bloomfield-outside', '1986'], ['bloomfield-inside', '1986'],
  ['street', '1990'], ['kiosk', '1990'], ['bloomfield-outside', '1990'],
  ['classroom', '1991'], ['schoolyard', '1991'], ['ussishkin-hall', '1991'],
  ['kiosk', '1995-sinai'], ['kiosk', '1996-army'], ['ussishkin-outside', '1993-cup'],
  ['ussishkin-outside', '1997-basket'], ['ussishkin-outside', '1999-basket'],
  ['bloomfield-outside', '1999-cup'], ['gate5', '1998-laces'],
  ['allenby', '1986'], ['allenby', '1991'], ['allenby', '2000-double'],
]

/** what a person may plausibly be, in metres */
const FLOOR = 1.0
const CEILING = 1.95
/** …unless the id says it is a child, and children in this game are 6 to 15 */
const CHILD = /pogi|kid|child|amit|ofir|keren|efi|boy|girl|youngA|youngB/i
const CHILD_FLOOR = 1.15
const CHILD_CEILING = 1.8
/** a person in a chair is not a shorter person — `heights.ts` shortens them on purpose */
const SEATED = /-(sit|sitA|sitB|chair|kneel|crouch|bent)/

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } })
page.on('pageerror', (error) => console.log('PAGEERROR', String(error).slice(0, 160)))

const faults = []
const report = []

for (const [where, chapter] of ROOMS) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([where, chapter]) => {
      const events = [
        { t: 'flag.raised', flag: 'life:opening' },
        { t: 'flag.raised', flag: 'prologue:done' },
        { t: 'chapter.entered', chapter },
        { t: 'moved', to: where },
        { t: 'flag.raised', flag: 'saw:allenby' },
        ...['onboard:street', 'onboard:moved', 'onboard:acted', 'life:knows:hall', 'saw:road', 'saw:reveal', 'entry:granted', 'uss:arrived']
          .map((flag) => ({ t: 'flag.raised', flag })),
      ]
      localStorage.setItem('the-worker:life:probe', '1')
      localStorage.setItem(
        'the-worker:life',
        JSON.stringify({
          version: 3,
          identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
          year: 1986,
          events,
          savedAt: new Date().toISOString(),
        }),
      )
    },
    [where, chapter],
  )
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 20000 })
  await page.waitForTimeout(2600)

  const bodies = await page.evaluate(() => window.__life?.debug.bodies() ?? [])
  const scene = await page.evaluate(() => window.__life?.debug.where()?.scene ?? null)
  if (scene !== where) {
    report.push(`${where} @ ${chapter}: landed in ${scene} instead — skipped`)
    continue
  }
  writeFileSync(`${OUT}/${where}-${chapter}.png`, await page.screenshot())

  report.push(`\n── ${where} · ${chapter} ${'─'.repeat(Math.max(0, 34 - where.length - chapter.length))}`)
  for (const body of bodies) {
    const child = CHILD.test(body.who) || CHILD.test(body.art)
    const seated = SEATED.test(body.art)
    const low = (child ? CHILD_FLOOR : FLOOR) * (seated ? 0.7 : 1)
    const high = (child ? CHILD_CEILING : CEILING) * (seated ? 0.8 : 1)
    const bad = body.metres < low || body.metres > high
    report.push(
      `  ${bad ? '✗' : ' '} ${String(body.who).padEnd(22)} ${String(body.art).padEnd(18)} y=${body.y}  ${body.metres.toFixed(2)} m`,
    )
    if (bad) faults.push({ room: where, chapter, ...body, low, high })
  }
}

console.log(report.join('\n'))
console.log(`\n${faults.length} bodies outside a human height:\n`)
for (const fault of faults) {
  console.log(`  ${fault.room} @ ${fault.chapter}: ${fault.who} (${fault.art}) is ${fault.metres} m — wanted ${fault.low}–${fault.high}`)
}
await browser.close()
process.exit(faults.length > 0 ? 1 : 0)

/**
 * הזנב מצביע על מי שמדבר — proved in a browser, because the arithmetic is only half of it.
 *
 * `tests/life-tail.test.ts` holds `tailOffset` to its maths. The other half cannot be
 * unit-tested at all: whether `WorldScene.anchorFor` resolves the right person, and
 * whether the camera transform behind it is the right one. A missing axis flip or a wrong
 * camera rectangle looks completely plausible in a screenshot and points the tail at the
 * person OPPOSITE the speaker, so this compares the anchor the engine hands out against
 * where the runtime says that body actually is.
 *
 * **Four things this probe learned the hard way, all of them written down in rules:**
 *
 *  · The first run measured a build from before the change. `disk === served` on the page
 *    chunk is not enough when the edit is in a shared chunk — rebuild, then check (rule 50).
 *  · `pkill -f "next start"` matched the shell that ran it and killed the caller (rule 54).
 *  · It opened `neighbour` on the street and got `null`, which was CORRECT: at that minute
 *    the schedule has nobody on the street at all, and `anchorFor` answering null for a
 *    person who is not in the room is the honest answer. A probe that tests an empty room
 *    reports a working engine as broken.
 *  · So it asks the room who is in it first, and always checks the PLAYER, who is the one
 *    body guaranteed to be on the glass.
 *
 *   node scripts/life/tail-probe-2026-09-16.mjs [http://127.0.0.1:3000]
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
const page = await (await browser.newContext({ viewport: { width: 1000, height: 640 } })).newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.route(
  '**://{www.google.com,accounts.google.com,android.clients.google.com,pagead2.googlesyndication.com,www.googletagmanager.com}/**',
  (r) => r.abort(),
)

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  window.localStorage.setItem('the-worker:life:probe', '1')
  window.localStorage.setItem(
    'the-worker:life',
    JSON.stringify({
      version: 3,
      identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
      year: 1986,
      events: [
        { t: 'flag.raised', flag: 'prologue:done' },
        { t: 'flag.raised', flag: 'onboard:moved' },
        { t: 'flag.raised', flag: 'onboard:acted' },
      ],
      savedAt: new Date().toISOString(),
    }),
  )
  window.sessionStorage.setItem('the-worker:life:opening', '1')
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 60000 })
await page.waitForTimeout(5000)

const out = { errors, checks: [] }
const where = await page.evaluate(() => window.__life?.debug?.where?.() ?? null)

// 1 — the player. The one body always on the glass, so the one check that always runs.
const player = await page.evaluate(() => window.__life?.debug?.anchor?.('פוגי') ?? null)
const drift = player?.anchor != null && where?.x != null ? Math.abs(player.anchor - where.x) : null
out.checks.push({
  name: 'the anchor agrees with where the runtime says the boy is',
  scene: where?.scene ?? null,
  playerX: where?.x ?? null,
  anchor: player?.anchor ?? null,
  drift,
  pass: drift != null && drift < 0.06,
})

// 2 — whoever else is in this room, if anybody is
const cast = player?.names ?? []
if (cast.length) {
  const [, nameHe, talk] = cast[0].split('|')
  await page.evaluate((id) => window.__life?.talk?.(id), talk)
  await page.waitForTimeout(1200)
  const seen = await page.evaluate(() => {
    const box = document.querySelector('[data-life="dialogue"]')
    const side = box?.querySelector('[data-side]')
    const sheet = side?.lastElementChild
    const canvas = document.querySelector('canvas')
    if (!sheet || !canvas) return null
    const tail = [...sheet.querySelectorAll('span[aria-hidden="true"]')].find((el) => el.className.includes('rotate-45'))
    return { style: tail?.getAttribute('style') ?? null, side: side.getAttribute('data-side') }
  })
  out.checks.push({
    name: 'a speaker standing in the room gets an anchored tail',
    who: nameHe,
    conversation: talk,
    tailStyle: seen?.style ?? null,
    pass: Boolean(seen?.style?.includes('inset-inline-start')),
  })
} else {
  out.checks.push({ name: 'a speaker standing in the room gets an anchored tail', pass: null, note: `nobody in ${where?.scene}` })
}

out.pass = out.checks.every((c) => c.pass !== false) && errors.length === 0
console.log(JSON.stringify(out, null, 2))
await browser.close()
process.exit(out.pass ? 0 : 1)

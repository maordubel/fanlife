/**
 * LIFE, universal — the acceptance script. Plays a whole life in a real browser.
 *
 *   npx tsx scripts/life/universal-play-probe.ts http://127.0.0.1:3200 --club=olympiacos [--phone] [--chapters=3] [--pick=0] [--shots=/tmp/dir] [--lang=he] [--story=2]
 *
 * It does what a supporter does and nothing a supporter cannot: it walks the body to people,
 * things and doors through the runtime's own `goTo`, presses the buttons that are on the screen,
 * answers questions, plays the small games, and reads the cards. It does not know the story: it
 * goes to the room the current objective names and tries what is there. A life that cannot be
 * finished this way — or a page error, a failed request, an engine error — is a failure.
 */
import {chromium, type Page} from 'playwright'
import {mkdirSync} from 'node:fs'

const arg = (name: string, fallback = '') => (process.argv.find(a => a.startsWith(`--${name}=`)) || '').split('=')[1] || fallback
const base = process.argv[2]?.startsWith('http') ? process.argv[2] : 'http://127.0.0.1:3200'
const club = arg('club', 'olympiacos'), phone = process.argv.includes('--phone'), shots = arg('shots'), lang = arg('lang', 'en'), story = arg('story')
const maxChapters = Number(arg('chapters', '99')), pick = Number(arg('pick', '0'))
const size = arg('size') ? arg('size').split('x').map(Number) as [number, number] : phone ? [390, 844] as [number, number] : [1440, 900] as [number, number]
if (shots) mkdirSync(shots, {recursive: true})
const tag = `${club}-${size[0]}`

type Plan = {objective: string | null; room: string | null; doors: {id: string; room: string; to: string; locked: boolean}[]} | null
type Snap = {phase: string; busy: boolean; room: string | null; chapter: string | null; flags: string; plan: Plan; actors: {id: string; talk: string | null}[]; spots: {id: string}[]; where: {moving: boolean; frozen: boolean} | null}

const snap = (page: Page) => page.evaluate(() => {
  const p = (window as unknown as {__lifeProbe?: {state(): {room: string | null; chapter: string | null; flags: Record<string, unknown>; keeps: string[]; wear: string; time: string} | null; scene(): {actors: {id: string; talk: string | null}[]; spots: {id: string}[]} | null; phase(): string; busy(): boolean; plan(): unknown; runtime(): {where(): {moving: boolean; frozen: boolean} | null} | null}}).__lifeProbe
  if (!p) return null
  const s = p.state(), sc = p.scene()
  return {phase: p.phase(), busy: p.busy(), room: s?.room ?? null, chapter: s?.chapter ?? null, flags: JSON.stringify([s?.flags, s?.keeps, s?.wear, s?.time]), plan: p.plan(), actors: sc?.actors.map(a => ({id: a.id, talk: a.talk})) ?? [], spots: sc?.spots.map(x => ({id: x.id})) ?? [], where: p.runtime()?.where() ?? null}
}) as Promise<Snap | null>

const visible = async (page: Page, sel: string) => (await page.locator(sel).count()) > 0 && await page.locator(sel).first().isVisible()
const press = async (page: Page, sel: string) => { try { await page.locator(sel).first().click({timeout: 4000}); return true } catch { return false } }
const goTo = (page: Page, kind: string, id: string) => page.evaluate(([k, i]) => (window as unknown as {__lifeProbe: {runtime(): {goTo(k: string, i: string): boolean} | null}}).__lifeProbe.runtime()?.goTo(k!, i!) ?? false, [kind, id])

/** The next door on a way of unlocked doors from `from` to `to`. */
function doorToward(plan: NonNullable<Plan>, from: string, to: string): string | null {
  const seen = new Set([from]), queue: {room: string; first: string | null}[] = [{room: from, first: null}]
  while (queue.length) {
    const cur = queue.shift()!
    if (cur.room === to) return cur.first
    for (const d of plan.doors) if (d.room === cur.room && !d.locked && !seen.has(d.to)) { seen.add(d.to); queue.push({room: d.to, first: cur.first ?? d.id}) }
  }
  return null
}

async function main(): Promise<number> {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  const context = await browser.newContext({viewport: {width: size[0], height: size[1]}, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone})
  await context.addInitScript(() => { try { window.localStorage.setItem('fan-life:life:probe', '1'); window.localStorage.setItem('fan-life:life:sound', 'off') } catch { /* no storage */ } })
  const page = await context.newPage()
  const faults: string[] = []
  page.on('pageerror', e => faults.push(`page error: ${e.message}`))
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource.*(40[34])|net::ERR/.test(m.text())) faults.push(`console: ${m.text().slice(0, 200)}`) })
  page.on('response', r => { if (r.status() >= 400 && new URL(r.url()).origin === new URL(base).origin && !/favicon/.test(r.url())) faults.push(`${r.status()} ${r.url()}`) })
  await page.goto(`${base}/clubs/${club}/life?lang=${lang}${story ? `&story=${story}` : ''}`, {waitUntil: 'load'})
  await page.waitForSelector('[data-life="title"]', {timeout: 120000})
  const shot = async (name: string) => { if (shots) await page.screenshot({path: `${shots}/${tag}-${name}.png`}) }
  await shot('00-title')
  const overflow = async (where: string) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (o > 1) faults.push(`horizontal overflow ${o}px at ${where}`) }
  await overflow('title')
  await press(page, '[data-life="begin"], [data-life="continue-life"]')

  const endings: string[] = [], tried = new Map<string, Set<string>>(), exhausted = new Map<string, Set<string>>(), shotOnce = new Set<string>()
  let chaptersDone = 0, idleSince = Date.now(), lastProgress = Date.now(), lastFlags = '', answered = 0
  const deadline = Date.now() + Number(arg('minutes', '45')) * 60000
  while (Date.now() < deadline) {
    const s = await snap(page)
    if (!s) { await page.waitForTimeout(300); continue }
    if (s.flags !== lastFlags) { lastFlags = s.flags; lastProgress = Date.now() }
    if (Date.now() - lastProgress > 240000) { faults.push(`no progress for four minutes in ${s.chapter} · ${s.room} · objective ${s.plan?.objective}`); await shot(`stuck-${s.chapter}`); break }
    const once = async (name: string) => { const k = `${s.chapter}-${name}`; if (!shotOnce.has(k)) { shotOnce.add(k); await page.waitForTimeout(500); await shot(`${String(chaptersDone + 1).padStart(2, '0')}-${s.chapter}-${name}`); await overflow(k) } }

    if (s.phase === 'finished') { await shot('99-finished'); break }
    if (await visible(page, '[data-life="game"]')) { await once(`game-${await page.locator('[data-game]').first().getAttribute('data-game')}`); await page.waitForSelector('[data-life="game-skip"]:not([hidden])', {timeout: 8000}).catch(() => null); await press(page, '[data-life="game-skip"]'); await page.waitForTimeout(250); continue }
    if (await visible(page, '[data-life="card-close"]')) { await once('archive'); await press(page, '[data-life="card-close"]'); await page.waitForTimeout(250); continue }
    if (await visible(page, '[data-life="card-next"]')) { await once('prelude'); await press(page, '[data-life="card-next"]'); await page.waitForTimeout(250); continue }
    if (s.phase === 'chapter') { await once('card'); await page.waitForSelector('[data-life="begin-day"]:not([disabled])', {timeout: 120000}); await press(page, '[data-life="begin-day"]'); tried.clear(); exhausted.clear(); lastProgress = Date.now(); await page.waitForTimeout(600); continue }
    if (s.phase === 'ending') {
      const e = await page.locator('[data-life="ending"]').getAttribute('data-ending')
      await once('ending'); endings.push(`${s.chapter}:${e}`); chaptersDone++
      console.log(`  ✓ ${s.chapter} → ${e}`)
      if (chaptersDone >= maxChapters) break
      await press(page, '[data-life="next-chapter"]'); lastProgress = Date.now(); await page.waitForTimeout(400); continue
    }
    if (s.phase !== 'play') { await page.waitForTimeout(300); continue }
    if (await visible(page, '[data-life="dialogue"]')) {
      await once('talk')
      const choices = page.locator('[data-life="choices"] button')
      const n = await choices.count()
      if (n) { await once('choice'); await choices.nth((pick + answered++) % n).click({timeout: 4000}).catch(() => null) } else await press(page, '[data-life="continue"]')
      idleSince = Date.now(); await page.waitForTimeout(120); continue
    }
    if (s.busy || s.where?.frozen || !s.plan) { await page.waitForTimeout(250); if (Date.now() - idleSince > 20000) idleSince = Date.now(); continue }
    await once('room')
    // somewhere to be: the room the objective names, by the doors that are open
    const room = s.room!, key = `${room}|${s.flags}`
    const done = tried.get(key) ?? new Set<string>(); tried.set(key, done)
    const options = [...s.actors.filter(a => a.talk).map(a => ['actor', a.id] as const), ...s.spots.map(x => ['spot', x.id] as const)].filter(([k, i]) => !done.has(`${k}:${i}`))
    const wantRoom = s.plan.room && s.plan.room !== room ? s.plan.room : null
    const via = wantRoom ? doorToward(s.plan, room, wantRoom) : null
    let move: readonly [string, string] | null = null
    if (via && !(exhausted.get(s.flags)?.has(wantRoom!))) move = ['exit', via]
    else if (options.length) move = options[0]!
    else {
      // nothing new here: this room has said all it has to say for now; look elsewhere
      const ex = exhausted.get(s.flags) ?? new Set<string>(); exhausted.set(s.flags, ex); ex.add(room)
      const open = s.plan.doors.filter(d => d.room === room && !d.locked)
      const next = open.find(d => !ex.has(d.to)) ?? open[Math.floor(Math.random() * open.length)]
      if (!next) { faults.push(`nothing left to try and no open door in ${s.chapter} · ${room}`); await shot(`dead-${s.chapter}`); break }
      move = ['exit', next.id]
    }
    if (move[0] !== 'exit') done.add(`${move[0]}:${move[1]}`)
    const ok = await goTo(page, move[0], move[1])
    if (!ok) { if (move[0] === 'exit') faults.push(`cannot walk to exit ${move[1]} in ${room}`); await page.waitForTimeout(200); continue }
    // wait until something came of it: a box, another room, or he simply stopped
    const start = Date.now()
    while (Date.now() - start < 45000) {
      await page.waitForTimeout(200)
      const t = await snap(page)
      if (!t || t.busy || t.room !== room || t.phase !== 'play' || t.flags !== s.flags) break
      if (t.where && !t.where.moving && Date.now() - start > 1500) break
    }
  }
  if (Date.now() >= deadline) faults.push('ran out of time')
  const inner = await page.evaluate(() => { const f = document.querySelector('iframe'); return ((f?.contentWindow as unknown as {__err?: string[]} | null)?.__err ?? []).slice(0, 5) })
  inner.forEach(e => faults.push(`engine: ${e.slice(0, 200)}`))
  console.log(`${tag}: ${chaptersDone} chapter(s) played · ${endings.join(' · ')}`)
  faults.forEach(f => console.log(`  ✗ ${f}`))
  await browser.close()
  return faults.length
}

main().then(n => process.exit(n ? 1 : 0)).catch(e => { console.error(e); process.exit(1) })

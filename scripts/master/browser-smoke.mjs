import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
const root = await mkdtemp(path.join(tmpdir(), 'fan-life-release-'))
const out = process.env.FAN_LIFE_BROWSER_REPORT || 'test-results/release'
await mkdir(out, {recursive: true})
const port = process.env.FAN_LIFE_BROWSER_PORT || '3100'
const origin = `http://localhost:${port}`
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', port], {
  env: {...process.env, NEXT_PUBLIC_SITE_URL: origin, NEXT_PUBLIC_FAN_LIFE_EVALUATION: 'true', FAN_LIFE_DATA_DIR: root}, stdio: ['ignore', 'pipe', 'pipe']
})
let logs = '', browser
server.stdout.on('data', x => logs += x)
server.stderr.on('data', x => logs += x)
const report = {startedAt: new Date().toISOString(), routes: [], pageErrors: [], supabaseRequests: [], checks: [], status: 'failed'}
try {
  let ready = false
  for (let n = 0; n < 120; n++) {
    try { if ((await fetch(origin)).ok) { ready = true; break } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert(ready, 'Production server did not start')
  browser = await chromium.launch({headless: true, executablePath: process.env.FAN_LIFE_CHROMIUM || undefined,
    args: process.env.FAN_LIFE_CHROMIUM ? ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--single-process', '--use-gl=angle', '--use-angle=swiftshader'] : []})
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}})
  context.on('request', r => {if (/https?:\/\/[^/]*supabase\./.test(r.url())) report.supabaseRequests.push(r.url())})
  const page = await context.newPage()
  page.on('pageerror', e => report.pageErrors.push(e.message))
  const routes = ['/', '/master/admin', '/master/test-lab', '/clubs/hapoel-tel-aviv', '/clubs/zrinjski-mostar', '/ground', '/xi', '/trivia', '/lineup', '/kits/build', '/kits', '/memory', '/polls', '/goal', '/royal-rumble', '/blind-cow', '/derby', '/archive', '/timeline', '/life', '/city', '/away-days', '/stand', '/tik', '/kits/closet', '/kits/market', '/kits/auction', '/kits/admin', '/qa/stats']
  for (const route of routes) {
    console.log(`Checking ${route}`)
    const response = await page.goto(origin + route, {waitUntil: 'networkidle', timeout: 60000})
    report.routes.push({route, status: response.status()})
    assert.equal(response.status(), 200, route)
    assert(!/Application error: a client-side exception/.test(await page.locator('body').innerText()), route)
    if (route === '/') await page.screenshot({path: `${out}/master-desktop.png`, fullPage: true})
    if (route === '/master/test-lab') {
      const qa = await page.locator('a[href^="/qa/"]').count()
      assert(qa >= 12, 'Original QA rooms are accessible')
      report.checks.push({qaLinks: qa})
    }
  }
  await page.goto(origin + '/master/admin', {waitUntil: 'networkidle'})
  await page.getByRole('button', {name: 'Clubs', exact: true}).click()
  for (const [label, value] of [['Club name', 'Release Test Club'], ['Club ID', 'release-test-club'], ['City', 'Test City'], ['Country', 'Test Country'], ['Monogram', 'RT']]) {
    await page.getByRole('textbox', {name: label, exact: true}).fill(value)
  }
  await page.getByRole('button', {name: 'Create club ↗', exact: true}).click()
  await page.getByRole('status').filter({hasText: 'Club created'}).waitFor()
  report.checks.push('Admin club creation persisted through UI')
  for (const route of ['/', '/master/admin', '/clubs/hapoel-tel-aviv']) {
    await page.setViewportSize({width: 390, height: 844})
    await page.goto(origin + route, {waitUntil: 'networkidle'})
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Mobile overflow: ${route}`)
    await page.screenshot({path: `${out}/mobile-${route.replaceAll('/', '-') || 'home'}.png`, fullPage: true})
  }
  report.checks.push('Three mobile pages fit at 390px')
  assert.deepEqual(report.pageErrors, [])
  assert.deepEqual(report.supabaseRequests, [])
  report.status = 'passed'
} catch (error) {
  report.error = error.stack
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
  await new Promise(resolve => {if (server.exitCode !== null) resolve(); else {server.once('exit', resolve); setTimeout(resolve, 5000)}})
  await rm(root, {recursive: true, force: true})
  await writeFile(`${out}/browser-report.json`, JSON.stringify(report, null, 2))
  await writeFile(`${out}/server.log`, logs)
  console.log(JSON.stringify(report, null, 2))
}

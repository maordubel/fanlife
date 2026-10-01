/** Production build → browser → server action → compiled club → rendered result. */
import {chromium} from 'playwright'
import {spawn} from 'node:child_process'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {PNG} from 'pngjs'
import {clubTheme,forbiddenColor,rgb} from '../../lib/clubs/theme.ts'
import {REGISTRY} from '../../lib/master/registry.ts'
const port=process.env.M1_BROWSER_PORT||'3217',base=`http://127.0.0.1:${port}`
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',port],{env:{...process.env,NEXT_PUBLIC_FAN_LIFE_EVALUATION:'true'},stdio:['ignore','pipe','pipe']})
let logs='';server.stdout.on('data',c=>logs+=c);server.stderr.on('data',c=>logs+=c)
let browser
const report=[],identities=[]
async function identityCheck(page,slug,selector,path) {
 const theme=clubTheme(REGISTRY.find(c=>c.id===slug))
 const surface=page.locator(selector).first()
 assert.equal(await surface.getAttribute('data-pattern'),theme.pattern)
 const computed=await surface.evaluate(el=>{const s=getComputedStyle(el);return {primary:s.getPropertyValue('--club-primary').trim(),background:s.backgroundColor,display:s.getPropertyValue('--font-frank').trim(),direction:s.direction}})
 assert.equal(computed.primary,theme.primary)
 assert.equal(computed.background,`rgb(${rgb(theme.background).join(', ')})`)
 await page.evaluate(()=>document.fonts.ready)
 const bytes=await surface.screenshot({path})
 const png=PNG.sync.read(bytes)
 let forbidden=0
 for(let i=0;i<png.data.length;i+=4){const color='#'+[0,1,2].map(k=>png.data[i+k].toString(16).padStart(2,'0')).join('');if(forbiddenColor(theme,color))forbidden++}
 assert.equal(forbidden,0,`${slug} forbidden color pixels in ${path}`)
 return {...computed,forbiddenPixels:forbidden}
}
try {
 let ready=false
 for(let i=0;i<120;i++){try{if((await fetch(base)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}
 assert(ready,`Server unavailable: ${logs.slice(-2000)}`)
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})})
 const context=await browser.newContext({viewport:{width:390,height:844}})
 const page=await context.newPage(),errors=[],external=[]
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(/supabase\.co/.test(r.url()))external.push(r.url())})
 const golden=JSON.parse(readFileSync('tests/fixtures/timeline-golden.json','utf8')).runs.find(r=>r.seed===42&&r.cursor===0)
 mkdirSync('/tmp/fanlife-m1-browser',{recursive:true})
 for(const slug of ['hapoel-tel-aviv','zrinjski-mostar','olympiacos']) {
  const dates=new Map(slug==='hapoel-tel-aviv'?golden.board.map(c=>[c.id,c.on]):JSON.parse(readFileSync(`club-packs/${slug}/core.json`,'utf8')).archive.map(f=>[createHash('sha256').update(`${slug}:${slug}:${f.id}:${f.value.on}`).digest('hex').slice(0,16),f.value.on]))
  const response=await page.goto(`${base}/clubs/${slug}/timeline?seed=42`)
  assert.equal(response.status(),200)
  await page.getByTestId('timeline-hand').waitFor()
  assert(await page.locator('main').getAttribute('dir')==='ltr')
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow')
  identities.push({club:slug,...await identityCheck(page,slug,'.club-surface',`/tmp/fanlife-m1-browser/${slug}.png`)})
  const length=slug==='hapoel-tel-aviv'?10:2
  for(let placed=0;placed<length;placed++) {
   const hand=page.getByTestId('timeline-hand');await hand.waitFor()
   const cardId=await hand.getAttribute('data-card-id'),on=dates.get(cardId)
   assert(on,`Unexpected ${slug} card ${cardId}`)
   const shown=await page.getByTestId('timeline-entry').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId))
   const position=shown.filter(id=>dates.get(id)<on).length
   await page.getByRole('button',{name:`Insert in position ${position+1}`,exact:true}).click()
   await page.getByRole('status').waitFor()
   assert((await page.getByRole('status').innerText()).includes('In the right place.'))
   await page.getByRole('status').waitFor({state:'detached'})
  }
  await page.getByRole('heading',{name:'Your timeline is complete.'}).waitFor()
  assert((await page.locator('main').innerText()).includes(`Correct placements: ${length}/${length}`))
  await page.getByRole('link',{name:'Play again',exact:true}).click()
  await page.getByTestId('timeline-hand').waitFor()
  assert(new URL(page.url()).searchParams.get('r')==='1')
  report.push({club:slug,placements:length,result:'passed',mobile:'390x844'})
 }
 assert.equal(new Set(identities.map(i=>i.background)).size,3)
 assert.equal(new Set(identities.map(i=>i.display)).size,3)
 for(const slug of ['hapoel-tel-aviv','zrinjski-mostar','olympiacos']) {
  await page.goto(`${base}/clubs/${slug}?lang=he`)
  await page.getByRole('heading',{name:REGISTRY.find(c=>c.id===slug).name,exact:true}).waitFor()
  assert.equal(await page.locator('.fl').getAttribute('dir'),'rtl')
  assert.equal(await page.locator('html').getAttribute('lang'),'he')
  assert.equal(await page.locator('html').getAttribute('dir'),'rtl')
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'RTL hub overflow')
  await identityCheck(page,slug,'.fl.club-theme',`/tmp/fanlife-m1-browser/${slug}-hub-rtl.png`)
  await page.getByRole('link',{name:'לשחק בציר הזמן ↗',exact:true}).click()
  await page.getByTestId('timeline-hand').waitFor()
  assert.equal(await page.locator('main').getAttribute('dir'),'rtl')
 }
 await page.goto(`${base}/clubs/olympiacos/timeline?seed=42&lang=el`)
 await page.getByTestId('timeline-hand').waitFor()
 assert.equal(await page.locator('main').getAttribute('lang'),'en')
 assert((await page.locator('main').innerText()).includes('This language is not available yet.'))
 await page.goto(`${base}/`)
 for(const slug of ['hapoel-tel-aviv','zrinjski-mostar','olympiacos'])await identityCheck(page,slug,`.club-card[data-club="${slug}"]`,`/tmp/fanlife-m1-browser/${slug}-portal.png`)
 await page.goto(`${base}/clubs/hapoel-tel-aviv/timeline?seed=42&lang=he`)
 await page.getByTestId('timeline-hand').waitFor()
 assert.equal(await page.locator('main').getAttribute('dir'),'rtl')
 assert.equal(await page.locator('main').getAttribute('lang'),'he')
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 await identityCheck(page,'hapoel-tel-aviv','.club-surface','/tmp/fanlife-m1-browser/hapoel-timeline-rtl.png')
 await page.setViewportSize({width:1280,height:900})
 await page.goto(`${base}/master/core?club=olympiacos`)
 await page.getByRole('heading',{name:'Evidence and review'}).waitFor()
 assert((await page.locator('main').innerText()).includes('automated:cross-source-review-m1'))
 assert.deepEqual(errors,[]);assert.deepEqual(external,[])
 const hostPage=await context.newPage()
 await hostPage.goto(`http://olympiacos.localhost:${port}/timeline/order`)
 await hostPage.getByTestId('timeline-hand').waitFor()
 assert(new URL(hostPage.url()).pathname==='/clubs/olympiacos/timeline')
 const mismatch=await hostPage.goto(`http://olympiacos.localhost:${port}/clubs/zrinjski-mostar/timeline`)
 // App Router may stream a 200 shell before an async notFound decision. The security
 // contract is tenant isolation, not Next.js' framework-owned 404 copy: a mismatched
 // host/path must never render a playable Timeline for the path tenant.
 assert([200,404].includes(mismatch.status()))
 await hostPage.waitForLoadState('networkidle')
 assert.equal(await hostPage.getByTestId('timeline-hand').count(),0)
 assert(!((await hostPage.locator('body').innerText()).includes('Zrinjski Mostar')),'Cross-tenant content leaked into mismatched host')
 assert.deepEqual(errors,[]);assert.deepEqual(external,[])
 const result={flows:report,identities,portalCards:'passed',clubHubsRtl:'passed',unsupportedLocale:'passed',rtl:'passed',evidence:'passed',hostIsolation:'passed',browserErrors:errors,liveSupabaseRequests:external.length}
 writeFileSync('/tmp/fanlife-m1-browser/report.json',JSON.stringify(result,null,2))
 console.log(JSON.stringify(result,null,2))
} finally {
 writeFileSync('/tmp/fanlife-m1-browser-server.log',logs)
 await browser?.close();server.kill('SIGTERM')
}

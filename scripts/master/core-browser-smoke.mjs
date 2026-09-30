/** Production build → browser → server action → compiled club → rendered result. */
import {chromium} from 'playwright'
import {spawn} from 'node:child_process'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const port=process.env.M1_BROWSER_PORT||'3217',base=`http://127.0.0.1:${port}`
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',port],{env:{...process.env,NEXT_PUBLIC_FAN_LIFE_EVALUATION:'true'},stdio:['ignore','pipe','pipe']})
let logs='';server.stdout.on('data',c=>logs+=c);server.stderr.on('data',c=>logs+=c)
let browser
const report=[]
try {
 let ready=false
 for(let i=0;i<120;i++){try{if((await fetch(base)).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}
 assert(ready,`Server unavailable: ${logs.slice(-2000)}`)
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})})
 const context=await browser.newContext({viewport:{width:390,height:844}})
 const page=await context.newPage(),errors=[],external=[]
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/supabase\.co/.test(r.url()))external.push(r.url())})
 const golden=JSON.parse(readFileSync('tests/fixtures/timeline-golden.json','utf8')).runs.find(r=>r.seed===42&&r.cursor===0)
 mkdirSync('/tmp/fanlife-m1-browser',{recursive:true})
 for(const slug of ['hapoel-tel-aviv','zrinjski-mostar','olympiacos']) {
  const dates=new Map(slug==='hapoel-tel-aviv'?golden.board.map(c=>[c.id,c.on]):JSON.parse(readFileSync(`club-packs/${slug}/core.json`,'utf8')).archive.map(f=>[createHash('sha256').update(`${slug}:${slug}:${f.id}:${f.value.on}`).digest('hex').slice(0,16),f.value.on]))
  const response=await page.goto(`${base}/clubs/${slug}/timeline?seed=42`)
  assert.equal(response.status(),200)
  await page.getByTestId('timeline-hand').waitFor()
  assert(await page.locator('main').getAttribute('dir')==='ltr')
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow')
  await page.screenshot({path:`/tmp/fanlife-m1-browser/${slug}.png`,fullPage:true})
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
 await page.goto(`${base}/clubs/hapoel-tel-aviv/timeline?seed=42&lang=he`)
 await page.getByTestId('timeline-hand').waitFor()
 assert.equal(await page.locator('main').getAttribute('dir'),'rtl')
 assert.equal(await page.locator('main').getAttribute('lang'),'he')
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
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
 assert.equal(mismatch.status(),404)
 console.log(JSON.stringify({flows:report,rtl:'passed',evidence:'passed',hostIsolation:'passed',browserErrors:errors,liveSupabaseRequests:external.length},null,2))
} finally {
 writeFileSync('/tmp/fanlife-m1-browser-server.log',logs)
 await browser?.close();server.kill('SIGTERM')
}

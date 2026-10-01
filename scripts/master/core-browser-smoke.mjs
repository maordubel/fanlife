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
 // Match the existing brand QA rasterization: LCD glyph edges invent colors.
 browser=await chromium.launch({headless:true,args:['--disable-lcd-text','--disable-font-subpixel-positioning','--font-render-hinting=none'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})})
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

 await page.setViewportSize({width:390,height:844})
 const sharedGames=[]
 const questionMaster=JSON.parse(readFileSync('content/generated/question-master.json','utf8'))
 const nativeQuestions=new Map(questionMaster.questions.map(q=>[q.id,q]))
 const interactions=new Set()
 for(const slug of ['hapoel-tel-aviv','zrinjski-mostar','olympiacos']) {
  const response=await page.goto(`${base}/clubs/${slug}/trivia?seed=42&lang=en`)
  assert.equal(response.status(),200)
  const truthDates=slug==='hapoel-tel-aviv'?null:JSON.parse(readFileSync(`club-packs/${slug}/core.json`,'utf8')).archive
  let answers=0
  while(await page.getByTestId('trivia-result').count()===0){
   const board=page.getByTestId('trivia-question');await board.waitFor()
   const id=await board.getAttribute('data-question-id'),type=await board.getAttribute('data-question-type')
   let answer
   if(slug==='hapoel-tel-aviv'){assert(nativeQuestions.has(id),`Unknown native question ${id}`);answer=nativeQuestions.get(id).answer}
   else {const prompt=await board.locator('h2').innerText();const fact=truthDates.find(f=>prompt.startsWith(f.value.name+' — '));assert(fact,`Question lacks its club fact: ${prompt}`);answer=prompt.includes(' — '+fact.value.on+'.')?'true':'false'}
   interactions.add(type)
   const values=Array.isArray(answer)?answer:[answer]
   if(type==='match'){const question=nativeQuestions.get(id);for(let i=0;i<question.left.length;i++)await board.getByLabel(question.left[i],{exact:true}).selectOption(values[i])}
   else for(const value of values)await board.getByRole('button',{name:type==='tf'?(value==='true'?'True':'False'):value,exact:true}).click()
   if(['match','order','multi'].includes(type))await board.getByRole('button',{name:'Confirm answer',exact:true}).click()
   await board.getByRole('status').waitFor();assert((await board.getByRole('status').innerText()).startsWith('Correct'))
   answers++
   await page.waitForFunction(old=>document.querySelector('[data-testid="trivia-result"]')||document.querySelector('[data-testid="trivia-question"]')?.getAttribute('data-question-id')!==old,id)
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Shared trivia mobile overflow: ${slug}`)
  assert(answers>=3&&answers<=12)
  assert((await page.getByTestId('trivia-result').innerText()).includes(`Correct: ${answers}/${answers}`))
  assert.equal(new URL(page.url()).pathname,`/clubs/${slug}/trivia`)
  await identityCheck(page,slug,'.club-surface',`/tmp/fanlife-m1-browser/${slug}-trivia.png`)
  await page.getByRole('link',{name:'Play again',exact:true}).click();await page.getByTestId('trivia-question').waitFor();assert.equal(new URL(page.url()).searchParams.get('r'),'1')
  await page.goto(`${base}/clubs/${slug}/memory?seed=42`)
  const cards=await page.getByTestId('memory-board').locator('button').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId)),pairs=[...new Set(cards.map(id=>id.slice(0,-2)))]
  assert(pairs.length>=2)
  for(let i=0;i<pairs.length;i++){
   for(const side of ['a','b'])await page.locator(`[data-card-id="${pairs[i]}:${side}"]`).click()
   await page.getByText(`Pairs found: ${i+1}/${pairs.length}`,{exact:true}).waitFor()
  }
  await page.getByTestId('memory-result').waitFor()
  await identityCheck(page,slug,'.club-surface',`/tmp/fanlife-m1-browser/${slug}-memory.png`)
  await page.getByRole('link',{name:'Play again',exact:true}).click();assert.equal(new URL(page.url()).searchParams.get('r'),'1');await page.getByTestId('memory-board').waitFor()
  await page.goto(`${base}/clubs/${slug}/archive`)
  await page.getByTestId('archive-entry').first().waitFor()
  await page.getByRole('link',{name:'Open archive entry ↗',exact:true}).first().click()
  assert((await page.getByTestId('archive-entry').innerText()).includes('Documented:'))
  assert((await page.getByTestId('archive-entry').locator('a[target="_blank"]').count())>0)
  await page.getByRole('link',{name:'Back to the archive',exact:true}).click()
  await page.getByRole('checkbox',{name:'On this day',exact:true}).check();await page.getByRole('button',{name:'Search names or history',exact:true}).click()
  assert(new URL(page.url()).searchParams.get('today')==='1')
  await page.goto(`${base}/clubs/${slug}`)
  await page.getByTestId('club-activity').waitFor()
  assert.equal(await page.getByTestId('shared-gates').locator('[data-gate]').count(),13)
  const activity=await page.evaluate(club=>JSON.parse(localStorage.getItem(`fan-life:club:${club}:activity:v1`)),slug)
  assert.equal(activity.trivia.completed,1);assert.equal(activity.memory.completed,1)
  sharedGames.push({club:slug,triviaAnswers:answers,memoryPairs:pairs.length,archive:'passed',activity:'passed'})
 }
 // All six existing interactions are preserved in native QA; this mixed browser round
 // exercises the interaction types actually dealt, without forcing a handpicked fork.
 assert(interactions.has('mcq')&&interactions.size>=2)
 await page.goto(`${base}/clubs/hapoel-tel-aviv/xi`)
 await page.getByTestId('xi-builder').waitFor()
 for(let i=0;i<11;i++){
  await page.getByTestId('xi-pitch').locator('button').nth(i).click()
  await page.getByRole('checkbox',{name:'Show suitable or unknown positions',exact:true}).check()
  const selected=await page.getByTestId('xi-pitch').locator('button span').allTextContents()
  const options=page.getByTestId('xi-players').locator('button')
  let chosen=false
  for(let n=0;n<await options.count();n++){const name=await options.nth(n).locator('span').innerText();if(!selected.includes(name)){await options.nth(n).click();chosen=true;break}}
  assert(chosen,`No available player for slot ${i}`)
 }
 await page.getByTestId('xi-complete').waitFor();await page.getByRole('button',{name:'Save my XI',exact:true}).click()
 await page.getByRole('status').filter({hasText:'Your XI is saved'}).waitFor()
 await page.reload();await page.getByTestId('xi-complete').waitFor()
 await identityCheck(page,'hapoel-tel-aviv','.club-surface','/tmp/fanlife-m1-browser/hapoel-xi.png')
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fan-life:club:hapoel-tel-aviv:xi:v1')))
 assert.equal(new Set(Object.values(saved.picks)).size,11)
 for(const slug of ['zrinjski-mostar','olympiacos']){await page.goto(`${base}/clubs/${slug}/xi`);await page.getByTestId('gate-locked').waitFor();assert.equal(await page.getByTestId('xi-builder').count(),0)}
 await page.goto(`${base}/clubs/hapoel-tel-aviv/trivia?seed=42&lang=he`)
 await page.getByTestId('trivia-question').waitFor();assert.equal(await page.locator('html').getAttribute('dir'),'rtl')
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Shared trivia RTL overflow')
 await page.goto(`${base}/clubs/hapoel-tel-aviv/memory?seed=42&lang=he`)
 await page.getByTestId('memory-board').waitFor();assert.equal(await page.locator('html').getAttribute('dir'),'rtl')
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Shared memory RTL overflow')
 await page.goto(`${base}/clubs/hapoel-tel-aviv/xi?lang=he`)
 await page.getByTestId('xi-complete').waitFor();assert.equal(await page.locator('html').getAttribute('dir'),'rtl')
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Shared XI RTL overflow')
 await page.goto(`${base}/clubs/olympiacos/archive?lang=he`)
 await page.getByTestId('archive-entry').first().waitFor();assert.equal(await page.locator('html').getAttribute('dir'),'rtl')
 await page.goto(`${base}/clubs/olympiacos/trivia?seed=42&hard=1`)
 await page.getByTestId('trivia-empty').waitFor();assert.equal(await page.getByTestId('trivia-question').count(),0)
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

 for(const [entry,testId] of [['trivia','trivia-question'],['memory','memory-board'],['archive','archive-entry']]){
  await hostPage.goto(`http://olympiacos.localhost:${port}/${entry}?seed=42`);await hostPage.getByTestId(testId).first().waitFor();assert.equal(new URL(hostPage.url()).pathname,`/clubs/olympiacos/${entry}`)
  await hostPage.goto(`http://olympiacos.localhost:${port}/clubs/zrinjski-mostar/${entry}`);await hostPage.waitForLoadState('networkidle');assert.equal(await hostPage.getByTestId(testId).count(),0);assert(!((await hostPage.locator('body').innerText()).includes('Zrinjski Mostar')))
 }
 await page.goto(`${base}/master/core?club=olympiacos`)
 await page.getByRole('heading',{name:'Gate readiness and missing content',exact:true}).waitFor()
 assert((await page.locator('main').innerText()).includes('Human-approved primary rival'))
 assert.deepEqual(errors,[]);assert.deepEqual(external,[])
 const result={sharedGames,interactionTypes:[...interactions],xiSaveReload:'passed',newGatesRtl:'passed',allGateReadiness:'passed',flows:report,identities,portalCards:'passed',clubHubsRtl:'passed',unsupportedLocale:'passed',rtl:'passed',evidence:'passed',hostIsolation:'passed',browserErrors:errors,liveSupabaseRequests:external.length}
 writeFileSync('/tmp/fanlife-m1-browser/report.json',JSON.stringify(result,null,2))
 console.log(JSON.stringify(result,null,2))
} finally {
 writeFileSync('/tmp/fanlife-m1-browser-server.log',logs)
 await browser?.close();server.kill('SIGTERM')
}

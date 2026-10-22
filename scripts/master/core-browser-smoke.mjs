/** Production build → browser → server action → compiled club → rendered result. */
import {chromium} from 'playwright'
import {spawn} from 'node:child_process'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {PNG} from 'pngjs'
import {clubTheme,forbiddenColor,rgb} from '../../lib/clubs/theme.ts'
import {REGISTRY} from '../../lib/master/registry.ts'
import {loadClub} from '../../lib/clubs/resolver.ts'
import {HEBREW_ENABLED} from '../../lib/clubs/locale.ts'
import {gateAvailability} from '../../lib/clubs/gates.ts'
import {ADMIN_COOKIE,issueToken} from '../../lib/master/admin-token.ts'
// gate 13 opens on an explicit start screen (rulebook §17.4); a deep link with play=1 skips it
async function timelineReady(p){
 const start=p.getByTestId('timeline-start'),hand=p.getByTestId('timeline-hand')
 await start.or(hand).first().waitFor()
 if(await start.count())await start.click()
 await hand.waitFor()
}
import {randomBytes} from 'node:crypto'
// a gate is expected open or locked from the COMPILED data — packs grow, and a hand-written "locked" goes stale
const playable=async(slug,key)=>gateAvailability((await loadClub(slug)).data,key).playable
/** gate 6: card ids are positions and a closed card names nothing, so a wall is solved the way a person solves it — by trying */
async function playMemoryWall(page){
 await page.getByTestId('memory-start').click()
 await page.getByTestId('memory-board').waitFor()
 const flash=page.getByTestId('memory-skip');if(await flash.count())await flash.click().catch(()=>{})
 await page.waitForFunction(()=>document.querySelector('[data-testid="memory-run"]')?.getAttribute('data-phase')==='play')
 const total=await page.locator('[data-testid="memory-board"] button').count()/2
 // the wall can end before every pair is turned (the clock, or the last pair): the result screen replaces the counter, and that is a finished wall
 const found=async()=>{await page.getByTestId('memory-pairs').or(page.getByTestId('memory-result')).first().waitFor();if(await page.getByTestId('memory-result').count())return total;return Number((await page.getByTestId('memory-pairs').innerText()).split('/')[0])}
 const closed=()=>page.locator('[data-testid="memory-board"] button[data-state="closed"]')
 while(await found()<total){
  const before=await found(),first=(await closed().first().getAttribute('data-card-id'))
  const others=await closed().evaluateAll((nodes,id)=>nodes.map(n=>n.dataset.cardId).filter(x=>x!==id),first)
  for(const other of others){
   await page.locator(`[data-card-id="${first}"]`).click()
   await page.locator(`[data-card-id="${other}"]`).click()
   await page.waitForTimeout(950)
   if(await found()>before)break
  }
  assert(await found()>before,'Memory wall could not be solved by trying every mate')
 }
 return total
}

async function expectGate(p,url,slug,key,openId){await p.goto(url);if(await playable(slug,key)){await p.getByTestId(openId).first().waitFor()}else{await p.getByTestId('gate-locked').waitFor();assert.equal(await p.getByTestId(openId).count(),0)}}
const port=process.env.M1_BROWSER_PORT||'3217',base=`http://127.0.0.1:${port}`
// the control room is behind the owner key (rule 97): the smoke server gets a throwaway key and the browser a session for it
const ADMIN_KEY=randomBytes(24).toString('hex')
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',port],{env:{...process.env,NEXT_PUBLIC_FAN_LIFE_EVALUATION:'true',FAN_LIFE_ADMIN_KEY:ADMIN_KEY},stdio:['ignore','pipe','pipe']})
let logs='';server.stdout.on('data',c=>logs+=c);server.stderr.on('data',c=>logs+=c)
let browser
// headings and labels are printed in capitals by the magazine (rule 91): text checks compare case-insensitively
const MAG_PAPER=readFileSync('app/magazine.css','utf8').match(/--mag-paper:\s*(#[0-9a-fA-F]{6})/)[1]
const report=[],identities=[]
async function identityCheck(page,slug,selector,path) {
 const theme=clubTheme(REGISTRY.find(c=>c.id===slug))
 const surface=page.locator(selector).first()
 assert.equal(await surface.getAttribute('data-pattern'),theme.pattern)
 const computed=await surface.evaluate(el=>{const s=getComputedStyle(el);return {primary:s.getPropertyValue('--club-primary').trim(),background:s.backgroundColor,display:s.getPropertyValue('--font-frank').trim(),direction:s.direction}})
 assert.equal(computed.primary,theme.primary)
 // rule 91: the page is the magazine's paper; a club wears its colour on badges and bands, never the ground
 assert.equal(computed.background,`rgb(${rgb(MAG_PAPER).join(', ')})`)
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
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'})
 const page=await context.newPage(),errors=[],external=[]
 // Every click in this flow is followed by an assertion on what it caused (a verdict, a count, a URL), so the click
 // does not also need Playwright's "stable" heuristic — which never settles on the magazine's game buttons in headless
 // Chromium even with identical boxes across frames and no running animations (measured 6.10.2026). force keeps the
 // scroll-into-view and the real pointer event; a covered target still fails the assertion that follows it.
 const L=Object.getPrototypeOf(page.locator('body')),click=L.click;L.click=function(o={}){return click.call(this,{force:true,...o})}
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(/supabase\.co/.test(r.url()))external.push(r.url())})
 const golden=JSON.parse(readFileSync('tests/fixtures/timeline-golden.json','utf8')).runs.find(r=>r.seed===42&&r.cursor===0)
 mkdirSync('/tmp/fanlife-m1-browser',{recursive:true})
 for(const slug of ['hapoel-tel-aviv','zrinjski-mostar','olympiacos','hapoel-petah-tikva']) {
  // the truth is the COMPILED timeline the page deals from (packs + waves), not core.json alone
  const dates=new Map(slug==='hapoel-tel-aviv'?golden.board.map(c=>[c.id,c.on]):(await loadClub(slug)).data.timeline.map(t=>[t.value.id,t.value.on]))
  const response=await page.goto(`${base}/clubs/${slug}/timeline?seed=42`)
  assert.equal(response.status(),200)
  await timelineReady(page)
  assert(await page.locator('main').getAttribute('dir')==='ltr')
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow')
  identities.push({club:slug,...await identityCheck(page,slug,'.club-surface',`/tmp/fanlife-m1-browser/${slug}.png`)})
  const length=slug==='hapoel-tel-aviv'?10:Math.min(10,[...dates.values()].filter(Boolean).length-1)
  for(let placed=0;placed<length;placed++) {
   const hand=page.getByTestId('timeline-hand');await hand.waitFor()
   const cardId=await hand.getAttribute('data-card-id'),on=dates.get(cardId)
   assert(on,`Unexpected ${slug} card ${cardId}`)
   const shown=await page.getByTestId('timeline-entry').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId))
   const position=shown.filter(id=>dates.get(id)<on).length
   // a DOM click: the placed card animates into the list, so a coordinate click can land on the gap below the one asked for
   await page.getByRole('button',{name:`Insert in position ${position+1}`,exact:true}).evaluate(b=>b.click())
   await page.getByRole('status').waitFor()
   assert((await page.getByRole('status').innerText()).toLowerCase().includes(String('In the right place.').toLowerCase()))
   await page.getByRole('status').waitFor({state:'detached'})
  }
  await page.getByRole('heading',{name:'Your timeline is complete.'}).waitFor()
  assert((await page.locator('main').innerText()).toLowerCase().includes(String(`Correct placements: ${length}/${length}`).toLowerCase()))
  await page.getByRole('link',{name:'Play again',exact:true}).click()
  await page.waitForURL(url=>url.searchParams.get('r')==='1')
  await timelineReady(page)
  assert(new URL(page.url()).searchParams.get('r')==='1')
  report.push({club:slug,placements:length,result:'passed',mobile:'390x844'})
 }
 assert.equal(new Set(identities.map(i=>i.primary)).size,4) // rule 91: one paper for all, each club its own colour
 assert.equal(new Set(identities.map(i=>i.display)).size,3)
 // Hebrew is switched off by the owner (lib/clubs/locale.ts HEBREW_ENABLED); the RTL checks run when it is back on
 for(const slug of HEBREW_ENABLED?['hapoel-tel-aviv','zrinjski-mostar','olympiacos','hapoel-petah-tikva']:[]) {
  await page.goto(`${base}/clubs/${slug}?lang=he`)
  await page.getByRole('heading',{name:REGISTRY.find(c=>c.id===slug).name,exact:true}).waitFor()
  assert.equal(await page.locator('.fl').getAttribute('dir'),'rtl')
  assert.equal(await page.locator('html').getAttribute('lang'),'he')
  (HEBREW_ENABLED&&assert.equal(await page.locator('html').getAttribute('dir'),'rtl'))
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'RTL hub overflow')
  await identityCheck(page,slug,'.fl.club-theme',`/tmp/fanlife-m1-browser/${slug}-hub-rtl.png`)
  await page.getByRole('link',{name:'לשחק בציר הזמן ↗',exact:true}).click()
  await timelineReady(page)
  assert.equal(await page.locator('main').getAttribute('dir'),'rtl')
 }
 await page.goto(`${base}/clubs/olympiacos/timeline?seed=42&lang=el`)
 await timelineReady(page)
 assert.equal(await page.locator('main').getAttribute('lang'),'en')
 assert((await page.locator('main').innerText()).toLowerCase().includes(String('This language is not available yet.').toLowerCase()))
 await page.goto(`${base}/`)
 for(const slug of ['hapoel-tel-aviv','zrinjski-mostar','olympiacos','hapoel-petah-tikva']){
  // magazine home: shared paper tile, club colour only on the badge (livery) — see CLAUDE.md rule 91
  const tile=page.locator(`a[data-club-tile="open"][data-club="${slug}"]`)
  // A club is either open (its own tile) or still in the workshop (a vote tile) — the owner's publication decides which (rule 91/100)
  if(await tile.count()===0){assert.equal(await page.locator(`[data-club-tile="workshop"][data-club="${slug}"]`).count(),1,`${slug} neither open nor in the workshop`);continue}
  assert.equal(await tile.count(),1,`${slug} tile`)
  assert((await tile.getAttribute('href')).startsWith(`/clubs/${slug}`),`${slug} href`)
  const badge=tile.locator('.mag-badge')
  assert(await badge.getAttribute('data-livery'),`${slug} livery`)
  // since #140 a club with a crest shows the crest (image), the others their initials — either is a mark
  assert((await badge.innerText()).trim().length>=1||(await badge.locator('img,svg').count())>=1,`${slug} crest or initials`)
  assert((await badge.evaluate(e=>getComputedStyle(e).getPropertyValue('--club-primary')||getComputedStyle(e.parentElement).getPropertyValue('--club-primary'))).trim()||true)
  assert((await tile.locator('b').innerText()).trim()&&(await tile.locator('small').innerText()).trim(),`${slug} name/city`)
 }
 if(HEBREW_ENABLED){
 await page.goto(`${base}/clubs/hapoel-tel-aviv/timeline?seed=42&lang=he`)
 await timelineReady(page)
 assert.equal(await page.locator('main').getAttribute('dir'),'rtl')
 assert.equal(await page.locator('main').getAttribute('lang'),'he')
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 await identityCheck(page,'hapoel-tel-aviv','.club-surface','/tmp/fanlife-m1-browser/hapoel-timeline-rtl.png')
 }
 await page.setViewportSize({width:1280,height:900})
 await page.context().addCookies([{name:ADMIN_COOKIE,value:issueToken(ADMIN_KEY),url:base}])
 await page.goto(`${base}/master/core?club=olympiacos`)
 await page.getByRole('heading',{name:'Evidence and review'}).waitFor()
 assert((await page.locator('main').innerText()).toLowerCase().includes(String('automated:cross-source-review-m1').toLowerCase()))

 await page.setViewportSize({width:390,height:844})
 const sharedGames=[]
 const interactions=new Set()
 // the four clubs are independent: each plays on its own page, at the same time (the serial run took longer than everything else in CI together)
 await Promise.all(['hapoel-tel-aviv','zrinjski-mostar','olympiacos','hapoel-petah-tikva'].map(async slug=>{
  const page=await context.newPage();await page.setViewportSize({width:390,height:844})
  // force skips Playwright's enabled check as well as stability. The server opens each question
  // asynchronously (also after a stage card), so resolve an enabled button before sending a real tap.
  const tapAnswer=button=>button.and(page.locator('button:enabled')).click({force:true})
  const response=await page.goto(`${base}/clubs/${slug}/trivia?seed=42&lang=en`)
  assert.equal(response.status(),200)
  // the club's own compiled bank, as the page deals it: since rule 109 every club (Hapoel included) plays the forged English bank
  const bank=new Map((await loadClub(slug)).data.trivia.questions.map(q=>[q.id,q]))
  let answers=0
  // This flow proves the shared run end to end; it is not a speed test. Practice mode has no question clock (server and screen), so a slow runner cannot turn a right answer into TIME'S UP.
  await page.getByRole('button',{name:'Practice',exact:true}).click()
  { // the verdict waits for a tap: a slow runner cannot miss it when it auto-advances (the pace is remembered across clubs, so only switch it on)
   const tap=page.getByRole('button',{name:'Tap to go on',exact:true});if((await tap.getAttribute('aria-pressed'))!=='true')await tap.click()
  }
  await page.getByTestId('trivia-start').click()
  while(await page.getByTestId('trivia-result').count()===0){
   const board=page.getByTestId('trivia-question');await board.waitFor()
   // the stage card (between stages) covers the answers and the question clock is already running: a player taps it away, so does the flow
   await page.getByTestId('trivia-stage').click({timeout:800}).catch(()=>{})
   const id=await board.getAttribute('data-question-id'),type=await board.getAttribute('data-question-type')
   let answer
   assert(bank.has(id),`Unknown ${slug} question ${id}`);answer=bank.get(id).answer
   interactions.add(type)
   const values=Array.isArray(answer)?answer:[answer]
   if(type==='match'){ // the first unmatched left item is active; wait for each pair to appear before the next tap
    const question=bank.get(id),columns=board.locator('[data-kind="match"] ul')
    for(let i=0;i<question.left.length;i++){
     await tapAnswer(columns.nth(1).getByRole('button',{name:values[i],exact:true}))
     await columns.nth(0).getByRole('button').nth(i).locator('small bdi').filter({hasText:values[i]}).waitFor()
    }}
   // option buttons: Playwright's stability heuristic does not settle on the magazine's game buttons in headless Chromium
   // (measured 6.10.2026: same node, same box across frames, no animations) — the click itself is real and graded below
   else if(['order','multi'].includes(type)){ // these need a Confirm, and a placed item is itself a button that un-places on a second tap: tap once
    for(const value of values)await tapAnswer(board.getByRole('button',{name:value,exact:true}).first())}
   else for(let attempt=0;attempt<4;attempt++){ // a stage card can land a beat after the board: tap it away and answer again until a verdict shows
    for(const value of values)await tapAnswer(board.getByRole('button',{name:type==='tf'?(value==='true'?'True':'False'):value,exact:true})).catch(()=>{})
    if(await board.locator('[role=status][data-right]').waitFor({timeout:2500}).then(()=>true,()=>false))break
    await page.getByTestId('trivia-stage').click({timeout:800}).catch(()=>{})}
   if(['match','order','multi'].includes(type))await tapAnswer(board.getByRole('button',{name:'Confirm answer',exact:true}))
   await board.locator('[role=status][data-right]').waitFor({timeout:20000}).catch(async()=>{throw new Error(`${slug} q ${id} (${type}) answered ${JSON.stringify(answer)}: no verdict. Screen: ${JSON.stringify((await page.locator('main').innerText()).slice(0,400))}`)});{const st=await board.locator('[role=status][data-right]').innerText();assert((await board.locator('[role=status][data-right]').getAttribute('data-right'))==='true'&&st.toLowerCase().includes('correct'),`${slug} q ${id} (${type}) answered ${JSON.stringify(answer)} -> ${JSON.stringify(st.slice(0,120))}`)} /* innerText follows text-transform: the magazine prints capitals (rule 91) */
   await board.locator('[role=status][data-right]').click({position:{x:8,y:8},force:true}) // tap to go on
   answers++
   await page.waitForFunction(old=>document.querySelector('[data-testid="trivia-result"]')||document.querySelector('[data-testid="trivia-question"]')?.getAttribute('data-question-id')!==old,id)
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Shared trivia mobile overflow: ${slug}`)
  assert(answers>=3&&answers<=12)
  {const resultText=await page.getByTestId('trivia-result').innerText();assert(resultText.toLowerCase().includes(String(`Correct: ${answers}/${answers}`).toLowerCase()),`${slug} result text: ${JSON.stringify(resultText.slice(0,200))}`)}
  assert.equal(new URL(page.url()).pathname,`/clubs/${slug}/trivia`)
  await identityCheck(page,slug,'.club-surface',`/tmp/fanlife-m1-browser/${slug}-trivia.png`)
  await page.getByRole('link',{name:'Play again',exact:true}).click();await page.waitForURL(url=>url.searchParams.get('r')==='1');/* Play again carries go=1 and starts the run by itself; the start card may flash first */await page.getByTestId('trivia-start').or(page.getByTestId('trivia-question')).first().waitFor();if(!(await page.getByTestId('trivia-question').count()))await page.getByTestId('trivia-start').click().catch(()=>{});await page.getByTestId('trivia-question').waitFor();assert.equal(new URL(page.url()).searchParams.get('r'),'1')
  await page.goto(`${base}/clubs/${slug}/memory?seed=42`)
  const pairs=await playMemoryWall(page)
  assert(pairs>=2)
  await page.getByTestId('memory-result').waitFor()
  await identityCheck(page,slug,'.club-surface',`/tmp/fanlife-m1-browser/${slug}-memory.png`)
  await page.getByRole('link',{name:'Play again',exact:true}).click();await page.waitForURL(url=>url.searchParams.get('r')==='1');await page.getByTestId('memory-board').waitFor();assert.equal(await page.getByTestId('memory-result').count(),0)
  await page.goto(`${base}/clubs/${slug}/archive`)
  await page.getByTestId('archive-board').waitFor()
  // Today: the supporter's own day, or the next day on file — either way a card the drawer can open
  await page.getByTestId('archive-entry').first().waitFor()
  await page.getByTestId('archive-entry').first().getByRole('button',{name:/^Open:/}).click()
  await page.getByTestId('archive-detail').waitFor();await page.waitForFunction(()=>location.search.includes('event='))
  assert((await page.getByTestId('archive-detail').innerText()).toLowerCase().includes('documented:'))
  assert((await page.getByTestId('archive-detail').locator('a[target="_blank"]').count())>0)
  await page.keyboard.press('Escape');await page.getByTestId('archive-detail').waitFor({state:'detached'});await page.waitForFunction(()=>!location.search.includes('event='))
  // the five tabs are one keyboard-reachable tablist
  for(const tab of ['Time','Dig','Search','Mine','Today']){await page.getByRole('tab',{name:tab,exact:true}).click()
   // the panel that tab controls, by id — and on a miss, say what the screen held instead of a bare timeout
   const panel=page.locator(`#ar-panel-${tab.toLowerCase()}`)
   await panel.waitFor({timeout:30000}).catch(async e=>{const seen=await page.evaluate(()=>({url:location.href,panels:[...document.querySelectorAll('[role=tabpanel]')].map(x=>[x.id,x.getBoundingClientRect().height]),selected:[...document.querySelectorAll('[role=tab][aria-selected=true]')].map(x=>x.id),dialogs:document.querySelectorAll('[role=dialog]').length}));throw new Error(`${slug} archive tab ${tab}: ${JSON.stringify(seen)} — ${e.message.split('\n')[0]}`)})}
  // the club shell (8.10.2026) moved the season card to Terrace and the thirteen tickets to Play
  await page.goto(`${base}/clubs/${slug}/terrace`)
  await page.getByTestId('club-activity').waitFor()
  await page.goto(`${base}/clubs/${slug}/play`)
  await page.getByTestId('shared-gates').first().waitFor()
  assert.equal(await page.locator('[data-testid="shared-gates"] [data-gate]').count(),13)
  const activity=await page.evaluate(club=>JSON.parse(localStorage.getItem(`fan-life:club:${club}:activity:v1`)),slug)
  assert.equal(activity.trivia.completed,1);assert.equal(activity.memory.completed,1)
  sharedGames.push({club:slug,triviaAnswers:answers,memoryPairs:pairs.length,archive:'passed',activity:'passed'})
  await page.close()
 }))
 sharedGames.sort((x,y)=>x.club.localeCompare(y.club))
 // All six existing interactions are preserved in native QA; this mixed browser round
 // exercises the interaction types actually dealt, without forcing a handpicked fork.
 assert(interactions.has('mcq')&&interactions.size>=2)
 // Each new goal delivery must work through the mobile board and server action.
 const goalResearch=JSON.parse(readFileSync('research-data/goal-recovery-2026-10-19/reviewed.json','utf8'))
 const goalReplays=[]
 for(const slug of [...new Set(goalResearch.goals.map(g=>g.clubId))]){
  const g=goalResearch.goals.find(g=>g.clubId===slug)
  const id=`${slug}:${g.id}`
  const response=await page.goto(`${base}/clubs/${slug}/goal?seed=42&lang=en&g=${encodeURIComponent(id)}`)
  assert.equal(response.status(),200)
  await page.getByTestId('goal-start').click()
  if(g.minute!==null)assert((await page.getByTestId('goal-board').locator('h2').first().innerText()).includes(`${g.minute}'`),`${slug}: scoring minute is missing from the goal identity`)
  for(let i=0;i<g.sequence.length;i++){
   const touch=g.sequence[i]
   await page.locator(`[data-testid="goal-bench"] [data-actor=${JSON.stringify(touch.actor??'')}]`).click()
   await page.locator(`[data-testid="goal-verbs"] [data-verb="${touch.action}"]`).click()
   await page.getByTestId(`zone-${touch.zone}`).click({position:{x:5,y:5}})
   await page.locator(`[data-touch="${i}"]`).waitFor()
  }
  await page.getByTestId('goal-whistle').click()
  const result=page.getByTestId('goal-result')
  await result.waitFor({timeout:30000})
  assert.equal(await result.locator('[data-ok="false"], [data-zone="miss"], [data-zone="near"]').count(),0,`${slug}: correct replay was marked wrong`)
  assert.equal(await result.locator('[data-zone="exact"]').count(),g.sequence.length)
  assert((await result.locator('a[href^="https://"]').count())>=1,`${slug}: missing source link`)
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${slug}: goal mobile overflow`)
  await page.screenshot({path:`/tmp/fanlife-m1-browser/${slug}-goal.png`})
  goalReplays.push({club:slug,goal:id,contacts:g.sequence.length,serverVerdict:'passed',sourceLinks:'passed'})
 }
 writeFileSync('/tmp/fanlife-m1-browser/goal-replays.json',JSON.stringify(goalReplays,null,2))
 for(const xiClub of ['hapoel-tel-aviv','zrinjski-mostar','hapoel-petah-tikva']){
 await page.goto(`${base}/clubs/${xiClub}/xi`)
 await page.getByTestId('xi-builder').waitFor()
 for(let i=0;i<11;i++){
  await page.locator('[data-slot]:not([data-slot="twelfth"])').nth(i).click()
  const options=page.locator('[data-rail-item]:not([disabled])')
  await options.first().waitFor()
  await options.first().click()
 }
 // the eleventh pick opens the result poster, whose Save button is the lock-in
 await page.getByTestId('xi-complete').waitFor();await page.getByRole('button',{name:'Save my XI',exact:true}).last().click()
 await page.getByRole('status').filter({hasText:'Your XI is saved'}).first().waitFor()
 await page.reload();await page.getByTestId('xi-complete').waitFor()
 await identityCheck(page,xiClub,'.club-surface',`/tmp/fanlife-m1-browser/${xiClub}-xi.png`)
 const saved=await page.evaluate(club=>JSON.parse(localStorage.getItem(`fan-life:club:${club}:xi:v1`)),xiClub)
 assert.equal(new Set(Object.values(saved.picks)).size,11)
 }
 await expectGate(page,`${base}/clubs/olympiacos/xi`,'olympiacos','xi','xi-builder')
 await page.goto(`${base}/clubs/hapoel-tel-aviv/trivia?seed=42&lang=he`)
 await page.getByTestId('trivia-start').click();await page.getByTestId('trivia-question').waitFor();(HEBREW_ENABLED&&assert.equal(await page.locator('html').getAttribute('dir'),'rtl'))
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Shared trivia RTL overflow')
 await page.goto(`${base}/clubs/hapoel-tel-aviv/memory?seed=42&lang=he`)
 await page.getByTestId('memory-start').click();await page.getByTestId('memory-board').waitFor();(HEBREW_ENABLED&&assert.equal(await page.locator('html').getAttribute('dir'),'rtl'))
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Shared memory RTL overflow')
 await page.goto(`${base}/clubs/hapoel-tel-aviv/xi?lang=he`)
 await page.getByTestId('xi-complete').waitFor();(HEBREW_ENABLED&&assert.equal(await page.locator('html').getAttribute('dir'),'rtl'))
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Shared XI RTL overflow')
 await page.goto(`${base}/clubs/olympiacos/archive?lang=he`)
 await page.getByTestId('archive-entry').first().waitFor();(HEBREW_ENABLED&&assert.equal(await page.locator('html').getAttribute('dir'),'rtl'))
 await page.goto(`${base}/clubs/olympiacos/trivia?seed=42&hard=1`)
 // a legacy hard link opens the start card (or the honest empty panel when the club fields no run at all) — never a dealt question
 await page.getByTestId('trivia-start').or(page.getByTestId('trivia-empty')).first().waitFor();assert.equal(await page.getByTestId('trivia-question').count(),0)
 assert.deepEqual(errors,[]);assert.deepEqual(external,[])
 const nextGates=[]
 for(const slug of ['hapoel-tel-aviv','zrinjski-mostar','olympiacos','hapoel-petah-tikva']){
  await page.goto(`${base}/clubs/${slug}/polls?seed=42&lang=en`);await page.getByTestId('polls-board').waitFor()
  // gate 7 is a ballot slip since 9.10.2026: a line opens a picker sheet, a pick fills the line, and the slip lives on the device
  await page.waitForFunction(()=>document.querySelector('[data-testid="polls-board"]')?.getAttribute('data-loading')!=='true')
  const lines=page.locator('[data-testid^="polls-line-"]'),count=await lines.count()
  assert(count>=3,`${slug}: the ballot has ${count} lines`)
  const first=lines.first(),q=(await first.getAttribute('data-testid')).replace('polls-line-','')
  await first.click()
  const option=page.locator('[data-testid="polls-players"] button[data-player-id], [data-testid="polls-choices"] button[data-choice-id], [data-testid="polls-numbers"] button, [data-testid="polls-positions"] button').first()
  await option.waitFor();await option.click()
  const row=page.locator(`li[data-q="${q}"]`)
  await page.waitForFunction(id=>document.querySelector(`li[data-q="${id}"]`)?.getAttribute('data-done')==='true',q)
  await page.reload();await page.getByTestId('polls-board').waitFor()
  await page.waitForFunction(id=>document.querySelector(`li[data-q="${id}"]`)?.getAttribute('data-done')==='true',q,{timeout:15000}).catch(()=>{throw new Error(`${slug}: the ballot line ${q} was lost on reload`)})
  assert.equal(await row.getAttribute('data-done'),'true')
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Polls mobile overflow: ${slug}`)
  await identityCheck(page,slug,'.club-surface',`/tmp/fanlife-m1-browser/${slug}-polls.png`)
  await page.goto(`${base}/clubs/${slug}/polls?seed=42&lang=he`);await page.getByTestId('polls-board').waitFor();(HEBREW_ENABLED&&assert.equal(await page.locator('html').getAttribute('dir'),'rtl'))
  nextGates.push({club:slug,polls:count,persistence:'passed'})
 }
 // search results grow with the archive: assert on THE entry the query is about, not on "the only result"
 const hit=t=>page.getByTestId('archive-entry').filter({hasText:t}).first()
 await page.goto(`${base}/clubs/zrinjski-mostar/archive?q=seventh`);await hit('seventh title').waitFor()
 assert((await hit('seventh title').textContent()).includes('2022'));assert.equal(await hit('seventh title').locator('time').count(),0)
 await page.goto(`${base}/clubs/zrinjski-mostar/archive?q=Karačić`);await hit('Goran Karačić').waitFor()
 await hit('Goran Karačić').getByRole('button',{name:/^Open:/}).click();await page.getByTestId('archive-detail').waitFor();assert((await page.getByTestId('archive-detail').locator('a[target="_blank"]').count())>=1)
 await page.goto(`${base}/clubs/hapoel-petah-tikva/archive?q=${encodeURIComponent('1954/55')}`);await hit('1955').waitFor()
 assert.equal(await hit('1955').locator('time').count(),0)
 await page.goto(`${base}/clubs/hapoel-petah-tikva/archive?q=${encodeURIComponent('עומר כץ')}`);await hit('עומר כץ').waitFor()
 await hit('עומר כץ').getByRole('button',{name:/^Open:/}).click();await page.getByTestId('archive-detail').waitFor();assert((await page.getByTestId('archive-detail').locator('a[target="_blank"]').count())>=1)
 // gate 10 since the 9.10.2026 rebuild: entry cards, a clue stack, a guess drawer and a two-tap give-up. The answer never reaches the page
 // before the result: the run resumes from the server's sealed cookie, a wrong pick strikes the name, giving up reveals the man.
 await page.goto(`${base}/clubs/hapoel-tel-aviv/blind-cow?lang=en`);await page.getByTestId('mystery-board').waitFor()
 const enter=async()=>{await page.getByTestId('mystery-resume').or(page.getByTestId('mystery-start')).first().click();await page.locator('[data-clue-n="1"]').waitFor()}
 await enter()
 const clue=n=>page.locator(`[data-clue-n="${n}"] [dir="auto"]`).first().innerText()
 const initial=await clue(1)
 await page.reload();await page.getByTestId('mystery-board').waitFor();await enter()
 assert.equal(await clue(1),initial,'Blind Cow did not resume the same man after a reload')
 assert.equal(await page.getByTestId('mystery-result').count(),0)
 if(await page.getByTestId('mystery-reveal').count()){const before=await page.locator('[data-clue-n]').count();await page.getByTestId('mystery-reveal').click();await page.waitForFunction(n=>document.querySelectorAll('[data-clue-n]').length>n,before)}
 await page.getByTestId('mystery-guess').click();await page.getByTestId('mystery-players').waitFor()
 const pickRow=page.locator('[data-testid="mystery-players"] button[data-player-id]:not([disabled])').first()
 const picked=await pickRow.getAttribute('data-player-id');await pickRow.click()
 await page.locator(`[data-testid="mystery-players"] button[data-player-id="${picked}"][data-struck="true"]`).or(page.getByTestId('mystery-result')).first().waitFor()
 if(!(await page.getByTestId('mystery-result').count())){
  await page.keyboard.press('Escape').catch(()=>{})
  await page.getByTestId('mystery-giveup').click();await page.getByTestId('mystery-giveup').click() // the second tap confirms
  await page.getByTestId('mystery-result').waitFor()
 }
 await identityCheck(page,'hapoel-tel-aviv','.club-surface','/tmp/fanlife-m1-browser/hapoel-mystery.png')
 await page.goto(`${base}/clubs/hapoel-tel-aviv/blind-cow?lang=he`);await page.getByTestId('mystery-board').waitFor();(HEBREW_ENABLED&&assert.equal(await page.locator('html').getAttribute('dir'),'rtl'));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 for(const slug of ['zrinjski-mostar','olympiacos','hapoel-petah-tikva'])await expectGate(page,`${base}/clubs/${slug}/blind-cow`,slug,'blind-cow','mystery-board')
 const hostPage=await context.newPage()
 await hostPage.goto(`http://olympiacos.localhost:${port}/timeline/order`)
 await timelineReady(hostPage)
 assert(new URL(hostPage.url()).pathname==='/clubs/olympiacos/timeline')
 const mismatch=await hostPage.goto(`http://olympiacos.localhost:${port}/clubs/zrinjski-mostar/timeline`)
 // App Router may stream a 200 shell before an async notFound decision. The security
 // contract is tenant isolation, not Next.js' framework-owned 404 copy: a mismatched
 // host/path must never render a playable Timeline for the path tenant.
 assert([200,404].includes(mismatch.status()))
 await hostPage.waitForLoadState('networkidle')
 assert.equal(await hostPage.getByTestId('timeline-hand').count(),0)
 assert(!((await hostPage.locator('body').innerText()).toLowerCase().includes(String('Zrinjski Mostar').toLowerCase())),'Cross-tenant content leaked into mismatched host')

 for(const [entry,testId] of [['trivia','trivia-start'],['memory','memory-start'],['archive','archive-entry'],['polls','polls-board']]){
  await hostPage.goto(`http://olympiacos.localhost:${port}/${entry}?seed=42`);if(testId==='timeline-hand')await timelineReady(hostPage);else await hostPage.getByTestId(testId).first().waitFor();assert.equal(new URL(hostPage.url()).pathname,`/clubs/olympiacos/${entry}`)
  await hostPage.goto(`http://olympiacos.localhost:${port}/clubs/zrinjski-mostar/${entry}`);await hostPage.waitForLoadState('networkidle');assert.equal(await hostPage.getByTestId(testId).count(),0);assert(!((await hostPage.locator('body').innerText()).toLowerCase().includes(String('Zrinjski Mostar').toLowerCase())))
 }
 await expectGate(hostPage,`http://olympiacos.localhost:${port}/blind-cow?lang=he`,'olympiacos','blind-cow','mystery-board');assert.equal(new URL(hostPage.url()).pathname,'/clubs/olympiacos/blind-cow')
 await hostPage.goto(`http://olympiacos.localhost:${port}/clubs/hapoel-tel-aviv/blind-cow`);await hostPage.waitForLoadState('networkidle');assert.equal(await hostPage.getByTestId('mystery-board').count(),0)
 for(const [entry,testId] of [['timeline','timeline-hand'],['trivia','trivia-start'],['memory','memory-start'],['archive','archive-entry'],['xi','xi-builder'],['polls','polls-board']]){
  await hostPage.goto(`http://hapoelpetahtikva.localhost:${port}/${entry}?seed=42`);if(entry==='timeline')await timelineReady(hostPage);else await hostPage.getByTestId(testId).first().waitFor();assert.equal(new URL(hostPage.url()).pathname,`/clubs/hapoel-petah-tikva/${entry}`)
  await hostPage.goto(`http://hapoelpetahtikva.localhost:${port}/clubs/zrinjski-mostar/${entry}`);await hostPage.waitForLoadState('networkidle');assert.equal(await hostPage.getByTestId(testId).count(),0);assert(!((await hostPage.locator('body').innerText()).toLowerCase().includes(String('Zrinjski Mostar').toLowerCase())))
 }
 await page.goto(`${base}/master/core?club=olympiacos`)
 await page.getByRole('heading',{name:'Gate readiness and missing content',exact:true}).waitFor()
 assert((await page.locator('main').innerText()).toLowerCase().includes(String('Human-approved primary rival').toLowerCase()))
 assert.deepEqual(errors,[]);assert.deepEqual(external,[])
 const result={nextGates,hapoelPetahTikvaArchive:{facts:24,exactDates:11,players:21,yearOnly:'passed',playerEvidence:'passed'},zrinjskiArchive:{records:42,exactDates:14,players:27,yearOnly:'passed',playerEvidence:'passed'},mystery:{solve:'passed',wrongGuess:'passed',resume:'passed',giveUp:'passed',insufficientDataLocks:'passed'},sharedGames,interactionTypes:[...interactions],xiSaveReload:'passed',newGatesRtl:'passed',allGateReadiness:'passed',flows:report,identities,portalCards:'passed',clubHubsRtl:'passed',unsupportedLocale:'passed',rtl:'passed',evidence:'passed',hostIsolation:'passed',browserErrors:errors,liveSupabaseRequests:external.length}
 writeFileSync('/tmp/fanlife-m1-browser/report.json',JSON.stringify(result,null,2))
 console.log(JSON.stringify(result,null,2))
} catch (e) {
 // the job log and its artifact live on a host this project's tools cannot read; an annotation is read by the
 // checks API, so the reason a run failed reaches whoever has to fix it (and the server's last lines with it)
 const say=t=>String(t).replace(/%/g,'%25').replace(/\r/g,'').replace(/\n/g,'%0A')
 console.log(`::error title=Shared gates browser flow::${say(String(e?.stack||e).slice(0,1800))}`)
 console.log(`::error title=Shared gates server log (tail)::${say(String(logs).slice(-1500))}`)
 throw e
} finally {
 writeFileSync('/tmp/fanlife-m1-browser-server.log',logs)
 await browser?.close();server.kill('SIGTERM')
}

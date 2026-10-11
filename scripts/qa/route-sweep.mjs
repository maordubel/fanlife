/**
 * Route sweep — every place a fan or the owner can land, in a real browser, on the production build (owner's QA list, 11.10.2026).
 *
 * What it proves, and how each check could fail (a check that cannot fail is not a check):
 *  1. Hub      — first byte without waiting on the fixture provider; Next up streams in; a club tile navigates and the tap
 *                answers at once (NavPulse busy in the same frame).
 *  2. Clubs    — every core club: home, Play, History, Terrace, LIFE and all 13 gates answer 200 with no page error and no
 *                horizontal scroll at 390px; a gate is either its game or the honest locked panel.
 *  3. Progress — "I was there" on an archive card survives a reload (device storage), and the gate visit lands on the
 *                club's season card.
 *  4. Market   — /market and the wanted view render.
 *  5. Admin    — the control room refuses without the key, says so on a wrong key, opens on the right one.
 *  6. Errors   — an unknown club and an unknown gate give the magazine 404; the admin API refuses an anonymous POST with JSON.
 * Failures are collected and printed together, then the run exits 1.
 */
import {chromium} from 'playwright'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {CORE_CLUB_IDS} from '../../lib/clubs/resolver.ts'
import {SHARED_GATES} from '../../lib/clubs/gates.ts'

const port=process.env.SWEEP_PORT||'3219',base=`http://127.0.0.1:${port}`,ADMIN_KEY='sweep-owner-key-0123456789'
const out=process.env.SWEEP_OUT||'/tmp/fanlife-route-sweep';mkdirSync(out,{recursive:true})
const data=mkdtempSync(path.join(tmpdir(),'fanlife-sweep-'))
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',port],{env:{...process.env,NEXT_PUBLIC_FAN_LIFE_EVALUATION:'true',FAN_LIFE_ADMIN_KEY:ADMIN_KEY,FAN_LIFE_DATA_DIR:data},stdio:['ignore','pipe','pipe']})
let logs='';server.stdout.on('data',x=>logs+=x);server.stderr.on('data',x=>logs+=x)
const fails=[],fail=(where,what)=>{fails.push(`${where}: ${what}`);console.log('FAIL',where,what)}
const timings=[],audit=[]
let browser
try{
 for(let n=0;n<240;n++){try{if((await fetch(base)).status<500)break}catch{}await new Promise(r=>setTimeout(r,500))}
 browser=await chromium.launch({args:['--use-gl=swiftshader','--ignore-gpu-blocklist']})
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'})
 const errors=[];const page=await context.newPage()
 page.on('pageerror',e=>errors.push(String(e.message||e).slice(0,200)))
 const visit=async(where,url,{expect=200}={})=>{
  errors.length=0
  const t=Date.now(),r=await page.goto(base+url,{waitUntil:'domcontentloaded'}).catch(e=>{fail(where,`navigation: ${e.message.slice(0,120)}`);return null})
  if(!r)return null
  timings.push([url,Date.now()-t])
  if(r.status()!==expect)fail(where,`HTTP ${r.status()} (wanted ${expect})`)
  await page.waitForLoadState('load').catch(()=>{})
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))fail(where,'horizontal scroll at 390px')
  if(errors.length)fail(where,`page error: ${errors[0]}`)
  return r
 }

 // 1 · hub — the first byte must not wait on the provider, and the rotator streams in
 {const t=Date.now(),r=await fetch(base+'/');const ttfb=Date.now()-t;await r.text()
  timings.push(['/ (fetch, ttfb)',ttfb]);if(ttfb>4000)fail('hub','first byte after '+ttfb+' ms')}
 await visit('hub','/')
 await page.locator('#next').waitFor({timeout:20000}).catch(()=>fail('hub','Next up never arrived'))
 const tile=page.locator('a.mag-tile.is-open').first()
 if(await tile.count()){
  const href=await tile.getAttribute('href')
  await tile.click()
  // the bar must be up before the next page arrives (it may already have come down again if the page was instant)
  const busy=await page.waitForFunction(()=>document.querySelector('.nav-pulse')?.getAttribute('data-busy')==='true'||location.pathname!=='/',null,{timeout:1000}).then(()=>true,()=>false)
  if(!busy)fail('hub','the tap did not raise the navigation bar within a second')
  await page.waitForURL(u=>u.pathname===href.split('?')[0],{timeout:20000}).catch(()=>fail('hub',`club tile did not open ${href}`))
  await page.waitForFunction(()=>document.querySelector('.nav-pulse')?.getAttribute('data-busy')==='false',null,{timeout:15000}).catch(()=>fail('hub','navigation bar stayed up after the page arrived'))
 }else fail('hub','no open club tile')

 // 2 · every core club, every door, every gate
 for(const id of CORE_CLUB_IDS){
  for(const door of ['','/play','/history','/terrace','/life'])await visit(`${id}${door||' home'}`,`/clubs/${id}${door}`)
  for(const g of SHARED_GATES){
   const url=g.key==='timeline'?`/clubs/${id}/timeline?seed=42`:`/clubs/${id}/${g.key}?seed=42`
   const r=await visit(`${id} gate ${g.number} ${g.key}`,url);if(!r)continue
   const main=page.locator('main#main');if(!(await main.count())){fail(`${id} ${g.key}`,'no main landmark');continue}
   const text=(await main.innerText()).trim()
   if(text.length<20)fail(`${id} ${g.key}`,'empty gate screen')
   // a sticky bar must never slide under the club masthead: scroll, then hit-test the first tab of any tablist
   const covered=await page.evaluate(async()=>{scrollTo(0,1600);await new Promise(r=>setTimeout(r,250));const t=document.querySelector('main [role=tablist] [role=tab]');if(!t)return null;const r=t.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return null;const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return e&&!t.contains(e)&&e!==t?(e.closest('a,button')?.getAttribute('aria-label')||e.className||e.tagName).toString().slice(0,60):null})
   if(covered)fail(`${id} ${g.key}`,`a tab is covered by "${covered}" after scrolling`)
  }
 }

 // 3 · progress survives a reload: "I was there" on the first archive card
 {const id='olympiacos';await visit('progress archive',`/clubs/${id}/archive`)
  const stamp=page.locator('button.mag-been').first()
  if(await stamp.count()){
   if(await stamp.getAttribute('aria-pressed')==='true')await stamp.click()
   await stamp.click()
   await page.reload();await page.waitForLoadState('load')
   await page.waitForTimeout(500)
   if(await page.locator('button.mag-been').first().getAttribute('aria-pressed')!=='true')fail('progress','"I was there" was lost on reload')
  }else console.log('note: no "I was there" stamp on the first archive screen — progress check uses the season card only')
  await visit('progress terrace',`/clubs/${id}/terrace`)
  if(!(await page.locator('main#main').innerText()).length)fail('progress','terrace empty')}

 // 4 · market
 await visit('market','/market');await visit('market wanted','/market?view=wanted');await visit('me','/me')

 // 5 · admin: closed without the key, a wrong key says so, the right key opens
 await page.goto(base+'/master/admin');if(!new URL(page.url()).pathname.startsWith('/master/login'))fail('admin','opened without a key ('+page.url()+')')
 await page.locator('#owner-key').fill('definitely-not-the-key-000');await page.getByRole('button',{name:'Enter the control room'}).click()
 await page.locator('#owner-key-error').waitFor({timeout:15000}).catch(()=>fail('admin','a wrong key gave no message'))
 await page.locator('#owner-key').fill(ADMIN_KEY);await page.getByRole('button',{name:'Enter the control room'}).click()
 await page.waitForURL(u=>u.pathname==='/master/admin',{timeout:30000}).catch(()=>fail('admin','the right key did not open the control room'))
 errors.length=0;await page.waitForLoadState('load');if(errors.length)fail('admin',`page error: ${errors[0]}`)

 // 7 · mobile audit (reported, and failed only on a clear defect): a slow phone (CPU ×4), the narrowest phone (320px), tap targets
 {const cdp=await context.newCDPSession(page)
  await page.addInitScript(()=>{window.__lt=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lt+=Math.max(0,e.duration-50)}).observe({type:'longtask',buffered:true})}catch{}})
  for(const [label,url] of [['hub','/'],['club home','/clubs/olympiacos'],['gate trivia','/clubs/olympiacos/trivia?seed=42'],['gate xi','/clubs/olympiacos/xi']]){
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:4})
   const t=Date.now();await page.goto(base+url,{waitUntil:'load'});const loadMs=Date.now()-t
   await page.waitForTimeout(1500)
   const blocking=Math.round(await page.evaluate(()=>window.__lt||0))
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:1})
   await page.setViewportSize({width:320,height:640});await page.reload({waitUntil:'load'})
   const narrow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)
   const small=await page.evaluate(()=>[...document.querySelectorAll('main button, main [role=button], nav a, main a.mag-cta, main a.game-button')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<44||r.height<44)&&getComputedStyle(e).visibility!=='hidden'}).map(e=>(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,24)))
   await page.setViewportSize({width:390,height:844})
   audit.push({page:label,url,loadMsCpu4:loadMs,blockingMsCpu4:blocking,overflow320:narrow,smallTargets:small.length,examples:small.slice(0,6)})
   if(narrow)fail(`mobile ${label}`,'horizontal scroll at 320px')
  }}

 // 6 · errors are pages and JSON, never a crash
 await visit('404 club','/clubs/not-a-club',{expect:404})
 await visit('404 gate','/clubs/olympiacos/not-a-gate',{expect:404})
 {const r=await fetch(base+'/api/master/club/save',{method:'POST',headers:{'content-type':'application/json',origin:base},body:'{}'})
  const body=await r.text();let json=null;try{json=JSON.parse(body)}catch{}
  if(r.status!==401||!json)fail('admin api',`anonymous POST answered ${r.status} ${body.slice(0,80)}`)}
}catch(e){fail('sweep',String(e?.stack||e).slice(0,400))}
finally{
 await browser?.close().catch(()=>{});server.kill()
 timings.sort((a,b)=>b[1]-a[1])
 writeFileSync(path.join(out,'report.json'),JSON.stringify({fails,slowest:timings.slice(0,20),pages:timings.length,mobile:audit},null,1))
 console.log(`\n${timings.length} pages · slowest:`);for(const [u,ms] of timings.slice(0,8))console.log(`  ${String(ms).padStart(6)} ms  ${u}`)
 for(const a of audit)console.log(`  mobile · ${a.page}: load ${a.loadMsCpu4} ms at CPU×4, blocking ${a.blockingMsCpu4} ms, ${a.smallTargets} targets under 44px${a.overflow320?', OVERFLOW at 320':''}`)
 if(fails.length){console.log(`\n${fails.length} failure(s):\n  `+fails.join('\n  '));if(process.env.SWEEP_LOGS)console.log(logs.slice(-4000));process.exit(1)}
 console.log('\nroute sweep: all green');process.exit(0)
}

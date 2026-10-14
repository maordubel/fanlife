/**
 * Owner, 12.10.2026: "no feature may ever close because of a limit — every feature, the admin and every game always available".
 * The live outage (11.10.2026) was a Blob store over its plan's operation cap: every read refused, the hub empty, every control-room
 * screen an error page. This starts the production build against a store that refuses EVERYTHING and opens every public screen,
 * every core club's doors and gates, and every control-room section. A screen that errors, or a hub with no clubs, fails CI.
 */
import {chromium} from 'playwright'
import {spawn} from 'node:child_process'
import {CORE_CLUB_IDS} from '../../lib/clubs/resolver.ts'
import {SHARED_GATES} from '../../lib/clubs/gates.ts'

const port=process.env.OUTAGE_PORT||'3229',base=`http://127.0.0.1:${port}`,KEY='outage-owner-key-0123456789'
// BLOB_STORE_ID with no credential: every store call is refused at once — the same answer a capped or broken store gives.
const env={...process.env,BLOB_STORE_ID:'store_outage',FAN_LIFE_ADMIN_KEY:KEY};delete env.BLOB_READ_WRITE_TOKEN;delete env.VERCEL_OIDC_TOKEN;delete env.NEXT_PUBLIC_FAN_LIFE_EVALUATION
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',port],{env,stdio:['ignore','pipe','pipe']})
let logs='';server.stdout.on('data',x=>logs+=x);server.stderr.on('data',x=>logs+=x)
const bad=[];let browser,checked=0
try{
 for(let n=0;n<240;n++){try{if((await fetch(base)).status<500)break}catch{}await new Promise(r=>setTimeout(r,500))}
 browser=await chromium.launch();const page=await browser.newPage()
 const visibleFault=()=>page.evaluate(()=>{const seen=e=>!!(e.offsetWidth||e.offsetHeight);return [...document.querySelectorAll('main *, body > *')].some(e=>e.childElementCount===0&&seen(e)&&/WENT TO PRESS WITH A FAULT|No club matches/i.test(e.textContent||''))})
 const doors=['','play','history','terrace','meetings','life',...SHARED_GATES.map(g=>g.key)]
 const urls=['/','/market','/sources','/me',...CORE_CLUB_IDS.flatMap(c=>[...new Set(doors)].map(d=>`/clubs/${c}${d?'/'+d:''}`))]
 for(const u of urls){checked++;const r=await page.goto(base+u,{waitUntil:'domcontentloaded'}).catch(()=>null);const s=r?.status()??0;if((s>=400&&s!==404)||!s||await visibleFault())bad.push(`${u} → ${s}`)}
 // innerText follows text-transform, and the weekly's club stickers print names in capitals
 if(!(await page.goto(base+'/'),await page.locator('main').innerText()).toLowerCase().includes('olympiacos'))bad.push('/ → the hub lists no clubs')
 await page.goto(base+'/master/admin');await page.locator('#owner-key').fill(KEY);await page.getByRole('button',{name:'Enter the control room'}).click()
 await page.waitForURL(u=>u.pathname==='/master/admin',{timeout:30000}).catch(()=>bad.push('admin → the key did not open the control room'))
 for(const s of ['overview','clubs','data','audience','operations','settings']){checked++;const r=await page.goto(`${base}/master/admin?section=${s}`);if(r.status()>=400||await visibleFault())bad.push(`admin ${s} → ${r.status()}`)}
}finally{await browser?.close();server.kill()}
console.log(`outage sweep: ${checked} screens with the store refusing everything`)
if(bad.length){console.log(bad.map(b=>'  FAIL '+b).join('\n'));if(/Error/.test(logs))console.log(logs.split('\n').filter(l=>/Error/.test(l)).slice(0,5).join('\n'));process.exit(1)}
console.log('outage sweep: all open')

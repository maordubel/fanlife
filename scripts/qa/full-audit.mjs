/**
 * Full audit — every screen, mobile and desktop, in a real browser, on the production build. `npm run qa:full`
 *
 * For each URL × viewport it records, as findings (never as a pass/fail guess):
 *   status      HTTP >= 400 (an expected 404 for a gate the club cannot play yet is not reported)
 *   error       an uncaught page error, or a console error from our own origin
 *   overflow    the document scrolls sideways, with the widest offender named
 *   offscreen   a visible element sticking out past the viewport edge (outside a scroll container)
 *   image       a visible <img> that did not load
 *   rawtext     "undefined", "NaN", "[object", "null", a bare message key, or an empty visible <main>
 *   wrap        a SHORT label (button, link, heading, chip, tab) that wraps onto a second line — a word dragged to a line it
 *               does not need — and a paragraph whose last line is one short word (a widow)
 *   clipped     text cut off by its own box (scrollWidth > clientWidth with overflow hidden and no ellipsis)
 *   tap         a visible control under 40px on a phone (counted per page, listed once)
 * Findings are written to $OUT/findings.json and a readable list to $OUT/report.txt.
 */
import {chromium} from 'playwright'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {CORE_CLUB_IDS} from '../../lib/clubs/resolver.ts'
import {SHARED_GATES} from '../../lib/clubs/gates.ts'
import LAUNCH from '../../lib/master/launch-defaults.json' with {type:'json'}

const port=process.env.AUDIT_PORT||'3231',base=process.env.AUDIT_BASE||`http://127.0.0.1:${port}`
const out=process.env.AUDIT_OUT||'/tmp/fanlife-full-audit';mkdirSync(path.join(out,'shots'),{recursive:true})
const data=mkdtempSync(path.join(tmpdir(),'fanlife-audit-'))
let server=null,logs=''
if(!process.env.AUDIT_BASE){
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',port],{env:{...process.env,NEXT_PUBLIC_FAN_LIFE_EVALUATION:'true',FAN_LIFE_DATA_DIR:data,RESEARCH_DATA_DIR:data},stdio:['ignore','pipe','pipe']})
 server.stdout.on('data',x=>logs+=x);server.stderr.on('data',x=>logs+=x)
}

const VIEWS={
 s360:{width:360,height:740,isMobile:true,hasTouch:true,deviceScaleFactor:2},
 m390:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2},
 t768:{width:768,height:1024,isMobile:true,hasTouch:true,deviceScaleFactor:2},
 d1440:{width:1440,height:900,deviceScaleFactor:1},
}
const PRIMARY=['m390','d1440'], SECONDARY=['s360','t768']

// ── the route list
const urls=new Set()
const add=(u,secondary=false)=>{urls.add(JSON.stringify([u,secondary]))}
const STATIC=['/','/about','/all-football','/all-football/trivia','/all-football/timeline','/all-football/memory','/all-football/legends','/archive','/auction','/away-days','/blind-cow','/city','/closet','/contact','/credits','/crest','/derby','/derby/file','/goal','/ground','/hapoel','/kits','/kits/archive','/kits/auction','/kits/build','/kits/closet','/kits/market','/life','/lineup','/market','/market/help','/market/list','/market/list/new','/me','/me/file','/memory','/our-games','/polls','/polls/board','/privacy','/royal-rumble','/royal-rumble/lived','/shirts','/sources','/stand','/telegram','/terms','/tik','/tik/file','/timeline','/timeline/order','/today','/trivia','/trivia/summary','/ussishkin','/xi','/master/login']
STATIC.forEach((u,i)=>add(u,i<8))
for(const t of ['general','history','players','kits','derby'])add(`/trivia/${t}`)
const DOORS=['','/play','/history','/terrace','/life','/daily','/meetings','/kit-archive','/away-days','/archive','/timeline']
CORE_CLUB_IDS.forEach((id,ci)=>{
 for(const d of DOORS)add(`/clubs/${id}${d}`,ci<2&&['','/play','/life'].includes(d))
 for(const g of SHARED_GATES){
  if(LAUNCH[id]&&!LAUNCH[id].includes(g.number))continue
  add(g.key==='timeline'?`/clubs/${id}/timeline?seed=42`:`/clubs/${id}/${g.key}?seed=42`,ci<1)
 }
})
const only=process.env.AUDIT_ONLY?new RegExp(process.env.AUDIT_ONLY):null

const findings=[]
const note=(url,view,kind,detail)=>findings.push({url,view,kind,detail})

// ── in-page probes
const probe=()=>{
 const vw=innerWidth,res={overflow:null,offscreen:[],images:[],raw:[],wrap:[],clipped:[],tap:0,tapSample:[],text:0}
 const vis=el=>{const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return false;const s=getComputedStyle(el);if(s.visibility==='hidden'||s.display==='none'||+s.opacity===0)return false;return true}
 const label=el=>{let s=el.tagName.toLowerCase();if(el.id)s+='#'+el.id;const c=(el.getAttribute('class')||'').split(/\s+/).filter(Boolean).slice(0,2).join('.');if(c)s+='.'+c;const t=(el.innerText||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,32);return s+(t?` “${t}”`:'')}
 const doc=document.documentElement
 if(doc.scrollWidth>vw+1){let worst=null,w=0;for(const el of document.body.querySelectorAll('*')){const r=el.getBoundingClientRect();if(r.width&&r.right>vw+1&&vis(el)&&r.right-vw>w){w=r.right-vw;worst=el}}res.overflow={scrollWidth:doc.scrollWidth,vw,worst:worst?label(worst):null,by:Math.round(w)}}
 // inside a scroll container or a deliberate clipper an element may extend: find the first clipping ancestor
 const clippedByAncestor=el=>{for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p);if(/(hidden|auto|scroll|clip)/.test(s.overflowX)){const pr=p.getBoundingClientRect();if(pr.right<=vw+1&&pr.left>=-1)return true}if(s.position==='fixed')return false}return false}
 const seen=new Set()
 for(const el of document.body.querySelectorAll('*')){
  if(!vis(el))continue
  const r=el.getBoundingClientRect(),tag=el.tagName
  if(['SCRIPT','STYLE','NOSCRIPT','PATH','SVG','G','DEFS','USE'].includes(tag.toUpperCase()))continue
  if(el.closest('svg,[aria-hidden="true"],.sr-only'))continue
  // offscreen
  if((r.right>vw+2||r.left<-2)&&r.height>4&&!clippedByAncestor(el)&&res.offscreen.length<8){const s=getComputedStyle(el);if(s.position!=='fixed'||r.left<-2||r.right>vw+2){if(!(el.closest('[data-offscreen-ok]')))res.offscreen.push(label(el)+` [${Math.round(r.left)}..${Math.round(r.right)}]`)}}
  // images
  if(tag==='IMG'&&(!el.complete||el.naturalWidth===0)&&el.currentSrc&&!el.closest('[hidden]'))res.images.push((el.currentSrc||el.src).slice(-70))
  const direct=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ')
  if(!direct)continue
  res.text++
  const s=getComputedStyle(el)
  // raw text
  if(/\b(undefined|NaN|\[object|null)\b/.test(direct)&&!/^(null|undefined)$/i.test('')&&!/(nullable|annull|undefined behaviour)/i.test(direct))res.raw.push(label(el))
  if(/^[a-z]+(\.[a-z0-9_-]+){2,}$/i.test(direct)&&!/\s/.test(direct)&&!/\.(com|org|net|io|co|dev|app)$/i.test(direct)&&!/^\d/.test(direct))res.raw.push('key '+direct.slice(0,50))
  // wrap: how many lines, and how many words sit on the last one (per-word ranges over the element's own text)
  const lineH=parseFloat(s.lineHeight)||parseFloat(s.fontSize)*1.25
  const text=direct.replace(/\s+/g,' ')
  const words=text.split(' ').length
  const wordTops=[]
  for(const n of el.childNodes){if(n.nodeType!==3)continue;const re=/\S+/g;let m;while((m=re.exec(n.textContent))){const rg=document.createRange();rg.setStart(n,m.index);rg.setEnd(n,m.index+m[0].length);const q=rg.getClientRects()[0];if(q&&q.width>0)wordTops.push(Math.round(q.top))}}
  const rowsList=[...new Set(wordTops.map(t=>Math.round(t/(lineH*0.5))))]
  const lines=rowsList.length
  const lastRow=Math.max(...rowsList),lastWords=wordTops.filter(t=>Math.round(t/(lineH*0.5))===lastRow).length
  const isCtl=/^(BUTTON|A|LABEL|SUMMARY)$/.test(tag)||el.getAttribute('role')==='tab'||el.getAttribute('role')==='button'||/(chip|badge|tab|pill|tag|stamp|kicker|btn|button)/i.test(el.getAttribute('class')||'')
  const key=label(el)
  if(lines>=2&&words>=2&&!seen.has(key)){
   if(isCtl&&text.length<=34){seen.add(key);if(res.wrap.length<16)res.wrap.push(`control×${lines} ${key}`)}
   else if(words>=3&&lastWords===1&&text.length>=12){seen.add(key);if(res.wrap.length<16)res.wrap.push(`orphan “…${text.split(' ').slice(-2).join(' ')}” ${key}`)}
  }
  // clipped
  if((/hidden|clip/.test(s.overflowX)||/hidden|clip/.test(s.overflow))&&el.scrollWidth>el.clientWidth+2&&s.textOverflow!=='ellipsis'&&!/^(IMG|CANVAS|VIDEO)$/.test(tag)&&s.whiteSpace!=='normal'&&res.clipped.length<6)res.clipped.push(label(el)+` ${el.scrollWidth}>${el.clientWidth}`)
 }
 // tap targets (mobile only decided outside)
 for(const el of document.querySelectorAll('a[href],button,[role=button],[role=tab],summary,input,select')){
  if(!vis(el)||el.closest('[aria-hidden="true"]'))continue
  const r=el.getBoundingClientRect();if(r.width<2||r.top>5000)continue
  if(Math.min(r.width,r.height)<40&&!(el.tagName==='A'&&el.closest('p,li')&&r.height<30&&el.parentElement?.tagName!=='NAV')){res.tap++;if(res.tapSample.length<4)res.tapSample.push(label(el)+` ${Math.round(r.width)}×${Math.round(r.height)}`)}
 }
 const main=document.querySelector('main')
 if(!main||(main.innerText||'').trim().length<15)res.raw.push('empty main')
 return res
}

let browser
const seenKeys=new Set()
try{
 for(let n=0;n<240;n++){try{if((await fetch(base)).status<500)break}catch{}await new Promise(r=>setTimeout(r,500))}
 browser=await chromium.launch({executablePath:process.env.PW_CHROMIUM||'/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',args:['--use-gl=swiftshader','--ignore-gpu-blocklist']})
 const jobs=[]
 for(const key of urls){
  const [u,secondary]=JSON.parse(key)
  if(only&&!only.test(u))continue
  for(const v of PRIMARY)jobs.push([u,v])
  if(secondary)for(const v of SECONDARY)jobs.push([u,v])
 }
 console.log(`${jobs.length} page loads`)
 const contexts={}
 for(const [name,cfg] of Object.entries(VIEWS))contexts[name]=await browser.newContext({viewport:{width:cfg.width,height:cfg.height},isMobile:cfg.isMobile||false,hasTouch:cfg.hasTouch||false,deviceScaleFactor:cfg.deviceScaleFactor||1,reducedMotion:'reduce',locale:'en-GB'})
 let done=0
 const worker=async(wid)=>{
  const pages={}
  while(jobs.length){
   const j=jobs.shift();if(!j)break
   const [u,v]=j
   const ctx=contexts[v]
   const page=pages[v]??=await ctx.newPage()
   const errs=[]
   const onErr=e=>errs.push('pageerror '+String(e.message||e).slice(0,160))
   const onCons=m=>{if(m.type()==='error'){const t=m.text();if(/Failed to load resource|net::ERR|ERR_BLOCKED|googletagmanager|adsbygoogle|nap5k|doubleclick|monetag|favicon|Content Security|CORS/i.test(t))return;errs.push('console '+t.slice(0,160))}}
   page.on('pageerror',onErr);page.on('console',onCons)
   let status=0
   try{
    const r=await page.goto(base+u,{waitUntil:'load',timeout:+(process.env.AUDIT_TIMEOUT||45000)});status=r?.status()??0
    await page.waitForTimeout(900)
    // dismiss any opening overlay
    await page.keyboard.press('Escape').catch(()=>{})
    // scroll through to trigger lazy images
    await page.evaluate(async()=>{const h=document.documentElement.scrollHeight;for(let y=0;y<Math.min(h,9000);y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}scrollTo(0,0);await new Promise(r=>setTimeout(r,250))})
    if(status>=400){const is404=status===404;if(!is404)note(u,v,'status',`HTTP ${status}`)}
    else{
     const res=await page.evaluate(probe)
     if(errs.length)note(u,v,'error',[...new Set(errs)].slice(0,3).join(' | '))
     if(res.overflow)note(u,v,'overflow',`scrollWidth ${res.overflow.scrollWidth} > ${res.overflow.vw} by ${res.overflow.by}px · ${res.overflow.worst}`)
     if(res.offscreen.length)note(u,v,'offscreen',res.offscreen.slice(0,5).join(' ; '))
     if(res.images.length)note(u,v,'image',[...new Set(res.images)].slice(0,4).join(' ; '))
     if(res.raw.length)note(u,v,'rawtext',[...new Set(res.raw)].slice(0,4).join(' ; '))
     if(res.wrap.length)note(u,v,'wrap',res.wrap.slice(0,8).join(' ; '))
     if(res.clipped.length)note(u,v,'clipped',res.clipped.slice(0,4).join(' ; '))
     if(VIEWS[v].isMobile&&v==='m390'&&res.tap>0)note(u,v,'tap',`${res.tap} controls under 40px · e.g. ${res.tapSample.join(' ; ')}`)
    }
    if(/^\/($|clubs\/(olympiacos|hapoel-tel-aviv)(\/(play|life|history|terrace))?$|life$|kits$|xi$|trivia$)/.test(u)&&(v==='m390'||v==='d1440'))await page.screenshot({path:path.join(out,'shots',`${u.replace(/[^a-z0-9]+/gi,'_')||'home'}__${v}.png`),fullPage:false}).catch(()=>{})
   }catch(e){note(u,v,'status','navigation: '+String(e.message).slice(0,140))}
   page.off('pageerror',onErr);page.off('console',onCons)
   if(++done%25===0)console.log(`${done} done · ${findings.length} findings`)
  }
 }
 await Promise.all(Array.from({length:+(process.env.AUDIT_WORKERS||2)},(_,i)=>worker(i+1)))
}finally{
 if(browser)await browser.close().catch(()=>{})
 if(server)server.kill('SIGTERM')
 writeFileSync(path.join(out,'findings.json'),JSON.stringify(findings,null,1))
 const by={};for(const f of findings){(by[f.kind]??=[]).push(f)}
 let rep=''
 for(const [k,list] of Object.entries(by)){rep+=`\n=== ${k} (${list.length})\n`;for(const f of list)rep+=`${f.view.padEnd(6)} ${f.url}  —  ${f.detail}\n`}
 writeFileSync(path.join(out,'report.txt'),rep||'no findings\n')
 console.log(rep||'no findings');console.log(`\n${findings.length} findings → ${out}`)
}

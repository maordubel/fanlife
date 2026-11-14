// The book and its YouTube channel as slide-up banners (14.11.2026).
// Renders public/ads/{book,kypseli,kypseli-sunday}-{en,he}-{1x,2x}.webp at the promo size (320×50 CSS, 640×100 at 2×).
// Two identities, both taken from the products themselves, never from FAN LIFE's magazine:
//   book    — the novel's own site: paper, ink, the red thread, Karantina display, the triptych cover art
//   kypseli — the channel: a camcorder viewfinder on dark tape, Special Elite typewriter, the red REC thread
// Sources live in brand/source/book-ads/. Run: node scripts/brand/book-channel-banners.mjs
import {chromium} from 'playwright'
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs'
import {join,dirname} from 'node:path'
import {tmpdir} from 'node:os'
import {fileURLToPath} from 'node:url'
import {execFileSync} from 'node:child_process'

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..','..')
const SRC=join(ROOT,'brand/source/book-ads'),OUT=join(ROOT,'public/ads')
const b64=f=>readFileSync(join(SRC,f)).toString('base64')
const font=(name,file,w='400')=>`@font-face{font-family:'${name}';src:url(data:font/woff2;base64,${b64(file)}) format('woff2');font-weight:${w}}`
const FONTS=[font('Karantina','karantina-latin-700-normal.woff2','700'),font('Karantina','karantina-hebrew-700-normal.woff2','700'),
 font('Elite','special-elite-latin-400-normal.woff2'),font('Frank','frank-ruhl-libre-latin-wght-normal.woff2','300 900'),font('Frank','frank-ruhl-libre-hebrew-wght-normal.woff2','300 900')].join('')
const TRIPTYCH=`data:image/png;base64,${b64('triptych.png')}`
const PAPER='#F2EADB',INK='#1D1A21',THREAD='#A8101F'
const grain=`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .16 0'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>")`

/* ── the novel ── */
function book(lang){
 const he=lang==='he'
 const t=he?{a:'קולקטיב',b:'שבור',line:'רומן. ים אחד, שני חופים, חוט אדום אחד.',cta:'לקריאה חינם',arrow:'←'}
  :{a:'Broken',b:'Collective',line:'A novel. One sea, two shores, one red thread.',cta:'Read free',arrow:'→'}
 // the thread enters behind the cover, runs under the words and ends in the button — the book's own motif
 const thread=he?'M302 49 L262 46.5 L236 48.5 L196 46 L150 48.5 L104 46 L78 48':'M18 49 L58 46.5 L84 48.5 L124 46 L170 48.5 L216 46 L242 48'
 return `<div class="b" dir="${he?'rtl':'ltr'}">
  <svg class="thread" viewBox="0 0 320 50"><path d="${thread}" fill="none" stroke="${THREAD}" stroke-width="1.1" stroke-linejoin="bevel"/></svg>
  <img class="cover" src="${TRIPTYCH}" alt="">
  <div class="words"><div class="title"><span>${t.a}</span> <em>${t.b}</em></div><div class="line">${t.line}</div></div>
  <div class="cta"><span>${t.cta}</span><b>${t.arrow}</b></div>
 </div>`
}
const BOOK_CSS=`
.b{position:relative;inline-size:320px;block-size:50px;background:${PAPER};background-image:${grain};display:flex;align-items:center;gap:7px;padding-inline:6px 8px;box-sizing:border-box;overflow:hidden;color:${INK}}
.b::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 0 1px rgba(29,26,33,.12);pointer-events:none}
.thread{position:absolute;inset:0;inline-size:320px;block-size:50px}
.cover{block-size:44px;inline-size:auto;position:relative;filter:drop-shadow(1px 1px 0 rgba(29,26,33,.25));transform:rotate(-2deg)}
[dir=rtl] .cover{transform:rotate(2deg)}
.words{position:relative;flex:1;min-inline-size:0;display:grid;gap:1px}
.title{font:700 27px/0.86 Karantina;letter-spacing:.01em;white-space:nowrap}
.title em{font-style:normal;color:${THREAD}}
.line{font:500 7.6px/1.15 Frank;letter-spacing:.01em;opacity:.86;white-space:nowrap}
[dir=rtl] .line{font-size:8.4px}
.cta{position:relative;display:flex;align-items:center;gap:4px;background:${INK};color:${PAPER};padding:0 7px;block-size:24px;font:700 15px/1 Karantina;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
[dir=rtl] .cta{font-size:16px;letter-spacing:0}
.cta b{font:400 11px/1 Frank}`

/* ── the channel ── */
function tape(lang,sunday){
 const he=lang==='he'
 const osd=sunday?(he?'<i class="rec">●</i> קלטת חדשה הערב · 19:00':'<i class="rec">●</i> NEW TAPE TONIGHT · 19:00 ATHENS')
  :'<span dir="ltr"><i class="rec">●</i> REC &nbsp;06:29</span>'
 const line=sunday?(he?'כל יום ראשון פרק חדש מ"קולקטיב שבור" · כתוביות בעברית':'Every Sunday, the next chapter of the novel.')
  :(he?'"קולקטיב שבור" – קלטת אחרי קלטת · כתוביות בעברית':'Broken Collective, the novel — tape by tape.')
 const cta=he?'לצפייה':'Watch'
 return `<div class="k${sunday?' sun':''}" dir="${he?'rtl':'ltr'}">
  <i class="vf tl"></i><i class="vf tr"></i><i class="vf bl"></i><i class="vf br"></i>
  <svg class="cass" direction="ltr" viewBox="0 0 52 34" aria-hidden="true">
   <rect x=".5" y=".5" width="51" height="33" rx="2.5" fill="#2B2730" stroke="#4A4452"/>
   <rect x="4" y="4" width="44" height="17" rx="1" fill="${PAPER}"/>
   <rect x="4" y="15" width="44" height="2.2" fill="${THREAD}"/>
   <text x="6.5" y="11.3" font-family="Elite" font-size="5.6" fill="${INK}">TAPE ${sunday?'NEW':'00'}</text>
   <rect x="13" y="22.5" width="26" height="8" rx="4" fill="#141217" stroke="#4A4452" stroke-width=".6"/>
   <circle cx="18" cy="26.5" r="2.6" fill="none" stroke="${PAPER}" stroke-width=".9" stroke-dasharray="1.4 .9"/>
   <circle cx="34" cy="26.5" r="2.6" fill="none" stroke="${PAPER}" stroke-width=".9" stroke-dasharray="1.4 .9"/>
  </svg>
  <div class="words"><div class="osd">${osd}</div><div class="name">THE KYPSELI TAPES</div><div class="line">${line}</div></div>
  <div class="cta"><b>▶</b><span>${cta}</span></div>
 </div>`
}
const TAPE_CSS=`
.k{position:relative;inline-size:320px;block-size:50px;background:${INK};background-image:${grain},repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px),radial-gradient(120% 140% at 30% 50%,#2A2530 0%,${INK} 70%);display:flex;align-items:center;gap:7px;padding-inline:9px 10px;box-sizing:border-box;overflow:hidden;color:${PAPER}}
.vf{position:absolute;inline-size:7px;block-size:7px;border:1px solid rgba(242,234,219,.55)}
.tl{inset-block-start:3px;inset-inline-start:3px;border-inline-end:0;border-block-end:0}.tr{inset-block-start:3px;inset-inline-end:3px;border-inline-start:0;border-block-end:0}
.bl{inset-block-end:3px;inset-inline-start:3px;border-inline-end:0;border-block-start:0}.br{inset-block-end:3px;inset-inline-end:3px;border-inline-start:0;border-block-start:0}
.cass{inline-size:44px;block-size:29px;flex:none;transform:rotate(-4deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
[dir=rtl] .cass{transform:rotate(4deg)}
.words{flex:1;min-inline-size:0;display:grid;gap:1px}.words>*{min-inline-size:0;overflow:hidden}
.osd{font:400 7px/1 Elite;letter-spacing:.08em;color:rgba(242,234,219,.78);white-space:nowrap}
[dir=rtl] .osd{font:600 7.6px/1 Frank;letter-spacing:0}
.rec{font-style:normal;color:${THREAD};filter:drop-shadow(0 0 2px rgba(220,30,50,.9))}
.sun .osd{color:${PAPER}}
.name{font:400 15.5px/1 Elite;letter-spacing:.02em;white-space:nowrap;text-shadow:0 0 6px rgba(242,234,219,.25)}
.line{font:400 7.2px/1.1 Elite;color:rgba(242,234,219,.72);white-space:nowrap}
[dir=rtl] .line{font:500 7.8px/1.15 Frank}
.cta{display:flex;align-items:center;gap:4px;border:1px solid ${THREAD};background:${PAPER};color:${INK};padding:0 7px;block-size:22px;font:400 11px/1 Elite;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;box-shadow:2px 2px 0 ${THREAD}}
[dir=rtl] .cta{font:700 11.5px/1 Frank;letter-spacing:0}
.cta b{color:${THREAD};font:400 8px/1 Elite}`

const JOBS=[
 ['book-en',book('en'),BOOK_CSS],['book-he',book('he'),BOOK_CSS],
 ['kypseli-en',tape('en',false),TAPE_CSS],['kypseli-he',tape('he',false),TAPE_CSS],
 ['kypseli-sunday-en',tape('en',true),TAPE_CSS],['kypseli-sunday-he',tape('he',true),TAPE_CSS],
]
const tmp=mkdtempSync(join(tmpdir(),'bcb-'))
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined})
for(const [id,html,css] of JOBS){
 for(const [scale,suffix] of [[2,'2x'],[1,'1x']]){
  const page=await browser.newPage({viewport:{width:320,height:50},deviceScaleFactor:scale})
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}*{margin:0}html,body{inline-size:320px;block-size:50px;overflow:hidden}${css}</style></head><body>${html}</body></html>`,{waitUntil:'load'})
  await page.evaluate(()=>document.fonts.ready)
  // nothing may spill out of the strip: a line that does not fit is a bug, not a crop
  const over=await page.evaluate(()=>[...document.querySelectorAll('.words>*,.cta')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className))
  if(over.length)throw new Error(`${id}: text overflows in ${over.join(', ')}`)
  const png=join(tmp,`${id}-${suffix}.png`)
  await page.screenshot({path:png,clip:{x:0,y:0,width:320,height:50}})
  execFileSync('python3',['-c',`from PIL import Image;Image.open(${JSON.stringify(png)}).convert('RGB').save(${JSON.stringify(join(OUT,`${id}-${suffix}.webp`))},'WEBP',quality=88,method=6)`])
  await page.close()
 }
 console.log('wrote',id)
}
await browser.close()
writeFileSync(join(tmp,'.done'),'')

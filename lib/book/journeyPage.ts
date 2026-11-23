import copy from '@/messages/book.journey.json'
import {BOOK_SITE,isEdition,type BookLang} from './catalog'
import {arrival,stations,type JourneyOrder} from './journey'

/**
 * THE JOURNEY PAGE (/book/order/<id>, owner 23.11.2026): the reader follows the order from the payment to the shelf, drawn as
 * the book's one red thread — a knot for each station, the thread solid where the order has been and dashed where it is going.
 * Dressed as the book (paper, ink, red), never as FAN LIFE: it is served as a whole document, outside FAN LIFE's layout.
 * Phone first: one column; from 900px a second design, the headline and the way forward on one side and the thread on the other.
 * Pure (tests/book-journey.test.ts).
 */
type Page={id:string;variant:string|null;tracking:Record<string,unknown>|null;created_at?:string}&JourneyOrder
const PAPER='#F2EADB',CARD='#FBF6EC',INK='#1D1A21',RED='#A8101F',SOFT='#46404D'
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
const day=(lang:BookLang,iso:string)=>new Intl.DateTimeFormat(lang==='he'?'he-IL':'en-GB',{day:'numeric',month:'long',timeZone:'Europe/Athens'}).format(new Date(iso))

const CSS=`*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:${PAPER};color:${INK};font:400 17px/1.6 Georgia,'Times New Roman',serif;min-height:100vh}
a{color:inherit}
.bc{max-width:1120px;margin:0 auto;padding:22px 18px 40px;border-block-start:4px solid ${RED}}
.mast{display:flex;align-items:center;gap:10px;font:400 12px/1 Georgia,serif;letter-spacing:.32em;color:${SOFT};text-transform:uppercase;text-decoration:none;min-height:44px}
.mast svg{flex:none}
.kicker{margin:26px 0 6px;font:700 13px/1.3 Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:${RED}}
h1{margin:0 0 10px;font:700 44px/1.02 Georgia,serif;letter-spacing:-.01em}
.what{margin:0 0 4px;font-size:18px}
.now{margin:14px 0 0;font-size:17px;color:${SOFT};max-width:34ch}
.eta{margin:22px 0 0;padding:14px 16px;background:${CARD};border:1px solid ${INK};border-inline-start:6px solid ${RED};font-size:16px}
.acts{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 0}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 22px;font:700 15px/1 Georgia,serif;text-decoration:none;border:2px solid ${INK}}
.btn.red{background:${RED};color:${CARD};border-color:${RED}}
.btn.ink{background:${INK};color:${CARD}}
.btn.line{background:transparent;color:${INK}}
.thread{list-style:none;margin:30px 0 0;padding:0;position:relative}
.thread li{position:relative;padding-block:0 30px;padding-inline-start:46px;min-height:44px}
.thread li::before{content:'';position:absolute;inset-inline-start:13px;inset-block:18px -2px;border-inline-start:3px dashed ${SOFT};opacity:.45}
.thread li:last-child::before{display:none}
.thread li.past::before,.thread li.here::before{border-inline-start-style:solid;border-color:${RED};opacity:1}
.thread li.here::before{border-inline-start-style:dashed}
.knot{position:absolute;inset-inline-start:2px;inset-block-start:2px;width:28px;height:28px;border-radius:50%;border:3px solid ${SOFT};background:${PAPER}}
.past .knot{background:${RED};border-color:${RED}}
.past .knot::after{content:'';position:absolute;inset:6px 8px 9px 7px;border:solid ${CARD};border-width:0 3px 3px 0;transform:rotate(45deg)}
.here .knot{border-color:${RED};background:${CARD}}
.here .knot::before{content:'';position:absolute;inset:5px;border-radius:50%;background:${RED}}
.here .knot::after{content:'';position:absolute;inset:-9px;border-radius:50%;border:2px solid ${RED};animation:pulse 2.2s ease-out infinite}
@keyframes pulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.35);opacity:0}}
@media (prefers-reduced-motion:reduce){.here .knot::after{animation:none;opacity:.5}}
.st{display:block;font:700 19px/1.25 Georgia,serif}
.future .st{color:${SOFT};font-weight:400}
.at{display:block;font:400 13px/1.4 Arial,sans-serif;color:${SOFT};letter-spacing:.04em;margin-block-start:3px}
.wait{margin:34px 0 0;padding:20px 18px;background:${CARD};border:1px solid ${INK}}
.wait h2{margin:0 0 12px;font:700 13px/1.3 Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:${RED}}
.wait p{margin:14px 0 0;font-size:15px;color:${SOFT}}
.sign{font-style:italic}
.foot{margin:34px 0 0;font:400 12px/1.6 Arial,sans-serif;color:${SOFT};display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:space-between}
.foot a{display:inline-flex;align-items:center;min-height:44px;text-decoration:none;font-weight:700;color:${INK}}
@media (min-width:900px){
 .bc{padding:34px 40px 56px}
 .grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:72px;align-items:start}
 .lead{position:sticky;inset-block-start:34px}
 h1{font-size:76px;line-height:.98;margin-block-start:8px}
 .kicker{margin-block-start:46px}
 .now{font-size:19px}
 .thread{margin-block-start:96px}
 .thread li{padding-block-end:44px}
 .st{font-size:22px}
}`

const knot=`<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M1 11h6c4 0 4-6 7-6s3 6 0 8-6-1-3-4 6 2 10 2" fill="none" stroke="${RED}" stroke-width="2" stroke-linecap="round"/></svg>`

function shell(lang:BookLang,title:string,body:string,refresh:boolean){
 const c=copy[lang]
 return `<!doctype html><html lang="${lang}" dir="${lang==='he'?'rtl':'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="${PAPER}"><meta name="color-scheme" content="light only">${refresh?'<meta http-equiv="refresh" content="300">':''}
<title>${esc(title)} · ${esc(c.book)}</title><style>${CSS}</style></head><body><main class="bc">
<a class="mast" href="${BOOK_SITE}/${lang}/">${knot}${esc(c.book)}</a>${body}
<footer class="foot"><span>${esc(c.updated)}</span><a href="https://www.dubelteam.com">${esc(c.credit)}</a></footer></main></body></html>`
}

export function missingPage(lang:BookLang){
 const c=copy[lang]
 return shell(lang,c.missingTitle,`<p class="kicker">${esc(c.title)}</p><h1>${esc(c.missingTitle)}</h1><p class="now">${esc(c.missing)}</p>
<div class="acts"><a class="btn ink" href="${BOOK_SITE}/${lang}/">${esc(c.read)}</a></div>`,false)
}

export function journeyPage(o:Page,now=Date.now()){
 const lang=o.lang,c=copy[lang],{list,at,done}=stations(o,now),key=list[at]!.key
 const kind=c.kinds[o.kind],ed=o.kind==='paperback'&&isEdition(o.variant)?` · ${c.editions[o.variant]}`:o.kind!=='paperback'&&o.variant?` · ${esc(o.variant.replace('|',' · ').replace(' · One size',''))}`:''
 const w=arrival(o),track=(o.tracking as {urls?:string[]}|null)?.urls?.[0]
 const odd=o.status==='refunded'||o.status==='canceled'?c.refunded:o.status==='failed'?c.failed:null
 const eta=odd?`<p class="eta">${esc(odd)}</p>`:w&&!done?`<p class="eta">${esc(c.eta.replace('{from}',day(lang,w.from)).replace('{to}',day(lang,w.to)))}</p>`
  :!w&&o.kind==='paperback'&&at<3?`<p class="eta">${esc(c.etaPrint)}</p>`:''
 const thread=list.map((s,i)=>{const cls=done||i<at?'past':i===at?'here':'future',when=s.at&&(cls!=='future'||s.key==='hands')?`<span class="at">${esc(day(lang,s.at))}</span>`:''
  return `<li class="${cls}"${cls==='here'?' aria-current="step"':''}><span class="knot"></span><span class="st">${esc(c.stations[s.key])}</span>${when}</li>`}).join('')
 const body=`<div class="grid"><section class="lead">
<p class="kicker">${esc(c.title)}</p><h1>${esc(odd?c.title:c.headline[key])}</h1>
<p class="what">${esc(kind)}${ed}</p><p class="now">${esc(c.now[key])}</p>${eta}
<div class="acts">${track?`<a class="btn red" href="${esc(track)}" rel="noopener">${esc(c.track)}</a>`:''}</div></section>
<section><ol class="thread">${thread}</ol>
<aside class="wait"><h2>${esc(c.wait)}</h2><div class="acts"><a class="btn ink" href="${BOOK_SITE}/${lang}/">${esc(c.read)}</a><a class="btn line" href="${BOOK_SITE}/${lang}/tapes/">${esc(c.tapes)}</a></div>
<p>${esc(c.help)} <span class="sign">— ${esc(c.sign)}</span></p></aside>
<p class="at">${esc(c.order)} ${esc(o.id)}</p></section></div>`
 return shell(lang,c.headline[key],body,!done&&!odd)
}

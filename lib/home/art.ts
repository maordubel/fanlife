/** The magazine's pictures (owner packs vol. 02 and vol. 03, 23.11.2026) — cut by scripts/brand/art-vol2.py. */
export type Scene='matchday'|'terrace'|'duel'|'lineup'|'kit-detail'|'match-archive'|'sticker-pack'
export type Bit='vintage-football'|'supporter-scarf'|'football-boots'|'terrace-flag'|'trophy'|'match-ticket'|'referee-whistle'|'corner-flag'|'keeper'
const ART='/brand/fanlife/art',BITS='/brand/fanlife/bits'
export const scene=(k:Scene)=>({src:`${ART}/${k}-960.webp`,srcSet:`${ART}/${k}-480.webp 480w, ${ART}/${k}-960.webp 960w`})
export const bit=(k:Bit)=>k==='keeper'?{src:`${BITS}/keeper-480.webp`,srcSet:`${BITS}/keeper-240.webp 240w, ${BITS}/keeper-480.webp 480w`}:{src:`${BITS}/${k}-320.webp`,srcSet:`${BITS}/${k}-160.webp 160w, ${BITS}/${k}-320.webp 320w`}
/** the key the welcome screen remembers a visit under, and the address that shows it again (`/?welcome=1`) */
export const WELCOME_KEY='fl:welcomed',WELCOME_PARAM='welcome=1'
/** Runs before the first paint: a first visit (or `?welcome=1`) raises the welcome. It also answers the welcome's own buttons and
 *  Escape, so "Kick off" works the moment it is on screen — before any bundle has loaded (owner, 23.11.2026: "it must come up fast").
 *  Without scripts the welcome never shows, so it can never trap anyone. */
export const WELCOME_BOOT=`(function(){try{var d=document,r=d.documentElement,K='${WELCOME_KEY}';if(location.search.indexOf('${WELCOME_PARAM}')>-1||!localStorage.getItem(K))r.setAttribute('data-welcome','in');function shut(pick){try{localStorage.setItem(K,'1')}catch(e){}r.setAttribute('data-welcome','out');setTimeout(function(){r.removeAttribute('data-welcome');if(pick){var n=0;(function go(){var el=d.getElementById('pick');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});else if(n++<40)setTimeout(go,250)})()}},420)}d.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('[data-welcome-act]');if(t&&r.getAttribute('data-welcome')==='in')shut(t.getAttribute('data-welcome-act')==='go')});d.addEventListener('keydown',function(e){if(e.key==='Escape'&&r.getAttribute('data-welcome')==='in')shut(false)})}catch(e){}})()`

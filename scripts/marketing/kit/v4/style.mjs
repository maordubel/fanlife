/** FAN LIFE social pictures v4 — the marketing language the owner approved on 14.11.2026 ("v3 is my direction —
 *  polish, improve, intensify"). Its own voice, in tune with the site but not the site: the feature's real image is
 *  the hero and is never drowned; heavy italic condensed caps; the club's colour full-bleed or deep black; a strip of
 *  the club's colours on top; a dashed ticket tear above the foot; a sharp white button with a hard shadow. Nostalgia
 *  from The Weekly in small doses: the FAN LIFE badge in Shrikhand, Ultra numerals, halftone dots, grain.
 *  This file is the stylesheet and the page shell; templates.mjs fills it. */
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const font = f => pathToFileURL(path.join(HERE, 'fonts', f)).href
const NOISE = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .35  0 0 0 0 .28  0 0 0 0 .15  0 0 0 .6 0'/></filter><rect width='220' height='220' filter='url(%23n)' opacity='.3'/></svg>\")"

export const FACES = `
@font-face{font-family:Archivo;font-style:normal;font-weight:100 900;font-stretch:62% 125%;src:url(${font('archivo-latin-wdth-normal.woff2')}) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-2199,U+2212,U+2215}
@font-face{font-family:Archivo;font-style:italic;font-weight:100 900;font-stretch:62% 125%;src:url(${font('archivo-latin-wdth-italic.woff2')}) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-2199,U+2212,U+2215}
@font-face{font-family:Archivo;font-style:normal;font-weight:100 900;font-stretch:62% 125%;src:url(${font('archivo-latin-ext-wdth-normal.woff2')}) format('woff2');unicode-range:U+0100-024F,U+1E00-1EFF}
@font-face{font-family:Archivo;font-style:italic;font-weight:100 900;font-stretch:62% 125%;src:url(${font('archivo-latin-ext-wdth-italic.woff2')}) format('woff2');unicode-range:U+0100-024F,U+1E00-1EFF}
@font-face{font-family:Archivo;font-style:italic;font-weight:900;src:url(${font('fira-sans-extra-condensed-greek-900-italic.woff2')}) format('woff2');unicode-range:U+0370-03FF,U+1F00-1FFF}
@font-face{font-family:Archivo;font-style:normal;font-weight:400 900;src:url(${font('fira-sans-greek-700-normal.woff2')}) format('woff2');unicode-range:U+0370-03FF,U+1F00-1FFF}
@font-face{font-family:Shrikhand;src:url(${font('shrikhand-latin-400-normal.woff2')}) format('woff2')}
@font-face{font-family:Ultra;src:url(${font('ultra-latin-400-normal.woff2')}) format('woff2')}
@font-face{font-family:Knewave;src:url(${font('knewave-latin-400-normal.woff2')}) format('woff2')}`

export const CSS = `
*{box-sizing:border-box}
html,body{margin:0;background:#000}
.post{position:relative;width:1080px;overflow:hidden;color:var(--on);font-family:Archivo,Arial,sans-serif;background:var(--bg);display:flex;flex-direction:column}
.grain{position:absolute;inset:0;background-image:${NOISE};pointer-events:none;mix-blend-mode:overlay;opacity:.9;z-index:20}
.dots{position:absolute;inset:0;background-image:radial-gradient(var(--d) 32%,transparent 35%);background-size:18px 18px;-webkit-mask-image:linear-gradient(135deg,#000 0%,transparent 72%);mask-image:linear-gradient(135deg,#000 0%,transparent 72%);pointer-events:none}
.strip{position:absolute;left:0;top:0;width:1080px;height:14px;background:repeating-linear-gradient(90deg,var(--s1) 0 30px,var(--s2) 30px 60px);z-index:5}
.top{position:relative;z-index:4;display:flex;align-items:center;justify-content:space-between;padding:56px 64px 0;flex:none}
.brand{display:flex;align-items:center;gap:16px}
.brand img{width:92px;height:92px;border-radius:50%;background:#FFFBF2;box-shadow:5px 5px 0 rgba(0,0,0,.35)}
.brand b{font-family:Shrikhand;font-weight:400;font-size:44px;color:#FFFBF2;text-shadow:4px 4px 0 rgba(0,0,0,.35);transform:rotate(-3deg);display:inline-block}
.light .brand b{color:#15130F;text-shadow:4px 4px 0 rgba(0,0,0,.12)}
.crest{width:100px;height:100px;object-fit:contain;filter:drop-shadow(5px 5px 0 rgba(0,0,0,.35))}
.applogo{height:120px;width:auto;object-fit:contain}
.body{position:relative;z-index:3;flex:1;display:flex;flex-direction:column;padding:0 64px;min-height:0}
.tag{font:800 20px/1 Archivo;letter-spacing:.22em;text-transform:uppercase;display:flex;align-items:center;gap:14px;margin:0}
.tag i{display:block;width:44px;height:3px;background:currentColor}
.tag.hot{color:var(--hot,#FF5A4E)}
.pill{align-self:flex-start;background:var(--accent,#D71920);color:#FFFBF2;padding:12px 20px;font:800 20px/1 Archivo;letter-spacing:.2em;text-transform:uppercase;box-shadow:6px 6px 0 #000}
.h{font-family:Archivo;font-style:italic;font-weight:900;font-stretch:72%;text-transform:uppercase;line-height:.86;letter-spacing:-.01em;margin:0;text-wrap:balance}
.h .x{color:var(--hot,#D71920)}
.shadowed{text-shadow:10px 10px 0 rgba(0,0,0,.25)}
.k{font:800 22px/1.2 Archivo;letter-spacing:.2em;text-transform:uppercase;margin:0}
.lead{font:600 34px/1.25 Archivo;margin:0;text-wrap:pretty}
.num{font-family:Ultra;font-weight:400;line-height:1}
.frame{position:relative;overflow:hidden;box-shadow:14px 14px 0 rgba(0,0,0,.45);outline:2px solid rgba(255,251,242,.85);outline-offset:10px}
.light .frame{outline-color:rgba(21,19,15,.6)}
.paper{background:#FFFBF2;color:#15130F}
.plate{position:relative;background:#FFFBF2;box-shadow:14px 14px 0 rgba(0,0,0,.35)}
.plate .tone{position:absolute;inset:0;background:var(--tone,#FFFBF2);-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center}
.plate .line{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.foot{position:relative;z-index:4;flex:none;margin:0 64px 58px;display:flex;align-items:center;justify-content:space-between;padding-top:34px;border-top:3px dashed color-mix(in srgb,var(--on) 40%,transparent)}
.foot .u{font:800 20px/1 Archivo;letter-spacing:.2em;text-transform:uppercase;opacity:.85}
.btn{display:inline-flex;align-items:center;gap:22px;height:78px;padding:0 34px;background:var(--btn,#FFFBF2);color:var(--btnText,#15130F);font:italic 900 34px/1 Archivo;font-stretch:78%;text-transform:uppercase;box-shadow:8px 8px 0 #15130F;white-space:nowrap}
.btn b{font-style:normal;font-size:38px}
.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}
.ans{border:3px solid color-mix(in srgb,var(--on) 55%,transparent);display:flex;flex-direction:column;justify-content:space-between;padding:22px 26px;background:rgba(255,255,255,.03)}
.ans .num{font-size:46px;color:var(--hot,#D71920)}
.ans b{font:italic 900 50px/1 Archivo;font-stretch:74%;text-transform:uppercase}
.row{display:flex;align-items:center;gap:26px;padding:22px 0;border-bottom:2px solid color-mix(in srgb,var(--on) 22%,transparent)}
.row img{width:96px;height:96px;object-fit:contain;flex:none}
.lamp{display:inline-flex;gap:6px}
.lamp span{width:58px;height:80px;background:#1E1E1E;border:2px solid #333;display:flex;align-items:center;justify-content:center;font:400 46px/1 Ultra;color:#FFFBF2}
.stamp{position:absolute;z-index:6;background:#FFFBF2;color:#15130F;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:8px 8px 0 var(--hot,#D71920);transform:rotate(4deg)}
.cell{border:2px solid color-mix(in srgb,var(--on) 45%,transparent);display:flex;flex-direction:column;justify-content:space-between;padding:16px}
.cell .num{font-size:26px;color:var(--hot,#E8432B)}
.cell b{font:italic 900 30px/.98 Archivo;font-stretch:74%;text-transform:uppercase}
.split{position:absolute;inset:0;z-index:0}
.dare{position:relative;z-index:6;flex:none;margin:0 64px 22px;align-self:flex-start;transform:rotate(-2deg);background:var(--hot,#D71920);color:var(--bg);padding:14px 24px;box-shadow:6px 6px 0 rgba(0,0,0,.45)}
.dare span{font:italic 900 40px/1 Archivo;font-stretch:76%;text-transform:uppercase;white-space:nowrap}
/* motion (stories): each [data-in] element enters once; the frame grabber seeks every animation to the frame's time */
@keyframes up{from{transform:translateY(80px);opacity:0}to{transform:none;opacity:1}}
@keyframes left{from{transform:translateX(-140px);opacity:0}to{transform:none;opacity:1}}
@keyframes right{from{transform:translateX(140px);opacity:0}to{transform:none;opacity:1}}
@keyframes pop{0%{transform:scale(.4) rotate(-8deg);opacity:0}70%{transform:scale(1.08) rotate(2deg);opacity:1}100%{transform:none;opacity:1}}
@keyframes slam{0%{transform:scale(2.4);opacity:0}60%{transform:scale(.94);opacity:1}100%{transform:none}}
@keyframes kb{from{transform:scale(1.18) translate(2%,2%)}to{transform:scale(1) translate(0,0)}}
@keyframes pulse{0%,100%{transform:none}50%{transform:scale(1.06)}}
@keyframes wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
.motion [data-in]{animation-duration:.7s;animation-fill-mode:both;animation-timing-function:cubic-bezier(.2,.9,.25,1.1)}
.motion [data-in=up]{animation-name:up}.motion [data-in=left]{animation-name:left}.motion [data-in=right]{animation-name:right}
.motion [data-in=pop]{animation-name:pop}.motion [data-in=slam]{animation-name:slam;animation-duration:.55s}.motion [data-in=wipe]{animation-name:wipe;animation-duration:.9s}
.motion [data-kb]{animation:kb 7s ease-out both}
.motion [data-pulse]{animation:pulse 1.2s ease-in-out 2.4s infinite}
`

/** the whole page: one post, sized for a feed (1080 × 1350) or a story (1080 × 1920) */
export function shell(inner, {story = false, motion = false, vars = '', light = false} = {}) {
  const h = story ? 1920 : 1350
  return `<!doctype html><html><head><meta charset="utf-8"><style>${FACES}${CSS}</style></head><body><script>addEventListener('DOMContentLoaded',()=>document.querySelectorAll('[data-d]').forEach(e=>{e.style.animationDelay=e.dataset.d+'s'}))</script><div class="post${motion ? ' motion' : ''}${light ? ' light' : ''}" style="height:${h}px;${vars}">${inner}</div></body></html>`
}

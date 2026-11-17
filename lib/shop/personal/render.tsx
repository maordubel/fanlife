import 'server-only'
import {ImageResponse} from 'next/og'
import satori from 'satori'
import sharp from 'sharp'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {ogFonts} from '@/lib/og/fonts'
import {XIPoster,SHEET,type Layout,type XIPrintSpec} from './xi-poster'
import {SouvenirSheet,SOUVENIRS,kitsOf,type MapArt,type SouvenirSpec} from './souvenirs'
import {drawMap} from './map'

let seal:Promise<string>|null=null
let ext:Promise<{name:string;data:Buffer;weight:800|900;style:'normal'}[]>|null=null
/** names carry č, ć, đ, š, ž (Zrinjski, Partizan, Olympiacos' Serbs): the house faces plus their Latin-extended subsets */
const extFonts=()=>ext??=Promise.all([readFile(join(process.cwd(),'lib/og/fonts/heebo-latin-ext-800.ttf')),readFile(join(process.cwd(),'lib/og/fonts/archivo-latin-ext-800.ttf')),readFile(join(process.cwd(),'lib/og/fonts/frank-ruhl-libre-latin-900.ttf'))])
 // the serif's Latin under its own name: under the shared "Frank" the Hebrew subset answers first and the Latin falls to Heebo
 .then(([h,a,f])=>[{name:'HeeboX',data:h,weight:800 as const,style:'normal' as const},{name:'ArchivoX',data:a,weight:800 as const,style:'normal' as const},{name:'FrankL',data:f,weight:900 as const,style:'normal' as const}])
/** the FAN LIFE seal in one ink: a club's print never carries another colour than its own */
const sealUri=()=>seal??=readFile(join(process.cwd(),'public/brand/fanlife/seal-mono-512.png')).then(b=>`data:image/png;base64,${b.toString('base64')}`)
export const PRINT={w:3600,h:4800}

const SAFE=/^[a-z0-9-]+$/
const kitCache=new Map<string,Promise<string|null>>()
/**
 * One kit drawing ready for print: the crest picture and the sponsor's word come out (marks that are not ours to sell);
 * the shirt's design, colours, shorts and socks stay. Unknown or unsafe ids answer null (the plate is drawn instead).
 */
export function kitPrint(club:string,id:string):Promise<string|null>{
 if(!SAFE.test(club)||!SAFE.test(id))return Promise.resolve(null)
 const key=`${club}/${id}`
 let p=kitCache.get(key)
 if(!p){p=readFile(join(process.cwd(),'public/club-kits',club,'svg',`${id}.svg`),'utf8').then(s=>{
   const full=/viewBox="0 0 430 470"/.test(s),clean=s.replace(/<image\b[^>]*?(\/>|>[\s\S]*?<\/image>)/g,'').replace(/<text\b[\s\S]*?<\/text>/g,'')
    // one look across every club: the shirt alone (some drawings carry shorts and socks beside it) — the same frame for all
    .replace(/<svg\b[^>]*>/,t=>t.replace(/\s(width|height|viewBox)="[^"]*"/g,'').replace(/>$/,' viewBox="0 20 340 300">'))
    // and only the shirt (16.11.2026, owner: "a thin line beside some players"): the full drawings keep their socks at x 326+ and
    // their shorts at y 318+, inside that frame — a clip to the shirt's own box takes the last sliver of them out
    .replace(full?/(<svg\b[^>]*>)([\s\S]*)<\/svg>\s*$/:/$^/,(_m,open:string,body:string)=>`${open}<clipPath id="fl-shirt-only"><rect x="0" y="20" width="326" height="296"/></clipPath><g clip-path="url(#fl-shirt-only)">${body}</g></svg>`)
   return `data:image/svg+xml;base64,${Buffer.from(clean).toString('base64')}`}).catch(()=>null)
  kitCache.set(key,p)}
 return p
}
/** a sheet as a PNG at scale k: print k=3 (3600×4800), proof k=0.6 */
export async function renderXI(spec:XIPrintSpec,k:number,layout:Layout='print'):Promise<ImageResponse>{
 const art:Record<number,string>={}
 if(layout!=='tee-front')await Promise.all(spec.n.map(async(p,i)=>{if(p.u){const a=await kitPrint(spec.c,p.u);if(a)art[i]=a}}))
 const s=SHEET[layout]
 return new ImageResponse(<XIPoster spec={spec} k={k} seal={await sealUri()} art={art} layout={layout}/>,{width:Math.round(s.w*k),height:Math.round(s.h*k),fonts:[...await ogFonts(),...await extFonts()]})
}

/** a souvenir sheet (shirts · legends · first match · away) as a PNG at scale k */
export async function renderSouvenir(spec:SouvenirSpec,k:number):Promise<ImageResponse>{
 const art:Record<number,string>={}
 await Promise.all(kitsOf(spec).map(async(p,i)=>{if(p.u){const a=await kitPrint(p.cl||spec.c,p.u);if(a)art[i]=a}}))
 let map:MapArt|undefined
 if(spec.w==='away'){const w=1040,h=spec.stops.length>8?520:600,m=drawMap([spec.home,...spec.stops],w,h)
  map={land:m.land,borders:m.borders,pts:spec.stops.map(s=>m.at(s)),home:m.at(spec.home),w,h}}
 return new ImageResponse(<SouvenirSheet spec={spec} k={k} art={art} map={map}/>,{width:Math.round(1200*k),height:Math.round(1600*k),fonts:[...await ogFonts(),...await extFonts()]})
}

/**
 * THE PAID FILE, FAST (17.11.2026, owner: "the link must not go out before the file is ready — reliable, as fast as can be").
 * The same sheet, laid out by satori (the engine inside next/og, pinned to the same version) and rasterised by sharp's native
 * librsvg instead of the WebAssembly renderer next/og carries. Two things made librsvg slow and are rewritten first, with the
 * pixels unchanged (measured against the next/og file: no pixel off by more than 24 of 255 outside 0.03% of the sheet):
 * satori clips every box with a <mask> (rasterised pixel by pixel) — rectangle masks become clip paths; and each kit is a whole
 * SVG inside the SVG — each is drawn once to a PNG at its own size. 72 s → 6 s for an eleven on two cores.
 */
export async function printPng(spec:XIPrintSpec|SouvenirSpec,o:{k?:number;layout?:Layout}={}):Promise<Buffer>{
 const fonts=[...await ogFonts(),...await extFonts()],k=o.k??3,layout=o.layout??'print'
 let el:JSX.Element,w:number,h:number
 if('w' in spec&&(SOUVENIRS as readonly string[]).includes(String((spec as {w?:unknown}).w))){
  const sv=spec as SouvenirSpec,art:Record<number,string>={}
  await Promise.all(kitsOf(sv).map(async(p,i)=>{if(p.u){const a=await kitPrint(p.cl||sv.c,p.u);if(a)art[i]=a}}))
  let map:MapArt|undefined
  if(sv.w==='away'){const mw=1040,mh=sv.stops.length>8?520:600,m=drawMap([sv.home,...sv.stops],mw,mh);map={land:m.land,borders:m.borders,pts:sv.stops.map(x=>m.at(x)),home:m.at(sv.home),w:mw,h:mh}}
  el=<SouvenirSheet spec={sv} k={k} art={art} map={map}/>;w=Math.round(1200*k);h=Math.round(1600*k)
 }else{
  const xi=spec as XIPrintSpec,art:Record<number,string>={}
  if(layout!=='tee-front')await Promise.all(xi.n.map(async(p,i)=>{if(p.u){const a=await kitPrint(xi.c,p.u);if(a)art[i]=a}}))
  const sh=SHEET[layout];el=<XIPoster spec={xi} k={k} seal={await sealUri()} art={art} layout={layout}/>;w=Math.round(sh.w*k);h=Math.round(sh.h*k)
 }
 const raw=await satori(el,{width:w,height:h,fonts})
 const svg=await flatKits(flatShadows(clipsNotMasks(raw)))
 return sharp(Buffer.from(svg),{limitInputPixels:false}).png({compressionLevel:6}).toBuffer()
}
/**
 * satori's rectangle cuts, flattened: every rectangle mask (and every rectangle clip path, however deeply satori chains them)
 * becomes one clip path holding the single rectangle that is the intersection of the chain. Same cut, drawn by geometry
 * instead of per pixel, and with no clip-on-clip chains (which not every rasteriser honours). Anything that is not a plain
 * rectangle (rounded corners, shapes) stays exactly as satori wrote it.
 */
type Box={x:number;y:number;w:number;h:number}
const boxOf=(attrs:string):Box|null=>{
 if(/\b(rx|ry|transform)=/.test(attrs))return null
 const n=(k:string)=>{const m=attrs.match(new RegExp(`\\b${k}="([-\\d.]+)"`));return m?Number(m[1]):k==='x'||k==='y'?0:NaN}
 const b={x:n('x'),y:n('y'),w:n('width'),h:n('height')};return Object.values(b).every(Number.isFinite)?b:null}
const cut=(a:Box,b:Box):Box=>{const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y);return {x,y,w:Math.max(0,Math.min(a.x+a.w,b.x+b.w)-x),h:Math.max(0,Math.min(a.y+a.h,b.y+b.h)-y)}}
const rectOf=(b:Box)=>`<rect x="${+b.x.toFixed(2)}" y="${+b.y.toFixed(2)}" width="${+b.w.toFixed(2)}" height="${+b.h.toFixed(2)}"/>`
export function clipsNotMasks(svg:string):string{
 const own=new Map<string,{box:Box;up?:string}>()
 for(const m of svg.matchAll(/<clipPath id="([^"]+)"(?: clip-path="url\(#([^)]+)\)")?><rect ([^>]*?)\/><\/clipPath>/g)){const b=boxOf(m[3]!);if(b)own.set(m[1]!,{box:b,up:m[2]})}
 const masks=new Set<string>()
 for(const m of svg.matchAll(/<mask id="([^"]+)"[^>]*><rect ([^>]*?)fill="#fff"(?: mask="url\(#([^)]+)\)")?\/>(?:<path [^>]*fill="none" stroke="#000"[^>]*\/>)?<\/mask>/g)){const b=boxOf(m[2]!);if(b){own.set(m[1]!,{box:b,up:m[3]});masks.add(m[1]!)}}
 const memo=new Map<string,Box|null>()
 const eff=(id:string,depth=0):Box|null=>{if(memo.has(id))return memo.get(id)!;const o=own.get(id);let r:Box|null=null
  if(o&&depth<64){if(!o.up)r=o.box;else{const u=eff(o.up,depth+1);r=u?cut(o.box,u):null}}
  memo.set(id,r);return r}
 let s=svg.replace(/<clipPath id="([^"]+)"(?: clip-path="url\(#([^)]+)\)")?><rect ([^>]*?)\/><\/clipPath>/g,(m,id:string)=>{const b=eff(id);return b?`<clipPath id="${id}">${rectOf(b)}</clipPath>`:m})
 s=s.replace(/<mask id="([^"]+)"[^>]*><rect ([^>]*?)fill="#fff"(?: mask="url\(#([^)]+)\)")?\/>(?:<path [^>]*fill="none" stroke="#000"[^>]*\/>)?<\/mask>/g,(m,id:string)=>{const b=masks.has(id)?eff(id):null;return b?`<clipPath id="${id}">${rectOf(b)}</clipPath>`:m})
 let k=0
 return s.replace(/<(\w+)\b([^>]*?) mask="url\(#([^)]+)\)"([^>]*?)(\/?)>/g,(m,tag:string,a:string,id:string,b:string,sl:string)=>{
  const mb=masks.has(id)?eff(id):null;if(!mb)return m
  const has=(a+b).match(/ clip-path="url\(#([^)]+)\)"/)
  if(!has)return `<${tag}${a} clip-path="url(#${id})"${b}${sl}>`
  const cb=eff(has[1]!);if(!cb)return m
  const nid=`fl-c${k++}`
  return `<clipPath id="${nid}">${rectOf(cut(mb,cb))}</clipPath><${tag}${(a+b).replace(has[0],'')} clip-path="url(#${nid})"${sl}>`})
}
/**
 * satori's hard shadows (box-shadow with no blur) are a whole-sheet filter that blurs by nothing and floods one colour: the
 * same shadow is the shape itself filled with that colour, inside the same mask. Blurred shadows are left as they are.
 */
export function flatShadows(svg:string):string{
 const flood=new Map<string,string>()
 for(const m of svg.matchAll(/<filter id="([^"]+)"[^>]*><feGaussianBlur stdDeviation="0" result="b"\/><feFlood flood-color="([^"]+)" in="SourceGraphic" result="f"\/><feComposite in="f" in2="b" operator="in"\/><\/filter>/g))flood.set(m[1]!,m[2]!)
 return svg.replace(/<g( mask="url\(#[^)]+\)")? filter="url\(#([^)]+)\)"( opacity="1")?><(rect|path) ([^>]*?)fill="#fff" stroke="#fff"/g,(m,mk:string|undefined,f:string,op:string|undefined,tag:string,a:string)=>{
  const c=flood.get(f);return c?`<g${mk??''}${op??''}><${tag} ${a}fill="${c}" stroke="${c}"`:m})
}
/** every kit (an SVG inside the SVG) drawn once to a PNG at the size it is placed at */
async function flatKits(svg:string):Promise<string>{
 const re=/<image ([^>]*?)width="([\d.]+)" height="([\d.]+)"([^>]*?)href="data:image\/svg\+xml;base64,([^"]+)"/g,done=new Map<string,string>()
 for(const m of svg.matchAll(re)){const [,,w,h,,d]=m,key=`${w}x${h}:${d}`
  if(!done.has(key))done.set(key,(await sharp(Buffer.from(d!,'base64'),{density:72*Math.max(Number(w)/340,1)}).resize(Math.round(Number(w)),Math.round(Number(h)),{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()).toString('base64'))}
 return svg.replace(re,(_m,a:string,w:string,h:string,b:string,d:string)=>`<image ${a}width="${w}" height="${h}"${b}href="data:image/png;base64,${done.get(`${w}x${h}:${d}`)}"`)
}

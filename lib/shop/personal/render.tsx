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
export async function printPng(spec:XIPrintSpec|SouvenirSpec):Promise<Buffer>{
 const fonts=[...await ogFonts(),...await extFonts()]
 let el:JSX.Element,w:number,h:number
 if('w' in spec&&(SOUVENIRS as readonly string[]).includes(String((spec as {w?:unknown}).w))){
  const sv=spec as SouvenirSpec,art:Record<number,string>={}
  await Promise.all(kitsOf(sv).map(async(p,i)=>{if(p.u){const a=await kitPrint(p.cl||sv.c,p.u);if(a)art[i]=a}}))
  let map:MapArt|undefined
  if(sv.w==='away'){const mw=1040,mh=sv.stops.length>8?520:600,m=drawMap([sv.home,...sv.stops],mw,mh);map={land:m.land,borders:m.borders,pts:sv.stops.map(x=>m.at(x)),home:m.at(sv.home),w:mw,h:mh}}
  el=<SouvenirSheet spec={sv} k={3} art={art} map={map}/>;w=3600;h=4800
 }else{
  const xi=spec as XIPrintSpec,art:Record<number,string>={}
  await Promise.all(xi.n.map(async(p,i)=>{if(p.u){const a=await kitPrint(xi.c,p.u);if(a)art[i]=a}}))
  const sh=SHEET.print;el=<XIPoster spec={xi} k={3} seal={await sealUri()} art={art} layout="print"/>;w=Math.round(sh.w*3);h=Math.round(sh.h*3)
 }
 const svg=await flatKits(clipsNotMasks(await satori(el,{width:w,height:h,fonts})))
 return sharp(Buffer.from(svg),{limitInputPixels:false}).png({compressionLevel:6}).toBuffer()
}
/** satori's rectangle masks (and masks inside them) as clip paths: the same cut, drawn by geometry instead of per pixel */
export function clipsNotMasks(svg:string):string{
 const rect=new Map<string,string>();let n=-1,s=svg
 while(n!==rect.size){n=rect.size
  s=s.replace(/<mask id="([^"]+)"[^>]*><rect ([^>]*?)fill="#fff"(?: mask="url\(#([^)]+)\)")?\/>(?:<path [^>]*fill="none" stroke="#000"[^>]*\/>)?<\/mask>/g,(m,id:string,attrs:string,p?:string)=>{
   if(p&&!rect.has(p))return m
   rect.set(id,attrs.trim());return `<clipPath id="${id}"${p?` clip-path="url(#${p})"`:''}><rect ${attrs.trim()}/></clipPath>`})}
 let k=0
 return s.replace(/<(\w+)\b([^>]*?) mask="url\(#([^)]+)\)"([^>]*?)(\/?)>/g,(m,tag:string,a:string,id:string,b:string,sl:string)=>{
  if(!rect.has(id))return m
  const has=(a+b).match(/ clip-path="url\(#([^)]+)\)"/)
  if(!has)return `<${tag}${a} clip-path="url(#${id})"${b}${sl}>`
  const nid=`fl-c${k++}`
  return `<clipPath id="${nid}" clip-path="url(#${has[1]})"><rect ${rect.get(id)} clip-path="url(#${id})"/></clipPath><${tag}${(a+b).replace(has[0],'')} clip-path="url(#${nid})"${sl}>`})
}
/** every kit (an SVG inside the SVG) drawn once to a PNG at the size it is placed at */
async function flatKits(svg:string):Promise<string>{
 const re=/<image ([^>]*?)width="([\d.]+)" height="([\d.]+)"([^>]*?)href="data:image\/svg\+xml;base64,([^"]+)"/g,done=new Map<string,string>()
 for(const m of svg.matchAll(re)){const [,,w,h,,d]=m,key=`${w}x${h}:${d}`
  if(!done.has(key))done.set(key,(await sharp(Buffer.from(d!,'base64'),{density:72*Math.max(Number(w)/340,1)}).resize(Math.round(Number(w)),Math.round(Number(h)),{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()).toString('base64'))}
 return svg.replace(re,(_m,a:string,w:string,h:string,b:string,d:string)=>`<image ${a}width="${w}" height="${h}"${b}href="data:image/png;base64,${done.get(`${w}x${h}:${d}`)}"`)
}

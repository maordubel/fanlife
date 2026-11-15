import 'server-only'
import {ImageResponse} from 'next/og'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {ogFonts} from '@/lib/og/fonts'
import {XIPoster,SHEET,type Layout,type XIPrintSpec} from './xi-poster'

let seal:Promise<string>|null=null
let ext:Promise<{name:string;data:Buffer;weight:800;style:'normal'}[]>|null=null
/** names carry č, ć, đ, š, ž (Zrinjski, Partizan, Olympiacos' Serbs): the house faces plus their Latin-extended subsets */
const extFonts=()=>ext??=Promise.all([readFile(join(process.cwd(),'lib/og/fonts/heebo-latin-ext-800.ttf')),readFile(join(process.cwd(),'lib/og/fonts/archivo-latin-ext-800.ttf'))])
 .then(([h,a])=>[{name:'HeeboX',data:h,weight:800 as const,style:'normal' as const},{name:'ArchivoX',data:a,weight:800 as const,style:'normal' as const}])
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
   const clean=s.replace(/<image\b[^>]*?(\/>|>[\s\S]*?<\/image>)/g,'').replace(/<text\b[\s\S]*?<\/text>/g,'')
    // one look across every club: the shirt alone (some drawings carry shorts and socks beside it) — the same frame for all
    .replace(/<svg\b[^>]*>/,t=>t.replace(/\s(width|height|viewBox)="[^"]*"/g,'').replace(/>$/,' viewBox="0 20 340 300">'))
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

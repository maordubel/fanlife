'use client'
import {SHARE_FONTS,type FontKey,type Measure,type ShareAssets} from './render'
import type {ShareArt} from './templates'

/**
 * Browser side of the V3 kit: the fonts and pictures are fetched once from /share/v3 and inlined as data URIs (an SVG
 * drawn into a canvas cannot load anything itself), the same fonts are registered for measuring, and a card becomes
 * a PNG for the share sheet. Loaded only when a person opens the composer.
 */
const ART:ShareArt[]=['archive-objects','away-supporters','father-child','footballer','scarf-fan','shirt-exchange','terrace-crowd','vintage-shirt']
const BASE='/share/v3'
let loading:Promise<ShareAssets>|null=null
const dataUri=async(url:string)=>{const r=await fetch(url);if(!r.ok)throw new Error(`asset ${url}`);const b=await r.blob();return await new Promise<string>((ok,no)=>{const f=new FileReader();f.onload=()=>ok(String(f.result));f.onerror=no;f.readAsDataURL(b)})}
export function loadShareAssets():Promise<ShareAssets>{
 loading??=(async()=>{
  const fonts=await Promise.all(Object.values(SHARE_FONTS).map(async f=>({f,uri:(await dataUri(`${BASE}/fonts/${f.file}.woff2`)).replace(/^data:[^;]*;/,'data:font/woff2;')})))
  // registered on the document so canvas measurement uses the very glyphs the SVG will draw
  await Promise.all(fonts.map(async({f,uri})=>{if([...document.fonts].some(x=>x.family===f.family))return;const face=new FontFace(f.family,`url(${uri})`,{weight:String(f.weight)});await face.load();document.fonts.add(face)}))
  const fontCss=fonts.map(({f,uri})=>`@font-face{font-family:${f.family};font-style:normal;font-weight:${f.weight};src:url("${uri}") format("woff2");}`).join('')
  const [logo,shirt,...art]=await Promise.all([dataUri(`${BASE}/logo.webp`),dataUri(`${BASE}/shirt.webp`),...ART.map(a=>dataUri(`${BASE}/art/${a}.webp`))])
  return {logo:logo!,shirt:shirt!,fontCss,art:Object.fromEntries(ART.map((a,i)=>[a,art[i]!])) as Record<ShareArt,string>}
 })().catch(e=>{loading=null;throw e})
 return loading
}
let ctx:CanvasRenderingContext2D|null=null
export const canvasMeasure:Measure=(s:string,n:number,k:FontKey)=>{ctx??=document.createElement('canvas').getContext('2d');const f=SHARE_FONTS[k];ctx!.font=`${f.weight} ${n}px ${f.family}`;return ctx!.measureText(s).width}
export const svgUrl=(svg:string)=>URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}))
export async function svgToPng(svg:string):Promise<Blob>{
 const url=svgUrl(svg),img=new Image()
 try{await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src=url});const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d')!.drawImage(img,0,0);return await new Promise<Blob>((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error('png')),'image/png'))}
 finally{URL.revokeObjectURL(url)}
}

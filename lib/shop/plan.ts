import {KIND_SPECS,LAUNCH_KINDS,LAUNCH_PICTURES,PROVIDER_ORDER,type KindSpec} from './kinds'
import {LIBRARY,titleOf,type LibraryPicture} from './library'
import type {Kind,ShopProduct} from './types'
import type {PBlueprint,PProvider,PVariant,PrintArea} from './printify'

/** Pure decisions of the shop — matching the catalogue, choosing variants, placing the picture, pricing, the launch set. */
export const matchBlueprint=(spec:KindSpec,list:PBlueprint[]):PBlueprint|null=>{
 for(const re of spec.find){const hit=list.find(b=>re.test(b.title)&&!(spec.avoid?.test(b.title)));if(hit)return hit}
 return null
}
export const pickProvider=(list:PProvider[]):PProvider|null=>{
 for(const re of PROVIDER_ORDER){const hit=list.find(p=>re.test(p.title));if(hit)return hit}
 return list[0]??null
}
const opt=(v:PVariant,name:RegExp)=>Object.entries(v.options||{}).find(([k])=>name.test(k))?.[1]
/** the variants we enable: the spec's colours and sizes, with a print area, capped */
export function pickVariants(spec:KindSpec,all:PVariant[]):PVariant[]{
 const usable=all.filter(v=>v.placeholders.some(p=>spec.positions.includes(p.position)))
 const want=usable.filter(v=>{const c=opt(v,/colou?r/i),s=opt(v,/size/i);return (!spec.colors||!c||spec.colors.test(c))&&(!spec.sizes||!s||spec.sizes.test(s))})
 return (want.length?want:usable).slice(0,spec.maxVariants)
}
export type Sheet={w:number;h:number;position:string;variantIds:number[]}
/** variants grouped by the shape of their print area: the picture is placed once per shape */
export function sheets(spec:KindSpec,variants:PVariant[]):Sheet[]{
 const out=new Map<string,Sheet>()
 for(const v of variants){const ph=spec.positions.map(pos=>v.placeholders.find(p=>p.position===pos)).find(Boolean)!
  const key=`${ph.position}:${(ph.width/ph.height).toFixed(2)}`,cur=out.get(key)
  if(cur)cur.variantIds.push(v.id);else out.set(key,{w:ph.width,h:ph.height,position:ph.position,variantIds:[v.id]})}
 return [...out.values()]
}
/**
 * Where a picture sits on a sheet (Printify: x,y are the centre 0–1; scale is the share of the sheet's WIDTH the picture's
 * width takes). A full-bleed kind (poster, mug, case) is filled edge to edge when the shapes are close — a little is
 * trimmed, never stretched; otherwise, and on a chest or bag print, the whole picture is shown inside the sheet.
 */
export function place(spec:KindSpec,sheet:Sheet,pic:{width:number;height:number}):{x:number;y:number;scale:number}{
 const a=pic.width/pic.height,A=sheet.w/sheet.h,close=Math.min(a/A,A/a)
 if(spec.scale>=1&&close>=.72)return {x:.5,y:.5,scale:Math.round(Math.max(1,a/A)*1000)/1000}
 const scale=Math.min(1,a/A)*Math.min(spec.scale,.94),hShare=scale/a*A
 return {x:.5,y:spec.scale>=1?.5:Math.round(Math.min(.5,.06+hShare/2)*1000)/1000,scale:Math.round(scale*1000)/1000}
}
/** will it print sharp? the picture's pixels against the pixels the sheet wants under it */
export const sharpness=(sheet:Sheet,pic:{width:number},scale:number)=>pic.width/(sheet.w*scale)
export const printAreas=(placed:{sheet:Sheet;imageId:string;x:number;y:number;scale:number}[]):PrintArea[]=>
 placed.map(s=>({variant_ids:s.sheet.variantIds,placeholders:[{position:s.sheet.position,images:[{id:s.imageId,x:s.x,y:s.y,scale:s.scale,angle:0}]}]}))
/** cost (cents) → price (cents): the margin on top, rounded UP to the next .99 */
export const price=(cost:number,margin:number)=>Math.max(499,Math.ceil(cost*(1+margin/100)/100)*100-1)

export const NOTE='Original supporter art from the FAN LIFE library — an independent fan design, not an official club product. Printed to order.'
export const productId=(subject:string,pictureId:string,kind:Kind)=>`${subject}.${pictureId.slice(-10).replace(/[^a-zA-Z0-9]/g,'x')}.${kind}`
export const draftOf=(subject:string,pic:Pick<LibraryPicture,'id'|'name'>,kind:Kind,now:string):ShopProduct=>({id:productId(subject,pic.id,kind),subject,kind,art:{library:{id:pic.id,name:pic.name}},title:`${titleOf(pic.name)} · ${KIND_SPECS[kind].label}`,description:NOTE,status:'draft',visible:false,createdAt:now,updatedAt:now})
/** the launch drafts for one subject: its own approved pictures first, then the rest of its shelf — never a picture marked for review */
export function launchSet(subject:string,now:string,library:LibraryPicture[]=LIBRARY):ShopProduct[]{
 const own=library.filter(p=>p.subject===subject&&!p.review).sort((a,b)=>Number(b.approved)-Number(a.approved)||b.bytes-a.bytes).slice(0,LAUNCH_PICTURES)
 return own.flatMap(pic=>LAUNCH_KINDS.map(kind=>draftOf(subject,pic,kind,now)))
}

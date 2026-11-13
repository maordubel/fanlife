import {KIND_SPECS,LAUNCH_KINDS,LAUNCH_PICTURES,PROVIDER_ORDER,type KindSpec} from './kinds'
import {LIBRARY,titleOf,type LibraryPicture} from './library'
import type {Kind,ProductDesign,ShopProduct} from './types'
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
export function sheets(spec:KindSpec,variants:PVariant[],positions:string[]=spec.positions):Sheet[]{
 const out=new Map<string,Sheet>()
 for(const v of variants){const ph=positions.map(pos=>v.placeholders.find(p=>p.position===pos)).find(Boolean);if(!ph)continue
  const key=`${ph.position}:${(ph.width/ph.height).toFixed(2)}`,cur=out.get(key)
  if(cur)cur.variantIds.push(v.id);else out.set(key,{w:ph.width,h:ph.height,position:ph.position,variantIds:[v.id]})}
 return [...out.values()]
}
/** the sides a design prints on: the kind's own front, its back, or both (a back exists only where the product has one) */
export function sidesOf(spec:KindSpec,variants:PVariant[],d?:ProductDesign):string[][]{
 const hasBack=variants.some(v=>v.placeholders.some(p=>p.position==='back'))
 const front=spec.positions.filter(p=>p!=='back'),want=d?.sides??'front'
 if(want==='back'&&hasBack)return [['back']]
 if(want==='both'&&hasBack)return [front,['back']]
 return [front]
}
/** the size the owner chose, as a share of the print area's width; 'auto' keeps the kind's own rule */
const SIZE_SCALE={badge:.3,medium:.55,large:.8,full:.94} as const
export const sizedSpec=(spec:KindSpec,d?:ProductDesign):KindSpec=>!d?.size||d.size==='auto'?spec:{...spec,scale:SIZE_SCALE[d.size]}
/** the garment colours: light (the default — any art reads on them), dark (art with a clean background), or every colour */
const DARK=/^(black|navy|dark grey|dark heather|charcoal|asphalt|forest green|maroon|military green|heather navy|true navy|dark chocolate|black heather|vintage black|solid black blend|deep heather)$/i
const exact=(names:string[])=>new RegExp(`^(${names.map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})$`,'i')
export const shadedSpec=(spec:KindSpec,d?:ProductDesign):KindSpec=>d?.colors?.length||d?.sizes?.length?{...spec,...(d.colors?.length?{colors:exact(d.colors)}:{}),...(d.sizes?.length?{sizes:exact(d.sizes)}:{}),maxVariants:100}
 :!spec.colors||!d?.shades||d.shades==='light'?spec:{...spec,colors:d.shades==='dark'?DARK:undefined,maxVariants:Math.max(spec.maxVariants,d.shades==='all'?60:24)}
/**
 * Where a picture sits on a sheet (Printify: x,y are the centre 0–1; scale is the share of the sheet's WIDTH the picture's
 * width takes). A full-bleed kind (poster, mug, case) is filled edge to edge when the shapes are close — a little is
 * trimmed, never stretched; otherwise, and on a chest or bag print, the whole picture is shown inside the sheet. A badge
 * sits high on the chest; on the back a print starts below the collar.
 */
export function place(spec:KindSpec,sheet:Sheet,pic:{width:number;height:number}):{x:number;y:number;scale:number}{
 const a=pic.width/pic.height,A=sheet.w/sheet.h,close=Math.min(a/A,A/a)
 if(spec.scale>=1&&close>=.72)return {x:.5,y:.5,scale:Math.round(Math.max(1,a/A)*1000)/1000}
 const scale=Math.min(1,a/A)*Math.min(spec.scale,.94),hShare=scale/a*A,top=sheet.position==='back'?.1:.06
 return {x:.5,y:spec.scale>=1?.5:Math.round(Math.min(.5,top+hShare/2)*1000)/1000,scale:Math.round(scale*1000)/1000}
}
/** will it print sharp? the picture's pixels against the pixels the sheet wants under it */
export const sharpness=(sheet:Sheet,pic:{width:number},scale:number)=>pic.width/(sheet.w*scale)
/** one print area per group of variants that share the same placements (front and back merged per variant) */
export function printAreas(placed:{sheet:Sheet;imageId:string;x:number;y:number;scale:number}[]):PrintArea[]{
 const per=new Map<number,{position:string;images:{id:string;x:number;y:number;scale:number;angle:number}[]}[]>()
 for(const s of placed)for(const v of s.sheet.variantIds){const l=per.get(v)??[];l.push({position:s.sheet.position,images:[{id:s.imageId,x:s.x,y:s.y,scale:s.scale,angle:0}]});per.set(v,l)}
 const groups=new Map<string,PrintArea>()
 for(const [v,phs] of per){const key=JSON.stringify(phs),g=groups.get(key);if(g)g.variant_ids.push(v);else groups.set(key,{variant_ids:[v],placeholders:phs})}
 return [...groups.values()]
}
/** cost (cents) → price (cents): the margin on top, rounded UP to the next .99 */
export const price=(cost:number,margin:number)=>Math.max(499,Math.ceil(cost*(1+margin/100)/100)*100-1)

export const NOTE='Original supporter art from the FAN LIFE library — an independent fan design, not an official club product. Printed to order.'
export const productId=(subject:string,pictureId:string,kind:Kind,bp?:number)=>`${subject}.${pictureId.slice(-10).replace(/[^a-zA-Z0-9]/g,'x')}.${kind}${bp?`-${bp}`:''}`
export const draftOf=(subject:string,pic:Pick<LibraryPicture,'id'|'name'>,kind:Kind,now:string,blueprint?:{id:number;title:string}):ShopProduct=>({id:productId(subject,pic.id,kind,blueprint?.id),subject,kind,art:{library:{id:pic.id,name:pic.name}},title:`${titleOf(pic.name)} · ${blueprint?shortTitle(blueprint.title):KIND_SPECS[kind].label}`,description:NOTE,status:'draft',visible:false,createdAt:now,updatedAt:now,...(blueprint?{blueprint}:{})})
/** a catalogue name for a shop card: "Unisex Heavy Cotton Tee" stays, "Mug 11oz (EU)" loses the bracket */
export const shortTitle=(t:string)=>t.replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').trim().slice(0,40)
/** the launch drafts for one subject: its own approved pictures first, then the rest of its shelf — never a picture marked for review */
export function launchSet(subject:string,now:string,library:LibraryPicture[]=LIBRARY):ShopProduct[]{
 const own=library.filter(p=>p.subject===subject&&!p.review).sort((a,b)=>Number(b.approved)-Number(a.approved)||b.bytes-a.bytes).slice(0,LAUNCH_PICTURES)
 return own.flatMap(pic=>LAUNCH_KINDS.map(kind=>draftOf(subject,pic,kind,now)))
}

/**
 * The listing text a buyer and a search engine read (13.11.2026, "things that help sales"): who it is for, what it is, how it is
 * made, and that it is fan art. Tags carry the club, its city, the kind and the gift words people search with.
 */
export function listingOf(p:Pick<ShopProduct,'title'|'subject'|'kind'>,club:{name:string;city?:string}|null,what:string):{description:string;tags:string[]}{
 const who=club?`${club.name} supporters`:'football supporters'
 const description=[`${p.title.split(' · ')[0]} — original paper-cut supporter art for ${who}${club?.city?` from ${club.city}`:''}.`,
  `${what}, printed to order and shipped to your door.`,
  'An independent FAN LIFE fan design — not an official club product.'].join(' ')
 const tags=[...new Set(['FAN LIFE','football','supporters','football gift','fan art',what.toLowerCase(),...(club?[club.name,`${club.name} gift`,...(club.city?[club.city]:[])]:[]),p.subject])].slice(0,13)
 return {description,tags}
}

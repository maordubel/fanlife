import {KIND_SPECS,LAUNCH_KINDS,LAUNCH_PICTURES,PROVIDER_ORDER,type KindSpec} from './kinds'
import {LIBRARY,titleOf,type LibraryPicture} from './library'
import type {AreaDesign,Kind,ProductDesign,ShopProduct} from './types'
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
/**
 * A placement the owner chose for one print area (13.11.2026: "a logo on the chest, not only in the middle").
 * Left chest is the wearer's left — on the flat print file that is the viewer's right. A chest logo defaults to badge size.
 */
export function placeAt(spec:KindSpec,sheet:Sheet,pic:{width:number;height:number},a?:AreaDesign):{x:number;y:number;scale:number}{
 const where=a?.place??'auto',chest=where==='chest-left'||where==='chest-right'
 const sized=a?.size&&a.size!=='auto'?sizedSpec(spec,{size:a.size}):chest?sizedSpec(spec,{size:'badge'}):spec
 const at=place(sized,sheet,pic);if(where==='auto')return at
 const aspect=pic.width/pic.height,A=sheet.w/sheet.h,scale=chest||where!=='center'?Math.min(at.scale,Math.min(1,aspect/A)*Math.min(sized.scale,.94)):at.scale,h=scale/aspect*A,r=(n:number)=>Math.round(n*1000)/1000
 if(chest)return {x:r(where==='chest-left'?Math.min(.72,1-scale/2-.04):Math.max(.28,scale/2+.04)),y:r(Math.min(.5,.12+h/2)),scale:r(scale)}
 if(where==='upper')return {x:.5,y:r(Math.min(.5,.08+h/2)),scale:r(scale)}
 if(where==='lower')return {x:.5,y:r(Math.max(.5,.94-h/2)),scale:r(scale)}
 return {x:.5,y:.5,scale:r(scale)}
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
export const draftOf=(subject:string,pic:Pick<LibraryPicture,'id'|'name'>,kind:Kind,now:string,blueprint?:{id:number;title:string}):ShopProduct=>({id:productId(subject,pic.id,kind,blueprint?.id),subject,kind,art:{library:{id:pic.id,name:pic.name}},title:fitTitle(titleOf(pic.name),blueprint?shortTitle(blueprint.title):KIND_SPECS[kind].label),description:NOTE,status:'draft',visible:false,createdAt:now,updatedAt:now,...(blueprint?{blueprint}:{})})
/** "Design · Product" within 60 characters (search engines cut longer titles): the design name gives way, never the product */
export const fitTitle=(design:string,what:string)=>{const room=Math.max(12,60-what.length-3);const d=design.length>room?design.slice(0,room).replace(/\s+\S*$/,'').trim():design;return `${d} · ${what}`}
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
 const description=[`${p.title.split(' · ')[0]} — original supporter art for ${who}${club?.city?` from ${club.city}`:''}.`,
  `${what}, printed to order and shipped to your door.`,
  'An independent FAN LIFE fan design — not an official club product.'].join(' ')
 // marketplace rule of thumb: at most 13 tags of at most 20 characters, the most specific first
 const tags=[...new Set([...(club?[club.name,`${club.name} gift`,`${club.name} fan`,...(club.city?[club.city]:[])]:[]),what.toLowerCase(),'football gift','football fan art','supporters','FAN LIFE','football',p.subject])].filter(t=>t.length<=20).slice(0,13)
 return {description,tags}
}

/** the print areas of a design, as [position, area] pairs: the explicit areas, or the quick front/back choice */
export function areasOf(spec:KindSpec,variants:PVariant[],d?:ProductDesign):[string[],AreaDesign][]{
 if(d?.areas&&Object.keys(d.areas).length){const have=new Set(variants.flatMap(v=>v.placeholders.map(p=>p.position)))
  const out=Object.entries(d.areas).filter(([pos])=>have.has(pos)).map(([pos,a])=>[[pos],a] as [string[],AreaDesign]);if(out.length)return out}
 return sidesOf(spec,variants,d).map(side=>[side,{size:d?.size,cutout:d?.cutout,...(side[0]!=='back'&&d?.place?{place:d.place}:{}),...(side[0]==='back'&&d?.backArt?{art:d.backArt}:{})}])
}
/** every print area a product has at this printer, with how many variants offer it and its size in pixels */
export function positionsOf(variants:PVariant[]):{position:string;variants:number;w:number;h:number}[]{
 const m=new Map<string,{position:string;variants:number;w:number;h:number}>()
 for(const v of variants)for(const p of v.placeholders){const c=m.get(p.position);if(c)c.variants++;else m.set(p.position,{position:p.position,variants:1,w:p.width,h:p.height})}
 const order=['front','back','left_sleeve','right_sleeve','neck','left_chest','right_chest']
 return [...m.values()].sort((a,b)=>((order.indexOf(a.position)+1)||99)-((order.indexOf(b.position)+1)||99))
}

/**
 * QUALITY FIRST, SIZE BY SIZE (owner, 14.11.2026: "the system adjusts itself for the best print — size, layout, puzzle,
 * notebook"). Every size of a product asks for its own number of pixels: a 12″ poster is sharp where a 36″ one is soft.
 * For each candidate variant the picture's sharpness on that variant is worked out (pixels it has ÷ pixels the print needs,
 * after the picture is fitted), and its shape against the picture's shape. Kept:
 *  · on a full-bleed product, variants whose shape suits the picture (a portrait print is not sold on a landscape canvas)
 *    when there are any;
 *  · the sizes that print sharp (≥ SHARP_KEEP); if none does, those still above the shop's floor; if none, the sharpest one;
 *  · then the kind's cap. The quality the product reports is the softest variant kept.
 */
export const SHARP_KEEP=.5
const shapeMatch=(a:number,b:number)=>Math.min(a/b,b/a)
export function bestVariants(spec:KindSpec,variants:PVariant[],pic:{width:number;height:number},positions:string[]=spec.positions,floor=.2):{variants:PVariant[];quality:number;dropped:number}{
 const a=pic.width/pic.height,full=spec.scale>=1
 const rows=variants.map(v=>{const ph=positions.map(pos=>v.placeholders.find(p=>p.position===pos)).find(Boolean)
  if(!ph)return {v,sharp:1,shape:1}
  const A=ph.width/ph.height,shape=shapeMatch(a,A)
  // fitted whole (extended with its own paper to the area's shape, never cropped): the extended picture spans the area,
  // so its sharpness is the larger of the two ratios; a garment print covers `scale` of the area's width
  const sharp=full?Math.max(pic.width/ph.width,pic.height/ph.height):pic.width/(ph.width*spec.scale)
  return {v,sharp,shape}})
 let pool=rows
 if(full){const fit=pool.filter(r=>r.shape>=.8);if(fit.length)pool=fit}
 const sharpOnes=pool.filter(r=>r.sharp>=SHARP_KEEP),okOnes=pool.filter(r=>r.sharp>=floor)
 const kept=(sharpOnes.length?sharpOnes:okOnes.length?okOnes:[...pool].sort((x,y)=>y.sharp-x.sharp).slice(0,1)).slice(0,spec.maxVariants)
 return {variants:kept.map(r=>r.v),quality:kept.length?Math.min(...kept.map(r=>r.sharp)):0,dropped:variants.length-kept.length}
}

/**
 * FAN LIFE'S OWN MARKS (owner, 14.11.2026: "every product as branded FAN LIFE as possible — a fashion brand"). On a garment
 * the seal goes where a fashion label goes, wherever the printer offers the place and the owner's design does not use it:
 * the inside neck label, the left sleeve, and high on the back under the collar. Contained, never cropped.
 */
export const BRAND_SPOTS={neck:{positions:['neck','neck_label','inside_label'],share:.82,top:null},sleeve:{positions:['left_sleeve'],share:.62,top:null},backNeck:{positions:['back'],share:.14,top:.05}} as const
export type BrandSpot=keyof typeof BRAND_SPOTS
export function brandPlace(sheet:Sheet,pic:{width:number;height:number},spot:BrandSpot):{x:number;y:number;scale:number}{
 const s=BRAND_SPOTS[spot],a=pic.width/pic.height,A=sheet.w/sheet.h,scale=s.share*Math.min(1,a/A),h=scale/a*A,r=(n:number)=>Math.round(n*1000)/1000
 return {x:.5,y:r(s.top===null?.5:Math.min(.5,s.top+h/2)),scale:r(scale)}
}
/** is this a garment (where a fashion label belongs)? */
export const isGarment=(kind:Kind,title?:string)=>kind==='tee'||kind==='hoodie'||kind==='kids-tee'||(kind==='more'&&/shirt|tee|hood|sweat|tank|jacket|jersey|polo|crewneck|long sleeve|zip/i.test(title||''))

/** where a design really prints (its own art, not FAN LIFE's mark): front, back or both; `hasBack` = the press put art on the back */
export function printSide(d?:ProductDesign,hasBack=true):'front'|'back'|'both'{
 if(!hasBack)return 'front'
 if(d?.areas&&Object.keys(d.areas).length){const pos=Object.keys(d.areas),back=pos.includes('back'),other=pos.some(x=>x!=='back');return back&&other?'both':back?'back':'front'}
 return d?.sides==='both'?'both':d?.sides==='back'?'back':'front'
}

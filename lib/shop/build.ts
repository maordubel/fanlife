import 'server-only'
import {KIND_SPECS,catalogueSpec,groupOf} from './kinds'
import {BRAND_SPOTS,NOTE,SHARP_KEEP,areasOf,bestVariants,brandPlace,isGarment,type BrandSpot,listingOf,matchBlueprint,pickProvider,pickVariants,placeAt,positionsOf,price,printAreas,shadedSpec,sheets,sharpness,sizedSpec} from './plan'
import {subjectName} from './subjects'
import {REGISTRY} from '@/lib/master/registry'
import {SITE_URL} from '@/lib/brand'
import {MIN_QUALITY} from './types'
import {original,pictureById} from './library'
import {printify,type Printify} from './printify'
import {printifyToken,readShop,updateShop} from './store'
import type {ArtRef,Kind,KindMatch,ShopProduct} from './types'

/**
 * The press: one product from a draft to a listing. Find the catalogue row → choose sizes and colours → hand Printify
 * the library picture → place it on each print area → create → price from Printify's real cost → publish.
 * Each step that fails leaves the product in `error` with Printify's own words, and the next press starts again cleanly.
 */
export async function client():Promise<Printify>{const t=await printifyToken();if(!t)throw new Error('Printify is not connected yet. Paste your API token in Shop → Connect.');return printify(t)}

/** read the account: the stores, and which one we print into (a Pop-Up store if there is one) */
export async function connect(by:string){
 const api=await client(),shops=await api.shops()
 if(!shops.length)throw new Error('This Printify account has no store yet. Add a Pop-Up store in Printify, then check again.')
 const doc=await readShop(),pick=shops.find(s=>s.id===doc.settings.shopId)||shops.find(s=>/storefront|pop/i.test(s.sales_channel))||shops[0]!
 await updateShop(by,`Connected Printify store “${pick.title}”`,d=>{d.settings.shopId=pick.id;d.settings.shopTitle=pick.title;d.settings.channel=pick.sales_channel})
 return {shops,picked:pick}
}
let catalogue:{at:number;list:Awaited<ReturnType<Printify['blueprints']>>}|null=null
const catalogueList=async(api:Printify)=>{if(!catalogue||Date.now()-catalogue.at>3600e3)catalogue={at:Date.now(),list:await api.blueprints()};return catalogue.list}
/** the desk's whole-catalogue browser: every Printify product, sorted onto shelves (one read an hour) */
export async function catalogueFor(api:Printify){return (await catalogueList(api)).map(b=>({id:b.id,title:b.title,brand:b.brand,image:b.images?.[0]??'',group:groupOf(b.title)}))}
/** a catalogue product's printer: a European one first (kept per catalogue number in the shop record) */
export async function matchBlueprintId(api:Printify,id:number,by:string):Promise<KindMatch>{
 const doc=await readShop(),kept=doc.settings.picked?.[id];if(kept)return kept
 const bp=(await catalogueList(api)).find(b=>b.id===id);if(!bp)throw new Error(`Printify no longer has catalogue product ${id}.`)
 const pp=pickProvider(await api.providers(id));if(!pp)throw new Error(`No print provider prints “${bp.title}” right now.`)
 const match={blueprintId:id,providerId:pp.id,title:bp.title,provider:pp.title}
 await updateShop(by,'',d=>{d.settings.picked={...(d.settings.picked||{}),[id]:match}});return match
}
export async function matchKind(api:Printify,kind:Kind,by:string,force?:{blueprintId:number;providerId?:number}):Promise<KindMatch>{
 const doc=await readShop(),kept=doc.settings.matches[kind];if(kept&&!force)return kept
 const list=await catalogueList(api),bp=force?list.find(b=>b.id===force.blueprintId):matchBlueprint(KIND_SPECS[kind],list)
 if(!bp)throw new Error(force?`Printify has no catalogue product number ${force.blueprintId}.`:`Printify's catalogue has no ${KIND_SPECS[kind].label.toLowerCase()} we recognise. Choose one by its catalogue number in Shop → Catalogue.`)
 const providers=await api.providers(bp.id),pp=force?.providerId?providers.find(p=>p.id===force.providerId):pickProvider(providers)
 if(!pp)throw new Error(`No print provider prints “${bp.title}” right now.`)
 const match={blueprintId:bp.id,providerId:pp.id,title:bp.title,provider:pp.title}
 await updateShop(by,force?`Catalogue: ${kind} → ${bp.title} (${pp.title})`:'',d=>{d.settings.matches[kind]=match})
 return match
}
const set=(id:string,patch:Partial<ShopProduct>)=>updateShop('press','',d=>{const p=d.products.find(x=>x.id===id);if(p)Object.assign(p,patch,{updatedAt:new Date().toISOString()})})

export async function pressProduct(id:string,by:string):Promise<ShopProduct>{
 const doc=await readShop(),p=doc.products.find(x=>x.id===id);if(!p)throw new Error('No such product.')
 const shop=doc.settings.shopId;if(!shop)throw new Error('Connect Printify first (Shop → Connect).')
 const api=await client(),d=p.design,base=p.blueprint?catalogueSpec(p.blueprint.title):KIND_SPECS[p.kind],spec=sizedSpec(shadedSpec({...base,positions:[...base.positions]},d),d)
 try{
  await set(id,{status:'building',error:undefined})
  const m=p.blueprint?await matchBlueprintId(api,p.blueprint.id,by):await matchKind(api,p.kind,by),all=(await api.variants(m.blueprintId,m.providerId)).variants
  // a catalogue product whose print area has another name: print on the first area its variants have
  if(p.blueprint&&!all.some(v=>v.placeholders.some(ph=>spec.positions.includes(ph.position)))&&all[0]?.placeholders[0])spec.positions=[all[0].placeholders[0].position]
  const wanted=d?.areas&&Object.keys(d.areas).length?Object.keys(d.areas):[...spec.positions,...(d?.sides&&d.sides!=='front'?['back']:[])]
  const candidates=pickVariants({...spec,positions:wanted,maxVariants:100},all)
  if(!candidates.length)throw new Error(`“${m.title}” at ${m.provider} has nothing in stock to print on.`)
  // the pictures: each print area its own (or the product's), sent to Printify once each
  const sent=new Map<string,{id:string;width:number;height:number}>()
  const picOf=async(art:ArtRef,cutout:boolean)=>{const key=JSON.stringify(art)+cutout;const got=sent.get(key);if(got)return got
   let pic:{id:string;width:number;height:number}
   if('library' in art){const lib=pictureById(art.library.id);if(!lib)throw new Error('A picture is no longer in the library inventory.')
    const fname=lib.name.replace(/[^a-zA-Z0-9._-]/g,'-').slice(-80)||'art.png',clean=cutout?await cleanOriginal(original(lib.id)):null
    const up=clean?await api.upload(fname.replace(/\.\w+$/,'')+'-cutout.png',clean):await api.uploadUrl(fname,original(lib.id));pic={id:up.id,width:up.width,height:up.height}
   }else pic={id:art.upload.id,width:art.upload.width,height:art.upload.height}
   sent.set(key,pic);return pic}
  // quality first, size by size (14.11.2026): only the sizes this picture prints sharp on, in the shape that suits it
  const [frontSide,frontArea]=areasOf(spec,candidates,d)[0]!,frontPic=await picOf(frontArea.art??p.art,!!(frontArea.cutout??d?.cutout))
  const best=bestVariants(spec,candidates,frontPic,frontSide,MIN_QUALITY),variants=best.variants
  const placed=[] as Parameters<typeof printAreas>[0];let soft=best.quality
  // automatic fitting (13.11.2026): a full-bleed product whose shape differs from the picture's gets the picture extended with
  // its own paper colour to the product's exact shape — the whole art shows, nothing is cropped, nothing is stretched
  const fitted=new Map<string,{id:string;width:number;height:number}|null>()
  const fitOf=async(art:ArtRef,sheet:{w:number;h:number},pic:{width:number;height:number})=>{const A=sheet.w/sheet.h,a=pic.width/pic.height
   if(Math.min(a/A,A/a)>=.92)return null;const key=JSON.stringify(art)+A.toFixed(2);if(fitted.has(key))return fitted.get(key)!
   // a wrap-around cover (a journal: back, spine and front on one landscape sheet): the art goes on the front half, not over the spine
   const wrap=WRAP.test(`${p.kind} ${p.blueprint?.title??''} ${m.title}`)&&A>1.2&&a<1.1
   const src='library' in art?original(art.library.id):art.upload.preview,out=src?await (wrap?wrapCover(src,A):extendToShape(src,A)).catch(()=>null):null
   const up=out?await api.upload(`fit-${Math.round(A*100)}-${('library' in art?art.library.name:art.upload.name).replace(/[^a-zA-Z0-9._-]/g,'-').replace(/\.\w+$/,'').slice(-60)}.jpg`,out):null
   const r=up?{id:up.id,width:up.width,height:up.height}:null;fitted.set(key,r);return r}
  for(const [side,area] of areasOf(spec,variants,d)){const art=area.art??p.art,cut=!!(area.cutout??d?.cutout),pic=await picOf(art,cut)
   for(const sheet of sheets(spec,variants,side)){const full=spec.scale>=1&&(!area.place||area.place==='auto')&&!cut
    const use=(full?await fitOf(art,sheet,pic):null)??pic,at=placeAt(spec,sheet,use,area);soft=Math.min(soft,sharpness(sheet,use,at.scale));placed.push({sheet,imageId:use.id,...at})}}
  if(!placed.length)throw new Error(`“${m.title}” has none of the print areas chosen.`)
  // FAN LIFE's own marks on a garment (14.11.2026): the seal on the neck label, the sleeve and under the collar — where the printer
  // offers the place and the design does not use it. A club's product carries the seal in one ink (a club's rival colours never ride on it).
  const brand={neck:true,sleeve:true,backNeck:true,...(doc.settings.brand??{})}
  if(isGarment(p.kind,p.blueprint?.title??m.title)){
   const used=new Set(placed.map(x=>x.sheet.position)),seal=p.subject==='fanlife'?'logo-512.png':'seal-mono-512.png'
   let mark:{id:string;width:number;height:number}|null=null
   for(const spot of Object.keys(BRAND_SPOTS) as BrandSpot[]){if(!brand[spot])continue
    const pos=BRAND_SPOTS[spot].positions.find(x=>!used.has(x)&&variants.some(v=>v.placeholders.some(ph=>ph.position===x)));if(!pos)continue
    try{mark??=await api.uploadUrl(`fanlife-${seal}`,`${SITE_URL}/brand/fanlife/${seal}`).then(u=>({id:u.id,width:u.width,height:u.height}))}catch{break}
    const mk=mark!;for(const sheet of sheets(spec,variants,[pos])){placed.push({sheet,imageId:mk.id,...brandPlace(sheet,mk,spot)});used.add(pos)}}
  }
  const ids=new Set(variants.map(v=>v.id))
  if(p.printify?.productId)await api.remove(shop,p.printify.productId).catch(()=>{})
  const club=p.subject==='fanlife'?null:REGISTRY.find(c=>c.id===p.subject),list=listingOf(p,club?{name:subjectName(p.subject),city:club.city}:null,p.blueprint?p.blueprint.title.replace(/\s*\([^)]*\)/g,''):base.label)
  const description=p.description&&p.description!==NOTE?p.description:list.description
  const made=await api.create(shop,{title:p.title,description,tags:list.tags,blueprint_id:m.blueprintId,print_provider_id:m.providerId,
   variants:[...ids].map(v=>({id:v,price:9900,is_enabled:true})),print_areas:printAreas(placed)})
  const priced=made.variants.filter(v=>ids.has(v.id)).map(v=>({id:v.id,price:price(v.cost,d?.margin??doc.settings.margin),is_enabled:true}))
  await api.update(shop,made.id,{variants:priced})
  let url:string|null=null,publishedAt:string|null=null
  try{await api.publish(shop,made.id);publishedAt=new Date().toISOString()
   for(let i=0;i<4&&!url;i++){await new Promise(r=>setTimeout(r,2500));url=(await api.product(shop,made.id)).external?.handle||null}
  }catch(e){await set(id,{error:`Created, not published yet: ${(e as Error).message}`})}
  if(soft<SHARP_KEEP)await set(id,{error:`On sale, but this picture is small for a ${spec.label.toLowerCase()} (${Math.round(soft*100)}% of the print size) — it may print soft. A larger original is better.`})
  const {images,backImage}=mockups(made.images,placed.some(x=>x.sheet.position==='back'))
  url=url||(doc.settings.popupUrl?doc.settings.popupUrl.replace(/\/$/,''):null)
  await set(id,{retries:publishedAt&&url?0:p.retries,status:publishedAt&&url?'live':'ready',printify:{productId:made.id,blueprintId:m.blueprintId,providerId:m.providerId,images,...(backImage?{backImage}:{}),quality:Math.round(soft*100)/100,priceFrom:Math.min(...priced.map(v=>v.price)),currency:'USD',url,publishedAt}})
 }catch(e){await set(id,{status:'error',error:(e as Error).message.slice(0,400)})}
 return (await readShop()).products.find(x=>x.id===id)!
}
/** re-read a product from Printify: its listing address appears a little after publishing */
export async function refreshProduct(id:string){
 const doc=await readShop(),p=doc.products.find(x=>x.id===id),shop=doc.settings.shopId;if(!p?.printify||!shop)return p
 const api=await client(),live=await api.product(shop,p.printify.productId),url=live.external?.handle||p.printify.url||(doc.settings.popupUrl||null)
 await set(id,{status:p.printify.publishedAt&&url?'live':p.status,printify:{...p.printify,url,...(live.images.length?mockups(live.images,!!p.printify.backImage):{})}})
 return (await readShop()).products.find(x=>x.id===id)
}
export async function removeProduct(id:string,by:string){
 const doc=await readShop(),p=doc.products.find(x=>x.id===id),shop=doc.settings.shopId
 if(p?.printify&&shop){const api=await client();await api.unpublish(shop,p.printify.productId).catch(()=>{});await api.remove(shop,p.printify.productId).catch(()=>{})}
 await updateShop(by,`Removed ${id}`,d=>{d.products=d.products.filter(x=>x.id!==id)})
}

/** a library original with its paper ground removed (sharp, server side), as base64 PNG for Printify */
/** null when the picture is already transparent at its edges (nothing to remove: the original is used as it is) */
async function cleanOriginal(url:string):Promise<string|null>{
 const r=await fetch(url,{signal:AbortSignal.timeout(60e3)});if(!r.ok)throw new Error(`Could not read the picture from the library (${r.status}).`)
 const sharp=(await import('sharp')).default,{removePlainBackground}=await import('./cutout')
 const {data,info}=await sharp(Buffer.from(await r.arrayBuffer())).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const {transparentBorder}=await import('./cutout');if(transparentBorder({data,width:info.width,height:info.height}))return null
 const gone=removePlainBackground({data,width:info.width,height:info.height})
 if(gone<.02)throw new Error('This picture has no plain background to remove — switch “Remove background” off for it.')
 return (await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer()).toString('base64')
}

/** the printer's stock for a product: every colour (with a swatch) and size it can print right now, for the builder */
export async function optionsFor(target:{kind?:Kind;blueprintId?:number},by:string){
 const api=await client(),m=target.blueprintId?await matchBlueprintId(api,target.blueprintId,by):await matchKind(api,target.kind!,by)
 const vs=(await api.variants(m.blueprintId,m.providerId)).variants,{swatch,isLight}=await import('./colours')
 const opt=(v:typeof vs[number],re:RegExp)=>Object.entries(v.options||{}).find(([k])=>re.test(k))?.[1]
 const colours=new Map<string,number>(),sizes:string[]=[]
 for(const v of vs){const c=opt(v,/colou?r/i),z=opt(v,/size/i);if(c)colours.set(c,(colours.get(c)||0)+1);if(z&&!sizes.includes(z))sizes.push(z)}
 return {printer:m.provider,product:m.title,variants:vs.length,positions:positionsOf(vs),
  colors:[...colours].map(([name,n])=>({name,hex:swatch(name),light:isLight(name),variants:n})).sort((a,b)=>Number(b.light)-Number(a.light)||a.name.localeCompare(b.name)),sizes}
}

/** the mock-ups to keep: the default first, the back mock-up kept apart when the product prints on its back */
export function mockups(list:{src:string;is_default:boolean;position?:string}[],back:boolean):{images:string[];backImage?:string}{
 const sorted=[...list].sort((a,b)=>Number(b.is_default)-Number(a.is_default)),isBack=(i:{src:string;position?:string})=>i.position==='back'||/camera_label=back/.test(i.src)
 const b=back?sorted.find(isBack):undefined,front=sorted.filter(i=>!isBack(i))
 return {images:[...front.slice(0,5),...(b?[b]:[])].map(i=>i.src),...(b?{backImage:b.src}:{})}
}

/**
 * Extend a picture to a shape (width ÷ height) with the colour of its own border — the paper — so a full-bleed product
 * (a mug's wrap, a landscape canvas, a phone case) shows the whole art. A picture already cut out (transparent edges) is left
 * alone: it is placed whole on the product. Returns base64 JPEG, at most 36 megapixels.
 */
const WRAP=/notebook|journal|book/i
/**
 * A wrap-around cover: the sheet holds the back, the spine and the front side by side. The art is placed whole on the front
 * (the right half), on its own paper colour; the back stays plain paper. Nothing is cropped, nothing is stretched.
 */
export async function wrapCover(url:string,shape:number):Promise<string|null>{
 const r=await fetch(url,{signal:AbortSignal.timeout(60e3)});if(!r.ok)return null
 const sharp=(await import('sharp')).default,{borderColour}=await import('./cutout')
 const input=Buffer.from(await r.arrayBuffer()),{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const {rgb,share}=borderColour({data,width:info.width,height:info.height}),bg=share>=.35?{r:Math.round(rgb[0]),g:Math.round(rgb[1]),b:Math.round(rgb[2])}:{r:255,g:255,b:255}
 const w=info.width,h=info.height,H0=Math.round(h/.88),W0=Math.round(H0*shape),half=W0/2
 // a wide picture that does not fit the front half is scaled to it (with the same margin)
 const k0=Math.min(1,half*.88/w),aw=Math.round(w*k0),ah=Math.round(h*k0)
 const art=k0<1?await sharp(input).flatten({background:bg}).resize(aw,ah).toBuffer():await sharp(input).flatten({background:bg}).toBuffer()
 const left=Math.round(half+(half-aw)/2),top=Math.round((H0-ah)/2)
 let out=await sharp({create:{width:W0,height:H0,channels:3,background:bg}}).composite([{input:art,left,top}]).jpeg({quality:92}).toBuffer()
 const k=Math.min(1,Math.sqrt(36e6/(W0*H0)));if(k<1)out=await sharp(out).resize(Math.round(W0*k),Math.round(H0*k)).jpeg({quality:92}).toBuffer()
 return out.toString('base64')
}
export async function extendToShape(url:string,shape:number):Promise<string|null>{
 const r=await fetch(url,{signal:AbortSignal.timeout(60e3)});if(!r.ok)return null
 const sharp=(await import('sharp')).default,{borderColour,transparentBorder}=await import('./cutout')
 const input=Buffer.from(await r.arrayBuffer()),{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const img={data,width:info.width,height:info.height};if(transparentBorder(img))return null
 const {rgb,share}=borderColour(img);if(share<.35)return null   // a busy border is not paper: leave the picture to be trimmed
 const w=info.width,h=info.height,a=w/h,W=a<shape?Math.round(h*shape):w,H=a<shape?h:Math.round(w/shape)
 const k=Math.min(1,Math.sqrt(36e6/(W*H))),bg={r:Math.round(rgb[0]),g:Math.round(rgb[1]),b:Math.round(rgb[2])}
 const padX=Math.floor((W-w)/2),padY=Math.floor((H-h)/2)
 let pipe=sharp(input).flatten({background:bg}).extend({left:padX,right:W-w-padX,top:padY,bottom:H-h-padY,background:bg})
 if(k<1)pipe=sharp(await pipe.toBuffer()).resize(Math.round(W*k),Math.round(H*k))
 return (await pipe.jpeg({quality:90}).toBuffer()).toString('base64')
}

/**
 * Send a product's name, description and tags to Printify and publish again, so the Pop-Up store says what the desk says
 * (13.11.2026: an edit used to change only the desk).
 */
export async function syncListing(id:string){
 const doc=await readShop(),p=doc.products.find(x=>x.id===id),shop=doc.settings.shopId;if(!p?.printify||!shop)return
 const api=await client(),base=p.blueprint?p.blueprint.title.replace(/\s*\([^)]*\)/g,''):KIND_SPECS[p.kind].label
 const club=p.subject==='fanlife'?null:REGISTRY.find(c=>c.id===p.subject),list=listingOf(p,club?{name:subjectName(p.subject),city:club.city}:null,base)
 const description=p.description&&p.description!==NOTE&&!p.description.startsWith('Original supporter art from the FAN LIFE library')?p.description:list.description
 await api.update(shop,p.printify.productId,{title:p.title,description,tags:list.tags})
 if(p.printify.publishedAt)await api.publish(shop,p.printify.productId).catch(()=>{})
 await set(id,{description})
}

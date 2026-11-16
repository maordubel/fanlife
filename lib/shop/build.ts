import 'server-only'
import {KIND_SPECS,catalogueSpec,groupOf} from './kinds'
import {BRAND_SPOTS,labelInk,variantColour,printSide,NOTE,SHARP_KEEP,areasOf,bestVariants,brandPlace,isGarment,listingOf,matchBlueprint,pickProvider,pickVariants,placeAt,positionsOf,price,printAreas,shadedSpec,sheets,sharpness,sizedSpec} from './plan'
import {subjectName} from './subjects'
import {REGISTRY} from '@/lib/master/registry'
import {SITE_URL} from '@/lib/brand'
import {MIN_QUALITY,madeInPrintify} from './types'
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
 if(madeInPrintify(p)){await refreshProduct(id).catch(()=>{});return (await readShop()).products.find(x=>x.id===id)??p}
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
  const sent=new Map<string,{id:string;width:number;height:number}>();let upscaled=0
  const picOf=async(art:ArtRef,cutout:boolean)=>{const key=JSON.stringify(art)+cutout;const got=sent.get(key);if(got)return got
   let pic:{id:string;width:number;height:number}
   if('library' in art){const lib=pictureById(art.library.id);if(!lib)throw new Error('A picture is no longer in the library inventory.')
    const fname=lib.name.replace(/[^a-zA-Z0-9._-]/g,'-').slice(-80)||'art.png',clean=cutout?await cleanOriginal(original(lib.id)):null
    const up=clean?await api.upload(fname.replace(/\.\w+$/,'')+'-cutout.png',clean):await api.uploadUrl(fname,original(lib.id));pic={id:up.id,width:up.width,height:up.height}
   }else pic={id:art.upload.id,width:art.upload.width,height:art.upload.height}
   // SOFT PRINTS (owner, 15.11.2026: "handle every soft print"): when the picture is smaller than the biggest print it must cover,
   // a high-quality enlargement (Lanczos, a light sharpen, up to 4×, at most 36 MP) is sent instead — the print area is filled with
   // pixels made from the picture, never stretched by the printer. It adds no detail the file did not have; a truly blurry file still
   // needs a sharper original, and the desk says so.
   const need=Math.max(0,...candidates.flatMap(v=>v.placeholders.filter(ph=>wanted.includes(ph.position)).map(ph=>Math.max(ph.width/pic.width,ph.height/pic.height)*Math.min(1,spec.scale))))
   const f=Math.min(4,need*.85,Math.sqrt(36e6/(pic.width*pic.height)))
   // a supporter's own print (16.11.2026, "personal prints load for long and fail") is drawn for the printer already — its preview is
   // only the small screen proof, so enlarging that would replace the real print file with a blown-up proof, and the 36 MP work
   // on one CPU is what ran the request out of time. It is never enlarged.
   if(f>=1.25&&!cutout&&!p.personal){const src='library' in art?original(art.library.id):art.upload.preview,big=src?await enlarge(src,f).catch(()=>null):null
    if(big){const up=await api.upload(`x${f.toFixed(1)}-${('library' in art?art.library.name:art.upload.name).replace(/[^a-zA-Z0-9._-]/g,'-').replace(/\.\w+$/,'').slice(-60)}.${big.png?'png':'jpg'}`,big.data);pic={id:up.id,width:up.width,height:up.height};upscaled=Math.max(upscaled,Math.round(f*10)/10)}}
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
   const what=`${p.kind} ${p.blueprint?.title??''} ${m.title}`,wrap=WRAP.test(what)&&A>1.2&&a<1.1
   // DRINKWARE (15.11.2026, "maximise the product"): a mug's wrap is ~2.3:1 — one picture in the middle faces away from the
   // drinker for half the people holding it. The art prints twice, one on each side of the handle.
   const twin=TWIN.test(what)&&A>=1.8&&a<1.3
   const src='library' in art?original(art.library.id):art.upload.preview,out=src?await (wrap||twin?wrapCover(src,A,twin):extendToShape(src,A)).catch(()=>null):null
   const up=out?await api.upload(`fit-${Math.round(A*100)}-${('library' in art?art.library.name:art.upload.name).replace(/[^a-zA-Z0-9._-]/g,'-').replace(/\.\w+$/,'').slice(-60)}.jpg`,out):null
   const r=up?{id:up.id,width:up.width,height:up.height}:null;fitted.set(key,r);return r}
  for(const [side,area] of areasOf(spec,variants,d)){const art=area.art??p.art,cut=!!(area.cutout??d?.cutout),pic=await picOf(art,cut)
   for(const sheet of sheets(spec,variants,side)){const full=spec.scale>=1&&(!area.place||area.place==='auto')&&!cut
    const use=(full?await fitOf(art,sheet,pic):null)??pic,at=placeAt(spec,sheet,use,area);soft=Math.min(soft,sharpness(sheet,use,at.scale));placed.push({sheet,imageId:use.id,...at})}}
  if(!placed.length)throw new Error(`“${m.title}” has none of the print areas chosen.`)
  // FAN LIFE's mark on a garment — the inside neck label and nowhere else (15.11.2026): one ink, the light ink on dark colours,
  // and only where the printer offers a label print and the design does not use it
  let brandId='';const brand={neck:true,...(doc.settings.brand??{})}
  if(brand.neck&&isGarment(p.kind,p.blueprint?.title??m.title)){
   const used=new Set(placed.map(x=>x.sheet.position)),{isLight}=await import('./colours')
   const pos=BRAND_SPOTS.neck.positions.find(x=>!used.has(x)&&variants.some(v=>v.placeholders.some(ph=>ph.position===x)))
   if(pos){const marks:Record<'ink'|'light',{id:string;width:number;height:number}|null>={ink:null,light:null}
    for(const tone of ['ink','light'] as const){const vs=variants.filter(v=>labelInk(variantColour(v),isLight)===tone);if(!vs.length)continue
     try{marks[tone]??=await api.uploadUrl(`fanlife-neck-label-${tone}.png`,`${SITE_URL}/brand/fanlife/neck-label-${tone}.png`).then(u=>({id:u.id,width:u.width,height:u.height}))}catch{continue}
     const mk=marks[tone]!;brandId=brandId||mk.id;for(const sheet of sheets(spec,vs,[pos]))placed.push({sheet,imageId:mk.id,...brandPlace(sheet,mk,'neck')})}}
  }
  const ids=new Set(variants.map(v=>v.id))
  if(p.printify?.productId)await api.remove(shop,p.printify.productId).catch(()=>{})
  const club=p.subject==='fanlife'?null:REGISTRY.find(c=>c.id===p.subject),list=listingOf(p,club?{name:subjectName(p.subject),city:club.city}:null,p.blueprint?p.blueprint.title.replace(/\s*\([^)]*\)/g,''):base.label)
  const description=p.description&&p.description!==NOTE?p.description:list.description
  // (16.11.2026) Printify's visible:false hides a product from the Pop-Up grid but also 404s its own page, so a supporter's print
  // stays visible — keeping it out of the catalogue is handled apart (see shop-personal-prints rule)
  const made=await api.create(shop,{title:p.title,description,tags:list.tags,blueprint_id:m.blueprintId,print_provider_id:m.providerId,
   variants:[...ids].map(v=>({id:v,price:9900,is_enabled:true})),print_areas:printAreas(placed)})
  const priced=made.variants.filter(v=>ids.has(v.id)).map(v=>({id:v.id,price:price(v.cost,d?.margin??doc.settings.margin),is_enabled:true}))
  await api.update(shop,made.id,{variants:priced})
  let url:string|null=null,publishedAt:string|null=null
  try{await api.publish(shop,made.id);publishedAt=new Date().toISOString()
   for(let i=0;i<4&&!url;i++){await new Promise(r=>setTimeout(r,2500));url=(await api.product(shop,made.id)).external?.handle||null}
  }catch(e){await set(id,{error:`Created, not published yet: ${(e as Error).message}`})}
  if(soft<SHARP_KEEP)await set(id,{error:`On sale, but this picture is small for a ${spec.label.toLowerCase()} (${Math.round(soft*100)}% of the print size) — it may print soft. A larger original is better.`})
  const hasBack=placed.some(x=>x.sheet.position==='back'&&x.imageId!==brandId),hasFront=placed.some(x=>x.sheet.position!=='back'&&x.imageId!==brandId)
  const side:'front'|'back'|'both'=hasBack&&hasFront?'both':hasBack?'back':'front',{images,backImage}=mockups(made.images,side)
  url=url||(doc.settings.popupUrl?doc.settings.popupUrl.replace(/\/$/,''):null)
  await set(id,{retries:publishedAt&&url?0:p.retries,status:publishedAt&&url?'live':'ready',printify:{productId:made.id,blueprintId:m.blueprintId,providerId:m.providerId,images,side,...(backImage?{backImage}:{}),quality:Math.round(soft*100)/100,...(upscaled?{upscaled}:{}),priceFrom:Math.min(...priced.map(v=>v.price)),currency:'USD',url,publishedAt}})
 }catch(e){await set(id,{status:'error',error:(e as Error).message.slice(0,400)})}
 return (await readShop()).products.find(x=>x.id===id)!
}
/** re-read a product from Printify: its listing address appears a little after publishing */
export async function refreshProduct(id:string){
 const doc=await readShop(),p=doc.products.find(x=>x.id===id),shop=doc.settings.shopId;if(!p?.printify||!shop)return p
 const api=await client(),live=await api.product(shop,p.printify.productId),url=live.external?.handle||p.printify.url||(doc.settings.popupUrl||null)
 await set(id,{status:p.printify.publishedAt&&url?'live':p.status,printify:{...p.printify,url,...(live.images.length?withCover(mockups(live.images,p.printify.side??printSide(p.design)),p.printify.cover,live.images):{})}})
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
/**
 * The pictures the shop shows, by where the design prints (14.11.2026: "blank shirts must never show"): a back-only design
 * leads with the back; a two-sided one leads with the front and keeps the back for the inset; a front one shows only fronts.
 * FAN LIFE's own small mark under the collar does not make a product "printed on the back".
 */
export type Mock={src:string;is_default:boolean;position?:string;variant_ids?:number[]}
/** Printify's camera, from the mock-up's address: front · back · person-1 · context-2 · lifestyle · back-collar-closeup … */
export const cameraOf=(src:string)=>/camera_label=([a-z0-9-]+)/i.exec(src)?.[1]?.toLowerCase()??''
/**
 * 0 — the product in use: worn by a model, held, on a child (owner, 15.11.2026: "the first look is always a live mock-up");
 * 1 — in its place: on the wall, in a room, on the table, on the dog; 2 — the plain product; 3 — details and charts.
 */
export function liveness(src:string):number{
 const c=cameraOf(src)
 if(/size|chart|collar|closeup|close-up|label|tag|detail|zoom|sleeve/.test(c))return 3
 if(/person|model|lifestyle|wear|on-hand|hand|half|duo|kid|baby|man|woman|girl|boy/.test(c))return 0
 if(/context|room|wall|scene|interior|nightstand|desk|table|shelf|hanging|pet|dog|cat|outdoor|car|kitchen|sofa|bed|frame-/.test(c))return 1
 return 2
}
const isBackShot=(i:{src:string;position?:string})=>{const c=cameraOf(i.src);return i.position==='back'||(/(^|-)back($|-)/.test(c)&&!/collar|closeup/.test(c))}
/**
 * The pictures a product shows, best first. Only the default colour's mock-ups (Printify sends every colour's). The first one is
 * live — the product in use — whenever Printify drew one; then the plain product; then the other scenes; details last.
 * A back print leads with a back; a two-sided one keeps its plain back for the inset. FAN LIFE's mark under the collar is a
 * detail, never "printed on the back".
 */
/** the owner's chosen first picture (15.11.2026) leads while Printify still draws it; otherwise the automatic order stands */
export function withCover(mk:{images:string[];backImage?:string},cover:string|undefined,live:{src:string}[]):{images:string[];backImage?:string}{
 if(!cover||!live.some(i=>i.src===cover))return mk
 return {...mk,images:[cover,...mk.images.filter(x=>x!==cover)].slice(0,8)}
}
export function mockups(list:Mock[],side:'front'|'back'|'both'|boolean):{images:string[];backImage?:string}{
 const mode=side===true?'both':side===false?'front':side
 const sorted=[...list].sort((a,b)=>Number(b.is_default)-Number(a.is_default)),v0=sorted[0]?.variant_ids?.[0]
 const own=v0?sorted.filter(i=>!i.variant_ids||i.variant_ids.includes(v0)):sorted,pool=own.length?own:sorted
 // VARIETY (15.11.2026, "perfect mock-ups"): Printify draws several takes of one scene (person-1…person-5). The gallery shows one
 // of each scene before any second take, so eight pictures are eight different looks at the product, not one look five times.
 const family=(i:Mock)=>cameraOf(i.src).replace(/[-_]?\d+/g,'')||'plain'
 const order=(xs:Mock[])=>{const by=[...xs].sort((a,b)=>liveness(a.src)-liveness(b.src)),live=by.find(i=>liveness(i.src)<=1),plain=xs.find(i=>liveness(i.src)===2)
  const seen=new Set<string>(),firsts:Mock[]=[],seconds:Mock[]=[]
  for(const i of by.filter(x=>liveness(x.src)<3)){const f=family(i);if(seen.has(f))seconds.push(i);else{seen.add(f);firsts.push(i)}}
  // details (a size chart, a collar, a bare sleeve) come after every scene
  return [...new Set([...(live?[live]:[]),...(plain?[plain]:[]),...firsts,...seconds,...by.filter(x=>liveness(x.src)===3)].map(i=>i.src))]}
 const backs=pool.filter(isBackShot),fronts=pool.filter(i=>!isBackShot(i))
 if(mode==='back'&&backs.length)return {images:order(backs).slice(0,8)}
 const plainBack=mode==='both'?backs.find(i=>liveness(i.src)===2)??backs[0]:undefined
 // two-sided: the back is shown third — after the live picture and the plain front — so a buyer sees early that both sides print
 const f=order(fronts),b=mode==='both'?order(backs):[]
 const images=mode==='both'&&b.length?[...f.slice(0,2),b[0]!,...f.slice(2,6),...b.slice(1,2),...f.slice(6)]:f
 return {images:[...new Set(images)].slice(0,8),...(plainBack?{backImage:plainBack.src}:{})}
}

/**
 * Extend a picture to a shape (width ÷ height) with the colour of its own border — the paper — so a full-bleed product
 * (a mug's wrap, a landscape canvas, a phone case) shows the whole art. A picture already cut out (transparent edges) is left
 * alone: it is placed whole on the product. Returns base64 JPEG, at most 36 megapixels.
 */
const WRAP=/notebook|journal|book/i,TWIN=/\bmug|tumbler|\bcup\b|bottle|stein|can cooler|koozie/i
/**
 * A wrap-around cover: the sheet holds the back, the spine and the front side by side. The art is placed whole on the front
 * (the right half), on its own paper colour; the back stays plain paper. Nothing is cropped, nothing is stretched.
 */
export async function wrapCover(url:string,shape:number,twin=false):Promise<string|null>{
 const r=await fetch(url,{signal:AbortSignal.timeout(60e3)});if(!r.ok)return null
 const sharp=(await import('sharp')).default,{borderColour}=await import('./cutout')
 const input=Buffer.from(await r.arrayBuffer()),{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const {rgb,share}=borderColour({data,width:info.width,height:info.height}),bg=share>=.35?{r:Math.round(rgb[0]),g:Math.round(rgb[1]),b:Math.round(rgb[2])}:{r:255,g:255,b:255}
 const w=info.width,h=info.height,H0=Math.round(h/.88),W0=Math.round(H0*shape),half=W0/2
 // a wide picture that does not fit the front half is scaled to it (with the same margin)
 const k0=Math.min(1,half*.88/w),aw=Math.round(w*k0),ah=Math.round(h*k0)
 const art=k0<1?await sharp(input).flatten({background:bg}).resize(aw,ah).toBuffer():await sharp(input).flatten({background:bg}).toBuffer()
 const left=Math.round(half+(half-aw)/2),top=Math.round((H0-ah)/2)
 // a drinkware wrap (twin): the same art on both halves, so it faces out whichever hand holds the cup
 const layers=[{input:art,left,top},...(twin?[{input:art,left:Math.round((half-aw)/2),top}]:[])]
 let out=await sharp({create:{width:W0,height:H0,channels:3,background:bg}}).composite(layers).jpeg({quality:92}).toBuffer()
 const k=Math.min(1,Math.sqrt(36e6/(W0*H0)));if(k<1)out=await sharp(out).resize(Math.round(W0*k),Math.round(H0*k)).jpeg({quality:92}).toBuffer()
 return out.toString('base64')
}
/** a picture enlarged f× for print (Lanczos 3 and a light unsharp mask), PNG when it has transparency, else JPEG 92 */
export async function enlarge(url:string,f:number):Promise<{data:string;png:boolean}|null>{
 const r=await fetch(url,{signal:AbortSignal.timeout(90e3)});if(!r.ok)return null
 const sharp=(await import('sharp')).default,input=Buffer.from(await r.arrayBuffer()),meta=await sharp(input).metadata()
 if(!meta.width||!meta.height)return null
 const pipe=sharp(input).resize(Math.round(meta.width*f),Math.round(meta.height*f),{kernel:'lanczos3'}).sharpen({sigma:.8,m1:.5,m2:1.2}),png=!!meta.hasAlpha
 return {data:(await (png?pipe.png({compressionLevel:9}):pipe.jpeg({quality:92,mozjpeg:true})).toBuffer()).toString('base64'),png}
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
 await api.update(shop,p.printify.productId,{title:p.title,description,tags:list.tags,...(p.personal?{visible:true}:{})})
 if(p.printify.publishedAt)await api.publish(shop,p.printify.productId).catch(()=>{})
 await set(id,{description})
}

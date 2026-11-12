import 'server-only'
import {KIND_SPECS} from './kinds'
import {matchBlueprint,pickProvider,pickVariants,place,price,printAreas,sheets,sharpness} from './plan'
import {original,pictureById} from './library'
import {printify,type Printify} from './printify'
import {printifyToken,readShop,updateShop} from './store'
import type {Kind,KindMatch,ShopProduct} from './types'

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
export async function matchKind(api:Printify,kind:Kind,by:string,force?:{blueprintId:number;providerId?:number}):Promise<KindMatch>{
 const doc=await readShop(),kept=doc.settings.matches[kind];if(kept&&!force)return kept
 if(!catalogue||Date.now()-catalogue.at>3600e3)catalogue={at:Date.now(),list:await api.blueprints()}
 const bp=force?catalogue.list.find(b=>b.id===force.blueprintId):matchBlueprint(KIND_SPECS[kind],catalogue.list)
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
 const api=await client(),spec=KIND_SPECS[p.kind]
 try{
  await set(id,{status:'building',error:undefined})
  const m=await matchKind(api,p.kind,by),variants=pickVariants(spec,(await api.variants(m.blueprintId,m.providerId)).variants)
  if(!variants.length)throw new Error(`“${m.title}” at ${m.provider} has nothing in stock to print on.`)
  // the picture: from the Drive library (Printify fetches the original itself) or the owner's own upload, sent once
  let pic:{id:string;width:number;height:number}
  if('library' in p.art){const lib=pictureById(p.art.library.id);if(!lib)throw new Error('This picture is no longer in the library inventory.')
   const up=await api.uploadUrl(lib.name.replace(/[^a-zA-Z0-9._-]/g,'-').slice(-80)||'art.png',original(lib.id));pic={id:up.id,width:up.width,height:up.height}
  }else pic={id:p.art.upload.id,width:p.art.upload.width,height:p.art.upload.height}
  const placed=[] as Parameters<typeof printAreas>[0];let soft=1
  for(const sheet of sheets(spec,variants)){const at=place(spec,sheet,pic);soft=Math.min(soft,sharpness(sheet,pic,at.scale));placed.push({sheet,imageId:pic.id,...at})}
  const ids=new Set(variants.map(v=>v.id))
  if(p.printify?.productId)await api.remove(shop,p.printify.productId).catch(()=>{})
  const made=await api.create(shop,{title:p.title,description:p.description,tags:['FAN LIFE','football','supporters',p.subject],blueprint_id:m.blueprintId,print_provider_id:m.providerId,
   variants:[...ids].map(v=>({id:v,price:9900,is_enabled:true})),print_areas:printAreas(placed)})
  const priced=made.variants.filter(v=>ids.has(v.id)).map(v=>({id:v.id,price:price(v.cost,doc.settings.margin),is_enabled:true}))
  await api.update(shop,made.id,{variants:priced})
  let url:string|null=null,publishedAt:string|null=null
  try{await api.publish(shop,made.id);publishedAt=new Date().toISOString()
   for(let i=0;i<4&&!url;i++){await new Promise(r=>setTimeout(r,2500));url=(await api.product(shop,made.id)).external?.handle||null}
  }catch(e){await set(id,{error:`Created, not published yet: ${(e as Error).message}`})}
  if(soft<.5)await set(id,{error:`On sale, but this picture is small for a ${spec.label.toLowerCase()} (${Math.round(soft*100)}% of the print size) — it may print soft. A larger original is better.`})
  const images=[...made.images].sort((a,b)=>Number(b.is_default)-Number(a.is_default)).map(i=>i.src).slice(0,6)
  url=url||(doc.settings.popupUrl?doc.settings.popupUrl.replace(/\/$/,''):null)
  await set(id,{retries:publishedAt&&url?0:p.retries,status:publishedAt&&url?'live':'ready',printify:{productId:made.id,blueprintId:m.blueprintId,providerId:m.providerId,images,priceFrom:Math.min(...priced.map(v=>v.price)),currency:'USD',url,publishedAt}})
 }catch(e){await set(id,{status:'error',error:(e as Error).message.slice(0,400)})}
 return (await readShop()).products.find(x=>x.id===id)!
}
/** re-read a product from Printify: its listing address appears a little after publishing */
export async function refreshProduct(id:string){
 const doc=await readShop(),p=doc.products.find(x=>x.id===id),shop=doc.settings.shopId;if(!p?.printify||!shop)return p
 const api=await client(),live=await api.product(shop,p.printify.productId),url=live.external?.handle||p.printify.url||(doc.settings.popupUrl||null)
 await set(id,{status:p.printify.publishedAt&&url?'live':p.status,printify:{...p.printify,url,images:live.images.length?[...live.images].sort((a,b)=>Number(b.is_default)-Number(a.is_default)).map(i=>i.src).slice(0,6):p.printify.images}})
 return (await readShop()).products.find(x=>x.id===id)
}
export async function removeProduct(id:string,by:string){
 const doc=await readShop(),p=doc.products.find(x=>x.id===id),shop=doc.settings.shopId
 if(p?.printify&&shop){const api=await client();await api.unpublish(shop,p.printify.productId).catch(()=>{});await api.remove(shop,p.printify.productId).catch(()=>{})}
 await updateShop(by,`Removed ${id}`,d=>{d.products=d.products.filter(x=>x.id!==id)})
}

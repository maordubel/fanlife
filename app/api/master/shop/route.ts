import {NextResponse} from 'next/server'
import {adminFromRequest} from '@/lib/master/admin'
import {sameOrigin} from '@/lib/master/request'
import {readShop,updateShop,printifyToken,saveToken} from '@/lib/shop/store'
import {optionsFor,catalogueFor,client,connect,matchKind,pressProduct,refreshProduct,removeProduct} from '@/lib/shop/build'
import {draftOf,launchSet,NOTE,shortTitle} from '@/lib/shop/plan'
import {KIND_SPECS} from '@/lib/shop/kinds'
import {SUBJECT_IDS,isSubject} from '@/lib/shop/subjects'
import {pictureById} from '@/lib/shop/library'
import {KINDS,SHADES,SIDES,SIZES,type Kind,type ProductDesign,type ShopProduct} from '@/lib/shop/types'
export const dynamic='force-dynamic'
export const maxDuration=120
const json=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'no-store'}})
/** catalogue choices from the desk: [{id,title}], at most 40, each a real catalogue number */
const blueprintsOf=(v:unknown)=>(Array.isArray(v)?v:[]).filter((x):x is {id:number;title:string}=>!!x&&typeof (x as {id:unknown}).id==='number'&&typeof (x as {title:unknown}).title==='string').slice(0,40).map(x=>({id:x.id,title:x.title.slice(0,120)}))
/** the builder's edits, checked: only known choices, a margin between 10% and 300% */
const designOf=(v:unknown):ProductDesign|undefined=>{if(!v||typeof v!=='object')return undefined;const o=v as Record<string,unknown>,d:ProductDesign={}
 if(SIDES.includes(o.sides as never))d.sides=o.sides as ProductDesign['sides'];if(SIZES.includes(o.size as never))d.size=o.size as ProductDesign['size']
 if(SHADES.includes(o.shades as never))d.shades=o.shades as ProductDesign['shades'];if(o.cutout===true)d.cutout=true
 if(typeof o.margin==='number'&&o.margin>=10&&o.margin<=300)d.margin=Math.round(o.margin)
 const names=(x:unknown)=>Array.isArray(x)?x.filter((n):n is string=>typeof n==='string'&&n.length<60).slice(0,100):[]
 const cs=names(o.colors),zs=names(o.sizes);if(cs.length)d.colors=cs;if(zs.length)d.sizes=zs
 return Object.keys(d).length?d:undefined}
const state=async()=>({doc:await readShop(),connected:!!(await printifyToken())})

export async function GET(r:Request){
 if(!adminFromRequest(r))return json({error:'Sign in to the control room first.',login:'/master/login'},401)
 return json(await state())
}
/** Every shop action of the desk. One product per request: the browser walks the list, so no request outlives the platform. */
export async function POST(r:Request){
 const s=adminFromRequest(r);if(!s)return json({error:'Sign in to the control room first.',login:'/master/login'},401)
 try{sameOrigin(r)}catch{return json({error:'Cross-site request refused.'},403)}
 const by=s.role==='owner'?'owner':'admin'
 try{
  const b=await r.json() as Record<string,unknown>,id=typeof b.id==='string'?b.id:''
  const kind=KINDS.find(k=>k===b.kind) as Kind|undefined,now=new Date().toISOString()
  switch(b.action){
   case 'connect':{
    if(typeof b.token==='string'&&b.token.trim()){if(b.token.trim().length<40)return json({error:'That does not look like a Printify API token.'},422);await saveToken(b.token.trim())}
    const out=await connect(by);return json({...(await state()),shops:out.shops})}
   case 'settings':await updateShop(by,'Shop settings',d=>{
     if(typeof b.open==='boolean')d.settings.open=b.open
     if(typeof b.margin==='number'&&b.margin>=0&&b.margin<=300)d.settings.margin=Math.round(b.margin)
     if(typeof b.popupUrl==='string'){const u=b.popupUrl.trim();if(u&&!/^https:\/\/[a-z0-9-]+\.printify\.me\/?$/i.test(u))throw new Error('The Pop-Up address looks like https://your-name.printify.me');d.settings.popupUrl=u}
     if(typeof b.shopId==='number')d.settings.shopId=b.shopId});break
   case 'options':{const kind=KINDS.find(k=>k===b.kind&&k!=='more'),bp=typeof b.blueprintId==='number'?b.blueprintId:undefined
    if(!kind&&!bp)return json({error:'Which product?'},422);return json({options:await optionsFor({kind,blueprintId:bp},by)})}
   case 'catalog':return json({catalog:await catalogueFor(await client())})
   case 'launch':{const ids=b.subject==='all'?SUBJECT_IDS:[String(b.subject)].filter(isSubject)
    await updateShop(by,`Launch drafts: ${ids.length===1?ids[0]:'all'}`,d=>{for(const sid of ids)for(const p of launchSet(sid,now))if(!d.products.some(x=>x.id===p.id))d.products.push(p)});break}
   case 'add':{const sid=String(b.subject),pic=pictureById(String(b.picture)),kinds=(Array.isArray(b.kinds)?b.kinds:[b.kind]).filter((k):k is Kind=>KINDS.includes(k as Kind)&&k!=='more'),bps=blueprintsOf(b.blueprints)
    if(!isSubject(sid)||!pic||!(kinds.length+bps.length))return json({error:'Choose who it is for, a picture from the library and at least one product.'},422)
    const design=designOf(b.design),made=[...kinds.map(k=>draftOf(sid,pic,k,now)),...bps.map(bp=>draftOf(sid,pic,'more',now,bp))].map(x=>design?{...x,design}:x)
    await updateShop(by,`Added ${pic.name} for ${sid}`,d=>{for(const p of made)if(!d.products.some(x=>x.id===p.id))d.products.push(p)});return json({...(await state()),made:made.map(p=>p.id)})}
   case 'upload':{const sid=String(b.subject),sub=isSubject(sid)?{id:sid}:null,data=typeof b.data==='string'?b.data.replace(/^data:image\/(png|jpe?g);base64,/,''):'',name=String(b.name||'art.png').replace(/[^a-zA-Z0-9._-]/g,'-').slice(-80),title=String(b.title||'').trim().slice(0,60)
    const kinds=(Array.isArray(b.kinds)?b.kinds:[b.kind]).filter((k):k is Kind=>KINDS.includes(k as Kind)&&k!=='more'),bps=blueprintsOf(b.blueprints)
    if(!sub||!(kinds.length+bps.length)||!data||!title)return json({error:'Choose a club, a product, a picture (PNG or JPG) and a title.'},422)
    if(data.length>28e6)return json({error:'That picture is over 20MB. Export it smaller and try again.'},413)
    // one upload, every product chosen: the picture is sent to Printify once
    const up=await (await client()).upload(name,data),art={upload:{id:up.id,name,preview:up.preview_url,width:up.width,height:up.height}},desc=String(b.description||NOTE).slice(0,600)
    const items:ShopProduct[]=[...kinds.map(k=>({id:`${sub.id}.own-${up.id.slice(-8)}.${k}`,subject:sub.id,kind:k,art,title:`${title} · ${KIND_SPECS[k].label}`,description:desc,status:'draft' as const,visible:false,createdAt:now,updatedAt:now})),
     ...bps.map(bp=>({id:`${sub.id}.own-${up.id.slice(-8)}.more-${bp.id}`,subject:sub.id,kind:'more' as const,blueprint:bp,art,title:`${title} · ${shortTitle(bp.title)}`,description:desc,status:'draft' as const,visible:false,createdAt:now,updatedAt:now}))]
    const design=designOf(b.design);if(design)for(const it of items)it.design={...design,cutout:undefined}
    await updateShop(by,`Uploaded art for ${items.length} product(s)`,d=>{for(const it of items)if(!d.products.some(x=>x.id===it.id))d.products.push(it)});return json({...(await state()),made:items.map(x=>x.id)})}
   case 'press':if(!id)return json({error:'Which product?'},422);await pressProduct(id,by);break
   case 'refresh':await refreshProduct(id);break
   case 'visible':{const ids=Array.isArray(b.ids)?b.ids.map(String):[id];await updateShop(by,`${b.visible?'Showed':'Hid'} ${ids.length} product(s)`,d=>{for(const p of d.products)if(ids.includes(p.id))p.visible=!!b.visible});break}
   case 'design':{if(!id)return json({error:'Which product?'},422);const design=designOf(b.design)
    await updateShop(by,`New design settings for ${id}`,d=>{const p=d.products.find(x=>x.id===id);if(p){p.design=design;p.status='draft';p.visible=false}});await pressProduct(id,by);break}
   case 'edit':await updateShop(by,`Edited ${id}`,d=>{const p=d.products.find(x=>x.id===id);if(!p)return;if(typeof b.title==='string'&&b.title.trim())p.title=b.title.trim().slice(0,90);if(typeof b.description==='string')p.description=b.description.trim().slice(0,600);p.updatedAt=now});break
   case 'remove':await removeProduct(id,by);break
   case 'match':if(!kind||typeof b.blueprintId!=='number')return json({error:'Give the product type and a catalogue number.'},422)
    await matchKind(await client(),kind,by,{blueprintId:b.blueprintId,providerId:typeof b.providerId==='number'?b.providerId:undefined});break
   default:return json({error:'Unknown shop action.'},400)
  }
  return json(await state())
 }catch(e){return json({error:String((e as Error)?.message||e).slice(0,400)},422)}
}

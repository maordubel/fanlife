import {NextResponse} from 'next/server'
import {adminFromRequest} from '@/lib/master/admin'
import {sameOrigin} from '@/lib/master/request'
import {readShop,updateShop,printifyToken,saveToken} from '@/lib/shop/store'
import {client,connect,matchKind,pressProduct,refreshProduct,removeProduct} from '@/lib/shop/build'
import {draftOf,launchSet,NOTE} from '@/lib/shop/plan'
import {syncCatalog} from '@/lib/shop/sync'
import {forgetPublicShop} from '@/lib/shop/store'
import {SUBJECT_IDS,isSubject} from '@/lib/shop/subjects'
import {pictureById} from '@/lib/shop/library'
import {KINDS,type Kind,type ShopProduct} from '@/lib/shop/types'
export const dynamic='force-dynamic'
export const maxDuration=120
const json=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'no-store'}})
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
   case 'sync':await syncCatalog(by);forgetPublicShop();break
   case 'settings':await updateShop(by,'Shop settings',d=>{
     if(typeof b.open==='boolean')d.settings.open=b.open
     if(typeof b.margin==='number'&&b.margin>=0&&b.margin<=300)d.settings.margin=Math.round(b.margin)
     if(typeof b.popupUrl==='string'){const u=b.popupUrl.trim();if(u&&!/^https:\/\/[a-z0-9-]+\.printify\.me\/?$/i.test(u))throw new Error('The Pop-Up address looks like https://your-name.printify.me');d.settings.popupUrl=u}
     if(typeof b.currency==='string'&&/^[A-Z]{3}$/.test(b.currency))d.settings.currency=b.currency
     if(typeof b.shopId==='number')d.settings.shopId=b.shopId});break
   case 'launch':{const ids=b.subject==='all'?SUBJECT_IDS:[String(b.subject)].filter(isSubject)
    await updateShop(by,`Launch drafts: ${ids.length===1?ids[0]:'all'}`,d=>{for(const sid of ids)for(const p of launchSet(sid,now))if(!d.products.some(x=>x.id===p.id))d.products.push(p)});break}
   case 'add':{const sid=String(b.subject),pic=pictureById(String(b.picture)),kinds=(Array.isArray(b.kinds)?b.kinds:[b.kind]).filter((k):k is Kind=>KINDS.includes(k as Kind))
    if(!isSubject(sid)||!pic||!kinds.length)return json({error:'Choose who it is for, a picture from the library and at least one product.'},422)
    const made=kinds.map(k=>draftOf(sid,pic,k,now))
    await updateShop(by,`Added ${pic.name} for ${sid}`,d=>{for(const p of made)if(!d.products.some(x=>x.id===p.id))d.products.push(p)});return json({...(await state()),made:made.map(p=>p.id)})}
   case 'upload':{const sid=String(b.subject),sub=isSubject(sid)?{id:sid}:null,data=typeof b.data==='string'?b.data.replace(/^data:image\/(png|jpe?g);base64,/,''):'',name=String(b.name||'art.png').replace(/[^a-zA-Z0-9._-]/g,'-').slice(-80),title=String(b.title||'').trim().slice(0,90)
    if(!sub||!kind||!data||!title)return json({error:'Choose a club, a product, a picture (PNG or JPG) and a title.'},422)
    if(data.length>28e6)return json({error:'That picture is over 20MB. Export it smaller and try again.'},413)
    const up=await (await client()).upload(name,data),pid=`${sub.id}.own-${up.id.slice(-8)}.${kind}`
    const item:ShopProduct={id:pid,subject:sub.id,kind,art:{upload:{id:up.id,name,preview:up.preview_url,width:up.width,height:up.height}},title,description:String(b.description||NOTE).slice(0,600),status:'draft',visible:false,createdAt:now,updatedAt:now}
    await updateShop(by,`Uploaded art for ${pid}`,d=>{d.products.push(item)});return json({...(await state()),made:[pid]})}
   case 'press':if(!id)return json({error:'Which product?'},422);await pressProduct(id,by);break
   case 'refresh':await refreshProduct(id);break
   case 'visible':{const ids=Array.isArray(b.ids)?b.ids.map(String):[id];await updateShop(by,`${b.visible?'Showed':'Hid'} ${ids.length} product(s)`,d=>{for(const p of d.products)if(ids.includes(p.id))p.visible=!!b.visible});break}
   case 'edit':await updateShop(by,`Edited ${id}`,d=>{const p=d.products.find(x=>x.id===id);if(!p)return;if(typeof b.title==='string'&&b.title.trim())p.title=b.title.trim().slice(0,90);if(typeof b.description==='string')p.description=b.description.trim().slice(0,600);p.updatedAt=now});break
   case 'remove':await removeProduct(id,by);break
   case 'match':if(!kind||typeof b.blueprintId!=='number')return json({error:'Give the product type and a catalogue number.'},422)
    await matchKind(await client(),kind,by,{blueprintId:b.blueprintId,providerId:typeof b.providerId==='number'?b.providerId:undefined});break
   default:return json({error:'Unknown shop action.'},400)
  }
  return json(await state())
 }catch(e){return json({error:String((e as Error)?.message||e).slice(0,400)},422)}
}

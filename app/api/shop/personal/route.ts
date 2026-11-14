import {NextResponse} from 'next/server'
import {createHash} from 'node:crypto'
import {loadClub} from '@/lib/clubs/resolver'
import {FORMATIONS} from '@/lib/game/formations'
import {REGISTRY} from '@/lib/master/registry'
import {SITE_URL} from '@/lib/brand'
import {client,pressProduct} from '@/lib/shop/build'
import {readShop,updateShop} from '@/lib/shop/store'
import {encode,signOf,cleanManager} from '@/lib/shop/personal/sign'
import {renderXI,PRINT} from '@/lib/shop/personal/render'
import type {XIPrintSpec} from '@/lib/shop/personal/xi-poster'
import type {ShopProduct} from '@/lib/shop/types'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=120
/** is the offer on? (the shop is open and connected) */
export async function GET(){const d=await readShop();return json({open:!!(d.settings.open&&d.settings.shopId)})}
const json=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'no-store'}})

/** a few prints per visitor a day: each one is a real product at the printer */
const made=new Map<string,{day:string;n:number}>()
const DAY_LIMIT=6
/**
 * POST /api/shop/personal — the supporter's all-time XI as a framed print or a poster (owner, 14.11.2026).
 * Takes the eleven by player id (never by free text: the names printed are the archive's own), the formation, the captain,
 * the 12th man and, if he wants, the manager's name (his own, checked). Draws the 3600×4800 print, sends it to Printify,
 * makes the product on the quality-first rules (sharp sizes only, the store's own domain) and answers with its checkout link.
 * The same XI asked twice is the same product. Personal prints are never listed on /shop and are cleared after three days
 * unless sold (the hourly check-up).
 */
export async function POST(r:Request){
 let b:Record<string,unknown>;try{b=await r.json()}catch{return json({error:'Bad request.'},400)}
 const doc=await readShop()
 if(!doc.settings.open||!doc.settings.shopId)return json({error:'The shop is closed for now.'},503)
 const clubId=String(b.club||''),reg=REGISTRY.find(c=>c.id===clubId),product=b.product==='poster'?'poster':'framed'
 const formation=String(b.formation||''),slots=FORMATIONS[formation]?.slots
 if(!reg||!slots)return json({error:'Which club and formation?'},422)
 const mg=cleanManager(b.manager);if(!mg.ok)return json({error:'That name cannot be printed — letters and numbers only, up to 22.'},422);const manager=mg.value
 const club=await loadClub(clubId).catch(()=>null);if(!club)return json({error:'This club is not open.'},404)
 const byId=new Map((club.data.players||[]).map(p=>[p.value.id,p.value]))
 const picks=(b.picks&&typeof b.picks==='object'?b.picks:{}) as Record<string,unknown>,seen=new Set<string>()
 const n:XIPrintSpec['n']=[]
 for(const s of slots){const id=String(picks[s.slotId]||''),p=byId.get(id);if(!p||seen.has(id))return json({error:'Pick all eleven first.'},422);seen.add(id)
  n.push({x:100-s.x,y:s.y,name:p.name,...(b.captain===id?{cap:true}:{})})}
 const twelfth=b.twelfth?byId.get(String(b.twelfth))?.name??null:null
 const d=new Date().toLocaleDateString('en-GB',{timeZone:'Europe/Athens'}).replace(/\//g,'.')
 const spec:XIPrintSpec={c:clubId,cn:club.data.identity.name,col:reg.primary,f:formation,n,t:twelfth,m:manager,d}
 const s=encode(spec),sig=signOf(s)
 if(b.dry)return json({proof:`/api/shop/personal/art?s=${s}&sig=${sig}`})
 const hash=createHash('sha1').update(s.replace(/"d":"[^"]+"/,'')+product).digest('hex').slice(0,12)
 const id=`personal.${clubId}.${hash}.${product}`,proof=`${SITE_URL}/api/shop/personal/art?s=${s}&sig=${sig}`
 const own=/^https:\/\/(?![^/]*printify\.me)[^/]+/i.exec(doc.settings.popupUrl||'')?.[0]??null,onOwn=(u:string)=>own?u.replace(/^https:\/\/[^/]+\.printify\.me/i,own):u
 const have=doc.products.find(p=>p.id===id)
 if(have?.status==='live'&&have.printify?.url)return json({url:onOwn(have.printify.url),image:have.printify.images[0]??proof,proof})
 // a few a day for each visitor
 const ip=(r.headers.get('x-forwarded-for')||'').split(',')[0]!.trim()||'?',today=d,cnt=made.get(ip)
 if(cnt&&cnt.day===today&&cnt.n>=DAY_LIMIT)return json({error:'That is plenty of prints for today — come back tomorrow.'},429)
 made.set(ip,{day:today,n:(cnt?.day===today?cnt.n:0)+1})
 try{
  const png=Buffer.from(await (await renderXI(spec,3)).arrayBuffer()),api=await client()
  const up=await api.upload(`fanlife-xi-${hash}.png`,png.toString('base64'))
  const now=new Date().toISOString(),name=manager?`${manager}’s All-Time XI`:'My All-Time XI'
  const p:ShopProduct={id,subject:clubId,kind:product,art:{upload:{id:up.id,name:`${name}.png`,preview:proof,width:PRINT.w,height:PRINT.h}},
   title:`${name} · ${product==='framed'?'Framed print':'Poster'}`.slice(0,60),
   description:`${name} — ${club.data.identity.name}, ${formation}${spec.n.find(x=>x.cap)?`, captain ${spec.n.find(x=>x.cap)!.name}`:''}. One supporter’s eleven, drawn by FAN LIFE and printed to order. An independent fan design — not an official club product.`,
   status:'draft',visible:false,personal:true,createdAt:now,updatedAt:now}
  await updateShop('supporter','',dd=>{dd.products=[...dd.products.filter(x=>x.id!==id),p]})
  const done=await pressProduct(id,'supporter')
  if(done.status!=='live'||!done.printify?.url)return json({error:'The printer did not answer in time — try again in a minute.'},502)
  return json({url:onOwn(done.printify.url),image:done.printify.images[0]??proof,proof})
 }catch(e){return json({error:String((e as Error)?.message||e).slice(0,200)},502)}
}

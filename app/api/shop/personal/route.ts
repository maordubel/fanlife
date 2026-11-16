import {NextResponse} from 'next/server'
import {streamed} from '@/lib/shop/personal/stream'
import {createHash} from 'node:crypto'
import {loadClub} from '@/lib/clubs/resolver'
import {FORMATIONS} from '@/lib/game/formations'
import {REGISTRY} from '@/lib/master/registry'
import {SITE_URL} from '@/lib/brand'
import {client,pressProduct} from '@/lib/shop/build'
import {readShop,updateShop} from '@/lib/shop/store'
import {encode,signOf,cleanManager} from '@/lib/shop/personal/sign'
import {renderXI} from '@/lib/shop/personal/render'
import {TEMPLATES,SHEET,PROBE,type XIPrintSpec} from '@/lib/shop/personal/xi-poster'
import type {ShopProduct} from '@/lib/shop/types'
import {bannedHere} from '@/lib/clubs/theme'
import {clubWardrobe} from '@/lib/clubs/kit-wardrobe'
import {drawingOf} from '@/lib/shop/personal/make'
import {kitFor,SWATCH} from '@/lib/clubs/rumble-kit'

export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=120
/** is the offer on? (the shop is open and connected) */
export async function GET(){const d=await readShop();return json({open:!!(d.settings.open&&d.settings.shopId)})}
const json=(d:unknown,s=200)=>NextResponse.json(d,{status:s,headers:{'Cache-Control':'no-store'}})

/** the printed name: the archive's own Latin spelling when it has one (the print speaks English), else the name as kept */
const printName=(p:{name:string;aliases?:string[]})=>/[\u0590-\u05FF]/.test(p.name)?(p.aliases||[]).find(a=>/^[\p{Script=Latin}\s.'’-]+$/u.test(a))??p.name:p.name
/** a few prints per visitor a day: each one is a real product at the printer */
const made=new Map<string,{day:string;n:number}>()
const DAY_LIMIT=6
/**
 * POST /api/shop/personal — the supporter's all-time XI as a framed print or a poster (owner, 14.11.2026).
 * Takes the eleven by player id (never by free text: the names printed are the archive's own), the formation, the captain,
 * the 12th man and, if he wants, the manager's name (his own, checked). Draws the 3600×4800 print, sends it to Printify,
 * makes the product on the quality-first rules (sharp sizes only, the store's own domain) and answers with its checkout link.
 * The same XI asked twice is the same product. Personal prints are never listed on /shop and are cleared after 24 hours
 * unless sold (the hourly check-up).
 */
/** answered as a stream: the press outlasts Cloudflare's 100 s (lib/shop/personal/stream) */
export const POST=(r:Request)=>streamed(()=>handle(r))
async function handle(r:Request):Promise<Response>{
 let b:Record<string,unknown>;try{b=await r.json()}catch{return json({error:'Bad request.'},400)}
 const doc=await readShop()
 if(!doc.settings.open||!doc.settings.shopId)return json({error:'The shop is closed for now.'},503)
 const clubId=String(b.club||''),reg=REGISTRY.find(c=>c.id===clubId),product=b.product==='poster'?'poster':b.product==='tee'?'tee':'framed',v=TEMPLATES.find(t=>t===b.template)??'touchline'
 const formation=String(b.formation||''),slots=FORMATIONS[formation]?.slots
 if(!reg||!slots)return json({error:'Which club and formation?'},422)
 const mg=cleanManager(b.manager);if(!mg.ok)return json({error:'That name cannot be printed — letters and numbers only, up to 22.'},422);const manager=mg.value
 const club=await loadClub(clubId).catch(()=>null);if(!club)return json({error:'This club is not open.'},404)
 const byId=new Map((club.data.players||[]).map(p=>[p.value.id,p.value]))
 const picks=(b.picks&&typeof b.picks==='object'?b.picks:{}) as Record<string,unknown>,seen=new Set<string>()
 const n:XIPrintSpec['n']=[]
 // each man in the club's documented kit nearest his years (the board's own rule), never a rival's colour; else the club colour
 // each man in the club's documented kit nearest his years — the shared wardrobe (lib/clubs/kit-wardrobe: drawing + parts), a keeper in a
 // keeper's kit when the record has one; never a rival's colour; else the club colour
 const wardrobe=clubWardrobe(club.data)
 const kitOf=(p:{id:string;fromYear:number|null;toYear:number|null},keeper:boolean)=>{const w=kitFor(p,'us',wardrobe,{keeper});if(w.source!=='archive')return {}
  const [a,b]=w.kit.colours.map(c=>SWATCH[c]!),file=drawingOf(w.kit.svg)
  return {...(a?{k:{d:w.kit.design||'',a,b:b??null}}:{}),...(file?{u:file}:{}),s:w.kit.season}}
 for(const s of slots){const id=String(picks[s.slotId]||''),p=byId.get(id);if(!p||seen.has(id))return json({error:'Pick all eleven first.'},422);seen.add(id)
  n.push({x:100-s.x,y:s.y,name:printName(p),...kitOf(p,s.role==='GK'),...(b.captain===id?{cap:true}:{})})}
 const tw=b.twelfth?byId.get(String(b.twelfth)):null,twelfth=tw?printName(tw):null
 const d=new Date().toLocaleDateString('en-GB',{timeZone:'Europe/Athens'}).replace(/\//g,'.')
 const th=club.data.theme,spec:XIPrintSpec={c:clubId,cn:club.data.identity.name,col:reg.primary,f:formation,n,t:twelfth,m:manager,d,v,g:!(th&&bannedHere(th,PROBE.green)),b:!(th&&bannedHere(th,PROBE.blue))}
 const s=encode(spec),sig=signOf(s)
 if(b.dry)return json({proof:`/api/shop/personal/art?s=${s}&sig=${sig}${product==='tee'?'&l=tee-proof':''}`})
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
  const api=await client(),file=async(l:'print'|'tee-back'|'tee-front',tag:string)=>{const png=Buffer.from(await (await renderXI(spec,3,l)).arrayBuffer());const sz=SHEET[l]
   const up=await api.upload(`fanlife-xi-${hash}-${tag}.png`,png.toString('base64'));return {upload:{id:up.id,name:`${tag}.png`,preview:`${proof}${l==='print'?'':`&l=${l}`}`,width:sz.w*3,height:sz.h*3}}}
  const now=new Date().toISOString(),name=manager?`${manager}’s All-Time XI`:'My All-Time XI'
  // the tee: a small XI mark on the chest, the eleven on the back, on light shirts only (two inks, transparent)
  const tee=product==='tee'?{front:await file('tee-front','chest'),back:await file('tee-back','back')}:null
  const p:ShopProduct={id,subject:clubId,kind:product,art:tee?tee.front:await file('print','print'),
   ...(tee?{design:{shades:'light' as const,areas:{front:{art:tee.front,place:'chest-left' as const,size:'badge' as const},back:{art:tee.back,size:'full' as const}}}}:{}),
   title:`${name} · ${product==='framed'?'Framed print':product==='tee'?'T-shirt':'Poster'}`.slice(0,60),
   description:`${name} — ${club.data.identity.name}, ${formation}${spec.n.find(x=>x.cap)?`, captain ${spec.n.find(x=>x.cap)!.name}`:''}. One supporter’s eleven, drawn by FAN LIFE and printed to order. An independent fan design — not an official club product.`,
   status:'draft',visible:false,personal:true,createdAt:now,updatedAt:now}
  await updateShop('supporter','',dd=>{dd.products=[...dd.products.filter(x=>x.id!==id),p]})
  const done=await pressProduct(id,'supporter')
  if(done.status!=='live'||!done.printify?.url)return json({error:'The printer did not answer in time — try again in a minute.'},502)
  return json({url:onOwn(done.printify.url),image:done.printify.images[0]??proof,proof})
 }catch(e){return json({error:String((e as Error)?.message||e).slice(0,200)},502)}
}

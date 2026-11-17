import 'server-only'
import {REGIONS} from './catalog'
import {luluAddress,printifyAddress,type PaidSession} from './checkout'
import {createJob,ensureLuluWebhook,luluOpen,type Job} from './lulu'
import {orderGoods} from './printify'
import {getBookOrder,moveBookOrder} from './orders'
import {bookMail} from './mail'
import {mailOpen,sendMail} from '@/lib/pay/mail'

/**
 * Stripe's word on a book checkout (called by /api/pay/webhook for events whose metadata carries `book`).
 * Paid tip → done + thank-you. Paid paperback → a Lulu print job (one copy, the reader's address, the post they paid for)
 * → printing + "at the printer". Every move happens only from the state it expects, so a repeated event changes nothing.
 * A paperback Lulu cannot take (address incomplete, Lulu down) stays `paid` with the reason in `error`; the order desk
 * row shows it and the job can be sent again from there.
 */
type Ev={type:string;data:{object:PaidSession&{metadata?:Record<string,string>;payment_status?:string;payment_intent?:string|null;amount_total?:number|null}}}
const mail=async(to:string|null|undefined,...a:Parameters<typeof bookMail>)=>{if(to&&mailOpen())try{await sendMail(to,bookMail(...a),`book-${a[0]}-${a[2].order}`)}catch{/* the order stands without its letter */}}

export async function handleBookEvent(ev:Ev):Promise<void>{
 const obj=ev.data.object,id=obj.metadata?.book
 if(!id)return
 if(ev.type==='checkout.session.expired'){await moveBookOrder(id,['open'],{status:'expired'});return}
 if(ev.type==='charge.refunded'){await moveBookOrder(id,['paid','printing','shipped','done'],{status:'refunded'});return}
 if(ev.type!=='checkout.session.completed'||obj.payment_status!=='paid')return
 const email=obj.customer_details?.email??null,now=new Date().toISOString()
 if(!await moveBookOrder(id,['open','expired'],{status:'paid',paid_at:now,email,stripe_payment:typeof obj.payment_intent==='string'?obj.payment_intent:null}))return
 const o=await getBookOrder({id});if(!o)return
 if(o.kind==='tip'){await moveBookOrder(id,['paid'],{status:'done'});await mail(email,'tip',o.lang,{order:id});return}
 if(o.kind==='tee'||o.kind==='cap'){await sendToPrintify(o.id,obj);return}
 await sendToPrinter(o.id,obj)
}

/** one copy to Lulu; also the desk's "send again" for a paperback stuck at `paid` */
export async function sendToPrinter(id:string,session:PaidSession):Promise<Job|null>{
 const o=await getBookOrder({id});if(!o||o.kind!=='paperback'||!o.region||!o.ship)return null
 const address=luluAddress(session)
 if(!address){await moveBookOrder(id,['paid'],{error:'The address or phone from Stripe is incomplete.'});return null}
 if(!luluOpen()){await moveBookOrder(id,['paid'],{error:'Lulu keys are not set — the order waits.'});return null}
 try{
  try{await ensureLuluWebhook()}catch{/* status mail waits for the hook; the job itself goes on */}
  const job=await createJob({order:id,lang:o.lang,address,level:REGIONS[o.region].ship[o.ship].level,contact:process.env.BOOK_CONTACT_EMAIL||'fanlife@dubelteam.com'})
  await moveBookOrder(id,['paid'],{status:'printing',lulu_job:job.id,lulu_status:job.status?.name??null,lulu_cost:job.costs?.total_cost_incl_tax?`${job.costs.total_cost_incl_tax} ${job.costs.currency??''}`.trim():null,error:null})
  await mail(o.email,'printing',o.lang,{order:id})
  return job
 }catch(e){await moveBookOrder(id,['paid'],{error:String((e as Error).message).slice(0,300)});return null}
}

/** Lulu's word on a print job (PRINT_JOB_STATUS_CHANGED) */
export async function handleLuluStatus(job:Job){
 const o=await getBookOrder({lulu_job:job.id});if(!o)return
 const name=job.status?.name??'',li=job.line_items?.[0]
 const tracking=li?.tracking_id||li?.tracking_urls?.length?{id:li?.tracking_id??null,urls:li?.tracking_urls??[],carrier:li?.carrier_name??null}:null
 if(name==='SHIPPED'){
  if(await moveBookOrder(o.id,['printing'],{status:'shipped',lulu_status:name,shipped_at:new Date().toISOString(),tracking}))
   await mail(o.email,'shipped',o.lang,{order:o.id,track:tracking?.urls?.[0]??null})
 }else if(name==='REJECTED'||name==='CANCELED'||name==='ERROR'){
  await moveBookOrder(o.id,['printing'],{status:name==='CANCELED'?'canceled':'failed',lulu_status:name,error:JSON.stringify(job.status?.messages??{}).slice(0,300)})
 }else await moveBookOrder(o.id,['printing'],{lulu_status:name})
}

/** one garment to Printify (the book's own store); also the desk's "send again" */
export async function sendToPrintify(id:string,session:PaidSession):Promise<string|null>{
 const o=await getBookOrder({id});if(!o||(o.kind!=='tee'&&o.kind!=='cap')||!o.variant)return null
 const address=printifyAddress(session)
 if(!address){await moveBookOrder(id,['paid'],{error:'The address or phone from Stripe is incomplete.'});return null}
 try{
  const [colour,size]=o.variant.split('|') as [string,string]
  const made=await orderGoods({order:id,kind:o.kind,colour,size:size??'One size',address})
  await moveBookOrder(id,['paid'],{status:'printing',printify_order:made.id,error:null})
  await mail(o.email,'making',o.lang,{order:id})
  return made.id
 }catch(e){await moveBookOrder(id,['paid'],{error:String((e as Error).message).slice(0,300)});return null}
}

/** Printify's word on an order: shipment created → shipped + tracking; canceled → canceled */
export async function handlePrintifyEvent(ev:{type?:string;resource?:{id?:string;data?:{status?:string;carrier?:{code?:string;tracking_number?:string;tracking_url?:string}}}}){
 const pid=ev.resource?.id;if(!pid)return
 const o=await getBookOrder({printify_order:pid});if(!o)return
 const d=ev.resource?.data??{}
 if(ev.type==='order:shipment:created'){
  const tracking={id:d.carrier?.tracking_number??null,urls:d.carrier?.tracking_url?[d.carrier.tracking_url]:[],carrier:d.carrier?.code??null}
  if(await moveBookOrder(o.id,['printing'],{status:'shipped',shipped_at:new Date().toISOString(),tracking}))
   await mail(o.email,'shipped',o.lang,{order:o.id,track:tracking.urls[0]??null})
 }else if(ev.type==='order:updated'&&d.status==='canceled')await moveBookOrder(o.id,['printing'],{status:'canceled'})
}

import 'server-only'
import {REGIONS,isEdition} from './catalog'
import {addressGap,luluAddress,printifyAddress,type PaidSession} from './checkout'
import {createJob,ensureLuluWebhook,getJob,luluOpen,type Job} from './lulu'
import {orderGoods} from './printify'
import {getBookOrder,liveBookOrders,moveBookOrder,patchBookOrder,stuckBookOrders,type BookOrder} from './orders'
import {bookMail,saleMail} from './mail'
import {dueLetter,type Ledger} from './journey'
import {mailOpen,sendMail} from '@/lib/pay/mail'
import {stripeGet} from '@/lib/pay/stripe'

/**
 * Stripe's word on a book checkout (called by /api/pay/webhook for events whose metadata carries `book`).
 * Paid tip → done + thank-you. Paid paperback → a Lulu print job (one copy, the reader's address, the post they paid for)
 * → printing + "at the printer". Every move happens only from the state it expects, so a repeated event changes nothing.
 * The reader gets "order received" the moment Stripe confirms payment. An order its maker cannot take (address incomplete,
 * Lulu or Printify down) stays `paid` with the reason in `error`; /api/book/retry (every 10 minutes, GitHub Actions) re-reads
 * the Stripe session and tries again, applying any owner `fix`, and tells the owner once when an order is stuck.
 */
type Ev={type:string;data:{object:PaidSession&{metadata?:Record<string,string>;payment_status?:string;payment_intent?:string|null;amount_total?:number|null}}}
/** the letter ledger (worker_book_orders.mails): one entry per letter, the provider's id when it went, the error and count when not */
async function record(o:BookOrder,key:keyof Ledger,r:{id?:string;err?:string}){
 const prev=o.mails?.[key],at=new Date().toISOString()
 const entry=r.id?{at,id:r.id}:{at,err:(r.err??'').slice(0,200),n:(prev?.n??0)+1}
 o.mails={...(o.mails??{}),[key]:entry}
 await patchBookOrder(o.id,{mails:o.mails})
}
/** the reader hears where the order is now: the letter its step owes (journey.dueLetter), once; a failure is kept and tried again */
async function tell(id:string):Promise<string|null>{
 const o=await getBookOrder({id});if(!o?.email||!mailOpen())return null
 const k=dueLetter(o);if(!k)return null
 const track=(o.tracking as {urls?:string[]}|null)?.urls?.[0]??null
 try{await record(o,k,{id:await sendMail(o.email,bookMail(k,o.lang,{order:o.id,track}),`book-${k}-${o.id}-${o.mails?.[k]?.n??0}`)});return k}
 catch(e){await record(o,k,{err:String((e as Error).message)});return null}
}
/** the owner hears of every sale, once */
async function saleNote(id:string){
 const o=await getBookOrder({id});if(!o||o.mails?.sale?.id||(o.mails?.sale?.n??0)>=5||!mailOpen())return
 const what=o.kind==='tip'?'tip':o.kind==='paperback'?`paperback (${o.variant??o.lang})`:`${o.kind} (${(o.variant??'').replace('|',' · ')})`
 const to=process.env.BOOK_OWNER_EMAIL||'fanlife@dubelteam.com'
 try{await record(o,'sale',{id:await sendMail(to,saleMail({order:o.id,what,region:o.region,euros:(o.amount_cents/100).toFixed(2),lang:o.lang}),`book-sale-${o.id}`)})}
 catch(e){await record(o,'sale',{err:String((e as Error).message)})}
}

export async function handleBookEvent(ev:Ev):Promise<void>{
 const obj=ev.data.object,id=obj.metadata?.book
 if(!id)return
 if(ev.type==='checkout.session.expired'){await moveBookOrder(id,['open'],{status:'expired'});return}
 if(ev.type==='charge.refunded'){await moveBookOrder(id,['paid','printing','shipped','done'],{status:'refunded'});return}
 if(ev.type!=='checkout.session.completed'||obj.payment_status!=='paid')return
 const email=obj.customer_details?.email??null,now=new Date().toISOString()
 if(!await moveBookOrder(id,['open','expired'],{status:'paid',paid_at:now,email,stripe_payment:typeof obj.payment_intent==='string'?obj.payment_intent:null}))return
 const o=await getBookOrder({id});if(!o)return
 await saleNote(id)
 if(o.kind==='tip'){await moveBookOrder(id,['paid'],{status:'done'});await tell(id);return}
 await tell(id)
 await sendOn(o,obj)
}

/** the one door to the maker: Lulu for paperbacks, Printify for goods; counts attempts and alerts the owner once */
async function sendOn(o:BookOrder,session:PaidSession):Promise<boolean>{
 const done=o.kind==='paperback'?!!await sendToPrinter(o.id,session,o.fix):!!await sendToPrintify(o.id,session,o.fix)
 if(done)return true
 const now=await getBookOrder({id:o.id});if(!now||now.status!=='paid')return false
 await patchBookOrder(o.id,{attempts:(now.attempts??0)+1})
 if(!now.alerted_at){await alertOwner(now);await patchBookOrder(o.id,{alerted_at:new Date().toISOString()})}
 return false
}
async function alertOwner(o:BookOrder){
 if(!mailOpen())return
 const to=process.env.BOOK_OWNER_EMAIL||'fanlife@dubelteam.com',what=o.kind==='paperback'?`paperback (${o.variant??o.lang})`:`${o.kind} (${o.variant})`
 const text=`A paid Broken Collective order has not reached its maker yet.\n\nOrder: ${o.id}\nItem: ${what}\nRegion: ${o.region}\nPaid: ${o.paid_at}\nReason: ${o.error??'unknown'}\n\nThe server retries every 10 minutes. If the reason is a missing detail (a postcode, a phone), send it to Claude and it will be added to the order.`
 try{await sendMail(to,{subject:`⚠ Book order ${o.id} is waiting — ${o.error?.slice(0,60)??''}`,html:`<pre style="font:14px/1.5 monospace;white-space:pre-wrap">${text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!))}</pre>`,text},`book-alert-${o.id}`)}catch{/* the retry loop goes on */}
}

/** the retry loop: every paid order still without a maker job is tried again from its Stripe session */
export async function retryStuck():Promise<{tried:number;sent:number;waiting:{id:string;minutes:number;error:string|null}[]}>{
 const list=await stuckBookOrders(),waiting:{id:string;minutes:number;error:string|null}[]=[];let sent=0
 for(const o of list){
  if(!o.stripe_session||(o.attempts??0)>=144)continue
  try{
   const s=await stripeGet<PaidSession>(`checkout/sessions/${o.stripe_session}`)
   await tell(o.id)
   if(await sendOn(o,s)){sent++;continue}
  }catch(e){await patchBookOrder(o.id,{error:String((e as Error).message).slice(0,300)})}
  const now=await getBookOrder({id:o.id})
  waiting.push({id:o.id,minutes:Math.round((Date.now()-Date.parse(o.paid_at??o.created_at))/60000),error:now?.error??null})
 }
 return {tried:list.length,sent,waiting}
}

/** one copy to Lulu; also the desk's "send again" for a paperback stuck at `paid` */
export async function sendToPrinter(id:string,session:PaidSession,fix:Record<string,string>|null=null):Promise<Job|null>{
 const o=await getBookOrder({id});if(!o||o.kind!=='paperback'||!o.region||!o.ship)return null
 const address=luluAddress(session,fix)
 if(!address){await moveBookOrder(id,['paid'],{error:addressGap(session,fix)||'The address from Stripe is incomplete.'});return null}
 if(!luluOpen()){await moveBookOrder(id,['paid'],{error:'Lulu keys are not set — the order waits.'});return null}
 try{
  try{await ensureLuluWebhook()}catch{/* status mail waits for the hook; the job itself goes on */}
  const job=await createJob({order:id,edition:isEdition(o.variant)?o.variant:o.lang,address,level:REGIONS[o.region].ship[o.ship]?.level??'MAIL',contact:process.env.BOOK_CONTACT_EMAIL||'fanlife@dubelteam.com'})
  await moveBookOrder(id,['paid'],{status:'printing',lulu_job:job.id,lulu_status:job.status?.name??null,lulu_cost:job.costs?.total_cost_incl_tax?`${job.costs.total_cost_incl_tax} ${job.costs.currency??''}`.trim():null,error:null})
  await tell(id)
  return job
 }catch(e){await moveBookOrder(id,['paid'],{error:String((e as Error).message).slice(0,300)});return null}
}

/** Lulu's word on a print job (PRINT_JOB_STATUS_CHANGED) */
export async function handleLuluStatus(job:Job){
 const o=await getBookOrder({lulu_job:job.id});if(!o)return
 const name=job.status?.name??'',li=job.line_items?.[0]
 const tracking=li?.tracking_id||li?.tracking_urls?.length?{id:li?.tracking_id??null,urls:li?.tracking_urls??[],carrier:li?.carrier_name??null}:null
 if(name==='SHIPPED'){
  if(await moveBookOrder(o.id,['printing'],{status:'shipped',lulu_status:name,shipped_at:new Date().toISOString(),tracking}))await tell(o.id)
 }else if(name==='REJECTED'||name==='CANCELED'||name==='ERROR'){
  await moveBookOrder(o.id,['printing'],{status:name==='CANCELED'?'canceled':'failed',lulu_status:name,error:JSON.stringify(job.status?.messages??{}).slice(0,300)})
 }else if(await moveBookOrder(o.id,['printing'],{lulu_status:name}))await tell(o.id)
}

/** one garment to Printify (the book's own store); also the desk's "send again" */
export async function sendToPrintify(id:string,session:PaidSession,fix:Record<string,string>|null=null):Promise<string|null>{
 const o=await getBookOrder({id});if(!o||(o.kind!=='tee'&&o.kind!=='cap')||!o.variant)return null
 const address=printifyAddress(session,fix)
 if(!address){await moveBookOrder(id,['paid'],{error:addressGap(session,fix)||'The address from Stripe is incomplete.'});return null}
 try{
  const [colour,size]=o.variant.split('|') as [string,string]
  const made=await orderGoods({order:id,kind:o.kind,colour,size:size??'One size',address})
  await moveBookOrder(id,['paid'],{status:'printing',printify_order:made.id,error:null})
  await tell(id)
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
  if(await moveBookOrder(o.id,['printing'],{status:'shipped',shipped_at:new Date().toISOString(),tracking}))await tell(o.id)
 }else if(ev.type==='order:updated'&&d.status==='canceled')await moveBookOrder(o.id,['printing'],{status:'canceled'})
}

/**
 * THE TICK (every 5 minutes, pg_cron marketing:book-tick → /api/book/tick; the GitHub workflow stays as the alarm):
 * stuck paid orders go on to their maker, printing Lulu jobs are asked about directly every 30 minutes (a lost webhook never
 * strands an order), and every order gets the letter its step owes — including "has it arrived?" after the post's window.
 */
export async function tick(){
 const retry=await retryStuck(),asked:string[]=[],told:{id:string;letter:string}[]=[]
 for(const o of await liveBookOrders()){
  if(o.kind==='paperback'&&o.status==='printing'&&o.lulu_job&&luluOpen()&&(!o.lulu_checked_at||Date.now()-Date.parse(o.lulu_checked_at)>30*60000)){
   try{await handleLuluStatus(await getJob(o.lulu_job));asked.push(o.id)}catch{/* Lulu down: the next tick asks again */}
   await patchBookOrder(o.id,{lulu_checked_at:new Date().toISOString()})
  }
  if(o.paid_at&&!o.mails?.sale?.id)await saleNote(o.id)
  const k=await tell(o.id);if(k)told.push({id:o.id,letter:k})
 }
 return {...retry,asked,told}
}

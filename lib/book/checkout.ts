import {BOOK_SITE,GOODS,PAPERBACK,REGIONS,TIP,type BookLang,type GoodsKind,type Region,type Ship} from './catalog'

/**
 * The two Stripe Checkout bodies the book opens (pure — tests/book-shop.test.ts).
 * metadata.book carries our order id: the shared Stripe webhook (/api/pay/webhook) hands every event that has it to
 * the book's handler, so the account keeps one webhook endpoint.
 */
const back=(lang:BookLang,hash:string)=>`${BOOK_SITE}/${lang}/${hash}`
const thanks=(lang:BookLang,kind:'tip'|'paperback'|'goods')=>`${BOOK_SITE}/${lang}/?thanks=${kind}`

export function tipSession(o:{order:string;lang:BookLang;cents:number}){
 return {mode:'payment',submit_type:'pay',locale:o.lang==='he'?'auto':'en',client_reference_id:o.order,
  success_url:thanks(o.lang,'tip'),cancel_url:back(o.lang,'#support'),
  metadata:{book:o.order,kind:'tip'},payment_intent_data:{metadata:{book:o.order,kind:'tip'},description:TIP.name.en},
  line_items:[{quantity:1,price_data:{currency:'eur',unit_amount:o.cents,product_data:{name:TIP.name[o.lang],description:TIP.blurb[o.lang]}}}],
  automatic_tax:{enabled:false},expires_at:Math.floor(Date.now()/1000)+3600}
}

export function paperbackSession(o:{order:string;lang:BookLang;region:Region;ship:Ship;email?:string}){
 const r=REGIONS[o.region],s=r.ship[o.ship]
 const name=o.ship==='express'?(o.lang==='he'?'משלוח מהיר':'Express post'):(o.lang==='he'?'דואר רגיל':'Standard post')
 return {mode:'payment',locale:o.lang==='he'?'auto':'en',client_reference_id:o.order,
  success_url:thanks(o.lang,'paperback'),cancel_url:back(o.lang,'#paperback'),
  metadata:{book:o.order,kind:'paperback',lang:o.lang,region:o.region,ship:o.ship},
  payment_intent_data:{metadata:{book:o.order,kind:'paperback'},description:PAPERBACK.name.en},
  line_items:[{quantity:1,price_data:{currency:'eur',unit_amount:PAPERBACK.cents,product_data:{name:PAPERBACK.name[o.lang],description:PAPERBACK.blurb[o.lang]}}}],
  shipping_address_collection:{allowed_countries:r.countries},phone_number_collection:{enabled:true},
  shipping_options:[{shipping_rate_data:{type:'fixed_amount',display_name:name,fixed_amount:{amount:s.cents,currency:'eur'},
   delivery_estimate:{minimum:{unit:'business_day',value:s.days[0]},maximum:{unit:'business_day',value:s.days[1]}}}}],
  ...(o.email?{customer_email:o.email}:{}),allow_promotion_codes:true,automatic_tax:{enabled:false},expires_at:Math.floor(Date.now()/1000)+3600}
}

/** Stripe's shipping address, in either place the API has kept it, as Lulu wants it; null when something Lulu needs is missing */
type StripeAddr={line1?:string|null;line2?:string|null;city?:string|null;state?:string|null;postal_code?:string|null;country?:string|null}
export type PaidSession={customer_details?:{email?:string|null;name?:string|null;phone?:string|null;address?:StripeAddr|null}|null
 shipping_details?:{name?:string|null;address?:StripeAddr|null}|null;collected_information?:{shipping_details?:{name?:string|null;address?:StripeAddr|null}|null}|null}
export function luluAddress(s:PaidSession){
 const sd=s.collected_information?.shipping_details??s.shipping_details,a=sd?.address,phone=s.customer_details?.phone
 const name=sd?.name||s.customer_details?.name
 if(!a?.line1||!a.city||!a.country||!name||!phone)return null
 return {name,street1:a.line1,...(a.line2?{street2:a.line2}:{}),city:a.city,...(a.state?{state_code:a.state}:{}),postcode:a.postal_code||'',
  country_code:a.country,phone_number:phone,...(s.customer_details?.email?{email:s.customer_details.email}:{})}
}

export function goodsSession(o:{order:string;lang:BookLang;kind:GoodsKind;size:string;region:Region}){
 const g=GOODS[o.kind],r=REGIONS[o.region],size=o.size==='One size'?'':` · ${o.size}`
 return {mode:'payment',locale:o.lang==='he'?'auto':'en',client_reference_id:o.order,
  success_url:thanks(o.lang,'goods'),cancel_url:back(o.lang,'#goods'),
  metadata:{book:o.order,kind:o.kind,size:o.size,region:o.region},payment_intent_data:{metadata:{book:o.order,kind:o.kind},description:g.name.en},
  line_items:[{quantity:1,price_data:{currency:'eur',unit_amount:g.cents,product_data:{name:`${g.name[o.lang]}${size}`,description:g.blurb[o.lang]}}}],
  shipping_address_collection:{allowed_countries:r.countries},phone_number_collection:{enabled:true},
  shipping_options:[{shipping_rate_data:{type:'fixed_amount',display_name:o.lang==='he'?'משלוח':'Post',fixed_amount:{amount:g.ship[o.region],currency:'eur'},
   delivery_estimate:{minimum:{unit:'business_day',value:7},maximum:{unit:'business_day',value:o.region==='eu'||o.region==='na'?14:24}}}}],
  allow_promotion_codes:true,automatic_tax:{enabled:false},expires_at:Math.floor(Date.now()/1000)+3600}
}
/** the same Stripe address as Printify wants it */
export function printifyAddress(s:PaidSession){
 const a=luluAddress(s);if(!a)return null
 const [first,...rest]=a.name.trim().split(/\s+/)
 return {first_name:first||a.name,last_name:rest.join(' ')||'-',...(a.email?{email:a.email}:{}),phone:a.phone_number,country:a.country_code,
  ...(a.state_code?{region:a.state_code}:{}),address1:a.street1,...(a.street2?{address2:a.street2}:{}),city:a.city,zip:a.postcode}
}

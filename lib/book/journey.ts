import {REGIONS,type BookLang,type Region,type Ship} from './catalog'

/**
 * THE READER'S JOURNEY (owner, 23.11.2026: "full automation for the whole purchase — pleasant, reliable and fun").
 * Pure: where an order stands, which letter it is owed, and when it should be in the reader's hands. lib/book/fulfil sends
 * the letters, /book/order/<id> draws the journey, tests/book-journey.test.ts holds the rules.
 *
 * Paperback: paid → at the printer (Lulu job) → on the press (Lulu IN_PRODUCTION) → posted → in your hands.
 * Shirt / cap: paid → being made (Printify) → posted → in your hands.
 * A letter for each step; when the server misses a step (a lost webhook, a failed send) the tick sends the letter of the step
 * the order is at now, never the ones it has passed: the reader hears where the book is, not its history.
 */
export type Letter='tip'|'received'|'printing'|'press'|'making'|'shipped'|'after'
export type Ledger=Partial<Record<Letter|'sale',{at:string;id?:string;err?:string;n?:number}>>
export type JourneyOrder={kind:'tip'|'paperback'|'tee'|'cap';status:string;lang:BookLang;region:Region|null;ship:Ship|null;lulu_status:string|null
 paid_at:string|null;shipped_at:string|null;mails?:Ledger|null}

/** the order of the letters; a later one sent makes every earlier one moot */
const ORDER:Letter[]=['received','printing','making','press','shipped','after']
export const MAX_TRIES=5
const DAY=86400000

/** Lulu's words for a job that is printing now */
export const ON_PRESS=new Set(['IN_PRODUCTION'])

/** the window the post promised, in calendar days from posting (business days × 7/5, rounded up) */
export function arrival(o:Pick<JourneyOrder,'region'|'ship'|'shipped_at'|'kind'>):{from:string;to:string}|null{
 if(!o.shipped_at)return null
 const d=o.region&&o.ship?REGIONS[o.region].ship[o.ship]?.days:null
 const [a,b]=o.kind==='paperback'&&d?d:[7,o.region==='eu'||o.region==='na'?14:24]
 const t=Date.parse(o.shipped_at),cal=(n:number)=>Math.ceil(n*7/5)
 return {from:new Date(t+cal(a)*DAY).toISOString(),to:new Date(t+cal(b)*DAY).toISOString()}
}

/** the letter for the step the order is at now (null: none for this step) */
export function stepLetter(o:JourneyOrder,now=Date.now()):Letter|null{
 if(o.kind==='tip')return o.status==='done'?'tip':null
 if(o.status==='paid')return 'received'
 if(o.status==='printing')return o.kind!=='paperback'?'making':ON_PRESS.has(o.lulu_status??'')?'press':'printing'
 if(o.status==='shipped'){
  const w=arrival(o)
  return w&&now>Date.parse(w.to)+3*DAY?'after':'shipped'
 }
 return null
}

const sent=(l:Ledger|null|undefined,k:Letter)=>!!l?.[k]?.id
/** the letter owed now: the current step's, unless it (or a later one) went already or it has failed too often */
export function dueLetter(o:JourneyOrder,now=Date.now()):Letter|null{
 const k=stepLetter(o,now);if(!k)return null
 const l=o.mails??{}
 if(sent(l,k))return null
 if(k!=='tip'&&ORDER.slice(ORDER.indexOf(k)+1).some(x=>sent(l,x)))return null
 if((l[k]?.n??0)>=MAX_TRIES)return null
 // the "after" note only to orders posted in the last 60 days (a re-run never reaches a reader months later)
 if(k==='after'&&o.shipped_at&&now-Date.parse(o.shipped_at)>60*DAY)return null
 return k
}

/** the stations the journey page draws, and which one the order is at */
export type Station={key:'paid'|'printer'|'press'|'making'|'posted'|'hands';at:string|null}
export function stations(o:JourneyOrder&{created_at?:string},now=Date.now()):{list:Station[];at:number;done:boolean}{
 const w=arrival(o)
 const list:Station[]=o.kind==='paperback'
  ?[{key:'paid',at:o.paid_at},{key:'printer',at:null},{key:'press',at:null},{key:'posted',at:o.shipped_at},{key:'hands',at:w?.to??null}]
  :[{key:'paid',at:o.paid_at},{key:'making',at:null},{key:'posted',at:o.shipped_at},{key:'hands',at:w?.to??null}]
 let at=0
 if(o.status==='printing')at=o.kind==='paperback'?(ON_PRESS.has(o.lulu_status??'')?2:1):1
 else if(o.status==='shipped')at=list.length-2
 const done=o.status==='shipped'&&!!w&&now>Date.parse(w.to)
 return {list,at:done?list.length-1:at,done}
}

export const JOURNEY_SITE=()=>process.env.NEXT_PUBLIC_SITE_URL||'https://fanlife.dubelteam.com'
export const journeyUrl=(id:string)=>`${JOURNEY_SITE()}/book/order/${id}`

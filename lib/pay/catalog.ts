/**
 * WHAT WE SELL OURSELVES (owner, 16.11.2026: "the shop keeps Printify's checkout; our own products — the video, the personal
 * file — go through our Stripe"). Only goods FAN LIFE makes and delivers itself are here; anything printed and shipped stays on
 * the Printify store. Prices are in euro cents (the Stripe account is Greek). `on:false` keeps a product out of every page
 * until its delivery exists.
 */
export type PayKind='print-file'|'film'
export type PayItem={kind:PayKind;name:string;blurb:string;cents:number;currency:'eur';on:boolean;delivery:'instant'|'queued'}
export const CATALOG:Record<PayKind,PayItem>={
 'print-file':{kind:'print-file',name:'Your print, as a file',blurb:'The full-size file of your print (3600 × 4800 px), ready to print at home or at any print shop.',cents:499,currency:'eur',on:true,delivery:'instant'},
 // the personal film: on when the studio's film-for-one job exists (it answers the order through `deliverFilm`)
 film:{kind:'film',name:'Your XI, the film',blurb:'A short film of your eleven, with your own dedication — made in the FAN LIFE studio.',cents:1499,currency:'eur',on:false,delivery:'queued'},
}
export const isPayKind=(k:unknown):k is PayKind=>typeof k==='string'&&k in CATALOG

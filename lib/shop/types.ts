import type {Sale,Promoters} from './sales'
/** The shop's own record (file area `shop`): what the print room has made, what Printify answered and what the public sees. */
export const KINDS=['poster','framed','canvas','tote','tee','hoodie','kids-tee','mug','sticker','phone-case','puzzle','notebook','more'] as const
export type Kind=(typeof KINDS)[number]
export const SIDES=['front','back','both'] as const
export const SIZES=['auto','badge','medium','large','full'] as const
export const SHADES=['light','dark','all'] as const
export const PLACES=['auto','center','chest-left','chest-right','upper','lower'] as const
export type ArtRef={library:{id:string;name:string}}|{upload:{id:string;name:string;preview:string;width:number;height:number}}
/** one print area of a product (front, back, a sleeve, the neck label …): its own picture, where it sits and how big */
export type AreaDesign={art?:ArtRef;place?:(typeof PLACES)[number];size?:(typeof SIZES)[number];cutout?:boolean}
export type ProductDesign={
 /** exactly these print areas, by the printer's position name; when set it replaces `sides` */
 areas?:Record<string,AreaDesign>
 sides?:(typeof SIDES)[number];
 /** where the front print sits (quick choice, without opening the print areas) */
 place?:(typeof PLACES)[number];size?:(typeof SIZES)[number];shades?:(typeof SHADES)[number];cutout?:boolean;margin?:number
 /** exact colours and sizes chosen from the printer's stock (override `shades`) */
 colors?:string[];sizes?:string[]}
export type ProductStatus='draft'|'building'|'ready'|'live'|'error'
export type ShopProduct={
 id:string
 /** 'fanlife' or a club id */
 subject:string
 kind:Kind
 /** a picture from the owner's Drive library (the studio's library), or one he uploaded here (already stored at Printify) */
 art:ArtRef
 title:string;description:string
 status:ProductStatus;error?:string
 /** any product of Printify's whole catalogue, chosen in the desk's catalogue (kind 'more'): its catalogue number and name */
 blueprint?:{id:number;title:string}
 /** the owner's edits in the builder (13.11.2026): where it prints, how big, on which colours, its own margin, a clean background */
 design?:ProductDesign
 /** automatic re-presses after a passing failure (the hourly check-up, at most two) */
 retries?:number
 /** shown on /shop — the owner's switch; only a `live` product with a link can be shown */
 visible:boolean
 printify?:{productId:string;blueprintId:number;providerId:number;images:string[];priceFrom:number;currency:string;url:string|null;publishedAt:string|null;
 /** the mock-up of the back, when the product prints there */
 backImage?:string;
 /** how sharp the print is: picture pixels ÷ pixels the product wants (1 = full; under .2 the shop hides it) */
 quality?:number;
 /** the sale whose price Printify charges now: its id, the % actually cut and the lowest regular price (cents) */
 sale?:{id:string;percent:number;was:number}}
 /** pieces sold, read from Printify's orders by the hourly check-up */
 sold?:number
 createdAt:string;updatedAt:string
}
export type KindMatch={blueprintId:number;providerId:number;title:string;provider:string}
export type ShopSettings={
 /** the public door: off until the owner opens the shop */
 open:boolean
 /** the sale the owner runs in Printify's Promotions (13.11.2026): the site shows it only while it is on — the same % as in Printify */
 promo?:{percent:number;label:string;until:string|null;code?:string;freeShipping?:boolean}|null
 /** real price cuts (14.11.2026): the shop lowers the price in Printify for the sale's time and puts it back after */
 sales?:Sale[]
 /** the ribbon line, free-shipping threshold and fan favourites */
 promoters?:Promoters
 /** the names the owner gave his designs, by design key — every product of the design carries it */
 designNames?:Record<string,string>
 shopId:number|null;shopTitle:string|null;channel:string|null
 /** the Pop-Up store's address, e.g. https://fanlife.printify.me */
 popupUrl:string
 /** price = cost × (1 + margin/100), rounded up to .99 */
 margin:number
 /** the catalogue row each kind prints on: found once, kept, and the owner may replace it */
 matches:Partial<Record<Kind,KindMatch>>
 /** the printer chosen for each whole-catalogue product, by catalogue number */
 picked?:Record<number,KindMatch>
}
export type ShopAudit={at:string;by:string;what:string}
export type ShopHealthNote={at:string;ok:boolean;notes:string[];checked:number;repaired:number}
export type ShopDoc={v:1;settings:ShopSettings;products:ShopProduct[];audit:ShopAudit[];health?:ShopHealthNote}
export const EMPTY_SHOP:ShopDoc={v:1,settings:{open:false,shopId:null,shopTitle:null,channel:null,popupUrl:'',margin:45,matches:{}},products:[],audit:[]}
/** what the public page may know about a product */
export type Shelf='wall'|'wear'|'gear'|'home'|'kids'|'small'
export type PublicProduct={
 /** the price before the store-wide sale, when one is on (cents) */
 was?:number|null;id:string;subject:string;kind:Kind;title:string;description:string;image:string;images:string[];back?:string;
 /** the storefront's shelf, the design it shares with sibling products, when it went on sale */
 shelf:Shelf;design:string;since:string|null;sold:number;
 /** the sale this product is in (its id), when one is on */
 sale?:string|null;priceFrom:number;currency:string;url:string;/** ≈ whole euros at today's ECB rate (a guide; the checkout is in dollars) */eur?:number|null}
/** below this share of the pixels a product needs, the print comes out blurred: the shop does not sell it, whatever the switch says */
export const MIN_QUALITY=.2
export const qualityOf=(p:ShopProduct)=>p.printify?.quality??(()=>{const m=/\((\d+)% of the print size\)/.exec(p.error||'');return m?Number(m[1])/100:1})()
export const isPublic=(p:ShopProduct)=>p.visible&&p.status==='live'&&!!p.printify?.url&&p.printify.images.length>0&&qualityOf(p)>=MIN_QUALITY
/** the storefront's shelf for a product: by kind, and for a catalogue product by its name */
export function shelfOf(kind:Kind,catalogue?:string):Shelf{
 if(kind==='poster'||kind==='framed'||kind==='canvas')return 'wall';if(kind==='tee'||kind==='hoodie')return 'wear';if(kind==='kids-tee')return 'kids'
 if(kind==='tote')return 'gear';if(kind==='mug')return 'home';if(kind!=='more')return 'small'
 const t=catalogue||''
 if(/kid|youth|toddler|baby|infant|bodysuit|onesie|romper|bib/i.test(t))return 'kids'
 if(/flag|banner|scarf|bandana|hat|cap|beanie|visor|bucket|tote|bag|backpack|pouch|duffel/i.test(t))return 'gear'
 if(/poster|canvas|framed|print|wall|tapestr|metal|acrylic|photo tile/i.test(t))return 'wall'
 if(/shirt|tee|hood|sweat|tank|jacket|jersey|polo|crewneck|long sleeve|zip|jogger|short/i.test(t))return 'wear'
 if(/mug|cup|tumbler|bottle|glass|stein|pillow|blanket|towel|rug|mat|curtain|candle|ornament|coaster|clock/i.test(t))return 'home'
 return 'small'
}
/** the design a product shares with its siblings: the same picture on several products */
export const designKey=(p:ShopProduct)=>'library' in p.art?`l-${p.art.library.id.slice(-10)}`:`u-${p.art.upload.id.slice(-10)}`
export const toPublic=(p:ShopProduct):PublicProduct=>({sold:p.sold??0,...(p.printify!.sale?.percent?{sale:p.printify!.sale.id,was:p.printify!.sale.was}:{}),shelf:shelfOf(p.kind,p.blueprint?.title),design:designKey(p),since:p.printify!.publishedAt,id:p.id,subject:p.subject,kind:p.kind,title:p.title,description:p.description,image:p.printify!.images[0]!,images:p.printify!.images.slice(0,4),...(p.printify!.backImage?{back:p.printify!.backImage}:{}),priceFrom:p.printify!.priceFrom,currency:p.printify!.currency,url:p.printify!.url!})

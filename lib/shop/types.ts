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
 colors?:string[];sizes?:string[]
 /** front + back with two different pictures (14.11.2026): the back's own picture; without it the back repeats the front */
 backArt?:ArtRef}
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
 /** a supporter's own print (14.11.2026: the all-time XI framed): made on demand, never on /shop, cleared after 3 days unless sold */
 personal?:boolean
 /** shown on /shop — the owner's switch; only a `live` product with a link can be shown */
 visible:boolean
 printify?:{productId:string;blueprintId:number;providerId:number;images:string[];priceFrom:number;currency:string;url:string|null;publishedAt:string|null;
 /** the mock-up of the back, when the product prints there */
 backImage?:string;
 /** where the press really put the design (15.11.2026): the mock-up choice follows it, not the editor's default */
 side?:'front'|'back'|'both';
 /** the owner chose this picture to lead (15.11.2026): the check-up keeps it first while Printify still has it */
 cover?:string;
 /** the picture was enlarged this many times for print (15.11.2026, soft prints): the sharpness counts the enlarged file */
 upscaled?:number;
 /** how sharp the print is: picture pixels ÷ pixels the product wants (1 = full; under .2 the shop hides it) */
 quality?:number;
 /** the sale whose price Printify charges now: its id, the % actually cut and the lowest regular price (cents) */
 sale?:{id:string;percent:number;was:number}}
 /** more storefront categories this product also sits in, beside its own (owner, 14.11.2026) */
 shelves?:Shelf[]
 /** more clubs it belongs to besides its own (16.11.2026, owner: "a product in several clubs"): it is listed under each */
 clubs?:string[]
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
 /** FAN LIFE's mark on garments: the inside neck label only (15.11.2026); sleeve and back-of-neck marks were retired */
 brand?:{neck?:boolean;sleeve?:boolean;backNeck?:boolean}
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
/** the daily doctor (14.11.2026): what it fixed by itself and what still needs the owner's eye */
export type ShopDoctorNote={at:string;fixed:string[];needs:string[]}
export type ShopDoc={v:1;settings:ShopSettings;products:ShopProduct[];audit:ShopAudit[];health?:ShopHealthNote;doctor?:ShopDoctorNote}
export const EMPTY_SHOP:ShopDoc={v:1,settings:{open:false,shopId:null,shopTitle:null,channel:null,popupUrl:'',margin:45,matches:{}},products:[],audit:[]}
/** what the public page may know about a product */
export type Shelf='wall'|'wear'|'gear'|'home'|'kids'|'small'
export type PublicProduct={
 /** the price before the store-wide sale, when one is on (cents) */
 was?:number|null;id:string;subject:string;kind:Kind;title:string;description:string;image:string;images:string[];back?:string;
 /** the storefront's shelf, the design it shares with sibling products, when it went on sale */
 shelf:Shelf;design:string;since:string|null;sold:number;
 /** the other categories it also sits in */
 also?:Shelf[];/** every club it is listed under: its own first */clubs?:string[];
 /** the sale this product is in (its id), when one is on */
 sale?:string|null;priceFrom:number;currency:string;url:string;/** ≈ whole euros at today's ECB rate (a guide; the checkout is in dollars) */eur?:number|null}
/** below this share of the pixels a product needs, the print comes out blurred: the shop does not sell it, whatever the switch says */
export const MIN_QUALITY=.2
export const qualityOf=(p:ShopProduct)=>p.printify?.quality??(()=>{const m=/\((\d+)% of the print size\)/.exec(p.error||'');return m?Number(m[1])/100:1})()
export const isPublic=(p:ShopProduct)=>!p.personal&&p.visible&&p.status==='live'&&!!p.printify?.url&&p.printify.images.length>0&&qualityOf(p)>=MIN_QUALITY
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
/**
 * MADE IN PRINTIFY (16.11.2026, owner: "importing a product I made in Printify breaks its design"). A product joined from
 * Printify has no FAN LIFE art: its "art" is only Printify's mock-up. Pressing it would delete the owner's product and rebuild
 * it from that photo. Such a product is never pressed, re-designed or re-made here — its design lives in Printify; the desk only
 * shows, hides, renames, prices and re-reads it.
 */
export const madeInPrintify=(p:Pick<ShopProduct,'art'>)=>'upload' in p.art&&p.art.upload.id==='printify'
/** is this product listed under that club (its own, or one added) */
export const inClub=(p:{subject:string;clubs?:string[]},club:string)=>p.subject===club||!!p.clubs?.includes(club)
export const toPublic=(p:ShopProduct):PublicProduct=>({sold:p.sold??0,...(p.clubs?.length?{clubs:[p.subject,...p.clubs]}:{}),...(p.shelves?.length?{also:p.shelves}:{}),...(p.printify!.sale?.percent?{sale:p.printify!.sale.id,was:p.printify!.sale.was}:{}),shelf:shelfOf(p.kind,p.blueprint?.title),design:designKey(p),since:p.printify!.publishedAt,id:p.id,subject:p.subject,kind:p.kind,title:p.title,description:p.description,image:p.printify!.images[0]!,images:p.printify!.images.slice(0,4),...(p.printify!.backImage?{back:p.printify!.backImage}:{}),priceFrom:p.printify!.priceFrom,currency:p.printify!.currency,url:p.printify!.url!})

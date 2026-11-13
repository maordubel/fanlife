/** The shop's own record (file area `shop`): what the print room has made, what Printify answered and what the public sees. */
export const KINDS=['poster','framed','canvas','tote','tee','hoodie','kids-tee','mug','sticker','phone-case','puzzle','notebook','more'] as const
export type Kind=(typeof KINDS)[number]
export const SIDES=['front','back','both'] as const
export const SIZES=['auto','badge','medium','large','full'] as const
export const SHADES=['light','dark','all'] as const
export type ProductDesign={sides?:(typeof SIDES)[number];size?:(typeof SIZES)[number];shades?:(typeof SHADES)[number];cutout?:boolean;margin?:number
 /** exact colours and sizes chosen from the printer's stock (override `shades`) */
 colors?:string[];sizes?:string[]}
export type ProductStatus='draft'|'building'|'ready'|'live'|'error'
export type ShopProduct={
 id:string
 /** 'fanlife' or a club id */
 subject:string
 kind:Kind
 /** a picture from the owner's Drive library (the studio's library), or one he uploaded here (already stored at Printify) */
 art:{library:{id:string;name:string}}|{upload:{id:string;name:string;preview:string;width:number;height:number}}
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
 printify?:{productId:string;blueprintId:number;providerId:number;images:string[];priceFrom:number;currency:string;url:string|null;publishedAt:string|null}
 createdAt:string;updatedAt:string
}
export type KindMatch={blueprintId:number;providerId:number;title:string;provider:string}
export type ShopSettings={
 /** the public door: off until the owner opens the shop */
 open:boolean
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
export type PublicProduct={id:string;subject:string;kind:Kind;title:string;description:string;image:string;images:string[];priceFrom:number;currency:string;url:string;/** ≈ whole euros at today's ECB rate (a guide; the checkout is in dollars) */eur?:number|null}
export const isPublic=(p:ShopProduct)=>p.visible&&p.status==='live'&&!!p.printify?.url&&p.printify.images.length>0
export const toPublic=(p:ShopProduct):PublicProduct=>({id:p.id,subject:p.subject,kind:p.kind,title:p.title,description:p.description,image:p.printify!.images[0]!,images:p.printify!.images.slice(0,4),priceFrom:p.printify!.priceFrom,currency:p.printify!.currency,url:p.printify!.url!})

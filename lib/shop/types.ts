/** The shop's own record (file area `shop`): what the print room has made, what Printify answered and what the public sees. */
export const KINDS=['poster','framed','canvas','tote','tee','hoodie','kids-tee','mug','sticker','phone-case','puzzle','notebook'] as const
export type Kind=(typeof KINDS)[number]
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
}
export type ShopAudit={at:string;by:string;what:string}
export type ShopDoc={v:1;settings:ShopSettings;products:ShopProduct[];audit:ShopAudit[]}
export const EMPTY_SHOP:ShopDoc={v:1,settings:{open:false,shopId:null,shopTitle:null,channel:null,popupUrl:'',margin:45,matches:{}},products:[],audit:[]}
/** what the public page may know about a product */
export type PublicProduct={id:string;subject:string;kind:Kind;title:string;description:string;image:string;images:string[];priceFrom:number;currency:string;url:string}
export const isPublic=(p:ShopProduct)=>p.visible&&p.status==='live'&&!!p.printify?.url&&p.printify.images.length>0
export const toPublic=(p:ShopProduct):PublicProduct=>({id:p.id,subject:p.subject,kind:p.kind,title:p.title,description:p.description,image:p.printify!.images[0]!,images:p.printify!.images.slice(0,4),priceFrom:p.printify!.priceFrom,currency:p.printify!.currency,url:p.printify!.url!})

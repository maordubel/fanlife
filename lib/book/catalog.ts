/**
 * BROKEN COLLECTIVE · what the book sells (owner, 17.11.2026: "a Stripe tip through FAN LIFE's Stripe, and the physical
 * book through the Lulu Print API, Hebrew and English").
 *
 * The book site is static (dubelteam.com/broken-collective); its buttons are plain links to FAN LIFE's /api/book/* doors,
 * which open Stripe Checkout on the one Stripe account (Greek, euro). A paid paperback becomes a Lulu print job; Lulu prints
 * and ships it straight to the reader.
 *
 * Prices are in euro cents. Shipping is priced per region (the buyer picks the region on the book page, Checkout then
 * accepts addresses only from that region), so the charge always covers Lulu's cost — /api/book/quote shows Lulu's live
 * cost per region next to these numbers; adjust here when it drifts.
 */
export type BookLang='he'|'en'
export type Region='il'|'eu'|'na'|'world'
export type Ship='standard'|'express'

/** Lulu SKU: 5.5×8.5in · black & white standard · perfect bound · 60# cream · matte cover (print/build.py in the book repo) */
export const BOOK_SKU='0550X0850BWSTDPB060UC444MXX'

/** the print files, built by broken-collective-src/print/build.py and served from the book site (public; the book is free to read anyway) */
const FILES=process.env.BOOK_PRINT_FILES_URL||'https://www.dubelteam.com/broken-collective/print/pb-2026-11'
export const EDITIONS:Record<BookLang,{title:string;pages:number;interior:string;cover:string}>={
 he:{title:'קולקטיב שבור · Broken Collective (Hebrew)',pages:188,interior:`${FILES}/broken-collective-he-interior.pdf`,cover:`${FILES}/broken-collective-he-cover.pdf`},
 en:{title:'Broken Collective (English)',pages:214,interior:`${FILES}/broken-collective-en-interior.pdf`,cover:`${FILES}/broken-collective-en-cover.pdf`},
}

export const PAPERBACK={cents:1800,name:{he:'קולקטיב שבור — הספר המודפס',en:'Broken Collective — the paperback'},
 blurb:{he:'מהדורה ראשונה בכריכה רכה · עונות 2020–2025 · מודפס לפי הזמנה ונשלח אליכם.',en:'First paperback edition · Seasons 2020–2025 · printed on demand and posted to you.'}}

const EU=['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','GB','CH','NO','IS']
/** Lulu level per choice; cents are what the reader pays for the post */
export const REGIONS:Record<Region,{label:{he:string;en:string};countries:string[];ship:Record<Ship,{cents:number;level:'MAIL'|'PRIORITY_MAIL'|'GROUND'|'EXPEDITED'|'EXPRESS';days:[number,number]}>;sample:{city:string;postcode:string;country_code:string;street1:string}}>={
 il:{label:{he:'ישראל',en:'Israel'},countries:['IL'],sample:{street1:'1 Dizengoff St',city:'Tel Aviv',postcode:'6433201',country_code:'IL'},
  ship:{standard:{cents:1100,level:'MAIL',days:[12,25]},express:{cents:2600,level:'EXPRESS',days:[5,9]}}},
 eu:{label:{he:'אירופה ובריטניה',en:'Europe & UK'},countries:EU,sample:{street1:'1 Ermou St',city:'Athens',postcode:'10563',country_code:'GR'},
  ship:{standard:{cents:700,level:'MAIL',days:[7,14]},express:{cents:1900,level:'EXPRESS',days:[3,6]}}},
 na:{label:{he:'ארה״ב וקנדה',en:'USA & Canada'},countries:['US','CA'],sample:{street1:'1 Main St',city:'New York',postcode:'10001',country_code:'US'},
  ship:{standard:{cents:700,level:'MAIL',days:[6,12]},express:{cents:1900,level:'EXPRESS',days:[3,5]}}},
 world:{label:{he:'שאר העולם',en:'Rest of the world'},countries:['AU','NZ','JP','SG','KR','HK','ZA','AE','TR','IN','TH'],sample:{street1:'1 George St',city:'Sydney',postcode:'2000',country_code:'AU'},
  ship:{standard:{cents:1300,level:'MAIL',days:[12,28]},express:{cents:3000,level:'EXPRESS',days:[5,9]}}},
}

/** the tip jar: the three tiers the book's "bill" shows, plus the reader's own amount within these bounds */
export const TIP={tiers:[300,600,1500],min:200,max:50000,name:{he:'קולקטיב שבור — להמשך הכתיבה',en:'Broken Collective — keep the writing going'},
 blurb:{he:'תודה. הקריאה נשארת חינם, תמיד.',en:'Thank you. Reading stays free, always.'}}

export const isLang=(v:unknown):v is BookLang=>v==='he'||v==='en'
export const isRegion=(v:unknown):v is Region=>typeof v==='string'&&v in REGIONS
export const isShip=(v:unknown):v is Ship=>v==='standard'||v==='express'
/** a tip amount from the query: whole euros or cents-free decimals, clamped to the bounds; null when unreadable */
export function tipCents(v:unknown):number|null{
 const n=typeof v==='string'?Number(v.replace(',','.')):NaN
 if(!Number.isFinite(n)||n<=0)return null
 const c=Math.round(n*100)
 return c<TIP.min||c>TIP.max?null:c
}
export const BOOK_SITE='https://www.dubelteam.com/broken-collective'

/**
 * THE GOODS (owner, 17.11.2026: "a shirt and a cap through our supplier — and the book's products never in FAN LIFE's shop,
 * nor FAN LIFE's in the book's"). Made by Printify on demand and posted straight to the reader, ordered through the API into
 * the Printify store named "Broken Collective" (never FAN LIFE's pop-up store). No product is created in any store: each
 * order prints the book's own artwork (served from the book site) on the chosen garment.
 */
export type GoodsKind='tee'|'cap'
const ART=process.env.BOOK_MERCH_ART_URL||'https://www.dubelteam.com/broken-collective/merch/v1'
export const GOODS:Record<GoodsKind,{cents:number;name:{he:string;en:string};blurb:{he:string;en:string}
 /** found in Printify's catalogue by title (ids differ by region and change), first pattern wins */
 find:RegExp[];avoid?:RegExp;colour:RegExp;sizes:string[];art:Record<string,string>
 ship:Record<Region,number>}>={
 tee:{cents:3200,name:{he:'חולצת קולקטיב שבור',en:'Broken Collective T-shirt'},
  blurb:{he:'כותנה כבדה בצביעת בגד, צבע שנהב. מאחור: הסדק והחוט.',en:'Heavy garment-dyed cotton, ivory. On the back: the crack and the thread.'},
  find:[/^unisex garment-dyed t-shirt$/i,/garment-dyed t-shirt/i,/^unisex heavy cotton tee$/i],avoid:/kids|youth|long sleeve|women/i,
  colour:/^(ivory|natural|soft cream|white)$/i,sizes:['S','M','L','XL','2XL'],art:{front:`${ART}/tee-front.png`,back:`${ART}/tee-back.png`},
  ship:{il:900,eu:600,na:600,world:1100}},
 cap:{cents:2800,name:{he:'כובע קולקטיב שבור',en:'Broken Collective cap'},
  blurb:{he:'כובע אבא רקום. חוט אדום אחד, קשר אחד.',en:'Embroidered dad cap. One red thread, one knot.'},
  find:[/^classic dad cap$/i,/dad (hat|cap)/i,/^low profile baseball cap$/i],avoid:/leather|patch|trucker|kids|youth|bucket|beanie/i,
  colour:/^(stone|khaki|natural|black)$/i,sizes:['One size'],art:{front:`${ART}/cap-front.png`},
  ship:{il:900,eu:600,na:600,world:1100}},
}
export const isGoods=(v:unknown):v is GoodsKind=>v==='tee'||v==='cap'

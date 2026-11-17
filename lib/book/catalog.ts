/**
 * BROKEN COLLECTIVE · what the book sells (owner, 17.11.2026: "a Stripe tip through FAN LIFE's Stripe, and the physical
 * book through the Lulu Print API, Hebrew and English").
 *
 * The book site is static (dubelteam.com/broken-collective); its buttons are plain links to FAN LIFE's /api/book/* doors,
 * which open Stripe Checkout on the one Stripe account (Greek, euro). A paid paperback becomes a Lulu print job; Lulu prints
 * and ships it straight to the reader.
 *
 * Post priced from Lulu's live costs (17.11.2026, /api/book/quote, incl. tax): EU MAIL €16.68 · PRIORITY €23.36; US MAIL €14.35
 * · EXPEDITED €29.59; AU MAIL €17.06 · EXPRESS €23.11; Israel has no MAIL — EXPEDITED €46.20 is the cheapest, so Israel gets
 * one option at cost-plus. Each line keeps roughly €7–10 after Lulu and Stripe.
 * Prices are in euro cents. Shipping is priced per region (the buyer picks the region on the book page, Checkout then
 * accepts addresses only from that region), so the charge always covers Lulu's cost — /api/book/quote shows Lulu's live
 * cost per region next to these numbers; adjust here when it drifts.
 */
export type BookLang='he'|'en'
/** what goes in the parcel: one edition, or both in one parcel and one charge (owner, 18.11.2026) */
export type Edition=BookLang|'both'
export const editionsOf=(e:Edition):BookLang[]=>e==='both'?['he','en']:[e]
export const isEdition=(v:unknown):v is Edition=>v==='he'||v==='en'||v==='both'
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

export const PAPERBACK={cents:1800,pairCents:3200,name:{he:'קולקטיב שבור — הספר המודפס',en:'Broken Collective — the paperback'},
 pairName:{he:'קולקטיב שבור — שתי המהדורות, עברית ואנגלית',en:'Broken Collective — both editions, Hebrew and English'},
 blurb:{he:'מהדורה ראשונה בכריכה רכה · עונות 2020–2025 · מודפס לפי הזמנה ונשלח אליכם.',en:'First paperback edition · Seasons 2020–2025 · printed on demand and posted to you.'}}

const EU=['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','GB','CH','NO','IS']
/** Lulu level per choice; cents are what the reader pays for the post of one book, pair what a second book in the same parcel adds */
export const REGIONS:Record<Region,{label:{he:string;en:string};countries:string[];ship:Partial<Record<Ship,{cents:number;pair:number;level:'MAIL'|'PRIORITY_MAIL'|'GROUND'|'EXPEDITED'|'EXPRESS';days:[number,number]}>>;sample:{city:string;postcode:string;country_code:string;street1:string;state_code?:string}}>={
 il:{label:{he:'ישראל',en:'Israel'},countries:['IL'],sample:{street1:'1 Dizengoff St',city:'Tel Aviv',postcode:'6433201',country_code:'IL'},
  ship:{standard:{cents:3200,pair:600,level:'EXPEDITED',days:[6,12]}}},
 eu:{label:{he:'אירופה ובריטניה',en:'Europe & UK'},countries:EU,sample:{street1:'1 Ermou St',city:'Athens',postcode:'10563',country_code:'GR'},
  ship:{standard:{cents:700,pair:300,level:'MAIL',days:[7,14]},express:{cents:1400,pair:400,level:'PRIORITY_MAIL',days:[4,8]}}},
 na:{label:{he:'ארה״ב וקנדה',en:'USA & Canada'},countries:['US','CA'],sample:{street1:'1 Main St',city:'New York',state_code:'NY',postcode:'10001',country_code:'US'},
  ship:{standard:{cents:600,pair:300,level:'MAIL',days:[6,12]},express:{cents:1900,pair:500,level:'EXPEDITED',days:[3,6]}}},
 world:{label:{he:'שאר העולם',en:'Rest of the world'},countries:['AU','NZ','JP','SG','KR','HK','ZA','AE','TR','IN','TH'],sample:{street1:'1 George St',city:'Sydney',state_code:'NSW',postcode:'2000',country_code:'AU'},
  ship:{standard:{cents:900,pair:400,level:'MAIL',days:[12,28]},express:{cents:1600,pair:500,level:'EXPRESS',days:[5,9]}}},
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
 * nor FAN LIFE's in the book's"; then "move to a European supplier, high quality at a lower price"). Two real Printify
 * products in the API store "Broken Collective" (id 29791136, never FAN LIFE's stores), both made and posted inside the EU:
 *   tee — Stanley/Stella Creator 2.0 (organic, 180 g/m²), Natural Raw, OPT OnDemand · front + back DTG · USD 15.63–18.42
 *   cap — OTTO Cap distressed dad hat, embroidered by Printful (EU) · khaki or black · USD 18.28
 * Each order names the product and the variant; Printify prints and posts it straight to the reader.
 */
export type GoodsKind='tee'|'cap'
export const GOODS:Record<GoodsKind,{cents:number;product:string;name:{he:string;en:string};blurb:{he:string;en:string}
 colours:string[];sizes:string[];ship:Record<Region,number>}>={
 tee:{cents:2900,product:'6afc1aa78235d40d740c8687',name:{he:'חולצת קולקטיב שבור',en:'Broken Collective T-shirt'},
  blurb:{he:'כותנה אורגנית, Stanley/Stella, צבע נייר. מקדימה הקשר, מאחור הסדק.',en:'Organic cotton, Stanley/Stella, paper white. The knot on the chest, the crack on the back.'},
  colours:['Natural Raw'],sizes:['XS','S','M','L','XL','2XL','3XL'],ship:{il:1000,eu:500,na:900,world:1100}},
 cap:{cents:2900,product:'6afc1c5655472a51c00eeb8e',name:{he:'כובע קולקטיב שבור',en:'Broken Collective cap'},
  blurb:{he:'כובע אבא בגימור שחוק, רקום. חוט אדום אחד, קשר אחד.',en:'Distressed dad cap, embroidered. One red thread, one knot.'},
  colours:['Black','Khaki'],sizes:['One size'],ship:{il:1000,eu:500,na:900,world:1100}},
}
export const isGoods=(v:unknown):v is GoodsKind=>v==='tee'||v==='cap'

/** the charge for a parcel: books + post (pure — tests) */
export function parcelCents(e:Edition,region:Region,ship:Ship):{books:number;post:number}|null{
 const s=REGIONS[region].ship[ship];if(!s)return null
 return e==='both'?{books:PAPERBACK.pairCents,post:s.cents+s.pair}:{books:PAPERBACK.cents,post:s.cents}
}

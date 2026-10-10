import table from '@/content/generated/rumble-prices-v3.json'

/**
 * What a card costs — the club's own FROZEN price list (`content/generated/rumble-prices-v3.json`, rulebook rumble-economy-v1).
 * Per club: 10 men at €5M, 20 at €4M, 40 at €3M, 60 at €2M, everyone else €1M (a small archive gets the same ladder in proportion,
 * once, with at least one €5M). A price is a whole number of millions, belongs to a man AT a club, and is the same in five a side and in
 * the eleven. Nothing here computes a price: it is read. A man the list does not know yet costs €1M until `npm run rumble:prices -- migrate`.
 */
export type Price=1|2|3|4|5
export type PriceEntry={priceM:Price;priceTier:'ICON'|'STAR'|'LEADING'|'REGULAR'|'REST';locked:boolean;assignment:'owner-pinned'|'auto'|'new-member';rationale:string;reviewedAt:string;temporaryQuota?:boolean}
type Doc={schemaVersion:3;version:string;clubs:Record<string,{quotaMode:'full'|'proportional';size:number;quota:Record<string,number>;players:Record<string,PriceEntry>}>}
const doc=table as unknown as Doc
export const PRICE_VERSION=doc.version
export const priceTable=doc
export const priceFor=(club:string,playerId:string):Price=>doc.clubs[club]?.players[playerId]?.priceM??1
export const hasPrice=(club:string,playerId:string)=>!!doc.clubs[club]?.players[playerId]
export const TIERS:readonly {price:Price;tier:PriceEntry['priceTier'];target:number}[]=[{price:5,tier:'ICON',target:10},{price:4,tier:'STAR',target:20},{price:3,tier:'LEADING',target:40},{price:2,tier:'REGULAR',target:60}]

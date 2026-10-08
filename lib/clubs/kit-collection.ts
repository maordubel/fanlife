import type {ClubData} from './contract'
import {kitViews,type KitView} from './gate-content'
import {forbiddenColor} from './theme'
import {COLOUR_KEYS,colourHex,documentedCloth,variantOf,type ClothSpec,type ColourKey,type Variant} from './kit-model'
import type {StudioLimits} from './kit-studio'

/**
 * Gate 5 · The Kit Studio — what the collection may show (Wave kits, 8.10.2026).
 *
 * A shirt in the collection is a row of the club's own archive. The Worker's rule (audit §8) is that a shirt which has not
 * been ASSEMBLED in gate 4 shows its season and an outline and nothing else — a locked card that printed its sponsor would
 * be the answer sheet of that shirt's puzzle, one tap away. So the page sends the facts of a shirt only when it is
 * "open" without a build: when gate 4 cannot be played for this club (nothing to unlock with), or when the shirt cannot be
 * drawn and so could never be a gate-4 puzzle. Every other shirt travels as `{id, season, variant}` and its facts are fetched
 * by a server action that checks the build token gate 4 minted.
 *
 * Pure, server-side. Nothing here reads a browser API.
 */
export type OpenKit={id:string;season:string;variant:Variant;type:string;maker:string|null;design:string|null;sponsor:string|null;colours:string[];/** null when the archive names something we cannot paint faithfully */cloth:ClothSpec|null;sources:{title:string;url:string|null}[]}
export type CollectionRow={id:string;season:string;variant:Variant;/** facts travel only for an open shirt */open:OpenKit|null}

const year=(season:string)=>{const m=/(\d{4})/.exec(season);return m?Number(m[1]):0}
export const sortedKits=(data:ClubData):KitView[]=>kitViews(data).sort((a,b)=>year(a.season)-year(b.season)||a.id.localeCompare(b.id))
const paintable=(data:ClubData)=>(hex:string)=>forbiddenColor(data.theme,hex)

/** one kit as the collection card shows it, with the sources resolved to titles */
export function openKit(data:ClubData,k:KitView):OpenKit{
 const cloth=documentedCloth(k,paintable(data))
 return {id:k.id,season:k.season,variant:variantOf(k.type),type:k.type,maker:k.maker,design:k.design,sponsor:k.sponsor??null,colours:k.colours,cloth,sources:k.sources.map(id=>data.sources.find(s=>s.id===id)).filter((s):s is NonNullable<typeof s>=>!!s).slice(0,4).map(s=>({title:s.title,url:s.url}))}
}
/** a shirt gate 4 can deal: drawable under this club's colour policy */
export const isBuildable=(data:ClubData,k:KitView)=>documentedCloth(k,paintable(data))!==null
export const gate4Playable=(data:ClubData)=>!!data.gates['kit-builder']?.playable

export function collectionOf(data:ClubData):CollectionRow[]{
 const gate4=gate4Playable(data)
 return sortedKits(data).map(k=>{
  const open=!gate4||!isBuildable(data,k)
  return {id:k.id,season:k.season,variant:variantOf(k.type),open:open?openKit(data,k):null}
 })
}

/** the studio's palette and documented parts — the club's own, under its colour policy (rule 95) */
export function studioLimits(data:ClubData):StudioLimits{
 const forbidden=paintable(data),kits=kitViews(data)
 const uniq=(xs:(string|null|undefined)[])=>[...new Set(xs.map(x=>x?.trim()).filter((x):x is string=>!!x))].sort((a,b)=>a.localeCompare(b))
 return {colours:COLOUR_KEYS.filter(k=>!forbidden(colourHex(k))) as ColourKey[],makers:uniq(kits.map(k=>k.maker)),sponsors:uniq(kits.map(k=>k.sponsor))}
}

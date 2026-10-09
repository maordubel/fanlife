import type {KitView} from './gate-content'
import {SWATCH} from './rumble-kit'

/**
 * Gates 4 and 5 share one garment (Wave kits, 8.10.2026). The Worker drew an eight-layer shirt from `KitSpec`; a FAN LIFE
 * club documents less (colours, a design name, maker, sometimes a sponsor), so the generic garment is the part of that
 * contract every club can honestly fill — and nothing more. A layer the archive does not state (collar, sleeves, crest)
 * is drawn plain on a documented shirt and never invented (rule 11); only a supporter's own FAN DESIGN may choose them.
 *
 * Colours are the club-safe swatches of `rumble-kit` (rule 95): the very hex the colour policy judged is the hex painted.
 * This file is pure and client-safe — no theme import, no data access.
 */
export type ColourKey='red'|'white'|'cream'|'blue'|'navy'|'green'|'black'|'purple'|'grey'|'yellow'|'maroon'|'skyblue'|'pink'|'orange'
export const COLOUR_KEYS:readonly ColourKey[]=['red','white','cream','blue','navy','green','black','purple','grey','yellow','maroon','skyblue','pink','orange']
/** the data says "gray" in places; there is one grey */
export const colourKey=(raw:string):ColourKey|null=>{const k=raw.trim().toLowerCase().replace('gray','grey');return (COLOUR_KEYS as readonly string[]).includes(k)?k as ColourKey:null}
export const colourHex=(k:ColourKey)=>SWATCH[k]!

const channel=(n:number)=>{const c=n/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4}
export function luminanceOf(hex:string){const n=parseInt(hex.slice(1),16);return 0.2126*channel(n>>16&255)+0.7152*channel(n>>8&255)+0.0722*channel(n&255)}
/** the ink that reads on a cloth: ink on a light shirt, paper on a dark one */
export const lightCloth=(k:ColourKey|null)=>k===null||luminanceOf(colourHex(k))>0.42
/** a darker tone of a hex — the "tonal" ink of a hoop woven into the cloth */
export function darken(hex:string,by=0.22){const n=parseInt(hex.slice(1),16),f=(v:number)=>Math.max(0,Math.round(v*(1-by))).toString(16).padStart(2,'0');return `#${f(n>>16&255)}${f(n>>8&255)}${f(n&255)}`}

export type PatternId='solid'|'hoops'|'hoop-tonal'|'stripe-wide'|'twin-stripe'|'pinstripe'|'sash'|'diagonal'|'quarters'|'halves'|'chest-band'|'shoulder-panel'|'side-panel'|'checks'|'chevron'
export const PATTERNS:readonly PatternId[]=['solid','hoops','hoop-tonal','stripe-wide','twin-stripe','pinstripe','sash','diagonal','quarters','halves','chest-band','shoulder-panel','side-panel','checks','chevron']
const DESIGN:[RegExp,PatternId][]=[
 [/^(plain|solid)$/,'solid'],[/tonal\s*hoop/,'hoop-tonal'],[/hoop/,'hoops'],[/twin\s*stripe/,'twin-stripe'],[/pin\s*stripe/,'pinstripe'],[/stripe/,'stripe-wide'],
 [/sash/,'sash'],[/diagonal/,'diagonal'],[/quarter/,'quarters'],[/half|halves/,'halves'],[/chest\s*band/,'chest-band'],[/shoulder/,'shoulder-panel'],[/side\s*panel/,'side-panel'],[/check/,'checks'],[/chevron/,'chevron'],
]
/** A documented design name → a drawable pattern, or null when the name is one we cannot draw faithfully ("graphic"). */
export function patternOf(design:string|null|undefined):PatternId|null{
 const d=(design||'').trim().toLowerCase()
 if(!d)return null
 return DESIGN.find(([re])=>re.test(d))?.[1]??null
}

export type CollarId='round'|'v-neck'|'polo'
export const COLLARS:readonly CollarId[]=['round','v-neck','polo']
export type Ink='base'|'trim'
/** the garment, front and back. `base` null = undyed toile (nothing chosen yet). */
export type ClothSpec={base:ColourKey|null;trim:ColourKey|null;pattern:PatternId;collar:CollarId;collarInk:Ink;sleeveInk:Ink;maker:string|null;sponsor:string|null;crest:boolean;name:string|null;number:number|null}
export const BLANK:ClothSpec=Object.freeze({base:null,trim:null,pattern:'solid',collar:'round',collarInk:'base',sleeveInk:'base',maker:null,sponsor:null,crest:false,name:null,number:null})

/** 'special' is a kit a source files as neither home, away nor third (AEK's 1924 recreation, an unconfirmed other kit): it is shown as such, never relabelled Home */
export type Variant='home'|'away'|'third'|'special'
export const variantOf=(type:string|undefined):Variant=>{const t=(type||'home').toLowerCase();return t==='away'||t==='third'||t==='special'?t:'home'}

/** "red/cream" → red body, cream second colour. Any colour the archive names that cannot be painted safely makes the shirt undrawable. */
export function paintOf(colours:string[],forbidden:(hex:string)=>boolean):{base:ColourKey;trim:ColourKey|null}|null{
 if(colours.length<1||colours.length>2)return null
 const keys=colours.map(colourKey)
 if(keys.some(k=>k===null||forbidden(colourHex(k))))return null
 const base=keys[0]!,trim=keys[1]&&keys[1]!==base?keys[1]:null
 return {base,trim}
}
/** The shirt exactly as the archive documents it — nothing the archive does not say. Null when it cannot be drawn faithfully. */
export function documentedCloth(k:Pick<KitView,'colours'|'design'|'maker'|'sponsor'>,forbidden:(hex:string)=>boolean):ClothSpec|null{
 const paint=paintOf(k.colours,forbidden),pattern=patternOf(k.design)
 if(!paint||!pattern)return null
 return {...BLANK,...paint,pattern,maker:k.maker?.trim()||null,sponsor:k.sponsor?.trim()||null}
}
/** Latin wordmarks are set in capitals on a shirt; Hebrew has no case */
export const wordmark=(s:string)=>s.toUpperCase()
export const slugOf=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')

/** where the marks sit on the 340×320 board — fixed slots, so a missing part is a dashed frame in a known place */
export const SLOTS={sponsor:{x:98,y:148,w:124,h:40},crest:{x:186,y:80,w:38,h:42},maker:{x:98,y:86,w:60,h:22}} as const
export type SlotKey=keyof typeof SLOTS

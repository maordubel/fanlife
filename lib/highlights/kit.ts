import {SWATCH,kitFor,type RumbleKit,type RumbleWardrobe} from '@/lib/clubs/rumble-kit'
import type {Pattern,PixelKit,ReelPlayer} from './types'

/**
 * Dressing the pixel players (owner: "every match must dress the players in the right kits"). A man wears his club's
 * DOCUMENTED kit nearest his own years — the same `kitFor` rule the Royal Rumble's shirts already follow — so a 1960s legend
 * runs out in the 1960s shirt; a club with no documented kit wears its livery. Colours here are the paint the canvas uses;
 * they live in lib, never as a hex in a component.
 */
export const PALETTE={grassA:'#3E8E2F',grassB:'#358127',line:'#F4F4EC',shadow:'rgba(0,20,0,.32)',net:'#E8EEF0',post:'#FFFFFF',board:'#14213D',boardText:'#F4F4EC',skin:['#F1C7A1','#D9A27A','#B97A52','#8A5534','#5E3A22'],hair:['#2B1D12','#5A3A1E','#151515','#8A6A3A','#3A2A1A'],boot:'#141414',ball:'#FFFFFF',ballDark:'#202020',ref:'#151515',refTrim:'#F4F4EC',cardYellow:'#F2D11B',cardRed:'#D7261E',glove:'#F4F4EC',flagPole:'#5A3A1E',flagA:'#F2D11B',flagB:'#D7261E'} as const
export type Palette={-readonly [K in keyof typeof PALETTE]:(typeof PALETTE)[K] extends readonly string[]?string[]:string}
/**
 * The paint for one page. On the hub every colour is allowed; on a club page (rule 95) a colour of the club's rival never
 * appears — so a banned grass becomes the Royal Rumble's night felt (its pitch carries "no grass colour, so no rival green"),
 * and any other banned paint (a red card, the linesman's flag, a hair tone) falls to a grey of the same lightness.
 */
export function paletteFor(forbidden?:(hex:string)=>boolean):Palette{
 const out=JSON.parse(JSON.stringify(PALETTE)) as Palette
 if(!forbidden)return out
 const grey=(h:string)=>{if(!h.startsWith('#'))return h;const [r,g,b]=rgb(h),y=Math.round(.3*r+.59*g+.11*b),x=y.toString(16).padStart(2,'0');return `#${x}${x}${x}`}
 if(forbidden(out.grassA)||forbidden(out.grassB)){out.grassA='#1E2A47';out.grassB='#18223B'}
 for(const k of Object.keys(out) as (keyof Palette)[]){const v=out[k];if(Array.isArray(v))(out as Record<string,unknown>)[k]=v.map(h=>forbidden(h)?grey(h):h);else if(typeof v==='string'&&v.startsWith('#')&&forbidden(v))(out as Record<string,unknown>)[k]=k==='cardRed'||k==='cardYellow'||k==='flagA'?'#F4F4EC':grey(v)}
 return out
}
/** the keeper colours a page may show */
export const KEEPER_SHIRTS=():string[]=>[SWATCH.green!,SWATCH.black!,SWATCH.orange!,SWATCH.purple!,SWATCH.grey!,SWATCH.skyblue!,SWATCH.pink!]
const hex=(c:string|undefined|null)=>c&&Object.hasOwn(SWATCH,c)?SWATCH[c]!:null
export function patternOf(design:string|null|undefined):Pattern{
 const d=(design??'').toLowerCase()
 if(/stripe|pinstripe|vertical/.test(d))return 'stripes'
 if(/hoop|horizontal/.test(d))return 'hoops'
 if(/half|halves|quarter/.test(d))return 'halves'
 if(/sash|diagonal/.test(d))return 'sash'
 if(/band|chest|v-band|yoke/.test(d))return 'band'
 return 'plain'
}
/** a documented kit as paint: shirt, second colour, pattern, shorts and socks (a missing part follows the shirt's colours) */
export function pixelKit(k:RumbleKit):PixelKit{
 const c=k.colours.map(hex).filter((x):x is string=>!!x),shirt=c[0]??SWATCH.white!,second=c[1]??null
 return {shirt,second,pattern:second?patternOf(k.design):'plain',shorts:hex(k.shortsColour)??(c[2]??(second&&patternOf(k.design)==='plain'?second:SWATCH.white!)),socks:hex(k.socksColour)??shirt}
}
export function liveryKit(primary:string,away:boolean,on?:string):PixelKit{
 return away?{shirt:SWATCH.white!,second:primary,pattern:'band',shorts:primary,socks:SWATCH.white!}:{shirt:primary,second:null,pattern:'plain',shorts:on&&on!==primary?on:SWATCH.white!,socks:primary}
}
export function kitOfMan(man:{id:string;fromYear:number|null;toYear:number|null},side:'us'|'them',w:RumbleWardrobe,primary:string):PixelKit{
 const worn=kitFor(man,side,w)
 return worn.source==='archive'?pixelKit(worn.kit):liveryKit(primary,worn.variant==='away')
}
const rgb=(h:string)=>{const m=/^#?([0-9a-f]{6})$/i.exec(h);const n=m?parseInt(m[1]!,16):0;return [(n>>16)&255,(n>>8)&255,n&255] as const}
export const colourDistance=(a:string,b:string)=>{const x=rgb(a),y=rgb(b);return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2])}
/** a keeper wears what neither side wears */
export function keeperKit(own:PixelKit,other:PixelKit,salt=0,allowed:readonly string[]=KEEPER_SHIRTS()):PixelKit{
 const options=allowed.length?allowed:[SWATCH.black!]
 const scored=options.map((c,i)=>({c,d:Math.min(colourDistance(c,own.shirt),colourDistance(c,other.shirt),own.second?colourDistance(c,own.second):999,other.second?colourDistance(c,other.second):999),i}))
 const best=scored.sort((a,b)=>b.d-a.d||((a.i+salt)%7)-((b.i+salt)%7))[0]!.c
 return {shirt:best,second:null,pattern:'plain',shorts:best===SWATCH.black!?SWATCH.grey!:SWATCH.black!,socks:best}
}
/** when the away side's shirts are too close to the home side's, the away men change to their livery's light kit */
export const clash=(a:PixelKit,b:PixelKit)=>colourDistance(a.shirt,b.shirt)<90
/** squad numbers for the night, by line: the keeper wears 1, defenders 2–5, midfield 6–8 and 10, forwards 9 and 11 */
export function numberEleven<T extends {pos:ReelPlayer['pos']}>(xi:readonly T[]):(T&{no:number})[]{
 const free=[2,3,4,5,6,7,8,10,9,11,12,13,14,15,16,17,18],order=['GK','DF','MF','FW']
 let n=0
 return [...xi].map((p,i)=>({p,i})).sort((a,b)=>order.indexOf(a.p.pos)-order.indexOf(b.p.pos)||a.i-b.i).map(({p,i})=>({p,i,no:p.pos==='GK'&&n===0?(n++,1):free.shift()!})).sort((a,b)=>a.i-b.i).map(x=>({...x.p,no:x.no}))
}
/** a three-letter code for the scoreboard, like the arcade's HOL and BEL */
export function clubCode(name:string):string{
 const words=name.replace(/\b(F\.?C\.?|C\.?F\.?|A\.?C\.?|S\.?C\.?)\b/gi,' ').split(/[\s.\-]+/).filter(Boolean)
 if(!words.length)return name.slice(0,3).toUpperCase()
 if(/^[A-Z]{3,4}$/.test(words[0]!))return words[0]!.slice(0,3)
 if(words.length===1)return words[0]!.slice(0,3).toUpperCase()
 if(words.length===2)return (words[0]!.slice(0,2)+words[1]![0]).toUpperCase()
 return words.slice(0,3).map(w=>w[0]).join('').toUpperCase()
}

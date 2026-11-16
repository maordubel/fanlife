import type {KitView} from './gate-content'
import type {RumbleCard} from './rumble'
import type {KitParts} from './kit-parts'
/**
 * Who wears what in the club Royal Rumble (gate 9) — the port of the Worker's `RumbleShirt` rule
 * ("no player without a shirt") to every club:
 *   1. the club's DOCUMENTED kit nearest the man's years (home for your five, away/third for theirs);
 *   2. a club without documented kits wears its livery (`--club-primary`), never an empty box.
 * Colour rule 95: a kit colour the club page may not show (the rival's family, or one the magazine
 * cannot paint) is dropped before anything is drawn; a kit left with no colour is not worn.
 */
export type RumbleKit={id:string;season:string;design:string|null;colours:string[];svg?:string;type?:string;parts?:KitParts;/** shorts and socks when the record names them (the match highlights paint them) */shortsColour?:string|null;socksColour?:string|null;shorts?:KitView['shorts'];socks?:KitView['socks']}
export type RumbleWardrobe={home:RumbleKit[];away:RumbleKit[];keepers?:RumbleKit[];awayKeepers?:RumbleKit[];awayNeutral?:true;/** a photograph of the man's own shirt of his period (Hapoel Tel Aviv, from the kit archive), by card id — worn by the side that is his club's */photos?:Record<string,{src:string;label:string}>;/** the club's classic drawn shirt per side — its most worn design among the measured drawings — for a man whose years no kit reaches; it claims no season (16.11.2026) */classic?:{home?:string;away?:string}}
/** `approx`: a documented kit of a nearby season, not one of his own years — the screen must say so. `neutral`: no documented kit near his years (or no years at all), so the shirt claims no season. */
export type Worn={source:'archive';kit:RumbleKit;approx?:true}|{source:'livery';variant:'home'|'away';neutral?:true}
/** seasons outside a man's recorded years a documented kit may still stand in (audit F10, 22.10.2026) */
export const APPROX_SEASONS=3

/** The colours KitPlate can paint (its token map), each with a representative swatch so the club's own colour policy can judge it.
 * yellow, maroon, skyblue, pink and orange joined on 9.10.2026 for AEK Athens, whose own colour is yellow; brown the same day for FC St. Pauli (the same grant: the club's own colours, judged per club by `forbiddenColor`). The owner said "מותר צהוב"
 * ("yellow is allowed") while the AEK kit archive was being built. Whether a club may SHOW a colour is still decided per club by
 * `forbiddenColor` (Hapoel Tel Aviv's legacy yellow rule keeps dropping it); rule 8 and the brand scan of app/ and components/ are untouched,
 * because no yellow hex is written in either — it lives here, in lib. */
export const SWATCH:Readonly<Record<string,string>>={red:'#C8102E',white:'#FFFFFF',cream:'#EFE6D4',blue:'#1F4E9E',navy:'#1B2A5E',green:'#1F6B3B',black:'#141210',purple:'#4B2A7A',grey:'#8A8A8A',gray:'#8A8A8A',yellow:'#F3C613',maroon:'#6B1E2E',skyblue:'#7FB6E6',pink:'#F0668E',orange:'#E8731A',brown:'#5A3A22'}

/** keep only paintable colours the club page is allowed to show */
export function allowedColours(colours:string[],forbidden:(hex:string)=>boolean):string[]{
 return colours.filter(c=>Object.hasOwn(SWATCH,c)&&!forbidden(SWATCH[c]!))
}
export const seasonYear=(season:string)=>{const m=/(\d{4})/.exec(season);return m?Number(m[1]):null}

export function rumbleWardrobe(kits:KitView[],forbidden:(hex:string)=>boolean,visual?:(k:KitView)=>{svg?:string;parts:KitParts}):RumbleWardrobe{
 const part=(p:KitView['shorts'])=>p&&allowedColours([p.colour],forbidden).length
  ?{...p,trim:p.trim&&allowedColours([p.trim],forbidden).length?p.trim:null}:null
 const dress=(k:KitView):RumbleKit|null=>{
  const colours=allowedColours(k.colours,forbidden),shorts=part(k.shorts),socks=part(k.socks)
  const art=visual?.(k)
  const known=[...k.colours,...[k.shorts,k.socks].flatMap(p=>p?[p.colour,...(p.trim?[p.trim]:[])]:[])]
  const svg=allowedColours(known,forbidden).length===known.length?art?.svg:undefined
  if((!colours.length&&!svg)||seasonYear(k.season)===null)return null
  return {id:k.id,season:k.season,type:k.type,design:k.design,colours,...(svg?{svg}:{}),...(art?{parts:art.parts}:{}),
   ...(shorts?{shorts,shortsColour:shorts.colour}:{}),...(socks?{socks,socksColour:socks.colour}:{})}
 }
 const by=(types:string[])=>kits.filter(k=>types.includes((k.type||'home').trim().toLowerCase())).map(dress).filter((k):k is RumbleKit=>!!k).sort((a,b)=>seasonYear(a.season)!-seasonYear(b.season)!||a.id.localeCompare(b.id))
 const keepers=by(['gk','keeper','goalkeeper'])
 const home=by(['home']),away=by(['away','third']),classic={home:classicOf(home),away:classicOf(away)}
 return {home,away,...(keepers.length?{keepers}:{}),...(classic.home||classic.away?{classic}:{})}
}

/** The design the club wore most among its drawn kits; at a tie the earliest — the look a supporter calls "our shirt". */
export function classicOf(kits:readonly RumbleKit[]):string|undefined{
 const drawn=kits.filter(k=>k.svg)
 if(!drawn.length)return undefined
 const count=new Map<string,number>()
 for(const k of drawn){const d=(k.design||'plain').toLowerCase();count.set(d,(count.get(d)??0)+1)}
 let top=drawn[0]!
 for(const k of drawn){const a=count.get((k.design||'plain').toLowerCase())!,b=count.get((top.design||'plain').toLowerCase())!;if(a>b)top=k}
 return top.svg
}

/** the middle of his documented years, or whichever end is known */
export const eraOf=(c:Pick<RumbleCard,'fromYear'|'toYear'>)=>c.fromYear!==null&&c.toYear!==null?Math.round((c.fromYear+c.toYear)/2):c.fromYear??c.toYear

export type KitContext={playedOn?:string|null;keeper?:boolean;kitId?:string}
export function kitFor(card:Pick<RumbleCard,'fromYear'|'toYear'>,side:'us'|'them',w:RumbleWardrobe,context:KitContext={}):Worn{
 const list=side==='us'?w.home:w.away,variant=side==='us'?'home' as const:'away' as const
 const keepers=side==='us'?w.keepers:w.awayKeepers??w.keepers
 if(context.kitId){
  const exact=[...list,...(keepers??[])].find(k=>k.id===context.kitId)
  if(exact)return {source:'archive',kit:exact}
 }
 if(context.keeper&&keepers?.length){
  const worn=kitFor(card,side,{home:keepers,away:keepers},{playedOn:context.playedOn})
  if(worn.source==='archive'&&!worn.approx)return worn
 }
 if(!list.length)return {source:'livery',variant}
 const date=/^(\d{4})-(0[1-9]|1[0-2])-\d{2}$/.exec(context.playedOn??'')
 const year=date?Number(date[1]):null
 const from=card.fromYear??card.toYear??year,to=card.toYear??card.fromYear??year
 // no recorded years: a shirt must not claim a season it cannot know — the neutral livery stands in
 if(from===null||to===null)return {source:'livery',variant,neutral:true}
 const mid=(from+to)/2
 const target=(k:RumbleKit)=>date?Number(date[1])-((Number(date[2])<8&&/\d{4}\s*[-/–]\s*\d{2,4}/.test(k.season))?1:0):mid
 const gap=(k:RumbleKit)=>{const y=seasonYear(k.season)!;if(date)return Math.abs(y-target(k));return y<from?from-y:y>to?y-to:0}
 let best=list[0]!
 // at an equal distance the kit with a measured drawing wins over one we can only paint (owner, 16.11.2026)
 const near=(k:RumbleKit)=>Math.abs(seasonYear(k.season)!-target(k)),drawn=(k:RumbleKit)=>k.svg?1:0
 for(const k of list){const d=gap(k),bd=gap(best);if(d<bd||(d===bd&&(drawn(k)>drawn(best)||(drawn(k)===drawn(best)&&near(k)<near(best)))))best=k}
 const g=gap(best)
 if(g===0)return {source:'archive',kit:best}
 if(g<=APPROX_SEASONS)return {source:'archive',kit:best,approx:true}
 return {source:'livery',variant,neutral:true}
}

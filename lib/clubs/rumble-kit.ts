import type {KitView} from './gate-content'
import type {RumbleCard} from './rumble'
/**
 * Who wears what in the club Royal Rumble (gate 9) — the port of the Worker's `RumbleShirt` rule
 * ("no player without a shirt") to every club:
 *   1. the club's DOCUMENTED kit nearest the man's years (home for your five, away/third for theirs);
 *   2. a club without documented kits wears its livery (`--club-primary`), never an empty box.
 * Colour rule 95: a kit colour the club page may not show (the rival's family, or one the magazine
 * cannot paint) is dropped before anything is drawn; a kit left with no colour is not worn.
 */
export type RumbleKit={id:string;season:string;design:string|null;colours:string[]}
export type RumbleWardrobe={home:RumbleKit[];away:RumbleKit[]}
export type Worn={source:'archive';kit:RumbleKit}|{source:'livery';variant:'home'|'away'}

/** The colours KitPlate can paint (its token map), each with a representative swatch so the club's own colour policy can judge it.
 * yellow, maroon, skyblue, pink and orange joined on 9.10.2026 for AEK Athens, whose own colour is yellow. The owner said "מותר צהוב"
 * ("yellow is allowed") while the AEK kit archive was being built. Whether a club may SHOW a colour is still decided per club by
 * `forbiddenColor` (Hapoel Tel Aviv's legacy yellow rule keeps dropping it); rule 8 and the brand scan of app/ and components/ are untouched,
 * because no yellow hex is written in either — it lives here, in lib. */
export const SWATCH:Readonly<Record<string,string>>={red:'#C8102E',white:'#FFFFFF',cream:'#EFE6D4',blue:'#1F4E9E',navy:'#1B2A5E',green:'#1F6B3B',black:'#141210',purple:'#4B2A7A',grey:'#8A8A8A',gray:'#8A8A8A',yellow:'#F3C613',maroon:'#6B1E2E',skyblue:'#7FB6E6',pink:'#F0668E',orange:'#E8731A'}

/** keep only paintable colours the club page is allowed to show */
export function allowedColours(colours:string[],forbidden:(hex:string)=>boolean):string[]{
 return colours.filter(c=>Object.hasOwn(SWATCH,c)&&!forbidden(SWATCH[c]!))
}
export const seasonYear=(season:string)=>{const m=/(\d{4})/.exec(season);return m?Number(m[1]):null}

export function rumbleWardrobe(kits:KitView[],forbidden:(hex:string)=>boolean):RumbleWardrobe{
 const dress=(k:KitView):RumbleKit|null=>{const colours=allowedColours(k.colours,forbidden);return colours.length&&seasonYear(k.season)!==null?{id:k.id,season:k.season,design:k.design,colours}:null}
 const by=(types:string[])=>kits.filter(k=>types.includes((k.type||'home').toLowerCase())).map(dress).filter((k):k is RumbleKit=>!!k).sort((a,b)=>seasonYear(a.season)!-seasonYear(b.season)!||a.id.localeCompare(b.id))
 return {home:by(['home']),away:by(['away','third'])}
}

/** the middle of his documented years, or whichever end is known */
export const eraOf=(c:Pick<RumbleCard,'fromYear'|'toYear'>)=>c.fromYear!==null&&c.toYear!==null?Math.round((c.fromYear+c.toYear)/2):c.fromYear??c.toYear

export function kitFor(card:Pick<RumbleCard,'fromYear'|'toYear'>,side:'us'|'them',w:RumbleWardrobe):Worn{
 const list=side==='us'?w.home:w.away
 if(!list.length)return {source:'livery',variant:side==='us'?'home':'away'}
 const year=eraOf(card)
 if(year===null)return {source:'archive',kit:list[list.length-1]!}
 let best=list[0]!
 for(const k of list){const d=Math.abs(seasonYear(k.season)!-year),bd=Math.abs(seasonYear(best.season)!-year);if(d<bd||(d===bd&&seasonYear(k.season)!>seasonYear(best.season)!))best=k}
 return {source:'archive',kit:best}
}

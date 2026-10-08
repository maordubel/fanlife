import {REGISTRY,PORTAL_HOST_ROOT,type RegistryClub} from '@/lib/master/registry'
import {clubTheme,contrast,forbiddenColor,hasIdentityManifest,rivalForbiddenColors,type ClubTheme} from '@/lib/clubs/theme'

/**
 * SHARE THEME (V3, 8.10.2026) — one palette per share, derived from the club's own identity and its approved colour
 * policy (`lib/clubs/theme.ts` — no second rivalry registry). The whole composition wears it: headings, numbers, slabs,
 * stamps, rules. Readable type is darkened until it reads 4.5:1 on the paper; a light identity (AEK, Dortmund) keeps
 * its colour on slabs and prints its type in ink. Client-safe.
 */
export const SHARE_PAPER='#fff8e8',SHARE_INK='#141210'
export const SHARE_THEME_VERSION='3'
export type InkMode='club'|'mono'
export type SharePalette={slabA:string;slabB:string;slabHead:string;ink:string;paper:string;primary:string;onPrimary:string;navy:string;petrol:string;red:string;green:string;muted:string;line:string;pattern:ClubTheme['pattern']}
export type ShareClub={id:string;sub:string;name:string;theme:ClubTheme;accent:string}

export function shareClub(id:string):ShareClub|null{
 const reg=REGISTRY.find(c=>c.id===id);if(!reg)return null
 const theme=clubTheme(reg)
 // a club without a manifest has no approved accent: its own primary is the accent (never the neutral fallback)
 return {id:reg.id,sub:reg.sub,name:reg.name,theme,accent:hasIdentityManifest(reg.id)?theme.accent:reg.primary}
}
export const shareClubs=()=>REGISTRY.map(c=>shareClub(c.id)!)
/** the club's own host — never the neutral portal for a club game (resolver: host is authority) */
export const clubOrigin=(c:Pick<RegistryClub,'sub'>)=>`https://${c.sub}.${PORTAL_HOST_ROOT}`
export const PORTAL_ORIGIN=`https://${PORTAL_HOST_ROOT}`

const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))
/** darken until the colour reads as small type on the paper (4.5:1) */
export function readable(hex:string){let v=rgb(hex),out=hex;while(contrast(out,SHARE_PAPER)<4.5){v=v.map(x=>Math.max(0,Math.floor(x*.94)));out='#'+v.map(x=>x.toString(16).padStart(2,'0')).join('')}return out}
export const forbidden=(c:ShareClub,hex:string)=>forbiddenColor(c.theme,hex)

export function sharePalette(c:ShareClub,mode:InkMode='club'):SharePalette{
 const base=mode==='mono'?SHARE_INK:c.theme.primary,primary=forbidden(c,base)?SHARE_INK:base
 const light=contrast(primary,SHARE_PAPER)<3
 const type=readable(forbidden(c,c.accent)||mode==='mono'||light?SHARE_INK:c.accent)
 const deep=light?SHARE_INK:readable(primary)
 // slabs: the torn ink blocks behind pictures and under the invitation. A light identity (AEK, Dortmund) prints them in
 // its own colour with ink lettering; a dark one prints them in its deepened colour with paper lettering.
 const slabA=light?primary:deep,slabB=light?SHARE_INK:deep,slabHead=light?SHARE_INK:type
 return {slabA,slabB,slabHead,ink:SHARE_INK,paper:SHARE_PAPER,primary,onPrimary:contrast(primary,SHARE_PAPER)>=4.5?SHARE_PAPER:SHARE_INK,navy:type,petrol:deep,red:type,green:deep,muted:'#5c5444',line:'#c9bfa4',pattern:c.theme.pattern}
}
/** paper or ink — whichever reads on this colour */
export const onColour=(hex:string)=>contrast(hex,SHARE_PAPER)>=contrast(hex,SHARE_INK)?SHARE_PAPER:SHARE_INK
/** every fill/stroke colour in a rendered card that the club's policy forbids */
export function auditColours(svg:string,c:ShareClub){return [...new Set([...svg.matchAll(/(?:fill|stroke)="(#[a-f0-9]{6})"/gi)].map(m=>m[1]!))].filter(x=>forbidden(c,x))}
export function policyNote(c:ShareClub){const bans=rivalForbiddenColors(c.theme.identityColors,c.theme.colorPolicy);return bans.length?`approved rival colours excluded: ${bans.join(', ')}`:c.theme.colorPolicy.legacyRules.length?'legacy colour rules kept':'own colours + neutral ink'}

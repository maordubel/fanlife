import clubsHe from '@/content/manual/names-en/clubs-he.json'
import clubsEl from '@/content/manual/names-en/clubs-el.json'
import comps from '@/content/manual/names-en/competitions.json'
import sponsors from '@/content/manual/names-en/sponsors.json'

/**
 * Every name a FAN LIFE question prints is English (owner, 12.10.2026). A source written in Hebrew or Greek is rendered
 * through a reviewed dictionary (`content/manual/names-en/*`); a name the dictionary does not hold is NOT guessed — the
 * question that needs it is simply not made. A name already in Latin script passes as written.
 */
const NONLATIN=/[Ͱ-Ͽἀ-῿Ѐ-ӿ֐-׿]/
export const isLatin=(s:string)=>!NONLATIN.test(s)
const key=(s:string)=>s.normalize('NFC').replace(/[״"]/g,'').replace(/[׳’]/g,"'").replace(/\s+/g,' ').trim()
const table=(names:Record<string,string>)=>new Map(Object.entries(names).map(([k,v])=>[key(k),v]))
const CLUBS=new Map([...table(clubsHe.names as Record<string,string>),...table(clubsEl.names as Record<string,string>)])
const COMPS=table(comps.names as Record<string,string>),COMP_LATIN=new Map(Object.entries((comps as {latin?:Record<string,string>}).latin??{})),SPONSORS=table(sponsors.names as Record<string,string>)
const via=(map:Map<string,string>)=>(s:string|null|undefined):string|null=>{
 if(!s)return null
 const t=s.replace(/\s*\([^)]*\)\s*$/,'').trim()
 if(!t)return null
 if(isLatin(t))return t
 return map.get(key(t))??null
}
export const enClub=via(CLUBS)
const viaComp=via(COMPS)
export const enCompetition=(s:string|null|undefined)=>{const t=s?.trim();return t&&COMP_LATIN.has(t)?COMP_LATIN.get(t)!:viaComp(s)}
export const enSponsor=via(SPONSORS)
export const enText=(s:string|null|undefined)=>s&&isLatin(s)&&s.trim()?s.trim():null
/** a maker or sponsor as a brand prints it: "umbro" → "Umbro", "SUBARU" → "Subaru"; short capitals stay (BRT, AEK); a dash or "none" is no sponsor */
export function brand(s:string|null|undefined):string|null{
 const t=s?.trim();if(!t||/^[-–—?]+$|^(none|no sponsor|unbranded|no brand|in-house|no maker|n\/a|unknown)$/i.test(t))return null
 const fix=(w:string)=>w.length<=4&&w===w.toUpperCase()?w:w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()
 return t===t.toLowerCase()||(t===t.toUpperCase()&&t.replace(/[^A-Z]/g,'').length>4)?t.split(/(\s+|-)/).map(w=>/^\s+$|^-$/.test(w)?w:fix(w)).join(''):t
}

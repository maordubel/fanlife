import table from '@/content/generated/player-names-en.json'
import verified from '@/content/manual/player-names-en-overrides.json'
/** English display names, with verified editor corrections taking precedence even before a generated table rebuild. */
export type NameHow='owner-curated'|'editor-override'|'archive-latin'|'alias-latin'|'transliterated'
const doc=table as unknown as Record<string,Record<string,{name:string;how:NameHow}>>
const corrections=verified as Record<string,Record<string,string>>
export const englishName=(club:string,id:string,fallback:string)=>{
 const byName=corrections[club]
 // The manual corrections are keyed by archival Hebrew names; a generated name may have been built before the latest correction.
 // Accept only an EXACT archival name; don't use the Latin generated display name as a Hebrew lookup key.
 if(byName&&Object.prototype.hasOwnProperty.call(byName,fallback))return byName[fallback]!
 const n=doc[club]?.[id]?.name??fallback,m=/^([^,\d]+),\s*([^,\d]+)$/.exec(n.trim())
 // a register's index form ("Forrest, James") is printed the way the man is known
 return m?`${m[2]!.trim()} ${m[1]!.trim()}`:n
}
export const nameHow=(club:string,id:string,fallback?:string):NameHow|null=>{
 if(fallback&&Object.prototype.hasOwnProperty.call(corrections[club]??{},fallback))return 'editor-override'
 return doc[club]?.[id]?.how??null
}
export const isMan=(name:string)=>/\p{L}/u.test(name)

const NONLATIN=/[\u0370-\u03ff\u1f00-\u1fff\u0400-\u04ff\u0590-\u05ff]/
/** A man as an English page prints him: his reviewed English name, answering also to the name the archive wrote (search, guesses). */
export function englishPlayer<P extends {id:string;name:string;aliases:string[]}>(club:string,p:P):P{
 const en=englishName(club,p.id,p.name)
 if(NONLATIN.test(en)||en===p.name)return p
 return {...p,name:en,aliases:[...p.aliases,p.name]}
}

import table from '@/content/generated/player-names-en.json'
/** The English display name of a man at a club (content/generated/player-names-en.json, made by `npm run rumble:names`). Display only — ids and archive names never change. */
export type NameHow='owner-curated'|'editor-override'|'archive-latin'|'alias-latin'|'transliterated'
const doc=table as unknown as Record<string,Record<string,{name:string;how:NameHow}>>
export const englishName=(club:string,id:string,fallback:string)=>doc[club]?.[id]?.name??fallback
export const nameHow=(club:string,id:string)=>doc[club]?.[id]?.how??null
/** a record whose name holds no letter ('[….]', a scrape leftover) is not a man */
export const isMan=(name:string)=>/\p{L}/u.test(name)

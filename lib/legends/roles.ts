import doc from '@/content/manual/player-roles.json'

/**
 * EXACT POSITIONS (owner, 17.11.2026: "an exact position for every player"). The archive records four families — GK · DF ·
 * MF · FW — and the engine plays them; under each family a man now has his ROLE where a public source states it: Wikidata's
 * "position played" (P413) on the man who played for this club (P54), sharpened by the position line of his English Wikipedia
 * infobox. A role is kept only when it agrees with the family the archive gives him (the census in docs/legends-manager-fm-research.md
 * it). A man with no stated role shows his family, never a guess.
 */
export type Role='GK'|'CB'|'FB'|'DM'|'CM'|'AM'|'W'|'ST'
export const ROLE_NAME:Record<Role,string>={GK:'Goalkeeper',CB:'Centre-back',FB:'Full-back',DM:'Defensive midfielder',CM:'Central midfielder',AM:'Attacking midfielder',W:'Winger',ST:'Striker'}
export const ROLE_FAMILY:Record<Role,'GK'|'DF'|'MF'|'FW'>={GK:'GK',CB:'DF',FB:'DF',DM:'MF',CM:'MF',AM:'MF',W:'FW',ST:'FW'}
type Doc={roles:Record<string,Record<string,Role>>}
const flat=new Map<string,Role>()
for(const club of Object.values((doc as unknown as Doc).roles))for(const [id,r] of Object.entries(club))flat.set(id,r)
export const roleOf=(id:string):Role|undefined=>flat.get(id)
/**
 * How well a man fits a slot's fine place (FM's natural / accomplished / unconvincing, in three words): his own role → natural;
 * a neighbouring role → accomplished; the rest of his family → competent. A winger may play on either flank or wide in midfield.
 */
const NATURAL:Record<Role,readonly string[]>={GK:['GK'],CB:['CB'],FB:['LB','RB','LWB','RWB'],DM:['DM'],CM:['CM'],AM:['CM'],W:['LW','RW','LM','RM'],ST:['ST']}
const NEAR:Record<Role,readonly string[]>={GK:[],CB:['DM','LB','RB'],FB:['CB','LM','RM'],DM:['CM','CB'],CM:['DM','LM','RM'],AM:['LW','RW','ST','LM','RM'],W:['ST','LWB','RWB'],ST:['LW','RW']}
export type Familiarity='natural'|'accomplished'|'competent'
export function familiarity(role:Role|undefined,fine:string):Familiarity|null{
 if(!role)return null
 return NATURAL[role].includes(fine)?'natural':NEAR[role].includes(fine)?'accomplished':'competent'
}

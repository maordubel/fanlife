/**
 * LIFE's own picture order for Google Flow (owner, 23.11.2026; rule life-flow-art, docs/fanlife/70 §LIFE). Pure names
 * and shapes, shared by the generator (scripts/life/flow/life-library.ts), the Flow operator's door
 * (lib/stories/flowOperator.ts) and the game's reader (lib/life/flowArt.ts). A LIFE piece is NOT a piece of the films'
 * art library: other stems (no `-kr`, never recoloured), another folder, another spec file.
 */
export const LIFE_STEM=/^life-[a-z0-9-]{2,70}-fl\d$/
export const LIFE_DIR='library/life'
export const lifePath=(stem:string)=>`${LIFE_DIR}/${stem}.png`

export const LIFE_USES=['facade','stadium','skyline','aerial','story','cast'] as const
export type LifeUse=typeof LIFE_USES[number]
/** The towns the order is drawn for. `eur` is the generic European set any club may fall back on. */
export const LIFE_TOWNS=['ath','tlv','mos','eur','gla','ham','bgo','cas','cai','hfa','ptk','ist','beg'] as const
export type LifeTown=typeof LIFE_TOWNS[number]
/** Which town's streets a club lives in (Piraeus rides with Athens, Jaffa with Tel Aviv). */
export const CLUB_TOWN:Readonly<Record<string,LifeTown>>={
 'hapoel-tel-aviv':'tlv','olympiacos':'ath','panathinaikos':'ath','aek-athens':'ath','zrinjski-mostar':'mos',
 'celtic':'gla','st-pauli':'ham','atalanta':'bgo','raja-casablanca':'cas','wydad-casablanca':'cas','al-ahly':'cai',
 'maccabi-haifa':'hfa','hapoel-petah-tikva':'ptk',
 // 24.11.2026: Istanbul's Asian shore and Belgrade, authored when the two clubs' opening was completed
 'fenerbahce':'ist','partizan-belgrade':'beg',
}
/** The key people of a life (owner, 28.11.2026: "compose the key characters perfectly with Flow: clothing, style, face, body").
 *  One invented face each, per part of the world, so the people of an Athens street and of a Glasgow street look like
 *  people of those streets. Nobody here is a real person, and nobody wears a club's colour. */
/** the last three are the street's own types (owner, 28.11.2026: "somebody more of a hooligan, somebody more of a swot"): the hard lad of the terrace, the boy with the album, the one who makes everybody laugh */
export const LIFE_CAST=['boy','teen','man','father','mother','mate','kiosk','neighbour','grandfather','ultra','swot','joker'] as const
export type LifeCast=typeof LIFE_CAST[number]
export const LIFE_PEOPLE=['med','north','maghreb'] as const
export type LifePeople=typeof LIFE_PEOPLE[number]
export const TOWN_PEOPLE:Readonly<Record<LifeTown,LifePeople>>={ath:'med',tlv:'med',mos:'med',hfa:'med',ptk:'med',bgo:'med',ist:'med',beg:'med',eur:'north',gla:'north',ham:'north',cas:'maghreb',cai:'maghreb'}
/** the stem of a person's portrait: life-cast-<people>-<who>-fl1 */
export const castStem=(people:LifePeople,who:LifeCast,v=1)=>`life-cast-${people}-${who}-fl${v}`
export type LifePiece={stem:string;aspect:'1:1'|'16:9';prompt:string;use:LifeUse;priority:number;town?:LifeTown;club?:string;chapter?:string;confidence?:'specific'|'generic';people?:LifePeople;who?:LifeCast}
export type LifeLibrary={version:number;style:string;negatives:string;pieces:LifePiece[]}

export type LifeStem={stem:string;use:LifeUse;town?:LifeTown;club?:string;key?:string;people?:LifePeople}
const isTown=(s:string):s is LifeTown=>(LIFE_TOWNS as readonly string[]).includes(s)
/** What a stored stem is, read from its name alone (lib/ never reads scripts/):
 *  life-facade-<town>-<nn>-fl1 · life-stadium-<club-id>-<a|b>-fl1 · life-skyline-<town>-fl1 · life-aerial-<town>-fl1 · life-story-<chapter>-fl1 · life-cast-<people>-<who>-fl1 */
export function parseLifeStem(stem:string):LifeStem|null{
 if(!LIFE_STEM.test(stem))return null
 const body=stem.replace(/^life-/,'').replace(/-fl\d$/,''),[use='',...rest]=body.split('-')
 if(use==='facade'){const [town='',key]=rest;return rest.length===2&&isTown(town)&&key?{stem,use,town,key}:null}
 if(use==='skyline'||use==='aerial'){const [town='']=rest;return rest.length===1&&isTown(town)?{stem,use,town}:null}
 if(use==='stadium'){
  const key=rest.pop(),club=rest.join('-'),town=CLUB_TOWN[club]
  return key&&town?{stem,use,club,town,key}:null
 }
 if(use==='story')return rest.length?{stem,use,key:rest.join('-')}:null
 if(use==='cast'){const [people='',who='']=rest;return rest.length===2&&(LIFE_PEOPLE as readonly string[]).includes(people)&&(LIFE_CAST as readonly string[]).includes(who)?{stem,use,key:who,people:people as LifePeople}:null}
 return null
}

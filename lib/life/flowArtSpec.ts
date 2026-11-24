/**
 * LIFE's own picture order for Google Flow (owner, 23.11.2026; rule life-flow-art, docs/fanlife/70 §LIFE). Pure names
 * and shapes, shared by the generator (scripts/life/flow/life-library.ts), the Flow operator's door
 * (lib/stories/flowOperator.ts) and the game's reader (lib/life/flowArt.ts). A LIFE piece is NOT a piece of the films'
 * art library: other stems (no `-kr`, never recoloured), another folder, another spec file.
 */
export const LIFE_STEM=/^life-[a-z0-9-]{2,70}-fl\d$/
export const LIFE_DIR='library/life'
export const lifePath=(stem:string)=>`${LIFE_DIR}/${stem}.png`

export const LIFE_USES=['facade','stadium','skyline','aerial','story'] as const
export type LifeUse=typeof LIFE_USES[number]
/** The towns the order is drawn for. `eur` is the generic European set any club may fall back on. */
export const LIFE_TOWNS=['ath','tlv','mos','eur','gla','ham','bgo','cas','cai','hfa','ptk','ist','beg'] as const
export type LifeTown=typeof LIFE_TOWNS[number]
/** Which town's streets a club lives in (Piraeus rides with Athens, Jaffa with Tel Aviv). */
export const CLUB_TOWN:Readonly<Record<string,LifeTown>>={
 'hapoel-tel-aviv':'tlv','olympiacos':'ath','panathinaikos':'ath','aek-athens':'ath','zrinjski-mostar':'mos',
 'celtic':'gla','st-pauli':'ham','atalanta':'bgo','raja-casablanca':'cas','wydad-casablanca':'cas','al-ahly':'cai',
 'maccabi-haifa':'hfa','hapoel-petah-tikva':'ptk','fenerbahce':'ist','partizan-belgrade':'beg',
}
export type LifePiece={stem:string;aspect:'1:1'|'16:9';prompt:string;use:LifeUse;priority:number;town?:LifeTown;club?:string;chapter?:string;confidence?:'specific'|'generic'}
export type LifeLibrary={version:number;style:string;negatives:string;pieces:LifePiece[]}

export type LifeStem={stem:string;use:LifeUse;town?:LifeTown;club?:string;key?:string}
const isTown=(s:string):s is LifeTown=>(LIFE_TOWNS as readonly string[]).includes(s)
/** What a stored stem is, read from its name alone (lib/ never reads scripts/):
 *  life-facade-<town>-<nn>-fl1 · life-stadium-<club-id>-<a|b>-fl1 · life-skyline-<town>-fl1 · life-aerial-<town>-fl1 · life-story-<chapter>-fl1 */
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
 return null
}

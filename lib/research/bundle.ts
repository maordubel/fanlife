import {existsSync,readFileSync} from 'node:fs'
import path from 'node:path'
import type {Bundle} from './planner'
import type {ClubProfile} from './contract'
/** Staging folder file names (research-staging/<club>/, written by research:stage) for each bundle array. */
const FILES:Record<keyof Bundle,string>={players:'archive-players',matches:'matches',lineups:'lineups',goals:'goal-claims',sources:'sources',timeline:'timeline',honours:'honours',conflicts:'conflicts',quarantined:'quarantined'}
export function loadBundle(clubId:string,root=process.cwd()):Bundle|null{
 const dir=path.join(root,'research-staging',clubId);if(!existsSync(path.join(dir,'manifest.json')))return null
 return Object.fromEntries(Object.entries(FILES).map(([k,n])=>{const p=path.join(dir,`${n}.json`);const v=existsSync(p)?JSON.parse(readFileSync(p,'utf8')):[];return [k,Array.isArray(v)?v:[]]})) as Bundle
}
export function loadProfile(clubId:string,root=process.cwd()):ClubProfile|null{
 const p=path.join(root,'research-profiles',`${clubId}.json`);if(!existsSync(p))return null
 const v=JSON.parse(readFileSync(p,'utf8')) as ClubProfile;if(v.clubId!==clubId)throw new Error('PROFILE_CLUB_MISMATCH');return v
}

import path from 'node:path'
import {cpSync,existsSync} from 'node:fs'
import {dataRoot,onServerless} from '@/lib/dataRoot'
/**
 * Where research lives. One answer for the collector, the store, the staging export and the package adapter:
 *  - RESEARCH_DATA_DIR, when set
 *  - else <FAN_LIFE_DATA_DIR>/… (tests and local evaluation that keep everything in one private dir)
 *  - else the repository's own `research-data/` — what the GitHub "Archive collect" workflow writes and commits,
 *    and what a read-only deployment reads.
 */
const g=globalThis as typeof globalThis&{researchSeeded?:string}
/** On a serverless deployment the repository is read-only: research works on a /tmp copy of `research-data/`,
 * seeded once per instance. It lasts as long as the instance; the committed record is still the GitHub workflow's. */
function serverlessCopy(){const to=path.join(dataRoot(),'research-data');if(g.researchSeeded!==to){const from=path.resolve('research-data');if(!existsSync(to)&&existsSync(from))cpSync(from,to,{recursive:true});g.researchSeeded=to}return to}
const base=()=>process.env.RESEARCH_DATA_DIR?path.resolve(process.env.RESEARCH_DATA_DIR):process.env.FAN_LIFE_DATA_DIR?path.resolve(process.env.FAN_LIFE_DATA_DIR):onServerless()?serverlessCopy():path.resolve('research-data')
export const researchRoot=()=>path.join(base(),'research')
export const collectorStagingRoot=()=>path.join(base(),'research-staging')
/** A write refused by a read-only server (a serverless deployment) is not a failed source; say where collection runs. */
export const READ_ONLY_HINT='This server cannot store research files (read-only). Collection runs on GitHub: Actions → "Archive collect" → Run workflow. Results appear here after the next deploy.'
export const isReadOnlyError=(e:unknown)=>['EROFS','EACCES','EPERM'].includes((e as NodeJS.ErrnoException)?.code||'')

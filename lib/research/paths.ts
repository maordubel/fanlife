import path from 'node:path'
/**
 * Where research lives. One answer for the collector, the store, the staging export and the package adapter:
 *  - RESEARCH_DATA_DIR, when set
 *  - else <FAN_LIFE_DATA_DIR>/… (tests and local evaluation that keep everything in one private dir)
 *  - else the repository's own `research-data/` — what the GitHub "Archive collect" workflow writes and commits,
 *    and what a read-only deployment reads.
 */
const base=()=>process.env.RESEARCH_DATA_DIR?path.resolve(process.env.RESEARCH_DATA_DIR):process.env.FAN_LIFE_DATA_DIR?path.resolve(process.env.FAN_LIFE_DATA_DIR):path.resolve('research-data')
export const researchRoot=()=>path.join(base(),'research')
export const collectorStagingRoot=()=>path.join(base(),'research-staging')
/** A write refused by a read-only server (a serverless deployment) is not a failed source; say where collection runs. */
export const READ_ONLY_HINT='This server cannot store research files (read-only). Collection runs on GitHub: Actions → "Archive collect" → Run workflow. Results appear here after the next deploy.'
export const isReadOnlyError=(e:unknown)=>['EROFS','EACCES','EPERM'].includes((e as NodeJS.ErrnoException)?.code||'')

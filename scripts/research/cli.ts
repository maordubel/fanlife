/**
 * Research engine CLI (no AI). The admin's Data tab calls the same service; this exists so a scheduled job or a
 * maintainer can run it too.
 *   npx tsx scripts/research/cli.ts plan <club>        offline: profile + staged bundle → jobs and a run record
 *   npx tsx scripts/research/cli.ts run <club> [max]   fetch due jobs politely, keep snapshots, parse where tested
 *   npx tsx scripts/research/cli.ts status [club]
 *   npx tsx scripts/research/cli.ts collect <club> [--source <providerId>] [--max-requests N]   archive pass (resumes) + staging export
 *   npx tsx scripts/research/cli.ts export <club>       re-export the collector's staging package only
 */
import {planClub,readRuns,collectClub} from '../../lib/research/service'
import {loadClubProfile} from '../../lib/research/profiles'
import {exportArchiveStaging} from '../../lib/research/staging'
import {runWorker} from '../../lib/research/worker'
import {loadProfile} from '../../lib/research/bundle'
const [cmd,club,max]=process.argv.slice(2),flag=(k:string)=>{const i=process.argv.indexOf('--'+k);return i<0?undefined:process.argv[i+1]}
async function main(){
 if(cmd==='plan'&&club){const r=await planClub(club);console.log(JSON.stringify(r.ok?{run:r.run,stats:r.report.stats,issueKinds:r.issueKinds}:r,null,2));return}
 if(cmd==='run'&&club){const p=loadProfile(club);if(!p)throw new Error('No research profile for '+club);console.log(JSON.stringify(await runWorker(p,{max:Number(max)||20}),null,2));return}
 if(cmd==='collect'&&club){const r=await collectClub(club,{providerId:flag('source'),maxRequests:Number(flag('max-requests'))||10});console.log(JSON.stringify({run:{...r.run,diagnostics:r.run.diagnostics.slice(0,20)},staging:r.staging},null,2));return}
 if(cmd==='export'&&club){const p=await loadClubProfile(club);if(!p)throw new Error('No research profile for '+club);console.log(JSON.stringify(await exportArchiveStaging(club,p.archive),null,2));return}
 if(cmd==='status'){console.log(JSON.stringify(await readRuns(club),null,2));return}
 console.error('Usage: plan <club> | run <club> [max] | status [club] | collect <club> [--source id] [--max-requests N] | export <club>');process.exitCode=2
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exitCode=1})

/**
 * Research engine CLI (no AI). The admin's Data tab calls the same service; this exists so a scheduled job or a
 * maintainer can run it too.
 *   npx tsx scripts/research/cli.ts plan <club>        offline: profile + staged bundle → jobs and a run record
 *   npx tsx scripts/research/cli.ts run <club> [max]   fetch due jobs politely, keep snapshots, parse where tested
 *   npx tsx scripts/research/cli.ts status [club]
 */
import {planClub,readRuns} from '../../lib/research/service'
import {runWorker} from '../../lib/research/worker'
import {loadProfile} from '../../lib/research/bundle'
const [cmd,club,max]=process.argv.slice(2)
async function main(){
 if(cmd==='plan'&&club){const r=await planClub(club);console.log(JSON.stringify(r.ok?{run:r.run,stats:r.report.stats,issueKinds:r.issueKinds}:r,null,2));return}
 if(cmd==='run'&&club){const p=loadProfile(club);if(!p)throw new Error('No research profile for '+club);console.log(JSON.stringify(await runWorker(p,{max:Number(max)||20}),null,2));return}
 if(cmd==='status'){console.log(JSON.stringify(await readRuns(club),null,2));return}
 console.error('Usage: plan <club> | run <club> [max] | status [club]');process.exitCode=2
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exitCode=1})

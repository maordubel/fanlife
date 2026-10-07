/**
 * What runs on a clock, read-only (Editor's Desk plan §8: show the real schedules before offering to edit them).
 * The workflow files are the truth; `tests/master/schedules.test.ts` fails when this list and `.github/workflows`
 * disagree, so the desk cannot describe a schedule that no longer exists.
 */
export type Schedule={workflow:string;name:string;cron:string;utc:string;what:string;needs:string|null}
export const SCHEDULES:readonly Schedule[]=[
 {workflow:'archive-collect.yml',name:'Archive collect',cron:'23 3 * * 2',utc:'Tuesdays 03:23 UTC',what:'A small, polite batch from every archive source; commits research-data/ only. Never approves.',needs:'Variable FAN_LIFE_RESEARCH_URL + secret FAN_LIFE_CRON_SECRET to pin sources saved in this control room.'},
 {workflow:'club-ingest.yml',name:'club-ingest',cron:'17 4 * * 1',utc:'Mondays 04:17 UTC',what:'Fixture and club feeds for the hub.',needs:'Secret THESPORTSDB_KEY.'},
 {workflow:'research.yml',name:'Requested club research',cron:'*/15 * * * *',utc:'Every 15 minutes',what:'Calls this site’s autopilot: collect → stage → bring in unreviewed → process queued jobs.',needs:'Variable FAN_LIFE_RESEARCH_URL + secret FAN_LIFE_CRON_SECRET; the same value as CRON_SECRET on Vercel. Skipped while unset.'},
]
export const githubActions=(workflow:string)=>`https://github.com/maordubel/fanlife/actions/workflows/${workflow}`

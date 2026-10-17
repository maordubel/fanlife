/**
 * What runs on a clock, read-only (Editor's Desk plan §8: show the real schedules before offering to edit them).
 * The workflow files are the truth; `tests/master/schedules.test.ts` fails when this list and `.github/workflows`
 * disagree, so the desk cannot describe a schedule that no longer exists.
 */
export type Schedule={workflow:string;name:string;cron:string;utc:string;what:string;needs:string|null}
export const SCHEDULES:readonly Schedule[]=[
 {workflow:'backup.yml',name:'Backup',cron:'41 2 * * *',utc:'Daily 02:41 UTC',what:'Every worker_ table and the control room\'s files, encrypted with your passphrase, kept 90 days as a download on the run.',needs:'Secret FAN_LIFE_BACKUP_PASSPHRASE (20+ characters, keep a copy) + the same variable and secret as research.'},
 {workflow:'archive-collect.yml',name:'Archive collect',cron:'23 3 * * 2,5',utc:'Tuesdays and Fridays 03:23 UTC',what:'A small, polite batch from every archive source; commits research-data/ only. Never approves.',needs:'Variable FAN_LIFE_RESEARCH_URL + secret FAN_LIFE_CRON_SECRET to pin sources saved in this control room.'},
 {workflow:'club-ingest.yml',name:'club-ingest',cron:'17 4 * * 1',utc:'Mondays 04:17 UTC',what:'UEFA match records (date, score, scorers, elevens) for every club with club-packs/<id>/ingest.json, merged into wave-auto.json and offered as a pull request.',needs:'Secret THESPORTSDB_KEY (second publisher) + Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests" — without it the run fails at the pull request (12.10.2026).'},
 {workflow:'research.yml',name:'Requested club research',cron:'*/15 * * * *',utc:'Every 15 minutes',what:'Calls this site’s autopilot: collect → stage → bring in unreviewed → process queued jobs.',needs:'Variable FAN_LIFE_RESEARCH_URL + secret FAN_LIFE_CRON_SECRET; the same value as CRON_SECRET on Vercel. Skipped while unset.'},
 {workflow:'final-whistle.yml',name:'Final Whistle (morning)',cron:'3,18,33,48 3,4 * * *',utc:'03:00–04:59 UTC, every 15 minutes',what:'Extra runs right after 06:00 Athens so yesterday\'s results arrive in the morning even when GitHub delays the all-day schedule.',needs:'Same as Final Whistle'},
 {workflow:'final-whistle.yml',name:'Final Whistle',cron:'7,22,37,52 * * * *',utc:'Every 15 minutes',what:'Looks for finished matches of all your clubs; only when a confirmed result is waiting (and, in morning mode, after 06:00 Athens the next day) does it draw the story card and send it to your Telegram. Off until you switch it on (Operations → Final Whistle).',needs:'Variable FAN_LIFE_RESEARCH_URL + secrets FAN_LIFE_CRON_SECRET and TELEGRAM_BOT_TOKEN'},
]
export const githubActions=(workflow:string)=>`https://github.com/maordubel/fanlife/actions/workflows/${workflow}`

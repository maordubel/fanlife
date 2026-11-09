# 70 · The Flow operator — automatic, no studio login (9.11.2026)

Owner, 9.11.2026: *"find another way — easy, convenient and automatic, so I can work without you stepping in."*
The manual Flow pack (copy prompts, download clips, drag them into slots) is gone from the owner's path. Google Flow
has no API, so a scheduled Claude task drives Flow in the **built-in browser on the owner's computer**, once an hour
while the Claude desktop app is open. It never needs the studio password: everything reaches the studio through GitHub.

```
studio job waits for Flow ─┐
CLASSIFIED panel prompts ──┤
                           │
Claude, hourly (scheduled task, owner's computer)
  1 mints a 2-hour ticket in the database (Supabase connector; only its sha256 is stored, stories/flow-ticket.json)
  2 in the Google Flow tab (built-in browser, owner's Google sign-in):
      POST /api/master/stories/flow {ticket, op:'queue'}       → what to make, with prompts
      makes each file in Flow
      POST {ticket, op:'urls', id|file, names} → signed upload url → PUT the file straight to the private bucket
      POST {ticket, op:'done', id, files}       → recorded; a full set queues the edit
worker edits → the film arrives on Telegram
```

* The files never leave the owner's browser except into the private bucket: no GitHub, no public page, no download.
* The door (`app/api/master/stories/flow/route.ts`) answers the origin `https://labs.google` only, with a valid ticket
  only (sha256 + expiry ≤ 3 h, `lib/stories/flowOperator.ts → ticketOk`). No studio login, no cron secret.
* Shorts and marketing films: slots `clip-N.mp4`, `still-N.jpg` (`lib/stories/jobs.ts` FLOW_NAME).
* CLASSIFIED: every manifest panel with no `drive_id` and a `prompt` (written by the writers' room) → stored at
  `classified/<file>/<id>.png` in the private bucket; `studio/kinds.flow_panels` fetches them (worker op
  `classified_urls`) before the Drive fetch. Panels never enter the repository.

## The operator's procedure (what the scheduled task does)

1. Mint the ticket (Supabase connector, project `afxpjfxwpdjvlmuoawda`):
   ```sql
   with t as (select replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','') v)
   insert into worker_fanlife_files(name,body,etag,updated_at)
   select 'stories/flow-ticket.json', json_build_object('hash',encode(sha256(convert_to(v,'utf8')),'hex'),'expires',now()+interval '2 hours')::text, gen_random_uuid()::text, now() from t
   on conflict (name) do update set body=excluded.body, etag=excluded.etag, updated_at=now()
   returning (select v from t) as ticket;
   ```
   The ticket lives only in this run; it is never written to a file, a commit, a message or a log.
2. Built-in browser → `https://labs.google/fx/tools/flow`. Not signed in to Google → stop with one line to the owner.
3. In that tab (javascript): `fetch('https://fanlife.dubelteam.com/api/master/stories/flow',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket,op:'queue'})})`.
   `{"jobs":[],"classified":[]}` → stop quietly.
4. One job per run, oldest first (or up to 20 CLASSIFIED panels). In a Flow project named after it:
   * characters (a Short): Image, 9:16, Nano Banana, each `characters[].prompt`;
   * each missing `clip-N.mp4`: Video · Ingredients, 9:16, the step's model, 720p, its seconds, ×1, its character
     sheets as ingredients, its prompt; each `still-N.jpg`: Image, 9:16;
   * CLASSIFIED panels: Image, 16:9, the panel prompt (it carries the house style).
5. Each result, in the tab: `fetch(src)` → blob (check type video/mp4 or image/*, size > 50 KB) → `op:'urls'` →
   `PUT` the blob to the url (`x-upsert: true`) → after a job's files, `op:'done'` with the names that went up.
6. Flow out of credits, a refusal, or anything unexpected → stop; the rest waits for the next hour. One short line
   to the owner only when something needs him. A finished Short reaches his Telegram by itself.

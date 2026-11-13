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
* The door (`app/api/master/stories/flow/route.ts`) answers the origins `https://flow.google.com` and `https://labs.google` only, with a valid ticket
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
2. Built-in browser → `https://flow.google.com`. Not signed in to Google → stop with one line to the owner.
3. In that tab (javascript): `fetch('https://fanlife.dubelteam.com/api/master/stories/flow',{method:'POST',
   headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket,op:'queue',manifest})})` — `manifest` is
   `scripts/football-stories/comic/classified_manifest.json` from main (raw.githubusercontent.com).
   `{"jobs":[],"classified":[]}` → stop quietly.
   Send also `library`: the `pieces` of `scripts/football-stories/studio/cinema/flow_library.json` from main — the
   answer then lists the art-library pieces not drawn yet.
4. One job per run, oldest first (or up to 20 CLASSIFIED panels); when neither waits, up to 12 art-library pieces
   (Image, the piece's aspect, its prompt) — uploaded with `op:'urls', lib:true, names:[stem]`, no `done` needed. In a Flow project named after it:
   * characters (a Short): Image, 9:16, Nano Banana, each `characters[].prompt`;
   * each missing `clip-N.mp4`: Video · Ingredients, 9:16, the step's model, 720p, its seconds, ×1, its character
     sheets as ingredients, its prompt; each `still-N.jpg`: Image, 9:16;
   * CLASSIFIED panels: Image, 16:9, the panel prompt (it carries the house style).
5. Each result, in the tab: `fetch(src)` → blob (check type video/mp4 or image/*, size > 50 KB) → `op:'urls'` →
   `PUT` the blob to the url (`x-upsert: true`) → after a job's files, `op:'done'` with the names that went up.
   Images: the tile's `flow-content.google/image/…` src fetches fine. **Videos (13.11.2026):** the `<video>` src
   (`/asb/…`) redirects to googlevideo.com with no CORS, so `fetch` fails. Instead, in the tab, wrap
   `URL.createObjectURL` to keep each Blob and make `HTMLAnchorElement.prototype.click` a no-op, then press the
   tile's download button: Flow builds the mp4 Blob in the page (the file name ends in the media id, which tells
   the clips apart) and nothing reaches the computer's disk. Upload that Blob.
   Type one prompt and submit it before typing the next; two prompts typed back to back merge into one image.
6. Flow out of credits, a refusal, or anything unexpected → stop; the rest waits for the next hour. One short line
   to the owner only when something needs him. A finished Short reaches his Telegram by itself.

## The art library (9.11.2026)
`studio/cinema/flow_library.py` writes 167 pieces the VOX cinema picks by meaning (`cinema/animate.wants`): new
variants of every terrace person and object, players (shot, header, celebration, despair), the keeper's dive, the
grounds of every decade (1950s–2020s, inside and out), and each club's own city. Ink + cream + one signal red: the
red becomes each club's colour at render time, so one drawing serves every club. Stored at `library/flow/<stem>.png`;
the worker adds them to the cinema library (`library.list_flow`, worker op `library_flow`) next to the owner's
drawings.

## Studio operator (9.11.2026)
The same two-hour ticket also opens `POST /api/master/stories/operator`, called from a tab of the site itself (same
origin only). Ops: `jobs` (one line per job), `job` (the job + signed links; `master:true` adds the master's chunks),
`create` (kind + brief + key — the desk's own create functions and archive checks) and `act` (approve or choose a script,
the editorial steps, pause/resume/retry/cancel, record an upload). It cannot delete a job, add pictures or fill Flow
slots, and every change is logged as "Studio operator". This is how Claude produces and publishes a showcase without the
owner signing in. A production session mints its own ticket in `stories/operator-ticket.json` (same SQL, that
file name), so the hourly Flow run and the session never overwrite each other's ticket; the Flow door reads only
`stories/flow-ticket.json`.

## YouTube operator (13.11.2026)
Owner, 12.11.2026: the autopilot's last step is "upload through the browser on my computer, like the Flow operator".
The scheduled task **Studio · YouTube operator** runs hourly from noon to midnight Athens and does nothing unless a
film is due (`lib/stories/autopilot.ts → operatorDue`: approved by the two-hour window, switch on, QA passed, not
uploaded, not cancelled, window ended less than 24 hours ago).

1. Cheap look first, no browser (Supabase connector): the autopilot switch `studio/autopilot.json` and any job whose
   `autopilot.state` is `handoff`. Nothing → stop quietly.
2. Mint the session ticket in `stories/operator-ticket.json` (the SQL above with that file name).
3. Built-in browser, a tab on `https://fanlife.dubelteam.com/` (any public page): `POST /api/master/stories/operator
   {ticket, op:'publish'}` → `{on, due:[{id,title,description,tags,altered,master:{bytes,sha256,chunks:[{url,bytes}]},
   thumbnail,captions}]}`. Empty → stop quietly. Oldest first, one film per run.
4. Claim it: `{ticket, op:'act', id, action:{action:'upload_started'}}`. A 409 means another run holds it → stop.
5. Tab on `https://studio.youtube.com/channel/UC2KULoLBFCSZC4jeRGYkKfQ` (no `authuser`; the channel name must read
   "FanLife: Football Stories"). Not signed in, a "Verify it's you", or any other channel → record `upload_uncertain`
   with the reason and stop. Create → Upload videos; in the page, fetch the chunks in order into one `File`
   (`video/mp4`, size must equal `master.bytes`) and set it on the dialog's file input (`DataTransfer`), as doc 54
   §Publishing from the session describes. Title, description, tags, "not made for kids", altered-content as `altered`
   says, thumbnail and captions the same way. Visibility **Public**; the final Publish is a real click.
6. Read the video id from the dialog's link, wait until Studio shows the upload complete, then report what Studio
   shows: `{action:'upload_done', videoId, visibility:'public'|'private'|…}`. Public closes the ride as `published`,
   the owner gets the link on Telegram, and the master's chunks leave the bucket. Anything that did not finish:
   `{action:'upload_uncertain', note}` — the owner is told once and nothing is tried again by itself.
7. The signed links live only in that run: never in a file, a commit, a message or a log. Never a password, a sign-in,
   a settings change, or any channel but this one.

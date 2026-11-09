# 70 · The Flow operator — automatic, no studio login (9.11.2026)

Owner, 9.11.2026: *"find another way — easy, convenient and automatic, so I can work without you stepping in."*
The manual Flow pack (copy prompts, download clips, drag them into slots) is gone from the owner's path. Google Flow
has no API, so a scheduled Claude task drives Flow in the **built-in browser on the owner's computer**, once an hour
while the Claude desktop app is open. It never needs the studio password: everything reaches the studio through GitHub.

```
studio job waits for Flow ─┐
CLASSIFIED panel prompts ──┤  stories-flow-intake.yml  mode=queue  → the list (JSON in the run log)
                           │
Claude, hourly ── Google Flow (owner's Google sign-in, built-in browser) ── makes each file
                │
                └ downloads the result (flow-content.google) into its own cloud workspace
                  gh release upload flow-inbox job--<id>--clip-0.mp4 | panel--file04--f04-p01.png
                  gh workflow run stories-flow-intake.yml -f mode=intake
                           │
stories-flow-intake.yml  mode=intake (also hourly at :41) — worker cron secret, no login
   checks each file (mp4 with frames / decodable picture) → private bucket → records it →
   a full set queues the edit → the worker edits → the film arrives on Telegram
```

* Shorts and marketing films: slots `clip-N.mp4`, `still-N.jpg` (`lib/stories/jobs.ts` FLOW_NAME).
* CLASSIFIED: every manifest panel with no `drive_id` and a `prompt` (written by the writers' room) → stored at
  `classified/<file>/<id>.png` in the private bucket; `studio/kinds.flow_panels` fetches them before the Drive fetch.
  Panels never enter the repository.
* Worker ops: `flow_queue`, `flow_urls`, `flow_done`, `classified_urls` (`lib/stories/flowOperator.ts`).

## The operator's procedure (what the scheduled task does)

Security: a Flow media URL is a credential — it goes only from the browser tab to `curl` in the cloud workspace, is
never written to a file, a commit, a secret, a variable or a log. The owner's GitHub token is never given to a web page.
The studio password is never typed. Assets in `flow-inbox` are public for minutes; they are art for films that are
about to be published.

1. `gh workflow run stories-flow-intake.yml -R maordubel/fanlife -f mode=queue`, wait for it, read the JSON between
   `FLOW-QUEUE-BEGIN` and `FLOW-QUEUE-END` in `gh run view <id> --log`. `{"jobs":[],"classified":[]}` → stop.
2. Built-in browser → `https://labs.google/fx/tools/flow`. Not signed in → stop (the owner signs in to Google once;
   say so in one line). Open (or create) the project named after the job title / `CLASSIFIED <file>`.
3. **Characters first** (a Short): each `characters[]` step → Image, 9:16, Nano Banana, its prompt. Keep the best.
4. **Clips**: each missing `clip-N.mp4` → Video · Ingredients, 9:16, the model in the step (Veo/Omni Flash), 720p,
   the step's seconds, ×1, its character sheets as ingredients, its prompt. **Stills** `still-N.jpg` → Image, 9:16.
   **CLASSIFIED panels** → Image, 16:9, the panel prompt (it already carries the house style).
5. For each result: read the media `src` in the Flow tab, `curl` it into the workspace under its slot name
   (`job--<job id>--clip-0.mp4`, `panel--file04--f04-p01.png`), check it opens, then
   `gh release upload flow-inbox <files> -R maordubel/fanlife --clobber`
   (first time: `gh release create flow-inbox -R maordubel/fanlife --prerelease --title "Flow inbox" --notes "Studio mailbox"`).
6. `gh workflow run stories-flow-intake.yml -R maordubel/fanlife -f mode=intake`.
7. Budget per run: at most one Short (≈6 clips) or 20 panels. Flow out of credits → stop; the rest waits for the next hour.
8. Nothing to report when it went well (the film reaches Telegram). On a failure, one short line to the owner.

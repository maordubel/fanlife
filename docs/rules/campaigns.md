# Campaigns (24.11.2026)

The owner asked for a campaign area: reports, new campaigns from simple templates, running them, by topic, fully automatic.

- A campaign is a set of `marketing.posts` rows carrying `main.campaign = {id, topic, name}`. One library builds them:
  `lib/marketing/campaigns.ts` (templates, club cards, captions). The 30-day plan (`scripts/marketing/plan-m30.mts`) and the
  control room's **Campaigns** area use the same templates, so the desk previews exactly what runs.
- Every link to the site carries `utm_source=social&utm_campaign=<campaign id>`; `worker_marketing_campaigns()` counts the
  visits, views and clicks each campaign brought from `worker_insight_hit`. A link without it is invisible to the report.
- Pictures are v4 templates (`L-CLUB`, `L-SALE`, `L-RUMBLE`, `L-KITS`, `L-YT`, `L-ALBUM`, the market's open call), drawn
  ahead by `marketing-pictures.yml`. A film post can name a playlist; the picture run picks a full film from its public feed.
- A club that is not open yet is never linked: an opening campaign's teasers point at `/clubs`, and opening night plus the
  week after wait as `skipped` with `main.hold = open:<club>`. The picture run releases them the first run the club's page
  answers 200 (`worker_marketing_open_release`): opening night at the next 19:47 Athens, the rest keep their spacing.
- A club whose colour is black (Partizan) gets white as its accent, never the default red (its rival's colour).
- Pause, resume and stop change only posts still ahead. Nothing already sent is touched; old plans are skipped, not deleted.
- 24.11.2026, second wave: the **FAN LIFE wall** (`L-HUB`, no single club), **LIFE · coming soon** (`L-GTA`, links to
  `/coming-soon/life` while LIFE is closed) and **Reels** (`kit.to` = `reel`, `kit.reel` = an MP4 of the `social-reels`
  release; `meta-publish.mjs` posts it as a Facebook Page reel and an Instagram reel instead of the feed picture). Reels are
  cut from the Fairy Tales episodes by `scripts/marketing/reels/build.mjs` (workflow `marketing-reels.yml`).
- **Fresh pictures:** a picture records the asset stamp it was drawn from (`kit.v4.ver = 4.0+<stamp of public/album,
  public/club-kits, public/crests, public/brand, scripts/marketing/kit>`) and when (`kit.v4.at`). The hourly picture run
  redraws every pending picture whose stamp differs from main, and every post due within 6 h drawn more than 8 h ago.

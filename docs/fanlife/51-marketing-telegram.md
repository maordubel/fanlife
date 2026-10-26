# DUBEL TEAM — the 30-day social plan on Telegram (25.10.2026)

One page (Instagram · TikTok · Facebook) markets the whole universe: FAN LIFE, THE WORKER, DUBID,
OFFSIDES and FUCK YOU. Every two hours, 08:00–22:00 Israel time, the owner gets a ready post on
Telegram: the hook, the caption, the link to the right app, the hashtags and a visual brief.

## v2 — 26.10.2026 (owner): marketing is a fixed plan; matches and results are not marketing
- **FAN LIFE is the lead voice.** The page is FAN LIFE; DUBID, OFFSIDES, THE WORKER and FUCK YOU are promoted on a
  fixed weekday rotation at 12:00 (Sun THE WORKER · Mon DUBID · Tue OFFSIDES · Wed THE WORKER · Thu DUBID · Fri FUCK YOU ·
  Sat OFFSIDES) and as every third carousel/reel/night post. A partner post says "on the FAN LIFE page".
- **Matches and results moved out.** No slot resolves a fixture any more (every row is `kind='fixed'`). Matchday is
  Today's Football (05:00, Operations → Today's Football) and results are Final Whistle.
- **Four slots a day come from the archive**, through the FAN LIFE trivia forge (English, approved, exact dates —
  rule 109), across all eight clubs: 08:00 *On this day* (one match per club on today's date, up to five clubs; if
  fewer than two, *This week in history* with the real dates) · 16:00 *Nerds only* (an Expert question, four answers,
  the answer for the first comment) · 18:00 *Story quiz* (an IG quiz sticker: four answers, which to mark, frame 2) ·
  20:00 *Spicy* (derby wins, routs, finals, goal-fests, shirt-sponsor trivia). Decoys for an opponent question come
  from the same club's opponents in the same competition and era. European competitions print under the name of
  their year (European Cup before 1992, UEFA Cup before 2009).
- **Built, not typed:** `node --require ./scripts/master/server-only.cjs --import tsx scripts/marketing/build-plan.mts`
  writes `supabase/marketing/0006_marketing_plan_v2.sql` and `scripts/marketing/plan-v2.json` (the review copy,
  checked by `tests/marketing/plan.test.ts`). 0006 updates by `send_at` and only rows still waiting.
- **The database is the clock.** GitHub's scheduled runs fired 4× on 25.10 and 0× on the morning of 26.10. pg_cron
  `marketing:tick` (every 5 minutes, only when something is due) mints a one-time nonce and POSTs it to
  `/api/marketing/tick`; the site trades it for the due posts (`worker_marketing_tick`, service role) and sends them with
  its own `TELEGRAM_BOT_TOKEN`. No secret is stored in the database. The GitHub workflow stays as a backup.

## Where it lives
- **Database:** schema `marketing` on Football Master (hub-owned, server only).
  `marketing.posts` = 245 rows (day 0 = 25.10 afternoon, days 1–30 = 26.10 → 24.11, 8 slots a day).
  `marketing.settings` = `meta` (links, names, hashtags, clubs, Israeli derby pairs), `content`
  (the copy pools) and `telegram` (the owner's chat id — the same chat FAN LIFE's bot already
  delivers Final Whistle to; not committed, the repo is public).
- **SQL:** `supabase/marketing/0001..0004`. 0002 is generated: edit `scripts/marketing/content.py`,
  run `python3 scripts/marketing/gen.py`, apply 0002, then rebuild unsent rows if needed.
- **Delivery:** GitHub Actions `marketing-telegram.yml` (every 5 minutes, 05–21 UTC) uses the bot token that already
  lives in Actions (`TELEGRAM_BOT_TOKEN`, the Final Whistle bot). It asks `POST /api/master/marketing` (CRON_SECRET) to
  claim the due posts — `public.worker_marketing_claim()`, each post claimed once — sends them, and reports Telegram's
  answer (`worker_marketing_report`: sent · refused → retried up to 3 times · unknown → never resent). Nobody copies
  the token anywhere. A second, dormant path exists: pg_cron `marketing:telegram` → `marketing.dispatch()` sends by
  itself only if a Vault secret `telegram_bot_token` is ever added; both paths take only `pending` rows.

## The pictures v2 (26.10.2026): FAN LIFE Social Kit v2 (The Weekly)
- The owner's **FAN LIFE Social Kit v2** replaces v1 in `scripts/marketing/kit/` (source, config, plates, glyph outlines;
  its `MIGRATION_V2.md` is kept beside it). Rival locks read the repo's own `club-packs/<club>/identity.json`.
- Every data slot is built with its own **kit** (`main.kit = {t, data}`), so the picture is drawn from the archive data,
  not re-read from the text: 08:00 **T9-OTD** (2–5 ticket rows, neutral inks), 16:00 **T10-NERDS** (four answers, the
  answer never printed), 18:00 **T5-B** (the question, four answers, the empty IG sticker frame), 20:00 **T11-SPICY**
  (the score on split-flap tiles, or a real archive shirt from `public/club-kits` and its sponsor), 12:00
  **T12-PARTNER** ("FAN LIFE presents") for the partner apps' single posts. Other slots use T1–T8 from the message.
- **Crests:** the one crest library of the universe — OFFSIDES' `public/logos`, resolved by `ecosystem/crests`
  (identical in all five repos, rule 14 of the contract), images from `https://offsides.dubelteam.com/logos/<slug>.png`;
  the club's own `public/crests` file only where the library has none. On club posts the kit prints them in its two
  inks (rival lock). The same library now fills Today's Football (an opponent with a library crest is no longer
  "missing") and the hub's fixture strip.
- `worker_marketing_tick` hands each post its kit; the GitHub backup asks `worker_marketing_kits` (migration
  20261026180000).

## The pictures (25.10.2026)
Every post now arrives with its picture first: the owner's **DUBEL TEAM Social Kit v1** is vendored in
`scripts/marketing/kit/` (renderer `source/design.mjs`, brand/content JSON, font outlines, the original stadium
artwork) and `kit/visual.mjs` reads the post back out of its own message — app, hook, `Visual: T<n>`, the real match —
and draws the matching template with that copy. A real match → T5-A poster with the teams and kick-off; T4 → a real
archive shirt (THE WORKER's photographed fronts) with the season, maker and sponsor the Kit Master records; T7 → the
five slides from the post's own `Slide n:` lines. Emoji and anything the kit fonts cannot print are dropped, never
guessed. If a picture cannot be drawn or Telegram refuses it, the text still goes out — only the text counts as
delivered. Actions installs only `sharp` into `kit/` (cached). T5-B/T5-C keep their empty frame on purpose: that is
where the Instagram poll/countdown sticker goes.

## The day
| time | format | what |
|---|---|---|
| 08:00 | post | morning, emotional connection |
| 10:00 | carousel | how an app works (5 slides) |
| 12:00 | post | DUBID / OFFSIDES matchday |
| 14:00 | reel / TikTok | 15–30s script |
| 16:00 | story | poll / quiz / slider |
| 18:00 | post | **tonight's real match** (core.fixtures, kicking off 18:00–24:00); none → a deep post |
| 20:00 | story | **the match on now** (19:15–21:15); none → a wallpaper |
| 22:00 | text | night, emotional; on an **Israeli derby** day → FUCK YOU |

Match choice: Israeli derby › a FAN LIFE club (links to `/clubs/<slug>`) › Israeli league (DUBID /
OFFSIDES) › the biggest other game. A fixture used earlier that day is not used again. Team names
print in English (`core.teams.name_en`). Nothing states a score, a date or a fixture the database
does not hold.

## Rules
- Everything is English (owner, 25.10.2026): copy, the Telegram message, team names (`core.teams.name_en`) and league names.
- Every visual brief names a template T1–T8 — `docs/fanlife/52-marketing-templates.md`.
- A post more than 90 minutes late is skipped, never flooded.
- A refused send retries up to 3 times, then `failed` with Telegram's answer in `error`.
- OFFSIDES copy always says it is a free simulation with no real money.
- FUCK YOU appears only on Israeli derby days and never names a private person.
- ALL FOOTBALL is switched off (`features.allFootball=false`), so no post promotes it.

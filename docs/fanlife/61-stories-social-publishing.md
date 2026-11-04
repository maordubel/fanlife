# Football Stories → Facebook · Instagram · X · TikTok (4.11.2026)

Owner: *"a button for automatic / scheduled publishing on Facebook, X, Instagram and TikTok — including the copy, the
info, the tags, the titles and everything needed. What reaches me on Telegram must also follow the marketing rules,
with simple copy-paste. Full automation."*

## What the owner sees
Desk → Studio → open a **finished** film → **Social** (under the Publish kit). One card per platform:
- the post as composed — hook, title, where the film is, the slogan, smart tags — editable, with a character count
  against the platform's own limit and a **Copy** button;
- the **first comment** (the film's link — rule 127: the link and any answer go in the first comment, never in the
  caption), with its own **Copy**;
- the file: a Short (9:16) or a thumbnail;
- a connection light: *Connected · publishes by itself* / *Connected · automatic publishing is off* / *Not connected ·
  goes to your Telegram*, and under a platform that is not connected, **How to connect** (click-only steps);
- **Publish now** (or **Send pack to Telegram now** when it cannot publish), and **Schedule** at a date and time in Athens.
- **Schedule all four** at one time, and the list of planned / sent posts with **Cancel** / **Open on …**.

Until YouTube's video id is recorded on the film, the first comment links to the channel and the panel says so.

## What happens at the post's time
`.github/workflows/stories-social.yml` runs every 10 minutes (and on *Run workflow*):
1. tells the studio which platforms have their secrets — **yes/no only** (the panel's lights);
2. claims each due post **once** — a claimed post is never published twice, whatever happens next;
3. publishes it **only if** the repository variable `STORIES_SOCIAL_AUTOPUBLISH` is `1` **and** that platform is
   connected. Otherwise it sends the owner's Telegram a **ready pack**: the file, then a message with a header
   (`📌 Reel · FOOTBALL STORIES · Instagram`, the time, the film), the caption in a copy box, the first comment in a
   second copy box, and one line of where to tap — and marks the post *On your Telegram*;
4. a platform that refuses is reported (*Did not go out*, with the reason) and its pack goes to Telegram so it can go
   up by hand. It is not retried.
After an automatic post the owner gets a one-line ✅ with the link; for TikTok the line carries the first comment to
paste (TikTok has no comment API).

The Reel the worker already sends (*Send the first Reel to my Telegram*) is now followed by the same ready captions —
Instagram/Facebook, TikTok and X — composed by the same code (`social_pack`).

## Connect each platform (the owner's clicks — Claude never handles a token)
GitHub → the `fanlife` repository → **Settings → Secrets and variables → Actions**. *Secrets* tab = **New repository
secret**; *Variables* tab = **New repository variable**.

**Always:** secrets `FAN_LIFE_CRON_SECRET` and `TELEGRAM_BOT_TOKEN` (both already exist for the studio and Final
Whistle). Without anything else, every post arrives on Telegram as a ready pack.

**The switch:** variable `STORIES_SOCIAL_AUTOPUBLISH` = `1`. Delete it (or set `0`) to stop all automatic publishing;
the Telegram packs keep coming. It is separate from the social plan's `META_AUTOPUBLISH`.

**Facebook (the Page *FanLife: Football Stories*)** — the same system-user Page token as the social plan
(docs/fanlife/53, steps 1–6). If that is done, only add here: variable `META_PAGE_ID`, secret `META_PAGE_TOKEN`.
Reels go up through the Page's Reels upload; a thumbnail post is a link post to the film.

**Instagram (@fanlifefootballstories)** — must be a Business or Creator account linked to the Page (Page settings →
Linked accounts → Instagram), and the token needs `instagram_basic` + `instagram_content_publish` (doc 53 step 5).
Add variable `META_IG_USER_ID`. Reels go up as a resumable upload (the bytes straight to Meta; no public link needed).

**X** — developer.x.com → Projects & Apps → the app → *User authentication settings* → **Read and write** → Save.
*Keys and tokens* → API Key and Secret → **Regenerate**; Access Token and Secret → **Generate** (logged in as the
FanLife account). Add four secrets: `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`.
Needs an X API plan that allows posting with media (the free tier's post allowance may not include media upload).
The first comment is posted as a reply.

**TikTok** — developers.tiktok.com → Manage apps → **Create app** → add *Login Kit* and *Content Posting API* (Direct
Post), scope `video.publish`. **Until TikTok audits the app, every post is private ("only me")** and TikTok refuses
posting to a public account (`unaudited_client_can_only_post_to_private_accounts`): either set the TikTok account to
private for testing or submit the app for audit (TikTok reviews it; it needs a privacy policy URL and a demo video).
After authorising the FanLife account once, add secrets `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`,
`TIKTOK_REFRESH_TOKEN` (lasts a year; the runner trades it for a fresh access token each round). `TIKTOK_ACCESS_TOKEN`
alone works too but expires in 24 hours. Optional variable `TIKTOK_PRIVACY` (e.g. `PUBLIC_TO_EVERYONE` once audited).
The film's AI/synthetic disclosure is passed to TikTok as `is_aigc`.

## What stays manual, and why
| | why |
|---|---|
| TikTok first comment | the Content Posting API has no comment endpoint — the ✅ message carries it to paste |
| TikTok public posts | an unaudited TikTok app may only post privately |
| A platform without secrets | nothing is ever published without its own token; the pack goes to Telegram |
| Anything while `STORIES_SOCIAL_AUTOPUBLISH` ≠ 1 | the owner's switch |
| A file over 50 MB on Telegram | the bot API limit — the pack says to download it from the studio |
| YouTube itself | unchanged: uploaded through YouTube Studio (API uploads from an unaudited project stay private) |

## Code
- `lib/stories/social.ts` — pure: composer (limits, smart tags via `lib/marketing/tags.ts`, first comment, file),
  schedule/cancel (owner actions `social_schedule`, `social_cancel` in `lib/stories/jobs.ts`), and the runner's
  due/claim/result. Tests: `tests/stories-social.test.ts`.
- `app/api/master/stories/worker/route.ts` — ops `social_due`, `social_claim`, `social_result`, `social_pack`
  (CRON secret). `app/api/master/stories/social/route.ts` — the lights for the panel (owner only).
- `lib/stories/socialLights.ts` — the yes/no lights in the durable store (`studio/social-lights.json`).
- `scripts/football-stories/publish/social.mjs` — the publisher (Meta Reels/photos/link posts and IG Reels/images,
  X API v2 with OAuth 1.0a and chunked media upload, TikTok direct post with chunked upload, the Telegram pack).
  It reuses `graph()` from the social plan's `scripts/marketing/meta-publish.mjs` and does not change it.
- `app/master/stories/SocialPanel.tsx` + `social.module.css` — the panel.

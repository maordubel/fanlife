# The social plan → the business X account (4.11.2026)

Owner: *"open an X page for marketing and run it automatically through our admin system, together with Facebook."*

Same pipeline as Facebook/Instagram (doc 53): every plan post still goes to the owner's Telegram, and when the
switch is on each **Post** and **Carousel** is also published to the business X account at its slot. The Telegram
draft opens with `✅ X — published automatically` or `⚠️ X refused … post it by hand`. The schedule lives in the
control room (Operations → schedules → DUBEL TEAM plan).

## What is published
| plan item | on X |
|---|---|
| Post | one post with the picture |
| Carousel | one post with the first 4 slides (X's limit) |
| First comment (quiz answer) | a reply under the post |
| Story, Reel, morning briefing | never |

The caption is fitted to 280 characters (whole lines/sentences, never mid-word), keeps 3 hashtags.

## Cost — why links are left out
X has no free API since February 2026; it bills per call. About **$0.015 per post** and about **$0.20 per post
that contains a link**. So by default every link is removed and the account's **bio carries
fanlife.dubelteam.com**. At the plan's pace (≈2 feed items a day + replies) that is roughly **$1–2 a month**.
`X_LINKS=1` keeps the links (≈ $15–25 a month). X asks for credits to be bought up front; the minimum top-up is
the only spend.

## Privacy
The four keys are the business account's own (an app created while signed in as that account). They cannot post
as, or read, a personal profile. The code calls only `/2/media/upload` and `/2/tweets`.

## Setup — the owner's clicks (Claude may not create accounts or handle keys)
1. **x.com → Create account** with a business email (not the personal one). Handle e.g. `@FanLifeStories`.
   Profile picture and banner: `scripts/football-stories/channel/meta/profile.png` and `fb-cover.jpg` (X crops the
   banner to 1500×500). Bio: *Football is ninety minutes. Being a supporter is a lifetime.* Website:
   `https://fanlife.dubelteam.com`.
2. **developer.x.com → sign in AS THE BUSINESS ACCOUNT → Developer portal → Projects & Apps → New app**
   `FanLife Publisher`. **User authentication settings:** App permissions **Read and write**, type **Web App /
   Automated app or bot**, callback `https://fanlife.dubelteam.com`, website `https://fanlife.dubelteam.com`.
3. **Billing → buy credits** (the smallest amount). Set a monthly spending limit (e.g. $5) and leave
   auto-recharge off.
4. **Keys and tokens:** copy **API Key**, **API Key Secret**, then **Access Token and Secret → Generate** (it must
   say *Read and Write*; if it says Read only, regenerate after step 2).
5. **Vercel → FAN LIFE → Settings → Environment Variables (Production):** `X_API_KEY`, `X_API_SECRET`,
   `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`, and `X_AUTOPUBLISH = 1` last. Redeploy. GitHub backup path: Actions →
   Secrets (the four keys) and Variables (`X_AUTOPUBLISH`).
6. Off = delete `X_AUTOPUBLISH`. Optional: `X_APPS` (default `fanlife,theworker,dubid,offsides`), `X_LINKS=1`.

## Code
`scripts/marketing/x-publish.mjs` (OAuth 1.0a, plain ESM; used by `app/api/marketing/tick` and
`scripts/marketing/telegram-send.mjs`), tests `tests/marketing/x-publish.test.ts`.

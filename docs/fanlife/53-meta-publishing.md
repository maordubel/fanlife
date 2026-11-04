# The social plan → the business Facebook Page and Instagram (4.11.2026)

Owner: *"full automation of publishing in my name — only the business account, without my private Facebook and Instagram."*

The plan (doc 51) keeps sending every post to the owner's Telegram. When the switch is on, each **Post** and
**Carousel** is ALSO published, at its slot, to the Page **FanLife: Football Stories** and its Instagram account
**@fanlifefootballstories**. The Telegram draft then opens with one line: `✅ Facebook · ✅ Instagram — published
automatically`, or `⚠️ … post it by hand from the boxes below`.

## What is and is not published
| format | automatic | why |
|---|---|---|
| Post (one picture) | ✅ Page photo + IG post, answer as the first comment | |
| Carousel (2–10 slides) | ✅ Page album post + IG carousel | |
| Story | ❌ stays a Telegram draft | the IG quiz/poll/link sticker cannot be added through the API |
| Reel / TikTok | ❌ | needs a video |
| Morning briefing | ❌ never | it is the owner's |
| FUCK YOU | ❌ unless added to `META_APPS` | derby content, the owner's call per post |

Each post is tried **once** (a claimed post is never published twice). A refusal is printed on the draft, not retried.

## Privacy — why the personal accounts stay out
- The token is a **Page token of a Business system user** in the Dubel Team portfolio. A system user is not a
  person: it cannot see, post as, or read the owner's personal Facebook or Instagram.
- The code addresses only `META_PAGE_ID` and `META_IG_USER_ID` — never `/me` (asserted in
  `tests/marketing/meta-publish.test.ts`).
- Instagram is linked **to the Page** (Page settings → Linked accounts), not through the owner's profile.

## Setup — the owner's clicks (Claude may not create accounts or handle tokens)
1. **business.facebook.com → Dubel Team → Settings → Accounts → Pages:** the Page FanLife: Football Stories is in the portfolio.
2. **… → Accounts → Instagram accounts → Add:** @fanlifefootballstories (a Professional account). Then on the Page:
   Settings → Linked accounts → Instagram → Connect.
3. **developers.facebook.com → My apps → Create app → "Other" → Business**, name `FAN LIFE Publisher`, portfolio
   Dubel Team. Add the products *Facebook Login for Business* and *Instagram* (Instagram API with Facebook Login).
   The app can stay in Development mode: it only posts to assets the portfolio owns.
4. **Business settings → Users → System users → Add:** `fanlife-publisher`, role **Admin**. *Assign assets*: the Page
   (Full control — "Create content") and the Instagram account (Content), and the app.
5. **Generate new token** on that system user: app `FAN LIFE Publisher`, expiry **Never**, permissions
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`,
   `business_management`. Copy it once.
6. **Get the Page token and the two ids** — in Graph API Explorer with that token:
   `GET /me/accounts?fields=id,name,access_token,instagram_business_account` → the Page's `id` = **META_PAGE_ID**,
   its `access_token` = **META_PAGE_TOKEN**, `instagram_business_account.id` = **META_IG_USER_ID**.
   (`/me` here is the system user, not a person.)
7. **Vercel → FAN LIFE project → Settings → Environment Variables (Production):** `META_PAGE_ID`,
   `META_PAGE_TOKEN`, `META_IG_USER_ID`, and `META_AUTOPUBLISH = 1` last. Redeploy.
   The GitHub backup path reads the same names: Actions → Variables (`META_AUTOPUBLISH`, `META_PAGE_ID`,
   `META_IG_USER_ID`) and Secrets (`META_PAGE_TOKEN`).
8. Turning it off = delete `META_AUTOPUBLISH` (or set 0). Nothing else changes; Telegram drafts keep coming.

Optional: `META_APPS` (default `fanlife,theworker,dubid,offsides`), `META_GRAPH_VERSION` (default `v23.0`).

## Code
`scripts/marketing/meta-publish.mjs` (plain ESM; the tick `app/api/marketing/tick` and the backup
`scripts/marketing/telegram-send.mjs` both use it). Pictures go up as JPEG; one taller than 4:5 is set on a
1080×1350 ink sheet, never cropped. Instagram fetches the Page's own CDN copy of each picture, so no storage bucket.

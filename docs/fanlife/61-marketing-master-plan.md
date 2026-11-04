# FAN LIFE: the marketing master plan (4.11.2026)

Everything we market, where, how often, what runs by itself and what the owner still clicks. **Zero budget**: no
paid promotion, no bought engagement. Supersedes the summary parts of docs 51/53/54; their technical detail stays.

## 1. The voices and the audience
- **FAN LIFE is the lead voice.** DUBID and OFFSIDES speak in their own branding; THE WORKER and FUCK YOU are
  promoted from FAN LIFE (doc 51 v2–v4.1).
- Audience: fans 15–55, and the club passed from father to son. All marketing in **English**. Every post has a
  picture. Nothing before 1980 in fixed posts. Shirt and crest colours stay in colour.

## 2. Channels and status
| channel | account | what goes there | automation | status |
|---|---|---|---|---|
| Telegram (owner) | the bot | every post as a ready draft + morning briefing | ✅ live (pg_cron tick + GitHub backup) | live |
| Facebook | Page **FanLife: Football Stories** (id 61596365454942) | plan posts + carousels | ✅ code merged (doc 53), off until the system-user token | page live, first post up |
| Instagram | **@fanlifefootballstories** | same as Facebook | ✅ same publisher | **waiting**: link to the Page blocked by Meta's temporary limit; retry from the IG app in 1–2 days |
| X | business account (to open) | posts + carousels (4 pics), answer as reply, **no links** (cost) | ✅ code merged (doc 54) | **waiting**: owner opens the account + app keys |
| YouTube | **FanLife: Football Stories** | 3 shows + Shorts (section 3) | ✅ upload/schedule by Claude after approval | live |
| Facebook groups | as the Page only | 1 tailored post a day | by hand in the browser (Claude) | started 4.11 |
| TikTok, Reels | the same page | reels/Shorts from the studio | drafts to Telegram; owner posts | as before |

## 3. YouTube: three shows, one HUB
| show | content | cadence |
|---|---|---|
| **SEASONS WE NEVER FORGET** | club documentaries from the archive | per the stories studio (docs 54–60) |
| **I WAS THERE** | the matchday vlog, real footage | after each match attended |
| **CLASSIFIED** (new) | the stories behind football, comic + our narrator | **Fri 18:00**, 3 Shorts Fri/Sat/Sun 20:00; launch with 4 films + 12 Shorts ready |
| FAN LIFE features | 7 challenge Shorts + 1 film a week | weekly (Sun build → approval → scheduled) |
| Legends Manager / Royal Rumble ads | 1 film + 6 Shorts each | ≥ 1 item a day |

Shared: 3-second HUB ident, the follow call (rule 136), end card to the site, cross-links between shows.

## 4. Daily rhythm (Israel/Athens time)
- **08–22 every hour or two:** the 45-day plan (17 slots/day: On this day, gate, Did you know, story quiz, nerds,
  Rumble/Legends, spicy, generations 19:30, the 19:00 club carousel, DUBID and OFFSIDES slots, live results and
  fixtures). Each slot → Telegram draft → **auto-published** to Facebook, Instagram, X once switched on.
- **Once a day:** one Facebook group post as the Page (Claude, different words each time, never the same link pasted
  around), plus replies to comments on the Page.
- **Fri 18:00:** the CLASSIFIED file of the week; Shorts the next three evenings.

## 5. Free growth: what we do (no money)
**YouTube, inside YouTube (the strongest free levers):**
- Shorts on every film (3 each) linking to the full film (Related video).
- Playlists per show; the official CLASSIFIED series playlist.
- End screens and a pinned comment on every film; chapters; captions in English.
- Community posts (polls on "which file next", quiz frames) as soon as the channel has them.
- Test & Compare: 3 thumbnails per film.
- Collaborations: club fan channels and football history channels (a guest story, a mutual Short), one pitch a week.

**Outside YouTube:**
- Our own site: embed each club's films on its FAN LIFE club page and on the hub (a code task, free, high-intent viewers).
- Facebook groups (vintage/90s football, club supporters), as the Page; Reddit club subreddits and football-history
  communities, only where the rules allow a link, as a contribution; Discord and Telegram supporter groups; Quora answers.
- X and Bluesky threads that tell the story in 5 posts and link the film in the last one.
- Every post in the plan that matches a film links to it.

## 6. What we do NOT use, and why
**Free "promotion" sites like VeeFly but free** (view or sub exchanges, "earn coins by watching": YTMonster, SubPals,
AddMeFast, Sonuker and the like) are not used. YouTube's fake-engagement policy bans sub4sub and *linking to* view or
subscriber gaming services; it removes those views and can terminate the channel. They also wreck retention, which
is what decides whether YouTube recommends a film. VeeFly itself is paid ads (Google Ads), so there is no free
version of it. No bought likes, views, followers, anywhere.

## 7. Owner's clicks (only these)
1. **Instagram:** in 1–2 days, from the IG app as @fanlifefootballstories: Edit profile → Page → FanLife: Football
   Stories → Connect.
2. **Meta token** for auto-publishing: doc 53, steps 3–7.
3. **X:** open the business account and paste the four keys: doc 54 (≈ $1–2 a month of X credits; the only spend).
4. **CLASSIFIED art:** the prompt pack (doc 60 on the CLASSIFIED branch) → Drive `06_CLASSIFIED/…` → "uploaded".
5. Approve films on Telegram before they are scheduled.

## 8. What we measure (weekly report by Claude)
- Page followers and reach (Facebook, Instagram, X).
- YouTube: subscribers, CTR 4–8%, 60% still watching at 0:30, average view 35–45%, Shorts → film click-through.
- Site visits from social (each channel's links carry its own `src=`).
- Which group or community brought people: keep doing it, drop the rest.

## 9. Next upgrades (free)
- **Bluesky auto-posting** next to X: free API, $0 per post, same publisher pattern.
- **Threads** through the same Meta app once Instagram is linked.
- Film embeds on club pages (section 5).

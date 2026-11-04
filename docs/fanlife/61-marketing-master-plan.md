# FAN LIFE: the marketing master plan, v5 (4.11.2026)

Everything we market, where, when (**Athens time**), what runs by itself and what still needs the owner's hands.
**Zero budget**: no paid promotion, no bought engagement. Channels now: **Facebook, Instagram, TikTok, YouTube**
(X is parked: the code exists, switched off).

## 1. Voices and audience
- **FAN LIFE leads.** DUBID and OFFSIDES speak in their own branding; THE WORKER and FUCK YOU are promoted from FAN LIFE.
- Fans 15–55, the club passed from father to son. All marketing in **English**. A picture on every post. Nothing before
  1980 in fixed posts. Shirt and crest colours stay in colour.

## 2. The day (plan v5, 45 days from 5.11.2026; `scripts/marketing/build-plan.mts` → `supabase/marketing/0009`)
| time | where | what |
|---|---|---|
| 07:30 | Telegram only | morning briefing (operations) |
| 09:00 | stories | **live** results of the FAN LIFE clubs (or nothing) |
| 10:00 | feed | On this day (several clubs) |
| 11:00 | stories | **live** next up: FAN LIFE clubs today/tomorrow |
| 13:00 | feed | Mon/Thu DUBID · Tue/Sat OFFSIDES (their branding) · Sun/Wed/Fri a gate of the app |
| 13:30 | stories | **live** a DUBID round that just opened |
| 14:00 | stories | story quiz: the question + four answers |
| 15:00 | stories | **live** OFFSIDES: today's arenas |
| 16:00 | stories | did you know |
| 17:30 | stories | the quiz answer |
| 19:00 | feed + TikTok | the club carousel (history · gates · love), one club a day |
| 19:30 | stories | GENERATIONS (kid vs dad, dad's era, ask your dad) |
| 20:00 (Wed) | stories | a film from our YouTube channel |
| 21:00 | feed | Sun spicy · Mon Rumble/Legends · Tue nerds only · Wed guess the score · Thu generations · Fri **new film** · Sat Rumble/Legends |
| 22:00 | stories | a late fact |

**Why four feed posts, not fourteen:** a page that floods the feed gets muted by its own followers and by the
algorithm. Stories carry the volume (they disappear in 24 hours and do not hurt reach).

**Stories never need a sticker** (the API cannot add one): the quiz is a picture with four answers, the answer comes as
its own story at 17:30.

## 3. What runs by itself, and what does not
| channel | how | status |
|---|---|---|
| **Facebook Page** FanLife: Football Stories | auto: feed + stories, the answer as the first comment | code merged; waiting for the Meta token (§5) |
| **Instagram** @fanlifefootballstories | auto: feed, carousels, stories | waiting for the link to the Page (§5) |
| **TikTok** | the 19:00 carousel as a **Photo mode** post: Telegram draft with the slides + caption to copy | by hand (TikTok gives an unreviewed app private posts only; an app review can open it later) |
| **YouTube** | films Fri 18:00, Shorts daily 20:00 (stories studio + feature videos); uploaded and scheduled by Claude after approval | running |
| **Facebook groups** | one tailored post a day as the Page (Claude, in the browser) | running since 4.11 |
| Telegram | a post that went out everywhere = **one quiet line**; anything that needs hands (TikTok, a refusal, Meta still off) = the full copy-paste draft with pictures | live |

## 4. YouTube: three shows, one HUB
| show | cadence |
|---|---|
| SEASONS WE NEVER FORGET (club documentaries) | per the stories studio |
| I WAS THERE (matchday vlog) | after each match attended |
| CLASSIFIED (stories behind football) | Fri 18:00 + 3 Shorts Fri/Sat/Sun 20:00, from launch |
| FAN LIFE features (7 Shorts + 1 film a week) | weekly |
| Legends Manager / Royal Rumble ads | ≥ 1 item a day |

The feed promotes only films that are **public** (read from their upload records), each with its own thumbnail.

## 5. Owner's clicks (only these)
1. **Instagram → Page link**, in 1–2 days (Meta's temporary limit): Instagram app, as @fanlifefootballstories →
   Edit profile → Page → FanLife: Football Stories → Connect.
2. **Page into the Dubel Team portfolio** and the **publishing token**: Claude retries the portfolio step after the
   limit lifts and prepares everything up to the token. The token itself is generated and pasted by the owner
   (doc 53, steps 5–7): Claude does not handle access tokens.
3. Approve films on Telegram/chat before they are scheduled.

## 6. Free growth (no money)
- Inside YouTube: Shorts → full film, playlists, end screens, pinned comments, community posts, Test & Compare,
  collaborations with fan and history channels.
- Our site: embed each club's films on its FAN LIFE page.
- Facebook groups, Reddit club communities and Discord/Telegram supporter groups, only where the rules allow a link.
- **Not used:** view or subscriber exchange sites (YTMonster, SubPals, AddMeFast and the like). YouTube bans them and can
  close the channel. VeeFly is paid Google Ads; there is no free version.

## 7. What we measure (weekly report)
Followers and reach per channel; YouTube CTR 4–8%, 60% still watching at 0:30, average view 35–45%; site visits from
social; which group or community brought people.

## 8. Next upgrades
- **Approve from Telegram:** ✅/❌ buttons on every film draft; ✅ schedules the upload by itself (needs a one-time
  YouTube connection by the owner).
- **TikTok app review** to post automatically.
- Threads, through the same Meta app, once Instagram is linked.

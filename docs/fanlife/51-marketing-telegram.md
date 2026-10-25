# DUBEL TEAM — the 30-day social plan on Telegram (25.10.2026)

One page (Instagram · TikTok · Facebook) markets the whole universe: FAN LIFE, THE WORKER, DUBID,
OFFSIDES and FUCK YOU. Every two hours, 08:00–22:00 Israel time, the owner gets a ready post on
Telegram: the hook, the caption, the link to the right app, the hashtags and a visual brief.

## Where it lives
- **Database:** schema `marketing` on Football Master (hub-owned, server only).
  `marketing.posts` = 245 rows (day 0 = 25.10 afternoon, days 1–30 = 26.10 → 24.11, 8 slots a day).
  `marketing.settings` = `meta` (links, names, hashtags, clubs, Israeli derby pairs), `content`
  (the copy pools) and `telegram` (the owner's chat id — the same chat FAN LIFE's bot already
  delivers Final Whistle to; not committed, the repo is public).
- **SQL:** `supabase/marketing/0001..0004`. 0002 is generated: edit `scripts/marketing/content.py`,
  run `python3 scripts/marketing/gen.py`, apply 0002, then rebuild unsent rows if needed.
- **Delivery:** pg_cron `marketing:telegram` every 2 minutes → `marketing.dispatch()` → pg_net
  `sendMessage`. No edge function. The bot token is the Vault secret `telegram_bot_token`;
  without it dispatch answers `no telegram_bot_token in Vault` and sends nothing.

## The day
| time | format | what |
|---|---|---|
| 08:00 | post | morning, emotional connection |
| 10:00 | carousel | how an app works (5 slides) |
| 12:00 | post | DUBID / OFFSIDES matchday |
| 14:00 | reel / TikTok | 15–30s script |
| 16:00 | story | poll / quiz / slider |
| 18:00 | post | **tonight's real match** (core.fixtures, 17:00–24:00); none → a deep post |
| 20:00 | story | **the match on now** (19:15–21:15); none → a wallpaper |
| 22:00 | text | night, emotional; on an **Israeli derby** day → FUCK YOU |

Match choice: Israeli derby › a FAN LIFE club (links to `/clubs/<slug>`) › Israeli league (DUBID /
OFFSIDES) › the biggest other game. A fixture used earlier that day is not used again. Team names
print in Hebrew (`core.teams.name_he`). Nothing states a score, a date or a fixture the database
does not hold.

## Rules
- A post more than 90 minutes late is skipped, never flooded.
- A refused send retries up to 3 times, then `failed` with Telegram's answer in `error`.
- OFFSIDES copy always says it is a free simulation with no real money.
- FUCK YOU appears only on Israeli derby days and never names a private person.
- ALL FOOTBALL is switched off (`features.allFootball=false`), so no post promotes it.

-- The 30-day plan: day 0 (25.10.2026 afternoon) + days 1..30, eight slots a day 08:00–22:00 Israel time.
-- Copy comes from marketing.settings 'content' (0002, generated from scripts/marketing/content.py).
with c as (select value v from marketing.settings where key = 'content'),
d0 as (
  select 0 as dd, '14:00'::time as t, 'reel' as fmt, 'fixed' as kind,
         '{"app":"all","hook":"פתחנו עמוד. חמש אפליקציות, אוהד אחד.","body":"0-3: \"אם אתה אוהד — תעצור\".\n3-20: מעבר מהיר בין FAN LIFE, THE WORKER, DUBID, OFFSIDES ו-FUCK YOU.\n20-25: \"עקוב. מחר מתחילים חודש שלם\".","visual":"מונטאז׳ מהיר של 5 מסכים, מוזיקת יציע, 25 ש׳."}'::jsonb as main,
         null::jsonb as variants, null::jsonb as fallback, null::text as ffmt
  union all select 0, '16:00', 'story', 'fixed',
         '{"app":"all","hook":"סקר פתיחה: איזה סוג אוהד אתה?","body":"סקר 4 אפשרויות: מנחש / מנהל / היסטוריון / נוסטלגי.\nשקף 2: \"יש אפליקציה לכל אחד\" + סטיקר קישור.","visual":"ארבעה אייקונים קומיקס."}'::jsonb, null, null, null
  union all select 0, '18:00', 'post', 'pre', null, c.v->'PRE'->0, c.v->'DEEP'->29, null from c
  union all select 0, '20:00', 'story', 'live', null, c.v->'LIVE'->0, c.v->'WALLPAPER'->0, 'background' from c
  union all select 0, '22:00', 'text', 'night',
         '{"app":"all","hook":"לילה ראשון של העמוד. תודה שאתה פה.","body":"מחר בשמונה בבוקר — הפוסט הראשון של חודש שלם.\nהפעל התראות.","visual":"טקסט לבן על שחור."}'::jsonb, null, c.v->'DERBY_NIGHT'->0, null from c
),
dn as (
  select g.n as dd, s.t, s.fmt, s.kind,
    case when s.pool in ('PRE','LIVE') then null else c.v->s.pool->(g.n-1) end as main,
    case s.pool when 'PRE' then c.v->'PRE'->((g.n-1) % 5) when 'LIVE' then c.v->'LIVE'->((g.n-1) % 3) end as variants,
    case s.pool when 'PRE' then c.v->'DEEP'->(g.n-1) when 'LIVE' then c.v->'WALLPAPER'->(g.n-1)
                when 'NIGHT' then c.v->'DERBY_NIGHT'->((g.n-1) % 3) end as fallback,
    case s.pool when 'LIVE' then 'background' end as ffmt
  from generate_series(1,30) g(n), c,
  (values ('08:00'::time,'post','fixed','MORNING'), ('10:00','carousel','fixed','CAROUSEL'),
          ('12:00','post','fixed','GAMEDAY'), ('14:00','reel','fixed','REELS'),
          ('16:00','story','fixed','STORIES'), ('18:00','post','pre','PRE'),
          ('20:00','story','live','LIVE'), ('22:00','text','night','NIGHT')) s(t, fmt, kind, pool)
)
insert into marketing.posts (day, send_at, format, kind, main, variants, fallback, fallback_format)
select dd, ((date '2026-10-25' + dd) + t) at time zone 'Asia/Jerusalem', fmt, kind, main, variants, fallback, ffmt
from (select * from d0 union all select * from dn) x
on conflict (send_at) do nothing;

-- The owner's chat id is set once in the database (key 'telegram'), copied from the chat FAN LIFE's bot
-- already delivers Final Whistle to (worker_fanlife_files: final-whistle/destination.json). It is not
-- committed: this repo is public. dispatch() probes getUpdates only when that row is missing.

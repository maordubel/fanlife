-- FAN LIFE — "link in bio" (30.10.2026). Every social post says "link in bio"; the bio holds one address. This lets
-- that address (fanlife.dubelteam.com/today) list the day's FAN LIFE posts that have already gone out, each with its own
-- link, so a fan who saw the 19:30 post lands on the 19:30 game.
-- Standalone: reads marketing.posts (hub-owned, server only). Only the public parts of a post leave the database —
-- label, hook, link, time — never the first comment (it holds the answers) and never the rendered message.
-- Service role only, like worker_marketing_live_data; the page calls it from the server.
create or replace function public.worker_marketing_today()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'at', to_char(p.send_at at time zone 'Asia/Jerusalem', 'HH24:MI'),
           'label', p.main->>'label',
           'hook', p.main->>'hook',
           'url', p.main->>'url'
         ) order by p.send_at desc), '[]'::jsonb)
    from marketing.posts p
   where p.kind = 'fixed'
     and p.main->>'app' = 'fanlife'
     and p.main->>'url' like 'https://fanlife.dubelteam.com%'
     and p.send_at <= now()
     and (p.send_at at time zone 'Asia/Jerusalem')::date = (now() at time zone 'Asia/Jerusalem')::date
$$;
revoke all on function public.worker_marketing_today() from public, anon, authenticated;
grant execute on function public.worker_marketing_today() to service_role;

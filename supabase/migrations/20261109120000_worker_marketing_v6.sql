-- FAN LIFE marketing plan v6 (owner, 9.11.2026). Standalone; needs the marketing migrations of 25.10–4.11 first.
--  1. Three new live slots, composed at send time from real data or skipped (lib/marketing/live.ts):
--       vote    — the Club Vote's real count (worker_poll_tally, question fanlife-next-club)
--       numbers — real community activity this week (worker_events_funnel)
--       pulse   — the newest public video on the channel (the studio's upload records)
--  2. Each post remembers where it was published (Facebook, Instagram, X): the morning briefing ticks what went out and
--     flags what failed (owner: "mark V on what was published, warn about failures, show the day's plan").
-- Live function bodies are patched in place (read live, never recreated from a repo file — ecosystem-sync).

alter table marketing.posts drop constraint if exists posts_kind_check;
alter table marketing.posts add constraint posts_kind_check
  check (kind in ('fixed','pre','live','night','fixtures','results','dubid','offsides','briefing','vote','numbers','pulse'));

alter table marketing.posts add column if not exists published jsonb;

do $$
declare f record; def text;
begin
  for f in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where p.prokind = 'f' and n.nspname = 'public'
       and p.proname in ('worker_marketing_compose','worker_marketing_skip','worker_marketing_live_data')
  loop
    def := pg_get_functiondef(f.oid);
    def := replace(def, $q$('fixtures','results','dubid','offsides','briefing')$q$, $q$('fixtures','results','dubid','offsides','briefing','vote','numbers','pulse')$q$);
    def := replace(def, $q$('fixtures','results','dubid','offsides') and p.status$q$, $q$('fixtures','results','dubid','offsides','vote','numbers','pulse') and p.status$q$);
    execute def;
  end loop;
end $$;

-- what the publishers answered for one post (Facebook, Instagram, X), recorded once by the site after it sent the post
create or replace function public.worker_marketing_published(p_id bigint, p_result jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if p_result is null or jsonb_typeof(p_result) <> 'object' then return jsonb_build_object('ok', false); end if;
  update marketing.posts p set published = p_result where p.id = p_id;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1);
end $$;
revoke all on function public.worker_marketing_published(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.worker_marketing_published(bigint, jsonb) to service_role;

-- one Athens day of the plan: what was meant to go out, what did, and where — for the owner's morning briefing
create or replace function public.worker_marketing_ledger(p_day date)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'at', to_char(p.send_at at time zone 'Europe/Athens', 'HH24:MI'),
           'kind', p.kind, 'status', p.status, 'format', p.format,
           'label', p.main->>'label', 'app', p.main->>'app',
           'to', coalesce(p.main->'kit'->'to', '[]'::jsonb),
           'error', left(p.error, 160), 'published', p.published
         ) order by p.send_at), '[]'::jsonb)
    from marketing.posts p
   where (p.send_at at time zone 'Europe/Athens')::date = p_day
     and p.kind <> 'briefing'
$$;
revoke all on function public.worker_marketing_ledger(date) from public, anon, authenticated;
grant execute on function public.worker_marketing_ledger(date) to service_role;

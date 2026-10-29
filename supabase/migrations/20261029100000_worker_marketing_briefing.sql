-- The owner's morning briefing (owner, 29.10.2026): every morning at 07:30, apart from the marketing, one message with
-- OFFSIDES' arenas open today, today's matches (the FAN LIFE clubs and every OFFSIDES match), the FAN LIFE clubs'
-- latest results and the DUBID rounds still open. A 'briefing' row is a live slot like the others: the site composes
-- it at send time from real data (lib/marketing/live.ts → composeBriefing) and records what it sent.
-- Server only (service role). Standalone; needs 20261027090000 first.
alter table marketing.posts drop constraint if exists posts_kind_check;
alter table marketing.posts add constraint posts_kind_check
  check (kind in ('fixed','pre','live','night','fixtures','results','dubid','offsides','briefing'));

create or replace function public.worker_marketing_compose(p_id bigint, p_msg text, p_ref text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update marketing.posts p set rendered = left(p_msg, 4000), fixture_id = left(p_ref, 2000)
   where p.id = p_id and p.status = 'sending' and p.kind in ('fixtures','results','dubid','offsides','briefing');
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1);
end $$;
revoke all on function public.worker_marketing_compose(bigint, text, text) from public, anon, authenticated;
grant execute on function public.worker_marketing_compose(bigint, text, text) to service_role;

create or replace function public.worker_marketing_skip(p_id bigint, p_why text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update marketing.posts p set status = 'skipped', error = left(p_why, 300)
   where p.id = p_id and p.status = 'sending' and p.kind in ('fixtures','results','dubid','offsides','briefing');
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1);
end $$;
revoke all on function public.worker_marketing_skip(bigint, text) from public, anon, authenticated;
grant execute on function public.worker_marketing_skip(bigint, text) to service_role;

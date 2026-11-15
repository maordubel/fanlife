-- Social pictures v4, live fills and held campaigns (15.11.2026).
-- 1. The queue also hands the drawer a post's fill templates (main.fill: {hook, body} with {product}/{name}/{price}),
--    so a shop post can name the random product it shows. Its safe main.hook/body stay as the fallback.
-- 2. worker_marketing_v4_patch: the drawer writes back only hook, body and url of a pending post.
-- 3. worker_marketing_release: a campaign held for a feature (main.hold, status skipped) goes live the first run after
--    the feature is on main; past dates stay skipped; the launch post moves to tomorrow 19:47 Athens.
create or replace function public.worker_marketing_v4_queue(p_hours integer default 36, p_ver text default '')
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'app', p.main->>'app', 'url', p.main->>'url', 'label', p.main->>'label',
           'send_at', p.send_at, 'kit', p.main->'kit', 'fill', p.main->'fill') order by p.send_at), '[]'::jsonb)
    from marketing.posts p
   where p.status = 'pending'
     and p.kind = 'fixed'
     and p.main ? 'kit'
     and p.send_at between now() - interval '10 minutes' and now() + make_interval(hours => greatest(1, least(p_hours, 96)))
     and coalesce(p.main->'kit'->'v4'->>'ver', '') is distinct from p_ver;
$$;
revoke all on function public.worker_marketing_v4_queue(integer, text) from public, anon, authenticated;
grant execute on function public.worker_marketing_v4_queue(integer, text) to service_role;

create or replace function public.worker_marketing_v4_patch(p_id bigint, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare n int; clean jsonb;
begin
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into clean
    from jsonb_each(coalesce(p_patch, '{}'::jsonb)) as e(k, v)
   where k in ('hook', 'body', 'url') and jsonb_typeof(v) = 'string' and length(v #>> '{}') between 1 and 2200;
  update marketing.posts p set main = p.main || clean where p.id = p_id and p.status = 'pending';
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1);
end $$;
revoke all on function public.worker_marketing_v4_patch(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.worker_marketing_v4_patch(bigint, jsonb) to service_role;

create or replace function public.worker_marketing_release(p_hold text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare n int; t timestamptz;
begin
  t := ((date_trunc('day', now() at time zone 'Europe/Athens') + interval '1 day 19 hours 47 minutes') at time zone 'Europe/Athens');
  while exists (select 1 from marketing.posts where send_at = t) loop t := t + interval '1 minute'; end loop;
  update marketing.posts p set send_at = t, status = 'pending', main = p.main - 'hold' - 'launch'
   where p.status = 'skipped' and p.main->>'hold' = p_hold and p.main->>'launch' = 'true';
  update marketing.posts p set status = 'pending', main = p.main - 'hold'
   where p.status = 'skipped' and p.main->>'hold' = p_hold and p.send_at > now() + interval '10 minutes';
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'n', n);
end $$;
revoke all on function public.worker_marketing_release(text) from public, anon, authenticated;
grant execute on function public.worker_marketing_release(text) to service_role;

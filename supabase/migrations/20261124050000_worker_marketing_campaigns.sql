-- Campaigns (owner, 24.11.2026): a campaign is a set of marketing.posts rows that carry main.campaign = {id, topic, name}.
-- 1. worker_marketing_campaign_add: inserts a built campaign (lib/marketing/campaigns.ts). Athens wall times; a time already
--    taken moves on by a minute (send_at is unique); a time in the past is dropped; a row held for a club that is not open
--    yet (main.hold) waits as skipped until worker_marketing_release lets it go.
-- 2. worker_marketing_campaign_set: pause, resume or stop the posts still ahead of a campaign. Nothing already sent changes.
-- 3. worker_marketing_campaigns: the report — posts by state, where they went out, and the visits they brought
--    (worker_insight_hit.campaign = the utm_campaign every campaign link carries).
-- 4. worker_marketing_holds: the holds still waiting, for the picture run to check (open:<club> → is the club page live?).
create or replace function public.worker_marketing_campaign_add(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare r jsonb; t timestamptz; n int := 0; dropped int := 0; held boolean;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 400 then raise exception 'rows must be an array of at most 400'; end if;
  for r in select value from jsonb_array_elements(p_rows) loop
    if coalesce(r->'main'->'campaign'->>'id', '') !~ '^[a-z0-9-]{3,80}$' or r->'main'->'kit'->>'t' is null then raise exception 'every row needs main.campaign.id and main.kit'; end if;
    t := ((r->>'at')::timestamp at time zone 'Europe/Athens');
    if t < now() + interval '5 minutes' then dropped := dropped + 1; continue; end if;
    while exists (select 1 from marketing.posts where send_at = t) loop t := t + interval '1 minute'; end loop;
    held := r->'main' ? 'hold';
    insert into marketing.posts (day, send_at, format, kind, main, status, error)
    values (0, t, coalesce(r->>'format', 'post'), 'fixed', r->'main', case when held then 'skipped' else 'pending' end,
            case when held then 'waiting: ' || (r->'main'->>'hold') end);
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'n', n, 'dropped', dropped);
end $$;

create or replace function public.worker_marketing_campaign_set(p_id text, p_state text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare n int;
begin
  if p_state = 'pause' then
    update marketing.posts set status = 'skipped', error = 'campaign paused', main = main || '{"paused":true}'
     where main->'campaign'->>'id' = p_id and status = 'pending' and send_at > now();
  elsif p_state = 'resume' then
    update marketing.posts set status = 'pending', error = null, main = main - 'paused'
     where main->'campaign'->>'id' = p_id and status = 'skipped' and main ? 'paused' and send_at > now() + interval '5 minutes';
  elsif p_state = 'stop' then
    update marketing.posts set status = 'skipped', error = 'campaign stopped', main = main - 'paused' - 'hold'
     where main->'campaign'->>'id' = p_id and status in ('pending', 'skipped') and send_at > now();
  else raise exception 'state must be pause, resume or stop'; end if;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'n', n);
end $$;

create or replace function public.worker_marketing_campaigns(p_days integer default 90)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  with p as (
    select main->'campaign'->>'id' id, main->'campaign'->>'name' nm, main->'campaign'->>'topic' topic, status, send_at, error, main, published
      from marketing.posts
     where main ? 'campaign' and send_at > now() - make_interval(days => greatest(1, least(p_days, 365)))
  ), c as (
    select id, max(nm) name, max(topic) topic,
           count(*) filter (where status = 'sent') sent,
           count(*) filter (where status = 'pending') pending,
           count(*) filter (where status = 'skipped' and main ? 'hold') waiting,
           count(*) filter (where status = 'skipped' and main ? 'paused') paused,
           count(*) filter (where status = 'skipped' and not main ? 'hold' and not main ? 'paused') skipped,
           count(*) filter (where status = 'failed') failed,
           count(*) filter (where published->>'facebook' like 'published%') facebook,
           count(*) filter (where published->>'instagram' like 'published%') instagram,
           min(send_at) first_at, max(send_at) last_at,
           min(send_at) filter (where status = 'pending') next_at,
           (array_agg(main->>'label' order by send_at) filter (where status = 'pending'))[1] next_label,
           (array_agg(main->>'hold') filter (where main ? 'hold'))[1] hold
      from p group by id
  ), v as (
    select h.campaign id, count(distinct h.visitor) filter (where h.kind = 'view') visitors, count(*) filter (where h.kind = 'view') views,
           count(*) filter (where h.kind = 'click') clicks, count(distinct h.club) filter (where h.club is not null) clubs
      from public.worker_insight_hit h
     where h.campaign is not null and h.day > (now() at time zone 'Europe/Athens')::date - greatest(1, least(p_days, 365))
     group by h.campaign
  )
  select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object('visitors', coalesce(v.visitors, 0), 'views', coalesce(v.views, 0), 'clicks', coalesce(v.clicks, 0),
           'state', case when c.pending > 0 then 'running' when c.waiting > 0 then 'waiting' when c.paused > 0 then 'paused' else 'done' end)
           order by coalesce(c.next_at, c.last_at) desc), '[]'::jsonb)
    from c left join v on v.id = c.id;
$$;

create or replace function public.worker_marketing_holds()
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(jsonb_agg(distinct main->>'hold'), '[]'::jsonb)
    from marketing.posts where status = 'skipped' and main ? 'hold' and send_at > now() - interval '30 days';
$$;

revoke all on function public.worker_marketing_campaign_add(jsonb) from public, anon, authenticated;
revoke all on function public.worker_marketing_campaign_set(text, text) from public, anon, authenticated;
revoke all on function public.worker_marketing_campaigns(integer) from public, anon, authenticated;
revoke all on function public.worker_marketing_holds() from public, anon, authenticated;
grant execute on function public.worker_marketing_campaign_add(jsonb) to service_role;
grant execute on function public.worker_marketing_campaign_set(text, text) to service_role;
grant execute on function public.worker_marketing_campaigns(integer) to service_role;
grant execute on function public.worker_marketing_holds() to service_role;

-- 5. worker_marketing_open_release: a club's opening campaign goes when the club does. Its opening-night post moves to the
--    next 19:47 Athens (tonight when the club opens before 18:30) and every other waiting post keeps its distance from it.
create or replace function public.worker_marketing_open_release(p_hold text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare launch timestamptz; target timestamptz; delta interval; r record; t timestamptz; n int := 0; v_local timestamp;
begin
  if p_hold !~ '^open:[a-z0-9-]{2,60}$' then raise exception 'hold must be open:<club>'; end if;
  select send_at into launch from marketing.posts where status = 'skipped' and main->>'hold' = p_hold and main->>'launch' = 'true' order by send_at limit 1;
  if launch is null then return jsonb_build_object('ok', true, 'n', 0); end if;
  v_local := now() at time zone 'Europe/Athens';
  target := ((date_trunc('day', v_local) + case when v_local::time < time '18:30' then interval '19 hours 47 minutes' else interval '1 day 19 hours 47 minutes' end) at time zone 'Europe/Athens');
  delta := target - launch;
  for r in select id, send_at from marketing.posts where status = 'skipped' and main->>'hold' = p_hold and send_at >= launch order by send_at loop
    t := r.send_at + delta;
    while exists (select 1 from marketing.posts where send_at = t and id <> r.id) loop t := t + interval '1 minute'; end loop;
    update marketing.posts set send_at = t, status = 'pending', error = null, main = main - 'hold' - 'launch' where id = r.id;
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'n', n, 'launch', target);
end $$;
revoke all on function public.worker_marketing_open_release(text) from public, anon, authenticated;
grant execute on function public.worker_marketing_open_release(text) to service_role;

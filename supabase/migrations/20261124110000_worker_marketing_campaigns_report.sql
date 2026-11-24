-- Campaigns report, polished (24.11.2026): a stopped campaign says "stopped" (not "finished"), and the list runs from the
-- campaign whose next post is soonest — the running ones first, then the waiting, the paused, the stopped, the finished.
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
           count(*) filter (where status = 'skipped' and error = 'campaign stopped') stopped,
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
           count(*) filter (where h.kind = 'click') clicks
      from public.worker_insight_hit h
     where h.campaign is not null and h.day > (now() at time zone 'Europe/Athens')::date - greatest(1, least(p_days, 365))
     group by h.campaign
  ), s as (
    select c.*, case when c.pending > 0 then 'running' when c.waiting > 0 then 'waiting' when c.paused > 0 then 'paused'
                     when c.stopped > 0 and c.sent = 0 then 'stopped' else 'done' end state
      from c
  )
  select coalesce(jsonb_agg(to_jsonb(s) || jsonb_build_object('visitors', coalesce(v.visitors, 0), 'views', coalesce(v.views, 0), 'clicks', coalesce(v.clicks, 0))
           order by array_position(array['running','waiting','paused','stopped','done'], s.state), s.next_at nulls last, s.last_at desc), '[]'::jsonb)
    from s left join v on v.id = s.id;
$$;
revoke all on function public.worker_marketing_campaigns(integer) from public, anon, authenticated;
grant execute on function public.worker_marketing_campaigns(integer) to service_role;

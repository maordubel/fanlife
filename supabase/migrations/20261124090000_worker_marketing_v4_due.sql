-- Fresh pictures (owner, 24.11.2026: "the kits and stickers are being redrawn — every post must take the newest files
-- before it is published"). The picture run now asks for every pending post in its window whose pictures were drawn from
-- other sources (p_ver carries a stamp of the asset folders) or that goes out within p_fresh_hours and was drawn more than
-- p_age_hours ago — so the last look before a post goes out is never older than a few hours.
create or replace function public.worker_marketing_v4_due(p_hours integer default 36, p_ver text default '', p_fresh_hours integer default 6, p_age_hours integer default 8)
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
     and (coalesce(p.main->'kit'->'v4'->>'ver', '') is distinct from p_ver
          or (p.send_at < now() + make_interval(hours => greatest(1, least(p_fresh_hours, 24)))
              and coalesce((p.main->'kit'->'v4'->>'at')::timestamptz, '-infinity'::timestamptz) < now() - make_interval(hours => greatest(1, least(p_age_hours, 48)))));
$$;
revoke all on function public.worker_marketing_v4_due(integer, text, integer, integer) from public, anon, authenticated;
grant execute on function public.worker_marketing_v4_due(integer, text, integer, integer) to service_role;

-- Social pictures v4 (owner, 14.11.2026): the pictures of the fixed posts are drawn ahead of time in GitHub Actions
-- (scripts/marketing/kit/v4/prerender.mjs) and stored as GitHub release assets; their addresses are kept on the post as
-- main.kit.v4 = {ver, png:[url…], story:url|null}. The sender fetches them instead of drawing (scripts/marketing/kit/visual.mjs).
-- Live posts (fixtures, results, votes, numbers…) are composed at send time and keep their own drawing.

create or replace function public.worker_marketing_v4_queue(p_hours integer default 36, p_ver text default '')
returns jsonb
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'app', p.main->>'app', 'url', p.main->>'url', 'label', p.main->>'label',
           'send_at', p.send_at, 'kit', p.main->'kit') order by p.send_at), '[]'::jsonb)
    from marketing.posts p
   where p.status = 'pending'
     and p.kind = 'fixed'
     and p.main ? 'kit'
     and p.send_at between now() - interval '10 minutes' and now() + make_interval(hours => greatest(1, least(p_hours, 96)))
     and coalesce(p.main->'kit'->'v4'->>'ver', '') is distinct from p_ver;
$$;
revoke all on function public.worker_marketing_v4_queue(integer, text) from public, anon, authenticated;
grant execute on function public.worker_marketing_v4_queue(integer, text) to service_role;

create or replace function public.worker_marketing_v4_set(p_id bigint, p_v4 jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare n int;
begin
  if jsonb_typeof(p_v4) <> 'object' or jsonb_typeof(p_v4->'png') <> 'array' then
    return jsonb_build_object('ok', false, 'why', 'v4 must be {ver, png:[…], story}');
  end if;
  update marketing.posts p set main = jsonb_set(p.main, '{kit,v4}', p_v4, true)
   where p.id = p_id and p.status = 'pending' and p.main ? 'kit';
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1);
end $$;
revoke all on function public.worker_marketing_v4_set(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.worker_marketing_v4_set(bigint, jsonb) to service_role;

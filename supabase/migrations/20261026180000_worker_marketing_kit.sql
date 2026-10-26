-- FAN LIFE social plan — each due post travels with its kit (Social Kit v2, 26.10.2026).
-- A post built by scripts/marketing/build-plan.mts holds main->'kit' ({t, data}: the template and the archive data it
-- was made from). The tick hands it to the site with the post; the GitHub backup asks for it by id.
-- Server only. Standalone (no table rowtypes); needs 20261026090000 first.

create or replace function public.worker_marketing_tick(p_nonce uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_nonce uuid; v_probe boolean; posts jsonb;
begin
  update marketing.ticks k set used_at = now()
   where k.nonce = p_nonce and k.used_at is null and k.made_at > now() - interval '3 minutes'
  returning k.nonce, k.probe into v_nonce, v_probe;
  if v_nonce is null then return jsonb_build_object('ok', false); end if;
  if v_probe then
    return jsonb_build_object('ok', true, 'probe', true,
      'chat_id', (select s.value->>'chat_id' from marketing.settings s where s.key = 'telegram'));
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'chat_id', c.chat_id, 'msg', c.msg,
           'kit', (select p.main->'kit' from marketing.posts p where p.id = c.id))), '[]'::jsonb)
    into posts from public.worker_marketing_claim(3) c;
  return jsonb_build_object('ok', true, 'posts', posts);
end $$;
revoke all on function public.worker_marketing_tick(uuid) from public, anon, authenticated;
grant execute on function public.worker_marketing_tick(uuid) to service_role;

-- The kits of posts already claimed (the GitHub backup path). Only posts being sent now.
create or replace function public.worker_marketing_kits(p_ids bigint[])
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(p.id::text, p.main->'kit'), '{}'::jsonb)
    from marketing.posts p where p.id = any(p_ids) and p.status = 'sending' and p.main ? 'kit'
$$;
revoke all on function public.worker_marketing_kits(bigint[]) from public, anon, authenticated;
grant execute on function public.worker_marketing_kits(bigint[]) to service_role;

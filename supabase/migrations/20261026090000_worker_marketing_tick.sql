-- FAN LIFE social plan — the database is the clock (26.10.2026).
-- GitHub's scheduled runs fired four times on 25.10 and not once on 26.10 before noon, so the plan now ticks from
-- pg_cron: every 5 minutes it mints a one-time nonce and POSTs it to the site; the site exchanges it here for the due
-- posts and sends them with the bot token it already holds (TELEGRAM_BOT_TOKEN on the hosting project). No secret
-- leaves either side. The GitHub workflow stays as a backup; both take only 'pending' rows, each claimed once.
-- Server only. Needs supabase/marketing/0005 (the ticks table) and 20261025090000 first.

-- One nonce, one use, three minutes. A wrong, old or reused nonce gets nothing (and is told nothing more).
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
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'chat_id', c.chat_id, 'msg', c.msg)), '[]'::jsonb)
    into posts from public.worker_marketing_claim(3) c;
  return jsonb_build_object('ok', true, 'posts', posts);
end $$;
revoke all on function public.worker_marketing_tick(uuid) from public, anon, authenticated;
grant execute on function public.worker_marketing_tick(uuid) to service_role;


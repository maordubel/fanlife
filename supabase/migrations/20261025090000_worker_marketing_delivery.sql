-- DUBEL TEAM social plan — delivery through the bot that already lives in GitHub Actions (secret TELEGRAM_BOT_TOKEN).
-- The schedule (marketing-telegram.yml) asks the site; the site claims due posts here and reports back.
-- Server only: execute for service_role, nobody else. Standalone; needs supabase/marketing/0001–0004 first.

alter table marketing.posts drop constraint if exists posts_status_check;
alter table marketing.posts add constraint posts_status_check check (status in ('pending','sending','sent','failed','skipped'));

-- Take the due posts. A claimed post is never claimed twice; a post more than 90 minutes late is skipped, never flooded.
create or replace function public.worker_marketing_claim(p_limit int default 3)
returns table (id bigint, chat_id text, msg text)
language plpgsql security definer set search_path = '' as $$
declare chat text; r record; v_msg text; v_fx text;
begin
  select s.value->>'chat_id' into chat from marketing.settings s where s.key = 'telegram';
  if chat is null then return; end if;
  -- a claim with no answer for 15 minutes is treated as delivered: a missed post is better than a repeated one
  update marketing.posts p set status = 'sent', error = coalesce(p.error, 'no confirmation from the sender')
   where p.status = 'sending' and p.sent_at < now() - interval '15 minutes';
  update marketing.posts p set status = 'skipped', error = 'older than 90 minutes when it could be sent'
   where p.status = 'pending' and p.send_at < now() - interval '90 minutes';
  for r in select p.id from marketing.posts p where p.status = 'pending' and p.send_at <= now()
           order by p.send_at limit greatest(1, least(coalesce(p_limit, 3), 10)) for update skip locked loop
    select rr.msg, rr.fixture_id into v_msg, v_fx from marketing.render(r.id) rr;
    update marketing.posts p set status = 'sending', attempts = p.attempts + 1, sent_at = now(),
           rendered = v_msg, fixture_id = v_fx, error = null where p.id = r.id;
    id := r.id; chat_id := chat; msg := left(v_msg, 4000);
    return next;
  end loop;
end $$;

-- 'sent' = Telegram took it · 'refused' = Telegram said no (retried up to 3 times) · 'unknown' = no answer (never resent)
create or replace function public.worker_marketing_report(p_id bigint, p_outcome text, p_error text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if p_outcome not in ('sent','refused','unknown') then return jsonb_build_object('ok', false, 'error', 'outcome'); end if;
  update marketing.posts p set
    status = case when p_outcome = 'refused' and p.attempts < 3 then 'pending'
                  when p_outcome = 'refused' then 'failed' else 'sent' end,
    error = case when p_outcome = 'sent' then null else left(p_error, 300) end
   where p.id = p_id and p.status = 'sending';
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n = 1);
end $$;

revoke all on function public.worker_marketing_claim(int) from public, anon, authenticated;
revoke all on function public.worker_marketing_report(bigint, text, text) from public, anon, authenticated;
grant execute on function public.worker_marketing_claim(int) to service_role;
grant execute on function public.worker_marketing_report(bigint, text, text) to service_role;

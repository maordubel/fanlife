-- DUBEL TEAM social plan → Telegram. Owner: fanlife (hub). Schema `marketing` on Football Master.
-- Not exposed to the Data API: no grants to anon/authenticated. Delivery is pg_net from pg_cron,
-- the bot token lives in Vault (name: telegram_bot_token). Idempotent.

create schema if not exists marketing;
revoke all on schema marketing from public, anon, authenticated;

create table if not exists marketing.settings (
  key   text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists marketing.posts (
  id              bigserial primary key,
  day             int not null check (day between 0 and 60),
  send_at         timestamptz not null unique,
  format          text not null check (format in ('post','carousel','reel','story','background','text')),
  kind            text not null check (kind in ('fixed','pre','live','night')),
  main            jsonb,          -- {app,hook,body,visual}
  variants        jsonb,          -- match templates by category: club / il / big
  fallback        jsonb,          -- no fixture (pre/live) · derby night (night)
  fallback_format text,
  -- delivery
  status          text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  attempts        int not null default 0,
  request_id      bigint,
  sent_at         timestamptz,
  rendered        text,
  fixture_id      text,           -- the real match this post was resolved to
  error           text
);
create index if not exists posts_due_idx on marketing.posts (send_at) where status = 'pending';
revoke all on all tables in schema marketing from public, anon, authenticated;
alter table marketing.posts enable row level security;
alter table marketing.settings enable row level security;

-- pick_fixture() and render() live in 0003_marketing_hebrew_names.sql (their current form).

create or replace function marketing.esc(t text) returns text language sql immutable set search_path = '' as $$
  select replace(replace(replace(coalesce(t,''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
$$;

-- ── delivery: every 5 minutes from pg_cron ─────────────────────────────────
create or replace function marketing.dispatch()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  tok text; chat text; r record; rid bigint; resp record; upd jsonb; out_sent int := 0; rec record;
  v_msg text; v_fx text;
begin
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'telegram_bot_token' limit 1;
  if tok is null then return jsonb_build_object('ok', false, 'why', 'no telegram_bot_token in Vault'); end if;

  -- 1. settle earlier sends (pg_net is asynchronous)
  for r in select id, request_id, attempts from marketing.posts where status = 'sent' and request_id is not null loop
    select status_code, content into resp from net._http_response where id = r.request_id;
    if found then
      if resp.status_code = 200 then
        update marketing.posts set request_id = null where id = r.id;
      elsif r.attempts < 3 then
        update marketing.posts set status = 'pending', request_id = null, error = left(resp.content, 300) where id = r.id;
      else
        update marketing.posts set status = 'failed', request_id = null, error = left(resp.content, 300) where id = r.id;
      end if;
    end if;
  end loop;

  -- 2. the chat: captured from the first /start the bot receives, then locked
  select value->>'chat_id' into chat from marketing.settings where key = 'telegram';
  if chat is null then
    select value into upd from marketing.settings where key = 'telegram_probe';
    if upd ? 'request_id' then
      select content into resp from net._http_response where id = (upd->>'request_id')::bigint;
      if found then
        begin
          select (u->'message'->'chat'->>'id') into chat
            from jsonb_array_elements((resp.content::jsonb)->'result') u
           where u->'message'->'chat'->>'type' = 'private' and u->'message'->>'text' like '/start%'
           order by (u->>'update_id')::bigint limit 1;
        exception when others then chat := null;
        end;
        delete from marketing.settings where key = 'telegram_probe';
        if chat is not null then
          insert into marketing.settings (key, value) values ('telegram', jsonb_build_object('chat_id', chat, 'linked_at', now()))
          on conflict (key) do nothing;
          perform net.http_post(
            url := 'https://api.telegram.org/bot' || tok || '/sendMessage',
            headers := '{"Content-Type":"application/json"}'::jsonb,
            body := jsonb_build_object('chat_id', chat, 'parse_mode', 'HTML', 'text',
              '✅ <b>DUBEL TEAM is connected.</b>' || E'\n' || 'Every two hours, 08:00–22:00, a ready post arrives here: hook, caption, link, hashtags and visual.' || E'\n\n' || 'Next up: ' ||
              coalesce((select to_char(min(send_at) at time zone 'Asia/Jerusalem','DD.MM HH24:MI') from marketing.posts where status='pending' and send_at > now()), '—')));
        end if;
      end if;
    else
      rid := net.http_get('https://api.telegram.org/bot' || tok || '/getUpdates?allowed_updates=%5B%22message%22%5D');
      insert into marketing.settings (key, value) values ('telegram_probe', jsonb_build_object('request_id', rid))
      on conflict (key) do update set value = excluded.value, updated_at = now();
    end if;
    if chat is null then return jsonb_build_object('ok', false, 'why', 'waiting for /start'); end if;
  end if;

  -- 3. posts that are too old (bot linked late) are skipped, not flooded
  update marketing.posts set status = 'skipped', error = 'older than 90 minutes when it could be sent'
   where status = 'pending' and send_at < now() - interval '90 minutes';

  -- 4. send what is due
  for rec in select id from marketing.posts where status = 'pending' and send_at <= now() order by send_at limit 3 loop
    begin
      select rr.msg, rr.fixture_id into v_msg, v_fx from marketing.render(rec.id) rr;
      rid := net.http_post(
        url := 'https://api.telegram.org/bot' || tok || '/sendMessage',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := jsonb_build_object('chat_id', chat, 'parse_mode', 'HTML', 'disable_web_page_preview', true, 'text', left(v_msg, 4000)));
      update marketing.posts set status = 'sent', attempts = attempts + 1, request_id = rid, sent_at = now(),
             rendered = v_msg, fixture_id = v_fx, error = null where id = rec.id;
      out_sent := out_sent + 1;
    end;
  end loop;
  return jsonb_build_object('ok', true, 'sent', out_sent);
end $$;

revoke all on all functions in schema marketing from public, anon, authenticated;

-- every 2 minutes
select cron.schedule('marketing:telegram', '*/2 * * * *', $c$select marketing.dispatch()$c$)
where not exists (select 1 from cron.job where jobname = 'marketing:telegram');

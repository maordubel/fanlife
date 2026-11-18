-- THE ALBUM coupons (owner, 18.11.2026): a free packet for a code the owner posts on FAN LIFE's social accounts.
-- A code is kept only as its SHA-256 (this repository is public: no code is ever written here in clear). The owner makes
-- codes on the desk (service role); a fan redeems one in the album and opens the packet like any other. A code has a
-- number of packets, a cap on redemptions, a window, and is once per collector — except a master code (the owner's own,
-- for testing), which is unlimited. Wrong guesses are capped per collector per day. Standalone and idempotent.

create table if not exists public.worker_album_coupon (
  id uuid primary key default gen_random_uuid(),
  code_hash bytea not null unique,
  label text not null default '' check (length(label) <= 80),
  packets smallint not null default 1 check (packets between 1 and 5),
  max_uses int check (max_uses is null or max_uses > 0),
  uses int not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  master boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.worker_album_redemption (
  coupon_id uuid not null references public.worker_album_coupon(id) on delete cascade,
  user_id uuid not null,
  at timestamptz not null default now()
);
create index if not exists worker_album_redemption_user on public.worker_album_redemption (user_id, coupon_id);
create table if not exists public.worker_album_coupon_try (
  user_id uuid not null,
  day date not null,
  misses smallint not null default 0,
  primary key (user_id, day)
);
alter table public.worker_album_coupon enable row level security;
alter table public.worker_album_redemption enable row level security;
alter table public.worker_album_coupon_try enable row level security;
revoke all on public.worker_album_coupon, public.worker_album_redemption, public.worker_album_coupon_try from anon, authenticated;

alter table public.worker_album_envelope drop constraint if exists worker_album_envelope_kind_check;
alter table public.worker_album_envelope add constraint worker_album_envelope_kind_check check (kind = any (array['daily','starter','bonus','pick','trade','swap','coupon']));

create or replace function public.worker_album_code_hash(p_code text)
returns bytea language sql immutable set search_path = public as $$
  select sha256(convert_to(lower(regexp_replace(coalesce(p_code, ''), '\s', '', 'g')), 'UTF8'))
$$;

-- the fan's side: one code, checked and spent in one transaction
create or replace function public.worker_album_redeem(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := public.worker_album_uid(); v_c public.worker_album_coupon; v_day date := public.worker_album_today();
        v_misses int; v_res jsonb; v_envs jsonb := '[]'::jsonb; i int; v_seq int;
begin
  if not exists (select 1 from public.worker_album_book where user_id = v_user) then return jsonb_build_object('ok', false, 'error', 'Open your album first.'); end if;
  select misses into v_misses from public.worker_album_coupon_try where user_id = v_user and day = v_day;
  if coalesce(v_misses, 0) >= 10 then return jsonb_build_object('ok', false, 'error', 'Too many tries today — come back tomorrow.'); end if;
  if length(coalesce(p_code, '')) not between 3 and 40 then return jsonb_build_object('ok', false, 'error', 'That is not a code.'); end if;
  select * into v_c from public.worker_album_coupon where code_hash = public.worker_album_code_hash(p_code) and active for update;
  if not found or now() < v_c.starts_at or (v_c.ends_at is not null and now() > v_c.ends_at) then
    insert into public.worker_album_coupon_try (user_id, day, misses) values (v_user, v_day, 1)
    on conflict (user_id, day) do update set misses = worker_album_coupon_try.misses + 1;
    return jsonb_build_object('ok', false, 'error', 'That code is not valid (or not any more).');
  end if;
  if not v_c.master then
    if v_c.max_uses is not null and v_c.uses >= v_c.max_uses then return jsonb_build_object('ok', false, 'error', 'This code has been used up.'); end if;
    if exists (select 1 from public.worker_album_redemption where coupon_id = v_c.id and user_id = v_user) then return jsonb_build_object('ok', false, 'error', 'You already used this code.'); end if;
  end if;
  insert into public.worker_album_redemption (coupon_id, user_id) values (v_c.id, v_user);
  update public.worker_album_coupon set uses = uses + 1 where id = v_c.id;
  for i in 1..v_c.packets loop
    select count(*) into v_seq from public.worker_album_envelope where user_id = v_user and day = v_day and kind = 'coupon';
    v_res := public.worker_album_issue(v_user, 'coupon', v_seq, false);
    if not (v_res->>'ok')::boolean then return v_res; end if;
    v_envs := v_envs || jsonb_build_array(v_res->'envelope');
  end loop;
  update public.worker_album_book set envelopes = envelopes + v_c.packets where user_id = v_user;
  return jsonb_build_object('ok', true, 'packets', v_c.packets, 'envelopes', v_envs, 'label', v_c.label);
end $$;
revoke all on function public.worker_album_redeem(text) from public, anon;
grant execute on function public.worker_album_redeem(text) to authenticated;

-- the owner's side (service role, from the desk): make, list, switch off
create or replace function public.worker_album_coupon_make(p_code text, p_label text, p_packets int, p_max_uses int, p_ends_at timestamptz, p_master boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if length(regexp_replace(coalesce(p_code, ''), '\s', '', 'g')) not between 4 and 40 then return jsonb_build_object('ok', false, 'error', 'A code is 4 to 40 characters.'); end if;
  insert into public.worker_album_coupon (code_hash, label, packets, max_uses, ends_at, master)
  values (public.worker_album_code_hash(p_code), left(coalesce(p_label, ''), 80), greatest(1, least(5, coalesce(p_packets, 1))), p_max_uses, p_ends_at, coalesce(p_master, false))
  on conflict (code_hash) do update set label = excluded.label, packets = excluded.packets, max_uses = excluded.max_uses, ends_at = excluded.ends_at, master = excluded.master, active = true
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;
create or replace function public.worker_album_coupon_list()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'label', label, 'packets', packets, 'maxUses', max_uses, 'uses', uses, 'endsAt', ends_at, 'master', master, 'active', active, 'createdAt', created_at) order by created_at desc), '[]'::jsonb)
    from public.worker_album_coupon
$$;
create or replace function public.worker_album_coupon_off(p_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  update public.worker_album_coupon set active = false where id = p_id returning jsonb_build_object('ok', true)
$$;
do $$ declare f text; begin
  foreach f in array array['worker_album_coupon_make(text, text, integer, integer, timestamptz, boolean)','worker_album_coupon_list()','worker_album_coupon_off(uuid)','worker_album_code_hash(text)'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- retention: redemptions of codes switched off leave after a year; the daily miss counter after a week
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $x$select cron.unschedule(jobid) from cron.job where jobname = 'marketing:album-coupons-sweep'$x$;
    execute $x$select cron.schedule('marketing:album-coupons-sweep', '47 3 * * *', 'delete from public.worker_album_coupon_try where day < current_date - 7; delete from public.worker_album_redemption r using public.worker_album_coupon c where c.id = r.coupon_id and not c.active and r.at < now() - interval ''365 days''')$x$;
  end if;
end $$;

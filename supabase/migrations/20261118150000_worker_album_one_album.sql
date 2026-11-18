-- THE ALBUM, one album (owner, 18.11.2026): one big album of every FAN LIFE club that is open to the public. A club the
-- owner opens joins the album by itself; every packet is drawn from the whole album, not from the fan's own club — so
-- fans hold other clubs' stickers and swap them with each other. The fan's own club is kept as "my club" (the cover).
-- Standalone and idempotent. Reads the live 20261118120000_worker_album.sql objects; replaces draw/issue/daily/start,
-- adds the open-wing list (written by the app's server with the service role) and the swaps board between fans.

-- ---------------------------------------------------------------- which clubs are in the public album
create table if not exists public.worker_album_wing (
  club text primary key check (club ~ '^[a-z0-9][a-z0-9-]{0,60}$'),
  open boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.worker_album_wing enable row level security;
revoke all on public.worker_album_wing from anon, authenticated;

-- the app's server calls this (service role) with the clubs whose archive is open to fans; the rest leave the draw
create or replace function public.worker_album_open_set(p_clubs text[])
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  insert into public.worker_album_wing (club, open, updated_at)
  select distinct s.club, s.club = any(p_clubs), now() from public.worker_album_sticker s
  on conflict (club) do update set open = excluded.open, updated_at = now() where worker_album_wing.open is distinct from excluded.open;
  return jsonb_build_object('ok', true, 'open', (select coalesce(array_agg(club order by club), '{}') from public.worker_album_wing where open));
end $$;
revoke all on function public.worker_album_open_set(text[]) from public, anon, authenticated;
grant execute on function public.worker_album_open_set(text[]) to service_role;

-- the stickers a packet can hold: every active sticker of an open club (before any club is public, the owner's preview
-- draws from the whole catalogue)
create or replace function public.worker_album_pool()
returns setof public.worker_album_sticker language sql stable security definer set search_path = public as $$
  select s.* from public.worker_album_sticker s
   where s.active and (s.club in (select club from public.worker_album_wing where open)
                       or not exists (select 1 from public.worker_album_wing where open))
$$;
revoke all on function public.worker_album_pool() from public, anon, authenticated;

-- ---------------------------------------------------------------- the draw, across the whole album
drop function if exists public.worker_album_draw(uuid, text, integer, boolean);
create or replace function public.worker_album_draw(p_user uuid, p_n integer, p_force_new boolean)
returns text[] language plpgsql security definer set search_path = public as $$
declare v_out text[] := '{}'; v_new text;
begin
  if p_force_new then
    select s.id into v_new from public.worker_album_pool() s
      where not exists (select 1 from public.worker_album_copy c where c.user_id = p_user and c.sticker_id = s.id and c.copies > 0)
      order by random() limit 1;
    if v_new is not null then v_out := array[v_new]; end if;
  end if;
  select v_out || coalesce(array_agg(id), '{}') into v_out from (
    select s.id from public.worker_album_pool() s where not (s.id = any(v_out))
     order by random() limit greatest(p_n - coalesce(array_length(v_out, 1), 0), 0)) x;
  return v_out;
end $$;
revoke all on function public.worker_album_draw(uuid, integer, boolean) from public, anon, authenticated;

drop function if exists public.worker_album_issue(uuid, text, integer, text, boolean);
create or replace function public.worker_album_issue(p_user uuid, p_kind text, p_seq integer, p_force_new boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_ids text[]; v_var text[] := '{}'; v_fresh boolean[] := '{}'; v_id text; v_v text; v_env uuid; v_day date := public.worker_album_today();
begin
  v_ids := public.worker_album_draw(p_user, 2, p_force_new);
  if coalesce(array_length(v_ids, 1), 0) = 0 then return jsonb_build_object('ok', false, 'error', 'The album has no stickers yet.'); end if;
  foreach v_id in array v_ids loop
    v_v := public.worker_album_variant();
    v_var := v_var || v_v;
    v_fresh := v_fresh || public.worker_album_give(p_user, v_id, v_v);
  end loop;
  insert into public.worker_album_envelope (user_id, day, kind, seq, wing, stickers, variants, fresh)
  values (p_user, v_day, p_kind, p_seq, split_part(v_ids[1], ':', 1), v_ids, v_var, v_fresh)
  returning id into v_env;
  return jsonb_build_object('ok', true, 'envelope', v_env, 'stickers', v_ids, 'variants', v_var, 'fresh', v_fresh);
end $$;
revoke all on function public.worker_album_issue(uuid, text, integer, boolean) from public, anon, authenticated;

create or replace function public.worker_album_daily()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := public.worker_album_uid(); v_book public.worker_album_book; v_today date := public.worker_album_today();
        v_week date := date_trunc('week', v_today)::date; v_have int; v_total int; v_force boolean; v_res jsonb;
begin
  select * into v_book from public.worker_album_book where user_id = v_user for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Open your album first.'); end if;
  if v_book.last_day = v_today then
    return jsonb_build_object('ok', true, 'already', true, 'envelope', (select to_jsonb(e) - 'user_id' from public.worker_album_envelope e where user_id = v_user and day = v_today and kind = 'daily' and seq = 0));
  end if;
  select count(*) into v_total from public.worker_album_pool();
  select count(*) into v_have from public.worker_album_copy c join public.worker_album_pool() s on s.id = c.sticker_id where c.user_id = v_user and c.copies > 0;
  v_force := v_book.pity >= 4 and v_have < v_total;
  v_res := public.worker_album_issue(v_user, 'daily', 0, v_force);
  if not (v_res->>'ok')::boolean then return v_res; end if;
  update public.worker_album_book set
    last_day = v_today, envelopes = envelopes + 1,
    pity = case when true = any(array(select jsonb_array_elements_text(v_res->'fresh')::boolean)) then 0 else least(pity + 1, 10) end,
    week_days = case when week_start = v_week then week_days + 1 else 1 end,
    week_paid = case when week_start = v_week then week_paid else false end,
    week_start = v_week
  where user_id = v_user returning * into v_book;
  if v_book.week_days >= 5 and not v_book.week_paid then
    update public.worker_album_book set picks = least(picks + 1, 20), week_paid = true where user_id = v_user;
    v_res := v_res || jsonb_build_object('pickEarned', true);
  end if;
  return v_res;
end $$;

-- p_wing is now "my club": the cover's colours and the page the album opens at; the starter packets come from the album
create or replace function public.worker_album_start(p_wing text, p_cover jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := public.worker_album_uid(); i int;
begin
  if not exists (select 1 from public.worker_album_sticker where club = p_wing and active) then return jsonb_build_object('ok', false, 'error', 'That club is not in the album yet.'); end if;
  if pg_column_size(p_cover) > 2048 then return jsonb_build_object('ok', false, 'error', 'The cover is too large.'); end if;
  insert into public.worker_album_book (user_id, wing, cover) values (v_user, p_wing, coalesce(p_cover, '{}'::jsonb))
  on conflict (user_id) do nothing;
  if not found then return public.worker_album_me(); end if;
  for i in 1..3 loop perform public.worker_album_issue(v_user, 'starter', i, true); end loop;
  update public.worker_album_book set envelopes = envelopes + 3 where user_id = v_user;
  return public.worker_album_me();
end $$;

-- ---------------------------------------------------------------- swaps between fans
alter table public.worker_album_envelope drop constraint if exists worker_album_envelope_kind_check;
alter table public.worker_album_envelope add constraint worker_album_envelope_kind_check check (kind = any (array['daily','starter','bonus','pick','trade','swap']));

create table if not exists public.worker_album_swap (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  give text not null references public.worker_album_sticker(id) on delete cascade,
  want text not null references public.worker_album_sticker(id) on delete cascade,
  status text not null default 'open' check (status in ('open','done','cancelled')),
  taker uuid,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (give <> want)
);
create index if not exists worker_album_swap_open on public.worker_album_swap (want, give) where status = 'open';
create index if not exists worker_album_swap_user on public.worker_album_swap (user_id, status);
alter table public.worker_album_swap enable row level security;
revoke all on public.worker_album_swap from anon, authenticated;

-- a collector is shown by a short, stable, anonymous number — never a name or an email
create or replace function public.worker_album_who(p_user uuid)
returns text language sql immutable set search_path = public as $$
  select 'Collector #' || lpad((('x' || substr(md5(p_user::text || 'fanlife-album'), 1, 6))::bit(24)::int % 100000)::text, 5, '0')
$$;
revoke all on function public.worker_album_who(uuid) from public, anon, authenticated;

-- spare copies not already promised in an open swap (negative when a promise can no longer be kept)
create or replace function public.worker_album_free_spares(p_user uuid, p_sticker text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce((select copies - 1 from public.worker_album_copy where user_id = p_user and sticker_id = p_sticker), 0)
         - (select count(*)::int from public.worker_album_swap where user_id = p_user and give = p_sticker and status = 'open')
$$;
revoke all on function public.worker_album_free_spares(uuid, text) from public, anon, authenticated;

create or replace function public.worker_album_swap_offer(p_give text, p_want text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := public.worker_album_uid(); v_id uuid;
begin
  if not exists (select 1 from public.worker_album_book where user_id = v_user) then return jsonb_build_object('ok', false, 'error', 'Open your album first.'); end if;
  if not exists (select 1 from public.worker_album_pool() where id = p_want) or not exists (select 1 from public.worker_album_sticker where id = p_give and active) then
    return jsonb_build_object('ok', false, 'error', 'No such sticker.'); end if;
  if public.worker_album_free_spares(v_user, p_give) < 1 then return jsonb_build_object('ok', false, 'error', 'Only a spare copy can be offered — one of each stays in your album.'); end if;
  if exists (select 1 from public.worker_album_copy where user_id = v_user and sticker_id = p_want and copies > 0) then return jsonb_build_object('ok', false, 'error', 'You already hold that sticker.'); end if;
  if (select count(*) from public.worker_album_swap where user_id = v_user and status = 'open') >= 12 then return jsonb_build_object('ok', false, 'error', 'Twelve open swaps at a time — cancel one first.'); end if;
  if exists (select 1 from public.worker_album_swap where user_id = v_user and status = 'open' and give = p_give and want = p_want) then return jsonb_build_object('ok', false, 'error', 'That swap is already on the board.'); end if;
  insert into public.worker_album_swap (user_id, give, want) values (v_user, p_give, p_want) returning id into v_id;
  return jsonb_build_object('ok', true, 'swap', v_id);
end $$;

create or replace function public.worker_album_swap_cancel(p_swap uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update public.worker_album_swap set status = 'cancelled', closed_at = now() where id = p_swap and user_id = public.worker_album_uid() and status = 'open';
  if not found then return jsonb_build_object('ok', false, 'error', 'That swap is no longer open.'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- the board: offers by other collectors, those this fan can take first (he has the spare they want, misses what they give)
create or replace function public.worker_album_swap_board()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_user uuid := public.worker_album_uid();
begin
  return jsonb_build_object('ok', true,
    'mine', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'give', give, 'want', want, 'since', created_at) order by created_at desc)
                        from public.worker_album_swap where user_id = v_user and status = 'open'), '[]'::jsonb),
    'board', coalesce((select jsonb_agg(x order by (x->>'fits')::boolean desc, x->>'since' desc) from (
       select jsonb_build_object('id', w.id, 'give', w.give, 'want', w.want, 'since', w.created_at, 'who', public.worker_album_who(w.user_id),
         'fits', public.worker_album_free_spares(v_user, w.want) > 0
                 and not exists (select 1 from public.worker_album_copy c where c.user_id = v_user and c.sticker_id = w.give and c.copies > 0)) x
         from public.worker_album_swap w where w.status = 'open' and w.user_id <> v_user
        order by w.created_at desc limit 120) b), '[]'::jsonb),
    'done', coalesce((select jsonb_agg(jsonb_build_object('give', give, 'want', want, 'at', closed_at, 'mine', user_id = v_user) order by closed_at desc)
                        from (select * from public.worker_album_swap where status = 'done' and (user_id = v_user or taker = v_user) order by closed_at desc limit 20) d), '[]'::jsonb));
end $$;

-- take a swap: both sides checked and moved in one transaction; each collector gets the new sticker as a little packet
create or replace function public.worker_album_swap_accept(p_swap uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := public.worker_album_uid(); v_s public.worker_album_swap; v_day date := public.worker_album_today();
begin
  if not exists (select 1 from public.worker_album_book where user_id = v_user) then return jsonb_build_object('ok', false, 'error', 'Open your album first.'); end if;
  select * into v_s from public.worker_album_swap where id = p_swap for update;
  if not found or v_s.status <> 'open' then return jsonb_build_object('ok', false, 'error', 'Someone was quicker — that swap is gone.'); end if;
  if v_s.user_id = v_user then return jsonb_build_object('ok', false, 'error', 'That is your own swap.'); end if;
  perform 1 from public.worker_album_copy where (user_id = v_s.user_id and sticker_id = v_s.give) or (user_id = v_user and sticker_id = v_s.want) for update;
  if coalesce((select copies from public.worker_album_copy where user_id = v_s.user_id and sticker_id = v_s.give), 0) < 2 then
    update public.worker_album_swap set status = 'cancelled', closed_at = now() where id = p_swap;
    return jsonb_build_object('ok', false, 'error', 'That collector no longer has the spare.'); end if;
  if public.worker_album_free_spares(v_user, v_s.want) < 1 then return jsonb_build_object('ok', false, 'error', 'You need a spare of the sticker they want.'); end if;
  if exists (select 1 from public.worker_album_copy where user_id = v_user and sticker_id = v_s.give and copies > 0) then return jsonb_build_object('ok', false, 'error', 'You already hold that sticker.'); end if;
  update public.worker_album_copy set copies = copies - 1 where user_id = v_s.user_id and sticker_id = v_s.give;
  update public.worker_album_copy set copies = copies - 1 where user_id = v_user and sticker_id = v_s.want;
  perform public.worker_album_give(v_user, v_s.give, 'base');
  perform public.worker_album_give(v_s.user_id, v_s.want, 'base');
  insert into public.worker_album_envelope (user_id, day, kind, seq, wing, stickers, variants, fresh) values
    (v_user, v_day, 'swap', (select count(*) from public.worker_album_envelope where user_id = v_user and day = v_day and kind = 'swap'), split_part(v_s.give, ':', 1), array[v_s.give], array['base'], array[true]),
    (v_s.user_id, v_day, 'swap', (select count(*) from public.worker_album_envelope where user_id = v_s.user_id and day = v_day and kind = 'swap'), split_part(v_s.want, ':', 1), array[v_s.want], array['base'], array[not exists (select 1 from public.worker_album_copy where user_id = v_s.user_id and sticker_id = v_s.want and copies > 1)]);
  update public.worker_album_swap set status = 'done', taker = v_user, closed_at = now() where id = p_swap;
  -- the other open offers that can no longer be honoured close by themselves
  update public.worker_album_swap w set status = 'cancelled', closed_at = now()
   where w.status = 'open' and w.user_id in (v_user, v_s.user_id) and public.worker_album_free_spares(w.user_id, w.give) < 0;
  return jsonb_build_object('ok', true, 'got', v_s.give, 'gave', v_s.want);
end $$;

do $$ declare f text; begin
  foreach f in array array['worker_album_swap_offer(text, text)','worker_album_swap_cancel(uuid)','worker_album_swap_board()','worker_album_swap_accept(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- retention: closed swaps leave after 60 days, with the opened packets (rule: a growing table ships with its sweep)
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $x$select cron.unschedule(jobid) from cron.job where jobname = 'marketing:album-swaps-sweep'$x$;
    execute $x$select cron.schedule('marketing:album-swaps-sweep', '23 3 * * *', 'delete from public.worker_album_swap where status <> ''open'' and closed_at < now() - interval ''60 days''')$x$;
  end if;
end $$;
